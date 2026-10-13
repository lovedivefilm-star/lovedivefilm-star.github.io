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
const ytSrc = (id: string) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1`;
function mountIframe(box: HTMLElement) {
  const id = box.dataset.youtubeId;
  if (!id) return;
  const f = document.createElement('iframe');
  f.src = ytSrc(id);
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

/* ───────────── 후킹 — 히어로 v1 엔진(대본 줄 타이핑 ↔ 클립 시각) ───────────── */
type HookApi = { pauseForVideo: () => void };
let hookApi: HookApi | null = null;

function initHook(): HookApi | null {
  const hook = $('[data-hook]');
  if (!hook) return null;
  const video = $<HTMLVideoElement>('video', hook)!;
  const paper = $('.paper', hook)!;
  const flow = $('.flow', paper)!;
  const tc = $('.tl-tc', hook);
  const head = $('.playhead i', hook);
  const toggle = $<HTMLButtonElement>('.tl-toggle', hook);
  const D = Number(hook.dataset.dur) || 12;
  const OFF = Number(hook.dataset.offset) || 0;
  const FPS = Number(hook.dataset.fps) || 24;

  type Line = { el: HTMLElement; full: string; on: HTMLElement; off: HTMLElement; kf: [number, number][] | null; now: [number, number][]; pre: boolean; n: number };
  const lines: Line[] = $$('.b:not(.ghost)', paper).map((el) => {
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
    return { el, full, on, off, kf, now: el.dataset.now ? JSON.parse(el.dataset.now) : [], pre: el.hasAttribute('data-pre'), n: 0 };
  });
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
  let scrollWant = -1;
  const follow = (l: Line | null) => {
    if (!l) return;
    const max = Math.max(0, flow.scrollHeight - flow.clientHeight);
    const want = Math.round(Math.min(max, Math.max(0, l.el.offsetTop + l.el.offsetHeight - flow.clientHeight * 0.78)));
    if (want !== scrollWant) {
      scrollWant = want;
      flow.scrollTo({ top: want, behavior: reduce ? 'auto' : 'smooth' });
    }
  };

  let firstPass = !reduce;
  let opened = false;
  let live = false;
  let lastT = 0;
  let fallback = false;
  let fbStart = 0;
  let userPaused = false;
  let autoPaused = false;
  let inView = true;

  const finishAll = () => {
    lines.forEach((l) => setN(l, l.full.length));
    setLead(null);
    paper.classList.remove('typing');
    firstPass = false;
  };
  const clock = () => (fallback ? ((performance.now() - fbStart) / 1000) % D : video.currentTime || 0);

  const update = () => {
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
    }
    let active: Line | null = null;
    lines.forEach((x) => {
      const on = x.now.some(([a, b]) => t >= a && t < b);
      x.el.classList.toggle('is-now', on);
      if (on) active = x;
    });
    blks.forEach((c) => c.el.classList.toggle('is-now', t >= c.a && t < c.b));
    if (head) head.style.transform = `translateX(${((t / D) * 100).toFixed(3)}%)`;
    if (tc) tc.textContent = smpte(t);
    follow(firstPass ? lead : active);
  };
  const loop = () => {
    if (!hook.isConnected) return;
    if (live && inView && (!video.paused || fallback)) update();
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
    live = true;
    if (video.paused) {
      userPaused = false;
      autoPaused = false;
      if (!opened) openScreen(true);
      video.play().catch(() => {});
    } else {
      userPaused = true;
      video.pause();
    }
    setToggle();
    update();
  });

  const play = () => {
    live = true;
    const p = video.play();
    p?.catch(() => {
      fallback = true;
      fbStart = performance.now();
      setToggle();
    });
  };
  const openScreen = (instant = false) => {
    if (opened) return;
    opened = true;
    if (instant) hook.classList.add('instant');
    hook.classList.add('open');
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

  requestAnimationFrame(loop);

  if (reduce) {
    // 완성 상태 · 화면 열림 · 영상은 「재생」 을 눌러야
    finishAll();
    opened = true;
    hook.classList.add('open');
    setToggle();
    if (tc) tc.textContent = smpte(0);
    return {
      pauseForVideo: () => {
        userPaused = true;
        video.pause();
      },
    };
  }

  // ── 한 번의 연출: 빈 종이 → 씬 헤더(미리 치는 줄) → 화면이 그 줄 높이의 한 줄에서 열림 → 클립 시각대로 타이핑 ──
  lines.forEach((l) => setN(l, 0));
  paper.classList.add('typing');
  const pre = lines.filter((l) => l.pre);
  const openBy = motionMs('--hook-open-by', 1500);
  const perLine = motionMs('--dur-type-line', 700); // zkPass: 줄 길이와 무관하게 한 줄 총 시간 고정
  const tick = motionMs('--dur-type-tick', 33.3);
  const lineDur = pre.map(() => perLine);
  const placeSlit = () => {
    const ref = pre[pre.length - 1]?.el ?? lines[0]?.el;
    const scr = $('.screen', hook);
    if (!ref || !scr) return;
    const fr = scr.getBoundingClientRect();
    const r = ref.getBoundingClientRect();
    if (fr.height <= 0) return;
    // 화면 옆에 종이가 있을 때만 그 줄 높이에서 열고, 위아래로 쌓였으면 가운데 한 줄
    const sideBySide = r.left < fr.left - 4 || r.left > fr.right;
    const y = sideBySide ? Math.min(0.95, Math.max(0.05, (r.top + r.height * 0.6 - fr.top) / fr.height)) : 0.5;
    hook.style.setProperty('--slit-top', `${(y * 100).toFixed(2)}%`);
    hook.style.setProperty('--slit-bot', `${((1 - y) * 100).toFixed(2)}%`);
  };
  placeSlit();

  let done = false;
  const start = performance.now();
  const preTotal = lineDur.reduce((a, b) => a + b, 0);
  const preTick = (now: number) => {
    if (done) return;
    const te = Math.floor((now - start) / tick) * tick; // 뚝뚝 — 33.3ms 틱
    let off = 0;
    pre.forEach((l, k) => {
      const d = lineDur[k];
      const f = d > 0 ? Math.max(0, Math.min(1, (te - off) / d)) : 1;
      setN(l, f * l.full.length);
      if (f > 0) setLead(l);
      off += d;
    });
    if (now - start >= preTotal || now - start >= openBy) return go();
    requestAnimationFrame(preTick);
  };
  const go = () => {
    if (done) return;
    done = true;
    pre.forEach((l) => setN(l, l.full.length));
    openScreen();
    play();
  };
  requestAnimationFrame(preTick);
  setTimeout(go, openBy + 60);

  // 아무 입력이나 하면 완성 상태(작가 피드백 「더 빨라도 된다」)
  const skip = () => {
    ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((t) => removeEventListener(t, skip, true));
    if (!done) {
      done = true;
      openScreen(true);
      play();
    }
    finishAll();
    update();
  };
  ['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach((t) => addEventListener(t, skip, { capture: true, passive: true }));

  return {
    pauseForVideo: () => {
      userPaused = true;
      video.pause();
    },
  };
}

/* ───────────── 작품 안 목차 — 지금 단계 켜기(Aaru · Yuya) · 단계 머리 맺힘 ───────────── */
function initToc() {
  const toc = $('[data-toc]');
  if (!toc) return;
  const items = $$<HTMLAnchorElement>('[data-toc-item]', toc);
  const steps = items.map((a) => $(`[data-step="${a.dataset.tocItem}"]`)).filter(Boolean) as HTMLElement[];
  let cur = '';
  const pathStep = $('[data-path-step]');
  const firstLabel = pathStep?.textContent ?? '';
  let curLabel = '';
  const setLabel = (t: string) => {
    if (!pathStep || t === curLabel) return;
    curLabel = t;
    pathStep.textContent = t;
  };
  const setCur = (key: string) => {
    if (key === cur) return;
    cur = key;
    items.forEach((a) => {
      if (a.dataset.tocItem === key) {
        a.setAttribute('aria-current', 'step');
        const ol = a.closest('ol');
        if (ol && ol.scrollWidth > ol.clientWidth) ol.scrollLeft = a.offsetLeft - ol.clientWidth / 2 + a.offsetWidth / 2;
      } else a.removeAttribute('aria-current');
    });
  };
  let queued = false;
  const pick = () => {
    queued = false;
    const line = innerHeight * (parseFloat(getComputedStyle(root).getPropertyValue('--toc-line')) || 0.52);
    let k = steps[0]?.dataset.step ?? '';
    let entered = false;
    for (const s of steps) if (s.getBoundingClientRect().top <= line) (k = s.dataset.step ?? k), (entered = true);
    setCur(k);
    const item = items.find((a) => a.dataset.tocItem === k);
    const lab = item ? `${item.querySelector('.n')?.textContent ?? ''} ${item.querySelector('.t')?.textContent ?? ''}`.trim() : '';
    setLabel(entered && lab ? lab : firstLabel);
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
  addEventListener('resize', pick, { passive: true });
  pick();
  // 단계 머리가 화면에 들어오면 천천히 맺힌다(움직임 허용일 때만 CSS 가 숨겨 둔다)
  const io = new IntersectionObserver(
    (ents) => {
      for (const en of ents) if (en.isIntersecting) {
        en.target.classList.add('seen');
        io.unobserve(en.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
  );
  steps.forEach((s) => io.observe(s));
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
initToc();
initDoors();
initBench();
