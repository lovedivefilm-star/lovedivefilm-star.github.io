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
  /** 대본 쪽 전체 안에서 강조할 원문 줄 인덱스 */
  focusLines: number[];
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
  final: { img: string; w: number; h: number; alt: string; t: number; cap: string; box?: Box };
};

const P = '/media/process';

export const CUTS: Record<string, Cut> = {
  oneandonly: {
    // S#6의 정점 세 줄 전체. 작가 지시 치환만 적용한다.
    sentence: '곧 가마에서 내리는 한 여인. 장옷 때문에 얼굴이 잘 보이지 않는다. 장옷을 걷으면 – 웅성이는 포졸들. 남주도 올려다보는데, 역광 때문에 옆모습의 실루엣만 보이고.\n장수1(!) (급하게 말에서 내려 엎드리며) 정.. 정경부인!\n일제히 엎드려 인사를 올리는 포졸과 장수. 여주가 돌아서면, 옆얼굴이 드러난다. 남주 빤히 보는데 – 커지는 동공.',
    focusLines: [7, 8, 9],
    src: '1-2 대본 S#6',
    words: ['옆얼굴'],
    step1: '가마에서 내린 여인의 신분과 얼굴이 드러나는 S#6 대목을 따라갑니다.',
    sheet: {
      img: `${P}/oneandonly/oo_reveal_sheet.jpg`, w: 1600, h: 904,
      alt: '여주 한복 시트 — 앞 · 뒤 · 얼굴', word: '옆얼굴',
      box: [70, 4, 29, 72],
      cap: '인물 시트의 얼굴을 기준으로 이어갑니다. · 팀 제작',
    },
    board: {
      img: `${P}/oneandonly/oo_reveal_board.jpg`, w: 576, h: 1024,
      alt: '콘티 — 역광 속에서 드러나는 여인의 옆얼굴',
      from: { kind: 'sheet', box: [70, 4, 29, 72] },
      box: [27, 15, 56, 38],
      cap: '콘티에서 옆얼굴의 구도와 역광을 잡습니다. · Blender → GPT Image 2.5',
      note: '',
    },
    final: {
      img: `${P}/oneandonly/oo_reveal_final.jpg`, w: 720, h: 1280,
      alt: '완성본 2:39.50 — 역광 속에서 드러난 여인의 옆얼굴',
      t: 159.5, box: [30, 26, 55, 39],
      cap: '옆얼굴이 드러나는 컷을 생성해 완성본에 편집했습니다. · Seedance 2.5 · Premiere Pro',
    },
  },
  firstimpression: {
    sentence: '청원 경찰들이 문을 열어주면 – 안으로 향하는 셋.',
    focusLines: [9],
    src: '1-3 대본 S#3',
    words: ['셋'],
    step1: '리무진에서 내려 은행으로 들어가는 대본 대목을 따라갑니다.',
    sheet: {
      img: `${P}/firstimpression/fi_img_2.jpg`,
      w: 1600,
      h: 893,
      alt: '한서진 투자자 변장 시트 — 앞 · 뒤 · 얼굴',
      word: '셋',
      // 가운데 칸 뒷모습(흰 정장) — 완성 0:21 에서 셋 중 오른쪽, 뒷모습으로 걷는 서진
      box: [41, 0, 18, 97],
      cap: '대본 속 셋 중 서진의 뒷모습을 시트로 확인합니다. · Nano Banana Pro',
    },
    board: {
      img: `${P}/firstimpression/fi_img_3.jpg`,
      w: 540,
      h: 960,
      alt: '프리비즈 스틸 — 복도 · 세 사람 자리',
      // 시트의 뒷모습 → 프리비즈 오른쪽 덩어리(초록 모서리) = 셋 중 서진 자리
      from: { kind: 'sheet', box: [41, 0, 18, 97] },
      box: [63, 37.5, 34, 58],
      cap: '프리비즈에서 복도와 세 사람이 걷는 위치를 잡았습니다. · Blender',  // 10-14 메인: 이 장면(S2-A) 프리비즈는 3D 은행 세트(S4 계열)가 아님 — firstimpression_장면과정.md 03절
      note: '원테이크 한 컷 · 8초',
    },
    final: { img: `${P}/firstimpression/fi_gen_1.jpg`, w: 720, h: 1280, alt: '완성본 0:21', t: 21, cap: 'Seedance 2.5 생성 · Premiere Pro 편집' },
  },
  butter: {
    sentence: '홀로 분주해보이는 지현. UI 창을 띄우더니 관리자로 접근하려는데 – 자꾸만 접근에 실패한다.',
    focusLines: [14],
    src: '1-3 ① 예고편 대본 3쪽',
    words: ['지현', 'UI 창'],
    step1: '지현이 관리자 모드로 접근하려다 실패하는 대목을 따라갑니다.',
    sheet: {
      img: `${P}/butter/sheet_jihyeon.jpg`,
      w: 1600,
      h: 904,
      alt: '지현 S#7 얼굴 레퍼런스',
      word: '지현',
      // 단발 머리 · 얼굴 — 완성 1:04.7 의 단발 뒷머리
      box: [33, 0, 49, 76],
      cap: '지현의 얼굴 레퍼런스를 만들었습니다. · Seedream 5.0 Pro',
    },
    board: {
      img: `${P}/butter/plate_admin.jpg`,
      w: 1600,
      h: 905,
      alt: '관리자 모드 UI 플레이트(그린스크린)',
      // 「UI 창」 → 플레이트의 「관리자 모드」(틀 = 완성 2.39:1, 플레이트는 위아래가 잘려 깔림)
      from: { kind: 'word', word: 'UI 창' },
      box: [4.5, 40, 36.5, 25],
      cap: '관리자 UI를 별도 플레이트로 만들어 영상에 합성했습니다. · GPT Image 2',
      note: '컷 5개 · 13초',
    },
    final: { img: `${P}/butter/bt_cut_final.jpg`, w: 1600, h: 670, alt: '완성본 1:04.7', t: 64.7, cap: '생성 영상에 UI를 합성하고 컷을 이어 편집했습니다. · After Effects · Premiere Pro' },
  },
};

for (const [slug, c] of Object.entries(CUTS)) {
  for (const w of c.words) if (!c.sentence.includes(w)) throw new Error(`컷 ${slug}: 밑줄 낱말 「${w}」 이 문장에 없음`);
  if (!c.words.includes(c.sheet.word)) throw new Error(`컷 ${slug}: 시트 낱말이 words 에 없음`);
}
