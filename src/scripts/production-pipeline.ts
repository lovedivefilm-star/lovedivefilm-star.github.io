// Native anchors/details remain readable before enhancement.
document.querySelectorAll<HTMLElement>('[data-production-pipeline]').forEach(root => {
  const tabs = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-pipeline-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-pipeline-panel]'));
  const workspace = root.querySelector<HTMLElement>('[data-pipeline-workspace]')!;
  const previous = root.querySelector<HTMLButtonElement>('[data-pipeline-prev]')!;
  const next = root.querySelector<HTMLButtonElement>('[data-pipeline-next]')!;
  const status = root.querySelector<HTMLElement>('[data-pipeline-status]')!;
  if (tabs.length !== panels.length || !tabs.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 900px)');
  let selected = 0;
  root.dataset.enhanced = 'true';

  function syncCompact() {
    root.querySelector('[data-pipeline-tabs]')?.setAttribute('aria-orientation', compact.matches ? 'horizontal' : 'vertical');
  }
  // Tool screens: without script every screen stays listed; with it, one shows at a time and
  // toggle buttons (not nested tabs) pick which one.
  root.querySelectorAll<HTMLElement>('[data-pipeline-screens]').forEach(group => {
    const choices = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-screen-choice]'));
    const screens = Array.from(group.querySelectorAll<HTMLElement>('[data-screen]'));
    const bar = group.querySelector<HTMLElement>('[data-screen-switch]');
    if (!bar || choices.length !== screens.length || choices.length < 2) return;
    const show = (index: number) => {
      screens.forEach((screen, i) => { screen.hidden = i !== index; });
      choices.forEach((choice, i) => choice.setAttribute('aria-pressed', String(i === index)));
    };
    choices.forEach((choice, index) => choice.addEventListener('click', () => show(index)));
    bar.hidden = false;
    show(0);
  });
  // 02 · 03 material views: the same toggle pattern, plus a before/after drag compare and two
  // videos that play side by side on one clock (the right one leads, the left one follows).
  root.querySelectorAll<HTMLElement>('[data-pipeline-views]').forEach(group => {
    const choices = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-pv-choice]'));
    const views = Array.from(group.querySelectorAll<HTMLElement>('[data-pv-view]'));
    const bar = group.querySelector<HTMLElement>('[data-pv-switch]');
    if (bar && choices.length === views.length && choices.length > 1) {
      const show = (index: number) => {
        views.forEach((view, i) => {
          view.hidden = i !== index;
          if (i !== index) view.querySelectorAll<HTMLVideoElement>('video').forEach(video => video.pause());
        });
        choices.forEach((choice, i) => choice.setAttribute('aria-pressed', String(i === index)));
      };
      choices.forEach((choice, index) => choice.addEventListener('click', () => show(index)));
      bar.hidden = false;
      show(0);
    }
    group.querySelectorAll<HTMLElement>('[data-pv-wipe]').forEach(wipe => {
      const range = wipe.querySelector<HTMLInputElement>('input')!;
      const set = (value: number) => {
        const p = Math.max(0, Math.min(100, value));
        range.value = String(p);
        wipe.style.setProperty('--x', p + '%');
        range.setAttribute('aria-valuetext', `왼쪽 ${Math.round(p)}%`);
      };
      set(50);
      range.addEventListener('input', () => set(Number(range.value)));
      let dragging = false;
      const at = (event: PointerEvent) => { const box = wipe.getBoundingClientRect(); set((event.clientX - box.left) / box.width * 100); };
      wipe.addEventListener('pointerdown', event => {
        dragging = true;
        try { wipe.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
        at(event); range.focus({ preventScroll: true }); event.preventDefault();
      });
      wipe.addEventListener('pointermove', event => { if (dragging) at(event); });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) wipe.addEventListener(type, () => { dragging = false; });
    });
    group.querySelectorAll<HTMLElement>('[data-pv-duo]').forEach(duo => {
      const lead = duo.querySelector<HTMLVideoElement>('[data-pv-lead]')!;
      const follow = duo.querySelector<HTMLVideoElement>('[data-pv-follow]')!;
      const play = duo.querySelector<HTMLButtonElement>('[data-pv-play]')!;
      const cuts = Array.from(duo.querySelectorAll<HTMLButtonElement>('[data-pv-seek]'));
      let frame = 0;
      const paint = () => {
        const on = !lead.paused;
        play.textContent = on ? '멈춤' : '재생';
        play.setAttribute('aria-label', on ? '두 영상 멈춤' : '두 영상 함께 재생');
        duo.classList.toggle('is-playing', on);
      };
      const mark = () => {
        const t = lead.currentTime;
        cuts.forEach(cut => cut.setAttribute('aria-current', String(t >= Number(cut.dataset.pvSeek) && t < Number(cut.dataset.pvEnd))));
      };
      const tick = () => {
        frame = 0;
        if (Math.abs(follow.currentTime - lead.currentTime) > 0.05) follow.currentTime = lead.currentTime;
        mark();
        if (!lead.paused) frame = requestAnimationFrame(tick);
      };
      const start = () => {
        document.dispatchEvent(new CustomEvent('portfolio:film-play'));
        follow.currentTime = lead.currentTime;
        for (const video of [lead, follow]) void video.play().catch(() => {});
      };
      const stop = () => { lead.pause(); follow.pause(); };
      play.addEventListener('click', () => { if (lead.paused) start(); else stop(); });
      for (const video of [lead, follow]) video.addEventListener('click', () => { if (lead.paused) start(); else stop(); });
      lead.addEventListener('play', () => { paint(); if (follow.paused) void follow.play().catch(() => {}); if (!frame) frame = requestAnimationFrame(tick); });
      lead.addEventListener('pause', () => { paint(); follow.pause(); mark(); });
      lead.addEventListener('seeked', () => { follow.currentTime = lead.currentTime; mark(); });
      cuts.forEach(cut => cut.addEventListener('click', () => {
        lead.currentTime = Number(cut.dataset.pvSeek) + 0.04;
        follow.currentTime = lead.currentTime;
        mark();
        if (lead.paused) start();
      }));
      new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }, { threshold: 0 }).observe(duo);
      paint();
    });
  });
  root.querySelector('[data-pipeline-tabs]')?.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', panels[index].id);
    tab.parentElement?.setAttribute('role', 'presentation');
  });
  panels.forEach(panel => { panel.setAttribute('role', 'tabpanel'); panel.tabIndex = 0; });
  syncCompact(); compact.addEventListener('change', syncCompact);

  function alignWorkspace() {
    const inset = compact.matches ? 12 : 24;
    const rect = workspace.getBoundingClientRect();
    if (rect.top < inset - 1 || rect.bottom > innerHeight - inset + 1) {
      window.scrollTo({ top: Math.max(0, scrollY + rect.top - inset), behavior: 'instant' });
    }
  }
  function activate(index: number, focus = false, align = false) {
    if (index < 0 || index >= tabs.length) return;
    panels.forEach((panel, i) => {
      const active = i === index;
      if (!active) panel.querySelectorAll<HTMLVideoElement>('video').forEach(video => video.pause());
      panel.hidden = !active;
      if (active && i !== selected && !reduce.matches) panel.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
    });
    tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    selected = index; root.dataset.pipelineSelected = tabs[index].dataset.pipelineTab;
    previous.disabled = index === 0;
    previous.textContent = index ? `← ${tabs[index - 1].querySelector('.pipeline-step-name')!.textContent}` : '← 이전 단계';
    next.textContent = index === tabs.length - 1 ? '완성 장면 보기 ↗' : `${tabs[index + 1].querySelector('.pipeline-step-name')!.textContent} →`;
    status.textContent = `${String(index + 1).padStart(2, '0')} / ${String(tabs.length).padStart(2, '0')}`;
    if (focus || (previous.disabled && document.activeElement === previous)) tabs[index].focus({ preventScroll: true });
    if (align) requestAnimationFrame(alignWorkspace);
  }
  const hashIndex = tabs.findIndex(tab => tab.hash === location.hash);
  activate(hashIndex < 0 ? 0 : hashIndex);
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); activate(index, false, true);
    });
    tab.addEventListener('keydown', event => {
      let target: number | undefined;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target = (selected + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target = (selected - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') target = 0; if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); activate(target, true, true); }
    });
  });
  previous.addEventListener('click', () => activate(selected - 1, false, true));
  next.addEventListener('click', () => {
    if (selected < tabs.length - 1) { activate(selected + 1, false, true); return; }
    const final = document.querySelector<HTMLDetailsElement>(`[data-pipeline-final="${root.dataset.pipelineSlug}"]`);
    if (final) { final.open = true; final.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'instant' : 'smooth' }); final.querySelector<HTMLElement>('summary')?.focus({ preventScroll: true }); }
  });
  // Keep native scrolling inside long material. At its exact boundary, forward
  // only the outward vertical wheel to the page: Chromium may otherwise latch
  // the gesture on a video control or a rounded final pixel of this scrollport.
  panels.forEach(panel => {
    const surface = panel.querySelector<HTMLElement>('.pipeline-surface');
    surface?.addEventListener('wheel', event => {
      if (event.defaultPrevented || !event.cancelable || event.ctrlKey || event.metaKey || document.fullscreenElement ||
          Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input,textarea,select,[contenteditable=true]')) return;
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? surface.clientHeight : 1);
      if (!Number.isFinite(delta)) return;
      // A nested reader keeps its own scroll before the outer material/page.
      let nested = target instanceof HTMLElement ? target : target?.parentElement;
      while (nested && nested !== surface) {
        const style = getComputedStyle(nested);
        if (/auto|scroll/.test(style.overflowY) && nested.scrollHeight > nested.clientHeight + 1 &&
            (delta < 0 ? nested.scrollTop > 1 : nested.scrollHeight - nested.clientHeight - nested.scrollTop > 1)) return;
        nested = nested.parentElement;
      }
      const remaining = delta < 0 ? surface.scrollTop : surface.scrollHeight - surface.clientHeight - surface.scrollTop;
      if (remaining > 1) return;
      event.preventDefault();
      window.scrollBy({ top: delta, behavior: 'instant' });
    }, { passive: false });
  });
  const cap = () => {
    const density = Math.max(1, devicePixelRatio || 1);
    root.querySelectorAll<HTMLImageElement | HTMLVideoElement>('[data-native-cap]').forEach(media => {
      const width = media instanceof HTMLImageElement ? media.naturalWidth : media.videoWidth;
      if (width > 0) media.style.setProperty('--native-cap', width / density + 'px');
    });
  };
  root.querySelectorAll<HTMLImageElement>('img').forEach(image => image.addEventListener('load', cap));
  root.querySelectorAll<HTMLVideoElement>('[data-pipeline-video]').forEach(video => {
    video.addEventListener('loadedmetadata', cap);
    video.addEventListener('play', () => {
      document.dispatchEvent(new CustomEvent('portfolio:film-play'));
      document.querySelectorAll<HTMLVideoElement>('video').forEach(other => { if (other !== video) other.pause(); });
    });
    new IntersectionObserver(entries => { if (!entries[0].isIntersecting) video.pause(); }, { threshold: 0 }).observe(video);
  });
  window.addEventListener('resize', cap); cap();
  document.addEventListener('visibilitychange', () => { if (document.hidden) root.querySelectorAll<HTMLVideoElement>('video').forEach(video => video.pause()); });
  window.addEventListener('hashchange', () => { const index = tabs.findIndex(tab => tab.hash === location.hash); if (index >= 0) activate(index, false, true); });
});
export {};
