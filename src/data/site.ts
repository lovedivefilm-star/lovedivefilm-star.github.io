/** 사이트 공통 값 — 이름 · 연락 · 웹폰트 주소. */

export const SITE = {
  name: '김영건',
  /** 브라우저 탭 · 검색 설명. 작가 문구가 정해지면 바꾼다. */
  title: '김영건 — 포트폴리오',
  description: '김영건 포트폴리오 — 오직 당신의 것 · 첫 인상은 백점, 첫 마디는 엎드려 · 버터! · 툴 작업',
  url: 'https://lovedivefilm-star.github.io',
};

/**
 * 연락 — 상단 바의 이메일 한 줄. 비어 있으면 [이메일 자리] 로 보인다.
 * 작가가 주소를 정하면 여기 한 줄만 채운다(누르면 메일 · 복사).
 */
export const CONTACT_EMAIL = '';

/**
 * 웹폰트 — 안 1 「밤의 작업실」(_분석/디자인리서치/색_글꼴.md 3 · 6-1).
 * · Pretendard: 작가 배포 동적 서브셋(가변) 그대로 — RFN 이 있어 직접 서브셋하지 않는다.
 * · 나눔명조 · IBM Plex Mono: Google Fonts(한글은 unicode-range 조각 — 쓰인 글자가 든 조각만 받는다).
 * 글꼴을 바꾸면 src/styles/tokens.css 의 --f-* 와 이 목록을 같이 바꾼다.
 */
export const FONT_CSS = [
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Nanum+Myeongjo:wght@400;700&display=swap',
];
export const FONT_ORIGINS = ['https://cdn.jsdelivr.net', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'];
