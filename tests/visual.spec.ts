/**
 * 검수 스크린샷 · 녹화 — v4(1440 · 1280). 저장(이것만 구글 드라이브):
 *   G:\내 드라이브\포폴 웹사이트 만들기\_분석\qa\2026-10-14_v4\<1440|1280>\NN_이름.png
 *   녹화(1440): …\2026-10-14_v4\녹화\인트로_입장.webm · 과정_<작품>.webm
 *   글꼴 비교(1440): …\2026-10-14_v4\글꼴비교\
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from '@playwright/test';
import { HERO_MS, MAIN_WORKS, SEL, loadAll, settle, test, toCutStep, visit, YT_URL } from './helpers';

const ROOT = process.env.QA_SHOTS_DIR ?? 'G:\\내 드라이브\\포폴 웹사이트 만들기\\_분석\\qa\\2026-10-14_v4';
const VIDEO_TMP = (process.env.QA_DIR ?? 'D:/claude_tmp/portfolio/qa') + '/video';

const dirFor = (project: string) => {
  const d = path.join(ROOT, project.replace(/^\D+-/, ''));
  fs.mkdirSync(d, { recursive: true });
  return d;
};

/** 녹화 — D: 임시에 찍고 G: 로 옮긴다 */
async function record(browser: Browser, name: string, fn: (page: Page) => Promise<void>) {
  fs.mkdirSync(VIDEO_TMP, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR', recordVideo: { dir: VIDEO_TMP, size: { width: 1440, height: 900 } } });
  await ctx.route(YT_URL, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
  const page = await ctx.newPage();
  await fn(page);
  const v = page.video();
  await ctx.close();
  if (v) {
    const out = path.join(ROOT, '녹화');
    fs.mkdirSync(out, { recursive: true });
    fs.copyFileSync(await v.path(), path.join(out, `${name}.webm`));
  }
}

test.describe('검수 스크린샷(v4)', () => {
  test('01 인트로 · 02 입장 중 · 03 벽 · 04 벽 호버', async ({ page }, ti) => {
    const d = dirFor(ti.project.name);
    await visit(page, '/');
    await settle(page, 2600);
    await page.screenshot({ path: path.join(d, '01_인트로_잠든벽.png') });
    await page.mouse.wheel(0, 120);
    await settle(page, 550);
    await page.screenshot({ path: path.join(d, '02_입장_중.png') });
    await settle(page, 2400);
    await page.mouse.move(2, 2);
    await settle(page, 400);
    await page.screenshot({ path: path.join(d, '03_벽.png') });
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width / 2 + 30, vp.height / 2 + 20);
    await settle(page, 700);
    await page.screenshot({ path: path.join(d, '04_벽_호버.png') });
  });

  MAIN_WORKS.forEach((w, i) => {
    test(`${String(i + 5).padStart(2, '0')} 작품 방 ${w.slug}`, async ({ page }, ti) => {
      const d = dirFor(ti.project.name);
      const n = String(i + 5).padStart(2, '0');
      await visit(page, `/works/${w.slug}/`);
      await settle(page, HERO_MS);
      await page.screenshot({ path: path.join(d, `${n}_${w.slug}_0첫화면.png`) });
      await loadAll(page);
      for (const k of [1, 2, 3, 4]) {
        await toCutStep(page, k, 1600);
        await page.screenshot({ path: path.join(d, `${n}_${w.slug}_${k}걸음_${['대본', '시트', '연출', '완성'][k - 1]}.png`) });
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await settle(page, 800);
      await page.screenshot({ path: path.join(d, `${n}_${w.slug}_5다음작품.png`) });
    });
  });

  test('08 툴 방 · 09 404', async ({ page }, ti) => {
    const d = dirFor(ti.project.name);
    await visit(page, '/tools/');
    await settle(page, 1200);
    await page.screenshot({ path: path.join(d, '08_툴_첫화면.png') });
    await page.screenshot({ path: path.join(d, '08_툴_전체.png'), fullPage: true });
    await visit(page, '/없는-주소/');
    await settle(page, 1400);
    await page.mouse.move(200, 160);
    await settle(page, 1100);
    await page.screenshot({ path: path.join(d, '09_404.png') });
  });

  test('10 녹화 — 인트로 → 입장 · 과정 핀 구간 3편', { tag: '@once' }, async ({ browser }) => {
    await record(browser, '인트로_입장', async (page) => {
      await visit(page, '/');
      await settle(page, 2400);
      await page.mouse.wheel(0, 120);
      await settle(page, 1900);
    });
    for (const w of MAIN_WORKS) {
      await record(browser, `과정_${w.slug}`, async (page) => {
        await visit(page, `/works/${w.slug}/`);
        await settle(page, 1200);
        await page.evaluate(() => {
          const s = document.querySelector<HTMLElement>('[data-process]');
          if (s) window.scrollTo(0, Number(s.dataset.pinStart) - 40);
        });
        await settle(page, 600);
        // 손으로 굴리듯 휠 — 걸음마다 스냅
        for (let k = 0; k < 4; k++) {
          for (let j = 0; j < 7; j++) {
            await page.mouse.wheel(0, 100);
            await page.waitForTimeout(60);
          }
          await settle(page, 1400);
        }
      });
    }
  });

  test('11 글꼴 비교 — Hahmlet(기본) · Noto Serif KR', { tag: '@once' }, async ({ browser }) => {
    const d = path.join(ROOT, '글꼴비교');
    fs.mkdirSync(d, { recursive: true });
    for (const serif of ['hahmlet', 'noto']) {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
      await ctx.route(YT_URL, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' }));
      const page = await ctx.newPage();
      await visit(page, `/?serif=${serif}`);
      await page.evaluate(() => document.fonts.ready);
      await settle(page, 2600);
      await page.screenshot({ path: path.join(d, `${serif}_인트로.png`) });
      for (const slug of ['firstimpression', 'butter']) {
        await visit(page, `/works/${slug}/?serif=${serif}`);
        await page.evaluate(() => document.fonts.ready);
        await settle(page, HERO_MS);
        await page.screenshot({ path: path.join(d, `${serif}_작품방_${slug}.png`) });
      }
      await ctx.close();
    }
  });
});

// SEL 은 다른 시험과 같은 표식을 쓴다는 표시(검수 화면이 표식을 바꾸면 여기서도 바뀐다)
void SEL;
