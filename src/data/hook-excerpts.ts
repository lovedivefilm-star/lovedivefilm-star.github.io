/**
 * 작품방 첫 화면(StoryHook)의 대본 발췌 — 후킹 클립과 같은 대목.
 * 원문 대본에서 줄 단위로만 고른다(문장 안은 손대지 않는다). 대본에 없는 대목만 `own` 으로 따로 적고 근거를 단다.
 */
import { PAGES, type PageLine } from './pages';
import { applyEdits } from './edits';

export type HookExcerpt = {
  /** 종이 머리줄 */
  label: string;
  /** 원문 파일(_분석/대본/) */
  src: string;
  /** 발췌 위 씬 머리 */
  scene?: PageLine;
  /** 종이에 쓰이는 줄(타이핑 순서) */
  lines: PageLine[];
  /** 선이 영상으로 이어지는 줄 — 클립이 시작하는 줄 */
  anchor: number;
  /** 「이 씬 대본 모두 읽기」 — 씬 전체와 그 안에서 발췌가 차지하는 줄 */
  scene_all?: { lines: PageLine[]; from: number; to: number };
};

const edit = (slug: string, line: PageLine): PageLine => ({ ...line, s: applyEdits(slug, line.s) });

/** PAGES 의 한 씬에서 [from, to] 줄을 발췌 */
const fromPage = (slug: string, label: string, sceneAt: number, from: number, to: number, anchor = 0): HookExcerpt => {
  const page = PAGES[slug];
  const next = page.lines.findIndex((line, index) => index > sceneAt && line.t === 'scene');
  const body = page.lines.slice(sceneAt + 1, next < 0 ? undefined : next).map((line) => edit(slug, line));
  return {
    label,
    src: page.src,
    scene: edit(slug, page.lines[sceneAt]),
    lines: page.lines.slice(from, to + 1).map((line) => edit(slug, line)),
    anchor,
    scene_all: { lines: body, from: from - sceneAt - 1, to: to - sceneAt - 1 },
  };
};

export const HOOK_EXCERPTS: Record<string, HookExcerpt> = {
  // 작가 2026-10-19 지정(대본 캡처): 「일제히 엎드려 인사를 올리는」 ~ 「저 자는 내 것이다.」 = 완성본 2:35.9–2:57.1
  oneandonly: fromPage('oneandonly', '대본 · S#6', 0, 9, 15),
  // 기존 첫 화면 줄 그대로(통로 진입 = 완성본 0:16–0:33)
  firstimpression: fromPage('firstimpression', '대본 · S#3', 8, 9, 13),
  // 완성본 0:42.25–0:53.7(차 안 → 추락 → 룰렛)은 [1차] 예고편 대본에 대사가 없다(나중에 추가한 대목). 작가 확인 · 2026-10-19 공개 지시.
  // 작가 2026-10-19 「내 대본 문체와 방식을 학습해서 영상을 역으로 대본으로 옮겨봐 담백하게」. 화자는 음높이로 확인(한주 ≈90–110Hz, 지현 ≈205–215Hz).
  // 「지현, 골전도 이어폰을 꾹 누르면 — 의식을 잃고.」 는 [1차] 대본 원문 줄.
  // 작가 2026-10-19: 「우리가 만난 세계」 줄 삭제 · 「성당, 성당, 성당.」 삭제 — 차 안부터.
  butter: {
    label: '예고편 대본 · 차 안',
    src: '_분석/대본/butter_트레일러대본.txt',
    scene: { t: 'scene', s: '차 안 / D' },
    lines: [
      { t: 'act', s: '태블릿을 쥔 지현. 골전도 이어폰에 손을 올린다.' },
      { t: 'dia', who: '한주(E)', s: '한주(E) 정말 내가 의심 돼?' },
      { t: 'act', s: '지현, 골전도 이어폰을 꾹 누르면 — 의식을 잃고.' },
      { t: 'act', s: '뒤로 넘어간 고개. 지현의 눈동자 위로 푸른 격자가 번진다.' },
      { t: 'dia', who: '지현(E)', s: '지현(E) 아니,' },
      { t: 'act', s: '빛의 터널 속으로, 끝없이 떨어지는 지현.' },
      { t: 'dia', who: '지현(E)', s: '지현(E) 믿어.' },
      { t: 'act', s: '노란 버터의 룰렛이 돌아가다 멈추면 —' },
    ],
    anchor: 0,
  },
};
