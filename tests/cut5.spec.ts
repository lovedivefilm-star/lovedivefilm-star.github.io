/** Recovered S#6 acceptance plus the current reader, resize and motion safeguards. */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { ANALYSIS_ROOT, HERO_MS, MAIN_WORKS, PROJECT_ROOT, expect, settle, test, visit } from './helpers';

const ROOM = '/works/oneandonly/';
const STAGE = '[data-cut5]';
const norm = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim();

async function openRoom(page: Page, room = ROOM) {
  await visit(page, room);
  await page.evaluate(() => document.fonts.ready);
  await settle(page, HERO_MS);
}

async function goStep(page: Page, step: number) {
  const stage = page.locator(STAGE).first();
  await stage.locator(`[data-go="${step}"]`).click();
  await expect(stage).toHaveAttribute('data-step', String(step));
  await settle(page, 900);
}

async function centeredHero(page: Page) {
  const box = await page.locator('.hero [data-video]').boundingBox();
  expect(box).not.toBeNull();
  const vp = page.viewportSize()!;
  expect(Math.abs(box!.x + box!.width / 2 - vp.width / 2)).toBeLessThanOrEqual(vp.width * 0.02);
  expect(box!.y).toBeGreaterThanOrEqual(50);
  expect(box!.y + box!.height).toBeLessThanOrEqual(vp.height + 1);
  expect(box!.height).toBeGreaterThanOrEqual(vp.height * 0.7);
}

async function centeredPaper(page: Page) {
  const geometry = await page.locator(STAGE).first().evaluate((stage) => {
    const paper = stage.querySelector('.c5-paper')!.getBoundingClientRect();
    const hit = stage.querySelector('[data-hit]')!.getBoundingClientRect();
    return { x: paper.left + paper.width / 2, width: paper.width, hit: hit.toJSON(), paper: paper.toJSON() };
  });
  const vp = page.viewportSize()!;
  expect(Math.abs(geometry.x - vp.width / 2)).toBeLessThanOrEqual(vp.width * 0.02);
  expect(geometry.width).toBeGreaterThanOrEqual(470);
  expect(geometry.width).toBeLessThanOrEqual(580);
  expect(geometry.hit.top).toBeGreaterThanOrEqual(geometry.paper.top);
  expect(geometry.hit.bottom).toBeLessThanOrEqual(geometry.paper.bottom);
  expect(Math.abs(geometry.hit.top + geometry.hit.height / 2 - vp.height / 2)).toBeLessThanOrEqual(vp.height * 0.12);
}

/** Lines must meet the visible word/image regions after transitions and resizing. */
async function lineProblems(page: Page, step: 2 | 3, panel = 0) {
  return page.locator('.c5').nth(panel).evaluate((stage, k) => {
    const pairs = k === 2
      ? [['1a', '[data-word="back"]', '[data-box="sheet"]'], ['1b', '[data-word="face"]', '[data-box="face"]']]
      : [['2', '[data-box="face"]', '[data-box="board"]']];
    const origin = stage.getBoundingClientRect();
    const inside = (x: number, y: number, r: DOMRect) => x >= r.left - 3 && x <= r.right + 3 && y >= r.top - 3 && y <= r.bottom + 3;
    const problems: string[] = [];
    for (const [name, from, to] of pairs) {
      const line = stage.querySelector<SVGLineElement>(`[data-l="${name}"]`)!;
      const source = stage.querySelector(from)!.getBoundingClientRect();
      const target = stage.querySelector(to)!.getBoundingClientRect();
      const x = (a: string) => Number(line.getAttribute(a)) + origin.left;
      const y = (a: string) => Number(line.getAttribute(a)) + origin.top;
      if (!inside(x('x1'), y('y1'), source) || !inside(x('x2'), y('y2'), target)) problems.push(`${name}: endpoints miss word/image region`);
      const cs = getComputedStyle(line);
      if (Number(cs.opacity) < 0.9 || Math.abs(parseFloat(cs.strokeDashoffset) || 0) > 1) problems.push(`${name}: line is not fully drawn`);
    }
    return problems;
  }, step);
}

async function expectNoWipe(page: Page, panel = 0) {
  const clip = await page.locator('.c5').nth(panel).locator('[data-final]').evaluate((node) => getComputedStyle(node).clipPath);
  expect(clip).toMatch(/^inset\(0(?:px|%)?(?: 0(?:px|%)?)*\)$/);
}

test.describe('복원한 상세 화면(v5) 회귀 검수', () => {
  test('V-29. 중앙 영상·첫 대본 쪽·원문 정점 세 문단·두 시트와 옆얼굴 콘티·완성 시각', async ({ page }, testInfo) => {
    await openRoom(page);
    await centeredHero(page);
    await goStep(page, 1);
    await centeredPaper(page);
    const stage = page.locator(STAGE).first();
    const source = fs.readFileSync(path.join(ANALYSIS_ROOT, '_분석/대본/oneandonly_대본.txt'), 'utf8')
      .split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => line.replaceAll('너울', '장옷'));
    const i = source.findIndex((line) => line.startsWith('곧 가마에서 내리는 한 여인.'));
    expect(i).toBeGreaterThanOrEqual(0);
    const paragraphs = await stage.locator('[data-hit] p').allTextContents();
    expect(paragraphs.map(norm)).toEqual(source.slice(i, i + 3).map(norm));
    await expect(stage.locator('[data-word="back"]')).toHaveText('장옷');
    await expect(stage.locator('[data-word="face"]')).toHaveText('옆얼굴이 드러난다');
    expect((await stage.locator('[data-paper] p').count())).toBeGreaterThan(3);
    await expect(stage.locator('.c5-cell')).toHaveCount(6);
    await expect(stage.locator('.c5-cell.on')).toHaveCount(2);
    await expect(stage.locator('[data-box="sheet"]').locator('..').locator('img')).toHaveAttribute('src', /oo_03_1_s\.jpg$/);
    await expect(stage.locator('[data-box="face"]').locator('..').locator('img')).toHaveAttribute('src', /oo_03_4_s\.jpg$/);
    await expect(stage.locator('.c5-ccell')).toHaveCount(4);
    await expect(stage.locator('.c5-ccell.on > .c5-cframe > img').first()).toHaveAttribute('src', /oo_conti_e3_s\.jpg$/);
    await expect(stage.locator('.c5-frame')).toHaveCount(24);
    await expect(stage.locator('[data-slot] img')).toHaveAttribute('src', /oneandonly_22\.jpg$/);
    await expect(stage.locator('[data-final]')).toHaveAttribute('alt', /2:39\.5/);
    const provenance = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'src/data/media-sources.json'), 'utf8'));
    expect(provenance['process/strip24/oneandonly_22.jpg'].time).toBe('02:39.50');

    for (const k of [1, 2, 3, 4]) {
      await goStep(page, k);
      await expect(stage.locator(`[data-go="${k}"]`)).toHaveAttribute('aria-current', 'step');
      await expect(stage.locator('[data-step-n]')).toHaveText(`${k} / 4`);
      const note = stage.locator(`[data-cap="${k}"]`);
      await expect(note).toBeVisible();
      const statements = await note.locator('[data-note]').allTextContents();
      expect(statements.length).toBeGreaterThanOrEqual(1);
      expect(statements.length).toBeLessThanOrEqual(2);
      expect([...statements.join(' ').trim()].length).toBeLessThanOrEqual(70);
      expect(await note.evaluate((p) => parseFloat(getComputedStyle(p).fontSize))).toBeGreaterThanOrEqual(16);
      if (k === 2 || k === 3) expect(await lineProblems(page, k)).toEqual([]);
      if (k > 1) {
        const used = await stage.locator('.c5-cell.on').evaluateAll((cells) => cells.map((cell) => ({ opacity: Number(getComputedStyle(cell).opacity), filter: getComputedStyle(cell).filter })));
        expect(used.every((cell) => cell.opacity >= 0.99 && !cell.filter.includes('blur'))).toBe(true);
      }
      if (process.env.QA_SHOTS_DIR) {
        const shots = path.join(process.env.QA_SHOTS_DIR, String(testInfo.project.use.viewport!.width));
        fs.mkdirSync(shots, { recursive: true });
        await page.screenshot({ path: path.join(shots, `oneandonly_v5_${k}_${['대본', '시트', '연출', '완성'][k - 1]}.png`) });
      }
    }
    await expectNoWipe(page);
    const play = stage.locator('[data-cap-play]');
    await expect(play).toHaveAttribute('data-start', '157');
    await play.click();
    const iframe = page.locator('.hero [data-video] iframe').first();
    await expect(iframe).toHaveAttribute('src', /\/embed\/NPlAjWuCsAY\?/);
    await expect(iframe).toHaveAttribute('src', /[?&]start=157(?:&|$)/);
  });

  test('V-30. 기본 휠로 1→4·단계 바로 가기·화살표·대본 전체 읽기·건너뛰기', async ({ page }) => {
    await openRoom(page);
    const stage = page.locator(STAGE).first();
    const span = await page.evaluate(() => {
      const track = document.querySelector<HTMLElement>('[data-c5-track]')!;
      const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h'));
      return { top: track.getBoundingClientRect().top + scrollY - bar };
    });
    await page.evaluate((y) => window.scrollTo(0, y), span.top - 200);
    await settle(page, 300);
    await page.mouse.move(page.viewportSize()!.width / 2, page.viewportSize()!.height / 2);
    const seen: string[] = [];
    for (let count = 0; count < 40; count++) {
      const before = await page.evaluate(() => scrollY);
      await page.mouse.wheel(0, 100);
      await settle(page, 120);
      const after = await page.evaluate(() => scrollY);
      expect(Math.abs(after - before - 100)).toBeLessThanOrEqual(10);
      const current = (await stage.getAttribute('data-step'))!;
      if (seen.at(-1) !== current) seen.push(current);
      if (current === '4') break;
    }
    expect(seen).toEqual(['1', '2', '3', '4']);
    await goStep(page, 2);
    const url = page.url();
    await page.keyboard.press('ArrowRight');
    await expect(stage).toHaveAttribute('data-step', '3');
    await settle(page, 600);
    await page.keyboard.press('ArrowLeft');
    await expect(stage).toHaveAttribute('data-step', '2');
    expect(page.url()).toBe(url);

    await goStep(page, 1);
    const read = stage.locator('[data-read-script]');
    await read.click();
    await expect(read).toHaveAttribute('aria-pressed', 'true');
    const reader = stage.locator('[data-paper]');
    expect(await reader.evaluate((node) => getComputedStyle(node).overflowY)).toBe('auto');
    const blurred = await reader.locator('.dim').evaluateAll((items) => items.filter((item) => /blur/.test(getComputedStyle(item).filter)).length);
    expect(blurred).toBe(0);
    await reader.focus();
    const readingUrl = page.url();
    const readingStep = await stage.getAttribute('data-step');
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      await page.keyboard.press(key);
      await settle(page, 400);
      expect(page.url()).toBe(readingUrl);
      await expect(stage).toHaveAttribute('data-step', readingStep!);
      await expect(reader).toBeFocused();
    }
    await page.keyboard.press('End');
    await expect.poll(() => reader.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await read.click();
    await expect(read).toHaveAttribute('aria-pressed', 'false');
    await goStep(page, 3);
    await stage.locator('[data-skip]').click();
    await settle(page, 700);
    const after = await page.locator('[data-c5-after]').evaluate((node) => ({
      y: node.getBoundingClientRect().top,
      end: Math.abs(scrollY + innerHeight - document.documentElement.scrollHeight) < 3,
      focused: document.activeElement === node,
    }));
    expect(after.focused).toBe(true);
    expect(after.y).toBeGreaterThanOrEqual(-2);
    expect(after.y).toBeLessThanOrEqual(page.viewportSize()!.height * (after.end ? 0.75 : 0.35));
  });

  test('V-31. 창 크기 왕복 뒤 대본 중앙과 연결선·완성 프레임이 제자리에 남음', async ({ page }) => {
    await openRoom(page);
    const original = page.viewportSize()!;
    const other = original.width === 1440 ? { width: 1280, height: 800 } : { width: 1440, height: 900 };
    await goStep(page, 3);
    for (const viewport of [other, original]) {
      await page.setViewportSize(viewport);
      await settle(page, 700);
      // Stay on the same document and exercise every destination after refresh.
      await goStep(page, 1);
      await centeredPaper(page);
      await goStep(page, 2);
      expect(await lineProblems(page, 2)).toEqual([]);
      await goStep(page, 3);
      expect(await lineProblems(page, 3)).toEqual([]);
      await goStep(page, 4);
      await expectNoWipe(page);
    }
  });

  test('V-32. 움직임 줄이기에서 클립 정지 포스터·정지 네 걸음·바로 가기와 전체 읽기', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const work of MAIN_WORKS) {
      await openRoom(page, `/works/${work.slug}/`);
      const video = page.locator('.hero video[data-clip]');
      await expect.poll(() => video.evaluate((node) => node.paused)).toBe(true);
      expect(await video.evaluate((node) => node.currentTime)).toBeLessThanOrEqual(0.05);
      await expect(video).toHaveAttribute('poster', /\.jpg$/);
      await expect(page.locator('.hero [data-clip-toggle]')).toHaveText('▶ 클립 재생');
    }
    await openRoom(page);
    const panels = page.locator('.c5');
    await expect(panels).toHaveCount(4);
    expect(await panels.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.step))).toEqual(['1', '2', '3', '4']);
    const geometry = await panels.evaluateAll((items) => items.map((item) => ({ y: item.getBoundingClientRect().top, position: getComputedStyle(item).position })));
    expect(geometry.every((item, i) => item.position !== 'sticky' && (i === 0 || item.y > geometry[i - 1].y))).toBe(true);
    expect(await lineProblems(page, 2, 1)).toEqual([]);
    expect(await lineProblems(page, 3, 2)).toEqual([]);
    await expectNoWipe(page, 3);
    const controls = panels.first().locator('[data-go="4"]');
    await controls.scrollIntoViewIfNeeded();
    await controls.click();
    await expect.poll(() => panels.nth(3).evaluate((node) => Math.abs(node.getBoundingClientRect().top - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h'))))).toBeLessThanOrEqual(3);
    const read = panels.nth(3).locator('[data-read-script]');
    await read.click();
    await expect(read).toHaveAttribute('aria-pressed', 'true');
    expect(await panels.nth(3).locator('[data-paper] .dim').evaluateAll((items) => items.every((item) => getComputedStyle(item).filter === 'none'))).toBe(true);
    const reader = panels.nth(3).locator('[data-paper]');
    await reader.focus();
    const readingUrl = page.url();
    const readingSteps = await panels.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.step));
    for (const key of ['ArrowLeft', 'ArrowRight']) {
      await page.keyboard.press(key);
      await settle(page, 300);
      expect(page.url()).toBe(readingUrl);
      expect(await panels.evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.step))).toEqual(readingSteps);
      await expect(reader).toBeFocused();
    }
    const animations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
    expect(animations).toBe(0);
  });

  test('V-33. 세 작품 클립 멈춤·화면 밖 정지·사용자 멈춤 유지·풀영상 전환 뒤 조작 해제', async ({ page }) => {
    for (const work of MAIN_WORKS) {
      await openRoom(page, `/works/${work.slug}/`);
      const video = page.locator('.hero video[data-clip]');
      const toggle = page.locator('.hero [data-clip-toggle]');
      await expect.poll(() => video.evaluate((node) => node.paused)).toBe(false);
      await expect(toggle).toHaveText('❚❚ 멈춤');
      const control = await toggle.boundingBox();
      const frame = await page.locator('.hero [data-video]').boundingBox();
      expect(control!.height).toBeGreaterThanOrEqual(44);
      expect(control!.y).toBeGreaterThanOrEqual(frame!.y + frame!.height);
      await toggle.click();
      await expect.poll(() => video.evaluate((node) => node.paused)).toBe(true);
      await expect(toggle).toHaveText('▶ 클립 재생');
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await settle(page, 400);
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(page, 500);
      expect(await video.evaluate((node) => node.paused)).toBe(true);
      await toggle.click();
      await expect.poll(() => video.evaluate((node) => node.paused)).toBe(false);
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(() => video.evaluate((node) => node.paused)).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect.poll(() => video.evaluate((node) => node.paused)).toBe(false);
      const detached = await video.elementHandle();
      await page.locator('.hero .play[data-play]').click();
      await expect(page.locator('.hero [data-video] iframe')).toBeAttached();
      await expect(toggle).toBeHidden();
      expect(await detached!.evaluate((node) => node.paused)).toBe(true);
    }
  });

  test('V-34. 종이가 이동하는 도중 앞뒤 단계로 급히 스크롤해도 변환 잔여·연결선 어긋남 없음', async ({ page }) => {
    await openRoom(page);
    await goStep(page, 1);
    const stage = page.locator(STAGE).first();
    // Trigger the next native scroll 80ms into the .35s Flip. A single browser
    // task keeps this interruption independent of Playwright command latency.
    for (const [middle, destination] of [[2, 3], [1, 2]] as const) {
      const interrupted = await page.evaluate(async ({ middle, destination }) => {
        const stage = document.querySelector<HTMLElement>('[data-cut5]')!;
        const track = document.querySelector<HTMLElement>('[data-c5-track]')!;
        const paper = stage.querySelector<HTMLElement>('.c5-paper')!;
        const bar = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h'));
        const top = track.getBoundingClientRect().top + scrollY - bar;
        const distance = track.offsetHeight - stage.offsetHeight;
        const points = [0, 0.28, 0.72, 1];
        const jump = (step: number) => window.scrollTo({ top: Math.round(top + distance * points[step - 1]), behavior: 'instant' as ScrollBehavior });
        jump(middle);
        const started = performance.now();
        while (stage.dataset.step !== String(middle)) {
          if (performance.now() - started > 2000) throw new Error(`Native scroll never reached step ${middle}`);
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        }
        await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
        const transform = getComputedStyle(paper).transform;
        jump(destination);
        return { middle: stage.dataset.step, transform };
      }, { middle, destination });
      expect(interrupted.middle).toBe(String(middle));
      expect(interrupted.transform).not.toBe('none');
      await expect(stage).toHaveAttribute('data-step', String(destination));
      await settle(page, 900);
      const paper = await stage.locator('.c5-paper').evaluate((node) => {
        const stage = node.closest('.c5')!;
        return {
          inline: (node as HTMLElement).style.transform,
          computed: getComputedStyle(node).transform,
          left: node.getBoundingClientRect().left,
          expectedLeft: stage.getBoundingClientRect().left + parseFloat(getComputedStyle(stage).paddingLeft),
        };
      });
      expect(['', 'none']).toContain(paper.inline);
      expect(paper.computed).toBe('none');
      expect(Math.abs(paper.left - paper.expectedLeft)).toBeLessThanOrEqual(2);
      expect(await lineProblems(page, destination)).toEqual([]);
    }
    await goStep(page, 2);
    const read = stage.locator('[data-read-script]');
    const reader = stage.locator('[data-paper]');
    await read.click();
    await expect(read).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => stage.locator('[data-l="1a"], [data-l="1b"]').evaluateAll((lines) => lines.map((line) => Number(getComputedStyle(line).opacity)))).toEqual([0, 0]);
    await reader.focus();
    await page.keyboard.press('Home');
    await expect.poll(() => reader.evaluate((node) => node.scrollTop)).toBe(0);
    await page.keyboard.press('End');
    await expect.poll(() => reader.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
    await read.click();
    await expect(read).toHaveAttribute('aria-pressed', 'false');
    await settle(page, 900);
    expect(await lineProblems(page, 2)).toEqual([]);
    await goStep(page, 1);
    await centeredPaper(page);
  });

});
