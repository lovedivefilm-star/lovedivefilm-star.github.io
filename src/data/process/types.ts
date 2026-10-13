/**
 * 작품 방 최종 구조(docs/work-room.md 4절) — 데이터 형식. 작품마다 `src/data/process/<slug>.ts` 하나.
 *
 * 방 순서: 후킹(works.ts) → 완성본 + 개요(`overview`) → 과정(`process`, 대본 발췌 한 장면을 6단계로) → 크레딧(works.ts).
 * `process` 가 없으면 과정 구역을 그리지 않는다(데이터가 오기 전 — 후킹 · 완성본 + 개요 · 크레딧만).
 *
 * 글의 두 종류(설계 0절):
 *  · `Verbatim` / `ScriptLine` = 작가 원문 — `_분석/작품과정/<slug>.md` 에 있는 문장을 통째로(자르거나 잇지 않는다).
 *    화면에서 `data-src` 를 단 글자는 시험(tests/workroom.spec.ts (a))이 공백만 정규화해 그 md 안에 그대로 있는지 대조한다.
 *  · 그 밖의 문자열 = 사실 칩(명사구 — 툴 이름 · 날짜 · 쪽 · 컷 수) 또는 라벨. 서술 문장 · 프롬프트 · 판 이력 · 테이크 · 채팅 인용은 넣지 않는다.
 *
 * 데이터 에이전트의 `_분석/작품과정/<slug>_장면과정.md` 와 칸이 1:1 이다:
 *   장면 → `process.scene` · 발췌 JSON → `process.excerpt` · 단계별 칩/원문/그림 → `stages[].chips/text/pics`
 *   세그먼트 표 → `stages[segment].segments` · 컷 경계 → `stages[edit].strip.cuts` · 완성 짝 → `process.pairs`
 *   단계별 밝힐 줄 → `stages[].lit`
 */

/** 작가 원문 한 덩어리(통째 문장) — src = 그 md 의 절(예: '1-1 PDF 4쪽') */
export type Verbatim = { t: string; src: string };

/**
 * 대본 발췌 한 줄(후킹 종이와 같은 갈래).
 * join = 앞 줄과 같은 문단에 이어 쓴다(대본 실물의 문단을 지키면서 문장 단위로 밝히려고 — 글자는 그대로).
 */
export type ScriptLine = { t: 'scene' | 'act' | 'dia' | 'note'; s: string; who?: string; join?: boolean };

/** 그림의 갈래 — 쓸 수 있는 것만(완성본 프레임 · 시트 · 콘티 · 블로킹맵 · 프리비즈 스틸 · 합성 소스 · 기획안 쪽 · 대본 쪽) */
export type PicKind = 'frame' | 'sheet' | 'conti' | 'blocking' | 'previs' | 'plate' | 'plan' | 'script';

/** 그림 한 장 — src 는 public/media/ 아래(출처는 src/data/media-sources.json). cap = 사실(무엇 · 어떤 툴) */
export type Pic = { src: string; full?: string; cap: string; w: number; h: number; kind: PicKind };

/** 과정 6단계 */
export type StageKey = 'plan' | 'script' | 'sheet' | 'segment' | 'generate' | 'edit';

export const STAGES: { key: StageKey; no: string; name: string; short: string }[] = [
  { key: 'plan', no: '01', name: '기획', short: '기획' },
  { key: 'script', no: '02', name: '대본', short: '대본' },
  { key: 'sheet', no: '03', name: '이미지 시트 · 연출', short: '시트 · 연출' },
  { key: 'segment', no: '04', name: '세그먼트', short: '세그먼트' },
  { key: 'generate', no: '05', name: '영상 생성', short: '영상 생성' },
  { key: 'edit', no: '06', name: '편집', short: '편집' },
];

/** 01 기획 — 작품 구조 막대(기획안의 구성표 · 회차 구성)에서 이 장면의 자리 */
export type Bar = {
  /** 라벨(사실) — 예 '기획안 9쪽 · 1분 30초 구조' */
  label: string;
  /** 구간 — a · b 는 폭을 정하는 수(초 등). name 은 원문이면 Verbatim */
  segs: { a: number; b: number; time: string; name: Verbatim | string; sc?: string; here?: boolean }[];
  /** 이 장면 표시 한 줄(사실) — 예 'S#7 · [1차] 대본 기준 이 구간' */
  mark: string;
};

/** 04 세그먼트 표 한 행 — 컷 · 화면 크기 · 완성본 길이 · 그 컷이 맡는 대본 줄(발췌 번호 — 글은 발췌에서 통째로) */
export type Segment = {
  cut: string;
  size: string;
  /** 완성본 구간(초). 없으면 완성본에 쓰이지 않은 컷 */
  at?: [number, number];
  lines: number[];
};

/**
 * 06 편집 — 그 장면 구간의 완성본 컷 띠. a ~ b(완성본 초)를 cuts(컷 경계)로 나눈 칸, 칸 폭 = 길이.
 * frames = 칸마다 완성본 프레임 한 장(칸 수 = cuts + 1). 없으면 src(이어 붙인 띠 그림)를 늘여 깐다.
 */
export type Strip = { a: number; b: number; cuts: number[]; labels?: string[]; frames?: string[]; src?: string };

export type Stage = {
  key: StageKey;
  /** 사실 칩 1~3 — 무엇 · 무슨 툴(명사구) */
  chips: string[];
  /** 왼쪽 종이에서 밝힐 줄(발췌 번호) — 나머지는 .38 */
  lit: number[];
  /**
   * 작가 원문 1~3문장 — 01 기획(작품 설명 · 기획의도) · 04 세그먼트(작가가 직접 쓴 연출 메모)만.
   * to = 그 문장이 가리키는 컷(사실 라벨, 예 'B1 · B3')
   */
  text?: { label: string; lines: (Verbatim & { to?: string })[] };
  /** 그림 1~3장 */
  pics?: Pic[];
  bar?: Bar;
  segments?: Segment[];
  strip?: Strip;
  /** 작가 캡처 자리 이름(06 편집) — 예 '애프터 이펙트 · #7 패널 작업 화면' */
  capture?: string;
};

/** 끝 — 대본 구절 ↔ 완성본 프레임 짝(Pixar Script to Screen) */
export type Pair = { lines: number[]; t: number; pic: Pic };

export type SceneProcess = {
  /** 장면 이름(사실) — 예 'S#7 놀이공원' */
  title: string;
  /** 대본 이름 · 쪽(사실) — 예 '예고편 대본 [1차] · 3쪽' */
  script: string;
  /** 발췌의 원문 절(md) */
  src: string;
  /** 완성본 구간(초) */
  range: [number, number];
  excerpt: ScriptLine[];
  /** STAGES 순서 그대로 6개 */
  stages: Stage[];
  pairs: Pair[];
  /** 「▶ 이 장면 보기」 — 위 풀영상을 이 초부터(iframe start=) */
  play: number;
};

export type ToolPrefix = 'Image' | 'Video' | 'Edit' | 'Sound' | 'Previs';

export type Overview = {
  /** 작품 소개 — 작가 원문(통째). 첫 덩어리를 제목 줄로 쓰려면 lead: true */
  intro: (Verbatim & { lead?: boolean })[];
  /** 점선 사양표 — 사실. key 'role' 은 시험 (b) 가 찾는다 */
  spec: { k: string; v: string; key?: string }[];
  /** 툴 — 이재학 TOOLS 카드 접두(Image: / Video: / Edit: / Sound:) */
  tools: { k: ToolPrefix; v: string }[];
};

export type WorkRoom = {
  slug: string;
  /** 원문 대조 문서(`_분석/작품과정/` 아래 파일 이름) */
  doc: string;
  overview: Overview;
  process?: SceneProcess;
};

/** 초 → 'm:ss' (소수 한 자리까지 쓰려면 digits=1) */
export const mmss = (t: number, digits = 0) => {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  const ss = digits ? s.toFixed(digits).padStart(3 + digits, '0') : String(Math.floor(s)).padStart(2, '0');
  return `${m}:${ss}`;
};

/** 길이(초) → '0.7초' */
export const secs = (a: number, b: number) => `${(b - a).toFixed(1)}초`;
