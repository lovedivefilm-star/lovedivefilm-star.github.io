/**
 * 「한 컷이 만들어진 순서」 v5(2단계c — 오직 당신의 것 방) — S#6 의 정점(정경부인이 드러나는 대목)을 따라 4걸음, 걸음마다 「전체 중 일부만 또렷」.
 * 작가 10-14: 「지금도 대본의 존나 일부분만 가져오고 그게 좋은 부분도 아니어서」 → 고른 대목 「S#6 정경부인이 드러나는 장면 — 장수들이 엎드리고 역광 속 얼굴이 드러나는 대목」.
 *  1 대본 = S#6 전체(원문 _분석/대본/oneandonly_대본.txt 줄 그대로 · 「너울」→「장옷」 편집) 중 정점 세 줄만 또렷 · 밑줄 「옆얼굴이 드러난다」(주) · 「장옷」(보조)
 *  2 시트 = 시트 6장 중 둘 — 「장옷」 → 장옷 시트 뒷모습 칸(가는 선 · 장옷이 실제로 나오는 2:34 뒷모습 컷 쪽),
 *           「옆얼굴이 드러난다」 → 한복 시트 얼굴 칸(진한 선 · 옆얼굴 컷 S6-E e3 v3 생성에 얼굴 참조로 넣은 시트 — 메인 10-14 정정)
 *  3 연출 = 정점 대목의 콘티 S6-E 4칸(장수 · 일제히 엎드림 · 옆얼굴 · 동공) 중 옆얼굴 칸 — 한복 시트 얼굴 → 콘티 얼굴(콘티는 면사 시절 그림이라 자세 · 자리끼리만)
 *  4 완성 = 완성본 24칸 띠 중 옆얼굴이 드러나는 순간(2:39.5) → 쓰인 콘티 칸 위로 와이프 · 「▶ 이 장면 보기」 는 조금 앞(2:37)부터
 * 걸음마다 「어떻게 이어졌나」 설명 1~2문장(사실만 — 문장마다 근거 basis). 출처: src/data/media-sources.json.
 */
import type { Box } from './cut';
import { PAGES, type Page } from './pages';
import { applyEdits } from './edits';

export type Pic = { img: string; w: number; h: number; alt: string; label?: string };
export type Note = { s: string; basis: string };
export type Word = { w: string; key: 'back' | 'face'; main?: boolean };
export type Cut5 = {
  page: Page;
  /** 또렷하게 띄울 대목 — 첫 줄의 첫머리 · 줄 수(원문 줄 단위) */
  block: { from: string; lines: number };
  words: Word[];
  /** 걸음마다 「어떻게 이어졌나」(1~2문장 · 합계 ≤ 70자) */
  notes: [Note[], Note[], Note[], Note[]];
  /** 쓰인 시트 둘 — 뒷모습(장옷)과 얼굴(옆얼굴 컷)이 각기 다른 시트 */
  sheets: { cells: Pic[]; back: { i: number; box: Box }; face: { i: number; box: Box } };
  conti: { cells: Pic[]; used: number; box: Box };
  strip: { files: string[]; k: number; t: number };
  final: { img: string; alt: string; t: number; start: number };
};

const P = '/media/process';
/** 이전 작업 폴더에서 복원한 과정 무대용 사본. 출처는 media-sources.json. */
const ST = `${P}/oneandonly/stage`;
const BASIS_SCENE = '_분석/작품과정/oneandonly_장면과정.md';
const BASIS_WORK = '_분석/작품과정/oneandonly.md';
/** 작업 폴더의 결정로그(경로는 보고서에만 — 사이트 글 · HTML 에는 근거를 내보내지 않는다) */
const BASIS_LOG = '결정로그_조선파이터_완료.md';
/** 옆얼굴 컷(S6-E e3 v3) 생성 글 — 참조 그림 슬롯 표(@Image1 = 여주_한복.png) */
const BASIS_E3 = '작품 폴더 03_프롬프트/S6-E/2026-10-06_S6-E_e3옆얼굴_1컷_4s_2.5_v3.txt 42행';

export const CUT5: Record<string, Cut5> = {
  oneandonly: {
    page: PAGES.oneandonly,
    block: { from: '곧 가마에서 내리는 한 여인.', lines: 3 },
    words: [
      { w: '장옷', key: 'back' },
      { w: '옆얼굴이 드러난다', key: 'face', main: true },
    ],
    notes: [
      [
        { s: '가마에서 내린 여인의 신분과 얼굴이 드러나는 S#6 대목을 따라갑니다.', basis: `${BASIS_WORK} 2-2절 · _분석/대본/oneandonly_대본.txt · 결정로그 2026-10-14 정점 대목` },
      ],
      [
        { s: '장옷과 한복 시트를 뒷모습과 옆얼굴 컷의 참조로 사용했습니다. · 팀 제작', basis: `${BASIS_SCENE} 03 ① · 03 여분 oo_03_4 · ${BASIS_E3}(@Image1 = 여주_한복.png) · ${BASIS_LOG} 387행 부근` },
      ],
      [
        { s: 'Blender 구도로 그린 콘티에서 옆얼굴 칸을 따라갑니다. · GPT Image 2.5', basis: `${BASIS_SCENE} 03 ② · ${BASIS_WORK} 2-3절 · 콘티 S6-E_e3.jpg. 완성본과 시선 방향·거리 차이가 있어 동일 구도라고 단정하지 않음` },
      ],
      [
        { s: '옆얼굴을 생성하고 장수들이 엎드리는 컷 뒤에 편집했습니다. · Seedance 2.5 · Premiere Pro', basis: `${BASIS_LOG} 387행(S6-E e3 v3) · ${BASIS_WORK} 567행(2:37~2:42 옆얼굴) · ${BASIS_SCENE} 06 편집` },
      ],
    ],
    sheets: {
      // 이 작품 시트 6장(2열 × 3줄) — 쓰인 둘은 왼쪽 열 위아래로 붙는다: 장옷 시트(가운데 줄) · 한복 시트(아랫줄)
      cells: [
        { img: `${ST}/oo_sheet_1_s.jpg`, w: 640, h: 374, alt: '' },
        { img: `${ST}/oo_sheet_2_s.jpg`, w: 640, h: 360, alt: '' },
        { img: `${ST}/oo_03_1_s.jpg`, w: 720, h: 407, alt: '여주 장옷 시트 — 앞 · 뒤 · 얼굴' },
        { img: `${ST}/oo_sheet_3_s.jpg`, w: 640, h: 139, alt: '' },
        { img: `${ST}/oo_03_4_s.jpg`, w: 720, h: 407, alt: '여주 한복 시트 — 앞 · 뒤 · 얼굴' },
        { img: `${ST}/oo_sheet_4_s.jpg`, w: 640, h: 360, alt: '' },
      ],
      // 그림 기준 % [x, y, w, h] — 장옷 시트 가운데 패널 뒷모습의 장옷(머리 ~ 장옷 끝단) · 한복 시트 오른쪽 패널 얼굴(눈썹 ~ 턱)
      back: { i: 2, box: [37.5, 4, 24.5, 49] },
      face: { i: 4, box: [73.5, 25, 21, 40] },
    },
    conti: {
      // S6-E 콘티 4칸 — 정점 대목(장수 · 일제히 엎드림 · 옆얼굴 · 동공). 쓰인 칸은 셋째(옆얼굴)
      cells: [
        { img: `${ST}/oo_conti_e1_s.jpg`, w: 360, h: 640, alt: '', label: '콘티 1' },
        { img: `${ST}/oo_conti_e2_s.jpg`, w: 360, h: 640, alt: '', label: '콘티 2' },
        { img: `${ST}/oo_conti_e3_s.jpg`, w: 360, h: 640, alt: '콘티 — 여주의 옆얼굴', label: '콘티 3' },
        { img: `${ST}/oo_conti_e4_s.jpg`, w: 360, h: 640, alt: '', label: '콘티 4' },
      ],
      used: 2,
      // 옆얼굴(이마 ~ 턱)
      box: [28, 20, 40, 26],
    },
    // 완성본 전체 24칸(고르게) — 22번째 칸이 옆얼굴이 드러나는 순간(2:39.5)
    strip: { files: Array.from({ length: 24 }, (_, i) => `${P}/strip24/oneandonly_${String(i + 1).padStart(2, '0')}.jpg`), k: 21, t: 159.5 },
    final: { img: `${ST}/oo_face_final_s.jpg`, alt: '완성본 2:39.5 — 옆얼굴', t: 159.5, start: 157 },
  },
};

for (const [slug, v] of Object.entries(CUT5)) {
  const lines = v.page.lines.map((l) => applyEdits(slug, l.s));
  const i0 = lines.findIndex((s) => s.startsWith(v.block.from));
  if (i0 < 0) throw new Error(`cut5 ${slug}: 대목 첫 줄이 대본 쪽에 없음`);
  const block = lines.slice(i0, i0 + v.block.lines).join(' ');
  for (const w of v.words) if (!block.includes(w.w)) throw new Error(`cut5 ${slug}: 밑줄 「${w.w}」 이 대목에 없음`);
  for (const [step, notes] of v.notes.entries()) {
    if (notes.length < 1 || notes.length > 2) throw new Error(`cut5 ${slug}: ${step + 1}걸음 설명은 1~2문장`);
    if ([...notes.map((n) => n.s).join(' ')].length > 70) throw new Error(`cut5 ${slug}: ${step + 1}걸음 설명 합계가 70자를 넘음`);
    for (const n of notes) if (!n.basis.trim()) throw new Error(`cut5 ${slug}: 설명 문장에 근거가 없음 — ${n.s}`);
  }
}
