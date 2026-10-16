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
    root.querySelectorAll<HTMLDetailsElement>('[data-pipeline-compact-details="timeline"]').forEach(details => { details.open = !compact.matches; });
  }
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
