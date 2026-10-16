/**
 * 전체 리빌딩의 내용·행동 계약. 구판 사다리꼴/고정 무대/길이 예산을 가져오지 않는다.
 * YouTube 응답은 스텁이다. 로컬 MP4는 실제 로드·재생 진행을 검사하며 YouTube 서비스 재생 검수는 별도다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test as base, expect, type BrowserContext, type Locator, type Page, type TestInfo } from '@playwright/test';
import { applyEdits } from '../src/data/edits';
import { CASE_STUDIES, type CaseStudy } from '../src/data/case-studies';
import { DECISION_STORIES } from '../src/data/decision-stories';
import { SCRIPTS } from '../src/data/scripts';
import { PAGES } from '../src/data/pages';
import { heroLine } from '../src/data/room';
import { WORKS as SITE_WORKS } from '../src/data/works';
import { ANALYSIS_ROOT, CONTEST_WORDS_KO, CONTEST_WORD_OYE, FORBIDDEN_WORDS, MAIN_WORKS, TOOL_WORKS, WORKS, YT_URL } from './helpers';

const EMAIL = 'wheniwasy0ung@naver.com';
const ROUTES = ['/', ...MAIN_WORKS.map((work) => `/works/${work.slug}/`), '/tools/'];
const WORK_URLS = WORKS.map((work) => work.group === 'main' ? `/works/${work.slug}/` : `/tools/#${work.slug}`).sort();
const norm = (text: string) => text.normalize('NFC').replace(/\s+/g, ' ').trim();
const parsedPath = (url: string) => { const u = new URL(url, 'http://portfolio.local'); return u.pathname + u.hash; };

// Subjects were selected by the author; context spans follow the original scene paragraphs.
// The expected counts are independent of the rendered markup.
const CONTEXT_LENGTHS: Record<string, number> = { oneandonly: 17, firstimpression: 8, butter: 20 };
const PANEL_LENGTHS: Record<string, number> = { oneandonly: 1, firstimpression: 1, butter: 2 };
const STUDY_SUBJECTS: Record<string, RegExp[]> = {
  oneandonly: [/신분/, /얼굴/],
  firstimpression: [/변장/, /키스/, /문신/],
  butter: [/세계|붕괴/, /고백/],
};
const authoredLines = (slug: string) => CASE_STUDIES[slug].script.lines.map((line) => applyEdits(slug, line.s));

function expectStudySource(slug: string) {
  const study = CASE_STUDIES[slug];
  const expected = authoredLines(slug);
  expect(expected.length, `${slug}: 사용자가 선택한 전체 문맥`).toBe(CONTEXT_LENGTHS[slug]);
  const source = applyEdits(slug, fs.readFileSync(path.join(ANALYSIS_ROOT, study.script.src), 'utf8'));
  for (const line of expected) expect(norm(source), `${slug}: 원문 파일에 없는 문장 ${line.slice(0, 60)}`).toContain(norm(line));
  // This PDF extraction retains actor/name newlines and a trailing authored space exactly.
  if (slug === 'butter') expect(expected.join('\n') + '\n', 'PDF 5쪽 정본의 모든 문자·공백·줄바꿈').toBe(source);
  expect(study.script.focus.length).toBeGreaterThan(0);
  expect(study.script.focus.length).toBeLessThan(expected.length);
  expect(new Set(study.script.focus).size).toBe(study.script.focus.length);
  for (const index of study.script.focus) {
    expect(Number.isInteger(index)).toBe(true);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(expected.length);
  }
  for (const subject of STUDY_SUBJECTS[slug]) expect(study.title + ' ' + study.summary).toMatch(subject);
  return study;
}

async function expectNoPrivateResearch(page: Page, study: CaseStudy) {
  const html = await page.content();
  const publicText = await page.evaluate(() => {
    const body = document.body.textContent ?? '';
    const labels = [...document.querySelectorAll('[alt], [aria-label], meta[content]')]
      .map((node) => [node.getAttribute('alt'), node.getAttribute('aria-label'), node.getAttribute('content')].filter(Boolean).join(' '));
    return [body, ...labels].join('\n');
  });
  for (const text of [...study.basis, ...study.choices.map((choice) => choice.basis)]) {
    if (text) expect(html, '내부 근거 문장 비노출').not.toContain(text);
  }
  expect(publicText).not.toMatch(/결정로그|프롬프트|\b[A-Za-z]:[\\/](?![\\/])/);
  for (const pattern of FORBIDDEN_WORDS) expect(publicText).not.toMatch(pattern);
  for (const word of CONTEST_WORDS_KO) expect(publicText).not.toContain(word);
  expect(publicText).not.toMatch(CONTEST_WORD_OYE);
  await expect(page.locator('[data-basis], [data-study-basis]')).toHaveCount(0);
}

async function expectContextFocus(container: Locator, expected: string[], focus: number[]) {
  const rows = container.locator(':scope > p[data-src]');
  expect(await rows.allTextContents(), '문맥 전체의 문자·공백·순서').toEqual(expected);
  const styles = await rows.evaluateAll((nodes) => nodes.map((node, index) => {
    const css = getComputedStyle(node);
    const ink = node.querySelector<HTMLElement>('[data-script-dialogue], [data-script-action]') || node;
    return { index, focused: node.hasAttribute('data-script-focus'), color: css.color, weight: Number(getComputedStyle(ink).fontWeight), scene: node.hasAttribute('data-script-scene') };
  }));
  expect(styles.filter((row) => row.focused).map((row) => row.index), '선택 문단 전체만 강조').toEqual(focus);
  const surrounding = styles.filter((row) => !row.focused && !row.scene);
  expect(surrounding.length, '강조 옆의 읽을 수 있는 문맥').toBeGreaterThan(0);
  for (const row of styles.filter((row) => row.focused)) {
    expect(row.weight, `강조 문단 ${row.index}`).toBeGreaterThanOrEqual(700);
    for (const context of surrounding) expect(row.color, '주변 문맥과 중심 문단의 잉크 구분').not.toBe(context.color);
  }
  for (const row of surrounding) expect(row.weight, `주변 문단 ${row.index}`).toBeLessThan(700);
}

const studyImages = (slug: string) => [
  ...(DECISION_STORIES[slug].before.images ?? []),
  ...(DECISION_STORIES[slug].after.images ?? []),
  ...CASE_STUDIES[slug].material.images,
];

async function revealContainingDetails(control: Locator) {
  for (const details of await control.locator('xpath=ancestor::details').all()) {
    if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open))) await details.locator(':scope > summary').click();
  }
}

/** Default evidence explains problem -> revision -> result; screenplay is supplementary. */
async function expectEvidencePanels(process: Locator, study: CaseStudy, slug: string) {
  const story = DECISION_STORIES[slug];
  await expect(process.locator('.decision-question')).toHaveText(story.question);
  const overview = process.getByRole('navigation', { name: '제작 과정의 흐름', exact: true });
  await expect(overview).toBeVisible();
  expect(await overview.locator('a[href]').evaluateAll((links) => links.map((link) => link.getAttribute('href')))).toEqual(['#decision-problem', '#decision-change', '#decision-result']);
  const stages = process.locator('[data-decision-stage]');
  await expect(stages).toHaveCount(3);
  expect(await stages.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-decision-stage')))).toEqual(['1', '2', '3']);
  for (const [index, data] of [story.before, story.after].entries()) {
    const stage = stages.nth(index);
    await expect(stage).toHaveAttribute('id', index === 0 ? 'decision-problem' : 'decision-change');
    await expect(stage.getByRole('heading', { name: data.title, exact: true })).toBeVisible();
    await expect(stage.locator('.decision-body')).toHaveText(data.body);
    const images = stage.locator('[data-production-image] img');
    await expect(images).toHaveCount(data.images?.length ?? 0);
    const document = stage.locator('[data-production-document]');
    await expect(document).toHaveCount(data.document ? 1 : 0);
    expect((data.images?.length ?? 0) + (data.document ? 1 : 0), '각 판단에 실제 이미지 또는 제작 문서 근거가 있음').toBeGreaterThan(0);
    for (const [imageIndex, source] of (data.images ?? []).entries()) {
      const image = images.nth(imageIndex);
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute('src', source.img);
      await expect(image).toHaveAttribute('width', String(source.w));
      await expect(image).toHaveAttribute('height', String(source.h));
      expect(await image.evaluate((node) => !node.closest('details')), '판단의 고유 제작 이미지는 기본 노출').toBe(true);
    }
    if (data.document) {
      await expect(document).toBeVisible();
      expect(await document.evaluate((node) => !node.closest('details')), '제작 문서는 기본 노출').toBe(true);
      await expect(document.locator(':scope > figcaption')).toHaveText(data.document.title);
      expect(await document.locator('.production-document-text').allTextContents(), '공개 제작 문서 발췌의 문자·공백·순서').toEqual(data.document.paragraphs ?? []);
      if (data.document.rows) {
        expect(await document.locator('tbody tr').evaluateAll((rows) => rows.map((row) => [...row.children].map((cell) => cell.textContent)))).toEqual(data.document.rows);
      }
    }
  }
  const result = stages.nth(2);
  await expect(result).toHaveAttribute('id', 'decision-result');
  await expect(result.locator('#decision-result-title')).toHaveText(story.resultLabel);
  await expect(result.locator(':scope > header .decision-body')).toHaveText(story.outcome);
  await expect(process.locator('[data-study-choice], [data-choice-seek]')).toHaveCount(0);

  expect(study.panels.length, '완성 타임라인의 발췌 구간 수').toBe(PANEL_LENGTHS[slug]);
  const panels = result.locator('[data-evidence-panel]');
  await expect(panels).toHaveCount(PANEL_LENGTHS[slug]);
  expect(new Set(study.panels.map((panel) => panel.id)).size).toBe(study.panels.length);
  for (let index = 0; index < study.panels.length; index++) {
    const panelData = study.panels[index];
    const panel = panels.nth(index);
    await expect(panel).toHaveAttribute('data-evidence-panel', panelData.id);
    await expect(panel.getByRole('heading', { name: panelData.title, exact: true })).toBeVisible();
    const video = panel.locator('[data-process-video]');
    await expect(video).toHaveCount(1);
    await expect(video).toBeVisible();
    expect(await video.evaluate((node) => !node.closest('details')), '완성 장면은 대본을 열지 않고 재생 가능').toBe(true);
    expect(Number.isInteger(panelData.contextStart) && Number.isInteger(panelData.contextEnd)).toBe(true);
    expect(panelData.contextStart).toBeGreaterThanOrEqual(0);
    expect(panelData.contextEnd).toBeLessThanOrEqual(study.script.lines.length);
    const expected = authoredLines(slug).slice(panelData.contextStart, panelData.contextEnd);
    expect(expected.length, '보충 발췌도 연속 원문 문맥 다섯 문단 이상').toBeGreaterThanOrEqual(5);
    const focus = (panelData.focus ?? study.script.focus)
      .filter((position) => position >= panelData.contextStart && position < panelData.contextEnd)
      .map((position) => position - panelData.contextStart);
    expect(focus.length, '보여 주는 문맥 안의 중심 대목').toBeGreaterThan(0);
    const excerpt = panel.locator('[data-process-excerpt]');
    await expect(excerpt).toHaveCount(1);
    const details = panel.locator('details:has([data-process-excerpt])');
    await expect(details).toHaveCount(1);
    await expect(details).toHaveJSProperty('open', false);
    await expect(excerpt).toBeHidden();
    const summary = details.locator(':scope > summary');
    await expect(summary).toBeVisible();
    await summary.click();
    await expect(excerpt).toBeVisible();
    await expectContextFocus(excerpt, expected, focus);
    await expectScriptDocument(excerpt);
    for (const source of await excerpt.locator('p[data-src]').evaluateAll((rows) => rows.map((row) => row.getAttribute('data-src')))) expect(source).toBe(study.script.src);
    await summary.click();
    await expect(details).toHaveJSProperty('open', false);
  }
  const reader = process.locator('[data-script-reader]');
  await expect(reader).toHaveCount(1);
  const order = await process.evaluate((node) => {
    const panels = [...node.querySelectorAll('[data-evidence-panel]')];
    const reader = node.querySelector('[data-script-reader]')!;
    const material = node.querySelector('.process-study-material');
    return panels.every((panel) => !!(panel.compareDocumentPosition(reader) & Node.DOCUMENT_POSITION_FOLLOWING))
      && (!material || !!(reader.compareDocumentPosition(material) & Node.DOCUMENT_POSITION_FOLLOWING));
  });
  expect(order, '기본 완성 타임라인 뒤 전체 원문 읽기, 그 뒤 보충 자료').toBe(true);
}

async function expectHookContext(hook: Locator, slug: string) {
  const work = SITE_WORKS.find((item) => item.slug === slug)!;
  const firstClipLine = slug === 'firstimpression' ? work.hook!.lines.find((item) => {
    const line = PAGES[slug].lines[item.i];
    return !item.ghost && !item.pre && (line?.t === 'act' || line?.t === 'dia');
  }) : undefined;
  if (slug === 'firstimpression') expect(firstClipLine?.i, '후킹 클립과 같은 S#3 첫 지문').toBe(9);
  const opening = slug === 'firstimpression' ? PAGES[slug].lines[firstClipLine!.i] : heroLine(slug)!;
  await expect(hook.locator('[data-story-line] [data-src]')).toHaveCount(1);
  expect(await hook.locator('[data-story-line] [data-src]').textContent(), '후킹 선택 원문 완전 보존').toBe(applyEdits(slug, opening.s));
  const context = hook.locator('[data-story-context]');
  await expect(context).toHaveCount(1);
  const rows = await context.locator(':scope > *').evaluateAll((nodes) => nodes.map((node) => {
    const canonical = node.matches('[data-src]') ? node : node.querySelector('[data-story-line] [data-src]');
    const ink = node.querySelector('[data-story-typed], [data-script-dialogue], [data-script-action]') || node;
    return { text: canonical?.textContent ?? null, focused: node.hasAttribute('data-script-focus'), weight: Number(getComputedStyle(ink).fontWeight), color: getComputedStyle(ink).color };
  }));
  expect(rows.length, '씬 머리글을 제외한 후킹 본문 다섯 문단 이상').toBeGreaterThanOrEqual(5);
  expect(rows.every((row) => row.text !== null)).toBe(true);
  const sourceLines = slug === 'firstimpression' ? PAGES[slug].lines : SCRIPTS[slug];
  let previous = -1;
  for (const row of rows) {
    const index = sourceLines.findIndex((line, index) => {
      if (index <= previous || line.t === 'scene') return false;
      const text = row.focused ? line.s : line.t === 'dia' && line.who && !line.s.startsWith(line.who) ? line.who + line.s : line.s;
      return applyEdits(slug, text) === row.text;
    });
    expect(index, '후킹 문맥도 원문 문단을 통째로 사용').toBeGreaterThanOrEqual(0);
    if (previous >= 0) expect(index, '씬 안의 문맥 문단 순서·연속성').toBe(previous + 1);
    previous = index;
  }
  const focused = rows.filter((row) => row.focused);
  expect(focused).toHaveLength(1);
  expect(focused[0].text).toBe(applyEdits(slug, opening.s));
  expect(focused[0].weight).toBeGreaterThanOrEqual(700);
  for (const row of rows.filter((row) => !row.focused)) {
    expect(row.weight).toBeLessThan(700);
    expect(row.color).not.toBe(focused[0].color);
  }
  const original = norm(applyEdits(slug, fs.readFileSync(path.join(ANALYSIS_ROOT, PAGES[slug].src), 'utf8')));
  for (const row of rows) expect(original, '후킹 문단의 원문 파일 근거').toContain(norm(row.text!));
  if (slug === 'firstimpression') {
    expect(await hook.locator(':scope > .story-copy > [data-script-document] p[data-script-scene]').textContent()).toBe(PAGES[slug].lines[8].s);
    expect(work.hook!.label).toContain('S#3');
  }
}

async function expectNativeScene(scene: Locator, sceneData: CaseStudy['scene']) {
  const video = scene.locator('video[data-process-video]');
  await expect(video).toHaveCount(1);
  await expect(video).toHaveAttribute('src', sceneData.clip);
  await expect(video).toHaveAttribute('poster', sceneData.poster);
  await expect(video).toHaveJSProperty('controls', true);
  await expect(video).toHaveJSProperty('playsInline', true);
  await expect(video).toHaveJSProperty('autoplay', false);
  await expect(video).toHaveJSProperty('loop', false);
  await expect(video).toHaveAttribute('aria-label', /완성 장면/);
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).readyState), { timeout: 15_000, message: '장면 클립의 실제 metadata 로드' }).toBeGreaterThanOrEqual(1);
  const media = await video.evaluate((node) => {
    const v = node as HTMLVideoElement;
    const r = v.getBoundingClientRect();
    return { duration: v.duration, width: v.videoWidth, height: v.videoHeight, currentSrc: new URL(v.currentSrc).pathname, rendered: r.width / r.height };
  });
  expect(media.currentSrc).toBe(sceneData.clip);
  expect(media.width).toBe(sceneData.w);
  expect(media.height).toBe(sceneData.h);
  expect(Math.abs(media.duration - (sceneData.end - sceneData.start)), '추출 구간의 실제 길이').toBeLessThanOrEqual(.15);
  expect(Math.abs(media.rendered / (media.width / media.height) - 1), '완성 장면의 비율 보존').toBeLessThanOrEqual(.02);
  expect(Number(await scene.getAttribute('data-scene-start'))).toBe(sceneData.start);
  expect(Number(await scene.getAttribute('data-scene-end'))).toBe(sceneData.end);
  const buttons = scene.locator('[data-process-seek]');
  expect(await buttons.count()).toBe(sceneData.beats.length);
  let previous = -Infinity;
  for (let index = 0; index < sceneData.beats.length; index++) {
    const beat = sceneData.beats[index];
    expect(beat.t).toBeGreaterThanOrEqual(sceneData.start);
    expect(beat.t).toBeLessThan(sceneData.end);
    expect(beat.t).toBeGreaterThanOrEqual(previous);
    previous = beat.t;
    expect(Number(await buttons.nth(index).getAttribute('data-process-seek'))).toBe(beat.t);
    await expect(buttons.nth(index)).toContainText(beat.label);
    expect((await buttons.nth(index).boundingBox())!.height, '장면 이동 버튼의 터치 영역').toBeGreaterThanOrEqual(44);
  }
  return video;
}

async function clickSceneBeat(button: Locator) {
  await button.scrollIntoViewIfNeeded();
  // Headless Edge debug captured a click reaching the newly attached YouTube OOPIF's
  // stale surface after a large immediate scroll, with no pointerdown on the page button.
  // Two rendered frames settle native hit-testing before the same real click; playback,
  // seek offsets and time-progress assertions remain unchanged.
  await button.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  }));
  await button.click();
}

async function expectSceneTimeProgress(video: Locator) {
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused), { message: '완성 장면 실제 재생' }).toBe(false);
  const before = await video.evaluate((node) => (node as HTMLVideoElement).currentTime);
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime), { message: '완성 장면 실제 시간 진행' }).toBeGreaterThan(before + .15);
}


async function stubYouTube(context: BrowserContext) {
  await context.route(YT_URL, (route) => route.fulfill({
    status: 200, contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><meta charset="utf-8"><title>YouTube network stub — not real playback</title>',
  }));
}
const test = base.extend<{ _youtubeNetworkStub: void }>({
  _youtubeNetworkStub: [async ({ context }, use, testInfo) => {
    await stubYouTube(context);
    testInfo.annotations.push({ type: '검수 한계', description: 'YouTube 네트워크 스텁: iframe 생성·URL·조작만 검증. 로컬 MP4는 실제 로드·시간 진행을 검증. YouTube 영상·음성 성공은 별도 브라우저 확인 필요.' });
    await use();
  }, { auto: true }],
});

async function open(page: Page, route: string) {
  const before = page.url();
  const response = await page.goto(route, { waitUntil: 'load' });
  if (response) expect(response.status(), route).toBe(200);
  else {
    // Same-document hash navigation legitimately has no HTTP response.
    expect(page.url().split('#')[0], route).toBe(before.split('#')[0]);
    expect(page.url(), route).toBe(new URL(route, page.url()).href);
  }
  await page.evaluate(() => document.fonts.ready);
}

async function nav(page: Page, openMenu = false) {
  const navigation = page.locator('header nav[aria-label="사이트"]');
  await expect(navigation).toHaveCount(1);
  await expect(navigation).toBeVisible();
  // Reading route destinations must not leave a mobile dialog over footer actions.
  // Explicit navigation callers open the real menu; visitor A2 covers its focus/Escape contract.
  if (openMenu && !(await navigation.locator('a[href="/#works"]').isVisible())) {
    const toggle = page.locator('header [data-nav-toggle]');
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(navigation.locator('#site-links')).toBeVisible();
  }
  return navigation;
}

async function visibleWorkURLs(page: Page) {
  const urls = await page.locator('#works a[href]').evaluateAll((links) => links
    .filter((link) => (link as HTMLElement).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }))
    .map((link) => { const u = new URL((link as HTMLAnchorElement).href); return u.pathname.startsWith('/works/') ? u.pathname : u.pathname + u.hash; })
    .filter((url) => /^\/works\//.test(url) || /^\/tools\/#/.test(url)));
  return [...new Set(urls)].sort();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

/** Offscreen material may lazy-load, but its layout/content must not await a scroll reveal. */
async function processVisibility(process: Locator) {
  return process.evaluate((section) => {
    const materials = [...section.querySelectorAll<HTMLElement>('img, [data-src], [data-production-document], [data-process-video]')].filter((node) => !node.closest('dialog, details:not([open])'));
    const problems: string[] = [];
    for (const material of materials) {
      const r = material.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) problems.push(`no reserved geometry: ${material.tagName}`);
      for (let node: Element | null = material; node && node !== section.parentElement; node = node.parentElement) {
        const css = getComputedStyle(node);
        if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) < 0.5) problems.push(`hidden material: ${material.tagName} via ${node.className}`);
        if (css.position === 'fixed' || css.position === 'sticky') problems.push(`pinned material: ${material.tagName}`);
        if (/blur\((?!0(?:px)?\))/.test(css.filter)) problems.push(`blurred material: ${material.tagName}`);
      }
    }
    return { count: materials.length, problems };
  });
}

/** Screenplay semantics and real columns; no particular paper color, shadow or font is required. */
async function expectScriptDocument(scope: Locator) {
  const result = await scope.evaluate((section) => {
    const documents = new Set<Element>(section.querySelectorAll('[data-script-document]'));
    const ancestor = section.closest('[data-script-document]');
    if (ancestor) documents.add(ancestor);
    const visibleDocuments = [...documents].filter((node) => node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }));
    const problems: string[] = [];
    const columns = new Map<Element, { speaker: number; dialogue: number }[]>();
    const speakers = [...section.querySelectorAll<HTMLElement>('p[data-src] [data-script-speaker]')].filter((node) => node.checkVisibility());
    for (const speaker of speakers) {
      const row = speaker.closest('p[data-src]')!;
      const dialogue = row.querySelector<HTMLElement>('[data-script-dialogue]');
      if (!dialogue) { problems.push('대사 본문 열 없음'); continue; }
      const nameBox = speaker.getBoundingClientRect();
      const textBox = dialogue.getBoundingClientRect();
      if (nameBox.width <= 0 || textBox.width <= 0) problems.push('대사 열의 읽을 공간 없음');
      if (nameBox.right > textBox.left + 1) problems.push('배우명과 대사 열 겹침');
      if (textBox.left <= nameBox.left) problems.push('배우명과 대사 열이 분리되지 않음');
      if (nameBox.bottom <= textBox.top || textBox.bottom <= nameBox.top) problems.push('배우명과 대사가 같은 행을 이루지 않음');
      const document = row.closest('[data-script-document]') || section;
      const list = columns.get(document) || [];
      list.push({ speaker: nameBox.left, dialogue: textBox.left });
      columns.set(document, list);
    }
    for (const rows of columns.values()) {
      if (Math.max(...rows.map((row) => row.speaker)) - Math.min(...rows.map((row) => row.speaker)) > 1) problems.push('배우명 열 정렬 불일치');
      if (Math.max(...rows.map((row) => row.dialogue)) - Math.min(...rows.map((row) => row.dialogue)) > 1) problems.push('대사 열 정렬 불일치');
    }
    return { documents: visibleDocuments.length, speakers: speakers.length, problems };
  });
  expect(result.documents, '사이트 본문과 구분되는 대본 문서 표식').toBeGreaterThan(0);
  expect(result.problems).toEqual([]);
  return result;
}

async function loadedImages(container: Locator) {
  // Supplementary sheets and full-scene text use native details. Open them through the UI.
  const closed = container.locator('details:not([open]) > summary');
  while (await closed.count()) await closed.first().click();
  const images = container.locator('img[src]');
  expect(await images.count()).toBeGreaterThan(0);
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0), { message: await image.getAttribute('src') ?? 'image' }).toBe(true);
    const shape = await image.evaluate((element) => {
      const node = element as HTMLImageElement;
      const box = node.getBoundingClientRect();
      const parent = node.closest('button, figure') ?? node.parentElement!;
      const boundary = parent.getBoundingClientRect();
      return { width: box.width, height: box.height, natural: node.naturalWidth / node.naturalHeight, fit: getComputedStyle(node).objectFit,
        contained: box.left >= boundary.left - 1 && box.right <= boundary.right + 1 && box.top >= boundary.top - 1 && box.bottom <= boundary.bottom + 1 };
    });
    expect(shape.width).toBeGreaterThan(0);
    expect(shape.height).toBeGreaterThan(0);
    expect(Math.abs(shape.width / shape.height / shape.natural - 1), '실제 이미지 상자의 원본 비율 보존').toBeLessThanOrEqual(0.02);
    expect(shape.contained, 'contain 선언뿐 아니라 이미지 상자 전체가 부모 경계 안에 존재').toBe(true);
  }
}

async function shot(page: Page, testInfo: TestInfo, name: string) {
  if (!process.env.QA_SHOTS_DIR) return;
  const hookFrames = page.locator('[data-story-frame]');
  if (await hookFrames.count()) {
    await expect.poll(() => hookFrames.evaluateAll((frames) => frames.every((frame) => getComputedStyle(frame).clipPath === 'none')), { timeout: 3_000, message: '후킹 화면이 열린 뒤 캡처' }).toBe(true);
  }
  const dir = path.join(process.env.QA_SHOTS_DIR, String(page.viewportSize()!.width));
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  await page.screenshot({ path: file });
  await testInfo.attach(name, { path: file, contentType: 'image/png' });
}

async function expectLocalFilm(container: Locator, localSrc: string, ratio: number) {
  const video = container.locator('video');
  await expect(container.locator('iframe')).toHaveCount(0);
  await expect(video).toHaveCount(1);
  await expect(video).toBeVisible();
  expect(await video.evaluate((node) => new URL((node as HTMLVideoElement).currentSrc || (node as HTMLVideoElement).src).pathname)).toBe(localSrc);
  await expect(video).toHaveJSProperty('controls', true);
  await expect(video).toHaveJSProperty('playsInline', true);
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).readyState), { timeout: 15_000, message: '로컬 완성본 실제 로드' }).toBeGreaterThanOrEqual(2);
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(false);
  const bounds = (await video.boundingBox())!;
  expect(Math.abs(bounds.width / bounds.height / ratio - 1), 'local film aspect ratio').toBeLessThanOrEqual(0.02);
  const before = await video.evaluate((node) => (node as HTMLVideoElement).currentTime);
  await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).currentTime), { message: '로컬 영상 실제 시간 진행' }).toBeGreaterThan(before + .15);
}

async function expectFilm(root: Locator, yt: string, start?: number) {
  const ratio = (await root.getAttribute('data-ratio')) === '9:16' ? 9 / 16 : 16 / 9;
  const localSrc = await root.getAttribute('data-local-src');
  if (localSrc) {
    await expectLocalFilm(root, localSrc, ratio);
    if (start !== undefined) {
      const time = await root.locator('video').evaluate((node) => (node as HTMLVideoElement).currentTime);
      expect(time, '로컬 풀영상의 절대 시작 시각').toBeGreaterThanOrEqual(start - .15);
      expect(time).toBeLessThanOrEqual(start + 2.5);
    }
    return;
  }
  const iframe = root.locator('iframe');
  await expect(root.locator('video')).toHaveCount(0);
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toBeVisible();
  const bounds = (await iframe.boundingBox())!;
  expect(Math.abs(bounds.width / bounds.height / ratio - 1), 'film aspect ratio').toBeLessThanOrEqual(0.02);
  const src = await iframe.getAttribute('src');
  expect(src).toMatch(new RegExp(`^https://www\\.youtube-nocookie\\.com/embed/${yt}(?:\\?|$)`));
  if (start !== undefined) expect(new URL(src!).searchParams.get('start')).toBe(String(Math.floor(start)));
}

test.describe('전체 리빌딩 — ALT 구조 + Josh 편의 조작', () => {
  test('R-1. 홈·3상세·기술4·공통 메뉴·연락·반응형·실행 오류', async ({ page, context }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    for (const route of ROUTES) {
      await open(page, route);
      await expect(page.locator('body')).toHaveAttribute('data-page', route === '/' ? 'home' : route === '/tools/' ? 'tools' : 'work');
      await expect(page.locator('header a[href="/"]')).toContainText('김영건');
      if (route.startsWith('/works/')) {
        const slug = route.split('/')[2];
        await expect(page.locator('[data-role]')).toHaveText(CASE_STUDIES[slug].role);
      }
      const navigation = await nav(page);
      const destinations = (await navigation.locator('a[href]').evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href))).map(parsedPath);
      for (const expected of ['/#works', '/tools/', '/#info']) expect(destinations).toContain(expected);
      const email = page.locator(`a[href="mailto:${EMAIL}"]`).filter({ visible: true });
      expect(await email.count()).toBeGreaterThan(0);
      const copy = page.locator('[data-copy]').filter({ visible: true }).first();
      await expect(copy).toBeVisible();
      expect((await copy.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await copy.click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(EMAIL);
      const feedback = await page.locator('[aria-live], [role="status"], [data-copy]').allTextContents();
      expect(feedback.join(' ')).toMatch(/복사/);
      await noOverflow(page);
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, testInfo, `route_${route.replace(/\W+/g, '_') || 'home'}`);
    }
    expect(errors).toEqual([]);
  });

  test('R-2. 7작품 목록·미리보기 전환·실제 hidden·URL 상태·키보드 선택', async ({ page }, testInfo) => {
    await open(page, '/#works');
    const previews = page.locator('[data-view-choice="previews"]');
    const index = page.locator('[data-view-choice="index"]');
    await expect(previews).toHaveAttribute('aria-pressed', 'true');
    expect(await visibleWorkURLs(page)).toEqual(WORK_URLS);
    await index.focus();
    await index.press('Enter');
    await expect(index).toHaveAttribute('aria-pressed', 'true');
    await expect(previews).toHaveAttribute('aria-pressed', 'false');
    expect(new URL(page.url()).searchParams.get('view')).toBe('index');
    expect(await visibleWorkURLs(page)).toEqual(WORK_URLS);
    expect(await page.locator('#works [hidden]').count()).toBeGreaterThan(0);
    await shot(page, testInfo, 'home_index');
    await page.reload({ waitUntil: 'load' });
    await expect(index).toHaveAttribute('aria-pressed', 'true');
    expect(await visibleWorkURLs(page)).toEqual(WORK_URLS);
    await previews.click();
    await expect(previews).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).searchParams.get('view')).not.toBe('index');
    expect(await visibleWorkURLs(page)).toEqual(WORK_URLS);
    await shot(page, testInfo, 'home_previews');
  });

  test('R-3. 후킹→풀영상→문제·판단·완성 과정·보충 원문·제작 근거·기본 휠', async ({ page }, testInfo) => {
    for (const work of MAIN_WORKS) {
      const study = expectStudySource(work.slug);
      await open(page, `/works/${work.slug}/`);
      const hook = page.locator('section[data-story-hook]');
      const full = page.locator('section[data-full-film]');
      const process = page.locator('section[data-process-case]');
      await expect(hook).toHaveCount(1);
      await expect(full).toHaveCount(1);
      await expect(process).toHaveCount(1);
      await expectScriptDocument(hook);
      await expectHookContext(hook, work.slug);
      await expect(process.locator('#process-case-title')).toHaveText(study.title);
      await expect(process.locator('[data-study-role]')).toHaveText(study.role);
      expect(study.choices.length).toBeGreaterThanOrEqual(2);
      await expectEvidencePanels(process, study, work.slug);
      const readerDetails = process.locator('details:has([data-script-reader])');
      await expect(readerDetails).toHaveJSProperty('open', false);
      await readerDetails.locator(':scope > summary').click();
      const reader = process.locator('[data-script-reader]');
      await expect(reader).toBeVisible();
      expect(await reader.locator('p[data-src]').allTextContents(), '보충 전체 원문의 문자·공백·순서').toEqual(authoredLines(work.slug));
      await expect(reader.locator('[data-script-focus]')).toHaveCount(0);
      await expectScriptDocument(reader);
      await readerDetails.locator(':scope > summary').click();
      const resultJump = process.getByRole('navigation', { name: '제작 과정의 흐름', exact: true }).locator('a[href="#decision-result"]');
      await resultJump.click();
      expect(new URL(page.url()).hash).toBe('#decision-result');
      await expect(process.locator('#decision-result-title')).toBeInViewport();
      await expect(process.locator('[data-process-video]').first()).toBeInViewport({ ratio: .25 });
      const flow = await page.evaluate(() => {
        const elements = ['[data-story-hook]', '[data-full-film]', '[data-process-case]'].map((selector) => document.querySelector(selector)!);
        return { dom: elements.slice(1).every((node, i) => !!(elements[i].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)), y: elements.map((node) => node.getBoundingClientRect().top + scrollY) };
      });
      expect(flow.dom).toBe(true);
      expect(flow.y[0]).toBeLessThan(flow.y[1]);
      expect(flow.y[1]).toBeLessThan(flow.y[2]);
      const visibility = await processVisibility(process);
      expect(visibility.count).toBeGreaterThan(0);
      expect(visibility.problems).toEqual([]);
      expect(await process.locator('.pin-spacer, [data-cut5], [data-stage]').count()).toBe(0);
      expect(await process.locator('[data-enlarge-src]').count()).toBe(studyImages(work.slug).length);
      expect(await process.locator('[data-enlarge-src]').evaluateAll((buttons) => buttons.map((button) => button.getAttribute('data-enlarge-src'))), '판단의 고유 이미지와 보충 자료의 실제 경로·순서').toEqual(studyImages(work.slug).map((image) => image.img));
      expect(await process.locator('.process-study-material img[src]').evaluateAll((images) => images.map((image) => image.getAttribute('src'))), '선택 사례의 보충 제작 자료').toEqual(study.material.images.map((image) => image.img));
      const scenes = process.locator('[data-evidence-panel] section[data-scene-start][data-scene-end]');
      await expect(scenes).toHaveCount(study.panels.length);
      await expectNoPrivateResearch(page, study);
      await hook.evaluate((section) => section.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
      await shot(page, testInfo, `${work.slug}_hook`);
      await full.scrollIntoViewIfNeeded();
      await shot(page, testInfo, `${work.slug}_full_film`);
      await process.evaluate((section) => section.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
      const before = await page.evaluate(() => scrollY);
      await page.mouse.move(8, page.viewportSize()!.height / 2);
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(500);
      expect(Math.abs(await page.evaluate(() => scrollY) - before - 100)).toBeLessThanOrEqual(10);
      if (studyImages(work.slug).length) await loadedImages(process);
      await noOverflow(page);
      const opened = process.locator('details[open] > summary');
      while (await opened.count()) await opened.first().click();
      await process.evaluate((section) => section.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
      await shot(page, testInfo, `${work.slug}_process_origin`);
      const materials = process.locator('.process-study-material');
      if (study.material.images.length) {
        await process.locator('details:has(.process-study-material) > summary').click();
        await materials.evaluate((section) => section.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
        await shot(page, testInfo, `${work.slug}_process_material`);
        await process.locator('details:has(.process-study-material) > summary').click();
      }
      for (let index = 0; index < study.panels.length; index++) {
        await scenes.nth(index).evaluate((section) => section.scrollIntoView({ block: 'start', behavior: 'instant' as ScrollBehavior }));
        await shot(page, testInfo, `${work.slug}_process_scene_frame${index ? '_' + study.panels[index].id : ''}`);
      }
    }
  });

  test('R-4. 7편 인페이지 플레이어·로컬 실제 재생·장면 시각·크게 보기·닫기 후 정지', async ({ page }) => {
    for (const work of WORKS) {
      await open(page, work.group === 'main' ? `/works/${work.slug}/` : `/tools/#${work.slug}`);
      const film = work.group === 'main' ? page.locator('[data-full-film] [data-film-root]') : page.locator(`#${work.slug} [data-film-root]`);
      await expect(film).toHaveCount(1);
      await expect(film).toHaveAttribute('data-ratio', work.ratio);
      const url = page.url();
      const tabs = page.context().pages().length;
      await film.locator('[data-film-play]').first().click();
      await expectFilm(film, work.yt);
      expect(page.url()).toBe(url);
      expect(page.context().pages().length).toBe(tabs);
      if (work.slug === 'kinetic') {
        const localSrc = await film.getAttribute('data-local-src');
        expect(localSrc).toBe('/media/full_kinetic.mp4');
        const inlineVideo = await film.locator('video').elementHandle();
        const large = film.locator('[data-film-large]');
        await large.click();
        await expect.poll(() => inlineVideo!.evaluate((node) => (node as HTMLVideoElement).paused), { message: '크게 보기로 전환하면 기존 영상 정지' }).toBe(true);
        const dialog = page.locator('dialog[data-media-dialog]');
        await expect(dialog).toBeVisible();
        await expectLocalFilm(dialog, localSrc!, 16 / 9);
        const modalVideo = await dialog.locator('video').elementHandle();
        await dialog.locator('[data-media-close]').click();
        await expect(dialog).not.toBeVisible();
        await expect(dialog.locator('video')).toHaveCount(0);
        await expect.poll(() => modalVideo!.evaluate((node) => (node as HTMLVideoElement).paused), { message: '닫은 로컬 모달 영상 정지' }).toBe(true);
        await expect(large).toBeFocused();
        await inlineVideo?.dispose();
        await modalVideo?.dispose();
      }
    }
    for (const work of MAIN_WORKS) {
      const study = CASE_STUDIES[work.slug];
      await open(page, `/works/${work.slug}/`);
      const process = page.locator('[data-process-case]');
      const allScenes = process.locator('[data-process-video]');
      const film = page.locator('[data-full-film] [data-film-root]');
      const hook = page.locator('[data-story-video]');
      for (const panelData of study.panels) {
        const panel = process.locator(`[data-evidence-panel="${panelData.id}"]`);
        const scene = panel.locator('section[data-scene-start][data-scene-end]');
        const video = await expectNativeScene(scene, panelData.scene);
        await expect(video).toHaveJSProperty('paused', true);
        // A full film stops when this native completed passage starts.
        await film.locator('[data-film-play]').first().click();
        await expectFilm(film, work.yt);
        for (let index = 0; index < panelData.scene.beats.length; index++) {
          const beat = panelData.scene.beats[index];
          await clickSceneBeat(scene.locator('[data-process-seek]').nth(index));
          const target = beat.t - panelData.scene.start;
          await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).seeking), { message: `${work.slug}/${panelData.id}: 장면 탐색 완료` }).toBe(false);
          const time = await video.evaluate((node) => (node as HTMLVideoElement).currentTime);
          expect(time, `${work.slug}/${panelData.id}: 절대 시각에서 클립 시작을 뺀 위치`).toBeGreaterThanOrEqual(Math.max(0, target - .15));
          expect(time, `${work.slug}/${panelData.id}: 잘못된 절대 시각 직접 대입 방지`).toBeLessThanOrEqual(target + 1.5);
          await expectSceneTimeProgress(video);
          await expect(film.locator('iframe, video')).toHaveCount(0);
          await expect(film.locator('.film-poster')).toBeVisible();
          await expect(hook).toHaveJSProperty('paused', true);
          expect(await allScenes.evaluateAll((nodes) => nodes.filter((node) => !(node as HTMLVideoElement).paused).length), '동시에 한 완성 장면만 재생').toBe(1);
          await video.evaluate((node) => (node as HTMLVideoElement).pause());
        }
        // The single result timeline retains its beat controls; duplicate choice UI was removed.
        await clickSceneBeat(scene.locator('[data-process-seek]').first());
        await expectSceneTimeProgress(video);
        const start = scene.locator('[data-film-start]');
        await expect(start).toHaveCount(1);
        expect(Number(await start.getAttribute('data-film-start'))).toBe(panelData.scene.start);
        await start.click();
        await expectFilm(film, work.yt, panelData.scene.start);
        await expect(video).toHaveJSProperty('paused', true);
        await expect(hook).toHaveJSProperty('paused', true);
        await clickSceneBeat(scene.locator('[data-process-seek]').first());
        await expectSceneTimeProgress(video);
        await expect(film.locator('iframe, video')).toHaveCount(0);
        // Scrolling away stops the passage and returning does not resume it.
        await page.evaluate(() => scrollTo(0, 0));
        await expect(video).toHaveJSProperty('paused', true);
        await video.scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        await expect(video).toHaveJSProperty('paused', true);
      }
      // Starting another panel must leave the earlier clip paused.
      if (study.panels.length > 1) {
        const first = process.locator(`[data-evidence-panel="${study.panels[0].id}"]`);
        const second = process.locator(`[data-evidence-panel="${study.panels[1].id}"]`);
        await clickSceneBeat(first.locator('[data-process-seek]').first());
        await expectSceneTimeProgress(first.locator('[data-process-video]'));
        await clickSceneBeat(second.locator('[data-process-seek]').first());
        await expectSceneTimeProgress(second.locator('[data-process-video]'));
        await expect(first.locator('[data-process-video]')).toHaveJSProperty('paused', true);
        await second.locator('[data-process-video]').evaluate((node) => (node as HTMLVideoElement).pause());
      }
      // An actual image modal also interrupts playback without resuming it on close.
      const lastPanel = process.locator('[data-evidence-panel]').last();
      await clickSceneBeat(lastPanel.locator('[data-process-seek]').first());
      await expectSceneTimeProgress(lastPanel.locator('[data-process-video]'));
      const enlarge = process.locator('[data-enlarge-src]').first();
      await revealContainingDetails(enlarge);
      await enlarge.click();
      const dialog = page.locator('dialog[data-media-dialog]');
      await expect(dialog).toBeVisible();
      expect(await allScenes.evaluateAll((nodes) => nodes.every((node) => (node as HTMLVideoElement).paused))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(enlarge).toBeFocused();
      expect(await allScenes.evaluateAll((nodes) => nodes.every((node) => (node as HTMLVideoElement).paused))).toBe(true);
    }
    await open(page, '/works/oneandonly/');
    const study = CASE_STUDIES.oneandonly;
    const start = page.locator('[data-process-case] [data-film-start]');
    await start.click();
    const film = page.locator('[data-full-film] [data-film-root]');
    await expectFilm(film, 'NPlAjWuCsAY', study.scene.start);
    const large = film.locator('[data-film-large]');
    await large.click();
    const dialog = page.locator('dialog[data-media-dialog]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('iframe')).toHaveCount(1);
    await dialog.locator('[data-media-close]').click();
    await expect(dialog).not.toBeVisible();
    await expect(dialog.locator('iframe')).toHaveCount(0);
    await expect(large).toBeFocused();
    await large.click();
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(dialog.locator('iframe')).toHaveCount(0);
    await expect(large).toBeFocused();
  });

  test('R-5. 선택한 문맥 전체 읽기·화자 공백과 열·모든 자료 확대·Esc·포커스 복귀', async ({ page }) => {
    for (const work of MAIN_WORKS) {
      const study = CASE_STUDIES[work.slug];
      const approved = authoredLines(work.slug);
      await open(page, `/works/${work.slug}/`);
      const process = page.locator('[data-process-case]');
      const reader = process.locator('[data-script-reader]');
      await expect(reader).toHaveCount(1);
      await process.locator('details:has([data-script-reader]) > summary').click();
      await expect(reader).toBeVisible();
      expect(await reader.locator('p[data-src]').allTextContents(), '선택한 전체 문맥의 문자·공백·순서').toEqual(approved);
      await expect(reader.locator('[data-script-focus]')).toHaveCount(0);
      const layout = await expectScriptDocument(reader);
      const dialogueLines = study.script.lines.filter((line) => line.t === 'dia' && line.who);
      expect(layout.speakers).toBe(dialogueLines.length);
      for (let index = 0; index < study.script.lines.length; index++) {
        const line = study.script.lines[index];
        if (line.t !== 'dia' || !line.who) continue;
        const row = reader.locator('p[data-src]').nth(index);
        const actor = line.who.split('(')[0].trim();
        const speakerText = await row.locator('[data-script-speaker]').textContent();
        const dialogueText = await row.locator('[data-script-dialogue]').textContent();
        expect(speakerText?.trim(), '배우명 열은 공백·개행을 제외한 실제 인물명').toBe(actor);
        expect((speakerText ?? '') + (dialogueText ?? ''), '화자/대사 분리 뒤 원문 개행·공백 보존').toBe(approved[index]);
        const separator = approved[index].slice(actor.length).match(/^\s*/)?.[0] ?? '';
        expect(speakerText).toBe(actor + separator);
        expect(dialogueText).toBe(approved[index].slice(actor.length + separator.length));
      }
      await reader.focus();
      const url = page.url();
      const scroll = await page.evaluate(() => scrollY);
      for (const key of ['ArrowLeft', 'ArrowRight']) {
        await page.keyboard.press(key);
        await page.waitForTimeout(120);
        expect(page.url()).toBe(url);
        expect(Math.abs(await page.evaluate(() => scrollY) - scroll)).toBeLessThanOrEqual(2);
        await expect(reader).toBeFocused();
      }
      const materials = process.locator('[data-enlarge-src]');
      const expectedImages = studyImages(work.slug);
      expect(await materials.count()).toBe(expectedImages.length);
      for (let index = 0; index < expectedImages.length; index++) {
        const enlarge = materials.nth(index);
        await revealContainingDetails(enlarge);
        await expect(enlarge).toBeVisible();
        const src = await enlarge.getAttribute('data-enlarge-src');
        expect(src).toBe(expectedImages[index].img);
        await enlarge.click();
        const dialog = page.locator('dialog[data-media-dialog]');
        await expect(dialog).toBeVisible();
        const image = dialog.locator('img');
        await expect(image).toHaveCount(1);
        expect(new URL((await image.getAttribute('src'))!, page.url()).pathname).toBe(new URL(src!, page.url()).pathname);
        await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0)).toBe(true);
        const geometry = await image.evaluate((node) => {
          const img = node as HTMLImageElement;
          const box = img.getBoundingClientRect();
          return { natural: img.naturalWidth / img.naturalHeight, rendered: box.width / box.height, fit: getComputedStyle(img).objectFit };
        });
        expect(Math.abs(geometry.natural / (expectedImages[index].w / expectedImages[index].h) - 1), '확대한 이미지도 해당 제작 원본').toBeLessThanOrEqual(.02);
        expect(Math.abs(geometry.rendered / geometry.natural - 1), '확대 이미지 상자의 원본 비율').toBeLessThanOrEqual(.02);
        expect(geometry.fit).toBe('contain');
        for (const key of ['ArrowLeft', 'ArrowRight', 'Tab', 'Shift+Tab']) {
          await page.keyboard.press(key);
          expect(page.url()).toBe(url);
          expect(await dialog.evaluate((node) => node.contains(document.activeElement))).toBe(true);
        }
        await page.keyboard.press('Escape');
        await expect(dialog).not.toBeVisible();
        await expect(enlarge).toBeFocused();
      }
    }
  });

  test('R-6. 움직임 줄이기에서도 모든 경로·자료·재생 조작 접근 가능', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const route of ROUTES) {
      await open(page, route);
      await nav(page);
      await noOverflow(page);
      const playing = await page.locator('video').evaluateAll((videos) => videos.filter((video) => !(video as HTMLVideoElement).paused).length);
      expect(playing).toBe(0);
      if (route.startsWith('/works/')) {
        const process = page.locator('[data-process-case]');
        const visibility = await processVisibility(process);
        expect(visibility.count).toBeGreaterThan(0);
        expect(visibility.problems).toEqual([]);
        expect(await process.locator('.pin-spacer').count()).toBe(0);
        await expect(page.locator('[data-full-film] [data-film-play]').first()).toBeVisible();
        const study = CASE_STUDIES[route.split('/')[2]];
        for (const panelData of study.panels) {
          const scene = process.locator(`[data-evidence-panel="${panelData.id}"] section[data-scene-start][data-scene-end]`);
          const video = await expectNativeScene(scene, panelData.scene);
          await expect(video).toHaveJSProperty('paused', true);
          await clickSceneBeat(scene.locator('[data-process-seek]').first());
          await expectSceneTimeProgress(video);
          await video.evaluate((node) => (node as HTMLVideoElement).pause());
        }
      }
      expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length)).toBe(0);
    }
  });

  test('R-7. JavaScript 없이도 7작품·연락·후킹 원문·풀영상 자리·과정 자료가 존재', async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext({ baseURL, javaScriptEnabled: false, viewport: testInfo.project.use.viewport, locale: 'ko-KR' });
    await stubYouTube(context);
    try {
      const page = await context.newPage();
      await open(page, '/');
      expect(await visibleWorkURLs(page)).toEqual(WORK_URLS);
      expect(await page.locator(`a[href="mailto:${EMAIL}"]`).evaluateAll((links) => links.some((link) => (link as HTMLElement).checkVisibility()))).toBe(true);
      for (const work of MAIN_WORKS) {
        await open(page, `/works/${work.slug}/`);
        await expect(page.locator('[data-story-hook]')).toBeVisible();
        await expect(page.locator('[data-full-film]')).toBeVisible();
        await expect(page.locator(`[data-full-film] a[href="https://www.youtube.com/watch?v=${work.yt}"]`)).toBeVisible();
        const process = page.locator('[data-process-case]');
        const visibility = await processVisibility(process);
        expect(visibility.count).toBeGreaterThan(0);
        expect(visibility.problems).toEqual([]);
        const study = expectStudySource(work.slug);
        await expectHookContext(page.locator('[data-story-hook]'), work.slug);
        await expectEvidencePanels(process, study, work.slug);
        const reader = process.locator('[data-script-reader]');
        await process.locator('details:has([data-script-reader]) > summary').click();
        expect(await reader.locator('p[data-src]').allTextContents(), 'JS 없는 전체 원문의 문자·공백·순서').toEqual(authoredLines(work.slug));
        for (const panelData of study.panels) {
          const native = await expectNativeScene(process.locator(`[data-evidence-panel="${panelData.id}"] section[data-scene-start][data-scene-end]`), panelData.scene);
          await expect(native).toHaveJSProperty('paused', true);
        }
        await expectNoPrivateResearch(page, study);
        if (study.material.images.length) await loadedImages(process);
        await noOverflow(page);
      }
      await open(page, '/tools/');
      for (const work of TOOL_WORKS) {
        const technical = page.locator(`[data-tool="${work.slug}"]`);
        await expect(technical).toBeVisible();
        const film = technical.locator('[data-film-root]');
        await expect(film).toHaveCount(1);
        const localSrc = await film.getAttribute('data-local-src');
        const fallback = localSrc || `https://www.youtube.com/watch?v=${work.yt}`;
        await expect(technical.locator(`a[href="${fallback}"]`)).toBeVisible();
      }
      await noOverflow(page);
    } finally {
      await context.close();
    }
  });


  test('R-8. 후킹 클립의 수동 정지 유지·화면 밖 정지·풀영상과 동시 재생 방지', async ({ page }) => {
    for (const work of MAIN_WORKS) {
      await open(page, `/works/${work.slug}/`);
      const video = page.locator('[data-story-video]');
      const toggle = page.locator('[data-story-toggle]');
      await expect(video).toHaveCount(1);
      await expect(toggle).toBeVisible();
      expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await toggle.scrollIntoViewIfNeeded();
      // In 3/3 traced mobile runs, IO started autoplay between the paused read and click.
      // The real button correctly stopped its newly playing clip. Settle the viewport
      // before deciding whether a user needs to press Play; keep playback assertions.
      await toggle.evaluate(() => new Promise<void>(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }));
      if (await video.evaluate((node) => (node as HTMLVideoElement).paused)) await toggle.click();
      await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(false);
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
      await toggle.click();
      await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(true);
      await expect(toggle).toHaveAttribute('aria-pressed', 'false');
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await toggle.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      expect(await video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(true);
      await toggle.click();
      await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(false);
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
      await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(true);
      await toggle.scrollIntoViewIfNeeded();
      await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(false);
      await page.locator('[data-full-film] [data-film-play]').first().click();
      await expect.poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(true);
      await toggle.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      expect(await video.evaluate((node) => (node as HTMLVideoElement).paused)).toBe(true);
    }
  });

  test('R-9. 목록에서 세 상세·다음 작품·기술4·소개연락·홈까지 실제 링크로 탐색', async ({ page }) => {
    await open(page, '/?view=index#works');
    await expect(page.locator('[data-view-choice="index"]')).toHaveAttribute('aria-pressed', 'true');
    const tabs = page.context().pages().length;
    await page.locator('[data-work-view="index"] a[href="/works/oneandonly/"]').click();
    for (let i = 0; i < MAIN_WORKS.length; i++) {
      await expect(page.locator('main[data-work]')).toHaveAttribute('data-work', MAIN_WORKS[i].slug);
      const next = page.locator('[data-next]');
      const href = i + 1 < MAIN_WORKS.length ? `/works/${MAIN_WORKS[i + 1].slug}/` : '/tools/';
      await expect(next).toHaveAttribute('href', href);
      await next.click();
      await expect(page).toHaveURL(new RegExp(href.replaceAll('/', '\\/') + '$'));
    }
    for (const work of TOOL_WORKS) await expect(page.locator(`[data-tool="${work.slug}"]`)).toBeVisible();
    await (await nav(page, true)).locator('a[href="/#works"]').click();
    await expect(page.locator('[data-view-choice="index"]')).toHaveAttribute('aria-pressed', 'true');
    expect(await visibleWorkURLs(page)).toEqual(WORK_URLS);
    await (await nav(page, true)).locator('a[href="/#info"]').click();
    await expect(page.locator('#info')).toBeInViewport();
    await (await nav(page, true)).locator('a[href="/tools/"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-page', 'tools');
    await page.locator('header a[href="/"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-page', 'home');
    expect(page.context().pages().length).toBe(tabs);
  });

});
