/** The only automatic motion on a work page: one short screenplay-to-screen introduction. */
function initStoryHooks() {
  document.querySelectorAll<HTMLElement>('[data-story-hook]').forEach((section) => {
    const typed = section.querySelector<HTMLElement>('[data-story-typed]');
    const frame = section.querySelector<HTMLElement>('[data-story-frame]');
    const video = section.querySelector<HTMLVideoElement>('[data-story-video]');
    const button = section.querySelector<HTMLButtonElement>('[data-story-toggle]');
    if (!typed || !frame) return;
    const paper=section.querySelector<HTMLElement>('.story-document > .script-paper');
    const media=section.querySelector<HTMLElement>('.story-media');
    if(paper&&media&&section.dataset.storyPortrait){
      const fitPair=()=>{
        if(innerWidth<=760){section.style.removeProperty('--story-pair-limit');section.style.removeProperty('--story-pair-height');return;}
        const cap=(video?.videoHeight||1280)/Math.max(1,devicePixelRatio||1);
        const limit=Math.min(cap,Math.max(240,innerHeight-220),media.clientWidth*16/9);
        section.style.setProperty('--story-pair-limit',limit+'px');
        section.style.setProperty('--story-pair-height',paper.getBoundingClientRect().height+'px');
      };
      new ResizeObserver(fitPair).observe(paper);
      window.addEventListener('resize',fitPair);video?.addEventListener('loadedmetadata',fitPair);
      document.fonts.ready.then(fitPair);fitPair();
    }
    const text = typed.textContent ?? '';
    const letters = Array.from(text);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let animationDone = motion.matches;
    const finish = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      animationDone = true;
      typed.textContent = text;
      frame.style.clipPath = 'none';
      section.style.setProperty('--story-join', '1');
    };
    if (!motion.matches) {
      const begin = performance.now();
      typed.textContent = '';
      frame.style.clipPath = 'inset(50% 0 50% 0)';
      section.style.setProperty('--story-join', '0');
      const draw = (now: number) => {
        const elapsed = now - begin;
        const typing = Math.min(1, Math.max(0, elapsed / 950));
        const joining = Math.min(1, Math.max(0, (elapsed - 550) / 250));
        const opening = Math.min(1, Math.max(0, (elapsed - 750) / 600));
        typed.textContent = letters.slice(0, Math.ceil(letters.length * typing)).join('');
        section.style.setProperty('--story-join', String(joining));
        const inset = (50 * (1 - opening)).toFixed(2);
        frame.style.clipPath = 'inset(' + inset + '% 0 ' + inset + '% 0)';
        if (elapsed < 1350) raf = requestAnimationFrame(draw);
        else finish();
      };
      raf = requestAnimationFrame(draw);
    }
    if (!video || !button) return;
    let want = !motion.matches;
    const bounds = frame.getBoundingClientRect();
    let seen = bounds.bottom > 0 && bounds.top < innerHeight;
    let sequence = 0;
    const canPlay = () => video.isConnected && want && seen && !document.hidden;
    const paint = () => {
      const playing = !video.paused && !video.ended;
      button.textContent = playing ? '클립 멈춤' : '클립 재생';
      button.setAttribute('aria-label', playing ? '후킹 클립 멈춤' : '후킹 클립 재생');
      button.setAttribute('aria-pressed', String(playing));
    };
    const sync = () => {
      const current = ++sequence;
      if (!canPlay()) {
        video.pause();
        paint();
        return;
      }
      void video.play().then(() => {
        if (!canPlay()) video.pause();
        paint();
      }).catch(() => {
        if (current === sequence) want = false;
        paint();
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
    video.addEventListener('play', paint);
    video.addEventListener('pause', paint);
    video.addEventListener('error', () => { want = false; paint(); });
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
