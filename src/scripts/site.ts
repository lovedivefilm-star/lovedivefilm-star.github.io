/**
 * 사이트 동작 — 한 파일. 방마다 있는 부품만 켠다.
 * 움직임 값은 전부 src/styles/tokens.css 의 변수에서 읽는다(motionMs).
 * 움직임 줄이기면: 연출 없이 처음부터 완성 상태, 스크립트가 스타일을 프레임마다 바꾸지 않는다.
 */

const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** tokens.css 의 시간 변수(ms · s)를 ms 로 */
function motionMs(name: string, fallback: number): number {
  const v = getComputedStyle(root).getPropertyValue(name).trim();
  if (!v) return fallback;
  const n = parseFloat(v);
  if (Number.isNaN(n)) return fallback;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => Array.from(r.querySelectorAll<T>(s));

/* ───────────── 사이트 안 유튜브 — 그 자리에 iframe ───────────── */
// start = 그 시각(초)부터 — 과정 끝 「▶ 이 장면 보기」(유튜브 임베드 start 매개변수, 영상 위에는 아무것도 얹지 않는다)
const ytSrc = (id: string, start?: number) =>
  `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1${start != null ? `&start=${Math.max(0, Math.floor(start))}` : ''}`;
function mountIframe(box: HTMLElement, start?: number) {
  const id = box.dataset.youtubeId;
  if (!id) return;
  const f = document.createElement('iframe');
  f.src = ytSrc(id, start);
  f.title = box.dataset.title || '영상';
  f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  f.allowFullscreen = true;
  f.referrerPolicy = 'strict-origin-when-cross-origin';
  box.replaceChildren(f);
  // 풀영상을 틀면 위쪽 후킹 클립은 멈춘다(소리 · 화면 둘이 겹치지 않게)
  hookApi?.pauseForVideo();
}

/* ───────────── 모달(툴) · 크게 보기(시트) ───────────── */
let lastFocus: HTMLElement | null = null;
const modal = $('[data-modal]');
const lightbox = $('[data-lightbox]');

function openToolModal(id: string, title: string) {
  if (!modal) return;
  lastFocus = document.activeElement as HTMLElement | null;
  const slot = $<HTMLElement>('[data-video]', modal)!;
  slot.dataset.youtubeId = id;
  slot.dataset.title = title;
  const cap = $('.modal-t', modal);
  if (cap) cap.textContent = title;
  modal.hidden = false;
  mountIframe(slot);
  $<HTMLButtonElement>('.modal-x', modal)?.focus({ preventScroll: true });
}
function openLightbox(src: string, cap: string) {
  if (!lightbox) return;
  lastFocus = document.activeElement as HTMLElement | null;
  const img = $<HTMLImageElement>('img', lightbox)!;
  img.src = src;
  img.alt = cap;
  const c = $('.lb-cap', lightbox);
  if (c) c.textContent = cap;
  lightbox.hidden = false;
  $<HTMLButtonElement>('.x', lightbox)?.focus({ preventScroll: true });
}
function closeOverlays(): boolean {
  let closed = false;
  if (modal && !modal.hidden) {
    modal.hidden = true;
    const slot = $<HTMLElement>('[data-video]', modal);
    if (slot) {
      slot.replaceChildren(); // iframe 을 지워 소리를 멈춘다
      slot.dataset.youtubeId = '';
    }
    closed = true;
  }
  if (lightbox && !lightbox.hidden) {
    lightbox.hidden = true;
    $<HTMLImageElement>('img', lightbox)?.removeAttribute('src');
    closed = true;
  }
  if (closed && lastFocus) lastFocus.focus({ preventScroll: true });
  return closed;
}
const overlayOpen = () => (modal && !modal.hidden) || (lightbox && !lightbox.hidden);

/* 방 전환(블록 디졸브) — 사이트 안 다른 방으로 가는 링크를 누르면 다음 그림에 디졸브를 켠다 */
const markNav = () => {
  try {
    sessionStorage.setItem('yk-nav', '1');
  } catch {
    /* 저장소가 막혀 있으면 전환 없이 */
  }
};
document.addEventListener(
  'click',
  (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    const u = new URL(a.href, location.href);
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (u.pathname === location.pathname && u.search === location.search) return;
    markNav();
  },
  true,
);
if (root.hasAttribute('data-dissolve')) setTimeout(() => root.removeAttribute('data-dissolve'), motionMs('--dur-dissolve-total', 520));

document.addEventListener('click', (e) => {
  const t = e.target as Element | null;
  if (!t) return;
  if (t.closest('[data-close]')) {
    closeOverlays();
    return;
  }
  const poster = t.closest<HTMLElement>('[data-video] .poster');
  if (poster) {
    const box = poster.closest<HTMLElement>('[data-video]');
    if (box) mountIframe(box);
    return;
  }
  // 「▶ 이 장면 보기」 — 이 작품의 풀영상(같은 페이지 · 완성본 + 개요 구역)을 그 시각부터. 영상 자리로 올라간다(Scrite 「씬 → 그 시간」 CS-23)
  const playAt = t.closest<HTMLElement>('[data-play-at]');
  if (playAt) {
    const box = $<HTMLElement>('[data-work] [data-video]');
    if (box) {
      mountIframe(box, Number(playAt.dataset.playAt) || 0);
      box.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
    }
    return;
  }
  const card = t.closest<HTMLElement>('[data-tool]');
  if (card && card.dataset.yt) {
    openToolModal(card.dataset.yt, card.dataset.title ?? '');
    return;
  }
  const shot = t.closest<HTMLElement>('.shot[data-img]');
  if (shot) {
    openLightbox(shot.dataset.img!, shot.dataset.cap ?? '');
    return;
  }
  const copy = t.closest<HTMLElement>('[data-copy]');
  if (copy) {
    const v = copy.dataset.copy ?? '';
    navigator.clipboard?.writeText(v).then(
      () => {
        const was = copy.textContent;
        copy.textContent = '복사됨';
        setTimeout(() => (copy.textContent = was), 1400);
      },
      () => {},
    );
  }
});

/* ───────────── 키보드 — ESC 닫기 / 처음으로, ← → 이전 · 다음 작품(EddyOS) ───────────── */
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
  if (e.key === 'Escape') {
    if (closeOverlays()) return;
    if (location.pathname !== '/') {
      markNav();
      location.href = '/';
    }
    return;
  }
  if (overlayOpen()) return;
  const tag = (document.activeElement?.tagName ?? '').toUpperCase();
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
  const work = $('[data-work]');
  if (work && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    const to = e.key === 'ArrowLeft' ? work.dataset.prev : work.dataset.next;
    if (to) {
      markNav();
      location.href = to;
    }
  }
});

/* ───────────── 홈 첫 진입 표식 정리 ───────────── */
if (root.hasAttribute('data-intro')) {
  const total = motionMs('--dur-hair-line', 700) + motionMs('--dur-hair-fade', 150) + motionMs('--dur-hair-split', 700) + 60;
  const end = () => {
    root.removeAttribute('data-intro');
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((t) => removeEventListener(t, end, true));
  };
  setTimeout(end, total);
  ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, end, { capture: true, passive: true }));
}

/* ───────────── 후킹 — 시안 히어로_v1 엔진(index.html 466~668행을 옮김) ─────────────
   한 번의 연출(v1 646~665행): 빈 종이 → 씬 헤더 · 화면 줄 타이핑 → 그 줄 끝에서 화면으로 연결선 → 슬릿 → 화면이 그 선에서 열리며 재생
   → 앰비언트(영상 프레임을 흐리게 화면 뒤로) → 타임라인. 그 뒤 대본 줄은 클립 시각(kf)에 맞춰 타이핑, 지금 화면에 나오는 줄만 또렷.
   시간 = tokens.css 의 v1 값 × --hook-speed(.7). 곡선은 GSAP 3.12.5 와 같은 식(아래 EASE) — 라이브러리 없이 rAF 로 돈다. */
type HookApi = { pauseForVideo: () => void };
let hookApi: HookApi | null = null;

/** GSAP 3.12.5 곡선 — gsap-core 의 식 그대로(power1 = Quad · power2 = Cubic · expo · sine, inOut 은 out 에서 뒤집어 만듦) */
const EASE = {
  none: (p: number) => p,
  power1Out: (p: number) => 1 - (1 - p) * (1 - p),
  power2Out: (p: number) => 1 - Math.pow(1 - p, 3),
  power2InOut: (p: number) => (p < 0.5 ? Math.pow(p * 2, 3) / 2 : 1 - Math.pow((1 - p) * 2, 3) / 2),
  expoInOut: (p: number) => (p <= 0 ? 0 : p >= 1 ? 1 : p < 0.5 ? Math.pow(2, 20 * p - 10) / 2 : (2 - Math.pow(2, -20 * p + 10)) / 2),
  sineOut: (p: number) => Math.sin((p * Math.PI) / 2),
};

function initHook(): HookApi | null {
  const hook = $('[data-hook]');
  if (!hook) return null;
  const video = $<HTMLVideoElement>('video', hook)!;
  const paper = $('.paper', hook)!;
  const script = $('.script', paper)!;
  const flow = $('.flow', paper)!;
  const stage = $('.stage', hook)!;
  const screen = $('.screen', hook)!;
  const link = $('.link', hook);
  const slit = $('.slit', hook);
  const canvas = $<HTMLCanvasElement>('canvas.ambient', hook);
  const ctx = canvas?.getContext('2d') ?? null;
  const tl = $('.tl', hook);
  const tc = $('.tl-tc', hook);
  const head = $('.playhead i', hook);
  const toggle = $<HTMLButtonElement>('.tl-toggle', hook);
  const D = Number(hook.dataset.dur) || 12;
  const OFF = Number(hook.dataset.offset) || 0;
  const FPS = Number(hook.dataset.fps) || 24;
  const CUT = Number(hook.dataset.cut) || D;

  // 검수용(v1 562~563행): ?at=초 → 그 순간에 멈춘 완성 상태 · ?notr → CSS 전환 끔
  const q = new URLSearchParams(location.search);
  const AT = q.has('at') ? Math.max(0, Math.min(D - 0.01, Number(q.get('at')) || 0)) : null;
  if (AT != null || q.has('notr')) hook.classList.add('no-tr');

  type Line = { el: HTMLElement; full: string; on: HTMLElement; off: HTMLElement; kf: [number, number][] | null; now: [number, number][]; pre: boolean; scene: boolean; n: number };
  const lines: Line[] = $$('[data-line]', paper).map((el) => {
    const tx = $('.tx', el)!;
    const full = tx.textContent ?? '';
    const raw: [number, string][] | null = el.dataset.kf ? JSON.parse(el.dataset.kf) : null;
    const kf = raw ? raw.map(([t, m]) => [t, m === '' ? 0 : full.indexOf(m) + m.length] as [number, number]) : null;
    const on = document.createElement('span');
    on.className = 'on';
    const caret = document.createElement('span');
    caret.className = 'caret';
    caret.setAttribute('aria-hidden', 'true');
    const off = document.createElement('span');
    off.className = 'off';
    off.textContent = full;
    tx.replaceChildren(on, caret, off);
    const scene = el.classList.contains('b-scene') || el.classList.contains('b-note');
    return { el, full, on, off, kf, now: el.dataset.now ? JSON.parse(el.dataset.now) : [], pre: el.hasAttribute('data-pre'), scene, n: 0 };
  });
  const pre = lines.filter((l) => l.pre);
  const anchor = pre[pre.length - 1] ?? lines[0]; // 연결선 · 슬릿이 나오는 줄(v1 의 INS 줄)
  const lastKf = Math.max(0, ...lines.map((l) => (l.kf ? l.kf[l.kf.length - 1][0] : 0)));
  const blks = $$('.blk', hook).map((el) => ({ el, a: Number(el.dataset.a), b: Number(el.dataset.b) }));

  const setN = (l: Line, n: number) => {
    n = Math.max(0, Math.min(l.full.length, Math.floor(n)));
    if (n === l.n) return;
    l.n = n;
    l.on.textContent = l.full.slice(0, n);
    l.off.textContent = l.full.slice(n);
    l.el.classList.toggle('is-typed', n > 0);
  };
  let lead: Line | null = null;
  const setLead = (l: Line | null) => {
    if (l === lead) return;
    lead?.el.classList.remove('is-lead');
    lead = l;
    l?.el.classList.add('is-lead');
  };
  const countAt = (kf: [number, number][], t: number) => {
    if (t <= kf[0][0]) return kf[0][1];
    for (let k = 0; k < kf.length - 1; k++) {
      const [ta, na] = kf[k];
      const [tb, nb] = kf[k + 1];
      if (t < tb) return na + (nb - na) * ((t - ta) / (tb - ta));
    }
    return kf[kf.length - 1][1];
  };
  const smpte = (t: number) => {
    const f = Math.floor((t + OFF) * FPS + 1e-6);
    const s = Math.floor(f / FPS);
    const ff = f % FPS;
    return `00:${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(ff).padStart(2, '0')}`;
  };

  /* 연결선 · 슬릿 자리 — 연결선 줄의 글 끝에서 화면 왼쪽 변까지(v1 place()). 글자가 아직 안 쳐졌어도 .off 가 자리를 잡고 있어 전체 길이로 잰다 */
  let linkKey = '';
  const placeLink = (setSlit: boolean) => {
    if (!anchor) return;
    const fr = screen.getBoundingClientRect();
    const pr = paper.getBoundingClientRect();
    if (fr.height <= 0) return;
    if (pr.right > fr.left) {
      // 좁은 화면 — 종이가 화면 아래에 쌓였다: 연결선 없이 화면은 아래 변에서 열린다(v1 좁은 화면)
      link?.classList.add('is-out');
      if (setSlit) screen.style.setProperty('--slit', '100%');
      return;
    }
    const st = stage.getBoundingClientRect();
    const tx = $('.tx', anchor.el)!;
    const range = document.createRange();
    range.selectNodeContents(tx);
    const rects = range.getClientRects();
    const r = rects[rects.length - 1] ?? tx.getBoundingClientRect();
    const y = r.top + r.height * 0.58;
    const x0 = r.right + 8;
    if (link) {
      const key = `${(x0 - st.left).toFixed(1)}|${(y - st.top).toFixed(1)}|${Math.max(0, fr.left - x0 - 1).toFixed(1)}`;
      if (key !== linkKey) {
        linkKey = key;
        link.style.left = `${(x0 - st.left).toFixed(1)}px`;
        link.style.top = `${(y - st.top).toFixed(1)}px`;
        link.style.width = `${Math.max(0, fr.left - x0 - 1).toFixed(1)}px`;
      }
      const sr = script.getBoundingClientRect();
      link.classList.toggle('is-out', y < sr.top || y > sr.bottom);
    }
    if (setSlit) screen.style.setProperty('--slit', `${Math.min(99, Math.max(1, ((y - fr.top) / fr.height) * 100)).toFixed(2)}%`);
  };

  /* 앰비언트 — 화면 빛이 방으로 번진다(v1 drawAmbient: 작은 캔버스에 영상 프레임 → CSS blur · saturate) */
  const glowEvery = motionMs('--hook-glow-every', 90);
  const poster = new Image();
  let lastDraw = -1e9;
  const drawAmbient = (force = false) => {
    if (!ctx || !canvas) return;
    const now = performance.now();
    if (!force && now - lastDraw < glowEvery) return;
    lastDraw = now;
    try {
      if (video.readyState >= 2) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      else if (poster.complete && poster.naturalWidth) ctx.drawImage(poster, 0, 0, canvas.width, canvas.height);
    } catch {
      /* 아직 그릴 프레임이 없다 */
    }
  };
  poster.addEventListener('load', () => video.readyState < 2 && drawAmbient(true));
  poster.src = video.getAttribute('poster') ?? '';
  video.addEventListener('loadeddata', () => drawAmbient(true));
  video.addEventListener('seeked', () => drawAmbient(true));

  /* 대본 창이 지금 줄을 따라간다(v1 좁은 화면 .flow translateY — 여기선 넓은 화면도: 종이가 작아 줄이 넘친다) */
  let scrollWant = -1;
  let followUntil = 0;
  const followMs = motionMs('--dur-hook-follow', 600);
  const blocks = $$('.b', flow);
  const follow = (l: Line | null) => {
    if (!l) return;
    const max = Math.max(0, flow.offsetHeight - script.clientHeight);
    let want = Math.min(max, Math.max(0, l.el.offsetTop + l.el.offsetHeight - script.clientHeight * 0.78));
    // 창 위 끝에 줄이 반만 걸려 잘리지 않게 — 그 아래 첫 줄의 윗변에 맞춘다(지금 줄보다 더 올리지는 않는다)
    if (want > 0) {
      const top = blocks.map((b) => b.offsetTop).find((t) => t >= want - 1);
      if (top != null) want = Math.min(top, l.el.offsetTop);
    }
    want = Math.round(want);
    if (want !== scrollWant) {
      scrollWant = want;
      flow.style.transform = want ? `translateY(${-want}px)` : '';
      followUntil = performance.now() + (reduce ? 0 : followMs) + 80;
    }
  };

  /* 시계 — 영상 시간이 기준. 영상이 못 돌면 자체 시계로 대본만 흐른다(v1) */
  let firstPass = !reduce;
  let live = false;
  let lastT = 0;
  let fallback = false;
  let fbStart = 0;
  let userPaused = false;
  let autoPaused = false;
  let inView = true;
  let atLock = AT != null;

  const finishAll = () => {
    lines.forEach((l) => setN(l, l.full.length));
    setLead(null);
    paper.classList.remove('typing');
    firstPass = false;
  };
  const clock = () => (atLock ? (AT as number) : fallback ? ((performance.now() - fbStart) / 1000) % D : video.currentTime || 0);
  const anchorOn = (t: number) => (anchor && anchor.now.length ? anchor.now.some(([a, b]) => t >= a && t < b) : t < CUT);

  const update = () => {
    if (!paper.classList.contains('live')) paper.classList.add('live');
    const t = Math.min(clock(), D - 0.001);
    if (firstPass && t + 0.5 < lastT) finishAll(); // 한 바퀴 돌면 완성 상태
    lastT = t;
    if (firstPass) {
      let l: Line | null = null;
      lines.forEach((x) => {
        if (x.kf) setN(x, countAt(x.kf, t));
        if (x.n > 0) l = x;
      });
      setLead(l);
      const last = lines[lines.length - 1];
      if (last && last.n === last.full.length) paper.classList.remove('typing'); // 다 쳐지면 이어지는 지문이 맺힌다
    }
    let active: Line | null = null;
    lines.forEach((x) => {
      const on = x.now.some(([a, b]) => t >= a && t < b);
      x.el.classList.toggle('is-now', on);
      if (on) active = x;
    });
    blks.forEach((c) => c.el.classList.toggle('is-now', t >= c.a && t < c.b));
    link?.classList.toggle('is-dim', !anchorOn(t)); // 그 줄의 컷이 끝나면 연결선도 물러난다(v1)
    if (head) head.style.transform = `translateX(${((t / D) * 100).toFixed(3)}%)`;
    if (tc) tc.textContent = smpte(t);
    follow(firstPass ? lead : active);
    if (performance.now() < followUntil) placeLink(false);
  };
  const loop = () => {
    if (!hook.isConnected) return;
    const playing = !video.paused || fallback;
    if (live && inView && playing) update();
    if (inView && !video.paused) drawAmbient();
    requestAnimationFrame(loop);
  };

  const setToggle = () => {
    if (!toggle) return;
    const playing = !video.paused && !fallback;
    toggle.textContent = playing ? '일시정지' : '재생';
    toggle.setAttribute('aria-pressed', String(!playing));
  };
  video.addEventListener('playing', () => {
    if (fallback) {
      fallback = false;
      finishAll();
    }
    setToggle();
  });
  video.addEventListener('pause', setToggle);
  toggle?.addEventListener('click', () => {
    atLock = false;
    live = true;
    if (video.paused) {
      userPaused = false;
      autoPaused = false;
      video.play().catch(() => {});
    } else {
      userPaused = true;
      video.pause();
    }
    setToggle();
    update();
  });

  const startVideo = () => {
    live = true;
    if (AT != null) return;
    const p = video.play();
    p?.catch(() => {
      fallback = true;
      fbStart = performance.now();
      setToggle();
    });
    // 자동재생이 막혔거나 영상이 멈춰 있으면 대본은 제 시계로 흐른다(v1)
    setTimeout(() => {
      if (!fallback && !userPaused && !autoPaused && video.currentTime < 0.05) {
        fallback = true;
        fbStart = performance.now() - 2000;
        setToggle();
      }
    }, 2000);
  };

  // 화면 밖이면 멈추고, 돌아오면 다시(사용자가 멈춘 게 아니면)
  new IntersectionObserver(
    (ents) => {
      for (const en of ents) {
        inView = en.isIntersecting;
        if (!inView && !video.paused) {
          autoPaused = true;
          video.pause();
        } else if (inView && autoPaused && !userPaused && !reduce) {
          autoPaused = false;
          video.play().catch(() => {});
        }
      }
    },
    { threshold: 0.15 },
  ).observe(hook);

  const api: HookApi = {
    pauseForVideo: () => {
      userPaused = true;
      video.pause();
    },
  };
  let opened = false;
  const relayout = () => {
    scrollWant = -1;
    placeLink(!hook.classList.contains('done') && !opened);
    if (lead || !firstPass) follow(firstPass ? lead : null);
  };
  addEventListener('resize', relayout, { passive: true });
  document.fonts?.ready.then(relayout).catch(() => {});

  requestAnimationFrame(loop);

  // ── 검수: 그 시각에 멈춘 상태(v1 626~636행) ──
  if (AT != null) {
    hook.classList.add('done');
    opened = true;
    firstPass = true;
    lines.forEach((l) => setN(l, l.pre ? l.full.length : 0));
    if (AT < lastKf) paper.classList.add('typing');
    video.pause();
    const seek = () => {
      try {
        video.currentTime = AT;
      } catch {
        /* 메타데이터 전 */
      }
    };
    if (video.readyState >= 1) seek();
    else video.addEventListener('loadedmetadata', seek, { once: true });
    live = true;
    setToggle();
    update();
    placeLink(false);
    video.addEventListener('seeked', () => atLock && update());
    return api;
  }

  // ── 움직임 줄이기: 완성 상태 · 화면 열림 · 영상은 「재생」 을 눌러야(v1 637~644행) ──
  if (reduce) {
    finishAll();
    hook.classList.add('done');
    opened = true;
    setToggle();
    if (tc) tc.textContent = smpte(0);
    placeLink(false);
    return api;
  }

  // ── 한 번의 연출(v1 646~665행) — 단계마다 [시작 초, 길이, 곡선] ──
  lines.forEach((l) => setN(l, 0));
  paper.classList.add('typing');
  placeLink(true);
  const sp = motionMs('--hook-speed', 0.7);
  const T = (name: string, v1ms: number) => (motionMs(name, v1ms) / 1000) * sp;
  const glowTo = Number(getComputedStyle(root).getPropertyValue('--hook-glow')) || 0.5;
  type Step = { at: number; dur: number; ease: (p: number) => number; to: (v: number) => void; begin?: () => void; started?: boolean; ended?: boolean };
  type Cue = { at: number; fn: () => void; fired?: boolean };
  const steps: Step[] = [];
  const cues: Cue[] = [];
  let at = T('--hook-v1-delay', 250);
  // 빈 종이가 나타남
  const dPaper = T('--hook-v1-paper', 600);
  steps.push({ at, dur: dPaper, ease: EASE.power1Out, to: (v) => (paper.style.opacity = v.toFixed(3)) });
  at += dPaper;
  cues.push({ at, fn: () => setLead(pre[0] ?? null) }); // 첫 줄 자리에서 캐럿이 깜박임
  at += T('--hook-v1-pre-type', 450);
  // 씬 헤더 · 화면 줄 타이핑(글자당 시간 고정, ease none)
  pre.forEach((l, k) => {
    if (k > 0) at += T('--hook-v1-line-gap', 220);
    const d = l.full.length * T(l.scene ? '--hook-v1-char-scene' : '--hook-v1-char-line', l.scene ? 32 : 45);
    steps.push({ at, dur: d, ease: EASE.none, begin: () => setLead(l), to: (v) => setN(l, v * l.full.length) });
    at += d;
  });
  at += T('--hook-v1-pre-link', 180);
  // 그 줄 끝에서 화면 쪽으로 연결선
  cues.push({ at, fn: () => placeLink(true) });
  const dLink = T('--hook-v1-link', 500);
  steps.push({ at, dur: dLink, ease: EASE.power2InOut, to: (v) => link && (link.style.transform = `scaleX(${v.toFixed(4)})`) });
  at += dLink - T('--hook-v1-slit-lead', 40);
  // 그 높이에 화면 폭의 가는 가로선(슬릿)
  const dSlit = T('--hook-v1-slit', 320);
  steps.push({
    at,
    dur: dSlit,
    ease: EASE.power2Out,
    begin: () => slit && (slit.style.opacity = '1'),
    to: (v) => slit && (slit.style.transform = `scaleX(${v.toFixed(4)})`),
  });
  at += dSlit;
  // 영상 재생과 함께 화면이 그 선에서 위아래로 열림
  const tOpen = at;
  cues.push({
    at: tOpen,
    fn: () => {
      opened = true;
      startVideo();
    },
  });
  steps.push({ at: tOpen, dur: T('--hook-v1-open', 950), ease: EASE.expoInOut, to: (v) => screen.style.setProperty('--open', v.toFixed(4)) });
  const tSlitOut = tOpen + T('--hook-v1-slit-out-at', 250);
  steps.push({ at: tSlitOut, dur: T('--hook-v1-slit-out', 300), ease: EASE.power1Out, to: (v) => slit && (slit.style.opacity = (1 - v).toFixed(3)) });
  // 앰비언트 — 빛이 화면 뒤 · 둘레로 번짐
  const tGlow = tSlitOut + T('--hook-v1-glow-at', 150);
  steps.push({
    at: tGlow,
    dur: T('--hook-v1-glow', 1600),
    ease: EASE.sineOut,
    begin: () => drawAmbient(true),
    to: (v) => canvas && (canvas.style.opacity = (v * glowTo).toFixed(3)),
  });
  // 타임라인이 왼→오로 그려짐
  const tTl = tGlow + T('--hook-v1-tl-at', 300);
  steps.push({
    at: tTl,
    dur: T('--hook-v1-tl', 1000),
    ease: EASE.power2Out,
    begin: () => tl && (tl.style.opacity = '1'),
    to: (v) => tl?.style.setProperty('--draw', v.toFixed(4)),
  });
  const tEnd = Math.max(...steps.map((s) => s.at + s.dur), ...cues.map((c) => c.at));
  hook.dataset.openAt = tOpen.toFixed(3); // 시험 · 검수용 — 화면이 열리기 시작하는 초(연출 시작 기준)

  let introDone = false;
  const clearInline = () => {
    paper.style.removeProperty('opacity');
    link?.style.removeProperty('transform');
    slit?.style.removeProperty('opacity');
    slit?.style.removeProperty('transform');
    screen.style.removeProperty('--open');
    canvas?.style.removeProperty('opacity');
    tl?.style.removeProperty('opacity');
    tl?.style.removeProperty('--draw');
  };
  const endIntro = () => {
    if (introDone) return;
    introDone = true;
    for (const c of cues)
      if (!c.fired) {
        c.fired = true;
        c.fn();
      }
    for (const s of steps)
      if (!s.ended) {
        if (!s.started) s.begin?.();
        s.started = s.ended = true;
        s.to(1);
      }
    hook.classList.add('done'); // 이제 CSS 가 완성 상태를 든다
    clearInline();
  };
  const t0 = performance.now();
  const run = (now: number) => {
    if (introDone) return;
    const e = (now - t0) / 1000;
    for (const c of cues)
      if (!c.fired && e >= c.at) {
        c.fired = true;
        c.fn();
      }
    for (const s of steps) {
      if (s.ended || e < s.at) continue;
      if (!s.started) {
        s.started = true;
        s.begin?.();
      }
      const p = s.dur > 0 ? Math.min(1, (e - s.at) / s.dur) : 1;
      s.to(s.ease(p));
      if (p >= 1) s.ended = true;
    }
    if (e >= tEnd) return endIntro();
    requestAnimationFrame(run);
  };
  requestAnimationFrame(run);

  // 아무 입력(클릭 · 키 · 휠 · 터치)이나 하면 즉시 완성 상태(작가 「더 빨라도 된다」)
  const inputs = ['keydown', 'pointerdown', 'wheel', 'touchstart'] as const;
  const skip = () => {
    inputs.forEach((t) => removeEventListener(t, skip, true));
    endIntro();
    finishAll();
    update();
    placeLink(false);
  };
  inputs.forEach((t) => addEventListener(t, skip, { capture: true, passive: true }));

  return api;
}

/* ───────────── 작품 방 — 과정 6단계(docs/work-room.md 4절) ─────────────
   단계 패널의 윗변이 화면 52% 선을 지나면(Aaru 활성 판정) ① 목차 칸이 바뀌고(aria-current="step")
   ② 왼쪽 대본 종이에서 그 단계가 다루는 줄(data-lit)만 또렷 — 나머지 .38(후킹 종이와 같은 규칙) — 교체는 한 프레임(JM)
   ③ 상단 바의 「지금 단계」 글이 그 구역 이름으로(data-path). 종이가 넘치면 밝은 첫 줄이 보이게 종이 안 글을 올린다(후킹 .flow 와 같은 따라감). */
function initRoom() {
  const work = $('[data-work]');
  if (!work) return;
  const toc = $('[data-toc]', work);
  const items = toc ? $$<HTMLAnchorElement>('[data-toc-item]', toc) : [];
  const panels = $$<HTMLElement>('[data-step]', work);
  const litZones = $$<HTMLElement>('[data-lit]', work); // 단계 패널 + 끝 짝
  const paths = $$<HTMLElement>('[data-path]', work);
  const paper = $('[data-pp]', work);
  const win = paper ? $('.pp-win', paper) : null;
  const flow = paper ? $('.pp-flow', paper) : null;
  const lines = paper ? $$<HTMLElement>('[data-pp-line]', paper) : [];
  const blocks = paper ? $$<HTMLElement>('.b', paper) : [];
  const pathStep = $('[data-path-step]');
  const firstLabel = pathStep?.textContent ?? '';
  let curStep = '';
  let curLit = '';
  let curLabel = '';
  let shift = -1;

  const setLabel = (t: string) => {
    if (!pathStep || t === curLabel) return;
    curLabel = t;
    pathStep.textContent = t;
  };
  const setStep = (key: string) => {
    if (key === curStep) return;
    curStep = key;
    items.forEach((a) => (a.dataset.tocItem === key ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
  };
  const follow = () => {
    if (!win || !flow) return;
    const first = lines.find((l) => l.classList.contains('is-lit'));
    const max = Math.max(0, flow.offsetHeight - win.clientHeight);
    let want = 0;
    if (first && max > 0) {
      // 밝은 첫 줄의 문단 윗변에 맞춘다 — 창 위 끝에 앞 문단이 반만 걸려 잘리지 않게(후킹 follow 와 같은 규칙)
      const top = (first.closest('.b') as HTMLElement | null)?.offsetTop ?? first.offsetTop;
      want = Math.max(0, top);
    }
    want = Math.round(want);
    if (want !== shift) {
      shift = want;
      flow.style.transform = want ? `translateY(${-want}px)` : '';
    }
  };
  const setLit = (spec: string) => {
    if (!paper || spec === curLit) return;
    curLit = spec;
    const on = new Set(spec.split(',').filter(Boolean).map(Number));
    lines.forEach((l) => l.classList.toggle('is-lit', on.has(Number(l.dataset.ppLine))));
    blocks.forEach((b) => b.classList.toggle('has-lit', !!b.querySelector('.is-lit')));
    paper.classList.toggle('all', lines.every((l) => l.classList.contains('is-lit'))); // 02 대본 — 전부 밝으면 먹선 없음
    paper.classList.add('live');
    follow();
  };

  let queued = false;
  const pick = () => {
    queued = false;
    const line = innerHeight * (parseFloat(getComputedStyle(root).getPropertyValue('--toc-line')) || 0.52);
    const last = <T extends HTMLElement>(els: T[]) => {
      let hit: T | null = null;
      for (const e of els) if (e.getBoundingClientRect().top <= line) hit = e;
      return hit;
    };
    if (panels.length) setStep((last(panels) ?? panels[0]).dataset.step ?? '');
    if (litZones.length) setLit((last(litZones) ?? litZones[0]).dataset.lit ?? '');
    const p = last(paths);
    setLabel(p?.dataset.path ?? firstLabel);
  };
  addEventListener(
    'scroll',
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(pick);
      }
    },
    { passive: true },
  );
  addEventListener('resize', () => ((shift = -1), pick()), { passive: true });
  document.fonts?.ready.then(() => ((shift = -1), follow())).catch(() => {});
  pick();

  // 단계 머리가 화면에 들어오면 맺힌다(움직임 허용 + 첫 스크롤 뒤에만 CSS 가 숨겨 둔다 — Paragon 줄 리빌)
  const io = new IntersectionObserver(
    (ents) => {
      for (const en of ents)
        if (en.isIntersecting) {
          en.target.classList.add('seen');
          io.unobserve(en.target);
        }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );
  [...panels, ...litZones].forEach((s) => io.observe(s));
}

/* ───────────── 홈 출입구 — 마지막으로 가리킨 출입구를 선택 상태로 유지(EddyOS 정밀 §5-1) ───────────── */
function initDoors() {
  const doors = $$('[data-door]');
  if (!doors.length) return;
  const sel = (d: HTMLElement) => doors.forEach((x) => x.classList.toggle('is-sel', x === d));
  doors.forEach((d) => {
    d.addEventListener('pointerenter', () => sel(d));
    d.addEventListener('focus', () => sel(d));
  });
}

/* ───────────── 작업대 — 탭을 누르면 재생(zkPass 정밀 §5-3) ───────────── */
function initBench() {
  $$('[data-bench]').forEach((bench) => {
    type V = { label: string; from?: string; to: string; path?: string };
    const items: V[] = JSON.parse(bench.dataset.items ?? '[]');
    const tabs = $$<HTMLButtonElement>('.bench-tab', bench);
    const cmd = $('.cmd-t', bench)!;
    const nodes = $('.bench-nodes', bench)!;
    const from = $('.bnode.from', bench)!;
    const to = $('.bnode.to', bench)!;
    const fromB = $('b', from)!;
    const toB = $('b', to)!;
    const link = $('.blink i', bench)!;
    const out = $('.bench-out .o', bench)!;
    let run = 0;
    const T = {
      fade: motionMs('--dur-bench-fade', 380),
      cmd: motionMs('--dur-bench-cmd', 700),
      gap: motionMs('--bench-node-gap', 260),
      tick: motionMs('--dur-type-tick', 33.3),
    };
    const setStatic = (v: V) => {
      cmd.textContent = v.path ?? v.label;
      fromB.textContent = v.from ?? '';
      toB.textContent = v.to;
      nodes.classList.toggle('single', !v.from);
      out.textContent = `${v.label} · ${v.from ? `${v.from} → ${v.to}` : v.to}`;
    };
    const play = (k: number) => {
      const v = items[k];
      if (!v) return;
      tabs.forEach((t, i) => t.setAttribute('aria-selected', String(i === k)));
      const id = ++run;
      if (reduce) {
        setStatic(v);
        from.classList.add('on');
        to.classList.add('on');
        bench.classList.remove('dim');
        return;
      }
      // 0: 소등 · 이전 결과 fade-out
      bench.classList.add('dim', 'typing');
      from.classList.remove('on');
      to.classList.remove('on');
      const text = v.path ?? v.label;
      cmd.textContent = '';
      fromB.textContent = v.from ?? '';
      toB.textContent = v.to;
      nodes.classList.toggle('single', !v.from);
      const t0 = performance.now();
      // 30~50ms 뒤 명령줄 타이핑 — 총 700ms 고정
      const type = (now: number) => {
        if (id !== run) return;
        const e = Math.floor((now - t0 - 40) / T.tick) * T.tick;
        const n = Math.max(0, Math.min(text.length, Math.round((e / T.cmd) * text.length)));
        cmd.textContent = text.slice(0, n);
        if (n < text.length) requestAnimationFrame(type);
        else {
          bench.classList.remove('typing');
          // 노드 점등 — 260ms 간격, 연결선은 두 번째 노드와 함께 채워짐
          const steps: (() => void)[] = [];
          if (v.from) steps.push(() => from.classList.add('on'));
          steps.push(() => {
            bench.classList.remove('dim');
            to.classList.add('on');
          });
          steps.forEach((f, i) => setTimeout(() => id === run && f(), 10 + i * T.gap));
          setTimeout(() => {
            if (id !== run) return;
            out.textContent = `${v.label} · ${v.from ? `${v.from} → ${v.to}` : v.to}`;
          }, 10);
        }
      };
      requestAnimationFrame(type);
      void link;
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => play(i)));
    // 처음: 완성 상태로 두고, 화면에 들어올 때 첫 칸을 한 번 재생
    from.classList.add('on');
    to.classList.add('on');
    if (!reduce) {
      const io = new IntersectionObserver(
        (ents) => {
          if (ents.some((e) => e.isIntersecting)) {
            io.disconnect();
            play(0);
          }
        },
        { threshold: 0.4 },
      );
      io.observe(bench);
    }
  });
}

/* 첫 스크롤 뒤에만 「아래 단계가 맺히는」 연출을 건다 — 스크롤 전 화면(전체 캡처 포함)은 다 보인다 */
addEventListener('scroll', () => root.classList.add('did-scroll'), { once: true, passive: true });

hookApi = initHook();
initRoom();
initDoors();
initBench();
