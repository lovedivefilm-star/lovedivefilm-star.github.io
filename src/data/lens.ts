/**
 * 홈 작품 화면 — 오목 면의 사다리꼴 카드 5장(작가 10-14 「그냥 직사각형을 사다리꼴로 자른다고 생각해봐 그걸 입체감있게 오목으로 가져가고」 · 메인 해석 1단계c).
 *
 * 좌표는 카드 묶음(렌즈) 상자 기준 0~1(가로 = 92vw · 세로 ≈ 80vh). 빌드 때 셈해 % 로 내보낸다 → 화면 크기와 무관하게 같은 꼴.
 *  · 카드 = 직사각형 그림 · 영상을 윗변 · 아랫변만 비스듬히 잘라 낸 사다리꼴. 세로 이음매는 곧은 수직선(2px) — 이웃 카드의 맞닿는 변 높이가 같아 끊김 없이 이어진다.
 *  · 바깥쪽 세로변이 길고 가운데 쪽이 짧다 → 윗선은 양 끝에서 가운데로 내려가고 아랫선은 올라오는 오목한 실루엣(Kavieng 벽을 정면에서 본 원근).
 *    양 끝 카드 바깥 변 = 묶음 높이(≈ 80vh) · 가운데 버터 = 묶음의 80%(≈ 64vh, 양쪽 높이가 같아 직사각형 — 가장 낮다).
 *  · 폭도 양 끝이 넓고 가운데가 좁다 — 가운데(버터)는 가장 넓은 카드의 75% 이상(빌드 검사).
 *  · 입체감: 카드 안 그림 · 영상만 살짝 rotateY(바깥 카드일수록 안쪽을 향해 — 사다리꼴 윤곽 · 이음매는 그대로) + 가운데로 갈수록 아주 약하게 어둡게.
 */
type Pt = [number, number];

/** 카드 폭(묶음 폭 대비) — 오직 · 첫 인상 · 버터 · 테크니컬 작업 · 대본 */
const WIDTH = [0.22, 0.195, 0.17, 0.195, 0.22];
/** 이음매 x 에서 윗선 높이 — 바깥 끝 0 → 둘째 이음매 0.06 → 가운데 카드 0.1(아랫선은 대칭) */
const EDGE_V = [0, 0.06, 0.1, 0.1, 0.06, 0];
/** 이음매 2px — 1440 의 묶음 폭 1325px 기준 한쪽 0.08% */
const GAP = 0.0008;
/** 가운데로 갈수록 살짝 어둡게(가운데가 깊다) */
export const DIM = [1, 0.94, 0.88, 0.94, 1];
/** 카드 안 그림 · 영상의 기울기(°) — 바깥 카드일수록 안쪽을 향해 */
export const TURN = [7, 3.5, 0, -3.5, -7];

const f = (n: number) => (Math.round(n * 1000) / 10).toFixed(1);
const xs = WIDTH.reduce<number[]>((acc, w) => [...acc, acc[acc.length - 1] + w], [0]);

type Box = { x: number; y: number; w: number; h: number };
const bbox = (pts: Pt[]): Box => {
  const xx = pts.map((p) => p[0]);
  const yy = pts.map((p) => p[1]);
  const x = Math.min(...xx);
  const y = Math.min(...yy);
  return { x, y, w: Math.max(...xx) - x, h: Math.max(...yy) - y };
};
const local = (pts: Pt[], b: Box): Pt[] => pts.map(([x, y]) => [(x - b.x) / b.w, (y - b.y) / b.h]);
const polygon = (pts: Pt[]) => `polygon(${pts.map(([x, y]) => `${f(x)}% ${f(y)}%`).join(', ')})`;

export type Card = {
  /** 묶음 안 자리 · clip-path · 제목 줄 · (대본) 글 상자 — 인라인 CSS 변수 문자열 */
  vars: string;
  /** 테크니컬 작업 — 칸 4개의 인라인 CSS 변수 */
  cells?: string[];
};

export const CARDS: Card[] = WIDTH.map((_, i) => {
  const x0 = xs[i] + (i === 0 ? 0 : GAP);
  const x1 = xs[i + 1] - (i === WIDTH.length - 1 ? 0 : GAP);
  const tl: Pt = [x0, EDGE_V[i]];
  const tr: Pt = [x1, EDGE_V[i + 1]];
  const br: Pt = [x1, 1 - EDGE_V[i + 1]];
  const bl: Pt = [x0, 1 - EDGE_V[i]];
  const b = bbox([tl, tr, br, bl]);
  const lp = local([tl, tr, br, bl], b);
  const [ltl, ltr, lbr, lbl] = lp;
  const v = [
    `--i:${i}`,
    `--l:${f(b.x)}%`,
    `--t:${f(b.y)}%`,
    `--w:${f(b.w)}%`,
    `--h:${f(b.h)}%`,
    `--clip:${polygon(lp)}`,
    `--dim:${DIM[i]}`,
    `--turn:${TURN[i]}deg`,
    // 제목 줄 — 왼쪽 아래 꼭짓점 x, 아랫변의 가장 낮은 점 바로 아래(글은 수평)
    `--cap-l:${f(lbl[0])}%`,
    `--cap-t:${f(Math.max(lbl[1], lbr[1]))}%`,
    `--cap-w:${f(lbr[0] - lbl[0])}%`,
  ];
  const card: Card = { vars: '' };
  if (i === 4) {
    // 대본 — 안쪽의 반듯한 글 상자
    const y0 = Math.max(ltl[1], ltr[1]) + 0.02;
    const y1 = Math.min(lbl[1], lbr[1]) - 0.02;
    v.push(`--safe-l:6%`, `--safe-t:${f(y0)}%`, `--safe-w:88%`, `--safe-h:${f(y1 - y0)}%`);
  }
  if (i === 3) {
    // 테크니컬 작업 — 같은 사다리꼴 안을 수평 이음매로 4등분(이음매 2px ≈ 카드 높이 620px 기준 한쪽 0.16%)
    const top = (ltl[1] + ltr[1]) / 2;
    const bot = (lbl[1] + lbr[1]) / 2;
    const g = 0.0016;
    const at = (k: number) => top + ((bot - top) * k) / 4;
    card.cells = [0, 1, 2, 3].map((k) => {
      const yTop = k === 0 ? null : at(k) + g;
      const yBot = k === 3 ? null : at(k + 1) - g;
      const cp: Pt[] = [
        [0, yTop ?? ltl[1]],
        [1, yTop ?? ltr[1]],
        [1, yBot ?? lbr[1]],
        [0, yBot ?? lbl[1]],
      ];
      const cb = bbox(cp);
      return [`--cl:${f(cb.x)}%`, `--ct:${f(cb.y)}%`, `--cw2:${f(cb.w)}%`, `--ch:${f(cb.h)}%`, `--cclip:${polygon(local(cp, cb))}`].join(';');
    });
  }
  card.vars = v.join(';');
  return card;
});

// 빌드 때 검사 — 가운데(버터)는 가장 넓은 카드의 75% 이상 · 오목(바깥 변이 길다)
{
  if (WIDTH[2] / Math.max(...WIDTH) < 0.75) throw new Error('렌즈: 가운데 카드(버터)가 가장 넓은 카드의 75% 미만');
  if (Math.abs(WIDTH.reduce((a, c) => a + c, 0) - 1) > 1e-6) throw new Error('렌즈: 카드 폭 합이 1 이 아님');
  for (let i = 0; i < 2; i++) if (!(EDGE_V[i] < EDGE_V[i + 1] && EDGE_V[5 - i] < EDGE_V[4 - i])) throw new Error('렌즈: 오목이 아님 — 바깥 변이 가운데 쪽 변보다 짧음');
}
