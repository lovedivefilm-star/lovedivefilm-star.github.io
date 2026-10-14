/**
 * 「한 컷이 만들어진 순서」 — 고정 무대 + 스크롤 4걸음(대본 → 시트 → 연출 → 완성). 메인 지시 10-14(작가 반려 뒤).
 * 규칙: 연결은 **완성본 화면에 실제로 나오는 것끼리만** 잇는다. 좌표는 그림을 직접 열어 보고 잡았다.
 *  · 시트 상자(sheet.box)는 시트 그림 기준 % [x, y, w, h].
 *  · 연출 · 완성 상자(board.box)는 「틀」 기준 % — 틀 비율 = 완성 프레임 비율, 연출 그림은 그 틀에 cover 로 깐다(9:16 두 편은 같은 비율).
 * 글: 대본 문장은 원문 통째 문장(data-src = 원문 md 절). 칸 아래 한 줄은 사실(무엇 · 무슨 툴)만 — 날짜 · 판 수 · 내부 말 없음.
 * 미디어 출처: src/data/media-sources.json.
 */
export type Box = [number, number, number, number];

export type Cut = {
  /** 대본 문장(통째) — words 는 밑줄 낱말(문장 안에 그대로 있어야 한다) */
  sentence: string;
  src: string;
  words: string[];
  step1: string;
  sheet: { img: string; w: number; h: number; alt: string; word: string; box: Box; cap: string };
  board: {
    img: string;
    w: number;
    h: number;
    alt: string;
    /** 연결 시작 — 시트의 상자(from: 'sheet', box = 시트 기준 %) 또는 대본 낱말(from: 'word') */
    from: { kind: 'sheet'; box: Box } | { kind: 'word'; word: string };
    box: Box;
    cap: string;
    /** 세그먼트 한 줄(읽는 이 말로) */
    note: string;
  };
  final: { img: string; w: number; h: number; alt: string; t: number; cap: string };
};

const P = '/media/process';

export const CUTS: Record<string, Cut> = {
  oneandonly: {
    // 원문(3고) 「너울」 → 「장옷」 — 작가 지시 편집(src/data/edits.ts)
    sentence: '곧 가마에서 내리는 한 여인. 장옷 때문에 얼굴이 잘 보이지 않는다.',
    src: '1-2 대본 S#6',
    words: ['장옷'],
    step1: '김영건 대본',
    sheet: {
      img: `${P}/oneandonly/oo_03_1.jpg`,
      w: 1600,
      h: 904,
      alt: '여주 장옷 시트 — 앞 · 뒤 · 얼굴',
      word: '장옷',
      // 가운데 칸 뒷모습의 장옷(머리부터 장옷 끝단까지) — 완성 2:34.85 에 보이는 뒷모습 · 장옷
      box: [37.5, 4, 24.5, 49],
      cap: '‘장옷’ → 장옷 시트 · 팀 제작',
    },
    board: {
      img: `${P}/oneandonly/oo_03_2.jpg`,
      w: 576,
      h: 1024,
      alt: '콘티 — 뒷모습 · 쪽머리 · 머리 위로 들어 올린 천',
      // 시트 뒷모습 → 콘티의 같은 뒷모습(쪽머리 · 어깨 · 들어 올린 천) — 완성 2:34.85 와 자세가 같다. 10-14 작가 「블로킹맵 쓰지마」 → 블로킹맵 대신 콘티
      from: { kind: 'sheet', box: [36, 4, 27, 95] },
      box: [22, 30, 56, 70],
      cap: '구도: 콘티 — Blender 구도 → GPT Image 2.5',
      note: '이 장면 컷 2개 · 7.6초',
    },
    final: { img: `${P}/oneandonly/oo_cut_final.jpg`, w: 720, h: 1280, alt: '완성본 2:34.85', t: 154.85, cap: 'Seedance 2.5 생성 · Premiere Pro 편집' },
  },
  firstimpression: {
    sentence: '청원 경찰들이 문을 열어주면 – 안으로 향하는 셋.',
    src: '1-3 대본 S#3',
    words: ['셋'],
    step1: '김영건 대본',
    sheet: {
      img: `${P}/firstimpression/fi_img_2.jpg`,
      w: 1600,
      h: 893,
      alt: '한서진 투자자 변장 시트 — 앞 · 뒤 · 얼굴',
      word: '셋',
      // 가운데 칸 뒷모습(흰 정장) — 완성 0:21 에서 셋 중 오른쪽, 뒷모습으로 걷는 서진
      box: [41, 0, 18, 97],
      cap: '‘셋’ 중 서진 → 투자자 변장 시트 · Nano Banana Pro',
    },
    board: {
      img: `${P}/firstimpression/fi_img_3.jpg`,
      w: 540,
      h: 960,
      alt: '프리비즈 스틸 — 복도 · 세 사람 자리',
      // 시트의 뒷모습 → 프리비즈 오른쪽 덩어리(초록 모서리) = 셋 중 서진 자리
      from: { kind: 'sheet', box: [41, 0, 18, 97] },
      box: [63, 37.5, 34, 58],
      cap: '구도: Blender 프리비즈',  // 10-14 메인: 이 장면(S2-A) 프리비즈는 3D 은행 세트(S4 계열)가 아님 — firstimpression_장면과정.md 03절
      note: '원테이크 한 컷 · 8초',
    },
    final: { img: `${P}/firstimpression/fi_gen_1.jpg`, w: 720, h: 1280, alt: '완성본 0:21', t: 21, cap: 'Seedance 2.5 생성 · Premiere Pro 편집' },
  },
  butter: {
    sentence: '홀로 분주해보이는 지현. UI 창을 띄우더니 관리자로 접근하려는데 – 자꾸만 접근에 실패한다.',
    src: '1-3 ① 예고편 대본 3쪽',
    words: ['지현', 'UI 창'],
    step1: '김영건 대본',
    sheet: {
      img: `${P}/butter/sheet_jihyeon.jpg`,
      w: 1600,
      h: 904,
      alt: '지현 S#7 얼굴 레퍼런스',
      word: '지현',
      // 단발 머리 · 얼굴 — 완성 1:04.7 의 단발 뒷머리
      box: [33, 0, 49, 76],
      cap: '‘지현’ → 얼굴 레퍼런스 · Seedream 5.0 Pro',
    },
    board: {
      img: `${P}/butter/plate_admin.jpg`,
      w: 1600,
      h: 905,
      alt: '관리자 모드 UI 플레이트(그린스크린)',
      // 「UI 창」 → 플레이트의 「관리자 모드」(틀 = 완성 2.39:1, 플레이트는 위아래가 잘려 깔림)
      from: { kind: 'word', word: 'UI 창' },
      box: [4.5, 40, 36.5, 25],
      cap: '‘UI 창’ → 관리자 모드 UI 플레이트 · GPT Image 2',
      note: '컷 5개 · 13초',
    },
    final: { img: `${P}/butter/bt_cut_final.jpg`, w: 1600, h: 670, alt: '완성본 1:04.7', t: 64.7, cap: 'Seedance 2.0 → 2.5 생성 · After Effects 합성 · Premiere Pro 편집' },
  },
};

for (const [slug, c] of Object.entries(CUTS)) {
  for (const w of c.words) if (!c.sentence.includes(w)) throw new Error(`컷 ${slug}: 밑줄 낱말 「${w}」 이 문장에 없음`);
  if (!c.words.includes(c.sheet.word)) throw new Error(`컷 ${slug}: 시트 낱말이 words 에 없음`);
}
