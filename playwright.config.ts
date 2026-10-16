import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * 기존 사이트 검수 설정. 자료는 저장소 상위 폴더, 시험 결과는 ../_local/qa/.
 * QA_DIR로 다른 로컬 경로를 지정할 수 있다. 설치된 Microsoft Edge를 사용한다.
 * 스크린샷 기본 경로도 로컬이며 QA_SHOTS_DIR로 지정할 수 있다.
 */

const PROJECT_DIR = path.dirname(fileURLToPath(import.meta.url));
const QA_DIR = (process.env.QA_DIR ?? path.resolve(PROJECT_DIR, '../_local/qa')).replace(/\\/g, '/');
const QA_TMP = `${QA_DIR}/tmp`;
const QA_DIST = `${QA_DIR}/dist`;
fs.mkdirSync(QA_TMP, { recursive: true });

// Edge 임시 프로필 · Playwright 변환 캐시가 C:\Users\...\Temp 로 새지 않게 (워커는 이 환경을 물려받는다).
// 명령줄에서 TEMP/TMP 를 먼저 주면 설정 파일 자체의 변환 캐시도 같은 작업 경로에 간다.
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
        // --outDir: 시험은 별도 빌드 폴더에서 진행해 개발 서버의 dist/와 겹치지 않게 한다.
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
