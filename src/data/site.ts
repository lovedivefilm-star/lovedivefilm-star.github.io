/** 사이트 공통 값 — 이름 · 직함 · 연락 · 웹폰트 주소. (v4 — docs/v4-redesign.md) */

export const SITE = {
  name: '김영건',
  /** 직무 한 줄 — 홈 이름 아래(작가 10-14 v5 구체화 ⑥ 원문 그대로). */
  job: 'AI CREATOR & 드라마 대본 작가',
  /** 브라우저 탭 · 검색 설명 */
  title: '김영건 — AI CREATOR & 드라마 대본 작가',
  description: '김영건 포트폴리오 — AI CREATOR & 드라마 대본 작가. AI 숏드라마 · AI 트레일러 · 대본. 오직 당신의 것 · 첫 인상은 백점, 첫 마디는 엎드려 · 버터! · 테크니컬 작업',
  url: 'https://lovedivefilm-star.github.io',
};

/**
 * 연락 — 작가 10-14 v5 구체화 ⑦. 모든 방 상단 바에 「연락」(mailto) + 「주소 복사」(시험 V-14).
 * 비어 있으면 연락 링크를 아예 그리지 않는다(빈자리 표시 금지).
 */
export const CONTACT_EMAIL = 'wheniwasy0ung@naver.com';

/**
 * 툴 4편 묶음의 이름 — 홈 ④ 카드 아래 · 툴 방 제목 · 상단 바 이전/다음(작가 10-14 「테크니컬 작업」). 주소 /tools/ 는 그대로.
 * 이름을 바꿀 땐 여기 한 줄만.
 */
export const TOOLS_LABEL = '테크니컬 작업';

/** 홈 ⑤ 대본 카드 아래 이름(메인 1단계 지시) */
export const SCRIPT_CARD_LABEL = '대본 맛보기';

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
