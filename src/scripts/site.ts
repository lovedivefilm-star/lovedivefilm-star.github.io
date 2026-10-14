/**
 * 사이트 동작 — v4(메인 지시 10-14 반영). 방마다 있는 부품만 켠다. Astro ClientRouter 라 `astro:page-load` 마다 켜고 `astro:before-swap` 에 되돌린다.
 * 움직임은 진입 · 전환 · 스크롤 걸음에서만, 끝나면 멈춘다. 움직임 줄이기면 전부 건너뛰고 완성 상태(과정은 4장면 세로).
 * 라이브러리 = GSAP 3.15(코어 · SplitText · TextPlugin · ScrollTrigger · Observer · Flip — 전부 무료) · lite-youtube 1.9(MIT).
 */
import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { TextPlugin } from 'gsap/TextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Observer } from 'gsap/Observer';
import { Flip } from 'gsap/Flip';
import { navigate } from 'astro:transitions/client';
import '@justinribeiro/lite-youtube';

gsap.registerPlugin(SplitText, TextPlugin, ScrollTrigger, Observer, Flip);

declare global {
  interface Window {
    __ykEnterAt?: number;
    /** 시험용 — 지금 돌고 있는 GSAP 트윈 수(스크롤에 묶인 스크럽은 멈춰 있으면 0) */
    __motion?: () => number;
  }
}

type Lite = HTMLElement & { addIframe: () => void; isIframeLoaded?: boolean };

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let ctx: gsap.Context | null = null;
const offs: (() => void)[] = [];
const on = <K extends keyof WindowEventMap>(t: Window | Document, k: K, f: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
  t.addEventListener(k, f as EventListener, o);
  offs.push(() => t.removeEventListener(k, f as EventListener, o));
};

window.__motion = () =>
  gsap.globalTimeline
    .getChildren(true, true, false)
    .filter((t) => t.isActive() && !(t as gsap.core.Animation & { scrollTrigger?: unknown }).scrollTrigger).length;

document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', cleanup);

function init() {
  const page = document.body.dataset.page;
  if (page !== 'home') {
    try {
      sessionStorage.setItem('yk-entered', '1');
    } catch {}
  }
  ctx = gsap.context(() => {
    if (page === 'home') initIntro();
    if (page === 'work') {
      initRoom();
      initCut();
    }
    if (page === 'work' || page === 'tools') {
      initPlayers();
      initKeys();
    }
  });
}

function cleanup() {
  ctx?.revert();
  ctx = null;
  offs.splice(0).forEach((f) => f());
}

/* ───────────── 홈 인트로 = 잠든 벽(메인 지시 10-14) ─────────────
 * 같은 벽이 ×2.2 · brightness .32 · blur 2px 로 깔려 있고(CSS html[data-intro] .wall-cam) 아주 느리게 돈다(WorkWall).
 * 진입(Kavieng 2-1): 덮개 · 이름 .9s → 직함 +.5s → 안내 +1.05s(.62). 자동 진행 없음.
 * 입장(휠 36px · 클릭 · 키 · 터치, 처음 .9s 무시 — Kavieng 2-2): 카메라가 뒤로(×2.2 → 1, 어둠 · 흐림 걷힘, 1.1s power3.inOut),
 * 큰 이름은 GSAP Flip 으로 상단 바 이름 자리로, 상단 바 · 벽 위 글이 이어서 나타난다. */
function initIntro() {
  const html = document.documentElement;
  const layer = document.querySelector<HTMLElement>('[data-intro-layer]');
  if (!layer || !html.hasAttribute('data-intro')) return;
  layer.classList.add('is-on');
  const name = layer.querySelector<HTMLElement>('.intro-name')!;
  const job = layer.querySelector<HTMLElement>('.intro-job')!;
  const hint = layer.querySelector<HTMLElement>('.intro-hint')!;
  const cover = layer.querySelector<HTMLElement>('.intro-cover')!;
  const cam = document.querySelector<HTMLElement>('[data-cam]');
  gsap.set([name, job, hint, cover], { autoAlpha: 0 });
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to(cover, { autoAlpha: 1, duration: 0.9 }, 0)
    .to(name, { autoAlpha: 1, duration: 0.9 }, 0)
    .to(job, { autoAlpha: 1, duration: 0.6 }, 0.5)
    .to(hint, { autoAlpha: 0.62, duration: 0.6 }, 1.05);

  let entered = false;
  let obs: Observer | null = null;
  const enter = () => {
    if (entered) return;
    entered = true;
    obs?.kill();
    tl.progress(1);
    window.__ykEnterAt = performance.now();
    try {
      sessionStorage.setItem('yk-entered', '1');
    } catch {}
    const barName = document.querySelector<HTMLElement>('.tb-name');
    const barRest = [...document.querySelectorAll<HTMLElement>('.tb-job, .tb-r')];
    const ui = [...document.querySelectorAll<HTMLElement>('.wall-ui > *'), document.querySelector<HTMLElement>('.wall-dot')].filter(Boolean) as HTMLElement[];
    gsap.set([barName, ...barRest, ...ui], { autoAlpha: 0 });
    document.dispatchEvent(new CustomEvent('yk:enter')); // 벽이 멈추고 영상 칸이 깨어난다(WorkWall)
    const out = gsap.timeline({
      onComplete: () => {
        html.removeAttribute('data-intro');
        layer.classList.remove('is-on');
        if (cam) gsap.set(cam, { clearProps: 'transform,filter' });
      },
    });
    out.to([job, hint], { autoAlpha: 0, duration: 0.35, ease: 'power3.out' }, 0).to(cover, { autoAlpha: 0, duration: 0.6, ease: 'power3.out' }, 0);
    if (cam) out.fromTo(cam, { scale: 2.2, filter: 'brightness(0.32) blur(2px)' }, { scale: 1, filter: 'brightness(1) blur(0px)', duration: 1.1, ease: 'power3.inOut' }, 0);
    if (barName) {
      const fit = Flip.fit(name, barName, { scale: true, duration: 1.1, ease: 'power3.inOut' });
      if (fit) out.add(fit as gsap.core.Tween, 0);
      out.to(barName, { autoAlpha: 1, duration: 0.25, ease: 'power3.out' }, 0.85).to(name, { autoAlpha: 0, duration: 0.2, ease: 'power3.out' }, 0.9);
    } else out.to(name, { autoAlpha: 0, duration: 0.4, ease: 'power3.out' }, 0);
    out.to(barRest, { autoAlpha: 1, duration: 0.4, ease: 'power3.out' }, 0.9).to(ui, { autoAlpha: 1, duration: 0.42, ease: 'power3.out', stagger: 0.05 }, 1.0);
    gsap.delayedCall(4.6, () => html.removeAttribute('data-intro')); // 안전장치(Kavieng 4.6s)
  };
  gsap.delayedCall(0.9, () => {
    obs = Observer.create({ target: window, type: 'wheel,touch,pointer', tolerance: 36, onUp: enter, onDown: enter, onPress: enter });
    on(window, 'keydown', () => enter());
  });
}

/* ───────────── 작품 방 히어로 — 영상 먼저(영상 칸 열림 → 제목 → 대본 줄 타이핑 → 메타 행) ───────────── */
function initRoom() {
  fitTitle();
  const room = document.querySelector<HTMLElement>('.room');
  const rows = gsap.utils.toArray<HTMLElement>('[data-meta] tr');
  const title = document.querySelector<HTMLElement>('[data-title]');
  const typed = document.querySelector<HTMLElement>('[data-line] .typed');
  const cell = document.querySelector<HTMLElement>('.hero .vcell');
  if (reduce() || !room) {
    room?.classList.remove('pre');
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
  // 0 영상 칸 — clip-path inset(7%) → 0, 1.05s expo.out(Kavieng 영상 칸)
  if (cell) tl.fromTo(cell, { clipPath: 'inset(7%)' }, { clipPath: 'inset(0%)', duration: 1.05, ease: 'expo.out', clearProps: 'clipPath' }, 0);
  // .2 큰 제목 — 줄이 칸 아래에서 올라옴(.92s, 줄마다 .09s — SplitText lines + mask)
  if (title) {
    const split = SplitText.create(title, { type: 'lines', mask: 'lines' });
    gsap.set(title, { opacity: 1 });
    tl.from(split.lines, { yPercent: 110, duration: 0.92, stagger: 0.09, onComplete: () => split.revert() }, 0.2);
  }
  // .45 대본 첫 줄 — 한 번 타이핑(TextPlugin), 캐럿은 끝나면 사라짐
  if (typed) {
    const full = typed.textContent ?? '';
    const tx = document.createElement('span');
    const caret = document.createElement('span');
    caret.className = 'caret';
    typed.textContent = '';
    typed.append(tx, caret);
    gsap.set(typed, { visibility: 'visible' });
    tl.to(tx, { text: { value: full }, duration: Math.min(1.6, full.length * 0.03), ease: 'none', onComplete: () => { caret.remove(); typed.textContent = full; } }, 0.45);
  }
  // .65 메타 행 — 왼쪽에서 오른쪽으로 걷힘, 행마다 .075s(Kavieng 2-4 — 한 화면 이징 3종 이하라 steps(6) 대신 기본 power4.out)
  tl.fromTo(rows, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.34, stagger: 0.075, clearProps: 'clipPath' }, 0.65);
  room.classList.remove('pre');
}

/** 큰 제목이 칸에 안 들어가면(글꼴 차이) 줄인다 */
function fitTitle() {
  const t = document.querySelector<HTMLElement>('[data-title]');
  if (!t) return;
  const fit = () => {
    const over = t.scrollWidth / Math.max(1, t.clientWidth);
    if (over > 1.002) t.style.fontSize = `${(parseFloat(getComputedStyle(t).fontSize) / over) * 0.985}px`;
  };
  fit();
  document.fonts?.ready.then(fit);
}

/* ───────────── 한 컷이 만들어진 순서 — 고정 무대 + 스크롤 걸음 ─────────────
 * 걸음 1(대본)은 무대가 고정되는 순간 보인다(밑줄은 진입 때 한 번). 걸음 2~4 는 핀 구간 3 × 30vh 를 스크럽(작품 한 편 ≤ 3.5화면 — 절제 규칙 9).
 * 스냅 = 걸음 끝 4곳. 선 · 와이프는 걸음 끝보다 조금 일찍 끝난다(스냅이 살짝 앞에서 멈춰도 다 그려지게). */
const SNAP = [0, 1 / 3, 2 / 3, 1];
const PIN_VH = 0.9;

function initCut() {
  const section = document.querySelector<HTMLElement>('[data-process]');
  const stage = section?.querySelector<HTMLElement>('[data-stage]');
  if (!section || !stage) return;
  if (reduce()) return cutStatic(section, stage);

  const q = <T extends Element = HTMLElement>(s: string) => stage.querySelector<T>(s)!;
  const sheet = q('[data-sheet]');
  const frame = q('[data-frame]');
  const final = q('[data-final]');
  const words = [...stage.querySelectorAll<HTMLElement>('u[data-word]')];
  const box = (k: string) => stage.querySelector<HTMLElement>(`[data-box="${k}"]`);
  const caps = [...stage.querySelectorAll<HTMLElement>('[data-cap]')];
  const stepBtns = [...stage.querySelectorAll<HTMLButtonElement>('[data-step-go]')];
  const l1 = q<SVGLineElement>('[data-line="1"]');
  const l2 = q<SVGLineElement>('[data-line="2"]');
  const sent = q('[data-sent]');

  // 시트의 두 자리 — A(오른쪽 큰 자리, 걸음 2) · B(왼쪽 아래, 걸음 3~) 를 재서 A→B 를 transform 으로(Flip 과 같은 셈)
  stage.dataset.state = '2';
  const rA = sheet.getBoundingClientRect();
  stage.dataset.state = 'anim';
  const rB = sheet.getBoundingClientRect();
  const toA = { x: rA.left - rB.left, y: rA.top - rB.top, scale: rA.width / rB.width };

  const L = { p1: 0, o1: 1, p2: 0, o2: 1 };
  const drawLines = () => {
    const base = stage.getBoundingClientRect();
    const mid = (r: DOMRect, side: 'l' | 'r' | 'b') =>
      side === 'b' ? { x: r.left + r.width / 2 - base.left, y: r.bottom - 1 - base.top } : { x: (side === 'l' ? r.left + 2 : r.right - 2) - base.left, y: r.top + r.height / 2 - base.top };
    const set = (ln: SVGLineElement, a: { x: number; y: number }, b: { x: number; y: number }, p: number, o: number) => {
      ln.setAttribute('x1', a.x.toFixed(1));
      ln.setAttribute('y1', a.y.toFixed(1));
      ln.setAttribute('x2', (a.x + (b.x - a.x) * p).toFixed(1));
      ln.setAttribute('y2', (a.y + (b.y - a.y) * p).toFixed(1));
      ln.style.opacity = p > 0 ? String(o) : '0';
    };
    const w1 = words[Number(l1.dataset.fromWord)];
    const sb = box('sheet');
    if (w1 && sb) set(l1, mid(w1.getBoundingClientRect(), 'b'), mid(sb.getBoundingClientRect(), 'l'), L.p1, L.o1);
    const fromWord = l2.dataset.fromWord;
    const start = fromWord ? words[Number(fromWord)]?.getBoundingClientRect() : box('sheet2')?.getBoundingClientRect();
    const bb = box('board');
    if (start && bb) set(l2, fromWord ? mid(start, 'b') : mid(start, 'r'), mid(bb.getBoundingClientRect(), 'l'), L.p2, L.o2);
  };

  // 첫 상태 — 걸음 1(대본)은 무대가 고정되는 순간 문장이 뜨고 밑줄이 그어진다
  gsap.set(sent, { autoAlpha: 0 });
  gsap.set(words, { '--uw': '0%' });
  gsap.set(sheet, { ...toA, autoAlpha: 0, transformOrigin: '0 0' });
  gsap.set(frame, { autoAlpha: 0 });
  gsap.set(final, { clipPath: 'inset(0 100% 0 0)' });
  gsap.set([box('sheet'), box('sheet2'), box('board')].filter(Boolean), { autoAlpha: 0 });
  gsap.set(caps.slice(1), { autoAlpha: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' }, onUpdate: drawLines });
  const cap = (from: number, to: number, at: number) => tl.to(caps[from], { autoAlpha: 0, duration: 0.1 }, at).to(caps[to], { autoAlpha: 1, duration: 0.12 }, at + 0.06);
  // 2 대본 → 시트 — 시트가 오른쪽에 나타나고 낱말에서 선이 그어져 상자에 닿는다(v1 연결선 power2.inOut)
  cap(0, 1, 0.02);
  tl.to(sheet, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 0.05)
    .to(box('sheet'), { autoAlpha: 1, duration: 0.08 }, 0.3)
    .to(L, { p1: 1, duration: 0.45 }, 0.35);
  // 3 시트 → 연출 — 시트는 왼쪽 아래로 물러나고 연출 그림이 그 자리로, 같은 인물 영역끼리 선
  cap(1, 2, 1.05);
  tl.to(L, { o1: 0, duration: 0.12 }, 1.05)
    .to(box('sheet'), { autoAlpha: 0, duration: 0.12 }, 1.05)
    .to(sheet, { x: 0, y: 0, scale: 1, duration: 0.45 }, 1.05)
    .to(frame, { autoAlpha: 1, duration: 0.25, ease: 'power2.out' }, 1.3)
    .to([box('sheet2'), box('board')].filter(Boolean), { autoAlpha: 1, duration: 0.08 }, 1.55)
    .to(L, { p2: 1, duration: 0.3 }, 1.6);
  // 4 연출 → 완성 — 같은 자리에 겹쳐 왼→오 와이프
  cap(2, 3, 2.05);
  tl.to(L, { o2: 0, duration: 0.1 }, 2.05)
    .to([box('sheet2'), box('board')].filter(Boolean), { autoAlpha: 0, duration: 0.1 }, 2.05)
    .to(sheet, { autoAlpha: 0.45, duration: 0.15 }, 2.05)
    .to(final, { clipPath: 'inset(0 0% 0 0)', duration: 0.8, ease: 'none' }, 2.1)
    .to({}, { duration: 0.1 }, 2.9);

  const setStep = (p: number) => {
    const i = p < 1 / 6 ? 0 : p < 0.5 ? 1 : p < 5 / 6 ? 2 : 3;
    stepBtns.forEach((b, k) => (k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    stage.dataset.step = String(i + 1);
  };
  const bar = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 58;
  let underlined = false;
  const underline = () => {
    if (underlined) return;
    underlined = true;
    gsap.timeline({ defaults: { ease: 'power2.out' } }) // 걸음 1 — 진입 때 한 번
      .to(sent, { autoAlpha: 1, duration: 0.4 })
      .to(words, { '--uw': '100%', duration: 0.6, stagger: 0.15 }, 0.2);
  };
  const st = ScrollTrigger.create({
    trigger: section,
    start: () => `top top+=${bar()}`,
    end: () => `+=${Math.round(innerHeight * PIN_VH)}`,
    pin: stage,
    scrub: 0.4,
    animation: tl,
    snap: { snapTo: SNAP, duration: { min: 0.2, max: 0.5 }, delay: 0.06, ease: 'power2.inOut', directional: true, inertia: false },
    onEnter: underline,
    onEnterBack: underline,
    onUpdate: (self) => {
      setStep(self.progress);
      if (self.progress > 0) underline();
    },
    onRefresh: (self) => {
      section.dataset.pinStart = String(Math.round(self.start));
      section.dataset.pinEnd = String(Math.round(self.end));
      drawLines();
    },
  });
  setStep(0);
  stepBtns.forEach((b, k) => {
    const go = () => {
      underline();
      window.scrollTo({ top: st.start + (st.end - st.start) * SNAP[k] + 2, behavior: 'smooth' });
    };
    b.addEventListener('click', go);
    offs.push(() => b.removeEventListener('click', go));
  });
  on(window, 'resize', () => drawLines());
}

/** 움직임 줄이기 — 핀 없이 4장면을 세로로, 선은 그려진 상태 */
function cutStatic(section: HTMLElement, stage: HTMLElement) {
  section.classList.add('cut-stack');
  const states = ['1', '2', '3'];
  const clones = states.map((s) => {
    const c = stage.cloneNode(true) as HTMLElement;
    c.dataset.state = s;
    c.querySelector('[id]')?.removeAttribute('id');
    c.querySelectorAll('[data-step-go]').forEach((b, k) => (String(k + 1) === s ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current')));
    stage.before(c);
    return c;
  });
  stage.dataset.state = '4';
  const draw = (st: HTMLElement, which: '1' | '2') => {
    const base = st.getBoundingClientRect();
    const ln = st.querySelector<SVGLineElement>(`[data-line="${which}"]`);
    if (!ln) return;
    const fw = ln.dataset.fromWord;
    const a = fw ? st.querySelector(`u[data-word="${fw}"]`)?.getBoundingClientRect() : st.querySelector('[data-box="sheet2"]')?.getBoundingClientRect();
    const b = st.querySelector(which === '1' ? '[data-box="sheet"]' : '[data-box="board"]')?.getBoundingClientRect();
    if (!a || !b) return;
    const ax = fw ? a.left + a.width / 2 : a.right - 2;
    const ay = fw ? a.bottom - 1 : a.top + a.height / 2;
    ln.setAttribute('x1', String(ax - base.left));
    ln.setAttribute('y1', String(ay - base.top));
    ln.setAttribute('x2', String(b.left + 2 - base.left));
    ln.setAttribute('y2', String(b.top + b.height / 2 - base.top));
    ln.style.opacity = '1';
  };
  const run = () => {
    stage.querySelectorAll<SVGLineElement>('.cut-lines line').forEach((l) => (l.style.opacity = '0'));
    clones.forEach((c) => c.querySelectorAll<SVGLineElement>('.cut-lines line').forEach((l) => (l.style.opacity = '0')));
    draw(clones[1], '1');
    draw(clones[2], '2');
  };
  run();
  on(window, 'resize', run);
  window.addEventListener('load', run, { once: true });
}

/* ───────────── 영상 — 같은 자리에서 lite-youtube(새 탭 · 이동 없음) ───────────── */
function initPlayers() {
  document.querySelectorAll<HTMLElement>('[data-play]').forEach((btn) => {
    const go = () => {
      const start = Number(btn.dataset.start ?? 0) || 0;
      const box = btn.closest<HTMLElement>('[data-vbox]');
      const cell = (box ?? document).querySelector<HTMLElement>('[data-video]');
      if (!cell) return;
      playIn(cell, start);
      if (!box) cell.scrollIntoView({ block: 'center', behavior: reduce() ? 'auto' : 'smooth' });
    };
    btn.addEventListener('click', go);
    offs.push(() => btn.removeEventListener('click', go));
  });
}

function playIn(cell: HTMLElement, start = 0) {
  let lite = cell.querySelector<Lite>('lite-youtube');
  const at = String(start);
  if (!lite || (lite.isIframeLoaded && (lite.getAttribute('videostartat') ?? '0') !== at)) {
    cell.replaceChildren();
    const el = document.createElement('lite-youtube') as Lite;
    const img = document.createElement('img');
    img.slot = 'image';
    img.src = cell.dataset.poster ?? '';
    img.alt = '';
    el.append(img); // 우리 포스터가 먼저 — 유튜브 썸네일을 받지 않게
    el.setAttribute('videostartat', at);
    el.setAttribute('nocookie', '');
    el.setAttribute('params', 'rel=0&playsinline=1');
    el.setAttribute('videoplay', '재생');
    el.setAttribute('videotitle', cell.dataset.videoTitle ?? '');
    el.setAttribute('videoid', cell.dataset.youtubeId ?? '');
    cell.append(el);
    lite = el;
  } else if (!lite.isIframeLoaded) {
    lite.setAttribute('videostartat', at);
  }
  lite.addIframe();
  cell.closest('[data-vbox]')?.querySelector('.play')?.setAttribute('aria-pressed', 'true');
}

/* 키보드 — ← → 이전 · 다음 작품(상단 바 화살표가 곧 안내) · Esc 작품으로(Kavieng: Esc = 작품 방 닫기) */
function initKeys() {
  const room = document.querySelector<HTMLElement>('.room');
  on(window, 'keydown', (e) => {
    const t = e.target as HTMLElement | null;
    if (e.altKey || e.ctrlKey || e.metaKey || t?.closest?.('input,textarea,select,[contenteditable]')) return;
    if (e.key === 'Escape') navigate('/');
    else if (e.key === 'ArrowLeft' && room?.dataset.prevHref) navigate(room.dataset.prevHref);
    else if (e.key === 'ArrowRight' && room?.dataset.nextHref) navigate(room.dataset.nextHref);
  });
}
