/** 사이트 공통 값 — 이름 · 직함 · 연락 · 웹폰트 주소. (v4 — docs/v4-redesign.md) */

export const SITE = {
  name: '김영건',
  /** 직함 한 줄 — 인트로 가운데 · 홈 상단 바(설계서 2절). */
  job: 'AI 영상 · AI 숏드라마 · 대본',
  /** 브라우저 탭 · 검색 설명 */
  title: '김영건 — AI 영상 · AI 숏드라마 · 대본',
  description: '김영건 포트폴리오 — AI 영상 · AI 숏드라마 · 대본. 오직 당신의 것 · 첫 인상은 백점, 첫 마디는 엎드려 · 버터! · 툴 작업',
  url: 'https://lovedivefilm-star.github.io',
};

/**
 * 연락 — 비어 있으면 연락 링크(상단 바 「연락 ↗」 · 푸터 큰 링크)를 아예 그리지 않는다(빈자리 표시 금지 — 설계서 0절 4).
 * 작가가 주소를 정하면 여기 한 줄만 채운다 → 모든 방에 mailto 링크가 생긴다(시험 V-12).
 */
export const CONTACT_EMAIL = '';

/**
 * 웹폰트 2종(설계서 0절 2) — 모노 삭제.
 * · Pretendard(정보 · 12–17px): 배포 동적 서브셋(가변) 그대로 — OFL 1.1, RFN 이 있어 직접 서브셋하지 않는다.
 * · 한글 세리프(이름 · 제목 · 대본): 후보 둘 — Noto Serif KR · Hahmlet(둘 다 OFL 1.1, Google Fonts — unicode-range 조각).
 *   기본 = SERIF. 검수용으로 주소에 `?serif=noto` · `?serif=hahmlet` 을 붙이면 다른 쪽을 걸어 본다(Base.astro).
 *   선택 이유: docs/sources.md 「v4 글꼴」.
 */
export type SerifKey = 'hahmlet' | 'noto';
export const SERIF: SerifKey = 'hahmlet';
export const SERIF_FONTS: Record<SerifKey, { family: string; css: string }> = {
  hahmlet: { family: "'Hahmlet'", css: 'https://fonts.googleapis.com/css2?family=Hahmlet:wght@400&display=swap' },
  noto: { family: "'Noto Serif KR'", css: 'https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400&display=swap' },
};
export const SANS_CSS = 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
export const FONT_ORIGINS = ['https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
