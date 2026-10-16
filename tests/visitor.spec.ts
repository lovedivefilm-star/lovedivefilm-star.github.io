/**
 * ALT's captured home layout is the regression baseline, not a new interpretation.
 * Reference: detail-alt-responsive/alt-{1440,1280,390}-computed-layout.json,
 * captured 2026-10-15; docs/design-reference-contract.md records adaptation limits.
 * These are geometry/navigation/media observations, not human comprehension results.
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { MAIN_WORKS, TOOL_WORKS } from '../src/data/works';
import { CONTACT_EMAIL, SITE } from '../src/data/site';

const rotation = ['butter', 'oneandonly', 'firstimpression'];
const ratioOf = (text: string) => { const [w, h] = text.split('/').map(Number); return w / h; };
const activeSlide = (hero: Locator) => hero.locator('[data-showcase-slide][data-active="true"]');
const currentSlug = (hero: Locator) => activeSlide(hero).getAttribute('data-showcase-slide');
const allPaused = (hero: Locator) => hero.locator('[data-showcase-video]').evaluateAll((nodes) => nodes.every((node) => (node as HTMLVideoElement).paused));
const near = (actual: number, reference: number, label: string, tolerance = 2) => expect(Math.abs(actual - reference), `${label}: ${actual} vs ${reference}`).toBeLessThanOrEqual(tolerance);

async function openHome(page: Page) {
  const response = await page.goto('/', { waitUntil: 'load' });
  expect(response?.status()).toBe(200);
  await page.evaluate(() => document.fonts.ready);
  const hero = page.locator('[data-showcase]');
  await parkPointerOutside(page, hero);
  return hero;
}

async function parkPointerOutside(page: Page, hero: Locator) {
  const bounds = (await hero.boundingBox())!;
  const height = page.viewportSize()!.height;
  // After revealing controls below the cover, use the intro margin outside the Hero.
  // At the initial top position, the fixed overlay header provides the outside point.
  const bottom = bounds.y + bounds.height;
  const y = bottom < height - 2 ? Math.max(1, Math.min(height - 1, bottom + 2)) : 1;
  await page.mouse.move(1, y);
}

async function revealControls(page: Page, hero: Locator) {
  const controls = hero.locator('[data-showcase-controls]');
  await controls.scrollIntoViewIfNeeded();
  await expect(controls).toBeInViewport({ ratio: 1 });
  await expect(hero).toBeInViewport({ ratio: .25 });
  await parkPointerOutside(page, hero);
}

async function expectSingleHero(hero: Locator, slug: string) {
  await expect(hero.locator('[data-showcase-slide]')).toHaveCount(3);
  expect(await hero.locator('[data-showcase-slide]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-showcase-slide')))).toEqual(rotation);
  await expect(activeSlide(hero)).toHaveCount(1);
  expect(await currentSlug(hero)).toBe(slug);
  await expect(activeSlide(hero)).toBeVisible();
  await expect(activeSlide(hero)).not.toHaveAttribute('hidden');
  await expect(hero.locator('[data-showcase-slide][hidden]')).toHaveCount(2);
  expect(await hero.locator('[data-showcase-video]').evaluateAll((nodes) => nodes.filter((node) => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })).length), '단일 배경만 보이고 세 작품이 병렬 모듈로 돌아가지 않음').toBe(1);
  const work = MAIN_WORKS.find((item) => item.slug === slug)!;
  await expect(hero.locator('[data-showcase-open]')).toHaveAttribute('href', `/works/${slug}/`);
  await expect(hero.locator('[data-showcase-current]')).toContainText(work.title);
}

async function expectHeroReference(page: Page, hero: Locator) {
  const viewport = page.viewportSize()!;
  const mobile = viewport.width <= 700;
  // Values read from the three original computed-layout captures, not the local CSS.
  const baseline: Record<number, { height: number; x: number; titleY: number; subtitleY: number; ctaY: number }> = {
    1440: { height: 900, x: 120, titleY: 555, subtitleY: 637, ctaY: 758 },
    1280: { height: 800, x: 40, titleY: 455, subtitleY: 537, ctaY: 658 },
    390: { height: 844, x: 20, titleY: 518, subtitleY: 612, ctaY: 702 },
  };
  const reference = baseline[viewport.width];
  expect(reference, '이번 검수 폭은 저장된 ALT 원본 실측에 대응').toBeTruthy();
  expect(viewport.height).toBe(reference.height);
  const box = (await hero.boundingBox())!;
  near(box.x, 0, 'Hero left'); near(box.y, 0, 'Hero가 헤더 다음 별도 행으로 밀리지 않음');
  near(box.width, viewport.width, 'Hero width'); near(box.height, viewport.height, '100svh Hero');
  const header = page.locator('header.site-header');
  const head = (await header.boundingBox())!;
  near(head.y, 0, 'overlay nav top'); near(head.height, 70, 'overlay nav height');
  expect(await header.evaluate((node) => ['absolute', 'fixed'].includes(getComputedStyle(node).position)), '70px 메뉴는 Hero 위에 겹침').toBe(true);
  const title = hero.locator('#home-title');
  const subtitle = hero.locator('.hero-copy > p');
  const cta = hero.locator('[data-showcase-open]');
  await expect(title).toHaveText(SITE.name);
  await expect(subtitle).toHaveText(SITE.job);
  await expect(hero.getByRole('heading')).toHaveCount(1);
  for (const [node, y, font, line, label] of [
    [title, reference.titleY, mobile ? 45 : 70, mobile ? 64 : 52, '제목'],
    [subtitle, reference.subtitleY, mobile ? 18 : 30, mobile ? 30 : 52, '직함'],
  ] as const) {
    const geometry = await node.evaluate((element) => {
      const r = element.getBoundingClientRect(); const css = getComputedStyle(element);
      return { x: r.x, y: r.y, height: r.height, font: parseFloat(css.fontSize), line: parseFloat(css.lineHeight), tracking: parseFloat(css.letterSpacing) };
    });
    near(geometry.x, reference.x, `${label} x`); near(geometry.y, y, `${label} y`);
    near(geometry.font, font, `${label} font`, .1); near(geometry.line, line, `${label} line-height`, .1);
    near(geometry.height, line, `${label}는 원본처럼 한 행`); near(geometry.tracking, -.4, `${label} tracking`, .1);
    await expect(node).toBeInViewport({ ratio: 1 });
  }
  const action = (await cta.boundingBox())!;
  near(action.x, reference.x, 'CTA x'); near(action.y, reference.ctaY, 'CTA y');
  near(action.width, 268, 'CTA width'); near(action.height, 46, 'CTA height');
  near(viewport.height - action.y - action.height, 96, 'CTA bottom margin');
  await expect(cta).toHaveCSS('font-size', '14px');
  near(await cta.evaluate((node) => parseFloat(getComputedStyle(node).letterSpacing)), 3.2, 'CTA tracking', .1);
  await expect(cta).toBeInViewport({ ratio: 1 });
  await expect(hero.locator('[data-showcase-controls]')).toHaveCount(1);
  const controls = hero.locator('[data-showcase-controls]');
  near((await controls.boundingBox())!.y, viewport.height + 24, '재생 조작은 첫 화면 아래 24px');
  await expect(controls).not.toBeInViewport();
  const chevron = hero.locator('.hero-scroll');
  await expect(chevron).toBeVisible(); await expect(chevron).toBeInViewport({ ratio: 1 });
  await expect(chevron).toHaveAttribute('href', '#works');
  const arrow = (await chevron.boundingBox())!;
  near(arrow.x + arrow.width / 2, viewport.width / 2, '중앙 chevron x');
  near(viewport.height - arrow.y - arrow.height, 24, '중앙 chevron bottom');
  await expect(hero.locator('[data-showcase-pick], .work-card, .showcase-card-heading, .showcase-role')).toHaveCount(0);
  for (const name of ['toggle', 'prev', 'next']) {
    const control = hero.locator(`[data-showcase-${name}]`);
    await expect(control).toBeVisible();
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  const cardsInFirstViewport = await page.locator('#works [data-work-card]').evaluateAll((cards) => cards.filter((card) => {
    const r = card.getBoundingClientRect(); return card.checkVisibility() && r.top < innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0;
  }).length);
  expect(cardsInFirstViewport, '첫 화면에 작품 목록/세 카드가 다시 섞이지 않음').toBe(0);
  const sequence = await page.evaluate(() => ['[data-showcase]', '.home-intro', '#works'].map((selector) => {
    const node = document.querySelector(selector)!; const r = node.getBoundingClientRect(); return { top: r.top + scrollY, bottom: r.bottom + scrollY };
  }));
  near(sequence[1].top, viewport.height, 'Hero 바로 다음 소개');
  expect(sequence[2].top, '작품 목록은 소개 아래에만 존재').toBeGreaterThanOrEqual(sequence[1].bottom - 1);
  const intro = page.locator('.home-intro');
  const introLayout = await intro.evaluate((section) => {
    const css = getComputedStyle(section); const grid = section.querySelector('.home-intro-inner')!;
    return { top: parseFloat(css.paddingTop), bottom: parseFloat(css.paddingBottom), columns: getComputedStyle(grid).gridTemplateColumns.split(/\s+/).length,
      order: [...grid.children].map((node) => node.className) };
  });
  near(introLayout.top, 150, '소개 top padding', .1); near(introLayout.bottom, mobile ? 77 : 126, '소개 bottom padding', .1);
  expect(introLayout.columns).toBe(mobile ? 1 : 4);
  expect(introLayout.order).toEqual(['home-intro-about', 'home-intro-space', 'home-intro-links', 'home-intro-contact']);
  if (mobile) await expect(intro.locator('.home-intro-space')).toBeHidden();
  await expect(intro.locator('.home-intro-body')).toContainText('대본');
  await expect(intro.locator('.home-intro-body')).toContainText('연출');
  const content = await intro.locator('.home-intro-about, .home-intro-links, .home-intro-contact').evaluateAll((nodes) => nodes.map((node) => {
    const r = node.getBoundingClientRect(); return { x: r.x, y: r.y, bottom: r.bottom };
  }));
  if (mobile) {
    expect(content[1].y).toBeGreaterThanOrEqual(content[0].bottom - 1);
    expect(content[2].y).toBeGreaterThanOrEqual(content[1].bottom - 1);
  } else {
    near(content[0].y, content[1].y, '소개 가로 정렬'); near(content[1].y, content[2].y, '연락 가로 정렬');
    expect(content[0].x).toBeLessThan(content[1].x); expect(content[1].x).toBeLessThan(content[2].x);
  }
}

async function expectHeroFilm(hero: Locator, slug: string) {
  const work = MAIN_WORKS.find((item) => item.slug === slug)!;
  const video = activeSlide(hero).locator('video');
  await expect(video).toHaveAttribute('src', work.hook!.clip);
  await expect(video).toHaveAttribute('poster', work.hook!.poster);
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).readyState), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  const media = await video.evaluate((node) => {
    const v = node as HTMLVideoElement; const box = v.getBoundingClientRect(); const frame = v.parentElement!.getBoundingClientRect();
    return { natural: v.videoWidth / v.videoHeight, fit: getComputedStyle(v).objectFit, width: box.width, height: box.height,
      inside: box.left >= frame.left - 1 && box.right <= frame.right + 1 && box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1 };
  });
  expect(Math.abs(media.natural / ratioOf(work.hook!.aspect!) - 1)).toBeLessThanOrEqual(.02);
  // The ALT Hero is deliberately a cover background. Native-format artwork below is tested separately.
  expect(media.fit).toBe('cover'); expect(media.inside).toBe(true);
  const frame = (await hero.boundingBox())!;
  near(media.width, frame.width, 'cover video width'); near(media.height, frame.height, 'cover video height');
}

async function expectGallery(page: Page) {
  const cards = page.locator('#works .main-grid .work-card');
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-work-card')))).toEqual(rotation);
  for (const work of MAIN_WORKS) {
    const card = cards.filter({ has: page.locator(`[data-thumbnail-ratio] img[alt="${work.title} 완성 화면"]`) });
    await expect(card).toHaveCount(1); await expect(card).toHaveAttribute('href', `/works/${work.slug}/`);
    await expect(card.locator('.work-card-role')).toHaveText(work.creditNote);
    // Original ALT .thumb-hover-meta uses2.22rem with18px root; all three sampled widths.
    const caption = await card.locator('.work-card-caption').evaluate((node) => {
      const css = getComputedStyle(node); const title = getComputedStyle(node.querySelector('h3')!);
      return { padding: [css.paddingTop, css.paddingRight, css.paddingBottom, css.paddingLeft].map(parseFloat), font: parseFloat(title.fontSize), line: parseFloat(title.lineHeight) };
    });
    for (const padding of caption.padding) near(padding, 39.96, 'ALT caption padding', .1);
    near(caption.font, 24, 'ALT caption title font', .1); near(caption.line, 36, 'ALT caption title line', .1);
    const image = card.locator('img'); await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0), { timeout: 15_000 }).toBe(true);
    await expect(image).toHaveAttribute('src', work.slug === 'butter' ? work.hook!.poster : work.poster);
    const shape = await image.evaluate((node) => {
      const img = node as HTMLImageElement; const box = img.getBoundingClientRect(); const frame = img.parentElement!.getBoundingClientRect();
      return { natural: img.naturalWidth / img.naturalHeight, rendered: box.width / box.height, frame: frame.width / frame.height, fit: getComputedStyle(img).objectFit,
        inside: box.left >= frame.left - 1 && box.right <= frame.right + 1 && box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1 };
    });
    const expected = work.slug === 'butter' ? 1280 / 536 : 9 / 16;
    expect(Math.abs(shape.natural / expected - 1), '선정한 실제 완성 프레임').toBeLessThanOrEqual(.002);
    expect(Math.abs(shape.rendered / shape.natural - 1), '갤러리 이미지 요소 원본 비율').toBeLessThanOrEqual(.02);
    expect(Math.abs(shape.frame / shape.natural - 1), '정사각 크롭/과도한 빈 프레임 재발 금지').toBeLessThanOrEqual(.02);
    expect(shape.fit).toBe('contain'); expect(shape.inside, '완성 프레임 전체가 부모 안에 있음').toBe(true);
  }
  const wide = (await cards.nth(0).boundingBox())!; const first = (await cards.nth(1).boundingBox())!; const second = (await cards.nth(2).boundingBox())!;
  near(wide.x, 0, '작품 띠 left'); near(wide.width, page.viewportSize()!.width, '가로 작품 전체 너비');
  near(first.y, second.y, '세로 두 편 나란히'); near(second.x - first.x - first.width, 10, '작품 가로 간격');
  near(first.y - wide.y - wide.height, 10, '작품 세로 간격');
  const grid = await page.locator('#works .main-grid').evaluate((node) => ({ row: parseFloat(getComputedStyle(node).rowGap), column: parseFloat(getComputedStyle(node).columnGap) }));
  near(grid.row, 10, 'ALT row gap', .1); near(grid.column, 10, 'ALT column gap', .1);
  for (const work of TOOL_WORKS) await expect(page.locator(`#works a.technical-card[href="/tools/#${work.slug}"]`)).toBeVisible();
}

async function step(hero: Locator, direction: 'prev' | 'next', slug: string, key?: 'Enter' | 'Space') {
  const control = hero.locator(`[data-showcase-${direction}]`);
  await control.scrollIntoViewIfNeeded();
  await expect(hero).toBeInViewport({ ratio: .25 });
  if (key) await control.press(key); else await control.click();
  await expectSingleHero(hero, slug);
  await expect(hero).toHaveAttribute('data-auto-running', 'false');
  expect(await allPaused(hero)).toBe(true);
}

test('A-1. ALT 실측 단일 첫 화면·제목/CTA 좌표·소개 순서/여백·10px 갤러리와 원본 비율', async ({ page }, testInfo) => {
  testInfo.annotations.push({ type: '검증 범위', description: '저장된 ALT 실측과 실제 브라우저 배치·링크·미디어 검증. 사람의 5초/30초 이해도 효과를 측정한 시험이 아님.' });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  const hero = await openHome(page);
  await expectSingleHero(hero, 'butter');
  // Freeze through the real stop control before slow media loads; A2 measures real rotation.
  await revealControls(page, hero);
  await hero.locator('[data-showcase-toggle]').click(); await expect(hero).toHaveAttribute('data-auto-running', 'false');
  await page.evaluate(() => scrollTo(0, 0));
  await parkPointerOutside(page, hero);
  await expectHeroReference(page, hero); await expectHeroFilm(hero, 'butter');
  await step(hero, 'next', 'oneandonly'); await expectHeroFilm(hero, 'oneandonly');
  await step(hero, 'next', 'firstimpression'); await expectHeroFilm(hero, 'firstimpression');
  await expectGallery(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

test('A-2. 실제7초 3편 순환·명시 정지/키보드/포커스·hover/화면 밖/reduced·모바일 메뉴', async ({ page, context }, testInfo) => {
  const hero = await openHome(page); const toggle = hero.locator('[data-showcase-toggle]');
  await expect(hero).toHaveAttribute('data-running', 'true'); await expectSingleHero(hero, 'butter');
  await expect.poll(() => currentSlug(hero), { timeout: 10_000, intervals: [100] }).toBe('oneandonly');
  const started = Date.now(); await expectSingleHero(hero, 'oneandonly');
  await page.waitForTimeout(4_000); expect(await currentSlug(hero), '7초 전에 다음 작품으로 넘기지 않음').toBe('oneandonly');
  await expect.poll(() => currentSlug(hero), { timeout: 6_000, intervals: [100] }).toBe('firstimpression');
  const elapsed = Date.now() - started; expect(elapsed).toBeGreaterThanOrEqual(6_000); expect(elapsed).toBeLessThanOrEqual(9_000);
  await testInfo.attach('observed-rotation-interval.json', { body: JSON.stringify({ milliseconds: elapsed, requested: 7000, fakeClock: false, observedSequence: rotation }), contentType: 'application/json' });
  await expectSingleHero(hero, 'firstimpression');
  await expect.poll(() => activeSlide(hero).locator('video').evaluate((node) => (node as HTMLVideoElement).paused)).toBe(false);
  expect(await hero.locator('[data-showcase-slide][hidden] video').evaluateAll((nodes) => nodes.every((node) => (node as HTMLVideoElement).paused))).toBe(true);
  await revealControls(page, hero);
  await toggle.click(); await expect(hero).toHaveAttribute('data-auto-running', 'false');
  await expect(toggle).toHaveAccessibleName('자동 미리보기 시작'); expect(await allPaused(hero)).toBe(true);
  await parkPointerOutside(page, hero); const stopped = await currentSlug(hero); await page.waitForTimeout(7_250); expect(await currentSlug(hero)).toBe(stopped);
  await toggle.press('Space'); await expect(hero).toHaveAttribute('data-running', 'true');
  await expect.poll(() => activeSlide(hero).locator('video').evaluate((node) => (node as HTMLVideoElement).paused)).toBe(false);
  await toggle.press('Space'); await expect(hero).toHaveAttribute('data-auto-running', 'false'); expect(await allPaused(hero)).toBe(true);
  // Both arrows are real controls on all three widths; all three alternatives remain reachable.
  await step(hero, 'next', 'butter', 'Enter'); await step(hero, 'next', 'oneandonly', 'Space');
  await step(hero, 'next', 'firstimpression', 'Enter'); await step(hero, 'prev', 'oneandonly', 'Space');
  await toggle.focus(); await toggle.press('Space'); await expect(hero).toHaveAttribute('data-auto-running', 'true');
  await hero.locator('[data-showcase-next]').focus(); await expect(hero).toHaveAttribute('data-auto-running', 'false');
  await page.keyboard.press('Tab'); await parkPointerOutside(page, hero); expect(await allPaused(hero)).toBe(true);
  await toggle.focus(); await toggle.press('Space'); await parkPointerOutside(page, hero); await expect(hero).toHaveAttribute('data-running', 'true');
  await activeSlide(hero).locator('video').hover(); await expect(hero).toHaveAttribute('data-auto-running', 'true'); await expect(hero).toHaveAttribute('data-running', 'false'); expect(await allPaused(hero)).toBe(true);
  await parkPointerOutside(page, hero); await expect(hero).toHaveAttribute('data-running', 'true');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await expect(hero).toHaveAttribute('data-running', 'false'); expect(await allPaused(hero)).toBe(true);
  await page.evaluate(() => scrollTo(0, 0)); await expect(hero).toHaveAttribute('data-running', 'true');
  const otherTab = await context.newPage();
  try {
    await otherTab.goto('about:blank'); await otherTab.bringToFront(); await page.waitForTimeout(200);
    const hidden = await page.evaluate(() => document.hidden);
    testInfo.annotations.push({ type: '별도 탭 환경 관찰', description: `실제 새 탭 뒤 document.hidden=${hidden}; false이면 숨김 동작 성공 증거로 계산하지 않음.` });
    if (hidden) { await expect(hero).toHaveAttribute('data-running', 'false'); expect(await allPaused(hero)).toBe(true); }
  } finally { await otherTab.close(); await page.bringToFront(); }
  await page.emulateMedia({ reducedMotion: 'reduce' }); await expect(hero).toHaveAttribute('data-auto-running', 'false');
  await page.reload({ waitUntil: 'load' }); await expectSingleHero(hero, 'butter'); await expect(hero).toHaveAttribute('data-auto-running', 'false'); expect(await allPaused(hero)).toBe(true);
  await page.waitForTimeout(7_250); expect(await currentSlug(hero)).toBe('butter');
  await step(hero, 'next', 'oneandonly', 'Enter'); expect(await allPaused(hero)).toBe(true);
  const navigation = page.locator('header nav[aria-label="사이트"]'); const menuToggle = page.locator('[data-nav-toggle]');
  if (page.viewportSize()!.width <= 767.98) {
    await expect(menuToggle).toBeVisible(); await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
    await menuToggle.focus(); await menuToggle.press('Enter');
    const menu = page.getByRole('dialog', { name: '사이트 메뉴', exact: true }); const close = menu.locator('[data-nav-close]');
    await expect(menu).toBeVisible(); await expect(menu).toHaveAttribute('aria-modal', 'true'); await expect(menuToggle).toHaveAttribute('aria-expanded', 'true'); await expect(close).toBeFocused();
    const bounds = (await menu.boundingBox())!;
    near(bounds.x, 0, '전체 화면 메뉴 x'); near(bounds.y, 0, '전체 화면 메뉴 y');
    near(bounds.width, page.viewportSize()!.width, '전체 화면 메뉴 width'); near(bounds.height, page.viewportSize()!.height, '전체 화면 메뉴 height');
    const links = menu.locator('a[href]');
    expect(await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')))).toEqual(['/#works', '/tools/', '/#info']);
    const linkRows = await links.evaluateAll((nodes) => nodes.map((node) => {
      const r = node.getBoundingClientRect(); const css = getComputedStyle(node);
      return { y: r.y, height: r.height, centerX: r.x + r.width / 2, font: parseFloat(css.fontSize), line: parseFloat(css.lineHeight) };
    }));
    for (const row of linkRows) { near(row.height, 54, '모바일 메뉴 행 높이'); near(row.font, 24, '모바일 메뉴 font', .1); near(row.line, 24, '모바일 메뉴 line-height', .1); near(row.centerX, bounds.width / 2, '모바일 메뉴 가로 중앙'); }
    near((linkRows[0].y + linkRows[2].y + linkRows[2].height) / 2, bounds.height / 2, '모바일 메뉴 묶음 세로 중앙');
    for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab']) { await page.keyboard.press(key); expect(await menu.evaluate((node) => node.contains(document.activeElement))).toBe(true); }
    await page.keyboard.press('Escape'); await expect(menu).toBeHidden(); await expect(menuToggle).toHaveAttribute('aria-expanded', 'false'); await expect(menuToggle).toBeFocused();
    await menuToggle.click(); await close.click(); await expect(menu).toBeHidden(); await expect(menuToggle).toBeFocused();
    await menuToggle.click(); await menu.locator('a[href="/#works"]').click(); await expect(menu).toBeHidden();
  } else {
    await expect(menuToggle).toBeHidden(); await expect(navigation.locator('a[href="/#works"]')).toBeVisible(); await navigation.locator('a[href="/#works"]').click();
  }
  expect(new URL(page.url()).hash).toBe('#works'); await expect(page.locator('#works-title')).toBeInViewport();
});

test('A-3. JavaScript 없이 단일 기본 Hero·3작품/기술4 링크·기본 비율·직접 메뉴 접근', async ({ browser, baseURL }, testInfo) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: testInfo.project.use.viewport, isMobile: testInfo.project.use.isMobile, hasTouch: testInfo.project.use.hasTouch, locale: 'ko-KR' });
  try {
    const page = await context.newPage(); const hero = await openHome(page);
    await expectSingleHero(hero, 'butter'); expect(await allPaused(hero)).toBe(true);
    await expect(hero.locator('[data-showcase-controls]')).toBeHidden(); await expect(hero.getByRole('button')).toHaveCount(0);
    await expect(hero.locator('#home-title')).toHaveText(SITE.name); await expect(hero.locator('.hero-copy > p')).toHaveText(SITE.job);
    await expect(hero.locator('[data-showcase-open]')).toBeVisible();
    const navigation = page.locator('header nav[aria-label="사이트"]');
    await expect(page.locator('[data-nav-toggle]')).toBeHidden();
    for (const href of ['/#works', '/tools/', '/#info']) await expect(navigation.locator(`a[href="${href}"]`)).toBeVisible();
    await expect(page.locator(`.home-intro a[href="mailto:${CONTACT_EMAIL}"]`)).toBeVisible();
    await hero.locator('[data-showcase-open]').focus();
    for (let index = 0; index < 5; index++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('[data-showcase-controls]')), '숨긴 JS 조작으로 포커스가 가지 않음').toBe(false); }
    await expectGallery(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  } finally { await context.close(); }
});
