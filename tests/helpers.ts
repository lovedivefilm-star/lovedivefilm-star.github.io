/**
 * 시험 공용 — v4 → v5 1단계(홈 · 상단 바). docs/contract.md 1~3절 · docs/review-gate.md 3 · 5-1 절을 코드로 옮긴 것.
 * 표식(셀렉터)은 전부 여기 한 곳. 제작이 표식을 바꾸면 여기만 고친다.
 */
import { test as base, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(HERE, '..');
export const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
export const MEDIA_DIR = path.join(PUBLIC_DIR, 'media');
export const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// ───────────────────────── 2절 작품 데이터 ─────────────────────────
export type Work = { slug: string; title: string; group: 'main' | 'tools'; ratio: '9:16' | '16:9'; yt: string };
export const WORKS: Work[] = [
  { slug: 'oneandonly', title: '오직 당신의 것 EP.01', group: 'main', ratio: '9:16', yt: 'NPlAjWuCsAY' },
  { slug: 'firstimpression', title: '첫 인상은 백점, 첫 마디는 엎드려', group: 'main', ratio: '9:16', yt: '1XMjpYyastE' },
  { slug: 'butter', title: '버터! [VirTer!]', group: 'main', ratio: '16:9', yt: 'U3niqUCEe4M' },
  { slug: 'kinetic', title: '키네틱 타이포', group: 'tools', ratio: '16:9', yt: 'Oj4sifOxMmc' },
  { slug: 'mindhunter', title: '마인드헌터', group: 'tools', ratio: '16:9', yt: '4AJDL9m3Zic' },
  { slug: 'curlyshyll', title: 'Curly shyll AI CF', group: 'tools', ratio: '16:9', yt: 'OtggacvS4U0' },
  { slug: 'musicvideo', title: '뮤직비디오', group: 'tools', ratio: '16:9', yt: 'biPmgQnTzdw' },
];
export const MAIN_WORKS = WORKS.filter((w) => w.group === 'main');
export const TOOL_WORKS = WORKS.filter((w) => w.group === 'tools');
export const roomPath = (w: Work) => (w.group === 'main' ? `/works/${w.slug}/` : `/tools/#${w.slug}`);

// ───────────────────────── 1절 방(페이지)과 주소 ─────────────────────────
export type Room = { key: string; path: string; name: string; kind: 'home' | 'work' | 'tools' };
// 홈(카드 5장) · 작품 방 3 · 툴 방. 404 는 따로(V-1). 홈은 첫 방문 진입(카드 올라옴)을 건너뛴 상태로 잰다(?skipIntro).
export const ROOMS: Room[] = [
  { key: 'home', path: '/?skipIntro', name: '홈(카드)', kind: 'home' },
  ...MAIN_WORKS.map((w) => ({ key: `works-${w.slug}`, path: `/works/${w.slug}/`, name: w.title, kind: 'work' as const })),
  { key: 'tools', path: '/tools/', name: '툴', kind: 'tools' },
];
export const WORK_ROOMS = ROOMS.filter((r) => r.kind === 'work');
export const ABSENT_ROOMS = ['/works/', '/about/', '/contact/', '/career/', '/resume/', '/cv/'];

// ───────────────────────── 3절 시험용 표식 ─────────────────────────
export const SEL = {
  nav: 'nav[data-nav]',
  contact: '[data-nav="contact"]',
  copy: '[data-copy]',
  // 홈(v5 1단계)
  cards: '[data-cards]',
  card: (k: string) => `[data-cards] [data-card="${k}"]`,
  cardLink: (slug: string) => `[data-card="${slug}"] [data-card-link]`,
  cardMedia: '[data-cards] [data-card] [data-card-media]',
  job: '[data-job]',
  toolCell: (slug: string) => `[data-tool-cell="${slug}"]`,
  tasterTab: (slug: string) => `[data-taster-tab="${slug}"]`,
  tasterPage: (slug: string) => `[data-taster-page="${slug}"]`,
  tasterScroll: '[data-taster-scroll]',
  readerOpen: '[data-reader-open]',
  reader: 'dialog[data-reader]',
  readerClose: '[data-reader-close]',
  // 방
  work: (slug: string) => `[data-work="${slug}"]`,
  meta: '[data-meta]',
  metaRow: (k: string) => `[data-meta-row="${k}"]`,
  title: '[data-title]',
  line: '[data-line]',
  video: '[data-video]',
  vbox: '[data-vbox]',
  play: '[data-vbox] .play[data-play]',
  intro: '[data-intro-text]',
  process: '[data-process]',
  stage: '[data-process] [data-stage]',
  stepGo: (i: number) => `[data-process] [data-step-go="${i}"]`,
  cutPlay: '[data-process] .play[data-play][data-start]',
  next: '[data-next]',
  verbatim: '[data-work] [data-src]',
  tool: (slug: string) => `[data-tool="${slug}"]`,
};
/** 한 컷이 만들어진 순서 — 걸음 4개(대본 · 시트 · 연출 · 완성)와 스냅 위치(src/scripts/site.ts SNAP) */
export const CUT_STEPS = ['대본', '시트', '연출', '완성'] as const;
export const CUT_SNAP = [0, 1 / 3, 2 / 3, 1];

/** 작가 원문 대조 문서 폴더 — `<slug>.md`(V-16) */
export const PROCESS_DOC_DIR = process.env.QA_PROCESS_DOC_DIR ?? 'G:/내 드라이브/포폴 웹사이트 만들기/_분석/작품과정';
/** 작가 원문 폴더의 뿌리 — data-src 가 `_분석/…` 꼴이면 이 아래 파일과 대조(홈 대본 맛보기 = `_분석/대본/*.txt`) */
export const ANALYSIS_ROOT = process.env.QA_ANALYSIS_ROOT ?? 'G:/내 드라이브/포폴 웹사이트 만들기';

/** 홈 카드 순서(작가 10-14 v5 구체화 ① — 오직 당신의 것 첫 카드 · 대본 카드 맨 뒤) */
export const HOME_CARDS = ['oneandonly', 'firstimpression', 'butter', 'tools', 'script'] as const;
/** 화면에 나오면 안 되는 낱말(review-gate 2절 금지 목록 — 내부 용어 · 작가 10-14 「블로킹맵 쓰지마」). 「원테이크」(촬영 용어)는 생성 테이크가 아니라 뺀다 */
export const FORBIDDEN_WORDS: RegExp[] = [/블로킹맵/, /세그먼트/, /(?<!원)테이크/];

// ───────────────────────── 공모전 낱말 ─────────────────────────
export const CONTEST_WORDS_KO = ['비글루', '서울드라마어워즈', '페스티벌', '챌린지', '공모전'];
export const CONTEST_WORD_OYE = /(?<![A-Za-z])OYE(?![A-Za-z])/i;

export const SETTLE_MS = Number(process.env.QA_SETTLE_MS ?? 1500);
/** 작품 방 히어로 연출(≈2.2s)이 끝나길 기다리는 시간 */
export const HERO_MS = Number(process.env.QA_HERO_MS ?? 2800);

// ───────────────────────── 유튜브는 막는다 ─────────────────────────
export const YT_URL = /^https?:\/\/([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|youtu\.be)\//i;
const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

export const test = base.extend<{ _youtubeStub: void }>({
  _youtubeStub: [
    async ({ context }, use) => {
      await context.route(YT_URL, async (route) => {
        const url = route.request().url();
        if (/\.(png|jpe?g|webp)(\?|$)/i.test(url)) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
        return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><meta charset="utf-8"><title>youtube stub</title>' });
      });
      await use();
    },
    { auto: true },
  ],
});
export { expect } from '@playwright/test';

// ───────────────────────── 공용 동작 ─────────────────────────
export async function visit(page: Page, p: string): Promise<number> {
  const res = await page.goto(p, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  return res?.status() ?? 0;
}
export const settle = (page: Page, ms = SETTLE_MS) => page.waitForTimeout(ms);

export function assertNoProblems(header: string, problems: string[]) {
  if (problems.length === 0) return;
  const err = new Error(`${header} — ${problems.length}건\n  · ${problems.join('\n  · ')}`);
  err.stack = `Error: ${err.message}`;
  throw err;
}

/** 아래로 천천히 내려 lazy 그림을 다 받게 한 뒤 맨 위로 */
export async function loadAll(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(300, innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    await Promise.all(Array.from(document.images).map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); }))));
    window.scrollTo(0, 0);
  });
}

// ───────────────────────── page.evaluate 안에서 도는 측정 함수들(바깥 변수 금지) ─────────────────────────

export type OverlayArg = { sel: string; tag?: string };
/**
 * 영상 위 덮개: 보이는 모든 [data-video] 의 가운데 · 네 귀퉁이 안쪽 5점에서
 * ① 클릭이 닿는 맨 위 요소가 영상 자리 자신 또는 자식인가 ② 눈에 보이게 위에 얹힌 요소(글자 · 배경 · 이미지)가 없는가
 * ③ 영상 자리 안(자식)에 버튼 · 링크 밖의 글자가 없는가.
 */
export function overlayProbe(arg: OverlayArg): { count: number; problems: string[] } {
  const problems: string[] = [];
  const vis = { checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions;
  const vids = Array.from(document.querySelectorAll<HTMLElement>(arg.sel)).filter((el) => el.checkVisibility(vis));
  const nameOf = (e: Element | null): string => {
    if (!e) return 'null';
    const h = e as HTMLElement;
    const cls = typeof h.className === 'string' && h.className.trim() ? '.' + h.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const txt = (h.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
    return `<${e.tagName.toLowerCase()}${cls}>${txt ? ` "${txt}"` : ''}`;
  };
  const painted = (e: Element): boolean => {
    for (let a: Element | null = e; a; a = a.parentElement) {
      const c = getComputedStyle(a);
      if (parseFloat(c.opacity) === 0 || c.visibility === 'hidden' || c.display === 'none') return false;
    }
    const cs = getComputedStyle(e);
    if (['IMG', 'SVG', 'CANVAS', 'VIDEO', 'IFRAME', 'PICTURE'].includes(e.tagName.toUpperCase())) return true;
    if (cs.backgroundImage && cs.backgroundImage !== 'none') return true;
    if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') return true;
    for (const n of Array.from(e.childNodes)) if (n.nodeType === 3 && (n.textContent ?? '').trim()) return true;
    return false;
  };
  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{pointer-events:auto !important}';
  vids.forEach((el, idx) => {
    const id = el.getAttribute('data-youtube-id') ?? `${arg.tag ?? 'video'}#${idx}`;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
    const r = el.getBoundingClientRect();
    const x0 = Math.max(r.left, 0), y0 = Math.max(r.top, 0), x1 = Math.min(r.right, innerWidth - 1), y1 = Math.min(r.bottom, innerHeight - 1);
    if (x1 - x0 <= 4 || y1 - y0 <= 4) return void problems.push(`[${id}] 영상 자리가 화면에 거의 안 보임`);
    // 9:16 칸은 가운데 세로 플레이어 — 양옆 #050505 는 칸 바탕(덮개 아님). 플레이어(자식) 쪽 귀퉁이를 잰다
    const inner = el.querySelector<HTMLElement>(':scope > .hook, :scope > lite-youtube');
    const ir = inner?.getBoundingClientRect();
    const ax0 = ir ? Math.max(ir.left, x0) : x0, ax1 = ir ? Math.min(ir.right, x1) : x1;
    const inset = Math.max(2, Math.min(10, Math.min(ax1 - ax0, y1 - y0) * 0.1));
    const pts: [string, number, number][] = [
      ['가운데', (ax0 + ax1) / 2, (y0 + y1) / 2],
      ['왼쪽위', ax0 + inset, y0 + inset],
      ['오른쪽위', ax1 - inset, y0 + inset],
      ['왼쪽아래', ax0 + inset, y1 - inset],
      ['오른쪽아래', ax1 - inset, y1 - inset],
    ];
    const hits = new Map<string, string[]>();
    const hit = (m: string, l: string) => hits.set(m, [...(hits.get(m) ?? []), l]);
    for (const [label, x, y] of pts) {
      const top = document.elementFromPoint(x, y);
      if (!top || (top !== el && !el.contains(top))) hit(`영상 위에 ${nameOf(top)} 가 올라와 있음(클릭이 막힘)`, label);
    }
    document.head.appendChild(style);
    try {
      for (const [label, x, y] of pts) {
        for (const e of document.elementsFromPoint(x, y)) {
          if (e === el) break;
          if (el.contains(e) || e.contains(el)) continue;
          if (painted(e)) hit(`${nameOf(e)} 가 영상 위에 겹쳐 보임`, label);
        }
      }
    } finally {
      style.remove();
    }
    for (const [m, ls] of hits) problems.push(`[${id}] ${ls.join('·')}: ${m}`);
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const t = (n.textContent ?? '').trim();
      const p = n.parentElement;
      if (!t || !p || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(p.tagName)) continue;
      const ctl = p.closest('button,a,[role="button"]');
      if (ctl && el.contains(ctl)) continue;
      if (!p.checkVisibility(vis)) continue;
      problems.push(`[${id}] 영상 자리 안에 글자 「${t.slice(0, 20)}」`);
      break;
    }
  });
  return { count: vids.length, problems };
}

/** 페이지에 "글자로 있는" 모든 것 — 보이지 않는 DOM 글자 · alt · title · aria-label · meta 포함. */
export function pageTexts(): string[] {
  const out: string[] = [];
  const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE']);
  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement;
    if (p && skip.has(p.tagName)) continue;
    const t = (n.textContent ?? '').trim();
    if (t) out.push(t);
  }
  document.querySelectorAll('[alt],[title],[aria-label],[placeholder],meta[content]').forEach((e) => {
    for (const a of ['alt', 'title', 'aria-label', 'placeholder', 'content']) {
      const v = e.getAttribute(a);
      if (v && v.trim()) out.push(v.trim());
    }
  });
  out.push(document.title);
  return out;
}

/** 페이지가 끌어오는 이미지 · 영상 주소 전부 (img · source · video · og:image · CSS 배경). */
export function mediaRefs(): string[] {
  const urls = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (!u) return;
    const t = u.trim();
    if (!t || t.startsWith('data:') || t.startsWith('blob:')) return;
    try {
      urls.add(new URL(t, location.href).href);
    } catch {
      urls.add(t);
    }
  };
  const addSet = (s: string | null) => s && s.split(',').forEach((c) => add(c.trim().split(/\s+/)[0]));
  document.querySelectorAll('img').forEach((e) => {
    add(e.getAttribute('src'));
    addSet(e.getAttribute('srcset'));
  });
  document.querySelectorAll('source').forEach((e) => {
    add(e.getAttribute('src'));
    addSet(e.getAttribute('srcset'));
  });
  document.querySelectorAll('video').forEach((e) => {
    add(e.getAttribute('src'));
    add(e.getAttribute('poster'));
  });
  document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach((e) => add(e.getAttribute('content')));
  document.querySelectorAll<HTMLElement>('*').forEach((e) => {
    const bg = getComputedStyle(e).backgroundImage;
    if (bg && bg !== 'none') for (const m of bg.matchAll(/url\((['"]?)(.*?)\1\)/g)) add(m[2]);
  });
  return [...urls];
}

/** 화면(뷰포트) 안에 보이는 글자의 크기 단계 — 글자를 직접 가진 요소의 계산된 font-size(.5px 단위) */
export function visibleFontSizes(): { sizes: number[]; samples: Record<string, string> } {
  const vis = { checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions;
  const sizes = new Set<number>();
  const samples: Record<string, string> = {};
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = (n.textContent ?? '').trim();
    const p = n.parentElement;
    if (!t || !p || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(p.tagName)) continue;
    if (!p.checkVisibility(vis)) continue;
    let hidden = false;
    for (let a: Element | null = p; a; a = a.parentElement) if (parseFloat(getComputedStyle(a).opacity) < 0.05) hidden = true;
    if (hidden) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
    const fs = Math.round(parseFloat(getComputedStyle(p).fontSize) * 2) / 2;
    sizes.add(fs);
    samples[String(fs)] ??= t.slice(0, 18);
  }
  return { sizes: [...sizes].sort((a, b) => a - b), samples };
}

/** 테두리 있는 칸(상자) — 표(table) 안 · 다음 작품 위 괘선([data-next]) 밖에서. 보이는 것만. */
export function boxProbe(): { boxes: string[]; tables: number } {
  const vis = { checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions;
  const boxes: string[] = [];
  const all = Array.from(document.body.querySelectorAll<HTMLElement>('*'));
  for (const e of all) {
    if (e.closest('table, [data-next]')) continue;
    if (e.matches('[data-process] .box')) continue; // 과정 무대의 연결 상자(정지 그림 위 표시 — 메인 지시 10-14)
    if (!e.checkVisibility(vis)) continue;
    const cs = getComputedStyle(e);
    const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => {
      const w = parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`));
      const st = cs.getPropertyValue(`border-${s.toLowerCase()}-style`);
      const c = cs.getPropertyValue(`border-${s.toLowerCase()}-color`);
      return w > 0 && st !== 'none' && st !== 'hidden' && !/rgba\([^)]*,\s*0\)$/.test(c) && c !== 'transparent';
    });
    if (sides.length) {
      const r = e.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) boxes.push(`<${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : ''}> ${sides.join('/')}`);
    }
  }
  const tables = Array.from(document.querySelectorAll('table')).filter((t) => t.checkVisibility(vis)).length;
  return { boxes, tables };
}

/** 지금 돌고 있는 움직임 — CSS/WAAPI(document.getAnimations) + GSAP(window.__motion) */
export function motionProbe(): { css: string[]; gsap: number } {
  const css = document
    .getAnimations()
    .filter((a) => a.playState === 'running')
    .map((a) => {
      const t = (a.effect as KeyframeEffect | null)?.target as HTMLElement | null;
      const name = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? a.constructor.name;
      return `${name} @ ${t ? `<${t.tagName.toLowerCase()}.${String(t.className).split(' ')[0]}>` : '?'}`;
    });
  return { css, gsap: (window as unknown as { __motion?: () => number }).__motion?.() ?? -1 };
}

// ───────────────────────── 첫 화면 전송량 (CDP) ─────────────────────────
const EXCLUDED_HOST = /(^|\.)((youtube|youtube-nocookie|ytimg|googlevideo)\.com|youtu\.be)$/i;
const MEDIA_EXT = /\.(mp4|webm|mov|m4v|mkv|ogv)(\?|$)/i;
const FONT_EXT = /\.(woff2?|ttf|otf|eot)(\?|$)/i;
export type Landing = { status: number; totalBytes: number; fonts: { url: string; bytes: number }[]; top: { url: string; bytes: number; type: string }[] };

export async function measureLanding(page: Page, context: BrowserContext, p: string): Promise<Landing> {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  const reqs = new Map<string, { url: string; type: string }>();
  const done: { url: string; type: string; bytes: number }[] = [];
  cdp.on('Network.requestWillBeSent', (e) => reqs.set(e.requestId, { url: e.request.url, type: e.type ?? '' }));
  cdp.on('Network.loadingFinished', (e) => {
    const r = reqs.get(e.requestId);
    if (r) done.push({ ...r, bytes: e.encodedDataLength });
  });
  const status = await visit(page, p);
  await page.waitForTimeout(800);
  await cdp.detach().catch(() => {});
  const counted = done.filter((d) => {
    if (d.url.startsWith('data:') || d.url.startsWith('blob:')) return false;
    let host = '';
    try {
      host = new URL(d.url).hostname;
    } catch {}
    if (EXCLUDED_HOST.test(host)) return false;
    if (d.type === 'Media' || MEDIA_EXT.test(d.url)) return false;
    return true;
  });
  return {
    status,
    totalBytes: counted.reduce((s, d) => s + d.bytes, 0),
    fonts: counted.filter((d) => d.type === 'Font' || FONT_EXT.test(d.url)).map((d) => ({ url: d.url, bytes: d.bytes })),
    top: [...counted].sort((a, b) => b.bytes - a.bytes).slice(0, 5),
  };
}

// ───────────────────────── 파일 목록 / 출처 ─────────────────────────
export function walkFiles(dir: string, b = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(full, b));
    else out.push(path.relative(b, full).split(path.sep).join('/'));
  }
  return out;
}
export const IMG_VIDEO_EXT = /\.(png|jpe?g|webp|avif|gif|svg|ico|bmp|tiff?|mp4|webm|mov|m4v|mkv|ogv)$/i;
export const RASTER_VIDEO_EXT = /\.(png|jpe?g|webp|avif|gif|bmp|tiff?|mp4|webm|mov|m4v|mkv|ogv)$/i;

/** media-sources.json 을 느슨하게 읽는다: { "a.jpg": "…" | { source } } · [ { file, source } ] */
export function readSources(jsonText: string): Map<string, string> {
  const map = new Map<string, string>();
  const norm = (k: string) => k.replace(/\\/g, '/').replace(/^\/?(public\/)?media\//, '').replace(/^\.?\//, '');
  const srcOf = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      for (const k of ['source', '출처', 'src', 'from', 'origin', 'credit']) if (typeof o[k] === 'string') return o[k] as string;
    }
    return '';
  };
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const it of node) {
        if (it && typeof it === 'object') {
          const o = it as Record<string, unknown>;
          const f = ['file', 'path', 'name', '파일', '파일명'].map((k) => o[k]).find((x) => typeof x === 'string') as string | undefined;
          if (f) map.set(norm(f), srcOf(o));
          else walk(it);
        }
      }
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (IMG_VIDEO_EXT.test(k)) map.set(norm(k), srcOf(v));
        else walk(v);
      }
    }
  };
  walk(JSON.parse(jsonText));
  return map;
}

/** 출처 문구가 「완성본 파일명 · 시점」 · 「작가 캡처」 · 시트 · 콘티 · 블로킹맵 · 프리비즈 · 합성 소스 · 기획안 쪽 · 대본 쪽 꼴인가 */
export const SOURCE_FORM = /작가\s*캡처|시트|완성본|직접\s*그림|콘티|블로킹맵|프리비즈|합성\s*소스|기획안\s*쪽|대본\s*쪽|\.(mp4|mov|mkv|webm|m4v)/i;

/** src/data/site.ts 의 CONTACT_EMAIL(시험 V-14) */
export function contactEmail(): string {
  const s = fs.readFileSync(path.join(SRC_DIR, 'data', 'site.ts'), 'utf8');
  return s.match(/export const CONTACT_EMAIL\s*=\s*['"]([^'"]*)['"]/)?.[1] ?? '';
}

/** 작가 확인 전 뮤직비디오 얼굴 프레임(review-gate 2절) — 어느 방에도 나오면 안 된다 */
export const WALL_HOLD_FILES = /\/media\/wall\/musicvideo_(1|2|3|5)_/;

/** 과정 고정 무대의 걸음 k(1~4) 끝 위치로 스크롤(스냅 위치 그대로) — 핀 구간은 [data-process] 의 data-pin-start/end */
export async function toCutStep(page: Page, k: number, wait = 1400): Promise<boolean> {
  const ok = await page.evaluate(
    ({ k, snap }) => {
      const s = document.querySelector<HTMLElement>('[data-process]');
      const a = Number(s?.dataset.pinStart), b = Number(s?.dataset.pinEnd);
      if (!s || !Number.isFinite(a) || !Number.isFinite(b) || b <= a) return false;
      window.scrollTo(0, k === 1 ? a : Math.floor(a + (b - a) * snap[k - 1]) - 1); // 방향 스냅이 이 걸음에 멈추도록 바로 앞에서
      return true;
    },
    { k, snap: CUT_SNAP },
  );
  await page.waitForTimeout(wait);
  return ok;
}

/**
 * 레퍼런스 절제 규칙(_분석/감사/2026-10-14_레퍼런스절제.md 1-2 지표 정의 · 3절 상한)을 한 화면에서 잰다.
 * 화면 = 지금 뷰포트에 보이는 것만(가려짐 · 투명 · 화면 밖 제외).
 */
export type ScreenStat = {
  sizes: number[];
  small: number[];
  families: string[];
  labels: string[];
  boxes: string[];
  rules: string[];
  fragments: number;
  eases: string[];
  durations: string[];
  media: number;
  /** 보이는 글자 중 가장 작은 계산 크기(px) */
  minFont: number;
};
export function screenStats(): ScreenStat {
  const vis = { checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions;
  const vw = innerWidth, vh = innerHeight;
  const shown = (e: Element) => {
    if (!(e as HTMLElement).checkVisibility?.(vis)) return false;
    for (let a: Element | null = e; a; a = a.parentElement) if (parseFloat(getComputedStyle(a).opacity) < 0.05) return false;
    const r = e.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw;
  };
  const name = (e: Element) => `<${e.tagName.toLowerCase()}${typeof (e as HTMLElement).className === 'string' && (e as HTMLElement).className ? '.' + (e as HTMLElement).className.trim().split(/\s+/)[0] : ''}>`;
  const sizes = new Set<number>(), families = new Set<string>(), eases = new Set<string>(), durations = new Set<string>();
  const labels: string[] = [], boxes: string[] = [], rules: string[] = [];
  let fragments = 0;
  let minFont = Infinity;
  for (const e of Array.from(document.body.querySelectorAll('*'))) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'svg', 'line'].includes(e.tagName)) continue;
    if (!shown(e)) continue;
    const cs = getComputedStyle(e);
    // 테두리 · 괘선
    const sides = ['top', 'right', 'bottom', 'left'].filter((s) => parseFloat(cs.getPropertyValue(`border-${s}-width`)) > 0 && !['none', 'hidden'].includes(cs.getPropertyValue(`border-${s}-style`)) && !/rgba\([^)]*,\s*0\)$/.test(cs.getPropertyValue(`border-${s}-color`)));
    if (sides.length >= 3) boxes.push(name(e));
    else if (sides.length >= 1 || e.tagName === 'HR') rules.push(name(e));
    else {
      const r = e.getBoundingClientRect();
      if (r.height <= 2.5 && r.width > 20 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') rules.push(name(e) + '(채움 선)');
    }
    // 전환
    const ds = cs.transitionDuration.split(',').map((x) => x.trim());
    const ts = cs.transitionTimingFunction.split(/,(?![^(]*\))/).map((x) => x.trim());
    ds.forEach((d, i) => {
      if (parseFloat(d) > 0) {
        durations.add(d);
        eases.add(ts[i] ?? ts[0]);
      }
    });
    // 글
    const own = Array.from(e.childNodes).filter((n) => n.nodeType === 3 && (n.textContent ?? '').trim()).map((n) => (n.textContent ?? '').trim()).join(' ');
    if (!own) continue;
    const fs = Math.round(parseFloat(cs.fontSize));
    minFont = Math.min(minFont, parseFloat(cs.fontSize));
    if (e.closest('[data-artifact]')) {
      // 작업물(대본 종이)의 글은 UI 조각이 아니다 — 글 조각 · 라벨에서 빼고 크기 · 글꼴만 센다(메인 v5 지시)
      sizes.add(fs);
      families.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase());
      continue;
    }
    fragments++;
    sizes.add(fs);
    families.add(cs.fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase());
    const block = ((e.closest('p,li,td,th,h1,h2,h3,button,a,figcaption,summary') ?? e).textContent ?? '').trim();
    const numeric = /^[\d\s:.,\-–·/~()일초분년월화x×%]+$/.test(own) && /\d/.test(own);
    const isLabel = own.length <= 40 && block.length <= 60 && (fs <= 13 || cs.textTransform === 'uppercase' || /mono/i.test(cs.fontFamily) || numeric);
    if (isLabel) labels.push(own.slice(0, 16));
  }
  // 작업물 면적 — 보이는 영상 · 이미지 · iframe(겹침은 칸 격자로 한 번만 센다)
  const G = 8;
  const cols = Math.ceil(vw / G), rows = Math.ceil(vh / G);
  const grid = new Uint8Array(cols * rows);
  const medias = Array.from(document.querySelectorAll('img, video, iframe, lite-youtube')).filter((m) => shown(m));
  for (const m of medias) {
    const r = m.getBoundingClientRect();
    for (let y = Math.max(0, Math.floor(r.top / G)); y < Math.min(rows, Math.ceil(r.bottom / G)); y++)
      for (let x = Math.max(0, Math.floor(r.left / G)); x < Math.min(cols, Math.ceil(r.right / G)); x++) grid[y * cols + x] = 1;
  }
  let on = 0;
  grid.forEach((v) => (on += v));
  return {
    sizes: [...sizes].sort((a, b) => a - b),
    small: [...sizes].filter((s) => s <= 16).sort((a, b) => a - b),
    families: [...families],
    labels,
    boxes,
    rules,
    fragments,
    eases: [...eases],
    durations: [...durations],
    media: on / grid.length,
    minFont: Number.isFinite(minFont) ? minFont : 0,
  };
}

/** 절제 규칙 상한(_분석/감사/2026-10-14_레퍼런스절제.md 3절 · docs/review-gate.md 3절 장치 예산).
 * v5 1단계: 홈도 review-gate 3절 값(글자 크기 ≤ 5 · 글 조각 ≤ 20)으로 — 옛 홈 상한(크기 4 · 조각 12)은 인트로 벽용이었다(메인 1단계 지시 「옛 홈 시험은 정리」). */
export const RESTRAINT = { sizes: 5, small: 3, families: 2, labels: 12, boxes: 2, rules: 5, fragments: 20, eases: 3, durations: 6, sections: 6, devices: 6, lengthScreens: 3.5, homeSizes: 5, homeFragments: 20, firstMedia: 0.5, minFont: 12, infoFont: 14, jobFont: 16, tap: 44 };
