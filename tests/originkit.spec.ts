/** OriginKit's optional comparison: browser actions, full-image fallback and native scrolling. */
import { test, expect, type Locator, type Page } from '@playwright/test';

const ROUTE = '/works/oneandonly/';

async function open(page: Page) {
  const response = await page.goto(ROUTE, { waitUntil: 'load' });
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
}

async function imagesAreWhole(comparison: Locator) {
  const images = comparison.locator('img');
  await expect(images).toHaveCount(2);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
    const dimensions = await image.evaluate((element) => {
      const image = element as HTMLImageElement;
      const box = image.getBoundingClientRect();
      return { natural: image.naturalWidth / image.naturalHeight, rendered: box.width / box.height, fit: getComputedStyle(image).objectFit, alt: image.alt };
    });
    expect(dimensions.alt).not.toBe('');
    expect(dimensions.fit).toBe('contain');
    expect(Math.abs(dimensions.natural - 9 / 16)).toBeLessThan(.002);
    expect(Math.abs(dimensions.rendered / dimensions.natural - 1)).toBeLessThan(.02);
  }
}

async function center(slider: Locator) {
  await slider.evaluate((node) => node.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }));
  const box = (await slider.boundingBox())!;
  return { ...box, cx: box.x + box.width / 2, cy: box.y + box.height / 2 };
}

async function noPrivateResearch(page: Page) {
  // Inspect rendered HTML too: hidden serialized research would still be public.
  // Do not flag dev-server C:/ stylesheet metadata as production copy.
  const html = await page.content();
  expect(html).not.toMatch(/결정로그_[^\s<"]*\.md|작가_연출메모|_투입표_변경점|@image\d|(?:G|D):[\\/]/i);
}

test('O-1. 기본 자료를 보존한 선택 비교·키보드·드래그·원본 비율·기본 스크롤', async ({ page, context }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
  const process = page.locator('[data-process-case]');
  const primaryImages = process.locator('[data-production-image] img');
  await expect(primaryImages).toHaveCount(2);
  expect(await primaryImages.evaluateAll((images) => images.every((image) => !image.closest('details') && image.checkVisibility()))).toBe(true);
  const film = process.locator('[data-process-video]');
  await expect(film).toHaveCount(1);
  await expect(film).toBeVisible();
  expect(await film.evaluate((node) => !node.closest('details') && (node as HTMLVideoElement).controls && !(node as HTMLVideoElement).autoplay)).toBe(true);
  const supporting = process.locator('.decision-extra-material');
  await expect(supporting.locator('img')).toHaveCount(4);
  await supporting.locator(':scope > summary').click();
  await expect(supporting.locator('img').first()).toBeVisible();
  await supporting.locator(':scope > summary').click();
  const script = process.locator('.decision-script-context');
  await script.locator(':scope > summary').click();
  await expect(script.locator('[data-script-context]')).toBeVisible();
  await script.locator(':scope > summary').click();

  const disclosure = process.locator('details:has([data-origin-compare])');
  const comparison = disclosure.locator('[data-origin-compare]');
  await expect(disclosure).toHaveJSProperty('open', false);
  await expect(comparison).not.toBeVisible();
  await disclosure.locator(':scope > summary').click();
  await expect(disclosure).toHaveJSProperty('open', true);
  const slider = comparison.getByRole('slider', { name: '콘티와 완성 화면 비교' });
  await expect(slider).toBeVisible();
  await expect(slider).toHaveAttribute('aria-valuemin', '0');
  await expect(slider).toHaveAttribute('aria-valuemax', '100');
  await expect(slider).toHaveAttribute('aria-valuenow', '50');
  await expect(slider).toHaveAttribute('aria-orientation', 'horizontal');
  await expect(slider).toHaveAttribute('aria-valuetext', /콘티.*50%.*완성 화면.*50%/);
  await imagesAreWhole(comparison);
  expect(await slider.evaluate((node) => getComputedStyle(node).touchAction)).toBe('pan-y');

  await center(slider);
  await slider.focus();
  const keyboardY = await page.evaluate(() => scrollY);
  for (const [key, value] of [['ArrowLeft', 48], ['Shift+ArrowLeft', 38], ['ArrowRight', 40], ['Shift+ArrowRight', 50], ['Home', 0], ['ArrowLeft', 0], ['End', 100], ['ArrowRight', 100]] as const) {
    await slider.press(key);
    await expect(slider).toHaveAttribute('aria-valuenow', String(value));
  }
  expect(Math.abs(await page.evaluate(() => scrollY) - keyboardY)).toBeLessThanOrEqual(1);

  const box = await center(slider);
  await page.mouse.move(box.cx, box.cy);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 4, box.cy, { steps: 5 });
  expect(Math.abs(Number(await slider.getAttribute('aria-valuenow')) - 25)).toBeLessThanOrEqual(1);
  await page.mouse.move(Math.min(page.viewportSize()!.width - 1, box.x + box.width + 12), box.cy, { steps: 5 });
  await expect(slider).toHaveAttribute('aria-valuenow', '100');
  await page.mouse.move(Math.max(0, box.x - 12), box.cy, { steps: 5 });
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await page.mouse.up();
  await page.mouse.move(box.x + box.width * .8, box.cy);
  await page.waitForTimeout(120);
  await expect(slider).toHaveAttribute('aria-valuenow', '0'); // Hover has no effect.

  await center(slider);
  await slider.focus();
  const beforeDown = await page.evaluate(() => scrollY);
  await page.keyboard.press('ArrowDown');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeDown);
  await page.waitForTimeout(250);
  const beforeUp = await page.evaluate(() => scrollY);
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(beforeUp);
  await page.waitForTimeout(250);
  const url = page.url();
  await page.keyboard.press('Escape');
  expect(page.url()).toBe(url);
  await expect(disclosure).toHaveJSProperty('open', true);
  await expect(slider).toHaveAttribute('aria-valuenow', '0');

  const wheelBox = await center(slider);
  await page.mouse.move(wheelBox.cx, wheelBox.cy);
  const beforeWheel = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(350);
  expect(Math.abs(await page.evaluate(() => scrollY) - beforeWheel - 100)).toBeLessThanOrEqual(10);
  await expect(slider).toHaveAttribute('aria-valuenow', '0');

  if (testInfo.project.use.isMobile) {
    testInfo.annotations.push({ type: '터치 검수 한계', description: 'CDP Input.dispatchTouchEvent에 합성한 좌표를 전달한 Chromium 입력 검사. 실제 물리 기기·손가락 사용성 검증 아님.' });
    const cdp = await context.newCDPSession(page);
    try {
      const horizontal = await center(slider);
      const yBefore = await page.evaluate(() => scrollY);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: horizontal.x + horizontal.width * .25, y: horizontal.cy, id: 1 }] });
      for (const fraction of [.35, .5, .65, .75]) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: horizontal.x + horizontal.width * fraction, y: horizontal.cy + 1, id: 1 }] });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(async () => Math.abs(Number(await slider.getAttribute('aria-valuenow')) - 75)).toBeLessThanOrEqual(2);
      expect(Math.abs(await page.evaluate(() => scrollY) - yBefore)).toBeLessThanOrEqual(3);
      const vertical = await center(slider);
      const value = await slider.getAttribute('aria-valuenow');
      const scrollBefore = await page.evaluate(() => scrollY);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: vertical.cx, y: vertical.cy + 70, id: 2 }] });
      for (const dy of [45, 15, -15, -45, -70]) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: vertical.cx + 1, y: vertical.cy + dy, id: 2 }] });
        await page.waitForTimeout(30);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollBefore + 30);
      await expect(slider).toHaveAttribute('aria-valuenow', value!);
    } finally { await cdp.detach(); }
  }
  await noPrivateResearch(page);
  expect(errors).toEqual([]);
});

test('O-2. JavaScript 없이 비교를 열면 전체 이미지 2장·읽을 수 있는 라벨·불필요한 포커스 없음', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch, locale: 'ko-KR' });
  try {
    const page = await context.newPage();
    await open(page);
    const disclosure = page.locator('[data-process-case] details:has([data-origin-compare])');
    await expect(disclosure).toHaveJSProperty('open', false);
    await disclosure.locator(':scope > summary').click();
    const comparison = disclosure.locator('[data-origin-compare]');
    await expect(comparison).toBeVisible();
    await expect(comparison.getByRole('slider')).toHaveCount(0);
    await expect(comparison.locator('[tabindex], button, input, a[href]')).toHaveCount(0);
    await imagesAreWhole(comparison);
    const layers = comparison.locator('[data-compare-image]');
    const boxes = await layers.evaluateAll((nodes) => nodes.map((node) => { const r = node.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, clip: getComputedStyle(node).clipPath }; }));
    expect(boxes.every((box) => box.clip === 'none')).toBe(true);
    expect(boxes[0].bottom).toBeLessThan(boxes[1].top);
    await expect(comparison.locator('.origin-compare-static-label').nth(0)).toHaveText('콘티');
    await expect(comparison.locator('.origin-compare-static-label').nth(1)).toHaveText('완성 화면');
    await expect(comparison).toContainText('순서대로 보여 줍니다');
    await disclosure.locator(':scope > summary').focus();
    await page.keyboard.press('Tab');
    expect(await comparison.evaluate((node) => node.contains(document.activeElement))).toBe(false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await noPrivateResearch(page);
  } finally { await context.close(); }
});
