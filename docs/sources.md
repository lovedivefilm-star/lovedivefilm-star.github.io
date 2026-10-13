# 레퍼런스 출처 — 요소마다 어디서 따왔고 무엇을 바꿨나

규칙(결정로그 10-13): 새로 발명하지 않는다 — 모아 둔 레퍼런스의 구체적 부분에서 따와 바꾼다.
경로의 `_분석` = `G:\내 드라이브\포폴 웹사이트 만들기\_분석\`. 정밀 분석 = `_분석\레퍼런스\정밀\*.md` 의 5절(「우리 사이트로 옮기기」) 「우리 제안」 수치.
수치(시간 · easing · 간격 · 크기)는 전부 `src/styles/tokens.css` 에 이름을 달아 모아 두었다 — 아래 「토큰」 칸이 그 이름.
미디어 파일의 출처는 `public/media/출처.json`(완성본 파일명 · 시점 / 시트 원본 경로).

## 1. 구조 · 상단 바

| 요소 | 따온 곳 | 바꾼 점 | 토큰 |
|---|---|---|---|
| 방 구조(홈 = 출입구, 작품마다 따로 방, 툴 방) | EddyOS 홈 · 방 이동(`믹스_추천3.md` 1-2 · 1-3) | OS 껍데기 없음. 방은 작품 3 + 툴 1(규약 1절 — 소개 · 연락 방 없음) | — |
| 홈 네 모서리 출입구 — 번호 · 형식 11px · 제목 · 「들어가기 ▸」 칩 · 마지막 선택 유지 | EddyOS 홈(정밀 `EddyOS.md` §5-1) | 01 오직 당신의 것 · 02 첫 인상… · 03 버터! · 04 툴. 긴 제목은 최대 폭 28vw 2줄. 칩 문구는 시안 v3 의 「들어가기」 | `--door-x` `--door-y` `--door-meta-size` `--door-title-size` `--door-title-max` `--dur-door-hover`(100ms steps(2)) `--dur-chip`(160ms steps(3)) `--chip-shift` |
| 상단 바 — 떠 있는 박스(이름 · 지금 위치 · ESC 홈으로 / 연락) | Paragon 상단 바(정밀 `Paragon.md` §5-1: fixed · 배경 없음 · 위 32 / 좌우 48 · 50px 박스 + 1px 테두리 이어 붙임 · 연락 142×50 · 화살표 12px gap 8 · 호버 0.4s ease) · EddyOS 경로 「ESC — 홈으로」(§5-3) | 연락은 스크롤해도 숨기지 않는다(규약 · 시험 2). 이메일을 버튼 안에 직접(`[이메일 자리]` — `src/data/site.ts` CONTACT_EMAIL). 지금 위치 박스 끝에 지금 단계(목차와 같이 바뀜) | `--bar-top` `--bar-x` `--bar-h` `--bar-pad` `--bar-font` `--mail-w` `--arr-size` `--arr-gap` `--dur-bar-hover` |
| 키보드 — ESC 처음으로 · ← → 이전/다음 작품 | EddyOS `ESC – close project` | — | — |

## 2. 전환 · 첫 진입

| 요소 | 따온 곳 | 바꾼 점 | 토큰 |
|---|---|---|---|
| 방 사이 전환 — 바탕색 패널로 덮였다 열림(0.46초) | Paragon 방 전환 패널 0.4s(정밀 §5-5) + EddyOS 나가기 0.2s sine.inOut ∥ 들어오기 0.26s sine.out(§5-4) | 둘을 0.5초 규약 안에서 하나로 — 브라우저 문서 간 뷰 전환(CSS `@view-transition`). 도착 연출 · 흰→검정 번쩍임 없음. 움직임 줄이기면 전환 없음 | `--dur-vt-close` `--ease-vt-close` `--dur-vt-open` `--ease-vt-open` |
| 홈 첫 진입 — 가운데 1px 선이 자라고 → 사라지고 → 위아래 시트가 갈라짐 | 오리진킷 Hairline Loader(정밀 `오리진킷.md` §6-B 「첫 진입 1.2초대 안」) | 같은 세션 첫 방문 한 번 · 아무 입력이면 끝 · 상단 바(연락)는 덮지 않음 · 큰 숫자는 뺐다 | `--dur-hair-line` `--ease-hair-line` `--dur-hair-fade` `--dur-hair-split` `--ease-hair-split` |
| 작품 제목 등장 — 가운데에서 양옆으로 열림 | 오리진킷 Mask Text Reveal(§6-C: inset(0 50%) → inset(0), cubic-bezier(.42,0,.58,1) 1.0s 지연 0.09s) | 작품 방 머리 제목에만(단계 제목은 아래 Paragon 줄 리빌) | `--dur-title-mask` `--delay-title-mask` `--ease-title-mask` |

## 3. 작품 방

| 요소 | 따온 곳 | 바꾼 점 | 토큰 |
|---|---|---|---|
| ① 후킹(`data-hook`) — 빈 칸에 씬 헤더가 타이핑되고, 그 줄 높이에서 화면이 열리며 그 장면 클립이 흐름, 이후 대본 줄이 클립 시각대로 | 시안 `히어로_v1`(작가 「더 빨라도 된다」 · 「대본과 영상이 더 섞여야」) · 오스카 각본상 소개의 장면 옆 각본(결정로그) | 대본 칸 · 화면을 **한 틀**로 붙이고 대본 칸을 어두운 칸으로(시선 분산 방지). 영상 위에는 아무것도 없음(재생/일시정지는 타임라인 머리) | `--hook-open-by`(1.5초) `--dur-hook-open` |
| ① 미리 치는 줄의 타이핑 · 캐럿 | zkPass 명령줄(정밀 `zkPass.md` §5-2: 한 줄 총 700ms 고정 · 캐럿 7×14 블록 0.85s steps(2)) · Aaru(§5-2 줄 사이 즉시) | EddyOS 34ms/글자 대신 이걸 쓴다(작가 「더 빨라도 된다」). 33.3ms 틱으로 뚝뚝 | `--dur-type-line` `--dur-type-tick` `--caret-w` `--caret-h` `--dur-caret` |
| ① 4줄 타임라인(지문 · 대사 · 생성 · 편집) | 히어로 v1(작가 「괜찮다」) | 생성 줄 = 컷 사이 구간 + `[제작 자료 자리]`. 편집 줄 = 클립 프레임 띠 + 컷(ffmpeg 장면 전환 감지) | — |
| ① 머리 위치 표시 `01 / 03` | Tamás 카운터(정밀 `Tamas.md` §5-2: 번호 · 3px 구분선 · 총수) | 세로 작은 숫자 | — |
| ② 작품 안 목차(`data-toc`) — 옆에 붙어 따라오는 번호 목록 · 지금 단계 행만 펼쳐짐 | Aaru 질문 구역(정밀 `Aaru.md` §5-1: sticky `max(80px,(100svh−725px)/2)` · 행 `40px 1fr` gap 40 · padding 20 0 · 비활성 .3 → 1 .3s linear · 펼침 0fr→1fr 0.5s · 단계 윗변이 52% 선) · Yuya 제작 단계 목차(`컨셉레퍼런스_웹.md` 3) | 01 영상 · 02 대본 · 03 생성 · 04 편집 · 05 크레딧(만든 순서). 펼친 줄은 사실(길이 · 줄 수 · 파일 · 버전)만. 지금 단계 번호만 포인트 색 | `--toc-top` `--toc-cols` `--toc-gap` `--toc-pad` `--toc-dim` `--toc-num` `--dur-toc` `--dur-toc-open` `--ease-toc-open` `--toc-line` |
| ③ 단계(`data-step`) — 단계마다 이미지 한 장 + 한 줄 설명 | Google DeepMind 「Behind ANCESTRA」(`컨셉레퍼런스_영상.md` 6) | 설명 문구는 `[작가 문구 자리]`, 사실 줄만 씀 | — |
| ③ 단계 제목 등장 — 줄 마스크 안에서 올라옴 | Paragon 스크롤 줄 리빌(정밀 §5-7: yPercent 110→0 · 0.6s power4.out) | 첫 스크롤 뒤에만(스크롤 전 화면 · 전체 캡처는 다 보임) | `--dur-line-reveal` `--ease-line-reveal` |
| 01 영상 — 사이트 안 유튜브 | JM 포폴 · lite-youtube-embed(썸네일 → 그 자리 재생) | 포스터(완성본 프레임) + 재생 단추 → 그 자리 `youtube-nocookie` iframe. 풀영상을 틀면 후킹 클립은 멈춤 | — |
| 02 대본 — 종이 한 장 | Pixar Script to Screen · Screenplayed | 원문 줄 그대로(줄 단위로만 고름) | — |
| 03 생성 · 04 편집 — 작업대(탭 → 재생) | zkPass 「Three ways to verify」 작업대(정밀 §5-3: 소등 · 이전 결과 380ms → 명령줄 700ms → 노드 260ms 간격 → 결과 380ms · 노드 10×10 · 점선 6/6 연결선 380ms cubic-bezier(.22,1,.36,1)) · Aaru 탭(§5-3) · EddyOS git 노드(§5-8) | 명령줄 · 노드 이름은 **작가 실제 파일 · 버전만**(`_분석\제작자료_목록.md`, 작품 폴더 이름은 빼고 그 아래부터). 지어낸 명령 · 시간 · 중간 버전 없음 | `--dur-bench-fade` `--dur-bench-cmd` `--bench-node-gap` `--dur-bench-link` `--ease-bench-link` `--bench-node` `--bench-dash` |
| 03 생성 — 시트 | 학원 예시 김병석 과정 캡처 · EddyOS 필름스트립 | 작가 허락분 **시트만**(콘티 · 계측 · 생성 결과 제외), 누르면 크게 보기 | — |
| 04 편집 — 작업 화면 자리 | 학원 예시 김병석 | `[작가 캡처 자리]` 셋 + 후킹 클립 프레임 띠 | — |
| 05 크레딧 — 점선 표 | EddyOS 상세 `.project-spec`(정밀 §5-7: `minmax(120px,.34fr) 1fr` · gap 0 18px · padding-block 11px · 라벨 11px · 점 리더 · 값 13px/1.7 · 행마다 70ms) | 한글 라벨 자간 .1em. 값은 작가가 정한 크레딧만 | `--spec-*` `--stagger` |
| 라벨 `[ 라벨 ]` · 보조 라벨 · 모서리 「+」 | zkPass 라벨 체계(정밀 §5-5: 11px .18em · 10px .24em · 10×10 1px 안쪽 18px · 괘선 1.5px) | 작업대 · 목차 머리에만 | `--label-*` `--label2-*` `--corner` `--corner-inset` `--rule-w` |
| ④ 이전 · 처음으로 + 다음 작품 큰 입구 | Paragon 다음 작품 섹션(한 줄형) · EddyOS `project-next-link`(66px 화살표 정사각 · translate(5px,−5px) .24s steps(6)) | 3편이라 풀화면 섹션 대신 한 줄 큰 제목 링크 | `--next-title` `--dur-next-arr` `--ease-next-arr` |

## 4. 툴 방

| 요소 | 따온 곳 | 바꾼 점 | 토큰 |
|---|---|---|---|
| 카드 2×2 — 올린 것만 진하고 나머지 흐림 | Brady Perron(`믹스_awwwards.md` E5) | 16:9 포스터 + 제목 + 「모작」(마인드헌터) + `[툴 확인 후]` · `[출처 자리]`(작가 지시로 비움) | — |
| 카드 → 모달 재생 | Paragon 라이트박스(정밀 §5-6: 바탕 98% · 0.4s 지연 0.2s · 안쪽 86px · 닫기 48px 원 · 위/오른쪽 29px · ESC) + 폭 `min(960px,100vw−40px)`(EddyOS §5-9) | 누르는 즉시 그 안에서 재생. 닫기는 화면 모서리, 제목은 영상 아래 — 영상 위에는 아무것도 없음. 닫으면 iframe 을 지워 소리가 멈춤 | `--modal-w` `--modal-pad` `--modal-x` `--modal-x-inset` `--dur-modal` `--delay-modal` `--scrim-modal` |

## 5. 색 · 글꼴

| 요소 | 따온 곳 | 비고 |
|---|---|---|
| 색 — 확정(2026-10-13 결정로그) | `_분석\디자인리서치\색_확정.css` — 바탕 `#050505` · 글자 `#F0EFE9`(작가 지정) · 포인트 `#0090FF`(Radix Colors 3.0.0 blue-dark 9, 글자용 blue-dark 11 `#70B8FF`), 보조 단계는 글자색의 투명도로만 | 값 그대로. 포인트는 한 화면 한 점 — 목차의 지금 단계 번호 · 연락 화살표 · (홈) 오브제 앵커 · 핸들 |
| 글꼴 — Pretendard 700(이름 · 큰 제목, −0.02em) · 나눔명조(대본) · IBM Plex Mono(숫자 · 라틴) | `_분석\디자인리서치\색_글꼴.md` 3 · 6-1 | Pretendard 는 작가 배포 동적 서브셋 그대로(RFN), 나눔명조 · Plex Mono 는 Google Fonts unicode-range 조각 |

## 6. 넣지 않은 것(정밀 분석의 「가져오지 않을 것」 포함)

영상 위 글자 · 효과 · 대본 덮기(v2 반려) · CRT 오버레이 · 부팅 화면 · 소리 · 앰버 단색 · WebGL(EddyOS) · 영상 위 흰 배너 · 코랄 Play 라벨 · 로더 · 흰→검정 번쩍임(Paragon) · 픽셀 스윕 · 영상 위 컨트롤(Tamás) · 라임 · 블루 색면 확장 · 고정 무대 3,600px(zkPass · Aaru) · 공모전 이름 · 프리미어평가 · 소개 · 경력 방 · 증명사진.
홈 가운데 오브제(글자로 짠 만년필)는 다른 에이전트 전담 — 홈에는 `[data-glyph-slot]` 자리만.
