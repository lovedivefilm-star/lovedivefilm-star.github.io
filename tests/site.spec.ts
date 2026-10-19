import { test, expect, type Page, type Locator } from '@playwright/test';
import { SCRIPT_INTRODUCTIONS } from '../src/data/script-introductions';

const canonicalOrigin = 'https://lovedivefilm-star.github.io';
const scripts = [
  ['madeinhongdae', '메이드 인 홍대'], ['boundary', '경계선'], ['butter', '버터! [VirTer!]'],
  ['human-birth', '사람은 탄생하라'], ['understeer', '언더스티어'],
  ['oneandonly', '오직 당신의 것 EP.01'], ['firstimpression', '첫 인상은 백점, 첫 마디는 엎드려'],
] as const;
const films = scripts.slice(5).concat([scripts[2]]);
const tools = [
  ['kinetic', '키네틱 타이포'], ['mindhunter', '마인드헌터'],
  ['curlyshyll', 'Curly shyll AI CF'], ['musicvideo', '뮤직비디오'],
] as const;
const activeCard = (page: Page) => page.locator('[data-remy-root] .remy-card.is-active');

async function noHorizontalOverflow(page: Page) {
  const excess = await page.evaluate(() => Math.max(document.documentElement.scrollWidth,
    document.body.scrollWidth) - document.documentElement.clientWidth);
  expect(excess, 'The whole page must not require horizontal scrolling').toBeLessThanOrEqual(1);
}

const youtubeApiScript = `(() => {
  const players = [];
  const states = { UNSTARTED: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
  function Player(frame, options) {
    this.frame = typeof frame === 'string' ? document.getElementById(frame) : frame;
    this.options = options; this.state = -1; this.commands = []; this.destroyed = false;
    this.getIframe = () => this.frame;
    this.getPlayerState = () => this.state;
    this.emitState = data => { if (this.destroyed) return; this.state = data; options.events.onStateChange({ target: this, data }); };
    this.emitError = data => { if (this.destroyed) return; options.events.onError({ target: this, data }); };
    this.emitAutoplayBlocked = () => { if (this.destroyed) return; options.events.onAutoplayBlocked({ target: this }); };
    this.playVideo = () => { this.commands.push('playVideo'); this.emitState(states.PLAYING); };
    this.pauseVideo = () => { this.commands.push('pauseVideo'); this.emitState(states.PAUSED); };
    this.destroy = () => { this.commands.push('destroy'); this.destroyed = true; this.frame?.remove(); };
    players.push(this);
    setTimeout(() => { if (this.destroyed) return; options.events.onReady({ target: this }); }, 0);
  }
  window.__ytTest = {
    players, states,
    emit(index, state) { players[index]?.emitState(state); },
    error(index, code) { players[index]?.emitError(code); },
    block(index) { players[index]?.emitAutoplayBlocked(); },
  };
  window.YT = { Player, PlayerState: states };
  window.onYouTubeIframeAPIReady?.();
})();`;

async function installYouTubeApiMock(page: Page) {
  // A contract mock for the official IFrame API: production callbacks receive
  // API-shaped Player/PlayerState/events; tests do not replace adapter logic.
  await page.route('**/iframe_api', route => route.fulfill({
    status: 200, contentType: 'application/javascript; charset=utf-8', body: youtubeApiScript,
  }));
  await page.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({
    status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><meta charset="utf-8"><title>YouTube iframe API contract stub</title>',
  }));
}

async function installYouTubeApiNetworkFailure(page: Page) {
  await page.route('**/iframe_api', route => route.abort('failed'));
  await page.route('https://www.youtube-nocookie.com/embed/**', route => route.fulfill({
    status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><meta charset="utf-8"><title>YouTube iframe API network failure stub</title>',
  }));
}

async function youtubeFilm(page: Page, panel: Locator) {
  await panel.getByRole('button', { name: /풀영상 재생$/ }).click();
  const root = panel.locator('[data-film-root]');
  const frame = root.locator('.film-frame > iframe[data-youtube-player]');
  await expect(frame).toBeVisible();
  const id = await root.getAttribute('data-youtube-id');
  expect(id).toMatch(/^[A-Za-z0-9_-]{11}$/);
  await expect(frame).toHaveAttribute('title', /풀영상/);
  await expect(frame).toHaveAttribute('src', new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${id}\\?.*enablejsapi=1`));
  await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
  await expect(root).toHaveAttribute('data-youtube-state', 'playing');
  expect(await frame.evaluate((node: HTMLIFrameElement) => node === (window as any).__ytTest.players.at(-1).getIframe())).toBe(true);
}

test('홈 다섯 항목 선택과 방향키가 크기와 정렬을 보존한다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const menu = page.getByRole('navigation', { name: '작품 바로 선택' });
  const choices = menu.getByRole('button');
  await expect(choices).toHaveCount(5);
  await expect(menu.getByLabel('4개 작품')).toHaveCount(1);
  await expect(menu.getByLabel('7개 작품')).toHaveCount(1);
  const geometry = () => page.locator('.remy-card').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node); return [parseFloat(style.width), parseFloat(style.height)];
  }));
  const initial = await geometry();
  for (let i = 0; i < 5; i++) {
    await choices.nth(i).click();
    await expect(choices.nth(i)).toHaveAttribute('aria-pressed', 'true');
    await expect(menu.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(activeCard(page)).toHaveCount(1);
    const current = await geometry();
    current.forEach((size, slot) => size.forEach((value, axis) => {
      expect(Math.abs(value - initial[slot][axis]), 'Selection preserves source/layout size while visual focus changes').toBeLessThanOrEqual(0.2);
    }));
    const scales = await page.locator('.remy-card').evaluateAll(nodes => nodes.map(node => {
      const style = getComputedStyle(node.querySelector('.remy-card-visual')!);
      return { active: node.classList.contains('is-active'), scale: new DOMMatrixReadOnly(style.transform).a, opacity: Number(style.opacity), filter: style.filter };
    }));
    expect(scales.filter(card => card.active)).toHaveLength(1);
    expect(scales.find(card => card.active)!.scale).toBeCloseTo(1, 3);
    expect(scales.find(card => card.active)!.opacity).toBeCloseTo(1, 3);
    expect(scales.filter(card => !card.active).every(card => card.scale < 1 && card.scale >= .8 && card.opacity >= .5 && card.filter.includes('blur'))).toBe(true);
    const card = await activeCard(page).boundingBox();
    const stage = await page.getByRole('region', { name: '작품 미리보기' }).boundingBox();
    expect(Math.abs(card!.x + card!.width / 2 - stage!.x - stage!.width / 2)).toBeLessThanOrEqual(1);
    await noHorizontalOverflow(page);
  }
  await page.keyboard.press('ArrowRight');
  await expect(choices.first()).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(choices.last()).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '미리보기 재생', exact: true })).toHaveAttribute('aria-pressed', 'false');
});


test('작품 이동과 드래그 중 초점이 연속적으로 이어지고 제목과 링크가 맞는다', async ({ page }, testInfo) => {
  await page.goto('/?work=firstimpression');
  await page.evaluate(() => document.fonts.ready);
  // Load at reduced motion, then test an actual animated gesture with auto advance paused.
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const samples = await page.evaluate(async () => {
    const outgoing = document.querySelector<HTMLElement>('.remy-card.is-active')!;
    const incoming = outgoing.nextElementSibling as HTMLElement;
    const stage = document.querySelector<HTMLElement>('[data-remy-stage]')!;
    const heading = document.querySelector<HTMLElement>('.remy-work-heading')!;
    const read = () => {
      const card = incoming.getBoundingClientRect(), frame = stage.getBoundingClientRect();
      const style = getComputedStyle(incoming.querySelector('.remy-card-visual')!);
      return {
        distance: Math.abs(card.left + card.width / 2 - frame.left - frame.width / 2),
        scale: new DOMMatrixReadOnly(style.transform).a, opacity: Number(style.opacity),
        titleOpacity: Number(getComputedStyle(heading).opacity),
      };
    };
    const states = [read()];
    document.querySelector<HTMLButtonElement>('[data-work-select][data-index="2"]')!.click();
    const started = performance.now();
    while (performance.now() - started < 800) {
      await new Promise<number>(resolve => requestAnimationFrame(resolve));
      states.push(read());
    }
    return states;
  });
  await testInfo.attach('focus-motion.json', { body: Buffer.from(JSON.stringify(samples)), contentType: 'application/json' });
  const start = samples[0], end = samples.at(-1)!;
  expect(start.distance).toBeGreaterThan(20);
  expect(end.distance).toBeLessThanOrEqual(1);
  expect(end.scale).toBeCloseTo(1, 3);
  expect(end.opacity).toBeCloseTo(1, 3);
  const moving = samples.filter(frame => frame.distance > 2 && frame.distance < start.distance - 2);
  expect(moving.length, 'Actual movement must contain readable intermediate focus states').toBeGreaterThanOrEqual(4);
  expect(new Set(moving.map(frame => frame.scale.toFixed(4))).size).toBeGreaterThanOrEqual(4);
  expect(moving.some(frame => frame.scale < .99 && frame.opacity < .95)).toBe(true);
  expect(moving.some(frame => frame.scale > .9 && frame.opacity > .6)).toBe(true);
  expect(moving.some(frame => frame.titleOpacity > 0 && frame.titleOpacity < 1)).toBe(true);
  await expect(activeCard(page)).toHaveAttribute('href', '/works/butter/');
  await expect(page.locator('[data-remy-title]')).toHaveText('버터! [VirTer!]');

  const card = activeCard(page);
  const box = await card.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 22, box!.y + box!.height / 2, { steps: 5 });
  const beforeRelease = await card.locator('.remy-card-visual').evaluate(node => ({
    scale: new DOMMatrixReadOnly(getComputedStyle(node).transform).a,
    opacity: Number(getComputedStyle(node).opacity),
  }));
  expect(beforeRelease.scale).toBeLessThan(1);
  expect(beforeRelease.opacity).toBeLessThan(1);
  await page.mouse.up();
  await expect.poll(() => card.locator('.remy-card-visual').evaluate(node =>
    new DOMMatrixReadOnly(getComputedStyle(node).transform).a)).toBeCloseTo(1, 3);
  await expect(activeCard(page)).toHaveAttribute('href', '/works/butter/');
  await noHorizontalOverflow(page);
});

test('일곱 대본의 소개·발췌 원문과 읽기 모달 및 초점 복귀를 보존한다', async ({ page }) => {
  await page.goto('/scripts/');
  const menu = page.getByRole('navigation', { name: '읽을 대본 선택' });
  await expect(menu.getByRole('link')).toHaveCount(7);
  for (const [id, title] of scripts) {
    await menu.getByRole('link', { name: title, exact: true }).click();
    const entry = page.locator(`#${id}`);
    const source = SCRIPT_INTRODUCTIONS.find(script => script.id === id)!;
    await expect(entry.getByRole('heading', { level: 2, name: title, exact: true })).toBeVisible();
    expect(await entry.locator('.script-introduction').textContent()).toBe(source.introduction);
    expect(await entry.locator('[data-script-preview] .script-text').allTextContents()).toEqual(source.previewExcerpt.map(line => line.text));
    if (page.viewportSize()!.width <= 1000) await page.getByRole('tab', { name: '대표 장면', exact: true }).click();
    const preview = entry.locator('[data-script-preview]');
    const text = preview.locator('.script-text').last();
    await text.scrollIntoViewIfNeeded();
    await expect(text).toBeInViewport();
    const more = entry.locator('summary');
    await more.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    expect(await dialog.locator('.script-text').allTextContents()).toEqual(source.excerpt.map(line => line.text));
    await expect(page.getByRole('button', { name: '대본 읽기 닫기' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(more).toBeFocused();
    await noHorizontalOverflow(page);
    if (page.viewportSize()!.width <= 1000) await page.getByRole('tab', { name: '작품 소개', exact: true }).click();
  }
});

test('홈에서 대본을 열고 해시·뒤로가기·선택 작품 복귀가 이어진다', async ({ page }) => {
  await page.goto('/?work=scripts&item=understeer');
  await expect(activeCard(page)).toHaveAttribute('href', '/scripts/#understeer');
  await activeCard(page).click();
  await expect(page).toHaveURL(/\/scripts\/#understeer$/);
  const menu = page.getByRole('navigation', { name: '읽을 대본 선택' });
  await menu.getByRole('link', { name: '경계선', exact: true }).click();
  await expect(page).toHaveURL(/#boundary$/);
  await page.goBack();
  await expect(menu.getByRole('link', { name: '언더스티어', exact: true })).toHaveAttribute('aria-current', 'true');
  await page.goForward();
  await expect(menu.getByRole('link', { name: '경계선', exact: true })).toHaveAttribute('aria-current', 'true');
  await page.getByRole('link', { name: '작품 선택으로 돌아가기', exact: true }).click();
  await expect(page).toHaveURL(/\?work=scripts&item=boundary$/);
  await expect(activeCard(page)).toHaveAttribute('href', '/scripts/#boundary');
});

test('테크니컬 네 작품은 기존 YouTube ID의 API 계약으로 연결되고 현재 작품으로 복귀한다', async ({ page }, testInfo) => {
  await installYouTubeApiMock(page);
  testInfo.annotations.push({ type: '검수 한계', description: 'YouTube IFrame API 호출·상태 콜백을 API 호환 스텁으로 검증합니다. 실제 YouTube 재생은 이 테스트가 주장하지 않으며 별도 브라우저 확인 대상입니다.' });
  await page.goto('/tools/?work=mindhunter');
  const menu = page.getByRole('navigation', { name: '테크니컬 작업 선택' });
  await expect(menu.getByRole('link')).toHaveCount(4);
  for (const [slug, title] of tools) {
    await menu.getByRole('link', { name: new RegExp(title) }).click();
    await expect(page).toHaveURL(new RegExp(`\\?work=${slug}$`));
    const panel = page.getByRole('region', { name: title, exact: true });
    await youtubeFilm(page, panel);
    await noHorizontalOverflow(page);
  }
  await page.getByRole('link', { name: '작품 선택', exact: true }).click();
  await expect(page).toHaveURL(/\?work=technical&item=musicvideo$/);
  await expect(page.locator('[data-remy-root] .remy-card.is-active')).toHaveAttribute('data-slug', 'technical');
  await expect(activeCard(page)).toHaveAttribute('href', '/tools/?work=musicvideo');
});

test('주력 세 작품은 YouTube API로 연결되고 다섯 제작 단계가 좁은 화면에서도 작동한다', async ({ page }, testInfo) => {
  await installYouTubeApiMock(page);
  testInfo.annotations.push({ type: '검수 한계', description: 'YouTube IFrame API 호출·상태 콜백을 API 호환 스텁으로 검증합니다. 실제 YouTube 재생은 이 테스트가 주장하지 않으며 별도 브라우저 확인 대상입니다.' });
  for (const [slug, title] of films) {
    await page.goto(`/works/${slug}/`);
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await youtubeFilm(page, page.locator('[data-full-film]'));
    const pipeline = page.locator('[data-production-pipeline]');
    const tabs = pipeline.getByRole('tab');
    await expect(tabs).toHaveCount(5);
    for (let i = 0; i < 5; i++) {
      await tabs.nth(i).scrollIntoViewIfNeeded();
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await tabs.nth(i).click();
      await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
      await expect(pipeline.getByRole('tabpanel')).toHaveCount(1);
      await expect(pipeline.getByRole('tabpanel').getByRole('heading', { level: 3 })).toBeVisible();
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      const workspace = await pipeline.locator('[data-pipeline-workspace]').boundingBox();
      expect(workspace!.y).toBeGreaterThanOrEqual(-1);
      expect(workspace!.y + workspace!.height).toBeLessThanOrEqual(page.viewportSize()!.height + 1);
      await expect(tabs.nth(i)).toBeInViewport();
      const controls = pipeline.getByRole('navigation', { name: '제작 단계 이동' });
      await expect(controls).toBeInViewport();
      const surface = pipeline.locator('[data-pipeline-panel]:not([hidden]) .pipeline-surface');
      await surface.evaluate(node => { node.scrollTop = node.scrollHeight; });
      const surfaceBox = await surface.boundingBox();
      const beforePageScroll = await page.evaluate(() => ({ y: window.scrollY, max: document.documentElement.scrollHeight - innerHeight }));
      await page.mouse.move(surfaceBox!.x + surfaceBox!.width / 2, surfaceBox!.y + surfaceBox!.height / 2);
      await page.mouse.wheel(0, 240);
      if (beforePageScroll.y < beforePageScroll.max - 1) {
        await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(beforePageScroll.y);
      }
      await expect(tabs.nth(i)).toHaveAttribute('aria-selected', 'true');
      await expect(pipeline.getByRole('tabpanel')).toHaveCount(1);

      await noHorizontalOverflow(page);
    }
    await tabs.last().press('Home');
    await expect(tabs.first()).toBeFocused();
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await tabs.first().press('End');
    await expect(tabs.last()).toBeFocused();
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await pipeline.locator('[data-pipeline-prev]').click();
    await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
    await pipeline.locator('[data-pipeline-next]').click();
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await pipeline.locator('[data-pipeline-next]').click();
    await expect(page.locator('[data-pipeline-final]')).toHaveJSProperty('open', true);
    await expect(page.locator('[data-pipeline-final] > summary')).toBeFocused();

  }
});

test('FI 3단계 자료는 안쪽 끝에서 페이지 휠을 막지 않고 선택과 자료 크기를 보존한다', async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/works/firstimpression/');
    const pipeline = page.locator('[data-production-pipeline]');
    const tab = pipeline.locator('[data-pipeline-tab="segment"]');
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    const surface = pipeline.locator('[data-pipeline-panel="segment"] .pipeline-surface');
    await expect(surface).toBeVisible();
    const surfaceMax = await surface.evaluate(node => node.scrollHeight - node.clientHeight);
    const point = await surface.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return { x: Math.min(innerWidth - 2, Math.max(2, rect.left + rect.width / 2)), y: Math.min(innerHeight - 2, Math.max(2, rect.top + rect.height / 2)) };
    });
    await page.mouse.move(point.x, point.y);
    if (surfaceMax > 1) {
      await surface.evaluate(node => { node.scrollTop = Math.floor((node.scrollHeight - node.clientHeight) / 2); });
      const middle = await surface.evaluate(node => node.scrollTop);
      const pageY = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 12);
      await expect.poll(() => surface.evaluate(node => node.scrollTop)).toBeGreaterThan(middle);
      expect(await page.evaluate(() => window.scrollY)).toBe(pageY);
    }
    await surface.evaluate(node => { node.scrollTop = node.scrollHeight; });
    const before = await page.evaluate(() => ({ y: window.scrollY, max: document.documentElement.scrollHeight - innerHeight, box: (() => {
      const rect = document.querySelector('[data-pipeline-panel="segment"] .pipeline-surface')!.getBoundingClientRect();
      return { top: rect.top + scrollY, width: rect.width, height: rect.height };
    })() }));
    await page.mouse.wheel(0, 480);
    if (before.y < before.max - 1) await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before.y);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    const after = await page.evaluate(() => {
      const rect = document.querySelector('[data-pipeline-panel="segment"] .pipeline-surface')!.getBoundingClientRect();
      return { top: rect.top + scrollY, width: rect.width, height: rect.height };
    });
    expect(after.top).toBeCloseTo(before.box.top, 0);
    expect(after.width).toBeCloseTo(before.box.width, 0);
    expect(after.height).toBeCloseTo(before.box.height, 0);
    await surface.evaluate(node => { node.scrollTop = 0; });
    const beforeReverse = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, -480);
    if (beforeReverse > 1) await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(beforeReverse);
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await noHorizontalOverflow(page);
  }
});

test('technical 선택 뒤 240ms 안에 직접 선택하면 새 휠 제스처를 다시 받을 수 있다', async ({ page }) => {
  await page.goto('/?work=technical');
  const root = page.locator('[data-remy-root]');
  const stage = page.locator('[data-remy-stage]');
  const choices = page.locator('[data-work-select]');
  await expect(root).toHaveAttribute('data-work', 'technical');
  await page.evaluate(() => {
    (window as any).__manualWheelSelections = [];
    document.querySelector('[data-remy-root]')!.addEventListener('remy:select', (event: any) => (window as any).__manualWheelSelections.push(event.detail.slug));
  });
  const box = await stage.boundingBox();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 480);
  await expect(root).toHaveAttribute('data-work', 'scripts');
  await page.waitForTimeout(240);
  await choices.nth(3).click();
  await expect(root).toHaveAttribute('data-work', 'technical');
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 480);
  await expect(root).toHaveAttribute('data-work', 'scripts');
  expect(await page.evaluate(() => (window as any).__manualWheelSelections)).toEqual(['scripts', 'technical', 'scripts']);
});

test('정식 URL·이전 시안 별칭의 검색 메타와 404 복귀를 유지한다', async ({ page }) => {
  for (const route of ['/', '/scripts/', '/tools/', ...films.map(([slug]) => `/works/${slug}/`)]) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalOrigin + route);
    const robots = await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('content')).join(' '));
    expect(robots).not.toMatch(/noindex/);
  }
  for (const [alias, target] of [['/previews/remy/', '/'], ['/previews/remy/scripts/', '/scripts/']]) {
    expect((await page.goto(alias))?.status()).toBe(200);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonicalOrigin + target);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
  expect((await page.goto('/missing-regression-page/'))?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('페이지를 찾을 수 없습니다');
  await page.getByRole('link', { name: /작품 선택으로 돌아가기/ }).click();
  await expect(page).toHaveURL(/\/$|\/?\?work=oneandonly$/);
  await expect(page.getByRole('navigation', { name: '작품 바로 선택' })).toBeVisible();
});

test('짧은 창에서 선택 목록 위 휠은 작품을 바꾸지 않고 하단으로 스크롤한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'One short-window input regression is sufficient.');
  await page.setViewportSize({ width: 320, height: 620 });
  await page.goto('/?work=scripts&item=understeer');
  const choice = page.getByRole('navigation', { name: '작품 바로 선택' }).getByRole('button').first();
  const box = await choice.boundingBox();
  expect(box!.y).toBeLessThan(620);
  await page.mouse.move(box!.x + box!.width / 2, Math.min(615, box!.y + 5));
  await page.mouse.wheel(0, 180);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await expect(activeCard(page)).toHaveAttribute('href', '/scripts/#understeer');
});

test('홈 대본 미니 카드 일곱 편의 보이는 글자가 종이 밖으로 잘리지 않는다', async ({ page }) => {
  for (const [id] of scripts) {
    await page.goto(`/?work=scripts&item=${id}`);
    await page.evaluate(() => document.fonts.ready);
    const sample = activeCard(page).locator('.is-inner-active .screenplay-preview');
    await expect(sample).toBeVisible();
    const issues = await sample.evaluate(root => {
      const paper = root.getBoundingClientRect();
      const failures: string[] = [];
      for (const paragraph of root.querySelectorAll('p, .screenplay-preview-byline span')) {
        if (!paragraph.checkVisibility()) continue;
        const range = document.createRange(); range.selectNodeContents(paragraph);
        for (const rect of range.getClientRects()) {
          if (rect.width && (rect.left < paper.left - 1 || rect.right > paper.right + 1 || rect.top < paper.top - 1 || rect.bottom > paper.bottom + 1)) {
            failures.push(`${paragraph.textContent}: glyph outside ${Math.round(paper.width)}×${Math.round(paper.height)}`);
          }
        }
      }
      return failures;
    });
    expect(issues, id).toEqual([]);
    await noHorizontalOverflow(page);
  }
});


test('큰 휠 입력과 긴 관성·역방향 꼬리도 한 작품만 넘긴다', async ({ page }) => {
  await page.goto('/');
  const stage=page.locator('[data-remy-stage]');
  const box=await stage.boundingBox();
  await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);
  await page.evaluate(()=>{
    (window as any).__wheelSelections=[];
    document.querySelector('[data-remy-root]')!.addEventListener('remy:select',(event:any)=>(window as any).__wheelSelections.push(event.detail.slug));
  });
  for(let i=0;i<5;i++){
    await page.mouse.wheel(0,4000);
    await page.waitForTimeout(220);
  }
  await page.mouse.wheel(0,-900);
  await page.waitForTimeout(80);
  expect(await page.evaluate(()=>(window as any).__wheelSelections)).toEqual(['firstimpression']);
  await page.waitForTimeout(680);
  await page.mouse.wheel(0,8000);
  await expect.poll(()=>page.evaluate(()=>(window as any).__wheelSelections)).toEqual(['firstimpression','butter']);
  await page.waitForTimeout(680);
  await stage.dispatchEvent('wheel',{deltaY:-1,deltaMode:2,bubbles:true,cancelable:true});
  await expect.poll(()=>page.evaluate(()=>(window as any).__wheelSelections)).toEqual(['firstimpression','butter','firstimpression']);
  await stage.dispatchEvent('wheel',{deltaY:4000,ctrlKey:true,bubbles:true,cancelable:true});
  expect(await page.evaluate(()=>(window as any).__wheelSelections)).toHaveLength(3);
});

test('키보드로 대본 묶음을 잡으면 연결 작품이 자동으로 바뀌지 않는다', async ({ page },testInfo) => {
  test.skip(testInfo.project.name!=='desktop-1440','One normal-motion timer regression.');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/?work=scripts&item=madeinhongdae');
  await activeCard(page).focus();
  const href=await activeCard(page).getAttribute('href');
  await page.waitForTimeout(4800);
  await expect(activeCard(page)).toHaveAttribute('href',href!);
  const resume=page.getByRole('button',{name:'미리보기 재생',exact:true});
  await expect(resume).toHaveAttribute('aria-pressed','false');
  await resume.click();
  await expect(page.getByRole('button',{name:'미리보기 멈춤',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>activeCard(page).getAttribute('href'),{timeout:6000}).not.toBe(href);
});

test('대본을 읽던 스크롤 위치는 목록·이전다음·Back 이동에도 유지된다',async({page})=>{
  await page.setViewportSize({width:page.viewportSize()!.width,height:620});
  await page.goto('/scripts/#madeinhongdae');
  await page.evaluate(()=>document.fonts.ready);
  await page.evaluate(()=>window.scrollTo(0,180));
  const before=await page.evaluate(()=>window.scrollY);
  expect(before).toBeGreaterThan(0);
  // Use native element.click to isolate route rendering from Playwright's auto-scroll.
  await page.locator('[data-script-select="boundary"]').evaluate((node:HTMLAnchorElement)=>node.click());
  expect(await page.evaluate(()=>window.scrollY)).toBe(before);
  await page.locator('[data-scripts-step="1"]').evaluate((node:HTMLButtonElement)=>node.click());
  expect(await page.evaluate(()=>window.scrollY)).toBe(before);
  await page.goBack();
  await expect(page.locator('[data-script-select="boundary"]')).toHaveAttribute('aria-current','true');
  expect(await page.evaluate(()=>window.scrollY)).toBe(before);
});

test('텍스트 작품 목록과 원본별 큰 프레임이 겹침·확대 손상 없이 유지된다', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const menu=page.getByRole('navigation',{name:'작품 바로 선택'});
  await expect(menu.locator('img,video,canvas,.screenplay-preview')).toHaveCount(0);
  const checks=[];
  for(let index=0;index<5;index++){
    await menu.getByRole('button').nth(index).click();
    checks.push(await page.evaluate(()=>{
      const card=document.querySelector<HTMLElement>('.remy-card.is-active')!;
      const box=card.getBoundingClientRect(),stage=document.querySelector('.remy-stage')!.getBoundingClientRect();
      const title=document.querySelector<HTMLElement>('[data-remy-title]')!,meta=document.querySelector('.remy-meta')!.getBoundingClientRect();
      const list=document.querySelector('.remy-work-list')!.getBoundingClientRect();
      const work=JSON.parse(document.querySelector('[data-remy-data]')!.textContent!).find((w:any)=>w.slug===card.dataset.slug);
      return{width:box.width,height:box.height,ratio:work.width/work.height,cap:work.kind==='script'?null:(work.rasterCapHeight??work.height)/devicePixelRatio,
        top:box.top,stageTop:stage.top,gap:title.getBoundingClientRect().top-box.bottom,metaBottom:meta.bottom,listTop:list.top,
        titleWeight:Number(getComputedStyle(title).fontWeight),nameWeight:Number(getComputedStyle(document.querySelector('.remy-name')!).fontWeight),
        buttons:[...document.querySelectorAll<HTMLElement>('[data-work-select]')].map(node=>{const b=node.getBoundingClientRect();return{height:b.height,bottom:b.bottom,scroll:node.scrollHeight,client:node.clientHeight}})};
    }));
  }
  for(const c of checks){
    expect(c.width/c.height).toBeCloseTo(c.ratio,2);
    if(c.cap!==null)expect(c.height).toBeLessThanOrEqual(c.cap+.2);
    expect(c.top).toBeGreaterThanOrEqual(c.stageTop-.2);
    expect(c.gap).toBeGreaterThanOrEqual(7);
    expect(c.gap).toBeLessThanOrEqual(9);
    expect(c.metaBottom).toBeLessThanOrEqual(c.listTop+1);
    expect(c.titleWeight).toBe(400);expect(c.nameWeight).toBe(400);
    for(const button of c.buttons){expect(button.height).toBeGreaterThanOrEqual(44);expect(button.bottom).toBeLessThanOrEqual(page.viewportSize()!.height);expect(button.scroll).toBeLessThanOrEqual(button.client+1);}
  }
  await noHorizontalOverflow(page);
});

test('글자 간격을 넓혀도 긴 홈 제목과 작품 선택이 겹치지 않는다', async ({ page }) => {
  await page.goto('/?work=firstimpression');
  await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:'*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}'});
  await expect.poll(()=>page.evaluate(()=>{
    const ranges=(selector:string)=>[...document.querySelectorAll(selector)].filter(e=>e.checkVisibility()).flatMap(e=>{
      const result:DOMRect[]=[],walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);let node;
      while(node=walker.nextNode()){if(!node.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(node);result.push(...range.getClientRects());}return result;
    });
    const content=ranges('[data-remy-title],.remy-kind'),choices=ranges('.remy-select-title');
    return content.some(a=>choices.some(b=>Math.min(a.right,b.right)>Math.max(a.left,b.left)+1&&Math.min(a.bottom,b.bottom)>Math.max(a.top,b.top)+1));
  })).toBe(false);
  await noHorizontalOverflow(page);
});

test('대본과 세로 후킹 영상의 상하선과 모바일 원비율이 맞는다', async ({ page }) => {
  for(const slug of ['oneandonly','firstimpression']){
    await page.goto('/works/'+slug+'/');await page.evaluate(()=>document.fonts.ready);
    const hook=page.locator('[data-story-hook]');
    await expect.poll(()=>hook.evaluate(node=>{
      const paper=node.querySelector('.story-document>.script-paper')!.getBoundingClientRect(),frame=node.querySelector('.story-frame')!.getBoundingClientRect();
      return innerWidth>760?Math.max(Math.abs(paper.top-frame.top),Math.abs(paper.bottom-frame.bottom)):Math.abs(frame.width/frame.height-9/16);
    })).toBeLessThan(.5);
    const heading=hook.locator('.story-copy [data-script-focus]');await expect(heading).toBeVisible();
    await noHorizontalOverflow(page);
  }
});

test('YouTube API 상태와 같은 iframe이 작은 창에서 유지되고 과정 영상이 API player를 정리한다', async ({ page }, testInfo) => {
  await installYouTubeApiMock(page);
  testInfo.annotations.push({ type: '검수 한계', description: '공식 IFrame API 모양의 YT.Player mock이 production onReady/onStateChange 콜백을 호출합니다. API 연결·상태 처리·명령·정리 계약을 검사하며 실제 YouTube 재생을 주장하지 않습니다.' });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/works/oneandonly/');
    const root = page.locator('[data-film-follow]'), workspace = page.locator('.pipeline-workspace');
    await workspace.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await expect(root).not.toHaveClass(/is-film-floating/);
    await root.locator('.film-poster').click();
    const frame = root.locator('.film-frame > iframe[data-youtube-player]');
    await expect(frame).toBeVisible();
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    await expect(root).toHaveAttribute('data-youtube-state', 'playing');
    await frame.evaluate(node => { (window as any).__followIdentity = node; });
    const playerIndex = await page.evaluate(() => (window as any).__ytTest.players.length - 1);
    const calls = () => page.evaluate((index) => (window as any).__ytTest.players[index].commands as string[], playerIndex);
    const initialHeight = (await root.locator('[data-film-anchor]').boundingBox())!.height;
    await expect.poll(calls).toContain('playVideo');
    // A portrait play expands and re-centres the film on the next frame; scroll on after it.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    await workspace.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await expect(root).toHaveClass(/is-film-floating/);
    expect(await frame.evaluate(node => node === (window as any).__followIdentity)).toBe(true);
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    const floatingSize = await frame.boundingBox();
    expect(floatingSize!.width).toBeGreaterThanOrEqual(200);
    expect(floatingSize!.height).toBeGreaterThanOrEqual(200);
    expect(Math.abs((await root.locator('[data-film-anchor]').boundingBox())!.height - initialHeight)).toBeLessThan(1);
    const overlap = await page.evaluate(() => {
      const mini = document.querySelector('[data-film-surface]')!.getBoundingClientRect();
      return [...document.querySelectorAll<HTMLElement>('.pipeline-step,.pipeline-control')].filter(e => e.checkVisibility()).some(e => {
        const b = e.getBoundingClientRect();
        return b.top >= 0 && b.bottom <= innerHeight && Math.min(b.right, mini.right) > Math.max(b.left, mini.left) + 1 && Math.min(b.bottom, mini.bottom) > Math.max(b.top, mini.top) + 1;
      });
    });
    expect(overlap, 'The player must leave production tabs and previous/next usable').toBe(false);

    await root.getByRole('button', { name: '풀영상 일시정지', exact: true }).click();
    await expect(frame).toHaveAttribute('data-youtube-state', 'paused');
    await expect(root).toHaveAttribute('data-youtube-state', 'paused');
    expect(await calls()).toContain('pauseVideo');
    await root.getByRole('button', { name: '풀영상 재생', exact: true }).click();
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    expect(await calls()).toContain('playVideo');

    await root.getByRole('button', { name: '풀영상 원위치로 돌아가기' }).click();
    await expect(root).not.toHaveClass(/is-film-floating/);
    expect(await frame.evaluate(node => node === (window as any).__followIdentity)).toBe(true);
    await workspace.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await expect(root).toHaveClass(/is-film-floating/);
    const scrollY = await page.evaluate(() => window.scrollY);
    await root.getByRole('button', { name: '작은 플레이어 닫기' }).click();
    await expect(frame).toHaveAttribute('data-youtube-state', 'paused');
    await expect(root).not.toHaveClass(/is-film-floating/);
    expect(Math.abs(await page.evaluate(() => window.scrollY) - scrollY)).toBeLessThanOrEqual(1);
    await page.mouse.wheel(0, 100);
    await expect(root).not.toHaveClass(/is-film-floating/);

    // This invokes the test API's state callback, not adapter internals.
    await page.evaluate(index => (window as any).__ytTest.emit(index, (window as any).YT.PlayerState.ENDED), playerIndex);
    await expect(frame).toHaveAttribute('data-youtube-state', 'ended');
    await expect(root).toHaveAttribute('data-youtube-state', 'ended');

    // Start a fresh YouTube player, then let a real process clip take over.
    await root.getByRole('button', { name: /풀영상 재생/ }).last().click();
    const nextFrame = root.locator('.film-frame > iframe[data-youtube-player]');
    await expect(nextFrame).toHaveAttribute('data-youtube-state', 'playing');
    const nextPlayerIndex = await page.evaluate(() => (window as any).__ytTest.players.length - 1);
    await page.locator('.pipeline-step').nth(3).click();
    const clip = page.locator('.pipeline-panel:not([hidden]) [data-pipeline-video]').first();
    await expect(page.locator('.pipeline-step').nth(3)).toHaveAttribute('aria-selected', 'true');
    await expect(clip).toBeAttached();
    await clip.evaluate((video: HTMLVideoElement) => video.play());
    await expect(clip).toHaveJSProperty('paused', false);
    await expect(root.locator('.film-frame > iframe')).toHaveCount(0);
    await expect(root).not.toHaveClass(/is-film-floating/);
    await expect(root).not.toHaveAttribute('data-youtube-state', /.+/);
    expect(await page.evaluate(index => (window as any).__ytTest.players[index].commands as string[], nextPlayerIndex)).toContain('destroy');
    await noHorizontalOverflow(page);
  }
});

test('세로 풀영상은 같은 YouTube iframe을 키우고 핸들·키보드·코너·크기 조작으로 화면 안에서 이동한다', async ({ page }, testInfo) => {
  await installYouTubeApiMock(page);
  testInfo.annotations.push({ type: '검수 한계', description: '공식 IFrame API 호환 mock으로 production player adapter의 같은 iframe identity와 PLAYING 상태를 확인합니다. Playwright pointer input으로 제품 핸들을 조작하며 실제 YouTube 재생은 주장하지 않습니다.' });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/works/firstimpression/');
    const root = page.locator('[data-film-follow]');
    const workspace = page.locator('.pipeline-workspace');
    const frame = root.locator('.film-frame > iframe[data-youtube-player]');
    await root.locator('.film-poster').click();
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    await expect(root).toHaveClass(/is-film-expanded/);
    const large = root.locator('[data-film-large]');
    await expect(large).toHaveAttribute('aria-expanded', 'true');
    expect(await frame.evaluate(node => node === (window as any).__ytTest.players.at(-1).getIframe())).toBe(true);
    await frame.evaluate(node => { (window as any).__portraitFrame = node; });
    const expanded = await root.locator('[data-film-anchor]').boundingBox();
    await large.click();
    await expect(root).not.toHaveClass(/is-film-expanded/);
    await expect(large).toHaveAttribute('aria-expanded', 'false');
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    expect(await frame.evaluate(node => node === (window as any).__portraitFrame)).toBe(true);
    const collapsed = await root.locator('[data-film-anchor]').boundingBox();
    expect(expanded!.height).toBeGreaterThan(collapsed!.height + 10);
    await large.click();
    await expect(root).toHaveClass(/is-film-expanded/);
    expect(await frame.evaluate(node => node === (window as any).__portraitFrame)).toBe(true);
    // Expanding re-centres the film on the next frame; a reader scrolls on after that, not within it.
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    await workspace.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await expect(root).toHaveClass(/is-film-floating/);
    await expect(root.locator('[data-film-mini-bar]')).toBeVisible();
    await expect(root.locator('[data-film-mini-footer]')).toBeVisible();
    const surface = root.locator('[data-film-surface]');
    const drag = root.locator('[data-film-drag]');
    const resize = root.locator('[data-film-resize]');
    const options = root.locator('[data-film-window-options]');
    const box = async () => surface.evaluate(node => { const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; });
    const withinViewport = async () => {
      const r = await box();
      expect(r.x).toBeGreaterThanOrEqual(11);
      expect(r.y).toBeGreaterThanOrEqual(11);
      expect(r.right).toBeLessThanOrEqual(viewport.width - 10);
      expect(r.bottom).toBeLessThanOrEqual(viewport.height - 10);
      const media = await frame.boundingBox();
      expect(media!.width).toBeGreaterThanOrEqual(200);
      expect(media!.height).toBeGreaterThanOrEqual(200);
    };
    await withinViewport();
    const defaultBox = await box();
    const playerOverlap = await page.evaluate(() => {
      const player=document.querySelector('[data-film-surface]')!.getBoundingClientRect();
      return [...document.querySelectorAll<HTMLElement>('.pipeline-step[aria-selected="true"],.pipeline-navigation,.pipeline-panel:not([hidden]) .pipeline-panel-heading')]
        .filter(node=>node.checkVisibility()).some(node=>{const b=node.getBoundingClientRect();return Math.min(b.right,player.right)>Math.max(b.left,player.left)+1&&Math.min(b.bottom,player.bottom)>Math.max(b.top,player.top)+1;});
    });
    expect(playerOverlap, 'The default floating window should leave current process controls and heading unobstructed').toBe(false);

    await drag.click();
    await expect(options).toBeVisible();
    await expect(drag).toHaveAttribute('aria-expanded', 'true');
    for (const corner of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
      await options.locator(`[data-film-position="${corner}"]`).click();
      await withinViewport();
      const position = await box();
      if (corner.endsWith('left')) expect(position.x).toBeLessThanOrEqual(13);
      else expect(position.right).toBeGreaterThanOrEqual(viewport.width - 13);
      if (corner.startsWith('top')) expect(position.y).toBeLessThanOrEqual(13);
      else expect(position.bottom).toBeGreaterThanOrEqual(viewport.height - 13);
      await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
      expect(await frame.evaluate(node => node === (window as any).__portraitFrame)).toBe(true);
      if (corner !== 'bottom-right') {
        await drag.click();
        await expect(options).toBeVisible();
      }
    }

    const beforeDrag = await box();
    const dragHit = await drag.boundingBox();
    await page.mouse.move(dragHit!.x + dragHit!.width / 2, dragHit!.y + dragHit!.height / 2);
    await page.mouse.down();
    await page.mouse.move(dragHit!.x + dragHit!.width / 2 - 48, dragHit!.y + dragHit!.height / 2 - 40, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await box()).x).toBeLessThan(beforeDrag.x - 10);
    await withinViewport();
    const beforeKey = await box();
    await drag.focus();
    await drag.press('ArrowRight');
    await drag.press('ArrowDown');
    await expect.poll(async () => (await box()).x).toBeGreaterThan(beforeKey.x);
    await expect.poll(async () => (await box()).y).toBeGreaterThan(beforeKey.y);
    await withinViewport();

    const beforeResize = await box();
    const resizeHit = await resize.boundingBox();
    await page.mouse.move(resizeHit!.x + resizeHit!.width / 2, resizeHit!.y + resizeHit!.height / 2);
    await page.mouse.down();
    await page.mouse.move(resizeHit!.x + resizeHit!.width / 2 + 48, resizeHit!.y + resizeHit!.height / 2 + 48, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await box()).width).toBeGreaterThan(beforeResize.width + 10);
    await withinViewport();
    const beforeSizeKey = await box();
    await resize.focus();
    await resize.press('ArrowRight');
    await expect.poll(async () => (await box()).width).toBeGreaterThan(beforeSizeKey.width);
    await withinViewport();

    await resize.click();
    await expect(options).toBeVisible();
    const beforePlus = await box();
    await options.locator('[data-film-size="1"]').click();
    await expect.poll(async () => (await box()).width).toBeGreaterThan(beforePlus.width);
    await withinViewport();
    await options.locator('[data-film-window-reset]').click();
    await expect(root).not.toHaveAttribute('data-film-window-free', /.+/);
    await withinViewport();
    const resetBox = await box();
    expect(Math.abs(resetBox.x - defaultBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(resetBox.y - defaultBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(resetBox.width - defaultBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(resetBox.height - defaultBox.height)).toBeLessThanOrEqual(1);
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    expect(await frame.evaluate(node => node === (window as any).__portraitFrame)).toBe(true);
  }
});

test('중간 스크롤에서도 과정 조작이 보이고 다른 제작 영상은 작은 YouTube player를 정리한다', async ({page}, testInfo)=>{
  await installYouTubeApiMock(page);
  testInfo.annotations.push({ type: '검수 한계', description: 'YT.Player API mock을 이용해 production adapter 전환·정리 계약만 확인합니다. 실제 YouTube 스트리밍은 검증하지 않습니다.' });
  for(const slug of ['oneandonly','firstimpression','butter']){
    await page.goto('/works/'+slug+'/');
    const root=page.locator('[data-film-follow]'),frame=root.locator('.film-frame>iframe[data-youtube-player]'),workspace=page.locator('.pipeline-workspace');
    await root.locator('.film-poster').click();await expect(frame).toHaveAttribute('data-youtube-state','playing');
    await workspace.evaluate(node=>node.scrollIntoView({block:'start'}));await expect(root).toHaveClass(/is-film-floating/);
    await page.evaluate(()=>scrollBy(0,-110));
    if(page.viewportSize()!.width<=900){
      await expect.poll(()=>page.evaluate(()=>document.querySelector('.pipeline-navigation')!.getBoundingClientRect().bottom-document.querySelector('[data-film-surface]')!.getBoundingClientRect().top)).toBeLessThanOrEqual(-10);
    }
    await page.locator('.pipeline-step').nth(4).click();
    await root.getByRole('button',{name:'작은 플레이어 닫기'}).click();
    await expect(page.locator('.pipeline-step').nth(4)).toBeFocused();
    const index=await page.evaluate(()=> (window as any).__ytTest.players.length-1);
    await page.evaluate(index=>(window as any).__ytTest.players[index].playVideo(),index);
    await expect(frame).toHaveAttribute('data-youtube-state','playing');await expect(root).toHaveClass(/is-film-floating/);
    await page.locator('.pipeline-step').nth(3).click();
    const clip=page.locator('.pipeline-panel:not([hidden]) [data-pipeline-video]').first();
    await clip.evaluate((v:HTMLVideoElement)=>v.play());
    await expect(clip).toHaveJSProperty('paused',false);await expect(root.locator('.film-frame>iframe')).toHaveCount(0);
    await expect(root).not.toHaveClass(/is-film-floating/);
    expect(await page.evaluate(()=>document.body.classList.contains('has-floating-film'))).toBe(false);
    await clip.evaluate((v:HTMLVideoElement)=>v.pause());
  }
});

test('YouTube player가 떠 있어도 버터 완성 장면의 실제 클릭이 이동 중 사라지지 않는다',async({page}, testInfo)=>{
  await installYouTubeApiMock(page);
  testInfo.annotations.push({ type: '검수 한계', description: 'YouTube iframe API callback은 호환 mock이며, Butter process clip 자체는 로컬 영상 재생으로 확인합니다.' });
  await page.goto('/works/butter/');await page.emulateMedia({reducedMotion:'no-preference'});
  const root=page.locator('[data-film-follow]');await page.locator('[data-film-play]').last().click();
  const frame=root.locator('.film-frame > iframe[data-youtube-player]');
  await expect(frame).toHaveAttribute('data-youtube-state','playing');
  await page.locator('[data-production-pipeline]').scrollIntoViewIfNeeded();await expect(root).toHaveClass(/is-film-floating/);
  await page.locator('[data-pipeline-final]').locator('summary').first().click();
  const seek=page.locator('[data-process-seek]').first();await seek.scrollIntoViewIfNeeded();await seek.click();
  const scene=page.locator('[data-process-video]');await expect(scene).toHaveJSProperty('paused',false);
  await expect(root.locator('.film-frame>iframe')).toHaveCount(0);
  await expect(root).not.toHaveClass(/is-film-floating/);
  expect(await page.evaluate(()=> (window as any).__ytTest.players.at(-1).commands as string[])).toContain('destroy');
});

test('YouTube API 오류와 차단은 대체 링크를 보이고 다음 재생 상태에서 복구한다', async ({ page }, testInfo) => {
  await installYouTubeApiMock(page);
  testInfo.annotations.push({ type: '검수 한계', description: 'API mock으로 onError(150), onAutoplayBlocked, onStateChange(PLAYING) production 콜백 계약만 검증합니다. YouTube 실제 영상 성공을 주장하지 않습니다.' });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/works/firstimpression/');
    const root = page.locator('[data-film-follow]'), workspace = page.locator('.pipeline-workspace');
    await root.locator('.film-poster').click();
    let frame = root.locator('.film-frame > iframe[data-youtube-player]');
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    let index = await page.evaluate(() => (window as any).__ytTest.players.length - 1);
    await workspace.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await expect(root).toHaveClass(/is-film-floating/);

    await page.evaluate(index => (window as any).__ytTest.error(index, 150), index);
    await expect(frame).toHaveAttribute('data-youtube-state', 'error');
    await expect(root).toHaveAttribute('data-youtube-state', 'error');
    await expect(root).toHaveAttribute('data-youtube-error', '150');
    await expect(root.locator('[data-film-error]')).toBeVisible();
    await expect(root.locator('[data-film-error] a')).toHaveAttribute('href', /youtube\.com\/watch\?v=/);
    await expect(root).not.toHaveClass(/is-film-floating/);
    await expect(frame).toHaveCount(1);

    await root.getByRole('button', { name: /풀영상 재생/ }).last().click();
    frame = root.locator('.film-frame > iframe[data-youtube-player]');
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    index = await page.evaluate(() => (window as any).__ytTest.players.length - 1);
    await workspace.evaluate(node => node.scrollIntoView({ block: 'start' }));
    await expect(root).toHaveClass(/is-film-floating/);
    await page.evaluate(index => (window as any).__ytTest.block(index), index);
    await expect(frame).toHaveAttribute('data-youtube-state', 'blocked');
    await expect(root).toHaveAttribute('data-youtube-state', 'blocked');
    await expect(root.locator('[data-film-error]')).toBeVisible();
    await expect(root).not.toHaveClass(/is-film-floating/);
    await expect(frame).toHaveCount(1);

    await page.evaluate(index => (window as any).__ytTest.emit(index, (window as any).YT.PlayerState.PLAYING), index);
    await expect(frame).toHaveAttribute('data-youtube-state', 'playing');
    await expect(root.locator('[data-film-error]')).toBeHidden();
    await expect(root).toHaveClass(/is-film-floating/);
    await noHorizontalOverflow(page);
  }
});

test('YouTube IFrame API 스크립트 네트워크 실패 시에도 사용자용 복구 링크를 제공한다', async ({ page }, testInfo) => {
  await installYouTubeApiNetworkFailure(page);
  testInfo.annotations.push({ type: '검수 한계', description: 'iframe_api 스크립트 요청 실패 경로와 사용자 fallback만 검사하며 실제 YouTube 서비스 장애를 재현하지 않습니다.' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/works/oneandonly/');
  const root = page.locator('[data-film-follow]');
  await root.locator('.film-poster').click();
  const frame = root.locator('.film-frame > iframe[data-youtube-player]');
  await expect(root).toHaveAttribute('data-youtube-state', 'error');
  await expect(root.locator('[data-film-error]')).toBeVisible();
  await expect(root.locator('[data-film-error] a')).toHaveAttribute('href', /youtube\.com\/watch\?v=/);
  await expect(root).not.toHaveClass(/is-film-floating/);
  await expect(frame).toBeVisible();
});
