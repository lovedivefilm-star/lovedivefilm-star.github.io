/**
 * 시험 공용 — docs/contract.md 의 1~3절을 코드로 옮긴 것.
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
export type Work = {
  slug: string;
  title: string;
  group: 'main' | 'tools';
  ratio: '9:16' | '16:9';
  yt: string;
};

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

// ───────────────────────── 1절 방(페이지)과 주소 ─────────────────────────
export type Room = { key: string; path: string; name: string };
// 방은 다섯뿐: 홈 · 작품 상세 3 · 툴. (연락은 방이 아니라 상단 바의 이메일 한 줄)
export const ROOMS: Room[] = [
  { key: 'home', path: '/', name: '홈' },
  ...MAIN_WORKS.map((w) => ({ key: `works-${w.slug}`, path: `/works/${w.slug}/`, name: `작품 상세 ${w.slug}` })),
  { key: 'tools', path: '/tools/', name: '툴' },
];
// 있으면 안 되는 방(404 여야 함): 작품 목록 · 소개 · 연락 · 경력/이력
export const ABSENT_ROOMS = ['/works/', '/about/', '/contact/', '/career/', '/experience/', '/resume/', '/cv/'];

// ───────────────────────── 3절 시험용 표식 ─────────────────────────
export const SEL = {
  nav: 'nav[data-nav]',
  navContact: '[data-nav="contact"]',
  door: (k: string) => `[data-door="${k}"]`,
  video: '[data-video]',
  hook: '[data-hook]',
  hookVideo: '[data-hook] video',
  script: '[data-script]',
  credit: '[data-credit]',
  process: '[data-process]',
  authorCopy: '[data-placeholder="author-copy"]',
  work: (slug: string) => `[data-work="${slug}"]`,
  // ── 3절에 정의가 없어 시험이 "가정"한 표식 (제작과 맞출 것 · 맞춰지면 contract.md 3절에 추가) ──
  // /tools/ 의 카드: data-work="<slug>" (또는 data-tool="<slug>")
  toolCard: '[data-work], [data-tool]',
  // 툴 모달: data-modal 또는 <dialog open> 또는 role="dialog"
  modal: '[data-modal], dialog[open], [role="dialog"]',
};

// 홈 네 모서리 출입구 → 가는 방
export const DOOR_TARGETS: Record<string, string> = {
  oneandonly: '/works/oneandonly/',
  firstimpression: '/works/firstimpression/',
  butter: '/works/butter/',
  tools: '/tools/',
};
export const DOORS = Object.keys(DOOR_TARGETS);

// ───────────────────────── 4절-8 공모전 낱말 ─────────────────────────
// 한글은 공백을 지우고 비교(「서울 드라마 어워즈」도 잡는다). OYE 는 영문 낱말 경계로.
export const CONTEST_WORDS_KO = ['비글루', '서울드라마어워즈', '페스티벌', '챌린지', '공모전'];
export const CONTEST_WORD_OYE = /(?<![A-Za-z])OYE(?![A-Za-z])/i;

// 시험이 기다려 주는 시간 (첫 진입 연출 · 전환 연출이 끝나길). QA_SETTLE_MS 로 조절.
export const SETTLE_MS = Number(process.env.QA_SETTLE_MS ?? 1500);

// ───────────────────────── 시험 확장: 유튜브는 막는다 ─────────────────────────
// 시험이 외부 유튜브에 닿지 않게(오프라인 · 속도 · 약관). iframe 은 생기지만 안은 빈 문서.
export const YT_URL = /^https?:\/\/([a-z0-9-]+\.)*(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|youtu\.be)\//i;
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const test = base.extend<{ _youtubeStub: void }>({
  _youtubeStub: [
    async ({ context }, use) => {
      await context.route(YT_URL, async (route) => {
        const url = route.request().url();
        if (/\.(png|jpe?g|webp)(\?|$)/i.test(url)) {
          return route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 });
        }
        return route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: '<!doctype html><meta charset="utf-8"><title>youtube stub</title>',
        });
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

/** problems 가 비어 있지 않으면 한 덩어리 메시지로 실패시킨다. */
export function assertNoProblems(header: string, problems: string[]) {
  if (problems.length === 0) return;
  const err = new Error(`${header} — ${problems.length}건\n  · ${problems.join('\n  · ')}`);
  err.stack = `Error: ${err.message}`; // 보고서에 코드 조각 대신 문제 목록만
  throw err;
}

/** page.evaluate(fn) 이 "문제 목록(빈 배열=통과)" 을 돌려줄 때, 통과할 때까지 최대 timeoutMs 기다린다. */
export async function pollProblems<A = undefined>(
  page: Page,
  probe: ((arg: A) => string[] | Promise<string[]>) | (() => string[] | Promise<string[]>),
  timeoutMs = 3_000,
  everyMs = 250,
  arg?: A,
): Promise<string[]> {
  const end = Date.now() + timeoutMs;
  let last: string[] = ['(측정 전)'];
  for (;;) {
    try {
      last = await page.evaluate(probe as (a: A) => string[], arg as A);
    } catch (e) {
      last = [`측정 오류: ${(e as Error).message.split('\n')[0]}`];
    }
    if (last.length === 0 || Date.now() >= end) return last;
    await page.waitForTimeout(everyMs);
  }
}

// ───────────────────────── 툴 카드 → 모달 ─────────────────────────
/** /tools/ 에서 해당 툴 카드를 눌러 모달을 연다. 실패하면 이유 문자열, 성공하면 null. */
export async function openToolCard(page: Page, w: Work): Promise<string | null> {
  const cards = page.locator(SEL.toolCard);
  const n = await cards.count();
  let card = null as ReturnType<typeof cards.nth> | null;
  for (let i = 0; i < n; i++) {
    const c = cards.nth(i);
    const slug = (await c.getAttribute('data-work')) ?? (await c.getAttribute('data-tool'));
    if (slug === w.slug) {
      card = c;
      break;
    }
  }
  if (!card) return `/tools/ 에 카드 [data-work="${w.slug}"] 없음 (카드 후보 ${n}개)`;
  try {
    await card.scrollIntoViewIfNeeded({ timeout: 8_000 });
    await card.click({ timeout: 8_000 });
  } catch (e) {
    return `카드 ${w.slug} 누르기 실패: ${(e as Error).message.split('\n')[0]}`;
  }
  const modal = page.locator(SEL.modal).filter({ has: page.locator(`${SEL.video}[data-youtube-id="${w.yt}"]`) }).first();
  try {
    await modal.waitFor({ state: 'visible', timeout: 3_000 });
  } catch {
    return `카드 ${w.slug} 를 눌러도 모달(${SEL.modal}) 안에 [data-video][data-youtube-id="${w.yt}"] 가 보이지 않음`;
  }
  return null;
}

// ───────────────────────── page.evaluate 안에서 도는 측정 함수들 ─────────────────────────
// (직렬화되어 브라우저에서 실행된다 — 바깥 변수를 쓰지 말 것)

/** 4절-2: [연락] 이 화면 안에 보이는가 (숨김 · 화면 밖 · 다른 요소에 가림). 빈 배열 = 통과. */
export function contactProbe(): string[] {
  const why: string[] = [];
  if (!document.querySelector('nav[data-nav]')) why.push('nav[data-nav] 없음');
  const el = document.querySelector<HTMLElement>('[data-nav="contact"]');
  if (!el) {
    why.push('[data-nav="contact"] 없음');
    return why;
  }
  if (!el.closest('nav[data-nav]')) why.push('[data-nav="contact"] 가 상단 바(nav[data-nav]) 안에 있지 않음');
  const opt = { checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true };
  if (!el.checkVisibility(opt as CheckVisibilityOptions)) why.push('숨겨져 있음(display · visibility · opacity)');
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const box = `x ${Math.round(r.left)}~${Math.round(r.right)}, y ${Math.round(r.top)}~${Math.round(r.bottom)} / 화면 ${vw}x${vh}`;
  if (r.width < 1 || r.height < 1) why.push(`크기 0 (${box})`);
  else if (r.left < 0 || r.top < 0 || r.right > vw + 0.5 || r.bottom > vh + 0.5) why.push(`화면 밖 (${box})`);
  else {
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!top || (top !== el && !el.contains(top))) {
      const t = top as HTMLElement | null;
      why.push(`다른 요소에 가림: ${t ? t.tagName.toLowerCase() + (t.id ? '#' + t.id : '') + (typeof t.className === 'string' && t.className ? '.' + t.className.trim().split(/\s+/).join('.') : '') : 'null'}`);
    }
  }
  return why;
}

export type OverlayArg = { sel: string; tag?: string };

/**
 * 4절-3: 보이는 모든 [data-video] 에 대해, 가운데 · 네 귀퉁이 안쪽 5개 지점의
 * ① 클릭이 닿는 맨 위 요소(elementFromPoint)가 영상 자리 자신 또는 자식인가
 * ② 눌림과 무관하게 "눈에 보이게" 위에 얹힌 요소(글자 · 배경 · 이미지)가 없는가
 *    (pointer-events:none 으로 영상 위에 깔린 글자도 잡는다 — v2 반려 사유)
 * 보이는 [data-video] 가 하나도 없으면 빈 목록 { count: 0 }.
 */
export function overlayProbe(arg: OverlayArg): { count: number; problems: string[] } {
  const problems: string[] = [];
  const all = Array.from(document.querySelectorAll<HTMLElement>(arg.sel));
  const vids = all.filter((el) =>
    el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions),
  );

  const nameOf = (e: Element | null): string => {
    if (!e) return 'null';
    const h = e as HTMLElement;
    const cls = typeof h.className === 'string' && h.className.trim() ? '.' + h.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const txt = (h.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
    return `<${e.tagName.toLowerCase()}${h.id ? '#' + h.id : ''}${cls}>${txt ? ` "${txt}"` : ''}`;
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
  const pseudoPainted = (e: Element): string | null => {
    for (const ps of ['::before', '::after'] as const) {
      const c = getComputedStyle(e, ps);
      if (c.content && c.content !== 'none' && c.content !== 'normal' && c.display !== 'none' && parseFloat(c.opacity) > 0 &&
        (c.position === 'absolute' || c.position === 'fixed')) return ps;
    }
    return null;
  };

  const style = document.createElement('style');
  style.textContent = '*,*::before,*::after{pointer-events:auto !important}';

  vids.forEach((el, idx) => {
    const id = el.getAttribute('data-youtube-id') ?? `${arg.tag ?? 'video'}#${idx}`;
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x0 = Math.max(r.left, 0);
    const y0 = Math.max(r.top, 0);
    const x1 = Math.min(r.right, vw - 1);
    const y1 = Math.min(r.bottom, vh - 1);
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 4 || h <= 4) {
      problems.push(`[${id}] 영상 자리가 화면에 거의 안 보임 (${Math.round(r.width)}x${Math.round(r.height)})`);
      return;
    }
    const inset = Math.max(2, Math.min(10, Math.min(w, h) * 0.1));
    const pts: [string, number, number][] = [
      ['가운데', (x0 + x1) / 2, (y0 + y1) / 2],
      ['왼쪽위', x0 + inset, y0 + inset],
      ['오른쪽위', x1 - inset, y0 + inset],
      ['왼쪽아래', x0 + inset, y1 - inset],
      ['오른쪽아래', x1 - inset, y1 - inset],
    ];
    // 지점별 결과를 "같은 범인" 끼리 한 줄로 묶는다
    const hits = new Map<string, string[]>();
    const hit = (msg: string, label: string) => hits.set(msg, [...(hits.get(msg) ?? []), label]);
    // ① 클릭이 닿는 맨 위
    for (const [label, x, y] of pts) {
      const top = document.elementFromPoint(x, y);
      if (!top || (top !== el && !el.contains(top))) hit(`영상 위에 ${nameOf(top)} 가 올라와 있음(클릭이 막힘)`, label);
    }
    // ② 눈에 보이게 얹힌 요소 (pointer-events 무시)
    document.head.appendChild(style);
    try {
      for (const [label, x, y] of pts) {
        for (const e of document.elementsFromPoint(x, y)) {
          if (e === el) break;
          if (el.contains(e)) continue; // 자식은 허용
          if (e.contains(el)) {
            const ps = pseudoPainted(e);
            if (ps) hit(`조상 ${nameOf(e)} 의 ${ps} 가 영상 위에 얹힘`, label);
            continue;
          }
          if (painted(e)) hit(`${nameOf(e)} 가 영상 위에 겹쳐 보임`, label);
        }
      }
    } finally {
      style.remove();
    }
    for (const [msg, labels] of hits) problems.push(`[${id}] ${labels.join('·')}: ${msg}`);
    // ②-2 영상 자리 "안"에 깐 글자(자식이라 위 규칙을 통과한다) — 재생 버튼 · 링크 밖의 글자는 영상 위 글자다
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const t = (n.textContent ?? '').trim();
      const p = n.parentElement;
      if (!t || !p) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(p.tagName)) continue;
      const ctl = p.closest('button,a,[role="button"]');
      if (ctl && el.contains(ctl)) continue;
      if (!p.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions)) continue;
      problems.push(`[${id}] 영상 자리 안에 글자 「${t.slice(0, 20)}」 가 깔려 있음(재생 버튼 · 링크 밖) — 영상 위에는 글자를 깔지 않는다`);
      break;
    }
    // ③ 대본 상자와 영상 상자가 겹치지 않는다 (같은 방 안의 [data-script])
    const scripts = Array.from(document.querySelectorAll<HTMLElement>('[data-script]')).filter((s) => !el.contains(s) && !s.contains(el));
    for (const s of scripts) {
      const a = s.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (a.width > 0 && a.height > 0 && ix > 2 && iy > 2) problems.push(`[${id}] 대본 상자 ${nameOf(s)} 와 영상 상자가 ${Math.round(ix)}x${Math.round(iy)}px 겹침`);
    }
  });
  return { count: vids.length, problems };
}

/** 4절-8: 페이지에 "글자로 있는" 모든 것 — 보이지 않는 DOM 글자 · alt · title · aria-label · meta 포함. */
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

/** 4절-9: 페이지가 끌어오는 이미지 · 영상 주소 전부 (img · source · video · og:image · CSS 배경). */
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

// ───────────────────────── 4절-11 첫 화면 전송량 (CDP) ─────────────────────────
const EXCLUDED_HOST = /(^|\.)((youtube|youtube-nocookie|ytimg|googlevideo)\.com|youtu\.be)$/i;
const MEDIA_EXT = /\.(mp4|webm|mov|m4v|mkv|ogv)(\?|$)/i;
const FONT_EXT = /\.(woff2?|ttf|otf|eot)(\?|$)/i;

export type Landing = {
  status: number;
  totalBytes: number;
  fonts: { url: string; bytes: number }[];
  top: { url: string; bytes: number; type: string }[];
};

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
    } catch {
      /* ignore */
    }
    if (EXCLUDED_HOST.test(host)) return false; // 유튜브 제외
    if (d.type === 'Media' || MEDIA_EXT.test(d.url)) return false; // 영상 제외
    return true;
  });
  return {
    status,
    totalBytes: counted.reduce((s, d) => s + d.bytes, 0),
    fonts: counted.filter((d) => d.type === 'Font' || FONT_EXT.test(d.url)).map((d) => ({ url: d.url, bytes: d.bytes })),
    top: [...counted].sort((a, b) => b.bytes - a.bytes).slice(0, 5),
  };
}

// ───────────────────────── 4절-9 파일 목록 / 출처.json ─────────────────────────
export function walkFiles(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join('/'));
  }
  return out;
}

export const IMG_VIDEO_EXT = /\.(png|jpe?g|webp|avif|gif|svg|ico|bmp|tiff?|mp4|webm|mov|m4v|mkv|ogv)$/i;
export const RASTER_VIDEO_EXT = /\.(png|jpe?g|webp|avif|gif|bmp|tiff?|mp4|webm|mov|m4v|mkv|ogv)$/i;

/**
 * 출처.json 을 느슨하게 읽는다. 지원하는 모양:
 *   { "a.jpg": "버터 완성본 00:12" }
 *   { "a.jpg": { "source": "...", "출처": "..." } }
 *   [ { "file": "a.jpg", "source": "..." } ]   (file | path | name | 파일 | 파일명)
 *   { "files": { ... } } 처럼 한 겹 감싼 것
 * 키는 `public/media/` 기준 상대 경로 또는 파일명. 값(출처)은 비어 있지 않은 문자열.
 */
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
  const looksLikeFile = (k: string) => IMG_VIDEO_EXT.test(k);
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
        if (looksLikeFile(k)) map.set(norm(k), srcOf(v));
        else walk(v);
      }
    }
  };
  walk(JSON.parse(jsonText));
  return map;
}

/** public/media/출처.json 을 읽는다. 없거나 깨졌으면 error 에 이유. */
export function loadSources(): { map: Map<string, string>; error: string | null } {
  const file = path.join(MEDIA_DIR, '출처.json');
  if (!fs.existsSync(file)) return { map: new Map(), error: 'public/media/출처.json 이 없음' };
  try {
    return { map: readSources(fs.readFileSync(file, 'utf8')), error: null };
  } catch (e) {
    return { map: new Map(), error: `public/media/출처.json 을 읽을 수 없음: ${(e as Error).message}` };
  }
}

/** 4절-후킹: [data-hook] 안 <video> 의 src(들) — video[src] · source[src]. */
export function hookProbe(): {
  found: boolean;
  workRoot: string | null;
  top: number;
  bottom: number;
  vh: number;
  videoCount: number;
  srcs: string[];
  textLen: number;
} {
  const hook = document.querySelector<HTMLElement>('[data-hook]');
  if (!hook) return { found: false, workRoot: null, top: 0, bottom: 0, vh: innerHeight, videoCount: 0, srcs: [], textLen: 0 };
  window.scrollTo(0, 0);
  const r = hook.getBoundingClientRect();
  const vids = Array.from(hook.querySelectorAll('video'));
  const srcs: string[] = [];
  for (const v of vids) {
    const add = (u: string | null) => u && srcs.push(new URL(u, location.href).pathname);
    add(v.getAttribute('src'));
    v.querySelectorAll('source').forEach((s) => add(s.getAttribute('src')));
  }
  return {
    found: true,
    workRoot: hook.closest('[data-work]')?.getAttribute('data-work') ?? null,
    top: r.top,
    bottom: r.bottom,
    vh: innerHeight,
    videoCount: vids.length,
    srcs,
    textLen: (hook.innerText ?? '').replace(/\s+/g, '').length,
  };
}

// ───────────────────────── 작품 안 목차 (data-toc / data-toc-item / data-step) ─────────────────────────
export const STEPS = ['video', 'script', 'generate', 'edit', 'credit'] as const;

/**
 * 목차 항목 ↔ 단계 짝짓기 규칙(3절은 「항목 → 단계」 라고만 적혀 있다):
 *   data-toc-item="<단계>" 값 → 없으면 항목의 data-step → 없으면 href="#id" 가 가리키는 요소의 data-step → 없으면 순서.
 */
export function tocState(): {
  hasToc: boolean;
  items: { key: string; current: string | null }[];
  steps: string[];
} {
  const toc = document.querySelector<HTMLElement>('[data-toc]');
  const items = toc ? Array.from(toc.querySelectorAll<HTMLElement>('[data-toc-item]')) : [];
  const keyOf = (el: HTMLElement, i: number): string => {
    const v = el.getAttribute('data-toc-item');
    if (v) return v;
    const s = el.getAttribute('data-step');
    if (s) return s;
    const href = el.getAttribute('href') ?? el.querySelector('a')?.getAttribute('href') ?? '';
    if (href.startsWith('#')) {
      const k = document.getElementById(href.slice(1))?.getAttribute('data-step');
      if (k) return k;
    }
    return `#${i}`;
  };
  return {
    hasToc: !!toc,
    items: items.map((el, i) => ({ key: keyOf(el, i), current: el.getAttribute('aria-current') })),
    steps: Array.from(document.querySelectorAll<HTMLElement>('[data-step]')).map((e) => e.getAttribute('data-step') ?? ''),
  };
}

/** 단계 key 가 화면 안에 충분히 보이는가(빈 배열 = 통과). */
export function stepVisibleProbe(key: string): string[] {
  const el = document.querySelector<HTMLElement>(`[data-step="${key}"]`);
  if (!el) return [`[data-step="${key}"] 없음`];
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const vis = Math.min(r.bottom, vh) - Math.max(r.top, 0);
  const need = Math.min(r.height, vh * 0.3);
  return vis > 0 && vis >= need ? [] : [`단계 ${key} 가 화면에 안 옴 (y ${Math.round(r.top)}~${Math.round(r.bottom)} / 화면 높이 ${vh})`];
}

/** 단계 key 를 화면 한가운데(큰 단계는 위쪽 15%)로 즉시 스크롤. */
export function scrollToStep(key: string): boolean {
  const el = document.querySelector<HTMLElement>(`[data-step="${key}"]`);
  if (!el) return false;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  const offset = r.height < vh ? (vh - r.height) / 2 : vh * 0.15;
  window.scrollTo({ top: window.scrollY + r.top - offset, behavior: 'instant' as ScrollBehavior });
  return true;
}

/** 출처 문구가 「완성본 파일명 · 시점」 또는 「작가 캡처」 · 「시트」 꼴인가. */
export const SOURCE_FORM = /작가\s*캡처|시트|완성본|직접\s*그림|\.(mp4|mov|mkv|webm|m4v)/i;
