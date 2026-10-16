const root = document.querySelector<HTMLElement>('.scripts-app');
if (root) {
  const entries = Array.from(root.querySelectorAll<HTMLElement>('[data-script-entry]'));
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-script-select]'));
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-script-tab]'));
  const dialog = document.querySelector<HTMLDialogElement>('[data-script-dialog]')!;
  const dialogBody = dialog.querySelector<HTMLElement>('[data-script-dialog-body]')!;
  const readerTitle = dialog.querySelector<HTMLElement>('#scripts-reader-title')!;
  const mobile = window.matchMedia('(max-width: 1100px)');
  const previousScrollRestoration = history.scrollRestoration;
  history.scrollRestoration = 'manual';
  let current = 0;
  let panel: 'intro' | 'scene' = 'intro';
  let opener: HTMLElement | null = null;

  function syncPanels() {
    const entry = entries[current];
    tabs.forEach(tab => {
      const selected = tab.dataset.scriptTab === panel;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.setAttribute('aria-controls', `${tab.dataset.scriptTab}-${entry.id}`);
    });
    entries.forEach(item => item.querySelectorAll<HTMLElement>('[data-script-panel]').forEach(page => {
      const selected = page.dataset.scriptPanel === panel;
      page.classList.toggle('is-mobile-active', selected);
      page.inert = mobile.matches && !selected;
      if (mobile.matches) {
        page.setAttribute('role', 'tabpanel');
        page.setAttribute('aria-labelledby', `scripts-${page.dataset.scriptPanel}-tab`);
      } else {
        page.removeAttribute('role');
        page.removeAttribute('aria-labelledby');
      }
    }));
  }

  function render() {
    const entry = entries[current];
    entries.forEach(item => { item.hidden = item !== entry; });
    links.forEach(link => {
      if (link.dataset.scriptSelect === entry.id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
    const title = entry.querySelector<HTMLElement>('.script-title')!.textContent!;
    root!.querySelector('[data-script-selected-title]')!.textContent = title;
    root!.querySelector('[data-script-index-label]')!.textContent = String(current + 1).padStart(2, '0');
    root!.querySelectorAll<HTMLAnchorElement>('[data-scripts-return]').forEach(link => {
      link.href = `/?work=scripts&item=${encodeURIComponent(entry.id)}`;
    });
    const skip = document.querySelector<HTMLAnchorElement>('.scripts-skip')!;
    skip.href = `#${entry.id}`;
    document.title = `${title} · 대본 · 김영건`;
    syncPanels();
  }

  function fromLocation() {
    const { scrollX, scrollY } = window;
    const found = entries.findIndex(entry => `#${entry.id}` === location.hash);
    current = Math.max(0, found);
    if (dialog.open) dialog.close();
    render();
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
  }

  function choose(index: number, focusEntry = false) {
    const { scrollX, scrollY } = window;
    const next = (index + entries.length) % entries.length;
    if (next !== current || location.hash !== `#${entries[next].id}`) history.pushState(null, '', `#${entries[next].id}`);
    current = next;
    render();
    if (focusEntry) entries[current].focus({ preventScroll: true });
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
  }

  links.forEach((link, index) => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    choose(index, event.detail === 0);
  }));
  root.querySelectorAll<HTMLButtonElement>('[data-scripts-step]').forEach(button => button.addEventListener('click', () => choose(current + Number(button.dataset.scriptsStep))));

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => { panel = tab.dataset.scriptTab as typeof panel; syncPanels(); });
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].click();
      tabs[next].focus();
    });
  });

  root.querySelectorAll<HTMLElement>('[data-script-more]').forEach(summary => summary.addEventListener('click', event => {
    event.preventDefault();
    const entry = summary.closest<HTMLElement>('[data-script-entry]')!;
    opener = summary;
    readerTitle.textContent = `${entry.querySelector('.script-title')!.textContent} · ${entry.querySelector('.script-excerpt-label')!.textContent}`;
    const content = entry.querySelector<HTMLElement>('[data-script-full]')!;
    dialogBody.replaceChildren(...Array.from(content.childNodes).map(node => node.cloneNode(true)));
    document.documentElement.classList.add('scripts-reading');
    dialog.showModal();
    dialog.scrollTop = 0;
  }));
  dialog.querySelector('[data-script-close]')!.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('scripts-reading');
    if (opener && !opener.closest('[hidden]')) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  document.addEventListener('keydown', event => {
    if (dialog.open || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, summary, input, textarea, select, [contenteditable], [role="tablist"]')) return;
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    choose(current + (event.key === 'ArrowRight' ? 1 : -1), target.closest('[data-script-entry]') !== null);
  });
  window.addEventListener('popstate', fromLocation);
  window.addEventListener('hashchange', fromLocation);
  window.addEventListener('pagehide', () => { history.scrollRestoration = previousScrollRestoration; });
  window.addEventListener('pageshow', () => { history.scrollRestoration = 'manual'; });
  mobile.addEventListener('change', syncPanels);
  fromLocation();
  document.documentElement.classList.add('scripts-enhanced');
}
