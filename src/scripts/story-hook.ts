/** The only automatic motion on a work page: one short screenplay-to-screen introduction.
 *  Same grammar as the approved hero v1 (시안/히어로_v1): the paper opens with the typing cursor,
 *  a straight 1px line runs from the end of the first line to the screen, a slit is drawn across
 *  the screen at that height and the clip opens from it. Layout never moves while typing: untyped
 *  text keeps its place (transparent), so the paired frame keeps its final height.
 *  Paper and screen always share one height: a portrait clip takes the paper's height, a
 *  landscape clip spreads across the page and the paper's line spacing gives way to it. */
const CPS = 95;          // typed characters per second
const LINK_DELAY = 180;  // hero v1: '+=0.18'
const LINK_MS = 500;     // power2.inOut
const SLIT_MS = 320;     // power2.out, starts 40ms before the line lands
const OPEN_MS = 950;     // expo.inOut
const SLIT_FADE_AT = 250;
const SLIT_FADE_MS = 300;
const WIDE_GAP = 28;     // the column the line crosses between paper and screen
const WIDE_MAX = 520;    // tallest shared height for a landscape pair

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const power2InOut = (t: number) => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const power2Out = (t: number) => 1 - (1 - t) ** 2;
const expoInOut = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;

function initStoryHooks() {
  document.querySelectorAll<HTMLElement>('[data-story-hook]').forEach((section) => {
    const paper = section.querySelector<HTMLElement>('[data-story-paper]');
    const frame = section.querySelector<HTMLElement>('[data-story-frame]');
    const video = section.querySelector<HTMLVideoElement>('[data-story-video]');
    const button = section.querySelector<HTMLButtonElement>('[data-story-toggle]');
    const link = section.querySelector<HTMLElement>('[data-story-link]');
    const slitLine = section.querySelector<HTMLElement>('[data-story-slit]');
    const anchor = section.querySelector<HTMLElement>('[data-story-anchor]');
    const media = section.querySelector<HTMLElement>('.story-media');
    if (!paper || !frame) return;
    const portrait = !!section.dataset.storyPortrait;

    if (media && portrait) {
      const fitPair = () => {
        if (innerWidth <= 760) { section.style.removeProperty('--story-pair-limit'); section.style.removeProperty('--story-pair-height'); return; }
        const cap = (video?.videoHeight || 1280) / Math.max(1, devicePixelRatio || 1);
        const limit = Math.min(cap, Math.max(240, innerHeight - 220), media.clientWidth * 16 / 9);
        section.style.setProperty('--story-pair-limit', limit + 'px');
        section.style.setProperty('--story-pair-height', paper.getBoundingClientRect().height + 'px');
      };
      new ResizeObserver(fitPair).observe(paper);
      window.addEventListener('resize', fitPair); video?.addEventListener('loadedmetadata', fitPair);
      document.fonts.ready.then(fitPair); fitPair();
    }

    // A landscape pair spans the page: the 16:9 screen takes the width left beside the paper and
    // the paper's line spacing gives way so both share the screen's height (never below the text).
    if (!portrait) {
      const fitWide = () => {
        if (getComputedStyle(paper).display !== 'flex') {
          section.style.removeProperty('--story-unit-h');
          section.style.removeProperty('--story-frame-w');
          return;
        }
        section.style.setProperty('--story-unit-h', '0px');
        const last = paper.lastElementChild as HTMLElement | null;
        const least = Math.ceil((last ? last.getBoundingClientRect().bottom : paper.getBoundingClientRect().bottom) - paper.getBoundingClientRect().top + parseFloat(getComputedStyle(paper).paddingBottom));
        const room = section.clientWidth - paper.offsetWidth - WIDE_GAP;
        const height = Math.max(least, Math.floor(Math.min(WIDE_MAX, innerHeight - 180, room * 9 / 16)));
        section.style.setProperty('--story-unit-h', height + 'px');
        section.style.setProperty('--story-frame-w', Math.floor(Math.min(room, height * 16 / 9)) + 'px');
      };
      window.addEventListener('resize', fitWide);
      document.fonts.ready.then(fitWide); fitWide();
    }

    // ── geometry: the line leaves the end of the first line's text and lands on the screen ──
    let linkP = 1, slitP = 1, slitFade = 1, opened = 1;
    let slit = .5; // fraction of the frame height the screen opens from
    const paint = () => {
      if (link) link.style.transform = 'scaleX(' + linkP + ')';
      if (slitLine) {
        slitLine.style.transform = 'scaleX(' + slitP + ')';
        slitLine.style.opacity = String(slitP > 0 ? 1 - slitFade : 0);
      }
      const top = (100 * slit * (1 - opened)).toFixed(2);
      const bottom = (100 * (1 - slit) * (1 - opened)).toFixed(2);
      frame.style.clipPath = opened >= 1 ? '' : 'inset(' + top + '% 0 ' + bottom + '% 0)';
    };
    const lastTextRect = (element: HTMLElement) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0);
      return rects[rects.length - 1] ?? element.getBoundingClientRect();
    };
    const place = () => {
      const host = section.getBoundingClientRect();
      const p = paper.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      const side = innerWidth > 760 && f.left >= p.right - 1;
      if (side && anchor) {
        const r = lastTextRect(anchor);
        const y = Math.min(Math.max(r.top + r.height * .58, f.top + 2), f.bottom - 2);
        const x0 = r.right + 8;
        if (link) {
          link.style.left = (x0 - host.left) + 'px';
          link.style.top = (y - host.top) + 'px';
          link.style.width = Math.max(0, f.left - x0 - 1) + 'px';
        }
        slit = f.height ? (y - f.top) / f.height : .5;
      } else {
        if (link) link.style.width = '0';
        slit = 1; // stacked: the screen rises from its lower edge (hero v1 mobile)
      }
      if (slitLine) {
        slitLine.style.left = (f.left - host.left) + 'px';
        slitLine.style.top = (f.top + f.height * slit - host.top - (slit >= 1 ? 1 : 0)) + 'px';
        slitLine.style.width = f.width + 'px';
      }
      paint();
    };
    new ResizeObserver(place).observe(section);
    window.addEventListener('resize', place);
    paper.addEventListener('scroll', place, { passive: true });
    video?.addEventListener('loadedmetadata', place);
    document.fonts.ready.then(place);

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let animationDone = true;
    let restore = () => {};
    const finish = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      animationDone = true;
      restore();
      restore = () => {};
      paper.style.clipPath = '';
      paper.classList.remove('is-typing');
      linkP = 1; slitP = 1; slitFade = 1; opened = 1;
      place();
    };

    if (!motion.matches) {
      animationDone = false;
      // Split every text node into [typed][rest]; rest keeps the layout but is transparent.
      const walker = document.createTreeWalker(paper, NodeFilter.SHOW_TEXT, { acceptNode: (node) => node.nodeValue?.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      let offset = 0;
      let anchorEnd = 0;
      const pieces = nodes.map((node) => {
        const chars = Array.from(node.data);
        const typed = document.createElement('span');
        const rest = document.createElement('span');
        rest.className = 'story-rest';
        rest.textContent = node.data;
        node.replaceWith(typed, rest);
        const piece = { node, chars, typed, rest, start: offset, shown: 0, block: (typed.closest('p') ?? typed.parentElement) as HTMLElement };
        offset += chars.length;
        if (anchor?.contains(typed)) anchorEnd = offset;
        return piece;
      });
      restore = () => pieces.forEach((piece) => { piece.typed.replaceWith(piece.node); piece.rest.remove(); });
      const total = offset;
      const typingEnd = total / CPS * 1000;
      const linkStart = (anchorEnd || total) / CPS * 1000 + LINK_DELAY;
      const slitStart = linkStart + LINK_MS - 40;
      const openStart = slitStart + SLIT_MS;
      const end = Math.max(typingEnd, openStart + OPEN_MS);
      let revealed = 0; // px of paper shown; eases toward the typing caret every frame
      let lastFrame = 0;
      let rewound = false;
      paper.classList.add('is-typing');
      paper.style.clipPath = 'inset(0 0 100% 0)';
      linkP = 0; slitP = 0; slitFade = 0; opened = 0;
      place();
      document.documentElement.classList.remove('story-pre');
      const begin = performance.now();
      const draw = (now: number) => {
        const elapsed = now - begin;
        const step = lastFrame ? Math.min(64, now - lastFrame) : 16;
        lastFrame = now;
        const count = Math.min(total, Math.ceil(elapsed / 1000 * CPS));
        let current = pieces[0];
        for (const piece of pieces) {
          const shown = Math.max(0, Math.min(piece.chars.length, count - piece.start));
          if (shown !== piece.shown) {
            piece.shown = shown;
            piece.typed.textContent = piece.chars.slice(0, shown).join('');
            piece.rest.textContent = piece.chars.slice(shown).join('');
          }
          if (count > piece.start) current = piece;
        }
        // The paper unrolls under the caret: its lower edge eases toward the line being written,
        // so a wrap or a new paragraph slides open instead of jumping a whole block at once.
        const box = paper.getBoundingClientRect();
        let target = box.height;
        if (count < total && current) {
          const typedRects = current.typed.getClientRects();
          const caret = typedRects.length ? typedRects[typedRects.length - 1] : current.rest.getClientRects()[0] ?? current.block.getBoundingClientRect();
          target = Math.min(box.height, caret.bottom - box.top + 28);
        }
        revealed = Math.max(revealed, revealed + (target - revealed) * (1 - Math.exp(-step / 70)));
        paper.style.clipPath = 'inset(0 0 ' + Math.max(0, box.height - revealed).toFixed(1) + 'px 0)';
        linkP = power2InOut(clamp01((elapsed - linkStart) / LINK_MS));
        slitP = power2Out(clamp01((elapsed - slitStart) / SLIT_MS));
        slitFade = clamp01((elapsed - openStart - SLIT_FADE_AT) / SLIT_FADE_MS);
        const open = clamp01((elapsed - openStart) / OPEN_MS);
        if (open > 0 && !rewound && video) { rewound = true; video.currentTime = 0; }
        opened = expoInOut(open);
        paint();
        if (elapsed < end || box.height - revealed > .5) raf = requestAnimationFrame(draw);
        else finish();
      };
      raf = requestAnimationFrame(draw);
    } else place();

    if (!video || !button) return;
    let want = !motion.matches;
    const bounds = frame.getBoundingClientRect();
    let seen = bounds.bottom > 0 && bounds.top < innerHeight;
    let sequence = 0;
    const canPlay = () => video.isConnected && want && seen && !document.hidden;
    const paintButton = () => {
      const playing = !video.paused && !video.ended;
      button.textContent = playing ? '클립 멈춤' : '클립 재생';
      button.setAttribute('aria-label', playing ? '후킹 클립 멈춤' : '후킹 클립 재생');
      button.setAttribute('aria-pressed', String(playing));
    };
    const sync = () => {
      const current = ++sequence;
      if (!canPlay()) {
        video.pause();
        paintButton();
        return;
      }
      void video.play().then(() => {
        if (!canPlay()) video.pause();
        paintButton();
      }).catch(() => {
        if (current === sequence) want = false;
        paintButton();
      });
    };
    const observer = new IntersectionObserver((entries) => {
      seen = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= .15);
      sync();
    }, { threshold: .15 });
    const click = () => {
      finish();
      want = video.paused;
      sync();
    };
    const filmPlay = () => {
      want = false;
      sync();
    };
    const motionChange = () => {
      if (motion.matches) {
        finish();
        want = false;
      }
      sync();
    };
    button.hidden = false;
    button.addEventListener('click', click);
    video.addEventListener('play', paintButton);
    video.addEventListener('pause', paintButton);
    video.addEventListener('error', () => { want = false; paintButton(); });
    document.addEventListener('visibilitychange', sync);
    document.addEventListener('portfolio:film-play', filmPlay);
    motion.addEventListener('change', motionChange);
    observer.observe(frame);
    sync();
    // Native navigation can use the back/forward cache; preserve live controls, pause while away.
    window.addEventListener('pagehide', () => {
      video.pause();
      if (!animationDone) finish();
    });
    window.addEventListener('pageshow', sync);
  });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStoryHooks, { once: true });
else initStoryHooks();

export {};
