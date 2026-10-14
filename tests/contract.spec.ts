/**
 * v4 규약 시험 — docs/contract.md 4절(설계서 docs/v4-redesign.md 4절 + 메인 지시 10-14: 잠든 벽 인트로 · 영상 먼저 히어로 ·
 * 한 컷이 만들어진 순서(고정 무대 4걸음) · 툴 2×2 · 이전/다음 · 작가 지시 편집).
 * 실패하면 사이트를 고친다. 시험을 느슨하게 고치지 않는다.
 * 태그: @once = 화면 크기와 무관(1440 에서만). 없음 = 1440 · 1280 둘 다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { AUTHOR_EDITS } from '../src/data/edits';
import {
  ABSENT_ROOMS,
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
    if ((await page.locator(SEL.wall).count()) !== 1) problems.push('/: 작업 벽 [data-wall] 없음');
    for (const p of ABSENT_ROOMS) {
      const st = await visit(page, p);
      if (st !== 404) problems.push(`${p} → HTTP ${st} (있으면 안 되는 방)`);
    }
    assertNoProblems('방 존재', problems);
  });

  test('V-2. 콘솔 오류 0 — 전 방 · 인트로 입장 · 영상 재생 · 과정 걸음 · 요청 실패 · 4xx/5xx 포함', async ({ page }, testInfo) => {
    const problems: string[] = [];
    let where = '(시작)';
    page.on('console', (m) => m.type() === 'error' && problems.push(`[${where}] console.error: ${m.text()}`));
    page.on('pageerror', (e) => problems.push(`[${where}] pageerror: ${e.message.split('\n')[0]}`));
    page.on('requestfailed', (r) => {
      const err = r.failure()?.errorText ?? '';
      if (!/ERR_ABORTED/.test(err)) problems.push(`[${where}] 요청 실패: ${r.url()} (${err})`);
    });
    page.on('response', (r) => r.status() >= 400 && problems.push(`[${where}] HTTP ${r.status()}: ${r.url()}`));
    where = '/ 인트로';
    await visit(page, '/');
    await settle(page, 1300);
    await page.mouse.wheel(0, 120);
    await settle(page, 2800);
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

  test('V-5. 공모전 낱말 0 — 화면 글자(숨은 글 · alt · meta 포함) · 각 방 HTML · public 의 글 파일', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    const check = (label: string, s: string) => {
      const sq = s.replace(/\s+/g, '');
      for (const w of CONTEST_WORDS_KO) if (sq.includes(w)) problems.push(`${label}: 「${w}」`);
      if (CONTEST_WORD_OYE.test(s)) problems.push(`${label}: 「OYE」`);
    };
    for (const r of [...ROOMS, { path: '/' }, { path: '/없는-주소/' }]) {
      await visit(page, r.path);
      check(`${r.path} 글자`, (await page.evaluate(pageTexts)).join('\n'));
      check(`${r.path} HTML`, await page.content());
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

  test('V-9. 글자 크기 단계 — 홈(인트로 · 벽) ≤ 4 · 작품 방 첫 화면 ≤ 6', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const sizes = async (label: string, max: number) => {
      const r = await page.evaluate(visibleFontSizes);
      testInfo.annotations.push({ type: '글자 크기', description: `${label}: ${r.sizes.join(' · ')}` });
      if (r.sizes.length > max) problems.push(`${label}: ${r.sizes.length}단계 > ${max} — ${r.sizes.map((s) => `${s}px「${r.samples[String(s)]}」`).join(', ')}`);
    };
    await visit(page, '/');
    await settle(page, 2600);
    await sizes('홈 인트로', 4);
    await visit(page, '/?skipIntro');
    await settle(page, 1500);
    await sizes('홈 벽', 4);
    for (const r of WORK_ROOMS) {
      await visit(page, r.path);
      await settle(page, HERO_MS);
      await sizes(`${r.path} 첫 화면`, 6);
    }
    assertNoProblems(`글자 크기 단계 · ${testInfo.project.name}`, problems);
  });

  test('V-10. 상자(테두리 있는 칸) — 홈 0 · 작품 방 · 툴 방은 표(메타 1)와 다음 작품 위 괘선 · 과정 연결 상자뿐', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    for (const p of ['/', '/?skipIntro']) {
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

  test('V-11. 움직임이 진입 뒤 멈춘다 — 진입 + 3초 뒤 getAnimations(실행 중) 0 · GSAP 실행 중 0 (벽 드래그 관성 · 스크롤 걸음 제외)', async ({ page }, testInfo) => {
    const problems: string[] = [];
    const probe = async (label: string) => {
      const m = await page.evaluate(motionProbe);
      if (m.css.length) problems.push(`${label}: CSS/WAAPI 실행 중 ${m.css.length} — ${m.css.slice(0, 4).join(', ')}`);
      if (m.gsap !== 0) problems.push(`${label}: GSAP 실행 중 ${m.gsap}`);
    };
    await visit(page, '/');
    await settle(page, 1300);
    await page.mouse.wheel(0, 120);
    await settle(page, 2000 + 3000);
    await probe('/ 입장 뒤');
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

  test('V-13. 홈 → 작품 방 2클릭 이내에 풀영상 재생 — 벽 목록 · 벽 타일 두 길', async ({ page }, testInfo) => {
    const problems: string[] = [];
    for (const w of MAIN_WORKS) {
      await visit(page, '/?skipIntro');
      await settle(page, 800);
      await page.locator(SEL.wallLink(w.slug)).click(); // 클릭 1
      await page.waitForURL(`**/works/${w.slug}/`, { timeout: 6_000 }).catch(() => problems.push(`목록 ${w.slug}: 방으로 가지 않음 (${page.url()})`));
      await page.locator(SEL.work(w.slug)).waitFor({ timeout: 6_000 }).catch(() => {});
      await settle(page, 400);
      await page.locator(SEL.play).first().click(); // 클릭 2
      problems.push(...(await expectPlayed(page, `${SEL.vbox} ${SEL.video}`, w, `목록 → ${w.slug}`)));
    }
    await visit(page, '/?skipIntro');
    await settle(page, 1200);
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width / 2 + 30, vp.height / 2 + 20);
    await settle(page, 300);
    await page.mouse.click(vp.width / 2 + 30, vp.height / 2 + 20); // 클릭 1
    await page.waitForURL(/\/(works\/[a-z]+|tools)\//, { timeout: 6_000 }).catch(() => problems.push(`가운데 타일: 방으로 가지 않음 (${page.url()})`));
    await settle(page, 1200);
    const u = new URL(page.url());
    const w = u.pathname.startsWith('/works/') ? WORKS.find((x) => u.pathname.includes(x.slug)) : WORKS.find((x) => x.slug === u.hash.slice(1));
    if (!w) problems.push(`가운데 타일: 어느 작품 방인지 모름 (${page.url()})`);
    else {
      const box = w.group === 'main' ? SEL.vbox : `${SEL.tool(w.slug)} ${SEL.vbox}`;
      await page.locator(`${box} .play`).first().click(); // 클릭 2
      problems.push(...(await expectPlayed(page, `${box} ${SEL.video}`, w, `타일 → ${w.slug}`)));
    }
    assertNoProblems(`2클릭 재생 · ${testInfo.project.name}`, problems);
  });

  test('V-14. 연락 링크는 mailto — 주소가 없으면 연락 링크 · 빈자리 표시 모두 없다', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    const email = contactEmail();
    test.info().annotations.push({ type: 'CONTACT_EMAIL', description: email || '(비어 있음 — 링크 없음 상태를 시험)' });
    for (const r of [...ROOMS, { path: '/' }]) {
      await visit(page, r.path);
      const links = await page.locator(SEL.contact).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
      const mail = await page.locator('a[href^="mailto:"]').count();
      if (!email) {
        if (links.length || mail) problems.push(`${r.path}: 주소가 비었는데 연락 링크가 있음 (${links.join(', ')})`);
        if (/이메일 자리|\[이메일/.test((await page.evaluate(pageTexts)).join(' '))) problems.push(`${r.path}: 이메일 빈자리 표시`);
      } else {
        if (!links.length) problems.push(`${r.path}: 연락 링크 없음`);
        for (const h of links) if (h !== `mailto:${email}`) problems.push(`${r.path}: 연락 링크가 mailto:${email} 가 아님 (${h})`);
        if (!r.path.startsWith('/?') && r.path !== '/' && !(await page.locator('[data-contact-foot]').count())) problems.push(`${r.path}: 푸터 큰 연락 링크 없음`);
      }
    }
    assertNoProblems('연락 링크', problems);
  });

  test('V-15. 인트로 = 잠든 벽 — 같은 벽이 ×2.2 · 어둡게 · 영상 칸은 미룸 · 자동 진행 없음 · 휠 한 칸이면 벽이 물러나고 이름은 상단 바로 · 재방문 · 직링크 생략', { tag: '@once' }, async ({ browser }) => {
    const problems: string[] = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ko-KR' });
    const page = await ctx.newPage();
    await visit(page, '/');
    await settle(page, 2500);
    if (!(await page.locator(`${SEL.introLayer} .intro-name`).isVisible())) problems.push('첫 방문: 인트로 이름이 안 보임');
    for (const t of ['김영건', 'AI 영상 · AI 숏드라마 · 대본', '스크롤하여 입장']) if (!(await page.getByText(t, { exact: true }).first().isVisible())) problems.push(`첫 방문: 「${t}」 안 보임`);
    if (await page.locator(`${SEL.introLayer} img`).count()) problems.push('인트로에 따로 떠 있는 그림이 있음(잠든 벽이어야)');
    const cam = await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('[data-cam]');
      if (!c) return null;
      const cs = getComputedStyle(c);
      const m = new DOMMatrix(cs.transform);
      return { scale: m.a, filter: cs.filter };
    });
    if (!cam || cam.scale < 2 || !/brightness\(0\.3/.test(cam.filter)) problems.push(`인트로 동안 벽이 가깝고 어둡지 않음 (${JSON.stringify(cam)})`);
    const vids = await page.locator('[data-wall] video').evaluateAll((els) => els.map((v) => ({ pre: (v as HTMLVideoElement).preload, paused: (v as HTMLVideoElement).paused })));
    if (vids.length !== 3) problems.push(`벽 영상 칸 ${vids.length}개 (3개여야)`);
    if (vids.some((v) => v.pre !== 'none' || !v.paused)) problems.push(`입장 전 벽 영상이 미뤄지지 않음 ${JSON.stringify(vids)}`);
    await settle(page, 2500);
    if (!(await page.locator(SEL.introLayer).isVisible())) problems.push('입력 없이 인트로가 넘어감(자동 진행)');
    await page.mouse.wheel(0, 100);
    await settle(page, 2600);
    if (await page.locator(SEL.introLayer).isVisible()) problems.push('휠 한 칸(100)으로 입장하지 않음');
    const after = await page.evaluate(() => {
      const c = document.querySelector<HTMLElement>('[data-cam]')!;
      const cs = getComputedStyle(c);
      const name = document.querySelector<HTMLElement>('.tb-name')!;
      return { t: cs.transform, f: cs.filter, nameO: getComputedStyle(name).opacity, playing: [...document.querySelectorAll<HTMLVideoElement>('[data-wall] video')].filter((v) => !v.paused).length };
    });
    if (after.t !== 'none' || after.f !== 'none') problems.push(`입장 뒤 벽이 제 크기 · 밝기로 돌아오지 않음 (${after.t} · ${after.f})`);
    if (after.nameO !== '1') problems.push(`입장 뒤 상단 바 이름이 안 보임 (opacity ${after.nameO})`);
    if (!after.playing) problems.push('입장 뒤 보이는 벽 영상 칸이 재생되지 않음');
    if (!(await page.locator(SEL.wallRead).isVisible())) problems.push('입장 뒤 벽 읽음이 안 보임');
    await visit(page, '/');
    await settle(page, 1000);
    if (await page.locator(SEL.introLayer).isVisible()) problems.push('같은 세션 재방문인데 인트로가 다시 나옴');
    await ctx.close();
    const c2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p2 = await c2.newPage();
    await visit(p2, '/?skipIntro');
    await settle(p2, 800);
    if (await p2.locator(SEL.introLayer).isVisible()) problems.push('?skipIntro 인데 인트로가 나옴');
    await c2.close();
    const c3 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p3 = await c3.newPage();
    await visit(p3, '/works/butter/');
    await p3.locator('[data-back]').click();
    await settle(p3, 1500);
    if (await p3.locator(SEL.introLayer).isVisible()) problems.push('작품 방 직링크 → 「← 작품」 인데 인트로가 나옴');
    await c3.close();
    assertNoProblems('인트로', problems);
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

  test('V-18. 작업 벽 — 장면 38장(wall.json 42 − 보류 4) · 영상 칸 3 · 이웃 칸에 같은 장면 없음 · 호버한 칸만 컬러 · 읽음 「작품 · 형식 · 연도」 · 목록 7편', { tag: '@once' }, async ({ page }) => {
    const problems: string[] = [];
    await visit(page, '/?skipIntro');
    await settle(page, 1500);
    const srcs = await page.locator('[data-wall] .item').evaluateAll((els) => els.map((e) => e.getAttribute('data-src') ?? ''));
    const uniq = new Set(srcs.filter(Boolean));
    const wallJson = path.join(SRC_DIR, 'data', 'wall.json');
    if (fs.existsSync(wallJson)) {
      const all = JSON.parse(fs.readFileSync(wallJson, 'utf8')) as { slug: string; n: number }[];
      const want = all.filter((x) => !(x.slug === 'musicvideo' && [1, 2, 3, 5].includes(x.n))).length;
      if (uniq.size !== want) problems.push(`벽 장면 ${uniq.size}장 (기대 ${want} = wall.json ${all.length} − 작가 확인 전 뮤직비디오 4)`);
      for (const s of uniq) if (!s.startsWith('/media/wall/')) problems.push(`벽 장면이 /media/wall/ 밖: ${s}`);
    }
    for (const s of uniq) if (WALL_HOLD_FILES.test(s)) problems.push(`보류 칸이 벽에: ${s}`);
    const vids = await page.locator('[data-wall] .item[data-video] video').evaluateAll((els) => els.map((v) => v.getAttribute('src') ?? ''));
    if (vids.length !== 3 || !vids.every((v) => /\/media\/hook_[a-z]+\.mp4$/.test(v))) problems.push(`벽 영상 칸 ${vids.length}개 (${vids.join(', ')}) — 주력 3편 후킹 클립이어야`);
    const ROWS = 7;
    for (let i = 0; i < srcs.length; i++) {
      const near = [...(i % ROWS < ROWS - 1 ? [i + 1] : []), ...[ROWS - 1, ROWS, ROWS + 1].map((d) => (i + d) % srcs.length)];
      for (const j of near) if (srcs[i] && srcs[i] === srcs[j]) problems.push(`칸 ${i} · ${j} 이웃에 같은 장면 ${srcs[i]}`);
    }
    const vp = page.viewportSize()!;
    await page.mouse.move(vp.width / 2 + 30, vp.height / 2 + 20);
    await settle(page, 600);
    const f = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y)?.closest('.item__image');
      const media = el?.querySelector('img, video');
      const others = Array.from(document.querySelectorAll('[data-wall] .item__image :is(img, video)')).filter((i) => i !== media).slice(0, 40);
      return { hovered: media ? getComputedStyle(media).filter : '(없음)', colored: others.filter((i) => /grayscale\(0\)/.test(getComputedStyle(i).filter)).length };
    }, [vp.width / 2 + 30, vp.height / 2 + 20]);
    if (!/grayscale\(0\)/.test(f.hovered)) problems.push(`호버한 칸이 컬러가 아님 (${f.hovered})`);
    if (f.colored) problems.push(`호버하지 않은 칸 ${f.colored}개가 컬러`);
    const read = (await page.locator(SEL.wallRead).textContent())?.trim() ?? '';
    if (!/^.+ · .+ · \d{4}$/.test(read)) problems.push(`가운데 읽음이 「작품 · 형식 · 연도」 꼴이 아님: 「${read}」`);
    for (const w of WORKS) {
      const href = await page.locator(SEL.wallLink(w.slug)).getAttribute('href');
      const want = w.group === 'main' ? `/works/${w.slug}/` : `/tools/#${w.slug}`;
      if (href !== want) problems.push(`목록 ${w.slug}: href ${href} (기대 ${want})`);
    }
    if ((await page.locator('[data-wall] nav a').count()) !== 7) problems.push('목록이 7편이 아님');
    assertNoProblems('작업 벽', problems);
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

  test('V-20. 움직임 줄이기 — 인트로 없음 · 작품 방 첫 상태 그대로 · 과정은 핀 없이 4장면 세로 · 선은 그려진 상태 · 움직임 0', { tag: '@once' }, async ({ browser }) => {
    const problems: string[] = [];
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await visit(page, '/');
    await settle(page, 600);
    if (await page.locator(SEL.introLayer).isVisible()) problems.push('/: 움직임 줄이기인데 인트로가 나옴');
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
  test('V-25. 절제 규칙(한 화면) — 글자 크기 ≤ 5(16px 이하 ≤ 3) · 글꼴 ≤ 2 · 라벨/번호/메타 ≤ 12 · 테두리 상자 ≤ 2 · 괘선 ≤ 5 · 글 조각 ≤ 20 · 이징 ≤ 3 · 전환 시간 ≤ 6 / 홈 첫 화면 글자 크기 ≤ 4 · 글 조각 ≤ 12', async ({ page }, testInfo) => {
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
      testInfo.annotations.push({ type: '한 화면', description: `${label}: 크기 ${st.sizes.join('·')} · 라벨 ${st.labels.length} · 상자 ${st.boxes.length} · 괘선 ${st.rules.length} · 글 조각 ${st.fragments} · 작업물 ${(st.media * 100).toFixed(0)}%` });
    };
    await visit(page, '/');
    await settle(page, 2600);
    await check('/ 인트로', true);
    await visit(page, '/?skipIntro');
    await settle(page, 1500);
    await check('/ 벽', true);
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
