/**
 * Actual vanilla-TS port of OriginKit MCP compare-slider, ui/compare-slider.tsx.
 * Captured 2026-10-15 in originkit_compare_slider_source.txt (task research).
 * Preserved: clientX normalization, clamp(0..100), Arrow 2 / Shift+Arrow 10,
 * Home/End and slider ARIA. Portfolio adaptation deliberately replaces cover,
 * touch-action:none and optional followHover with contain, pan-y and drag intent.
 */
const mounted = new Map<HTMLElement, () => void>();
const clamp = (value: number) => Math.max(0, Math.min(100, value));

type Gesture = { id: number; x: number; y: number; dragging: boolean };

function mount(root: HTMLElement): () => void {
  const control = root.querySelector<HTMLElement>('[data-compare-control]');
  if (!control) return () => {};
  const controller = new AbortController();
  const signal = controller.signal;
  const before = root.dataset.beforeLabel || '콘티';
  const after = root.dataset.afterLabel || '완성 화면';
  const supplied = Number(root.dataset.compareStart ?? 50);
  let position = Number.isFinite(supplied) ? clamp(supplied) : 50;
  let gesture: Gesture | null = null;

  const setPosition = (value: number) => {
    position = clamp(value);
    root.style.setProperty('--compare-pos', position + '%');
    control.setAttribute('aria-valuenow', String(Math.round(position)));
    control.setAttribute('aria-valuetext', `${before} ${Math.round(position)}%, ${after} ${100 - Math.round(position)}%`);
  };
  // OriginKit setFromClientX: normalize against the host, then clamp 0..100.
  const setFromClientX = (clientX: number) => {
    const rect = control.getBoundingClientRect();
    if (rect.width) setPosition(((clientX - rect.left) / rect.width) * 100);
  };
  const release = () => {
    const current = gesture;
    gesture = null;
    delete root.dataset.compareDragging;
    if (current && control.hasPointerCapture(current.id)) control.releasePointerCapture(current.id);
  };
  const beginDrag = (event: PointerEvent) => {
    if (!gesture) return;
    gesture.dragging = true;
    root.dataset.compareDragging = 'true';
    control.setPointerCapture(event.pointerId);
    control.focus({ preventScroll: true });
    setFromClientX(event.clientX);
  };
  const onDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    // Mouse clicks retain OriginKit's direct positioning. Touch/pen wait for intent.
    if (event.pointerType === 'mouse') beginDrag(event);
  };
  const onMove = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return; // No hover-follow.
    if (!gesture.dragging) {
      const dx = Math.abs(event.clientX - gesture.x);
      const dy = Math.abs(event.clientY - gesture.y);
      if (dy > 6 && dy >= dx) { release(); return; } // Native vertical scroll wins.
      if (dx < 6 || dx <= dy) return;
      beginDrag(event);
    }
    if (event.cancelable) event.preventDefault(); // Only after horizontal drag begins.
    setFromClientX(event.clientX);
  };
  const onUp = (event: PointerEvent) => {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (!gesture.dragging && Math.abs(event.clientX - gesture.x) <= 6 && Math.abs(event.clientY - gesture.y) <= 6) {
      control.focus({ preventScroll: true });
      setFromClientX(event.clientX);
    }
    release();
  };
  const onCancel = (event: PointerEvent) => { if (gesture?.id === event.pointerId) release(); };
  const onKey = (event: KeyboardEvent) => {
    const step = event.shiftKey ? 10 : 2; // OriginKit's original keyboard increments.
    let next: number;
    if (event.key === 'ArrowLeft') next = position - step;
    else if (event.key === 'ArrowRight') next = position + step;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = 100;
    else return; // Escape, Up/Down and other page keys remain native.
    event.preventDefault();
    event.stopPropagation();
    release();
    setPosition(next);
  };

  control.setAttribute('role', 'slider');
  control.tabIndex = 0;
  control.setAttribute('aria-label', root.dataset.compareLabel || '콘티와 완성 화면 비교');
  control.setAttribute('aria-orientation', 'horizontal');
  control.setAttribute('aria-valuemin', '0');
  control.setAttribute('aria-valuemax', '100');
  const describedBy = control.dataset.compareDescription;
  if (describedBy) control.setAttribute('aria-describedby', describedBy);
  setPosition(position);
  control.addEventListener('pointerdown', onDown, { signal });
  control.addEventListener('pointermove', onMove, { signal, passive: false });
  control.addEventListener('pointerup', onUp, { signal });
  control.addEventListener('pointercancel', onCancel, { signal });
  control.addEventListener('lostpointercapture', onCancel, { signal });
  control.addEventListener('keydown', onKey, { signal });
  window.addEventListener('blur', release, { signal });
  window.addEventListener('pagehide', release, { signal });
  root.querySelectorAll<HTMLElement>('[data-compare-decoration], [data-compare-key], [data-compare-help]').forEach((node) => { node.hidden = false; });
  root.dataset.compareReady = 'true';
  root.querySelectorAll<HTMLElement>('[data-compare-fallback-help]').forEach((node) => { node.hidden = true; });

  return () => {
    release();
    controller.abort();
    mounted.delete(root);
    delete root.dataset.compareReady;
    root.querySelectorAll<HTMLElement>('[data-compare-fallback-help]').forEach((node) => { node.hidden = false; });
    control.removeAttribute('role');
    control.removeAttribute('tabindex');
    for (const name of ['aria-label', 'aria-orientation', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext', 'aria-describedby']) control.removeAttribute(name);
    root.querySelectorAll<HTMLElement>('[data-compare-decoration], [data-compare-key], [data-compare-help]').forEach((node) => { node.hidden = true; });
  };
}

export function initOriginKitComparisons(scope: ParentNode = document): () => void {
  const cleanups: (() => void)[] = [];
  scope.querySelectorAll<HTMLElement>('[data-origin-compare]').forEach((root) => {
    if (mounted.has(root)) return;
    const cleanup = mount(root);
    mounted.set(root, cleanup);
    cleanups.push(cleanup);
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}

const initialize = () => { initOriginKitComparisons(); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
else initialize();
document.addEventListener('astro:page-load', initialize);
document.addEventListener('astro:before-swap', () => { [...mounted.values()].forEach((cleanup) => cleanup()); });
