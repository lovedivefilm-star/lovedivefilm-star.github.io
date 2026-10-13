import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

/**
 * 백테스트(자동 시험) 설정 — docs/contract.md 4절.
 *
 * - 시험 산출물(test-results · 보고서 · 임시)은 전부 D: (QA_DIR). C: 에는 쓰지 않는다.
 * - 브라우저는 내려받지 않는다. 설치된 Microsoft Edge(channel: 'msedge')를 쓴다.
 * - 리뷰용 스크린샷만 구글 드라이브(`tests/visual.spec.ts` 가 직접 저장).
 *
 * 돌리는 법(Git Bash, 저장소 루트):
 *   npm_config_cache="D:\claude_tmp\npm-cache" ASTRO_TELEMETRY_DISABLED=1 \
 *   PLAYWRIGHT_BROWSERS_PATH="D:\claude_tmp\ms-playwright" \
 *   TEMP="D:\claude_tmp\portfolio\qa\tmp" TMP="D:\claude_tmp\portfolio\qa\tmp" \
 *   npm run test:e2e
 */

const QA_DIR = (process.env.QA_DIR ?? 'D:/claude_tmp/portfolio/qa').replace(/\\/g, '/');
const QA_TMP = `${QA_DIR}/tmp`;
const QA_DIST = `${QA_DIR}/dist`;
fs.mkdirSync(QA_TMP, { recursive: true });

// Edge 임시 프로필 · Playwright 변환 캐시가 C:\Users\...\Temp 로 새지 않게 (워커는 이 환경을 물려받는다).
// 명령줄에서 TEMP/TMP 를 먼저 주면 설정 파일 자체의 변환 캐시까지 D: 로 간다.
process.env.TEMP = QA_TMP.replace(/\//g, '\\');
process.env.TMP = process.env.TEMP;
process.env.PWTEST_CACHE_DIR ??= `${QA_DIR}/cache`;

// 한 번 돌릴 때마다 하나의 스크린샷 폴더 이름 — 워커들이 같은 값을 쓰도록 환경 변수로 고정.
const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
process.env.QA_STAMP ??= `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

// 4322 가 이미 다른 미리보기에 잡혀 있으면 QA_PORT=4323 처럼 바꿔 돌린다.
const PORT = Number(process.env.QA_PORT ?? 4322);
// QA_BASE_URL 을 주면 서버를 띄우지 않고 그 주소를 시험한다(시험 장치 자체를 검증할 때 쓰는 가짜 사이트용).
const EXTERNAL_URL = process.env.QA_BASE_URL;
const BASE_URL = EXTERNAL_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  outputDir: `${QA_DIR}/test-results`,
  timeout: 120_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  reporter: [
    ['list'],
    ['html', { outputFolder: `${QA_DIR}/report`, open: 'never' }],
    ['json', { outputFile: `${QA_DIR}/results.json` }],
  ],
  use: {
    baseURL: BASE_URL,
    channel: 'msedge',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    actionTimeout: 5_000,
    navigationTimeout: 15_000,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'desktop-1440',
      use: { viewport: { width: 1440, height: 900 } },
      grepInvert: /@mobile/,
    },
    {
      name: 'laptop-1280',
      use: { viewport: { width: 1280, height: 800 } },
      grepInvert: /@mobile|@once/,
    },
    // 작가 10-13: 데스크톱 먼저, 모바일은 나중 → 모바일(390)은 꺼 둔다.
    // 되살리려면 QA_MOBILE=1 을 주고 돌린다(시험 6 · +E 와 세 화면 시험의 모바일 쪽이 같이 돌아간다).
    ...(process.env.QA_MOBILE
      ? [
          {
            name: 'mobile-390',
            use: {
              viewport: { width: 390, height: 844 },
              isMobile: true,
              hasTouch: true,
              deviceScaleFactor: 2,
            },
            grepInvert: /@once|@desktop/,
          },
        ]
      : []),
  ],
  webServer: EXTERNAL_URL
    ? undefined
    : {
        // --outDir: 시험은 자기 빌드 폴더(D:)에서 — 다른 에이전트가 dist/ 를 다시 빌드하는 중에 시험이 흔들리지 않게.
        // --ignore-lock: 다른 곳(작업 중인 미리보기 서버)이 떠 있어도 시험용 서버를 나란히 띄운다. 그 서버는 건드리지 않는다.
        command: `npm run build -- --outDir "${QA_DIST}" && npm run preview -- --port ${PORT} --ignore-lock --outDir "${QA_DIST}"`,
        url: BASE_URL,
        timeout: 240_000,
        // 사이트를 고칠 때마다 새로 빌드해서 시험한다. 이미 떠 있는 서버를 쓰려면 PW_REUSE=1.
        reuseExistingServer: !!process.env.PW_REUSE,
        stdout: 'pipe',
        stderr: 'pipe',
      },
});
