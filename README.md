# 김영건 포트폴리오

AI 영상·숏드라마·대본 포트폴리오. 공개 주소: https://lovedivefilm-star.github.io/

## 페이지

- `/`: 숏드라마 두 편·버터, 테크니컬 네 편과 대본 일곱 편의 작품 선택.
- `/works/oneandonly/`, `/works/firstimpression/`, `/works/butter/`: 도입 장면, 풀영상, 대본부터 후반까지 실제 제작 자료.
- `/tools/`: 테크니컬 네 편의 영상, 사용 툴, 작업 흐름.
- `/scripts/`: 기획 소개와 선별 대본 발췌, 직접 작품 선택.
- `/previews/remy/`, `/previews/remy/scripts/`: 이전 링크 호환. 검색 제외와 정식 canonical 제공.

풀영상은 기존 YouTube 주소에서 재생한다. 홈과 제작과정의 짧은 발췌만 정적 미디어로 제공하며, 로컬 전체영상 검수 파일은 Git에 포함하지 않는다. 주력 작품의 같은 YouTube iframe이 제작과정을 읽는 동안 작은 창으로 유지된다. Fluid Player MIT 코드에서 가져온 wrapper·placeholder 동작과 공식 YouTube IFrame API를 연결했다. 출처와 라이선스는 `docs/third-party/`와 `public/licenses/`에 있다.

Pretendard와 Hahmlet의 공식 글꼴 및 OFL 라이선스를 로컬 제공한다. 작품 원문, 원본 프로젝트와 비공개 연구 기록은 별도로 보존한다.

## 실행과 검수

Node.js 22.12 이상. 브라우저 검수는 Microsoft Edge를 사용한다.

```sh
npm ci
npm run dev
npm run build
npm run test:site
```

개발 기본 주소는 http://127.0.0.1:4321/ . `QA_DIR`, `QA_PORT`, `QA_BASE_URL`로 검수 결과와 확인 서버를 지정한다. `test:site`는 현재 페이지와 PC·모바일 상호작용을 검수한다. `test:rebuild`의 과거 시안은 이전 이력이다.

## 배포

사용자의 2026-10-16 공개 배포 지시에 따라 기존 GitHub Pages 저장소를 사용한다. `main`에 푸시하면 `.github/workflows/deploy.yml`이 Astro의 `dist`를 빌드하고 GitHub Pages로 배포한다. 계정 루트 저장소이므로 별도 base 경로는 없다.
YouTube API 자동 검사는 호환 mock을 이용해 연결·명령·상태·정리 계약을 확인하며, 실제 스트리밍은 공개 주소에서 별도로 확인한다.

공개 전 최종 검수: 정적 9페이지 빌드, 전체 회귀 56통과·4중복조건제외·실패0. 실제 공개 origin에서 유튜브 재생을 확인하며, 로컬 origin의 키네틱 오류150과 구분한다.
