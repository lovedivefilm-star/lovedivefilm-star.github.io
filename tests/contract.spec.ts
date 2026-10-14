/**
 * 규약 시험 — docs/contract.md 4절. v5 1단계(메인 10-14): 홈 = 같은 규격 세로 카드 5장 · 상단 바 연락(mailto + 복사) — docs/review-gate.md 5-1 합격선 중 홈 몫.
 * 작품 방(영상 먼저 히어로 · 한 컷이 만들어진 순서 · 툴 2×2 · 이전/다음 · 작가 지시 편집)은 v4 시험 그대로(2단계에서 바꾼다).
 * 실패하면 사이트를 고친다. 시험을 느슨하게 고치지 않는다.
 * 태그: @once = 화면 크기와 무관(1440 에서만). 없음 = 1440 · 1280 둘 다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { AUTHOR_EDITS } from '../src/data/edits';
import {
  ABSENT_ROOMS,
  ANALYSIS_ROOT,
  FORBIDDEN_WORDS,
  HOME_CARDS,
  CONTEST_WORDS_KO,
  CONTEST_WORD_OYE,
  CUT_STEPS,
  HERO_MS,
  IMG_VIDEO_EXT,
  MAIN_WORKS,
  MEDIA_DIR,
  PROCESS_DOC_DIR,
  PUBLIC_DIR,
  RASTER_VIDEO_EXT,
  ROOMS,
  SEL,
  SOURCE_FORM,
  SRC_DIR,
  TOOL_WORKS,
  WALL_HOLD_FILES,
  WORKS,
  WORK_ROOMS,
  assertNoProblems,
  boxProbe,
  contactEmail,
  measureLanding,
  mediaRefs,
  motionProbe,
  overlayProbe,
  pageTexts,
  readSources,
  RESTRAINT,
  screenStats,
  settle,
  test,
  toCutStep,
  visibleFontSizes,
  visit,
  walkFiles,
  type Work,
} from './helpers';

const norm = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
const TOOLS_ROOM = ROOMS.find((x) => x.kind === 'tools')!;

/** 같은 페이지 안에서 칸에 youtube-nocookie iframe 이 생기는지(새 탭 · 이동 금지) */
async function expectPlayed(page: Page, cellSel: string, w: Work, label: string, start?: number): Promise<string[]> {
  const problems: string[] = [];
  const cell = page.locator(cellSel).first();
  const iframe = cell.locator('iframe[src*="youtube-nocookie.com"]').first();
  try {
    await iframe.waitFor({ state: 'attached', timeout: 4_000 });
  } catch {
    return [`${label}: 누른 뒤 영상 칸 안에 youtube-nocookie iframe 이 생기지 않음`];
  }
  const src = (await iframe.getAttribute('src')) ?? '';
  if (!src.includes(`/embed/${w.yt}`)) problems.push(`${label}: iframe src 에 /embed/${w.yt} 가 없음 (${src})`);
  if (start !== undefined && !new RegExp(`[?&]start=${start}(&|$)`).test(src)) problems.push(`${label}: iframe src 에 start=${start} 가 없음 (${src})`);
  const a = await cell.boundingBox();
  const b = await iframe.boundingBox();
  if (a && b) {
    const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    if (cx < a.x - 2 || cx > a.x + a.width + 2 || cy < a.y - 2 || cy > a.y + a.height + 2) problems.push(`${label}: iframe 이 영상 칸 밖에 생김`);
  }
  return problems;
}

async function guardNav(page: Page, fn: () => Promise<void>): Promise<string[]> {
  const problems: string[] = [];
  const before = page.url();
  const pages = page.context().pages().length;
  let popups = 0;
  const onPopup = (p: Page) => {
    popups++;
    p.close().catch(() => {});
  };
  page.on('popup', onPopup);
  try {
    await fn();
  } finally {
    page.off('popup', onPopup);
  }
  if (page.url() !== before) problems.push(`주소가 바뀜 ${before} → ${page.url()}`);
  if (page.context().pages().length !== pages || popups) problems.push('새 탭/창이 열림');
  return problems;
}

test.describe('v4 규약(contract.md 4절)', () => {
  test('V-1. 방 존재 — 홈 · 작품 방 3 · 툴 방이 열리고, 작품 목록 · 소개 · 연락 · 경력 방은 없다(404)', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const r of ROOMS) {
      const st = await visit(page, r.path);
      if (st !== 200) problems.push(`${r.path} → HTTP ${st}`);
    }
    for (const w of MAIN_WORKS) {
      await visit(page, `/works/${w.slug}/`);
      if ((await page.locator(SEL.work(w.slug)).count()) !== 1) problems.push(`/works/${w.slug}/: [data-work="${w.slug}"] 가 하나가 아님`);
    }
    await visit(page, '/tools/');
    for (const w of TOOL_WORKS) if ((await page.locator(SEL.tool(w.slug)).count()) !== 1) problems.push(`/tools/: [data-tool="${w.slug}"] 없음`);
    await visit(page, '/?skipIntro');
    if ((await page.locator(`${SEL.cards} > [data-card]`).count()) !== 5) problems.push('/: 홈 카드 5장 [data-cards] > [data-card] 가 아님');
    for (const p of ABSENT_ROOMS) {
      const st = await visit(page, p);
      if (st !== 404) problems.push(`${p} → HTTP ${st} (있으면 안 되는 방)`);
    }
    assertNoProblems('방 존재', problems);
  });

  test('V-2. 콘솔 오류 0 — 전 방 · 홈 인트로 입장 · 조각 호버 재생 · 크게 읽기 · 주소 복사 · 영상 재생 · 과정 걸음 · 요청 실패 · 4xx/5xx 포함', async ({ page }, testInfo) => {
    const problems: string[] = [];
    let where = '(시작)';
    page.on('console', (m) => m.type() === 'error' && problems.push(`[${where}] console.error: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`[${where}] pageerror: ${e.message.split('\n')[0]}`));
    page.on('requestfailed', (r) => {
      const err = r.failure()?.errorText ?? '';
      if (!/ERR_ABORTED/.test(err)) problems.push(`[${where}] 요청 실패: ${r.url()} (${err})`);
    });
    page.on('response', (r) => r.status() >= 400 && problems.push(`[${where}] HTTP ${r.status()}: ${r.url()}`));
    where = '/ 첫 방문 인트로 → 입장';
    await visit(page, '/');
    await settle(page, 1000);
    await page.mouse.wheel(0, 120);
    await settle(page, 1600);
    where = '/ 조각 호버 · 크게 읽기 · 복사';
    await page.hover(`${SEL.cardLink('butter')} [data-card-media]`);
    await settle(page, 900);
    await page.click(SEL.readerOpen);
    await settle(page, 400);
    await page.keyboard.press('Escape');
    await page.click(SEL.copy);
    await settle(page, 300);
    for (const r of ROOMS) {
      where = r.path;
      await visit(page, r.path);
      await settle(page, 1200);
      if (r.kind === 'work') for (const k of [1, 2, 3, 4]) await toCutStep(page, k, 500);
      const btn = page.locator(SEL.play).first();
      if (await btn.count()) {
        where = `${r.path} 재생`;
        await btn.click();
        await settle(page, 600);
      }
    }
    assertNoProblems(`콘솔 오류 · ${testInfo.project.name}`, [...new Set(problems)]);
  });

  test('V-3. 영상 위 덮개 0 — 재생 전(후킹 클립 · 포스터) · 재생 후(iframe) 모두', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const check = async (label: string) => {
      const r = await page.evaluate(overlayProbe, { sel: SEL.video, tag: 'video' });
      if (r.count === 0) problems.push(`${label}: 보이는 영상 칸이 없음`);
      for (const p of r.problems) problems.push(`${label} ${p}`);
    };
    for (const r of [...WORK_ROOMS, TOOLS_ROOM]) {
      await visit(page, r.path);
      await settle(page, HERO_MS);
      await check(`${r.path} 재생 전`);
      await page.locator(SEL.play).first().click();
      await settle(page, 800);
      await check(`${r.path} 재생 후`);
    }
    assertNoProblems(`영상 위 덮개 · ${testInfo.project.name}`, problems);
  });

  test('V-4. 페이지 안 재생 — 「▶ 풀영상 재생」 · 클립 직접 클릭 · 툴 4편 모두 같은 자리 iframe(새 탭 · 이동 금지)', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      await visit(page, p);
      await settle(page, HERO_MS);
      problems.push(...(await guardNav(page, () => page.locator(SEL.play).first().click())).map((m) => `${p} 재생 줄: ${m}`));
      problems.push(...(await expectPlayed(page, `${SEL.vbox} ${SEL.video}`, w, `${p} 재생 줄`)));
      await visit(page, p);
      await settle(page, HERO_MS);
      problems.push(...(await guardNav(page, () => page.locator(`${SEL.video} .hook`).first().click())).map((m) => `${p} 클립: ${m}`));
      problems.push(...(await expectPlayed(page, `${SEL.vbox} ${SEL.video}`, w, `${p} 클립`)));
    }
    for (const w of TOOL_WORKS) {
      await visit(page, '/tools/');
      await settle(page, 600);
      problems.push(...(await guardNav(page, () => page.locator(`${SEL.tool(w.slug)} .play`).click())).map((m) => `/tools/ ${w.slug}: ${m}`));
      problems.push(...(await expectPlayed(page, `${SEL.tool(w.slug)} ${SEL.video}`, w, `/tools/ ${w.slug}`)));
    }
    assertNoProblems('페이지 안 재생', problems);
  });

  test('V-5. 공모전 낱말 0 · 금지 낱말(블로킹맵 · 세그먼트 · 테이크) 0 — 화면 글자(숨은 글 · alt · meta 포함) · 각 방 HTML · public 의 글 파일', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    const check = (label: string, s: string) => {
      const sq = s.replace(/\s+/g, '');
      for (const w of CONTEST_WORDS_KO) if (sq.includes(w)) problems.push(`${label}: 「${w}」`);
      if (CONTEST_WORD_OYE.test(s)) problems.push(`${label}: 「OYE」`);
    };
    for (const r of [...ROOMS, { path: '/' }, { path: '/없는-주소/' }]) {
      await visit(page, r.path);
      const txt = (await page.evaluate(pageTexts)).join('\n');
      check(`${r.path} 글자`, txt);
      check(`${r.path} HTML`, await page.content());
      for (const w of FORBIDDEN_WORDS) if (w.test(txt)) problems.push(`${r.path} 글자: 금지 낱말 ${w}(review-gate 2절)`);
    }
    for (const f of walkFiles(PUBLIC_DIR).filter((f) => /\.(json|txt|html?|svg|css|js|mjs|xml|md|vtt|srt)$/i.test(f))) check(`public/${f}`, fs.readFileSync(path.join(PUBLIC_DIR, f), 'utf8'));
    assertNoProblems('공모전 낱말', problems);
  });

  test('V-6. 미디어 출처 — public/media 의 이미지 · 영상은 전부 media-sources.json 에 출처 · 페이지는 /media/ 밖 이미지를 끌어오지 않는다 · 보류 칸 0', { tag: '@once' }, async ({ page, baseURL }) => {
    const problems: string[] = [];
    let sources = new Map<string, string>();
    try {
      sources = readSources(fs.readFileSync(path.join(SRC_DIR, 'data', 'media-sources.json'), 'utf8'));
    } catch (e) {
      problems.push(`media-sources.json 을 읽을 수 없음: ${(e as Error).message}`);
    }
    for (const f of walkFiles(MEDIA_DIR).filter((f) => IMG_VIDEO_EXT.test(f))) {
      const s = (sources.get(f) ?? sources.get(path.posix.basename(f)) ?? '').trim();
      if (!s) problems.push(`출처 없음: public/media/${f}`);
      else if (!SOURCE_FORM.test(s)) problems.push(`출처 꼴이 아님: public/media/${f} → "${s}"`);
    }
    for (const f of walkFiles(PUBLIC_DIR)) if (!f.startsWith('media/') && IMG_VIDEO_EXT.test(f)) problems.push(`public/${f}: 이미지 · 영상은 public/media/ 에`);
    for (const f of walkFiles(SRC_DIR)) if (RASTER_VIDEO_EXT.test(f)) problems.push(`src/${f}: 이미지 · 영상은 public/media/ 에`);
    const origin = new URL(baseURL ?? 'http://localhost:4322').origin;
    for (const r of [...ROOMS, { path: '/' }, { path: '/없는-주소/' }]) {
      await visit(page, r.path);
      for (const href of await page.evaluate(mediaRefs)) {
        const u = new URL(href);
        if (u.origin !== origin) problems.push(`${r.path}: 외부 이미지 · 영상 ${href}`);
        else if (!u.pathname.startsWith('/media/')) problems.push(`${r.path}: /media/ 밖 ${u.pathname}`);
        else if (!fs.existsSync(path.join(MEDIA_DIR, decodeURIComponent(u.pathname.slice(7))))) problems.push(`${r.path}: 파일 없음 ${u.pathname}`);
        if (WALL_HOLD_FILES.test(u.pathname)) problems.push(`${r.path}: 작가 확인 전 칸(뮤직비디오 face) ${u.pathname}`);
      }
    }
    assertNoProblems('미디어 출처', [...new Set(problems)]);
  });

  test('V-7. 첫 화면 전송량 2MB 이하(영상 · 유튜브 제외) · 한글 웹폰트는 서브셋', async ({ page, context }, testInfo) => {
    const problems: string[] = [];
    const kb = (n: number) => `${(n / 1024).toFixed(0)}KB`;
    for (const r of [{ path: '/' }, ...ROOMS]) {
      const m = await measureLanding(page, context, r.path);
      if (m.totalBytes > 2 * 1024 * 1024) problems.push(`${r.path}: ${kb(m.totalBytes)} > 2048KB — ${m.top.map((t) => `${path.basename(new URL(t.url).pathname)} ${kb(t.bytes)}`).join(', ')}`);
      for (const f of m.fonts) if (f.bytes > 300 * 1024) problems.push(`${r.path}: 웹폰트 ${f.url} ${kb(f.bytes)} (서브셋 아님)`);
      testInfo.annotations.push({ type: '전송량', description: `${r.path} ${kb(m.totalBytes)}` });
    }
    assertNoProblems(`첫 화면 전송량 · ${testInfo.project.name}`, problems);
  });

  test('V-8. 화면에 빈자리 표시 0 — [… 자리] · [확인 후] · 점선 상자 · data-placeholder 없음', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const r of [...ROOMS, { path: '/' }]) {
      await visit(page, r.path);
      const t = (await page.evaluate(pageTexts)).join('\n');
      for (const m of t.match(/\[[^\]\n]*(자리|확인 후|작가 문구|비움)[^\]\n]*\]/g) ?? []) problems.push(`${r.path}: 「${m}」`);
      if (await page.locator('[data-placeholder]').count()) problems.push(`${r.path}: [data-placeholder] 가 있음`);
      const dashed = await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>('body *')).filter((e) => /dashed|dotted/.test(getComputedStyle(e).borderTopStyle + getComputedStyle(e).borderBottomStyle)).length);
      if (dashed) problems.push(`${r.path}: 점선 테두리 ${dashed}개`);
    }
    assertNoProblems('빈자리 표시', problems);
  });

  test('V-9. 글자 크기 단계 — 홈 ≤ 5(review-gate 3절) · 작품 방 첫 화면 ≤ 6', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const sizes = async (label: string, max: number) => {
      const r = await page.evaluate(visibleFontSizes);
      testInfo.annotations.push({ type: '글자 크기', description: `${label}: ${r.sizes.join(' · ')}` });
      if (r.sizes.length > max) problems.push(`${label}: ${r.sizes.length}단계 > ${max} — ${r.sizes.map((s) => `${s}px「${r.samples[String(s)]}」`).join(', ')}`);
    };
    await visit(page, '/?skipIntro');
    await settle(page, 1000);
    await sizes('홈', RESTRAINT.homeSizes);
    for (const r of WORK_ROOMS) {
      await visit(page, r.path);
      await settle(page, HERO_MS);
      await sizes(`${r.path} 첫 화면`, 6);
    }
    assertNoProblems(`글자 크기 단계 · ${testInfo.project.name}`, problems);
  });

  test('V-10. 상자(테두리 있는 칸) — 홈 0 · 작품 방 · 툴 방은 표(메타 1)와 다음 작품 위 괘선 · 과정 연결 상자뿐', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const p of ['/?skipIntro']) {
      await visit(page, p);
      await settle(page, 1500);
      const b = await page.evaluate(boxProbe);
      if (b.boxes.length || b.tables) problems.push(`${p}: 상자 ${b.boxes.length} · 표 ${b.tables} — ${b.boxes.slice(0, 5).join(', ')}`);
    }
    for (const r of [...WORK_ROOMS, TOOLS_ROOM]) {
      await visit(page, r.path);
      await settle(page, HERO_MS);
      const b = await page.evaluate(boxProbe);
      if (b.boxes.length) problems.push(`${r.path}: 표 · 다음 작품 · 과정 상자 밖 상자 ${b.boxes.length} — ${b.boxes.slice(0, 5).join(', ')}`);
      if (b.tables > 2) problems.push(`${r.path}: 표 ${b.tables}개 > 2`);
    }
    assertNoProblems('상자', problems);
  });

  test('V-11. 움직임이 진입 뒤 멈춘다 — 진입 + 3초 뒤 getAnimations(실행 중) 0 · GSAP 실행 중 0 (스크롤 걸음 제외) · 홈 카드 영상은 호버 전 멈춤', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const probe = async (label: string) => {
      const m = await page.evaluate(motionProbe);
      if (m.css.length) problems.push(`${label}: CSS/WAAPI 실행 중 ${m.css.length} — ${m.css.slice(0, 4).join(', ')}`);
      if (m.gsap !== 0) problems.push(`${label}: GSAP 실행 중 ${m.gsap}`);
    };
    await visit(page, '/');
    await settle(page, 3000);
    await probe('/ 첫 방문 인트로 대기');
    const playing = await page.locator(`${SEL.cards} video`).evaluateAll((vs) => vs.filter((v) => !(v as HTMLVideoElement).paused).length);
    if (playing) problems.push(`/: 호버 전인데 카드 영상 ${playing}개가 재생 중`);
    await visit(page, '/?skipIntro');
    await settle(page, 3000);
    await probe('/?skipIntro');
    for (const r of [...WORK_ROOMS, TOOLS_ROOM]) {
      await visit(page, r.path);
      await settle(page, HERO_MS + 3000);
      await probe(r.path);
    }
    assertNoProblems(`움직임 멈춤 · ${testInfo.project.name}`, problems);
  });

  test('V-12. 작품 방 첫 화면 — 영상 칸 60% 이상 · 제목(잘림 없음) · 대본 줄 · 메타 표(역할) 모두 보임 · 가로 넘침 없음', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const r of WORK_ROOMS) {
      await visit(page, r.path);
      await settle(page, HERO_MS);
      const m = await page.evaluate(
        ({ t, role, v, line }) => {
          const R = (s: string) => document.querySelector(s)?.getBoundingClientRect().toJSON() ?? null;
          const tEl = document.querySelector<HTMLElement>(t);
          return { vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, t: R(t), role: R(role), v: R(v), line: R(line), tw: tEl?.scrollWidth ?? 0, tc: tEl?.clientWidth ?? 0 };
        },
        { t: SEL.title, role: SEL.metaRow('role'), v: `.hero ${SEL.video}`, line: SEL.line },
      );
      const inView = (b: DOMRect | null) => !!b && b.top >= 0 && b.bottom <= m.vh && b.left >= 0 && b.right <= m.vw + 0.5;
      if (!inView(m.t as DOMRect)) problems.push(`${r.path}: 제목이 첫 화면 밖`);
      if (m.tw > m.tc + 1) problems.push(`${r.path}: 제목이 칸에 안 들어감(잘림) ${m.tw} > ${m.tc}`);
      if (!inView(m.line as DOMRect)) problems.push(`${r.path}: 대본 첫 줄이 첫 화면 밖`);
      // 9:16 은 메타 표가 영상 옆(첫 화면) · 16:9 는 영상 아래(첫 화면 작업물 ≥ 50% — 절제 규칙 6 · 메인 지시 10-14)
      if (m.v && m.v.height > m.v.width && !inView(m.role as DOMRect)) problems.push(`${r.path}: 메타 표 역할 행이 첫 화면 밖`);
      if (!m.v) problems.push(`${r.path}: 영상 칸 없음`);
      else {
        const vis = Math.max(0, Math.min(m.v.bottom, m.vh) - Math.max(m.v.top, 0)) / m.v.height;
        if (vis < 0.6) problems.push(`${r.path}: 영상 칸이 첫 화면에 ${(vis * 100).toFixed(0)}% 보임(60% 이상이어야)`);
        // 절제 규칙 6 — 첫 화면 작업물 면적 ≥ 50%. 9:16 세로 영상 한 편은 1440×900 에서 물리적으로 ≈ 24~31% 가 최대라
        // (제목 · 메타가 첫 화면에 같이 있으려면) 영상 칸 높이 ≥ 80% 화면으로 대신 잰다 — 메인 · 작가 확인 필요(보고서)
        const st = await page.evaluate(screenStats);
        const vertical = m.v.height > m.v.width;
        if (!vertical && st.media < RESTRAINT.firstMedia) problems.push(`${r.path}: 첫 화면 작업물 면적 ${(st.media * 100).toFixed(0)}% < 50%`);
        if (vertical && m.v.height < m.vh * 0.8) problems.push(`${r.path}: 세로 영상 칸 높이 ${Math.round(m.v.height)} < 화면 80%`);
        testInfo.annotations.push({ type: '영상 칸', description: `${r.path} 영상 칸 ${(vis * 100).toFixed(0)}% 보임 · 작업물 면적 ${(st.media * 100).toFixed(0)}%` });
      }
      if (m.sw > m.vw + 1) problems.push(`${r.path}: 가로 넘침 ${m.sw} > ${m.vw}`);
    }
    assertNoProblems(`작품 방 첫 화면 · ${testInfo.project.name}`, problems);
  });

  test('V-13. 홈 → 작품 방 2클릭 이내에 풀영상 재생 — 카드 3장 · 테크니컬 작업 칸 4개', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      await visit(page, '/?skipIntro');
      await settle(page, 600);
      await page.locator(SEL.cardLink(w.slug)).click(); // 클릭 1
      await page.waitForURL(`**/works/${w.slug}/`, { timeout: 6_000 }).catch(() => problems.push(`카드 ${w.slug}: 방으로 가지 않음 (${page.url()})`));
      await page.locator(SEL.work(w.slug)).waitFor({ timeout: 6_000 }).catch(() => {});
      await settle(page, 500);
      await page.locator(SEL.play).first().click(); // 클릭 2
      problems.push(...(await expectPlayed(page, `${SEL.vbox} ${SEL.video}`, w, `카드 → ${w.slug}`)));
    }
    for (const w of TOOL_WORKS) {
      await visit(page, '/?skipIntro');
      await settle(page, 600);
      await page.locator(SEL.toolCell(w.slug)).click(); // 클릭 1
      await page.waitForURL(`**/tools/#${w.slug}`, { timeout: 6_000 }).catch(() => problems.push(`칸 ${w.slug}: 툴 방 그 자리로 가지 않음 (${page.url()})`));
      await settle(page, 900);
      const box = `${SEL.tool(w.slug)} ${SEL.vbox}`;
      const top = await page.locator(SEL.tool(w.slug)).evaluate((e) => e.getBoundingClientRect().top);
      const vh = page.viewportSize()!.height;
      if (top < -2 || top > vh * 0.6) problems.push(`칸 ${w.slug}: 툴 방에서 그 영상 자리가 화면 위쪽에 오지 않음(top ${Math.round(top)})`);
      await page.locator(`${box} .play`).first().click(); // 클릭 2
      problems.push(...(await expectPlayed(page, `${box} ${SEL.video}`, w, `칸 → ${w.slug}`)));
    }
    assertNoProblems(`2클릭 재생 · ${testInfo.project.name}`, problems);
  });

  test('V-14. 연락 — 모든 방 상단 바에 mailto 링크 + 주소 복사(누르면 「복사됨」 1.5초) · 눌림 높이 ≥ 44px', { tag: '@once' }, async ({ page, context }) => {
    const problems: string[] = [];
    const email = contactEmail();
    test.info().annotations.push({ type: 'CONTACT_EMAIL', description: email || '(비어 있음)' });
    if (!email) problems.push('src/data/site.ts CONTACT_EMAIL 이 비어 있음(작가 10-14 v5 구체화 ⑦)');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    for (const r of [...ROOMS, { path: '/' }]) {
      await visit(page, r.path);
      const links = await page.locator(`header ${SEL.contact}`).evaluateAll((els) => els.map((e) => ({ href: e.getAttribute('href') ?? '', h: e.getBoundingClientRect().height, vis: (e as HTMLElement).checkVisibility() })));
      if (!links.length) problems.push(`${r.path}: 상단 바에 연락 링크 없음`);
      for (const l of links) {
        if (l.href !== `mailto:${email}`) problems.push(`${r.path}: 연락 링크가 mailto:${email} 가 아님 (${l.href})`);
        if (!l.vis) problems.push(`${r.path}: 연락 링크가 안 보임`);
        if (l.h < RESTRAINT.tap) problems.push(`${r.path}: 연락 링크 눌림 높이 ${l.h}px < 44`);
      }
      const small = await page.locator('header a, header button').evaluateAll((els) =>
        els.filter((e) => (e as HTMLElement).checkVisibility()).map((e) => ({ t: (e.textContent ?? '').trim(), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44),
      );
      for (const x of small) problems.push(`${r.path}: 상단 바 「${x.t}」 눌림 높이 ${x.h}px < 44`);
      const copy = page.locator(`header ${SEL.copy}`);
      if ((await copy.count()) !== 1) {
        problems.push(`${r.path}: 상단 바 주소 복사 단추가 하나가 아님`);
        continue;
      }
      const h = await copy.evaluate((e) => e.getBoundingClientRect().height);
      if (h < RESTRAINT.tap) problems.push(`${r.path}: 주소 복사 눌림 높이 ${h}px < 44`);
      if ((await copy.getAttribute('data-copy')) !== email) problems.push(`${r.path}: 복사할 주소가 ${email} 가 아님`);
      if (/이메일 자리|\[이메일/.test((await page.evaluate(pageTexts)).join(' '))) problems.push(`${r.path}: 이메일 빈자리 표시`);
    }
    // 복사 동작(홈 한 곳) — 「복사됨」 → 1.5초 뒤 원래 글 · 클립보드에 주소
    await visit(page, '/?skipIntro');
    const copy = page.locator(`header ${SEL.copy}`);
    const before = (await copy.textContent())?.trim();
    await copy.click();
    await settle(page, 250);
    if ((await copy.textContent())?.trim() !== '복사됨') problems.push(`주소 복사를 눌러도 「복사됨」 이 안 뜸 (${await copy.textContent()})`);
    const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (clip !== email) problems.push(`클립보드에 주소가 없음 (「${clip}」)`);
    await settle(page, 1500);
    if ((await copy.textContent())?.trim() !== before) problems.push(`1.5초 뒤 단추 글이 돌아오지 않음 (${await copy.textContent()})`);
    // 같은 연락을 방 끝에 한 번 더 두지 않는다(review-gate 3절 같은 사실 한 곳 — 상단 바로 옮김)
    for (const r of WORK_ROOMS) {
      await visit(page, r.path);
      const n = await page.locator('a[href^="mailto:"]').count();
      if (n !== 1) problems.push(`${r.path}: mailto 링크 ${n}개(상단 바 하나여야)`);
    }
    assertNoProblems('연락', problems);
  });

  test('V-15. 홈 작품 화면 — 오목 면의 사다리꼴 카드 5장(순서 · 92vw × 80vh 안팎을 채움 · 가운데 카드 ≥ 가장 넓은 카드의 75% · 바깥 세로변이 길고 가운데 쪽이 짧다 · 가운데는 묶음 높이의 75~85% · 세로 이음매는 곧은 수직선 · 맞닿는 변 높이가 같음 · 카드 안 그림만 살짝 돌림) · 제목 줄은 조각 왼쪽 아래 꼭짓점 바로 아래에 늘(≥ 14px) · 글자 ≥ 12px · 호버/포커스 → 그 조각만 컬러 + 재생 + 앞으로 · 테크니컬 작업 칸 4 · 대본 글 상자는 반듯한 안전 영역 · 크게 읽기', async ({ page }, testInfo) => {
    const problems: string[] = [];
    await visit(page, '/?skipIntro');
    await settle(page, 800);
    const vp = page.viewportSize()!;
    type P = { k: string; box: DOMRect; pts: [number, number][]; cap: DOMRect; capFs: number };
    const pieces: P[] = await page.locator(`${SEL.cards} > [data-card]`).evaluateAll((els) =>
      els.map((e) => {
        const media = e.querySelector<HTMLElement>('[data-card-media]')!;
        const box = media.getBoundingClientRect();
        const m = getComputedStyle(media).clipPath.match(/polygon\((.*)\)/);
        const pts = (m?.[1] ?? '').split(',').map((xy) => {
          const [x, y] = xy.trim().split(/\s+/).map((v) => parseFloat(v) / 100);
          return [box.x + x * box.width, box.y + y * box.height] as [number, number];
        });
        const capEl = e.querySelector<HTMLElement>('.card-cap')!;
        const capFs = Math.min(...[...capEl.querySelectorAll('*')].map((c) => parseFloat(getComputedStyle(c).fontSize)));
        return { k: e.getAttribute('data-card') ?? '', box: box.toJSON() as DOMRect, pts, cap: capEl.getBoundingClientRect().toJSON() as DOMRect, capFs };
      }),
    );
    if (pieces.map((x) => x.k).join(',') !== HOME_CARDS.join(',')) problems.push(`조각 순서 ${pieces.map((x) => x.k).join(',')} (기대 ${HOME_CARDS.join(',')})`);
    if (pieces.some((x) => x.pts.length !== 4)) problems.push('조각 clip-path 가 꼭짓점 4개 다각형이 아님');
    else {
      // 묶음이 화면 대부분을 채운다
      const xs = pieces.flatMap((x) => x.pts.map((p) => p[0]));
      const ys = pieces.flatMap((x) => x.pts.map((p) => p[1]));
      const W = Math.max(...xs) - Math.min(...xs);
      const H = Math.max(...ys) - Math.min(...ys);
      if (W < vp.width * 0.88) problems.push(`조각 묶음 폭 ${Math.round(W)} < 화면 88%`);
      if (H < vp.height * 0.72) problems.push(`조각 묶음 높이 ${Math.round(H)} < 화면 72%`);
      testInfo.annotations.push({ type: '조각 묶음', description: `${Math.round(W)}×${Math.round(H)} (${((W / vp.width) * 100).toFixed(0)}vw × ${((H / vp.height) * 100).toFixed(0)}vh)` });
      // 오목 — 폭 · 높이(사다리꼴이라 꼭짓점 기준)
      const width = (q: P) => (q.pts[1][0] - q.pts[0][0] + (q.pts[2][0] - q.pts[3][0])) / 2;
      const height = (q: P) => (q.pts[3][1] - q.pts[0][1] + (q.pts[2][1] - q.pts[1][1])) / 2;
      const ws = pieces.map(width);
      const hs = pieces.map(height);
      const wmax = Math.max(...ws);
      if (ws[0] < wmax * 0.75) problems.push(`첫 조각(오직 당신의 것) 폭 ${Math.round(ws[0])} < 가장 넓은 조각의 75%(${Math.round(wmax * 0.75)})`);
      if (ws[2] < wmax * 0.75) problems.push(`가운데 조각(버터) 폭 ${Math.round(ws[2])} < 가장 넓은 조각의 75%(${Math.round(wmax * 0.75)})`);
      if (![0, 4].includes(ws.indexOf(wmax))) problems.push(`가장 넓은 조각이 양 끝(오직 · 대본)이 아님 (${ws.map(Math.round).join(',')})`);
      if (!(hs[2] < hs[0] && hs[2] < hs[4])) problems.push(`오목이 아님 — 가운데 조각이 양 끝보다 낮지 않음 (${hs.map(Math.round).join(',')})`);
      // 사다리꼴 — 바깥 세로변이 길고 가운데 쪽이 짧다(왼쪽 두 장은 왼쪽 변, 오른쪽 두 장은 오른쪽 변) · 가운데는 양쪽이 같다
      const side = (q: P, k: 'l' | 'r') => (k === 'l' ? q.pts[3][1] - q.pts[0][1] : q.pts[2][1] - q.pts[1][1]);
      for (const i of [0, 1]) if (!(side(pieces[i], 'l') > side(pieces[i], 'r') + 4)) problems.push(`카드 ${pieces[i].k}: 바깥(왼쪽) 세로변이 길지 않음`);
      for (const i of [3, 4]) if (!(side(pieces[i], 'r') > side(pieces[i], 'l') + 4)) problems.push(`카드 ${pieces[i].k}: 바깥(오른쪽) 세로변이 길지 않음`);
      if (Math.abs(side(pieces[2], 'l') - side(pieces[2], 'r')) > 1.5) problems.push('가운데 카드(버터) 양쪽 세로변 높이가 다름');
      const ratio = side(pieces[2], 'l') / side(pieces[0], 'l');
      if (ratio < 0.75 || ratio > 0.85) problems.push(`가운데 카드 높이가 양 끝의 ${(ratio * 100).toFixed(0)}%(75~85% 여야)`);
      // 세로 이음매 — 곧은 수직선 · 맞닿는 변 높이가 같다 · 틈 2px 안팎
      for (let i = 0; i < 4; i++) {
        const a = pieces[i], c = pieces[i + 1];
        if (Math.abs(a.pts[1][0] - a.pts[2][0]) > 1 || Math.abs(c.pts[0][0] - c.pts[3][0]) > 1) problems.push(`이음매 ${i + 1}: 수직이 아님`);
        if (Math.abs(a.pts[1][1] - c.pts[0][1]) > 1.5 || Math.abs(a.pts[2][1] - c.pts[3][1]) > 1.5) problems.push(`이음매 ${i + 1}: 맞닿는 변 높이가 다름(끊김)`);
        const y = (Math.max(a.pts[1][1], c.pts[0][1]) + Math.min(a.pts[2][1], c.pts[3][1])) / 2;
        const xa = a.pts[1][0] + (a.pts[2][0] - a.pts[1][0]) * ((y - a.pts[1][1]) / (a.pts[2][1] - a.pts[1][1]));
        const xc = c.pts[0][0] + (c.pts[3][0] - c.pts[0][0]) * ((y - c.pts[0][1]) / (c.pts[3][1] - c.pts[0][1]));
        if (xc - xa < 0.5 || xc - xa > 4) problems.push(`이음매 ${i + 1}: 틈 ${(xc - xa).toFixed(1)}px(2px 안팎이어야)`);
        const hit = await page.evaluate(([x, y, k1, k2]) => {
          const at = (xx: number) => document.elementFromPoint(xx, y)?.closest('[data-card]')?.getAttribute('data-card');
          return [at(x - 6), at(x + 6)].join(',') === `${k1},${k2}`;
        }, [(xa + xc) / 2, y, a.k, c.k] as [number, number, string, string]);
        if (!hit) problems.push(`이음매 ${i + 1}: 양쪽이 ${a.k} · ${c.k} 로 맞물리지 않음`);
      }
      // 입체감 — 카드 안 그림 · 영상만 돌림(바깥 카드일수록 안쪽을 향해 · 가운데는 0)
      const turns = await page.locator(`${SEL.cards} > [data-card]`).evaluateAll((els) => els.map((e) => getComputedStyle(e).getPropertyValue('--turn').trim()));
      if (turns.join(',') !== '7deg,3.5deg,0deg,-3.5deg,-7deg') problems.push(`카드 안 기울기 ${turns.join(',')}`);
      // 제목 줄 — 왼쪽 아래 꼭짓점 바로 아래
      for (const q of pieces) {
        const bl = q.pts[3];
        const low = Math.max(q.pts[2][1], q.pts[3][1]);
        if (Math.abs(q.cap.left - bl[0]) > 3) problems.push(`조각 ${q.k}: 제목 줄이 왼쪽 아래 꼭짓점에 맞지 않음(${Math.round(q.cap.left)} ≠ ${Math.round(bl[0])})`);
        if (q.cap.top < low - 1 || q.cap.top > low + 24) problems.push(`조각 ${q.k}: 제목 줄이 아랫변 바로 아래가 아님(top ${Math.round(q.cap.top)} · 아랫변 ${Math.round(low)})`);
        if (q.cap.bottom > vp.height) problems.push(`조각 ${q.k}: 제목 줄이 화면 밖`);
        if (q.capFs < RESTRAINT.infoFont) problems.push(`조각 ${q.k}: 제목 줄 ${q.capFs}px < 14`);
      }
    }
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    if (sw > vp.width + 1) problems.push(`가로 넘침 ${sw} > ${vp.width}`);
    // 이름 · 직무(상단 바) · 글자 ≥ 12px
    const t = await page.evaluate((jobSel) => {
      const job = document.querySelector<HTMLElement>(jobSel);
      let min = Infinity;
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const p = n.parentElement;
        if (!p || !(n.textContent ?? '').trim() || p.closest('dialog:not([open])') || !p.checkVisibility({ checkOpacity: true, visibilityProperty: true } as CheckVisibilityOptions)) continue;
        const r = p.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= innerHeight) continue;
        min = Math.min(min, parseFloat(getComputedStyle(p).fontSize));
      }
      return { job: job?.textContent?.trim() ?? '', jobFs: job ? parseFloat(getComputedStyle(job).fontSize) : 0, jobVis: !!job?.checkVisibility({ checkOpacity: true } as CheckVisibilityOptions), name: document.querySelector('[data-bar-name]')?.textContent?.trim(), min };
    }, SEL.job);
    if (t.name !== '김영건') problems.push(`상단 바 이름 「${t.name}」`);
    if (t.job !== 'AI CREATOR & 드라마 대본 작가' || !t.jobVis) problems.push(`상단 바 직무 한 줄 「${t.job}」(보임 ${t.jobVis})`);
    if (t.jobFs < RESTRAINT.jobFont) problems.push(`직무 한 줄 ${t.jobFs}px < 16`);
    if (t.min < RESTRAINT.minFont) problems.push(`12px 미만 글자 (${t.min}px)`);
    // 제목 줄 글 — 제목 · 종류 · 길이 · 눌림 단서
    for (const w of MAIN_WORKS) {
      const cap = page.locator(`${SEL.cardLink(w.slug)} .card-cap`);
      const txt = ((await cap.textContent()) ?? '').replace(/\s+/g, ' ');
      if (!txt.includes(w.title)) problems.push(`조각 ${w.slug}: 제목 줄에 제목 없음 「${txt}」`);
      if (!/AI (숏드라마|트레일러)/.test(txt) || !/\d:\d\d/.test(txt)) problems.push(`조각 ${w.slug}: 제목 줄에 종류 · 길이 없음 「${txt}」`);
      const cue = await page.locator(`${SEL.cardLink(w.slug)} .go`).evaluate((e) => getComputedStyle(e, '::after').content);
      if (!/→/.test(cue)) problems.push(`조각 ${w.slug}: 호버 없이 보이는 눌림 단서(→) 없음`);
    }
    if (!((await page.locator(`${SEL.card('tools')} .card-cap`).textContent()) ?? '').includes('테크니컬 작업')) problems.push('④ 조각 아래 「테크니컬 작업」 없음');
    if (!((await page.locator(`${SEL.card('script')} .card-cap`).textContent()) ?? '').includes('대본 맛보기')) problems.push('⑤ 조각 아래 「대본 맛보기」 없음');
    // 호버 → 그 조각만 컬러 + 재생 + 앞으로 · 벗어나면 멈춤 + 흑백(전환 100~300ms)
    const vstate = (slug: string) =>
      page.locator(SEL.cardLink(slug)).evaluate((a) => {
        const v = a.querySelector('video') as HTMLVideoElement;
        const m = a.querySelector('[data-card-media]') as HTMLElement;
        return { f: getComputedStyle(v).filter, paused: v.paused, dur: getComputedStyle(v).transitionDuration, scale: new DOMMatrix(getComputedStyle(m).transform).a };
      });
    const s0 = await vstate('oneandonly');
    if (!/grayscale\(1\)/.test(s0.f) || !s0.paused) problems.push(`호버 전 조각이 흑백 · 멈춤이 아님 (${s0.f} · paused ${s0.paused})`);
    const dur = parseFloat(s0.dur) * (s0.dur.endsWith('ms') ? 1 : 1000);
    if (dur < 100 || dur > 300) problems.push(`흑백 ↔ 컬러 전환 ${s0.dur}(100~300ms 여야)`);
    const c1 = pieces[0].pts.reduce((acc, p) => [acc[0] + p[0] / 4, acc[1] + p[1] / 4], [0, 0]);
    await page.mouse.move(c1[0], c1[1]);
    await settle(page, 900);
    const s1 = await vstate('oneandonly');
    if (!/grayscale\(0\)/.test(s1.f)) problems.push(`호버해도 컬러가 아님 (${s1.f})`);
    if (s1.paused) problems.push('호버해도 영상이 재생되지 않음');
    if (!(s1.scale > 1.005)) problems.push(`호버한 조각이 앞으로 나오지 않음(scale ${s1.scale})`);
    const others = await page.locator(`${SEL.cards} video`).evaluateAll((vs) => vs.filter((v) => !(v as HTMLVideoElement).paused).length);
    if (others !== 1) problems.push(`호버 중 재생 영상 ${others}개(1개여야)`);
    const attrs = await page.locator(`${SEL.cards} video`).evaluateAll((vs) => vs.map((v) => (v as HTMLVideoElement).muted && v.hasAttribute('playsinline') && v.hasAttribute('loop')));
    if (attrs.some((x) => !x)) problems.push('조각 영상이 muted · playsinline · loop 가 아님');
    await page.mouse.move(vp.width / 2, 8);
    await settle(page, 600);
    const s2 = await vstate('oneandonly');
    if (!s2.paused || !/grayscale\(1\)/.test(s2.f)) problems.push(`벗어나도 멈추지 않거나 흑백으로 안 돌아감 (${s2.f} · paused ${s2.paused})`);
    // 키보드 포커스 → 컬러 + 재생 + 포커스 링
    await page.locator(SEL.cardLink('firstimpression')).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await settle(page, 700);
    const s3 = await vstate('firstimpression');
    if (!/grayscale\(0\)/.test(s3.f) || s3.paused) problems.push(`키보드 포커스에 컬러 + 재생이 아님 (${s3.f} · paused ${s3.paused})`);
    const ring = await page.locator(SEL.cardLink('firstimpression')).evaluate((e) => parseFloat(getComputedStyle(e).outlineWidth));
    if (ring < 2) problems.push(`포커스 링 ${ring}px < 2`);
    await page.locator(SEL.cardLink('firstimpression')).evaluate((e) => (e as HTMLElement).blur());
    // ④ 테크니컬 작업 — 같은 사다리꼴 안을 수평 이음매로 4등분 · href · 칸마다 호버 컬러
    const cells = await page.locator(`${SEL.card('tools')} [data-tool-cell]`).evaluateAll((els) =>
      els.map((e) => {
        const b = e.getBoundingClientRect();
        const m = getComputedStyle(e).clipPath.match(/polygon\((.*)\)/);
        const pts = (m?.[1] ?? '').split(',').map((xy) => xy.trim().split(/\s+/).map((v) => parseFloat(v) / 100));
        return { href: e.getAttribute('href'), slug: e.getAttribute('data-tool-cell'), tilt: pts.length === 4 ? Math.abs((pts[1][1] - pts[0][1]) * b.height) : 0, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
      }),
    );
    if (cells.map((c) => c.slug).join(',') !== TOOL_WORKS.map((w) => w.slug).join(',')) problems.push(`테크니컬 작업 칸 ${cells.map((c) => c.slug).join(',')}`);
    for (const c of cells) if (c.href !== `/tools/#${c.slug}`) problems.push(`칸 ${c.slug}: href ${c.href}`);
    if (cells.slice(1).some((c) => c.tilt > 1)) problems.push(`테크니컬 작업 칸 사이 이음매가 수평이 아님 (${cells.map((c) => c.tilt.toFixed(1)).join(',')})`);
    await page.mouse.move(cells[1].cx, cells[1].cy);
    await settle(page, 600);
    const tf = await page.locator(`${SEL.card('tools')} [data-tool-cell] img`).evaluateAll((is) => is.map((i) => getComputedStyle(i).filter));
    if (!/grayscale\(0\)/.test(tf[1] ?? '')) problems.push(`툴 칸 호버해도 컬러가 아님 (${tf[1]})`);
    if (tf.filter((f) => /grayscale\(0\)/.test(f)).length !== 1) problems.push(`툴 칸 호버 — 컬러 칸 ${tf.filter((f) => /grayscale\(0\)/.test(f)).length}개(1개여야)`);
    await page.mouse.move(vp.width / 2, 8);
    // ⑤ 대본 — 글 상자 = 반듯한 안전 영역(네 귀퉁이가 조각 안 · 회전 없음) · 전환 · 카드 안 스크롤 · 크게 읽기
    const safe = await page.locator(SEL.tasterScroll).evaluate((e) => {
      const r = e.getBoundingClientRect();
      const inside = [[r.left + 3, r.top + 3], [r.right - 3, r.top + 3], [r.right - 3, r.bottom - 3], [r.left + 3, r.bottom - 3]].every(([x, y]) => document.elementFromPoint(x, y)?.closest('[data-card="script"]'));
      return { inside, tf: getComputedStyle(e.parentElement!).transform };
    });
    if (!safe.inside) problems.push('대본 글 상자 귀퉁이가 조각 밖(잘림)');
    if (safe.tf !== 'none') problems.push(`대본 글 상자가 기울어 있음 (${safe.tf})`);
    const tabs = await page.locator('[data-taster-tab]').allTextContents();
    if (tabs.map((x) => x.trim()).join(',') !== '오직 당신의 것,첫 인상') problems.push(`대본 전환 단추 「${tabs.join(',')}」`);
    const sc = await page.locator(SEL.tasterScroll).evaluate((e) => ({ sh: e.scrollHeight, ch: e.clientHeight, y0: scrollY }));
    if (sc.sh <= sc.ch + 20) problems.push('대본 글 상자 안이 스크롤되지 않음');
    await page.hover(SEL.tasterScroll);
    await page.mouse.wheel(0, 300);
    await settle(page, 400);
    const sc2 = await page.locator(SEL.tasterScroll).evaluate((e) => ({ st: e.scrollTop, y: scrollY }));
    if (sc2.st < 100) problems.push(`대본 글 상자 안 휠 스크롤이 안 됨 (scrollTop ${sc2.st})`);
    if (sc2.y !== sc.y0) problems.push('대본 글 상자 안 휠이 페이지를 움직임');
    await page.click(SEL.tasterTab('firstimpression'));
    await settle(page, 200);
    if (!(await page.locator(SEL.tasterPage('firstimpression')).isVisible()) || (await page.locator(SEL.tasterPage('oneandonly')).isVisible())) problems.push('「첫 인상」 을 눌러도 대본이 바뀌지 않음');
    if ((await page.locator(SEL.tasterScroll).evaluate((e) => e.scrollTop)) !== 0) problems.push('대본을 바꿨는데 맨 위부터가 아님');
    const firstLine = ((await page.locator(`${SEL.tasterPage('firstimpression')} p`).first().textContent()) ?? '').trim();
    const reader = page.locator(SEL.reader);
    const openReader = async (how: string) => {
      await page.click(SEL.readerOpen);
      await settle(page, 350);
      if (!(await reader.evaluate((d) => (d as HTMLDialogElement).open))) problems.push(`${how}: 크게 읽기가 열리지 않음`);
    };
    await openReader('ESC');
    const rb = await reader.boundingBox();
    if (!rb || rb.width < vp.width * 0.45 || rb.height < vp.height * 0.6) problems.push(`크게 읽기 종이가 크지 않음 (${rb?.width}×${rb?.height})`);
    if (rb && Math.abs(rb.x + rb.width / 2 - vp.width / 2) > 4) problems.push('크게 읽기 종이가 화면 가운데가 아님');
    if (!(((await reader.locator('[data-reader-body]').textContent()) ?? '').includes(firstLine))) problems.push('크게 읽기에 지금 고른 대본(첫 인상)이 아님');
    const rfs = await reader.locator('[data-reader-body] .act').first().evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
    if (rfs < 16) problems.push(`크게 읽기 본문 ${rfs}px < 16`);
    await page.keyboard.press('Escape');
    await settle(page, 300);
    if (await reader.evaluate((d) => (d as HTMLDialogElement).open)) problems.push('ESC 로 닫히지 않음');
    await openReader('✕');
    const xb = await page.locator(SEL.readerClose).boundingBox();
    if (!xb || xb.width < 44 || xb.height < 44) problems.push(`✕ 단추 눌림 ${xb?.width}×${xb?.height} < 44`);
    await page.click(SEL.readerClose);
    await settle(page, 300);
    if (await reader.evaluate((d) => (d as HTMLDialogElement).open)) problems.push('✕ 로 닫히지 않음');
    await openReader('바깥');
    await page.mouse.click(8, vp.height - 8);
    await settle(page, 300);
    if (await reader.evaluate((d) => (d as HTMLDialogElement).open)) problems.push('바깥을 눌러 닫히지 않음');
    assertNoProblems(`홈 작품 화면 · ${testInfo.project.name}`, problems);
  });

  test('V-15b. 홈 인트로 — 첫 방문 = 이름만(큰 「김영건」 ≥ 78px · 직무 한 줄 ≥ 16px · 「스크롤하여 입장」 · 조각 안 보임 · 상단 바 연락은 보임) · 자동 진행 없음 · 휠 · 클릭 · 키 한 번이면 입장(≤ 1.2초 — 이름은 상단 바로) · 재방문 · 직링크 · ?skipIntro 는 인트로 없음', { tag: '@once' }, async ({ browser }) => {
    const problems: string[] = [];
    const fresh = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
      const page = await ctx.newPage();
      await visit(page, '/');
      await settle(page, 1300);
      return { ctx, page };
    };
    const intro = (page: Page) => page.evaluate(() => document.documentElement.hasAttribute('data-intro'));
    const { ctx, page } = await fresh();
    if (!(await intro(page))) problems.push('첫 방문인데 인트로가 아님');
    const s = await page.evaluate(() => {
      const name = document.querySelector<HTMLElement>('[data-intro-name]');
      const job = document.querySelector<HTMLElement>('.intro-job');
      const vis = (e: Element | null) => !!e && (e as HTMLElement).checkVisibility({ checkOpacity: true } as CheckVisibilityOptions) && parseFloat(getComputedStyle(e).opacity) > 0.5;
      return {
        nameFs: name ? parseFloat(getComputedStyle(name).fontSize) : 0,
        nameVis: vis(name),
        job: job?.textContent?.trim(),
        jobFs: job ? parseFloat(getComputedStyle(job).fontSize) : 0,
        jobVis: vis(job),
        hint: vis([...document.querySelectorAll('.intro-hint')].find((e) => e.textContent?.includes('스크롤하여 입장')) ?? null),
        pieces: [...document.querySelectorAll('[data-cards] .piece')].filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.05).length,
        contact: vis(document.querySelector('header [data-nav="contact"]')),
      };
    });
    if (!s.nameVis || s.nameFs < 78) problems.push(`인트로 이름이 크지 않거나 안 보임 (${s.nameFs}px)`);
    if (!s.jobVis || s.job !== 'AI CREATOR & 드라마 대본 작가' || s.jobFs < 16) problems.push(`인트로 직무 한 줄 (${s.job} · ${s.jobFs}px · 보임 ${s.jobVis})`);
    if (!s.hint) problems.push('「스크롤하여 입장」 이 안 보임');
    if (s.pieces) problems.push(`인트로인데 조각 ${s.pieces}개가 보임`);
    if (!s.contact) problems.push('인트로 동안 상단 바 연락이 안 보임');
    await settle(page, 2500);
    if (!(await intro(page))) problems.push('입력 없이 인트로가 넘어감(자동 진행)');
    // 휠 한 번 → 입장 · 걸린 시간
    const t0 = Date.now();
    await page.mouse.wheel(0, 120);
    let took = -1;
    for (let i = 0; i < 60; i++) {
      if (!(await intro(page))) {
        took = Date.now() - t0;
        break;
      }
      await page.waitForTimeout(40);
    }
    if (took < 0) problems.push('휠 한 번으로 입장하지 않음');
    else if (took > 1350) problems.push(`입장 전환 ${took}ms(≤ 1.2초 + 측정 여유)`);
    test.info().annotations.push({ type: '입장', description: `${took}ms` });
    const after = await page.evaluate(() => ({
      pieces: [...document.querySelectorAll('[data-cards] .piece')].filter((e) => parseFloat(getComputedStyle(e).opacity) > 0.99).length,
      bar: parseFloat(getComputedStyle(document.querySelector('[data-bar-name]')!).opacity),
      introShown: getComputedStyle(document.querySelector('[data-intro-layer]')!).display !== 'none',
      lens: document.querySelector('[data-card="oneandonly"]')!.getBoundingClientRect().width,
    }));
    if (after.pieces !== 5) problems.push(`입장 뒤 조각 ${after.pieces}/5 만 보임`);
    if (after.bar !== 1) problems.push(`입장 뒤 상단 바 이름이 안 보임 (opacity ${after.bar})`);
    if (after.introShown) problems.push('입장 뒤에도 인트로 층이 남음');
    if (after.lens < 100) problems.push('입장 뒤 조각 자리가 깨짐(인라인 자리 값이 지워짐)');
    await visit(page, '/');
    if (await intro(page)) problems.push('같은 세션 재방문인데 인트로가 다시 나옴');
    await ctx.close();
    for (const how of ['클릭', '키'] as const) {
      const f = await fresh();
      if (how === '클릭') await f.page.mouse.click(720, 450);
      else await f.page.keyboard.press('Enter');
      await settle(f.page, 1400);
      if (await intro(f.page)) problems.push(`${how} 한 번으로 입장하지 않음`);
      await f.ctx.close();
    }
    const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p3 = await c3.newPage();
    await visit(p3, '/works/butter/');
    await p3.locator('[data-back]').click();
    await p3.waitForURL('**/');
    await settle(p3, 300);
    if (await intro(p3)) problems.push('작품 방 직링크 → 「김영건」 인데 인트로가 나옴');
    await visit(p3, '/?skipIntro');
    if (await intro(p3)) problems.push('?skipIntro 인데 인트로가 나옴');
    await c3.close();
    assertNoProblems('홈 인트로', problems);
  });

  test('V-16. 작가 원문(data-src)은 공백 정규화 후 _분석/작품과정/<slug>.md 안에 그대로 있다(작가 지시 편집 적용 뒤)', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      const doc = path.join(PROCESS_DOC_DIR, `${w.slug}.md`);
      if (!fs.existsSync(doc)) {
        problems.push(`${p}: 대조 문서 ${doc} 가 없음`);
        continue;
      }
      let md = norm(fs.readFileSync(doc, 'utf8'));
      for (const e of AUTHOR_EDITS.filter((x) => x.slug === w.slug)) md = md.split(e.from).join(e.to); // 작가 지시 편집(src/data/edits.ts)
      await visit(page, p);
      const items = await page.locator(SEL.verbatim).evaluateAll((els) => els.map((e) => ({ t: e.textContent ?? '', src: e.getAttribute('data-src') ?? '' })));
      if (!(await page.locator(`${SEL.intro} [data-src]`).count())) problems.push(`${p}: 소개에 원문 표시가 없음`);
      if (!(await page.locator(`${SEL.process} [data-src]`).count())) problems.push(`${p}: 과정 대본 문장에 원문 표시가 없음`);
      for (const i of items) {
        const t = norm(i.t);
        if (!t) problems.push(`${p}: 빈 원문 표시(data-src="${i.src}")`);
        else if (!md.includes(t)) problems.push(`${p}: 「${t.slice(0, 40)}…」 (data-src="${i.src}") 가 ${w.slug}.md 에 그대로 없음`);
      }
      const all = (await page.evaluate(pageTexts)).join(' ');
      for (const e of AUTHOR_EDITS.filter((x) => x.slug === w.slug)) if (all.includes(e.from)) problems.push(`${p}: 작가 지시로 바꾼 낱말 「${e.from}」 이 남아 있음`);
      test.info().annotations.push({ type: '원문 대조', description: `${w.slug} — ${items.length}개` });
    }
    // 홈 ⑤ 대본 맛보기 — 줄마다 data-src(_분석/대본/*.txt) 원문 안에 그대로(작가 지시 편집 적용 뒤) · 「너울」 0
    await visit(page, '/?skipIntro');
    const pages = await page.locator('[data-taster-page]').evaluateAll((els) =>
      els.map((e) => ({ slug: e.getAttribute('data-taster-page') ?? '', src: e.getAttribute('data-src') ?? '', lines: [...e.querySelectorAll('p')].map((p) => p.textContent ?? '') })),
    );
    if (pages.map((x) => x.slug).join(',') !== 'oneandonly,firstimpression') problems.push(`/: 대본 맛보기 작품 ${pages.map((x) => x.slug).join(',')}`);
    for (const pg of pages) {
      const f = path.join(ANALYSIS_ROOT, pg.src);
      if (!pg.src.startsWith('_분석/') || !fs.existsSync(f)) {
        problems.push(`/: 대본 맛보기 ${pg.slug} 원문 파일 ${pg.src} 없음`);
        continue;
      }
      let src = norm(fs.readFileSync(f, 'utf8'));
      for (const e of AUTHOR_EDITS.filter((x) => x.slug === pg.slug)) src = src.split(e.from).join(e.to);
      for (const l of pg.lines) if (!src.includes(norm(l))) problems.push(`/: 대본 맛보기 ${pg.slug} 「${norm(l).slice(0, 30)}…」 가 원문에 그대로 없음`);
      for (const e of AUTHOR_EDITS.filter((x) => x.slug === pg.slug)) if (pg.lines.join(' ').includes(e.from)) problems.push(`/: 대본 맛보기에 「${e.from}」 이 남음`);
      test.info().annotations.push({ type: '원문 대조', description: `홈 ${pg.slug} — ${pg.lines.length}줄` });
    }
    assertNoProblems('작가 원문 대조', problems);
  });

  test('V-17. 한 컷이 만들어진 순서 — 걸음 4개(대본 · 시트 · 연출 · 완성) · 걸음마다 차례로 활성 · 연결선 양 끝이 낱말 · 상자 안 · 와이프 끝에 완성 100% · ④ 누르면 그 시각부터 재생', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      const p = `/works/${w.slug}/`;
      await visit(page, p);
      await settle(page, 1200);
      const labels = await page.locator('[data-process] [data-step-go]').allTextContents();
      if (labels.map((s) => s.trim()).join(',') !== CUT_STEPS.join(',')) problems.push(`${p}: 걸음 ${labels.join(',')}`);
      if (/프롬프트/.test((await page.evaluate(pageTexts)).join(' '))) problems.push(`${p}: 「프롬프트」 낱말`);
      for (const k of [1, 2, 3, 4]) {
        if (!(await toCutStep(page, k))) {
          problems.push(`${p}: 핀 구간을 못 찾음`);
          break;
        }
        const st = await page.evaluate((k) => {
          const stage = document.querySelector<HTMLElement>('[data-process] [data-stage]')!;
          const cur = [...stage.querySelectorAll('[data-step-go]')].findIndex((b) => b.getAttribute('aria-current') === 'step');
          const sr = stage.getBoundingClientRect();
          const inside = (x: number, y: number, r: DOMRect, pad = 3) => x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
          const ln = (n: string) => {
            const l = stage.querySelector<SVGLineElement>(`[data-line="${n}"]`)!;
            const g = (a: string) => Number(l.getAttribute(a)) ;
            return { x1: g('x1') + sr.left, y1: g('y1') + sr.top, x2: g('x2') + sr.left, y2: g('y2') + sr.top, o: Number(getComputedStyle(l).opacity), fw: l.dataset.fromWord };
          };
          const rect = (s: string) => stage.querySelector(s)?.getBoundingClientRect() ?? null;
          const out: string[] = [];
          const pinned = Math.abs(sr.top - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 58)) < 4;
          if (!pinned) out.push(`무대가 고정되지 않음(top ${Math.round(sr.top)})`);
          if (cur !== k - 1) out.push(`걸음 ${k} 인데 활성 표시가 ${cur + 1}`);
          if (k === 2) {
            const l = ln('1');
            const word = rect(`u[data-word="${l.fw}"]`), box = rect('[data-box="sheet"]');
            if (l.o < 0.9) out.push('연결선 1 이 보이지 않음');
            if (!word || !inside(l.x1, l.y1, word)) out.push('연결선 1 시작이 밑줄 낱말 밖');
            if (!box || !inside(l.x2, l.y2, box)) out.push('연결선 1 끝이 시트 상자 밖');
          }
          if (k === 3) {
            const l = ln('2');
            const from = l.fw ? rect(`u[data-word="${l.fw}"]`) : rect('[data-box="sheet2"]');
            const box = rect('[data-box="board"]');
            if (l.o < 0.9) out.push('연결선 2 가 보이지 않음');
            if (!from || !inside(l.x1, l.y1, from)) out.push('연결선 2 시작이 시트 상자(또는 낱말) 밖');
            if (!box || !inside(l.x2, l.y2, box)) out.push('연결선 2 끝이 연출 상자 밖');
          }
          if (k === 4) {
            const f = stage.querySelector<HTMLElement>('[data-final]')!;
            const cp = getComputedStyle(f).clipPath;
            if (!(cp === 'none' || /inset\(0(px|%)? 0(px|%)? 0(px|%)? 0(px|%)?\)|inset\(0(px|%)?\)/.test(cp))) out.push(`와이프 끝에 완성 프레임이 다 드러나지 않음 (${cp})`);
          }
          return out;
        }, k);
        for (const m of st) problems.push(`${p} 걸음 ${k}: ${m}`);
      }
      // ④ — 「▶ 이 장면 보기」 → 위 영상 칸에 그 시각부터
      const btn = page.locator(SEL.cutPlay);
      const start = Number(await btn.getAttribute('data-start'));
      await btn.click();
      await settle(page, 900);
      problems.push(...(await expectPlayed(page, `${SEL.vbox} ${SEL.video}`, w, `${p} ④ 이 장면 보기`, start)));
    }
    assertNoProblems(`한 컷이 만들어진 순서 · ${testInfo.project.name}`, problems);
  });

  test('V-19. 404 — HTTP 404 · 흐린 격자 35칸 · 가운데 문장 하나 · 「작품으로 돌아가기 ↗」', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    const st = await visit(page, '/없는-주소/');
    if (st !== 404) problems.push(`HTTP ${st} (404 여야 함)`);
    if ((await page.locator('.e404-grid i').count()) !== 35) problems.push('격자가 35칸이 아님');
    if ((await page.locator('h1').count()) !== 1) problems.push('가운데 문장(h1)이 하나가 아님');
    if ((await page.locator('a', { hasText: '작품으로 돌아가기' }).getAttribute('href')) !== '/') problems.push('「작품으로 돌아가기」 가 / 로 가지 않음');
    assertNoProblems('404', problems);
  });

  test('V-20. 움직임 줄이기 — 홈 인트로 없음 · 조각 앞으로 나옴 · 전환 없음 · 호버해도 영상 재생 없음(컬러만) · 작품 방 첫 상태 그대로 · 과정은 핀 없이 4장면 세로 · 선은 그려진 상태 · 움직임 0', { tag: '@once' }, async ({ browser }) => {
    const problems: string[] = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await visit(page, '/');
    await settle(page, 300);
    const h = await page.evaluate(() => ({ intro: document.documentElement.hasAttribute('data-intro'), anims: document.getAnimations().length }));
    if (h.intro || h.anims) problems.push(`/: 움직임 줄이기인데 인트로 · 움직임이 있음 (${JSON.stringify(h)})`);
    const sc = await page.locator(`${SEL.cardLink('oneandonly')} [data-card-media]`).evaluate((m) => getComputedStyle(m).transitionDuration);
    if (parseFloat(sc) !== 0) problems.push(`/: 움직임 줄이기인데 조각 전환이 있음 (${sc})`);
    await page.hover(`${SEL.cardLink('oneandonly')} [data-card-media]`);
    await settle(page, 700);
    const sx = await page.locator(`${SEL.cardLink('oneandonly')} [data-card-media]`).evaluate((m) => getComputedStyle(m).transform);
    if (sx !== 'none') problems.push(`/: 움직임 줄이기인데 호버한 조각이 앞으로 나옴 (${sx})`);
    const v = await page.locator(`${SEL.cardLink('oneandonly')} video`).evaluate((x) => ({ paused: (x as HTMLVideoElement).paused, f: getComputedStyle(x).filter }));
    if (!v.paused) problems.push('/: 움직임 줄이기인데 호버로 카드 영상이 재생됨');
    if (!/grayscale\(0\)/.test(v.f)) problems.push(`/: 움직임 줄이기에서 호버 컬러가 안 됨 (${v.f})`);
    for (const r of WORK_ROOMS) {
      await visit(page, r.path);
      await settle(page, 500);
      const s = await page.evaluate((t) => {
        const el = document.querySelector(t) as HTMLElement | null;
        const stages = [...document.querySelectorAll<HTMLElement>('[data-process] [data-stage]')];
        const lines = (st: HTMLElement | undefined, n: string) => (st ? Number(getComputedStyle(st.querySelector(`[data-line="${n}"]`)!).opacity) : 0);
        return {
          o: el ? getComputedStyle(el).opacity : '?',
          cp: getComputedStyle(document.querySelector('.hero [data-video]')!).clipPath,
          states: stages.map((x) => x.dataset.state).join(','),
          spacer: !!document.querySelector('.pin-spacer'),
          l1: lines(stages[1], '1'),
          l2: lines(stages[2], '2'),
        };
      }, SEL.title);
      if (s.o !== '1') problems.push(`${r.path}: 제목이 바로 안 보임 (${s.o})`);
      if (s.cp !== 'none' && !/inset\(0(px|%)?\)/.test(s.cp)) problems.push(`${r.path}: 영상 칸이 잘려 있음 (${s.cp})`);
      if (s.states !== '1,2,3,4') problems.push(`${r.path}: 과정 장면이 4장 세로가 아님 (${s.states})`);
      if (s.spacer) problems.push(`${r.path}: 움직임 줄이기인데 핀이 걸림`);
      if (s.l1 < 0.9 || s.l2 < 0.9) problems.push(`${r.path}: 연결선이 그려진 상태가 아님 (${s.l1}, ${s.l2})`);
      const m = await page.evaluate(motionProbe);
      if (m.css.length || m.gsap > 0) problems.push(`${r.path}: 움직임 ${m.css.length + Math.max(0, m.gsap)}`);
    }
    await ctx.close();
    assertNoProblems('움직임 줄이기', problems);
  });

  test('V-21. 툴 방 — 영상 4개 2×2 격자 · 영상 밖에 제목 · 분류 · 길이 · 마인드헌터 「모작」 · 격자는 한 화면 반 안', async ({ page }, testInfo) => {
    const problems: string[] = [];
    await visit(page, '/tools/');
    const boxes = await page.locator('[data-tool]').evaluateAll((els) => els.map((e) => ({ s: e.getAttribute('data-tool'), r: e.getBoundingClientRect().toJSON() })));
    if (boxes.map((b) => b.s).join(',') !== TOOL_WORKS.map((w) => w.slug).join(',')) problems.push(`순서 ${boxes.map((b) => b.s).join(',')}`);
    if (boxes.length === 4) {
      const [a, b, c, d] = boxes.map((x) => x.r);
      if (Math.abs(a.top - b.top) > 2 || Math.abs(c.top - d.top) > 2 || c.top <= a.bottom - 2 || b.left <= a.right - 2) problems.push('2×2 격자가 아님');
      const vh = page.viewportSize()!.height;
      if (Math.max(c.bottom, d.bottom) > vh * 1.5) problems.push(`격자 아래끝 ${Math.round(Math.max(c.bottom, d.bottom))} > 1.5 화면(${vh * 1.5})`);
    }
    for (const w of TOOL_WORKS) {
      const box = page.locator(SEL.tool(w.slug));
      const t = (await box.locator('.tool-cap').textContent()) ?? '';
      if (!t.includes(w.title)) problems.push(`${w.slug}: 영상 밖 제목 없음`);
      if (w.slug === 'mindhunter' && !t.includes('모작')) problems.push('마인드헌터: 「모작」 없음');
      if (!/\d:\d\d/.test((await box.locator('.play').textContent()) ?? '')) problems.push(`${w.slug}: 길이 없음`);
    }
    assertNoProblems(`툴 방 · ${testInfo.project.name}`, problems);
  });

  test('V-22. 작품 방 길이 ≤ 3.5화면(핀 스크롤 거리 포함 · 「더 읽기」 접힌 상태) · 구역 ≤ 6 · 크레딧 표 없음 — 절제 규칙 8 · 9', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const r of WORK_ROOMS) {
      await visit(page, r.path);
      await settle(page, 1200);
      const m = await page.evaluate(() => {
        const room = document.querySelector<HTMLElement>('.room')!;
        const sections = Array.from(room.children).filter((e) => (e as HTMLElement).getBoundingClientRect().height > 1).length;
        return { h: document.documentElement.scrollHeight, vh: innerHeight, open: !!document.querySelector('details[open]'), tables: document.querySelectorAll('table').length, sections };
      });
      if (m.open) problems.push(`${r.path}: 「더 읽기」 가 처음부터 펼쳐져 있음`);
      if (m.h > RESTRAINT.lengthScreens * m.vh) problems.push(`${r.path}: 문서 ${m.h}px > 3.5 화면(${RESTRAINT.lengthScreens * m.vh}px)`);
      if (m.sections > RESTRAINT.sections) problems.push(`${r.path}: 구역 ${m.sections} > 6`);
      if (m.tables !== 1) problems.push(`${r.path}: 표 ${m.tables}개 (메타 표 하나만 — 크레딧 표 없음)`);
      testInfo.annotations.push({ type: '방 길이', description: `${r.path} ${m.h}px = ${(m.h / m.vh).toFixed(2)} 화면 · 구역 ${m.sections}` });
    }
    assertNoProblems(`작품 방 길이 · ${testInfo.project.name}`, problems);
  });

  test('V-23. 같은 그림 파일이 한 방에서 두 번 이상 보이지 않는다', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const r of [...WORK_ROOMS, TOOLS_ROOM]) {
      await visit(page, r.path);
      await settle(page, 800);
      const files = await page.evaluate(() => {
        const out: string[] = [];
        const key = (u: string) => new URL(u, location.href).pathname.replace(/_(360|720)\.(avif|webp|jpg)$/, '');
        document.querySelectorAll<HTMLImageElement>('img').forEach((i) => (i.getAttribute('src') ? out.push(key(i.getAttribute('src')!)) : null));
        document.querySelectorAll<HTMLVideoElement>('video[poster]').forEach((v) => out.push(key(v.getAttribute('poster')!)));
        return out;
      });
      const seen = new Map<string, number>();
      for (const f of files) seen.set(f, (seen.get(f) ?? 0) + 1);
      for (const [f, n] of seen) if (n > 1) problems.push(`${r.path}: ${f} 가 ${n}번`);
    }
    assertNoProblems('같은 그림 반복', problems);
  });

  test('V-24. 이동 — 상단 바 「← 이전 · 다음 →」 · 키보드 ← → 로 작품 방 순환(오직 → 첫 인상 → 버터 → 툴 → 오직)', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    const order = ['/works/oneandonly/', '/works/firstimpression/', '/works/butter/', '/tools/'];
    for (let i = 0; i < order.length; i++) {
      await visit(page, order[i]);
      const prev = await page.locator('[data-prev]').getAttribute('href');
      const next = await page.locator('[data-next-link]').getAttribute('href');
      if (prev !== order[(i + 3) % 4]) problems.push(`${order[i]}: 상단 바 이전 ${prev}`);
      if (next !== order[(i + 1) % 4]) problems.push(`${order[i]}: 상단 바 다음 ${next}`);
    }
    await visit(page, order[0]);
    await settle(page, 600);
    await page.keyboard.press('ArrowRight');
    await page.waitForURL(`**${order[1]}`, { timeout: 5_000 }).catch(() => problems.push(`→ 키: ${page.url()} (기대 ${order[1]})`));
    await settle(page, 800);
    await page.keyboard.press('ArrowLeft');
    await page.waitForURL(`**${order[0]}`, { timeout: 5_000 }).catch(() => problems.push(`← 키: ${page.url()} (기대 ${order[0]})`));
    assertNoProblems('이동', problems);
  });
  test('V-25. 절제 규칙(한 화면 — review-gate 3절) — 글자 크기 ≤ 5(16px 이하 ≤ 3) · 글꼴 ≤ 2 · 라벨/번호/메타 ≤ 12 · 테두리 상자 ≤ 2 · 괘선 ≤ 5 · 글 조각 ≤ 20(대본 종이 = 작업물은 뺌) · 이징 ≤ 3 · 전환 시간 ≤ 6 / 홈 글자 ≥ 12px', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const check = async (label: string, home = false) => {
      const st = await page.evaluate(screenStats);
      const R = RESTRAINT;
      const over = (what: string, n: number, max: number, list?: (string | number)[]) => n > max && problems.push(`${label}: ${what} ${n} > ${max}${list ? ` — ${list.slice(0, 14).join(', ')}` : ''}`);
      over('글자 크기', st.sizes.length, home ? R.homeSizes : R.sizes, st.sizes);
      over('16px 이하 글자 크기', st.small.length, R.small, st.small);
      over('글꼴', st.families.length, R.families, st.families);
      over('라벨 · 번호 · 메타', st.labels.length, R.labels, st.labels);
      over('테두리 상자', st.boxes.length, R.boxes, st.boxes);
      over('괘선', st.rules.length, R.rules, st.rules);
      over('글 조각', st.fragments, home ? R.homeFragments : R.fragments);
      over('이징', st.eases.length, R.eases, st.eases);
      over('전환 시간', st.durations.length, R.durations, st.durations);
      if (home && st.minFont < R.minFont) problems.push(`${label}: 12px 미만 글자 (${st.minFont}px)`);
      testInfo.annotations.push({ type: '한 화면', description: `${label}: 크기 ${st.sizes.join('·')} · 라벨 ${st.labels.length} · 상자 ${st.boxes.length} · 괘선 ${st.rules.length} · 글 조각 ${st.fragments} · 작업물 ${(st.media * 100).toFixed(0)}%` });
    };
    await visit(page, '/?skipIntro');
    await settle(page, 1200);
    await check('/ 홈', true);
    await page.hover(`${SEL.cardLink('butter')} [data-card-media]`);
    await settle(page, 800);
    await check('/ 홈 카드 호버', true);
    for (const r of [...WORK_ROOMS, TOOLS_ROOM]) {
      await visit(page, r.path);
      await settle(page, HERO_MS);
      const H = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const vh = page.viewportSize()!.height;
      for (let y = 0; y <= H; y += vh) {
        await page.evaluate((y) => window.scrollTo(0, y), y);
        await settle(page, 900);
        await check(`${r.path} @${y}`);
      }
      if (r.kind === 'work') for (const k of [1, 2, 3, 4]) {
        await toCutStep(page, k, 1200);
        await check(`${r.path} 과정 걸음 ${k}`);
      }
    }
    assertNoProblems(`절제 규칙 · ${testInfo.project.name}`, problems);
  });

  test('V-26. 같은 사실은 한 곳에만(길이 · 형식 · 제작 기간 · 툴 목록) · 장치 ≤ 6 — 절제 규칙 10 · 12', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const r of WORK_ROOMS) {
      await visit(page, r.path);
      await settle(page, HERO_MS);
      const m = await page.evaluate(() => {
        const txt = Array.from(document.querySelectorAll('body *'))
          .filter((e) => (e as HTMLElement).checkVisibility?.({ visibilityProperty: true }) && !e.closest('details:not([open])'))
          .flatMap((e) => Array.from(e.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent ?? ''))
          .join('\n');
        const cells = Object.fromEntries(Array.from(document.querySelectorAll('[data-meta] tr')).map((tr) => [tr.getAttribute('data-meta-row'), tr.querySelector('td')?.textContent?.trim() ?? '']));
        const play = document.querySelector('[data-vbox] .play')?.textContent ?? '';
        const devices = ['nav[data-nav]', '[data-vbox]', 'table', 'details', '[data-process]', '[data-next], [data-contact-foot]'].filter((s) => document.querySelector(s)).length;
        return { txt, cells, play, devices, toolRows: document.querySelectorAll('[data-meta-row="tools"]').length };
      });
      const count = (needle: string) => (needle ? m.txt.split(needle).length - 1 : 0);
      const dur = m.play.match(/\d+:\d{2}/)?.[0] ?? '';
      if (!dur) problems.push(`${r.path}: 재생 줄에 길이가 없음`);
      else if (count(dur) !== 1) problems.push(`${r.path}: 길이 「${dur}」 가 ${count(dur)}곳`);
      for (const k of ['format', 'period']) if (m.cells[k] && count(m.cells[k]) !== 1) problems.push(`${r.path}: 「${m.cells[k]}」 가 ${count(m.cells[k])}곳`);
      if (m.toolRows !== 1) problems.push(`${r.path}: 툴 목록 ${m.toolRows}곳`);
      if (m.devices > RESTRAINT.devices) problems.push(`${r.path}: 장치 ${m.devices} > 6`);
    }
    assertNoProblems('같은 사실 · 장치', problems);
  });
});
