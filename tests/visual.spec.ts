/**
 * 검수 스크린샷 — v5 1단계c(홈: 이름 인트로 → 오목 면의 사다리꼴 카드 5장 + 상단 바 연락). 1440 · 1280. 저장(이것만 구글 드라이브):
 *   G:\내 드라이브\포폴 웹사이트 만들기\_분석\qa\2026-10-14_v5\1단계c\<1440|1280>\NN_이름.png
 * 작품 방은 2단계에서(메인 지시 — 화면을 작가에게 보인 뒤).
 */
import fs from 'node:fs';
import path from 'node:path';
import { SEL, settle, test, visit } from './helpers';

const ROOT = process.env.QA_SHOTS_DIR ?? 'G:\\내 드라이브\\포폴 웹사이트 만들기\\_분석\\qa\\2026-10-14_v5\\1단계c';

const dirFor = (project: string) => {
  const d = path.join(ROOT, project.replace(/^\D+-/, ''));
  fs.mkdirSync(d, { recursive: true });
  return d;
};

test.describe('검수 스크린샷(v5 1단계c — 홈)', () => {
  test('01 인트로 · 02 작품 화면 · 03 호버(오직 당신의 것)', async ({ page }, ti) => {
    const d = dirFor(ti.project.name);
    await visit(page, '/');
    await page.evaluate(() => document.fonts.ready);
    await settle(page, 1400);
    await page.screenshot({ path: path.join(d, '01_인트로.png') });
    await page.mouse.wheel(0, 120);
    await settle(page, 1800);
    await page.mouse.move(page.viewportSize()!.width / 2, 6);
    await settle(page, 300);
    await page.screenshot({ path: path.join(d, '02_작품화면.png') });
    await page.hover(`${SEL.cardLink('oneandonly')} [data-card-media]`);
    await settle(page, 1500);
    await page.screenshot({ path: path.join(d, '03_호버_오직당신의것.png') });
  });
});
