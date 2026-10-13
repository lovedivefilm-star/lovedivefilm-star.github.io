/**
 * 작품 데이터 — docs/contract.md 2절 표 그대로(한 곳).
 * 글: 대본 줄은 src/data/scripts.ts(원문 줄 그대로) 의 번호로만 가리킨다 — 여기서 문장을 쓰지 않는다.
 * 미디어: public/media/ (출처는 public/media/출처.json).
 */
import { SCRIPTS, type ScriptLine } from './scripts';

export type Ratio = '9:16' | '16:9';
export type Group = 'main' | 'tools';

/** 크레딧 한 줄 — 값이 null 이면 [작가 확인 자리] 로 보인다. */
export type Credit = { k: string; v: string | null; ph?: string };

/** 후킹 구역의 대본 한 줄 — 시각은 후킹 클립 안의 초. */
export type HookLine = {
  /** SCRIPTS[slug] 의 줄 번호 */
  i: number;
  /** 화면이 열리기 전에 미리 치는 줄(씬 헤더 등) */
  pre?: boolean;
  /** 클립 시각에 맞춘 타이핑: [초, 이 글자까지] — '' 는 0글자 */
  kf?: [number, string][];
  /** 이 줄이 화면에 나오는 구간(밝게) */
  now?: [number, number][];
  /** 치지 않고 흐리게 이어지는 줄 */
  ghost?: boolean;
};

export type Hook = {
  clip: string;
  poster: string;
  strip: string;
  /** 클립 길이(초) */
  dur: number;
  /** 완성본에서 이 클립이 시작하는 시각(초) — 타임코드 표시용 */
  offset: number;
  fps: number;
  /** 화면 비율(클립 그대로) — CSS aspect-ratio */
  aspect: string;
  /** 머리줄: 「대본 · S#1」 등 */
  label: string;
  /** 타임라인 머리의 사양 한 줄(ffprobe 로 확인한 값) */
  spec: string;
  /** 컷 지점(클립 안의 초) */
  cuts: number[];
  lines: HookLine[];
};

/** 작업대 한 칸 — path 는 작가 제작 폴더 안의 실제 파일 · 폴더(작품 폴더 이름은 빼고 그 아래부터) */
export type Version = { label: string; from?: string; to: string; path?: string };

export type Work = {
  slug: string;
  title: string;
  group: Group;
  ratio: Ratio;
  youtubeId: string;
  /** 규약 2절 크레딧 칸 원문 */
  creditNote: string;
  duration: string;
  poster: string;
  /* 주력 */
  /** 홈 출입구에 쓰는 이름(규약 1절) */
  door?: string;
  no?: string;
  format?: string;
  year?: string;
  credits?: Credit[];
  hook?: Hook;
  /** 03 생성 단계 — 프롬프트 기록 글(_분석/제작자료_목록.md 의 파일 · 버전 수만) */
  record?: { summary: string; lines: string[] };
  /** 04 편집 단계 — 사실 정보(파일 · 버전 수)만 */
  edit?: string[];
  /** 03 생성 · 04 편집의 버전 줄 — 작가가 가진 실제 파일 버전만(_분석/제작자료_목록.md). from 이 없으면 마지막 판 하나만 */
  versions?: Version[];
  editVersions?: Version[];
  /** 02 대본 단계 머리 — 어느 대본의 어느 씬인가 */
  scriptLabel?: string;
  sheets?: { src: string; caption: string }[];
  /* 툴 */
  label?: string;
  /** 툴 카드 분류 — 작가 유튜브 영상 제목에 쓴 말 그대로 */
  category?: string;
  sourceNote?: string | null;
};

const TOOL_PH = '툴 확인 후';

export const WORKS: Work[] = [
  {
    slug: 'oneandonly',
    title: '오직 당신의 것 EP.01',
    group: 'main',
    ratio: '9:16',
    youtubeId: 'NPlAjWuCsAY',
    creditNote: '대본 김영건 · 생성/편집 팀 공동',
    duration: '3:00',
    poster: '/media/poster_oneandonly.jpg',
    door: '오직 당신의 것',
    no: '01',
    scriptLabel: '대본 · S#1 INT. 옥타곤 링 / N (현재)',
    edit: ['편집 프로젝트 — 프리미어 백업 v0.4 → v1.0'],
    versions: [
      { label: 'S4-A 프롬프트', from: 'v1', to: 'v16', path: '03_프롬프트/S4-A/' },
      { label: 'S6-D 프롬프트', from: 'v1', to: 'v7', path: '03_프롬프트/S6-D/' },
      { label: 'S4-E 제압 CU 프롬프트', to: 'v5', path: '03_프롬프트/S4-E/2026-10-02_S4-E_제압CU_두건높이키차이_우두머리CU_3컷_11s_2.5_v5.txt' },
    ],
    editVersions: [{ label: '프리미어 프로젝트 백업', from: 'v0.4', to: 'v1.0', path: '99_보관/프로젝트백업/' }],
    format: 'AI 숏드라마',
    year: '2026',
    credits: [
      { k: '대본', v: '김영건' },
      { k: '생성 · 편집', v: '팀 공동' },
      { k: '도구', v: null, ph: TOOL_PH },
    ],
    hook: {
      clip: '/media/hook_oneandonly.mp4',
      poster: '/media/hook_oneandonly.jpg',
      strip: '/media/strip_oneandonly.jpg',
      dur: 287 / 24,
      offset: 2 / 24,
      fps: 24,
      aspect: '9 / 16',
      label: '대본 · S#1',
      spec: '720×1280 · 24fps · 완성본 00:00–00:12',
      cuts: [7.4583, 10.125],
      // 시각: 시안/히어로_v1 의 번인 자막 실측(장면후보.md §3, ±0.25초)
      lines: [
        { i: 0, pre: true },
        { i: 1, pre: true, now: [[0, 7.4583]] },
        { i: 2, kf: [[0.05, ''], [1.1, '슬로우모션처럼.']], now: [[0, 7.4583]] },
        { i: 3, kf: [[1.1667, ''], [2.2, '느리다.'], [3.92, '느리다.'], [4.27, '특히,'], [5.17, '특히,'], [5.8, '내게는 더.']], now: [[1.1667, 6.5167]] },
        { i: 4, kf: [[7.5, ''], [9.5, '같은데-']], now: [[7.4583, 11.958]] },
        { i: 5, kf: [[9.6667, ''], [10.2, '그러니까 -']], now: [[9.6667, 11.958]] },
        { i: 6, ghost: true },
        { i: 7, ghost: true },
      ],
    },
    record: {
      summary: '프롬프트 S4-A v1 → v16',
      lines: [
        '프롬프트 — 컷별 폴더 S3-A ~ S6-G · S4-A v1 → v16 · S6-D v1 → v7',
        '프롬프트 — S4-E 제압 CU · 3컷 · 11s · v5',
      ],
    },
    sheets: [
      { src: '/media/sheets/oo_sheet_1.jpg', caption: '에셋 시트 · 가마 내부 두 방향 대조 (C1 · C2)' },
      { src: '/media/sheets/oo_sheet_2.jpg', caption: '에셋 시트 · 가마 내부 앞문 쪽 (C1)' },
      { src: '/media/sheets/oo_sheet_3.jpg', caption: '에셋 시트 · 가마 외관 대조 (B)' },
      { src: '/media/sheets/oo_sheet_4.jpg', caption: '에셋 시트 · 관객 (H)' },
    ],
  },
  {
    slug: 'firstimpression',
    title: '첫 인상은 백점, 첫 마디는 엎드려',
    group: 'main',
    ratio: '9:16',
    youtubeId: '1XMjpYyastE',
    creditNote: '대본 김영건 · 생성/편집 팀 공동',
    duration: '4:47',
    poster: '/media/poster_firstimpression.jpg',
    door: '첫 인상은 백점, 첫 마디는 엎드려',
    no: '02',
    scriptLabel: '대본 · S#2 리무진 안 → S#3 은행 통로',
    edit: ['편집 프로젝트 — 프리미어 프로젝트 파일 10개'],
    versions: [
      { label: 'S2-A 원테이크 프롬프트', to: 'v8', path: '04_영상/2026-09-06_S2-A_주차장_통로_원테이크_10s_2.5_v8.txt' },
      { label: '얼굴 원판 프롬프트', to: 'v4', path: '03_인물/여주/2026-09-02_얼굴원판_프롬프트_v4.txt' },
      { label: '캐릭터 시트 프롬프트', to: 'v2', path: '03_인물/남주/2026-09-03_캐릭터시트_프롬프트_Seedream5Pro_v2.txt' },
      { label: '재갈 상태 시트', from: 'PASS 1', to: 'PASS 3', path: '03_인물/여주/2026-09-09_재갈상태시트_GPT2_PASS3_v1.txt' },
      { label: '블로킹맵 생성 프롬프트', to: 'v2', path: '04_영상/프리비즈/2026-09-10_S4-F0_C1_블로킹맵_v2_생성프롬프트.txt' },
    ],
    format: 'AI 숏드라마',
    year: '2026',
    credits: [
      { k: '대본', v: '김영건' },
      { k: '생성 · 편집', v: '팀 공동' },
      { k: '도구', v: null, ph: TOOL_PH },
    ],
    hook: {
      clip: '/media/hook_firstimpression.mp4',
      poster: '/media/hook_firstimpression.jpg',
      strip: '/media/strip_firstimpression.jpg',
      dur: 17,
      offset: 16,
      fps: 24,
      aspect: '9 / 16',
      label: '대본 · S#3',
      spec: '720×1280 · 24fps · 완성본 00:16–00:33',
      // 컷: ffmpeg 장면 전환 감지(scene > 0.25)
      cuts: [7.917, 9.125, 10.625, 11.833, 15.042],
      // 번인 자막이 없어 시각은 「대략」 — 줄이 바뀌는 리듬만 맞춘다(장면후보.md F1)
      lines: [
        { i: 7, ghost: true },
        { i: 8, pre: true },
        { i: 9, kf: [[0.1, ''], [1.3, '셋.']], now: [[0, 3]] },
        { i: 10, kf: [[3, ''], [6, '거고...']], now: [[3, 6.6]] },
        { i: 11, kf: [[6.6, ''], [8.8, '폐쇄되고 -']], now: [[6.6, 9.1]] },
        { i: 12, kf: [[9.1, ''], [9.9, '아니었어?']], now: [[9.1, 10.6]] },
        { i: 13, kf: [[9.9, ''], [12.6, '키스하고 -']], now: [[9.1, 15]] },
        { i: 14, kf: [[13.2, ''], [14.0, '짜증 나서.']], now: [[13.2, 15]] },
      ],
    },
    record: {
      summary: 'S2-A 원테이크 프롬프트 v8',
      lines: [
        '프롬프트 — S2-A 주차장 통로 원테이크 10s · v8',
        '인물 프롬프트 — 얼굴 원판 v4 (Midjourney V8.2) · 캐릭터 시트 Nano Banana Pro v2 · Seedream 5 Pro v2',
        '상태 시트 프롬프트 — GPT Image 2 PASS 1 ~ 3',
        '블로킹맵 생성 프롬프트 — v2',
      ],
    },
    sheets: [
      { src: '/media/sheets/fi_sheet_1.jpg', caption: '캐릭터 시트 · 홍선희 현재' },
      { src: '/media/sheets/fi_sheet_2.jpg', caption: '캐릭터 시트 · 홍선희 과거' },
      { src: '/media/sheets/fi_sheet_3.jpg', caption: '캐릭터 시트 · 한서진 현재' },
      { src: '/media/sheets/fi_sheet_4.jpg', caption: '캐릭터 시트 · 한서진 투자자' },
    ],
  },
  {
    slug: 'butter',
    title: '버터! [VirTer!]',
    group: 'main',
    ratio: '16:9',
    youtubeId: 'U3niqUCEe4M',
    creditNote: '단독',
    duration: '1:51',
    poster: '/media/poster_butter.jpg',
    door: '버터!',
    no: '03',
    scriptLabel: '예고편 대본 [1차] · 섬',
    edit: ['편집 프로젝트 — 1분30초 프로젝트.prproj (2026-08-31)'],
    versions: [
      { label: 'S1-D 프롬프트', to: 'v8', path: '99_보관/프롬프트/round1_test/기타시퀀스/S1-D_v8_4컷_1080p.txt' },
      { label: '엔딩 타이틀 프롬프트', to: 'v4' },
      { label: '지현 얼굴 시트 i2i', to: 'v2', path: 'i2i수정/2026-08-15_지현_강당하이앵글얼굴시트_SEEDREAM_i2i_v2.txt' },
    ],
    format: 'AI 트레일러',
    year: '2026',
    credits: [
      { k: '대본', v: '김영건' },
      { k: '생성 · 편집', v: '김영건 (단독)' },
      { k: '도구', v: null, ph: TOOL_PH },
    ],
    hook: {
      clip: '/media/hook_butter.mp4',
      poster: '/media/hook_butter.jpg',
      strip: '/media/strip_butter.jpg',
      dur: 16,
      offset: 0,
      fps: 24,
      aspect: '1920 / 804',
      label: '예고편 대본 [1차] · 섬',
      spec: '1920×1080 · 24fps · 완성본 00:00–00:16 · 레터박스 잘라 냄',
      cuts: [0.875, 1.458, 2.375, 3.333, 6.417, 7.917, 9.417, 11.042, 12.875, 14.125, 15.25],
      // 앞 1:13 까지만 번인 자막이 있고 이 구간엔 대사가 없다 — 화면 기준 「대략」(장면후보.md B1)
      lines: [
        { i: 0, pre: true },
        { i: 1, pre: true },
        { i: 2, kf: [[0.05, ''], [1.6, '있다.']], now: [[0, 6.417]] },
        { i: 3, kf: [[3.3, ''], [4.2, '보인다.']] },
        { i: 4, kf: [[6.417, ''], [7.0, '있다.']], now: [[6.417, 7.917]] },
        { i: 5, kf: [[7.0, ''], [7.9, '돌아오고.']], now: [[6.417, 7.917]] },
        { i: 6, kf: [[7.917, ''], [8.4, '얼굴.']], now: [[11.042, 12.875]] },
        { i: 7, kf: [[9.417, ''], [10.4, "전달됩니다'"]], now: [[9.417, 11.042]] },
        { i: 8, kf: [[10.4, ''], [11.0, 'NO.']], now: [[7.917, 9.417]] },
        { i: 9, kf: [[12.875, ''], [13.4, '키스.']], now: [[12.875, 15.25]] },
        { i: 10, kf: [[14.125, ''], [14.6, '드러나고.']], now: [[14.125, 15.25]] },
        { i: 11, kf: [[15.25, ''], [15.5, '줌아웃 —']], now: [[15.25, 16]] },
      ],
    },
    record: {
      summary: '프롬프트 round1_test 205개',
      lines: [
        '프롬프트 — round1_test 205개 (예: S1-D v8 · seedance_2_0 · 10s · 1080p · 16:9)',
        '얼굴 드리프트 교정 프롬프트 — 지현 강당 하이앵글 얼굴 시트 · Seedream i2i v2',
        '엔딩 타이틀 프롬프트 — v4 (t2v)',
      ],
    },
    sheets: [
      { src: '/media/sheets/bt_sheet_1.jpg', caption: '캐릭터 시트 · 지현 정본' },
      { src: '/media/sheets/bt_sheet_2.jpg', caption: '캐릭터 시트 · 한주 정본' },
      { src: '/media/sheets/bt_sheet_3.jpg', caption: '캐릭터 시트 · 지현 #1 정본' },
    ],
  },
  {
    slug: 'kinetic',
    title: '키네틱 타이포',
    group: 'tools',
    ratio: '16:9',
    youtubeId: 'Oj4sifOxMmc',
    creditNote: '단독 · 출처 칸(비움)',
    duration: '0:38',
    poster: '/media/poster_kinetic.jpg',
    year: '2026',
    category: 'Kinetic typography',
    sourceNote: null,
  },
  {
    slug: 'mindhunter',
    title: '마인드헌터',
    group: 'tools',
    ratio: '16:9',
    youtubeId: '4AJDL9m3Zic',
    creditNote: '단독 · 「모작」 · 출처 칸(비움)',
    duration: '0:37',
    poster: '/media/poster_mindhunter.jpg',
    year: '2026',
    category: 'Title sequence',
    label: '모작',
    sourceNote: null,
  },
  {
    slug: 'curlyshyll',
    title: 'Curly shyll AI CF',
    group: 'tools',
    ratio: '16:9',
    youtubeId: 'OtggacvS4U0',
    creditNote: '단독 · 출처 칸(비움)',
    duration: '0:34',
    poster: '/media/poster_curlyshyll.jpg',
    year: '2026',
    category: 'Fan AI CF',
    sourceNote: null,
  },
  {
    slug: 'musicvideo',
    title: '뮤직비디오',
    group: 'tools',
    ratio: '16:9',
    youtubeId: 'biPmgQnTzdw',
    creditNote: '단독 · 출처 칸(비움)',
    duration: '4:03',
    poster: '/media/poster_musicvideo.jpg',
    year: '2026',
    category: 'Fan MV',
    sourceNote: null,
  },
];

export const MAIN_WORKS = WORKS.filter((w) => w.group === 'main');
export const TOOL_WORKS = WORKS.filter((w) => w.group === 'tools');

export const workBySlug = (slug: string) => WORKS.find((w) => w.slug === slug);

/** 후킹 줄의 실제 글(원문 줄) */
export const hookText = (slug: string, i: number): ScriptLine => {
  const line = SCRIPTS[slug]?.[i];
  if (!line) throw new Error(`대본 줄 없음: ${slug}[${i}]`);
  return line;
};

/** kf 의 「이 글자까지」 가 원문 줄에 있는지 빌드 때 검사(없으면 빌드 실패) */
for (const w of MAIN_WORKS) {
  for (const l of w.hook?.lines ?? []) {
    const line = hookText(w.slug, l.i);
    for (const [, upto] of l.kf ?? []) {
      if (upto && !line.s.includes(upto)) throw new Error(`후킹 kf 표식이 원문에 없음: ${w.slug}[${l.i}] 「${upto}」`);
    }
  }
}
