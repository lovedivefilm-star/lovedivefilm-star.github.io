import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Current public routes. The preserved ALT suite remains under test:rebuild.
const projectDir = path.dirname(fileURLToPath(import.meta.url));
const qaDir = path.resolve(process.env.QA_DIR ?? path.join(projectDir, '../_local/qa-site'));
const qaTmp = path.join(qaDir, 'tmp');
fs.mkdirSync(qaTmp, { recursive: true });
process.env.TEMP = qaTmp;
process.env.TMP = qaTmp;
process.env.PWTEST_CACHE_DIR ??= path.join(qaDir, 'cache');
const port = Number(process.env.QA_PORT ?? 4322);
const baseURL = process.env.QA_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: 'site.spec.ts',
  outputDir: path.join(qaDir, 'test-results'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 3,
  timeout: 90_000,
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
    reducedMotion: 'reduce',
    actionTimeout: 7_000,
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
  },
  projects: [
    { name: 'desktop-1440', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-390', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-320', use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
  webServer: process.env.QA_BASE_URL ? undefined : {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --ignore-lock`,
    cwd: projectDir,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 240_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
