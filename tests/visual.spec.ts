/**
 * 리뷰용 스크린샷 — 방마다 세 화면 크기(1440 · 1280 · 390).
 * 저장 위치(이것만 구글 드라이브): G:\내 드라이브\포폴 웹사이트 만들기\_분석\qa\<날짜시각>\
 * 한 번 돌릴 때마다 폴더 하나(날짜시각은 playwright.config.ts 가 QA_STAMP 로 정한다).
 *
 * 방: 홈 · 작품 상세 3 · 툴 · 툴 모달 열림. 작품 상세는 전체 페이지 + 첫 화면(접힘선 위) 두 장.
 * 방이 없거나 모달이 안 열리면 화면은 그대로 찍어 두고(리뷰용) 시험은 실패로 알린다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { MAIN_WORKS, SETTLE_MS, TOOL_WORKS, openToolCard, settle, test, visit } from './helpers';

const SHOT_ROOT = process.env.QA_SHOTS_DIR ?? 'G:\\내 드라이브\\포폴 웹사이트 만들기\\_분석\\qa';
const OUT = path.join(SHOT_ROOT, process.env.QA_STAMP ?? 'manual');

type Shot = { n: string; key: string; path: string; modal?: boolean; detail?: boolean };
const SHOTS: Shot[] = [
  { n: '01', key: 'home', path: '/' },
  ...MAIN_WORKS.map((w, i) => ({ n: String(i + 2).padStart(2, '0'), key: `work-${w.slug}`, path: `/works/${w.slug}/`, detail: true })),
  { n: '05', key: 'tools', path: '/tools/' },
  { n: '06', key: 'tools-modal', path: '/tools/', modal: true },
];

test.describe('visual (리뷰용 스크린샷)', () => {
  for (const s of SHOTS) {
    test(`${s.n} ${s.key}`, async ({ page }, testInfo) => {
      fs.mkdirSync(OUT, { recursive: true });
      const file = (suffix = '') => path.join(OUT, `${s.n}_${s.key}${suffix}__${testInfo.project.name}.png`);
      const problems: string[] = [];

      const status = await visit(page, s.path);
      if (status !== 200) problems.push(`${s.path} → HTTP ${status}`);
      // 후킹 대본이 타이핑되는 시간을 조금 더 준다
      await settle(page, s.detail ? SETTLE_MS + 1500 : SETTLE_MS);

      if (s.modal) {
        const why = await openToolCard(page, TOOL_WORKS[0]);
        if (why) problems.push(why);
        await settle(page, 600);
        await page.screenshot({ path: file() }); // 모달은 화면 크기 그대로
      } else if (s.detail) {
        await page.screenshot({ path: file('_fold') }); // 첫 화면(접힘선 위) — 후킹
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: file(), fullPage: true });
      } else {
        await page.screenshot({ path: file(), fullPage: true });
      }

      testInfo.annotations.push({ type: 'screenshot', description: OUT });
      if (problems.length) throw new Error(`스크린샷은 저장했지만 방 상태가 정상이 아님: ${problems.join(' · ')}\n  → ${OUT}`);
    });
  }
});
