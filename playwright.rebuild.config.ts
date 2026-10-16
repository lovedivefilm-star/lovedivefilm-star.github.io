import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** ALT 전체 구조 + Josh 조작 검수. 기존 구판 시험·서버는 바꾸지 않는다. */
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const qaDir = path.resolve(process.env.QA_DIR ?? path.join(projectDir, '../_local/qa-rebuild'));
const qaTmp = path.join(qaDir, 'tmp');
fs.mkdirSync(qaTmp, { recursive: true });
process.env.TEMP = qaTmp;
process.env.TMP = qaTmp;
process.env.PWTEST_CACHE_DIR ??= path.join(qaDir, 'cache');
const port = Number(process.env.QA_PORT ?? 4321);
const baseURL = process.env.QA_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: ['rebuild.spec.ts', 'originkit.spec.ts', 'visitor.spec.ts', 'decisions.spec.ts'],
  outputDir: path.join(qaDir, 'test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  timeout: 120_000,
  expect: { timeout: 7_000 },
  reporter: [
    ['list'],
    ['json', { outputFile: path.join(qaDir, 'results.json') }],
    ['html', { outputFolder: path.join(qaDir, 'report'), open: 'never' }],
  ],
  use: {
    baseURL,
    channel: 'msedge',
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    actionTimeout: 7_000,
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'laptop-1280', use: { viewport: { width: 1280, height: 800 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  // 기본은 현재 로컬 개발 미리보기를 재사용한다. QA_BASE_URL이면 외부 서버를 그대로 검사.
  webServer: process.env.QA_BASE_URL ? undefined : {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --ignore-lock`,
    cwd: projectDir,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
