/**
 * 백테스트 — docs/contract.md 4절 「작가가 지적한 것」 11개, 시험 하나씩(이름에 번호).
 * 실패하면 사이트를 고친다. 시험을 느슨하게 고치지 않는다.
 *
 * 태그: @once = 화면 크기와 무관해서 데스크톱 1440 에서만 · @mobile = 모바일 390 에서만 · 없음 = 세 화면 모두.
 * 각 시험은 방을 하나씩 돌며 문제를 모아서 한 번에 보고한다(첫 실패에서 멈추지 않는다).
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  CONTEST_WORDS_KO,
  CONTEST_WORD_OYE,
  ABSENT_ROOMS,
  DOORS,
  DOOR_TARGETS,
  IMG_VIDEO_EXT,
  MAIN_WORKS,
  MEDIA_DIR,
  PUBLIC_DIR,
  RASTER_VIDEO_EXT,
  ROOMS,
  SEL,
  SETTLE_MS,
  SOURCE_FORM,
  SRC_DIR,
  STEPS,
  TOOL_WORKS,
  WORKS,
  YT_URL,
  assertNoProblems,
  contactProbe,
  hookProbe,
  loadSources,
  measureLanding,
  mediaRefs,
  openToolCard,
  overlayProbe,
  pageTexts,
  pollProblems,
  readSources,
  scrollToStep,
  settle,
  stepVisibleProbe,
  test,
  tocState,
  visit,
  walkFiles,
  type Work,
} from './helpers';
import type { Locator, Page } from '@playwright/test';

const nameOfRoom = (p: string) => p;

// ───────────────────────────── 공용 조각 ─────────────────────────────

/** 보이는 [data-video] 를 훑어 겹침 문제를 모은다. mustHave=true 면 영상 자리가 0개일 때도 문제. */
async function checkOverlay(page: Page, label: string, mustHave: boolean, out: string[], sel: string = SEL.video, tag = 'video') {
  const end = Date.now() + 3_000;
  let r = { count: 0, problems: [] as string[] };
  for (;;) {
    try {
      r = await page.evaluate(overlayProbe, { sel, tag });
    } catch (e) {
      r = { count: 0, problems: [`측정 오류: ${(e as Error).message.split('\n')[0]}`] };
    }
    const settled = r.count > 0 ? r.problems.length === 0 : !mustHave;
    if (settled || Date.now() >= end) break;
    await page.waitForTimeout(300);
  }
  if (mustHave && r.count === 0) out.push(`${label}: 보이는 영상 자리 ${sel} 가 없음`);
  for (const p of r.problems) out.push(`${label} ${p}`);
}

async function docRect(loc: Locator) {
  return loc.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  });
}

/** 영상 자리를 눌러 같은 페이지에 youtube-nocookie iframe 이 생기는지. 문제 목록을 돌려준다. */
async function playInPlace(page: Page, spot: Locator, w: Work, label: string): Promise<string[]> {
  const problems: string[] = [];
  const ctx = page.context();
  const urlBefore = page.url();
  const pagesBefore = ctx.pages().length;
  let popups = 0;
  const onPopup = (p: Page) => {
    popups++;
    p.close().catch(() => {}); // 열린 새 탭은 닫아 뒤 단계에 영향이 없게
  };
  page.on('popup', onPopup);
  try {
    const idAttr = await spot.getAttribute('data-youtube-id');
    if (idAttr !== w.yt) problems.push(`${label}: data-youtube-id="${idAttr}" (기대 ${w.yt})`);
    let before: { x: number; y: number; w: number; h: number };
    try {
      await spot.scrollIntoViewIfNeeded({ timeout: 8_000 });
      before = await docRect(spot);
      await spot.click({ timeout: 8_000 });
    } catch (e) {
      problems.push(`${label}: 영상 자리를 누를 수 없음 — ${(e as Error).message.split('\n')[0]}`);
      return problems;
    }
    const iframe = page.locator('iframe[src*="youtube-nocookie.com"]').first();
    try {
      await iframe.waitFor({ state: 'attached', timeout: 3_000 });
    } catch {
      problems.push(`${label}: 누른 뒤 youtube-nocookie iframe 이 생기지 않음`);
    }
    if (await iframe.count()) {
      const src = (await iframe.getAttribute('src')) ?? '';
      if (!src.includes(`/embed/${w.yt}`)) problems.push(`${label}: iframe src 에 /embed/${w.yt} 가 없음 (${src})`);
      const box = await docRect(iframe);
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      if (cx < before.x - 4 || cx > before.x + before.w + 4 || cy < before.y - 4 || cy > before.y + before.h + 4) {
        problems.push(`${label}: iframe 이 영상 자리 안에 생기지 않음 (자리 ${Math.round(before.x)},${Math.round(before.y)} ${Math.round(before.w)}x${Math.round(before.h)} / iframe 중심 ${Math.round(cx)},${Math.round(cy)})`);
      }
    }
    if (page.url() !== urlBefore) problems.push(`${label}: 주소가 바뀜 ${urlBefore} → ${page.url()}`);
    if (ctx.pages().length !== pagesBefore || popups > 0) problems.push(`${label}: 새 탭/창이 열림`);
  } finally {
    page.off('popup', onPopup);
  }
  return problems;
}

// ───────────────────────────── 시험 ─────────────────────────────

test.describe('contract 4절 백테스트', () => {
  test('1. 작품 상세 3 주소 · 툴 방(카드 4)이 열리고, 홈 출입구 4개가 각 방으로 가며, 프리미어평가 · 소개 · 경력 · 작품목록 · 연락 방은 없다(404)', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];

    // 작품 상세 3개 주소
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st}`);
        continue;
      }
      const n = await page.locator(SEL.work(w.slug)).count();
      if (n !== 1) problems.push(`${p}: ${SEL.work(w.slug)} ${n}개 (1개여야 함)`);
      if ((await page.locator(`${SEL.video}[data-youtube-id="${w.yt}"]`).count()) < 1) problems.push(`${p}: ${SEL.video}[data-youtube-id="${w.yt}"] 없음`);
    }

    // 홈 출입구 4개가 각 방으로 간다
    for (const k of DOORS) {
      const st = await visit(page, '/');
      if (st !== 200) {
        problems.push(`/ → HTTP ${st} (홈이 없음)`);
        break;
      }
      await settle(page, Math.min(SETTLE_MS, 800));
      const door = page.locator(SEL.door(k)).first();
      if ((await door.count()) === 0) {
        problems.push(`홈에 ${SEL.door(k)} 없음`);
        continue;
      }
      const target = DOOR_TARGETS[k];
      try {
        await Promise.all([
          page.waitForURL((u) => u.pathname.replace(/\/$/, '') === target.replace(/\/$/, ''), { timeout: 5_000 }),
          door.click({ timeout: 4_000 }),
        ]);
      } catch (e) {
        problems.push(`홈 출입구 ${k} 를 눌러 ${target} 로 가지 못함 (현재 ${new URL(page.url()).pathname}): ${(e as Error).message.split('\n')[0]}`);
      }
    }

    // 있으면 안 되는 방은 404 — 작품 목록 · 소개 · 연락 · 경력/이력
    for (const p of ABSENT_ROOMS) {
      const st = await visit(page, p);
      if (st !== 404) problems.push(`${p} → HTTP ${st} (404 여야 함 — 이 방은 만들지 않는다)`);
    }

    // 툴 카드 4개 — 눌러서 모달이 열린다
    {
      const st = await visit(page, '/tools/');
      if (st !== 200) problems.push(`/tools/ → HTTP ${st}`);
      else {
        const slugs = await page
          .locator(SEL.toolCard)
          .evaluateAll((els) => els.map((e) => e.getAttribute('data-work') ?? e.getAttribute('data-tool') ?? '').filter(Boolean).sort());
        const want = TOOL_WORKS.map((w) => w.slug).sort();
        if (JSON.stringify(slugs) !== JSON.stringify(want)) problems.push(`/tools/ 의 카드 [${slugs.join(', ')}] (기대 [${want.join(', ')}])`);
        for (const w of TOOL_WORKS) {
          await visit(page, '/tools/');
          const why = await openToolCard(page, w);
          if (why) problems.push(`/tools/ ${w.slug}: ${why}`);
        }
      }
    }

    // 프리미어평가는 어느 방에도 없다
    for (const room of ROOMS) {
      const st = await visit(page, room.path);
      if (st !== 200) continue;
      const texts = (await page.evaluate(pageTexts)).join('\n');
      const squeezed = texts.replace(/\s+/g, '');
      if (/프리미어평가/.test(squeezed) || /premiere\s*(평가|eval)/i.test(texts) || /요지야마모토|yohji/i.test(squeezed)) {
        problems.push(`${room.path}: 프리미어평가(요지 야마모토 런웨이) 글자가 있음`);
      }
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).pathname));
      if (hrefs.some((h) => /premier/i.test(h))) problems.push(`${room.path}: premiere 로 가는 링크가 있음`);

      // 사이트 안 링크는 있는 방으로만 간다(소개 · 연락 · 작품 목록으로 가는 죽은 링크 금지)
      const live = new Set(ROOMS.map((r) => r.path.replace(/\/$/, '') || '/'));
      const internal = await page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
          .filter((a) => a.origin === location.origin && !a.pathname.startsWith('/media/') && !/\.[a-z0-9]{2,5}$/i.test(a.pathname))
          .map((a) => a.pathname.replace(/\/$/, '') || '/'),
      );
      for (const h of new Set(internal)) if (!live.has(h)) problems.push(`${room.path}: 없는 방으로 가는 링크 ${h}`);

      // 증명사진은 쓰지 않는다(작가 확인 전까지)
      const photos = await page.$$eval('img', (imgs) =>
        imgs.map((i) => `${i.getAttribute('src') ?? ''} ${i.getAttribute('alt') ?? ''}`).filter((s) => /증명|id[-_ ]?photo|headshot|portrait/i.test(s)),
      );
      if (photos.length) problems.push(`${room.path}: 증명사진으로 보이는 이미지 ${photos.join(' | ')}`);
    }
    for (const f of walkFiles(MEDIA_DIR)) if (/증명|id[-_ ]?photo|headshot/i.test(f)) problems.push(`public/media/${f}: 증명사진은 쓰지 않는다`);

    assertNoProblems('작품 상세 · 툴 방 · 출입구 · 없는 방(404)', problems);
  });

  test('2. 모든 방에서 상단 바의 연락(이메일 한 줄)이 화면 안에 보인다', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const room of ROOMS) {
      const st = await visit(page, room.path);
      if (st !== 200) {
        problems.push(`${nameOfRoom(room.path)} → HTTP ${st} (방이 없음)`);
        continue;
      }
      const top = await pollProblems(page, contactProbe, 3_000);
      for (const p of top) problems.push(`${room.path} (맨 위): ${p}`);
      // 긴 방은 맨 아래까지 내려도 보여야 한다(상단 바가 늘 붙어 있다)
      const scrollable = await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 4);
      if (scrollable) {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        await page.waitForTimeout(400);
        const bottom = await pollProblems(page, contactProbe, 2_000);
        for (const p of bottom) problems.push(`${room.path} (맨 아래로 스크롤): ${p}`);
      }
    }
    assertNoProblems(`[연락] 보임 · ${testInfo.project.name}`, problems);
  });

  test('3. 영상 자리 위에 다른 요소가 겹치지 않는다(가운데 · 네 귀퉁이)', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const detailPaths = new Set(MAIN_WORKS.map((w) => `/works/${w.slug}/`));

    for (const room of ROOMS) {
      const st = await visit(page, room.path);
      if (st !== 200) {
        problems.push(`${room.path} → HTTP ${st} (방이 없음)`);
        continue;
      }
      await settle(page, Math.min(SETTLE_MS, 800));
      const isDetail = detailPaths.has(room.path);
      // 후킹 구역의 로컬 클립 <video> 에도 같은 규칙 (첫 화면이라 풀영상보다 먼저 본다)
      if (isDetail) await checkOverlay(page, `${room.path} (후킹 클립)`, true, problems, SEL.hookVideo, 'hook');
      await checkOverlay(page, `${room.path} (재생 전)`, isDetail, problems);

      // 재생 후에도 영상 위에 아무것도 올라오지 않는다
      if (isDetail && (await page.locator(SEL.video).count()) > 0) {
        try {
          await page.locator(SEL.video).first().click({ timeout: 4_000 });
          await page.locator('iframe[src*="youtube-nocookie.com"]').first().waitFor({ state: 'attached', timeout: 3_000 });
          await settle(page, 400);
          await checkOverlay(page, `${room.path} (재생 후)`, false, problems);
        } catch {
          /* 누르기 실패는 시험 4 가 따로 보고한다 */
        }
      }
    }

    // 툴 모달 안의 영상 자리
    if ((await visit(page, '/tools/')) === 200) {
      for (const w of TOOL_WORKS) {
        await visit(page, '/tools/');
        const why = await openToolCard(page, w);
        if (why) {
          problems.push(`/tools/ ${w.slug}: ${why}`);
          continue;
        }
        await settle(page, 500);
        await checkOverlay(page, `/tools/ ${w.slug} 모달`, true, problems);
      }
    }
    assertNoProblems(`영상 위 겹침 · ${testInfo.project.name}`, problems);
  });

  test('4. 영상 자리를 누르면 같은 페이지 안에 유튜브 iframe 이 생긴다(새 탭 · 이동 금지)', async ({ page }, testInfo) => {
    const problems: string[] = [];

    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st} (방이 없음)`);
        continue;
      }
      await settle(page, Math.min(SETTLE_MS, 800));
      const spot = page.locator(SEL.video).first();
      if ((await spot.count()) === 0) {
        problems.push(`${p}: ${SEL.video} 없음`);
        continue;
      }
      problems.push(...(await playInPlace(page, spot, w, p)));
    }

    for (const w of TOOL_WORKS) {
      const st = await visit(page, '/tools/');
      if (st !== 200) {
        problems.push(`/tools/ → HTTP ${st} (방이 없음)`);
        break;
      }
      const why = await openToolCard(page, w);
      if (why) {
        problems.push(`/tools/ ${w.slug}: ${why}`);
        continue;
      }
      const spot = page.locator(SEL.modal).locator(`${SEL.video}[data-youtube-id="${w.yt}"]`).first();
      problems.push(...(await playInPlace(page, spot, w, `/tools/ ${w.slug} 모달`)));
    }
    assertNoProblems(`영상 자리 누르기 · ${testInfo.project.name}`, problems);
  });

  test('5. 작품 상세 한 페이지 안에 다른 작품의 영상이 없다(작품별 구역)', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st} (방이 없음)`);
        continue;
      }
      const roots = await page.locator('[data-work]').evaluateAll((els) => els.map((e) => e.getAttribute('data-work')));
      if (roots.length !== 1 || roots[0] !== w.slug) problems.push(`${p}: [data-work] 가 [${roots.join(', ')}] (기대 [${w.slug}] 하나)`);

      const ids = await page.locator(SEL.video).evaluateAll((els) => els.map((e) => e.getAttribute('data-youtube-id')));
      if (ids.length === 0) problems.push(`${p}: ${SEL.video} 없음`);
      for (const id of ids) if (id !== w.yt) problems.push(`${p}: 영상 자리 data-youtube-id="${id}" (이 작품은 ${w.yt})`);

      // 다른 작품의 유튜브 ID 가 속성(iframe · 링크 · 데이터)이나 글자 어디에도 없어야 한다
      const others = WORKS.filter((o) => o.slug !== w.slug);
      const leaks = await page.evaluate((ids2) => {
        const hits: string[] = [];
        const attrs: string[] = [];
        document.querySelectorAll('*').forEach((e) => {
          if (['SCRIPT', 'STYLE'].includes(e.tagName)) return;
          for (const a of Array.from(e.attributes)) attrs.push(a.value);
        });
        const text = document.body.innerText;
        for (const o of ids2) if (attrs.some((v) => v.includes(o.yt)) || text.includes(o.yt)) hits.push(`${o.slug}(${o.yt})`);
        return hits;
      }, others.map((o) => ({ slug: o.slug, yt: o.yt })));
      for (const l of leaks) problems.push(`${p}: 다른 작품 ${l} 의 영상 ID 가 이 페이지에 있음`);
    }
    assertNoProblems('작품별 구역', problems);
  });

  test('6. 모바일 390 에서 가로 넘침이 없다', { tag: '@mobile' }, async ({ page, browser }, testInfo) => {
    const problems: string[] = [];
    const vw = testInfo.project.use.viewport?.width ?? 390;
    const vh = testInfo.project.use.viewport?.height ?? 844;

    // 모바일 에뮬레이션은 넘침이 있으면 레이아웃 폭을 키워 버려 범인이 안 보인다 →
    // 범인 찾기는 "축소 없는" 같은 폭의 일반 컨텍스트에서 한다.
    let culpritPage: Page | null = null;
    const culpritsOf = async (url: string, openCard?: Work): Promise<string> => {
      if (!culpritPage) {
        const c = await browser.newContext({ baseURL: testInfo.project.use.baseURL, viewport: { width: vw, height: vh } });
        await c.route(YT_URL, (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html>' }));
        culpritPage = await c.newPage();
      }
      await visit(culpritPage, url);
      if (openCard) await openToolCard(culpritPage, openCard);
      await settle(culpritPage, 600);
      const list = await culpritPage.evaluate((w) => {
        const el = (e: Element) => `<${e.tagName.toLowerCase()}${typeof (e as HTMLElement).className === 'string' && (e as HTMLElement).className ? '.' + (e as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join('.') : ''}>`;
        const clipped = (e: Element) => {
          for (let a = e.parentElement; a && a !== document.documentElement && a !== document.body; a = a.parentElement) {
            const c = getComputedStyle(a);
            if (c.overflowX !== 'visible' && a.getBoundingClientRect().right <= w + 1) return true;
          }
          return false;
        };
        const over = Array.from(document.querySelectorAll<HTMLElement>('body *'))
          .map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter(({ e, r }) => r.width > 0 && r.right > w + 1 && getComputedStyle(e).display !== 'none' && !clipped(e));
        // 부모는 안 넘치는데 자기만 넘치는 것 = 첫 원인
        const first = over.filter(({ e }) => !e.parentElement || e.parentElement.getBoundingClientRect().right <= w + 1 || e.parentElement === document.body);
        return (first.length ? first : over)
          .sort((a, b) => b.r.right - a.r.right)
          .slice(0, 4)
          .map(({ e, r }) => `${el(e)} 오른쪽 끝 ${Math.round(r.right)}px`)
          .join(' · ');
      }, vw);
      return list ? ` — 넘치는 요소: ${list}` : '';
    };

    const probe = (expected: number) =>
      page.evaluate((w) => {
        const why: string[] = [];
        const de = document.documentElement;
        if (window.innerWidth > w + 1) why.push(`레이아웃 폭 ${window.innerWidth}px > ${w}px (viewport 메타가 없거나, 가로로 넘치는 내용 때문에 모바일 화면이 확대/축소됨)`);
        if (de.scrollWidth > w + 1) why.push(`documentElement.scrollWidth ${de.scrollWidth} > 화면 ${w}`);
        if (document.body.scrollWidth > w + 1) why.push(`body.scrollWidth ${document.body.scrollWidth} > 화면 ${w}`);
        window.scrollTo(60, 0);
        if (window.scrollX > 0) why.push(`가로로 ${Math.round(window.scrollX)}px 스크롤됨`);
        window.scrollTo(0, 0);
        return why;
      }, expected);

    for (const room of ROOMS) {
      const st = await visit(page, room.path);
      if (st !== 200) {
        problems.push(`${room.path} → HTTP ${st} (방이 없음)`);
        continue;
      }
      await settle(page, Math.min(SETTLE_MS, 800));
      const why = await probe(vw);
      if (why.length) problems.push(`${room.path}: ${why.join(' / ')}${await culpritsOf(room.path)}`);
    }
    if ((await visit(page, '/tools/')) === 200) {
      for (const w of TOOL_WORKS) {
        await visit(page, '/tools/');
        const why = await openToolCard(page, w);
        if (why) {
          problems.push(`/tools/ ${w.slug}: ${why}`);
          continue;
        }
        await settle(page, 400);
        const over = await probe(vw);
        if (over.length) problems.push(`/tools/ ${w.slug} 모달: ${over.join(' / ')}${await culpritsOf('/tools/', w)}`);
      }
    }
    if (culpritPage) await (culpritPage as Page).context().close();
    assertNoProblems('가로 넘침 (모바일 390)', problems);
  });

  test('7. 콘솔 오류 0 (전 방 · 툴 모달 · 요청 실패 · 4xx/5xx 포함)', async ({ page }, testInfo) => {
    const problems: string[] = [];
    let where = '(시작)';
    page.on('console', (m) => {
      if (m.type() === 'error') problems.push(`[${where}] console.error: ${m.text()}${m.location().url ? ` @ ${m.location().url}` : ''}`);
    });
    page.on('pageerror', (e) => problems.push(`[${where}] pageerror: ${e.message.split('\n')[0]}`));
    page.on('requestfailed', (r) => {
      const err = r.failure()?.errorText ?? '';
      if (/ERR_ABORTED/.test(err)) return; // 이동 중 취소된 요청은 오류 아님
      problems.push(`[${where}] 요청 실패: ${r.url()} (${err})`);
    });
    page.on('response', (r) => {
      if (r.status() >= 400) problems.push(`[${where}] HTTP ${r.status()}: ${r.url()}`);
    });

    for (const room of ROOMS) {
      where = room.path;
      await visit(page, room.path);
      await settle(page, Math.min(SETTLE_MS, 1000));
    }
    where = '/tools/ (카드 열기)';
    if ((await page.goto('/tools/'))?.status() === 200) {
      for (const w of TOOL_WORKS) {
        where = `/tools/ ${w.slug} 모달`;
        await visit(page, '/tools/');
        const why = await openToolCard(page, w);
        if (why) problems.push(`[${where}] ${why}`);
        await settle(page, 400);
      }
    }
    // 같은 오류가 여러 번 찍히면 한 줄로
    const uniq = [...new Set(problems)];
    assertNoProblems(`콘솔 오류 · ${testInfo.project.name}`, uniq);
  });

  test('8. 공모전 이름(비글루 · OYE · 서울드라마어워즈 · 페스티벌 · 챌린지 · 공모전)이 페이지 글자 어디에도 없다', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    const scan = async (label: string) => {
      const texts = await page.evaluate(pageTexts);
      const joined = texts.join('\n');
      const squeezed = joined.replace(/\s+/g, '');
      for (const w of CONTEST_WORDS_KO) if (squeezed.includes(w)) problems.push(`${label}: 「${w}」`);
      if (CONTEST_WORD_OYE.test(joined)) problems.push(`${label}: 「OYE」`);
    };
    for (const room of ROOMS) {
      const st = await visit(page, room.path);
      if (st !== 200) {
        problems.push(`${room.path} → HTTP ${st} (방이 없음 — 글자를 못 읽음)`);
        continue;
      }
      await scan(room.path);
    }
    if ((await visit(page, '/tools/')) === 200) {
      for (const w of TOOL_WORKS) {
        await visit(page, '/tools/');
        if (!(await openToolCard(page, w))) await scan(`/tools/ ${w.slug} 모달`);
      }
    }
    assertNoProblems('공모전 낱말', problems);
  });

  test('9. 이미지 · 영상 파일은 전부 public/media/ 에 있고 각각 출처.json 에 출처가 있다', { tag: '@once' }, async ({ page, baseURL }) => {
    const problems: string[] = [];

    // (a) public/media/ 파일 ↔ 출처.json
    // 출처를 요구하는 것은 이미지 · 영상 파일. 데이터 파일(.json 등)은 대상이 아니다.
    const files = walkFiles(MEDIA_DIR).filter((f) => f !== '출처.json' && IMG_VIDEO_EXT.test(f));
    const srcFile = path.join(MEDIA_DIR, '출처.json');
    let sources = new Map<string, string>();
    if (!fs.existsSync(srcFile)) problems.push('public/media/출처.json 이 없음');
    else {
      try {
        sources = readSources(fs.readFileSync(srcFile, 'utf8'));
      } catch (e) {
        problems.push(`public/media/출처.json 을 읽을 수 없음: ${(e as Error).message}`);
      }
    }
    if (files.length === 0) problems.push('public/media/ 에 파일이 하나도 없음 (포스터 · 증명사진 등이 있어야 함)');
    for (const f of files) {
      const src = (sources.get(f) ?? sources.get(path.posix.basename(f)) ?? '').trim();
      if (!src) problems.push(`출처 없음: public/media/${f}`);
      else if (!SOURCE_FORM.test(src)) problems.push(`출처가 「완성본 파일명·시점 / 작가 캡처 / 시트」 꼴이 아님: public/media/${f} → "${src}"`);
    }

    // (b) public/ 의 다른 곳 · src/ 에 이미지 · 영상이 숨어 있지 않다 (favicon 은 예외)
    for (const f of walkFiles(PUBLIC_DIR)) {
      if (f.startsWith('media/')) continue;
      if (/^favicon\.[a-z]+$/i.test(f)) continue;
      if (IMG_VIDEO_EXT.test(f)) problems.push(`public/${f}: 이미지 · 영상은 public/media/ 에 둘 것`);
    }
    for (const f of walkFiles(SRC_DIR)) if (RASTER_VIDEO_EXT.test(f)) problems.push(`src/${f}: 이미지 · 영상은 public/media/ 에 둘 것(빌드가 /_astro/ 로 빼 버린다)`);

    // (c) 실제 페이지가 끌어오는 이미지 · 영상 주소가 전부 /media/ 안이고 파일이 있다
    const origin = new URL(baseURL ?? 'http://localhost:4322').origin;
    for (const room of ROOMS) {
      const st = await visit(page, room.path);
      if (st !== 200) continue; // 방 없음은 시험 1 이 보고
      for (const href of await page.evaluate(mediaRefs)) {
        let u: URL;
        try {
          u = new URL(href);
        } catch {
          problems.push(`${room.path}: 해석 못 할 주소 ${href}`);
          continue;
        }
        if (u.origin !== origin) problems.push(`${room.path}: 외부 이미지 · 영상 ${href}`);
        else if (!u.pathname.startsWith('/media/')) problems.push(`${room.path}: /media/ 밖의 이미지 · 영상 ${u.pathname}`);
        else if (!fs.existsSync(path.join(MEDIA_DIR, decodeURIComponent(u.pathname.slice('/media/'.length))))) problems.push(`${room.path}: 가리키는 파일이 없음 ${u.pathname}`);
      }
    }
    assertNoProblems('미디어 출처', [...new Set(problems)]);
  });

  test('10. 움직임 줄이기(prefers-reduced-motion)에서 전환 연출이 꺼진다', { tag: '@once' }, async ({ browser }, testInfo) => {
    const sample = async (page: Page, ms: number) => {
      const found = new Map<string, { kind: string; name: string; target: string; pseudo: string; dur: number; infinite: boolean }>();
      let styleFrames = 0;
      let lastFrames = 0;
      const end = Date.now() + ms;
      while (Date.now() < end) {
        try {
          const snap = await page.evaluate(() => {
            const anims = document
              .getAnimations()
              .filter((a) => a.playState === 'running')
              .map((a) => {
                const t = a.effect?.getComputedTiming?.();
                const tgt = (a.effect as KeyframeEffect | null)?.target as Element | null;
                const cls = tgt && typeof (tgt as HTMLElement).className === 'string' ? (tgt as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join('.') : '';
                return {
                  kind: a.constructor.name,
                  name: (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.id ?? '',
                  target: tgt ? `${tgt.tagName.toLowerCase()}${(tgt as HTMLElement).id ? '#' + (tgt as HTMLElement).id : ''}${cls ? '.' + cls : ''}` : '',
                  pseudo: (a.effect as KeyframeEffect | null)?.pseudoElement ?? '',
                  dur: Number(t?.duration ?? 0),
                  infinite: t?.iterations === Infinity,
                };
              });
            return { anims, frames: (window as unknown as { __qaStyleFrames?: number }).__qaStyleFrames ?? 0 };
          });
          for (const a of snap.anims) found.set(`${a.kind}|${a.name}|${a.target}|${a.pseudo}`, a);
          if (snap.frames < lastFrames) styleFrames += lastFrames; // 새 문서로 넘어감
          lastFrames = snap.frames;
        } catch {
          /* 이동 중 컨텍스트 소멸 — 다음 표본에서 */
        }
        await page.waitForTimeout(40);
      }
      styleFrames += lastFrames;
      return { anims: [...found.values()], styleFrames };
    };

    const run = async (reduce: boolean) => {
      const context = await browser.newContext({
        baseURL: testInfo.project.use.baseURL,
        viewport: { width: 1440, height: 900 },
        reducedMotion: reduce ? 'reduce' : 'no-preference',
        locale: 'ko-KR',
      });
      // JS 로 그리는 연출(GSAP 등)은 Web Animations 에 안 잡힌다 → 인라인 style 이 바뀐 프레임 수를 센다
      await context.addInitScript(() => {
        const w = window as unknown as { __qaStyleFrames: number };
        w.__qaStyleFrames = 0;
        let last = -100;
        new MutationObserver(() => {
          const t = performance.now();
          if (t - last > 10) {
            w.__qaStyleFrames++;
            last = t;
          }
        }).observe(document, { subtree: true, attributes: true, attributeFilter: ['style'] });
      });
      await context.route(/^https?:\/\/([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com)\//i, (r) =>
        r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html>' }),
      );
      const page = await context.newPage();
      try {
        const matches = async () => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
        // 첫 진입 연출 구간 + 홈 → 작품 전환 구간을 표본으로 잡는다
        const st = await page.goto('/', { waitUntil: 'load' });
        const entry = await sample(page, 2_000);
        const door = page.locator(SEL.door('oneandonly')).first();
        let navigated = false;
        let navError = '';
        let trans = { anims: [] as Awaited<ReturnType<typeof sample>>['anims'], styleFrames: 0 };
        if ((await door.count()) === 0) navError = `홈에 ${SEL.door('oneandonly')} 출입구가 없어 전환을 눌러 볼 수 없음`;
        else {
          const clicking = door.click({ timeout: 4_000 }).catch((e: Error) => {
            navError = `출입구 누르기 실패: ${e.message.split('\n')[0]}`;
          });
          trans = await sample(page, 1_800);
          await clicking;
          navigated = /\/works\/oneandonly\/?$/.test(new URL(page.url()).pathname);
          if (!navigated && !navError) navError = `출입구를 눌러도 /works/oneandonly/ 로 가지 않음 (현재 ${new URL(page.url()).pathname})`;
        }
        const reducedOn = await matches().catch(() => reduce);
        return { status: st?.status() ?? 0, entry, trans, navigated, navError, reducedOn };
      } finally {
        await context.close();
      }
    };

    const reduced = await run(true);
    const normal = await run(false);

    const long = (a: { dur: number; infinite: boolean }) => !a.infinite && a.dur > 100;
    const fmt = (a: { kind: string; name: string; target: string; pseudo: string; dur: number }) => `${a.kind}「${a.name}」 ${a.target}${a.pseudo} ${Math.round(a.dur)}ms`;
    const reducedLong = [...reduced.entry.anims, ...reduced.trans.anims].filter(long);
    const reducedInfinite = [...reduced.entry.anims, ...reduced.trans.anims].filter((a) => a.infinite);
    const normalLong = [...normal.entry.anims, ...normal.trans.anims].filter(long);

    testInfo.annotations.push(
      { type: '움직임 허용 모드에서 잡힌 연출', description: `긴 애니메이션 ${normalLong.length}개 · 스타일 변화 프레임 ${normal.entry.styleFrames + normal.trans.styleFrames} (표본이 눈 먼 상태인지 가늠용)` },
      { type: '움직임 줄이기 모드의 무한 반복', description: reducedInfinite.map(fmt).join(' / ') || '없음' },
    );

    const problems: string[] = [];
    if (reduced.status !== 200) problems.push(`/ → HTTP ${reduced.status}`);
    if (!reduced.reducedOn) problems.push('prefers-reduced-motion: reduce 가 브라우저에 적용되지 않음(시험 설정 오류)');
    if (reduced.navError) problems.push(reduced.navError);
    for (const a of reducedLong) problems.push(`움직임 줄이기인데 도는 애니메이션: ${fmt(a)}`);
    const styleFrames = reduced.entry.styleFrames + reduced.trans.styleFrames;
    if (styleFrames >= 12) problems.push(`움직임 줄이기인데 JS 가 ${styleFrames} 프레임에 걸쳐 인라인 style 을 계속 바꿈(스크립트 연출이 안 꺼짐)`);
    assertNoProblems('움직임 줄이기', problems);
  });

  test('11. 첫 화면 전송량 2MB 이하(영상 · 유튜브 제외) · 한글 웹폰트는 서브셋', async ({ page, context }, testInfo) => {
    const LIMIT = 2 * 1024 * 1024;
    const FONT_MAX = 300 * 1024; // 서브셋이면 한 파일이 이 안쪽. 통짜 한글 폰트는 보통 1MB 이상.
    const problems: string[] = [];
    const kb = (n: number) => `${(n / 1024).toFixed(0)}KB`;

    for (const room of ROOMS) {
      const m = await measureLanding(page, context, room.path);
      if (m.status !== 200) {
        problems.push(`${room.path} → HTTP ${m.status} (방이 없음 — 전송량을 못 잼)`);
        continue;
      }
      const nm = (u: string) => {
        const pn = new URL(u).pathname;
        return path.basename(pn) || pn || u;
      };
      if (m.totalBytes > LIMIT) {
        problems.push(`${room.path}: 첫 화면 ${kb(m.totalBytes)} > 2048KB — 큰 것: ${m.top.map((t) => `${nm(t.url)} ${kb(t.bytes)}`).join(', ')}`);
      }
      for (const f of m.fonts) {
        const msg = `웹폰트 ${nm(f.url)} ${kb(f.bytes)} > ${kb(FONT_MAX)} (서브셋이 아닌 통짜로 보임)`;
        if (f.bytes > FONT_MAX && !problems.some((p) => p.endsWith(msg))) problems.push(`${room.path}: ${msg}`);
      }
    }
    assertNoProblems(`첫 화면 전송량 · ${testInfo.project.name}`, problems);
  });

  // ───────────────────────────── 부가 시험 (11개 밖 — 표식이 없으면 위 시험이 헛돌기 때문) ─────────────────────────────

  test('+A. 작품 상세: 첫 화면 = 후킹(data-hook · 로컬 클립 · 출처.json) · 풀영상(data-video)은 접힘선 아래 · 표식', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const { map: sources, error: srcErr } = loadSources();
    if (srcErr) problems.push(srcErr);

    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st} (방이 없음)`);
        continue;
      }
      await settle(page, Math.min(SETTLE_MS, 1000));

      // (a) 후킹 구역이 첫 화면(뷰포트 안)에 있고, 그 안 <video> 가 public/media/ 파일이며 출처.json 에 있다
      let hook = await page.evaluate(hookProbe);
      if (hook.found && hook.textLen < 8) {
        // 대본이 타이핑되는 중일 수 있다 — 조금 기다렸다 다시 본다
        await page.waitForTimeout(2_500);
        hook = await page.evaluate(hookProbe);
      }
      if (!hook.found) problems.push(`${p}: ${SEL.hook} 없음`);
      else {
        if (hook.workRoot !== w.slug) problems.push(`${p}: ${SEL.hook} 가 ${SEL.work(w.slug)} 안에 있지 않음 (조상 data-work="${hook.workRoot}")`);
        const shown = Math.min(hook.bottom, hook.vh) - Math.max(hook.top, 0);
        const need = Math.min(hook.bottom - hook.top, hook.vh) * 0.5;
        if (!(shown > 0 && shown >= need)) {
          problems.push(`${p}: ${SEL.hook} 가 첫 화면에 없음 (y ${Math.round(hook.top)}~${Math.round(hook.bottom)} / 화면 높이 ${hook.vh}, 보이는 부분 ${Math.round(Math.max(shown, 0))}px)`);
        }
        if (hook.videoCount === 0) problems.push(`${p}: ${SEL.hook} 안에 <video> 없음`);
        if (hook.videoCount > 0 && hook.srcs.length === 0) problems.push(`${p}: ${SEL.hookVideo} 에 src(또는 <source src>)가 없음`);
        for (const src of hook.srcs) {
          if (!src.startsWith('/media/')) {
            problems.push(`${p}: 후킹 클립 src ${src} 가 /media/ 밖`);
            continue;
          }
          const rel = decodeURIComponent(src.slice('/media/'.length));
          if (!fs.existsSync(path.join(MEDIA_DIR, rel))) problems.push(`${p}: 후킹 클립 public/media/${rel} 파일이 없음`);
          const s = (sources.get(rel) ?? sources.get(path.posix.basename(rel)) ?? '').trim();
          if (!s) problems.push(`${p}: 후킹 클립 public/media/${rel} 가 출처.json 에 없음`);
        }
        if (hook.textLen < 8) problems.push(`${p}: ${SEL.hook} 안에 대본 글자가 거의 없음(${hook.textLen}자 — 타이핑이 안 나옴)`);
      }

      // (c) 풀영상(data-video, 유튜브)은 첫 화면 아래 — 스크롤해야 보인다
      const v = page.locator(SEL.video).first();
      if ((await v.count()) === 0) problems.push(`${p}: ${SEL.video} 없음`);
      else {
        const pos = await v.evaluate((el) => {
          window.scrollTo(0, 0);
          return { top: el.getBoundingClientRect().top, vh: window.innerHeight };
        });
        if (pos.top < pos.vh - 8) problems.push(`${p}: 풀영상 ${SEL.video} 가 첫 화면 안에 있음 (위쪽 y ${Math.round(pos.top)} < 화면 높이 ${pos.vh}) — 접힘선 아래여야 함`);
        const ratio = await v.getAttribute('data-ratio');
        if (ratio !== w.ratio) problems.push(`${p}: data-ratio="${ratio}" (기대 ${w.ratio})`);
      }

      for (const [name, sel] of [['대본', SEL.script], ['크레딧', SEL.credit], ['과정', SEL.process]] as const) {
        if ((await page.locator(sel).count()) === 0) problems.push(`${p}: ${name} ${sel} 없음`);
      }
    }
    assertNoProblems(`작품 상세 첫 화면 · 표식 · ${testInfo.project.name}`, problems);
  });

  test('+B. 홈: 한 화면(스크롤 없음) · 출입구 4개가 화면 안 네 모서리에 하나씩', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const st = await visit(page, '/');
    if (st !== 200) problems.push(`/ → HTTP ${st}`);
    await settle(page, Math.min(SETTLE_MS, 1000));
    const scrolls = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    if (scrolls > 4) problems.push(`홈이 한 화면을 ${scrolls}px 넘어 스크롤됨(홈은 스크롤 없음)`);
    const vp = page.viewportSize()!;
    const quadrants = new Map<string, string>();
    for (const k of DOORS) {
      const door = page.locator(SEL.door(k)).first();
      if ((await door.count()) === 0) {
        problems.push(`${SEL.door(k)} 없음`);
        continue;
      }
      const box = await door.boundingBox();
      if (!box || box.x < 0 || box.y < 0 || box.x + box.width > vp.width + 0.5 || box.y + box.height > vp.height + 0.5) {
        problems.push(`${SEL.door(k)} 가 화면 밖`);
        continue;
      }
      const q = `${box.y + box.height / 2 < vp.height / 2 ? '위' : '아래'}${box.x + box.width / 2 < vp.width / 2 ? '왼쪽' : '오른쪽'}`;
      if (quadrants.has(q)) problems.push(`출입구 ${k} 와 ${quadrants.get(q)} 가 같은 모서리(${q})에 있음 — 네 모서리에 하나씩이어야 함`);
      quadrants.set(q, k);
    }
    assertNoProblems(`홈 출입구 배치 · ${testInfo.project.name}`, problems);
  });

  // ───────────────────────────── 작품 안 목차 (3절: data-toc · data-toc-item · data-step) ─────────────────────────────
  const mapKey = (key: string) => (key.startsWith('#') ? (STEPS[Number(key.slice(1))] ?? key) : key);
  const sameSet = (a: readonly string[], b: readonly string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

  test('+C. 작품 상세 목차: 항목 5 ↔ 단계 5 짝 · 누르면 그 단계가 화면에 옴 · 스크롤하면 aria-current="step" 이 옮겨 감', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st} (방이 없음)`);
        continue;
      }
      await settle(page, 600);
      const s0 = await page.evaluate(tocState);
      if (!s0.hasToc) {
        problems.push(`${p}: [data-toc] 없음`);
        continue;
      }

      // (a) 항목 5개 ↔ 단계 5개
      const before = problems.length;
      const keys = s0.items.map((i) => mapKey(i.key));
      if (s0.items.length !== STEPS.length) problems.push(`${p}: [data-toc-item] ${s0.items.length}개 (5개여야 함)`);
      if (!sameSet(keys, STEPS)) problems.push(`${p}: 목차 항목 [${keys.join(', ')}] 가 단계 [${STEPS.join(', ')}] 와 짝이 안 맞음`);
      if (!sameSet(s0.steps, STEPS)) problems.push(`${p}: [data-step] 가 [${s0.steps.join(', ')}] (video · script · generate · edit · credit 각 1개여야 함)`);
      if (problems.length > before) continue;

      // (b) 항목을 누르면 그 단계가 화면 안으로 온다
      for (let i = 0; i < s0.items.length; i++) {
        const key = mapKey(s0.items[i].key);
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }));
        await page.waitForTimeout(150);
        const item = page.locator('[data-toc] [data-toc-item]').nth(i);
        const inner = item.locator('a, button');
        const target = (await inner.count()) > 0 ? inner.first() : item;
        try {
          await target.click({ timeout: 4_000 });
        } catch (e) {
          problems.push(`${p}: 목차 항목 ${key} 를 누를 수 없음 — ${(e as Error).message.split('\n')[0]}`);
          continue;
        }
        for (const why of await pollProblems(page, stepVisibleProbe, 3_000, 200, key)) problems.push(`${p}: 목차 ${key} 를 눌렀는데 ${why}`);
      }

      // (c) 스크롤해서 단계가 바뀌면 aria-current="step" 이 따라 옮겨 간다 (내려갔다 올라오기)
      const order = [...s0.steps, ...[...s0.steps].reverse()];
      for (const key of order) {
        const moved = await page.evaluate(scrollToStep, key);
        if (!moved) {
          problems.push(`${p}: [data-step="${key}"] 없음`);
          continue;
        }
        const end = Date.now() + 2_500;
        let cur: string[] = [];
        let ok = false;
        while (Date.now() < end) {
          await page.waitForTimeout(200);
          const s = await page.evaluate(tocState);
          cur = s.items.filter((i) => i.current === 'step').map((i) => mapKey(i.key));
          if (cur.length === 1 && cur[0] === key) {
            ok = true;
            break;
          }
        }
        if (!ok) problems.push(`${p}: 단계 ${key} 를 보는데 aria-current="step" 인 항목이 [${cur.join(', ') || '없음'}]`);
      }
    }
    assertNoProblems(`작품 안 목차 · ${testInfo.project.name}`, problems);
  });

  test('+D. 작품 상세 목차가 스크롤 중에도 화면 안에 남는다(고정)', { tag: '@desktop' }, async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st} (방이 없음)`);
        continue;
      }
      await settle(page, 600);
      if ((await page.locator('[data-toc]').count()) === 0) {
        problems.push(`${p}: [data-toc] 없음`);
        continue;
      }
      // 단계 구역에 들어선 뒤부터 맨 아래까지 다섯 지점
      const range = await page.evaluate(() => {
        const first = document.querySelector('[data-step]');
        const start = first ? first.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4 : 0;
        return { start: Math.max(start, 0), max: Math.max(document.documentElement.scrollHeight - window.innerHeight, 0) };
      });
      for (let k = 0; k < 5; k++) {
        const y = Math.round(range.start + ((range.max - range.start) * k) / 4);
        await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' as ScrollBehavior }), y);
        await page.waitForTimeout(250);
        const r = await page.evaluate(() => {
          const t = document.querySelector<HTMLElement>('[data-toc]');
          if (!t) return null;
          const b = t.getBoundingClientRect();
          const vis = t.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions);
          return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, vh: window.innerHeight, vw: window.innerWidth, vis };
        });
        if (!r) problems.push(`${p}: [data-toc] 사라짐`);
        else if (!r.vis || r.top < -0.5 || r.left < -0.5 || r.bottom > r.vh + 0.5 || r.right > r.vw + 0.5) {
          problems.push(`${p} (스크롤 ${y}px): 목차가 화면 밖/숨김 (y ${Math.round(r.top)}~${Math.round(r.bottom)}, x ${Math.round(r.left)}~${Math.round(r.right)} / 화면 ${r.vw}x${r.vh}${r.vis ? '' : ', 숨김'})`);
        }
      }
    }
    assertNoProblems(`목차 고정 · ${testInfo.project.name}`, problems);
  });

  test('+E. 모바일 390 에서 목차가 가로로 넘치지 않는다', { tag: '@mobile' }, async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const st = await visit(page, p);
      if (st !== 200) {
        problems.push(`${p} → HTTP ${st} (방이 없음)`);
        continue;
      }
      await settle(page, 600);
      if ((await page.locator('[data-toc]').count()) === 0) {
        problems.push(`${p}: [data-toc] 없음`);
        continue;
      }
      const max = await page.evaluate(() => Math.max(document.documentElement.scrollHeight - window.innerHeight, 0));
      for (const y of [0, Math.round(max / 2), max]) {
        await page.evaluate((yy) => window.scrollTo({ top: yy, behavior: 'instant' as ScrollBehavior }), y);
        await page.waitForTimeout(200);
        const why = await page.evaluate(() => {
          const out: string[] = [];
          const t = document.querySelector<HTMLElement>('[data-toc]');
          if (!t) return ['[data-toc] 사라짐'];
          const vw = window.innerWidth;
          if (t.scrollWidth > t.clientWidth + 1) out.push(`목차 안쪽이 가로로 넘침 (scrollWidth ${t.scrollWidth} > clientWidth ${t.clientWidth})`);
          const b = t.getBoundingClientRect();
          if (b.left < -0.5 || b.right > vw + 0.5) out.push(`목차 상자가 화면 밖 (x ${Math.round(b.left)}~${Math.round(b.right)} / 화면 ${vw})`);
          t.querySelectorAll<HTMLElement>('[data-toc-item]').forEach((el, i) => {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && (r.left < -0.5 || r.right > vw + 0.5)) out.push(`항목 ${i + 1} 이 화면 밖 (x ${Math.round(r.left)}~${Math.round(r.right)} / 화면 ${vw})`);
          });
          return out;
        });
        for (const m of why) problems.push(`${p} (스크롤 ${y}px): ${m}`);
      }
    }
    assertNoProblems(`목차 가로 넘침 · ${testInfo.project.name}`, [...new Set(problems)]);
  });

  // 작가 10-13 「대본 써지면서 옆에 파앗 하면서 영상이 떠야지」 — 시안 히어로_v1 연출(종이 | 간격 | 화면, 줄 → 연결선 → 슬릿 → 열림 + 앰비언트)
  test('+F. 후킹(히어로 v1): (a) 처음엔 화면이 닫혀 있고 대본 첫 줄이 다 쳐진 뒤 열린다 (b) 열린 뒤 앰비언트가 보이고 영상 가운데 맨 위는 video (c) 종이와 화면 사이 가로 간격 ≥ 60px', async ({ page }, testInfo) => {
    const problems: string[] = [];
    // 프레임마다 표본: 화면(클립 틀)의 보이는 높이 · 대본 첫 줄이 쳐진 글자 수 — 페이지 스크립트보다 먼저 심는다
    await page.addInitScript(() => {
      type S = { t: number; vis: number; h: number; typed: number; len: number };
      const w = window as unknown as { __hookS: S[] };
      w.__hookS = [];
      const tick = () => {
        const hook = document.querySelector<HTMLElement>('[data-hook]');
        const fr = hook?.querySelector<HTMLElement>('[data-hook-frame]');
        if (hook && fr) {
          const r = fr.getBoundingClientRect();
          let vis = r.height;
          const m = /inset\(([^)]*)\)/.exec(getComputedStyle(fr).clipPath);
          if (m) {
            const p = m[1].trim().split(/\s+/);
            const px = (s: string) => (s.endsWith('%') ? (parseFloat(s) / 100) * r.height : parseFloat(s) || 0);
            vis = Math.max(0, r.height - px(p[0]) - px(p[2] ?? p[0]));
          }
          // 「대본 첫 줄」 = 종이에서 처음 쳐지는 줄(흐린 앞 지문 다음의 첫 [data-line])
          const first = hook.querySelector<HTMLElement>('[data-script] [data-line]');
          const on = first?.querySelector('.on');
          const off = first?.querySelector('.off');
          const typed = on ? (on.textContent ?? '').length : -1;
          const len = on && off ? typed + (off.textContent ?? '').length : -1;
          w.__hookS.push({ t: performance.now(), vis, h: r.height, typed, len });
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const res = await page.goto(p, { waitUntil: 'commit' });
      if ((res?.status() ?? 0) !== 200) {
        problems.push(`${p} → HTTP ${res?.status()}`);
        continue;
      }
      // 연출이 끝나 완성 상태(.done)가 될 때까지 — 입력을 주지 않는다(입력 = 즉시 완성이라 연출을 못 본다)
      const finished = await page
        .waitForFunction(() => document.querySelector('[data-hook]')?.classList.contains('done') === true, null, { timeout: 12_000, polling: 100 })
        .then(() => true)
        .catch(() => false);
      if (!finished) problems.push(`${p}: 12초 안에 연출이 끝나지 않음([data-hook].done 이 안 붙음)`);
      await page.waitForTimeout(400);

      // (a) 닫힘 → 첫 줄 다 쳐짐 → 열림
      const S = await page.evaluate(() => (window as unknown as { __hookS: { t: number; vis: number; h: number; typed: number; len: number }[] }).__hookS);
      if (S.length < 10) problems.push(`${p}: 표본이 너무 적음(${S.length})`);
      else {
        if (S[0].vis > 2) problems.push(`${p}: (a) 처음부터 화면이 열려 있음 — 첫 표본의 보이는 높이 ${Math.round(S[0].vis)}px / ${Math.round(S[0].h)}px (닫힌 슬릿에서 시작해야 함)`);
        const k = S.findIndex((s) => s.vis > 2);
        if (k < 0) problems.push(`${p}: (a) 화면이 끝까지 열리지 않음`);
        else {
          const at = S[k];
          if (!(at.len > 0 && at.typed >= at.len)) problems.push(`${p}: (a) 대본 첫 줄이 다 쳐지기 전에 화면이 열림 — 열리기 시작할 때 ${at.typed}/${at.len}자`);
          const typedBefore = S.slice(0, k).some((s) => s.typed > 0 && s.vis <= 2);
          if (!typedBefore) problems.push(`${p}: (a) 화면이 닫힌 동안 대본이 쳐지는 구간이 없음`);
          if (!S.some((s) => s.vis >= s.h - 2)) problems.push(`${p}: (a) 화면이 다 열리지 않음(최대 ${Math.round(Math.max(...S.map((s) => s.vis)))}px)`);
        }
      }

      // (b) 앰비언트(화면 뒤 빛)가 보이고, 영상 상자 가운데의 맨 위는 영상 자신
      const b = await page.evaluate(() => {
        const out: string[] = [];
        const hook = document.querySelector<HTMLElement>('[data-hook]')!;
        const v = hook.querySelector<HTMLVideoElement>('video');
        const amb = hook.querySelector<HTMLCanvasElement>('[data-hook-ambient]');
        if (!v) return ['영상 없음'];
        if (!amb) return ['앰비언트 캔버스 [data-hook-ambient] 없음'];
        window.scrollTo(0, 0);
        const op = parseFloat(getComputedStyle(amb).opacity);
        if (!(op > 0)) out.push(`앰비언트 캔버스 opacity ${op} (보여야 함)`);
        if (getComputedStyle(amb).display === 'none' || getComputedStyle(amb).visibility === 'hidden') out.push('앰비언트 캔버스가 숨겨짐');
        try {
          const d = amb.getContext('2d')!.getImageData(0, 0, amb.width, amb.height).data;
          let lit = 0;
          for (let i = 3; i < d.length; i += 4) if (d[i] > 0) lit++;
          if (lit === 0) out.push('앰비언트 캔버스에 그려진 영상 빛이 없음(빈 캔버스)');
        } catch (e) {
          out.push(`앰비언트 캔버스를 읽을 수 없음: ${(e as Error).message}`);
        }
        const r = v.getBoundingClientRect();
        const a = amb.getBoundingClientRect();
        if (!(a.width > r.width && a.height > r.height)) out.push(`앰비언트가 화면 둘레로 번지지 않음(캔버스 ${Math.round(a.width)}x${Math.round(a.height)} ≤ 화면 ${Math.round(r.width)}x${Math.round(r.height)})`);
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (top !== v) out.push(`영상 상자 가운데의 맨 위가 영상이 아님: <${top?.tagName.toLowerCase()} class="${(top as HTMLElement | null)?.className ?? ''}">`);
        // 캔버스는 영상 뒤에 깔려야 한다 — 눌림을 무시하고 겹친 순서를 보면 영상이 캔버스보다 위
        const st = document.createElement('style');
        st.textContent = '[data-hook-ambient]{pointer-events:auto !important}';
        document.head.appendChild(st);
        const stack = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        st.remove();
        const iv = stack.indexOf(v);
        const ia = stack.indexOf(amb);
        if (ia >= 0 && iv >= 0 && ia < iv) out.push('앰비언트 캔버스가 영상 위에 겹침(영상 뒤여야 함)');
        return out;
      });
      for (const m of b) problems.push(`${p}: (b) ${m}`);

      // (c) 종이와 화면을 떼어 놓는다 — 그 사이가 연결선 · 타임코드 자리
      const gap = await page.evaluate(() => {
        const hook = document.querySelector<HTMLElement>('[data-hook]')!;
        const paper = hook.querySelector<HTMLElement>('[data-script]');
        const v = hook.querySelector<HTMLVideoElement>('video');
        if (!paper || !v) return null;
        return v.getBoundingClientRect().left - paper.getBoundingClientRect().right;
      });
      if (gap == null) problems.push(`${p}: (c) 후킹 안에 대본 [data-script] 또는 영상이 없음`);
      else if (gap < 60) problems.push(`${p}: (c) 종이와 화면 사이 간격 ${Math.round(gap)}px (60px 이상이어야 함 — 한 틀로 붙이지 않는다)`);
    }
    assertNoProblems(`후킹 연출(히어로 v1) · ${testInfo.project.name}`, problems);
  });
});
