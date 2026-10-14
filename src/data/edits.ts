/**
 * 작가 지시 편집 목록 — 사이트에 보이는 작가 글을 작가 지시로 바꾼 곳.
 * 원문 대조 시험(V-16)은 원문 md 에 이 치환을 적용한 뒤 비교한다. 목록은 docs/sources.md 「작가 지시 편집」 에도 같은 내용.
 */
export type AuthorEdit = { slug: string; from: string; to: string; 근거: string };

export const AUTHOR_EDITS: AuthorEdit[] = [
  { slug: 'oneandonly', from: '너울', to: '장옷', 근거: '작가 2026-10-14 「그냥 장옷으로만 바꿔 니가 대본을」 — 제작에서 너울이 장옷으로 바뀜' },
];

/** 원문에 편집을 적용한다(시험 · 데이터 검사용) */
export const applyEdits = (slug: string, s: string) => AUTHOR_EDITS.filter((e) => e.slug === slug).reduce((acc, e) => acc.split(e.from).join(e.to), s);
