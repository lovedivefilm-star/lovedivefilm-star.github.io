/*
 * DomeGallery — React Bits (https://reactbits.dev/components/dome-gallery · 레지스트리 DomeGallery-TS-CSS, 2026-10-14 받음)
 * Copyright (c) 2026 David Haz — MIT + Commons Clause License Condition v1.0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
 * documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, and distribute the Software as part of an application, website, or
 * product, subject to the following conditions: The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 * Commons Clause Restriction: You may use this Software, including for any commercial purpose, so long as you do not
 * sell, sublicense, or redistribute the components themselves-whether alone, in a bundle, or as a ported version.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND. (전문: docs/sources.md 「v4 오픈소스」)
 *
 * 우리 손질(docs/v4-redesign.md 1절 — 원본과 다른 곳은 「v4:」 주석):
 *  · 기본 이미지(외부 주소) 삭제 · 항목에 작품(slug) 표식
 *  · 클릭 = 확대 대신 onItemClick(작품 방으로 이동) — 확대 코드는 onItemClick 이 없을 때만 쓰인다
 *  · 가운데 읽음: 화면 정면에 가장 가까운 타일을 onCenterChange 로 알린다(Kavieng 2-3)
 *  · 휠: Kavieng 2-3 「휠 deltaY × .74, 1 − e^(−21·dt) 로 따라감」 을 가로 회전으로
 *  · 타일은 탭 순서에서 뺀다(키보드는 벽 오른쪽 아래 작품 목록으로 — Kavieng 숨은 select 의 역할)
 */
'use client';

import { useEffect, useMemo, useRef, useCallback } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, CSSProperties, MutableRefObject } from 'react';
import { useGesture } from '@use-gesture/react';
import './DomeGallery.css';

// v4: 작품 표식(slug)과 순번(k)을 함께 받는다
export type ImageItem = string | { src: string; alt?: string; slug?: string; k?: number; avif?: string; webp?: string };

export type DomeApi = {
  getRotation: () => { x: number; y: number };
  setRotation: (x: number, y: number) => void;
  /** 휠 · 키처럼 목표값으로 부드럽게(Kavieng τ 47.6ms) */
  nudge: (dyDeg: number, dxDeg?: number) => void;
};

type DomeGalleryProps = {
  images?: ImageItem[];
  fit?: number;
  fitBasis?: 'auto' | 'min' | 'max' | 'width' | 'height';
  minRadius?: number;
  maxRadius?: number;
  padFactor?: number;
  overlayBlurColor?: string;
  maxVerticalRotationDeg?: number;
  dragSensitivity?: number;
  enlargeTransitionMs?: number;
  segments?: number;
  dragDampening?: number;
  openedImageWidth?: string;
  openedImageHeight?: string;
  imageBorderRadius?: string;
  openedImageBorderRadius?: string;
  grayscale?: boolean;
  /* v4 */
  onItemClick?: (item: ItemDef, imageEl: HTMLElement) => void;
  onCenterChange?: (item: ItemDef) => void;
  apiRef?: MutableRefObject<DomeApi | null>;
  rootRef?: MutableRefObject<HTMLDivElement | null>;
  /** 휠 1 = 이만큼 드래그한 것과 같다(Kavieng .74) */
  wheelFactor?: number;
  /** v4: 세로 분할 수(없으면 segments) — 가로보다 크게 주면 타일이 가로로 길어진다(Kavieng 1 : .61) */
  segmentsY?: number;
  /** v4: 열마다 행 수(원본 5) */
  rows?: number;
  /** v4: 영상 칸 — 작품마다 정면에 가장 가까운 칸 하나를 이 클립으로(음소거 · 반복 · 보일 때만 재생) */
  videos?: { slug: string; src: string; poster: string }[];
  /** v4: 영상 재생 허용(인트로가 끝난 뒤) — 그 전엔 preload="none" */
  videoActive?: boolean;
};

export type ItemDef = {
  src: string;
  alt: string;
  slug: string;
  k: number;
  avif: string;
  webp: string;
  x: number;
  y: number;
  sizeX: number;
  sizeY: number;
};

const DEFAULTS = {
  maxVerticalRotationDeg: 5,
  dragSensitivity: 20,
  enlargeTransitionMs: 300,
  segments: 35
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const normalizeAngle = (d: number) => ((d % 360) + 360) % 360;
const wrapAngleSigned = (deg: number) => {
  const a = (((deg + 180) % 360) + 360) % 360;
  return a - 180;
};
const getDataNumber = (el: HTMLElement, name: string, fallback: number) => {
  const attr = el.dataset[name] ?? el.getAttribute(`data-${name}`);
  const n = attr == null ? NaN : parseFloat(attr);
  return Number.isFinite(n) ? n : fallback;
};

function buildItems(pool: ImageItem[], seg: number, rows = 5): ItemDef[] {
  const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
  // v4: 행 수를 받는다(원본 5 = [-4..4] / [-3..5])
  const half = Math.floor(rows / 2);
  const evenYs = Array.from({ length: rows }, (_, i) => (i - half) * 2);
  const oddYs = evenYs.map((y) => y + 1);

  const coords = xCols.flatMap((x, c) => {
    const ys = c % 2 === 0 ? evenYs : oddYs;
    return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
  });

  const totalSlots = coords.length;
  if (pool.length === 0) {
    return coords.map(c => ({ ...c, src: '', alt: '', slug: '', k: 0, avif: '', webp: '' }));
  }

  const normalizedImages = pool.map(image => {
    if (typeof image === 'string') {
      return { src: image, alt: '', slug: '', k: 0, avif: '', webp: '' };
    }
    return { src: image.src || '', alt: image.alt || '', slug: image.slug || '', k: image.k ?? 0, avif: image.avif || '', webp: image.webp || '' };
  });

  const usedImages = Array.from({ length: totalSlots }, (_, i) => normalizedImages[i % normalizedImages.length]);

  for (let i = 1; i < usedImages.length; i++) {
    if (usedImages[i].src === usedImages[i - 1].src) {
      for (let j = i + 1; j < usedImages.length; j++) {
        if (usedImages[j].src !== usedImages[i].src) {
          const tmp = usedImages[i];
          usedImages[i] = usedImages[j];
          usedImages[j] = tmp;
          break;
        }
      }
    }
  }

  return coords.map((c, i) => ({
    ...c,
    src: usedImages[i].src,
    alt: usedImages[i].alt,
    slug: usedImages[i].slug,
    k: usedImages[i].k,
    avif: usedImages[i].avif,
    webp: usedImages[i].webp
  }));
}

function computeItemBaseRotation(offsetX: number, offsetY: number, sizeX: number, sizeY: number, segments: number) {
  const unit = 360 / segments / 2;
  const rotateY = unit * (offsetX + (sizeX - 1) / 2);
  const rotateX = unit * (offsetY - (sizeY - 1) / 2);
  return { rotateX, rotateY };
}

export default function DomeGallery({
  images = [],
  fit = 0.5,
  fitBasis = 'auto',
  minRadius = 600,
  maxRadius = Infinity,
  padFactor = 0.25,
  overlayBlurColor = '#120F17',
  maxVerticalRotationDeg = DEFAULTS.maxVerticalRotationDeg,
  dragSensitivity = DEFAULTS.dragSensitivity,
  enlargeTransitionMs = DEFAULTS.enlargeTransitionMs,
  segments = DEFAULTS.segments,
  dragDampening = 2,
  openedImageWidth = '400px',
  openedImageHeight = '400px',
  imageBorderRadius = '30px',
  openedImageBorderRadius = '30px',
  grayscale = true,
  onItemClick,
  onCenterChange,
  apiRef,
  rootRef: rootRefOut,
  wheelFactor = 0.74,
  segmentsY,
  rows = 5,
  videos = [],
  videoActive = false
}: DomeGalleryProps) {
  const segY = segmentsY ?? segments;
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sphereRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const focusedElRef = useRef<HTMLElement | null>(null);
  const originalTilePositionRef = useRef<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const rotationRef = useRef({ x: 0, y: 0 });
  const startRotRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const inertiaRAF = useRef<number | null>(null);

  const openingRef = useRef(false);
  const openStartedAtRef = useRef(0);
  const lastDragEndAt = useRef(0);

  const scrollLockedRef = useRef(false);
  const lockScroll = useCallback(() => {
    if (scrollLockedRef.current) return;
    scrollLockedRef.current = true;
    document.body.classList.add('dg-scroll-lock');
  }, []);
  const unlockScroll = useCallback(() => {
    if (!scrollLockedRef.current) return;
    if (rootRef.current?.getAttribute('data-enlarging') === 'true') return;
    scrollLockedRef.current = false;
    document.body.classList.remove('dg-scroll-lock');
  }, []);

  const items = useMemo(() => buildItems(images, segments, rows), [images, segments, rows]);

  // v4: 영상 칸 고르기 — 작품마다 정면(회전 0)에 가까운 칸, 서로 이웃하지 않게
  const videoAt = useMemo(() => {
    const m = new Map<number, { slug: string; src: string; poster: string }>();
    const near = (a: number, b: number) => [1, rows - 1, rows, rows + 1].includes(Math.abs(a - b));
    for (const v of videos) {
      let best = -1;
      let bestD = Infinity;
      items.forEach((it, i) => {
        if (it.slug !== v.slug || m.has(i) || [...m.keys()].some((j) => near(i, j))) return;
        const r = computeItemBaseRotation(it.x, it.y, it.sizeX, it.sizeY, segments);
        const d = Math.abs(wrapAngleSigned(r.rotateY)) + 1.6 * Math.abs(r.rotateX);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0) m.set(best, v);
    }
    return m;
  }, [items, videos, rows, segments]);
  const videoEls = useRef(new Map<number, HTMLVideoElement>());
  const activeRef = useRef(videoActive);
  activeRef.current = videoActive;
  const syncVideos = () => {
    const { x, y } = rotationRef.current;
    videoEls.current.forEach((el, i) => {
      const it = items[i];
      if (!it) return;
      const r = computeItemBaseRotation(it.x, it.y, it.sizeX, it.sizeY, segments);
      const dy = Math.abs(wrapAngleSigned(r.rotateY + y));
      const dx = Math.abs((r.rotateX * segments) / segY + x);
      const show = activeRef.current && dy < 64 && dx < 30;
      if (show) {
        if (el.preload !== 'auto') el.preload = 'auto';
        el.muted = true;
        if (el.paused) el.play().catch(() => {});
      } else if (!el.paused) el.pause();
    });
  };
  useEffect(() => {
    syncVideos();
  }, [videoActive]);

  // v4: 가운데 읽음 — 정면에 가장 가까운 타일
  const centerIdxRef = useRef(-1);
  const centerRAF = useRef<number | null>(null);
  const reportCenter = () => {
    if (centerRAF.current) return;
    centerRAF.current = requestAnimationFrame(() => {
      centerRAF.current = null;
      syncVideos();
      if (!onCenterChange) return;
      const { x, y } = rotationRef.current;
      let best = -1;
      let bestD = Infinity;
      items.forEach((it, i) => {
        if (!it.src) return;
        const r = computeItemBaseRotation(it.x, it.y, it.sizeX, it.sizeY, segments);
        const dy = wrapAngleSigned(r.rotateY + y);
        const dx = (r.rotateX * segments) / segY + x;
        const d = dy * dy + dx * dx;
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      if (best >= 0 && best !== centerIdxRef.current) {
        centerIdxRef.current = best;
        onCenterChange(items[best]);
      }
    });
  };

  const applyTransform = (xDeg: number, yDeg: number) => {
    const el = sphereRef.current;
    if (el) {
      el.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
    }
    reportCenter();
  };

  const lockedRadiusRef = useRef<number | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(entries => {
      const cr = entries[0].contentRect;
      const w = Math.max(1, cr.width),
        h = Math.max(1, cr.height);
      const minDim = Math.min(w, h),
        maxDim = Math.max(w, h),
        aspect = w / h;
      let basis: number;
      switch (fitBasis) {
        case 'min':
          basis = minDim;
          break;
        case 'max':
          basis = maxDim;
          break;
        case 'width':
          basis = w;
          break;
        case 'height':
          basis = h;
          break;
        default:
          basis = aspect >= 1.3 ? w : minDim;
      }
      let radius = basis * fit;
      const heightGuard = h * 1.35;
      radius = Math.min(radius, heightGuard);
      radius = clamp(radius, minRadius, maxRadius);
      lockedRadiusRef.current = Math.round(radius);

      const viewerPad = Math.max(8, Math.round(minDim * padFactor));
      root.style.setProperty('--radius', `${lockedRadiusRef.current}px`);
      root.style.setProperty('--viewer-pad', `${viewerPad}px`);
      root.style.setProperty('--overlay-blur-color', overlayBlurColor);
      root.style.setProperty('--tile-radius', imageBorderRadius);
      root.style.setProperty('--enlarge-radius', openedImageBorderRadius);
      // v4: 흑백 기본값은 Kavieng 값(DomeGallery.css 의 --image-filter-gray)
      root.style.setProperty('--image-filter', grayscale ? 'var(--image-filter-gray)' : 'none');
      applyTransform(rotationRef.current.x, rotationRef.current.y);

      const enlargedOverlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement;
      if (enlargedOverlay && frameRef.current && mainRef.current) {
        const frameR = frameRef.current.getBoundingClientRect();
        const mainR = mainRef.current.getBoundingClientRect();

        const hasCustomSize = openedImageWidth && openedImageHeight;
        if (hasCustomSize) {
          const tempDiv = document.createElement('div');
          tempDiv.style.cssText = `position: absolute; width: ${openedImageWidth}; height: ${openedImageHeight}; visibility: hidden;`;
          document.body.appendChild(tempDiv);
          const tempRect = tempDiv.getBoundingClientRect();
          document.body.removeChild(tempDiv);

          const centeredLeft = frameR.left - mainR.left + (frameR.width - tempRect.width) / 2;
          const centeredTop = frameR.top - mainR.top + (frameR.height - tempRect.height) / 2;

          enlargedOverlay.style.left = `${centeredLeft}px`;
          enlargedOverlay.style.top = `${centeredTop}px`;
        } else {
          enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
          enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
          enlargedOverlay.style.width = `${frameR.width}px`;
          enlargedOverlay.style.height = `${frameR.height}px`;
        }
      }
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [
    fit,
    fitBasis,
    minRadius,
    maxRadius,
    padFactor,
    overlayBlurColor,
    grayscale,
    imageBorderRadius,
    openedImageBorderRadius,
    openedImageWidth,
    openedImageHeight
  ]);

  useEffect(() => {
    applyTransform(rotationRef.current.x, rotationRef.current.y);
  }, []);

  const stopInertia = useCallback(() => {
    if (inertiaRAF.current) {
      cancelAnimationFrame(inertiaRAF.current);
      inertiaRAF.current = null;
    }
  }, []);

  const startInertia = useCallback(
    (vx: number, vy: number) => {
      const MAX_V = 1.4;
      let vX = clamp(vx, -MAX_V, MAX_V) * 80;
      let vY = clamp(vy, -MAX_V, MAX_V) * 80;

      let frames = 0;
      const d = clamp(dragDampening ?? 0.6, 0, 1);
      const frictionMul = 0.94 + 0.055 * d;
      const stopThreshold = 0.015 - 0.01 * d;
      const maxFrames = Math.round(90 + 270 * d);

      const step = () => {
        vX *= frictionMul;
        vY *= frictionMul;
        if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
          inertiaRAF.current = null;
          return;
        }
        if (++frames > maxFrames) {
          inertiaRAF.current = null;
          return;
        }
        const nextX = clamp(rotationRef.current.x - vY / 200, -maxVerticalRotationDeg, maxVerticalRotationDeg);
        const nextY = wrapAngleSigned(rotationRef.current.y + vX / 200);
        rotationRef.current = { x: nextX, y: nextY };
        targetRef.current = { x: nextX, y: nextY };
        applyTransform(nextX, nextY);
        inertiaRAF.current = requestAnimationFrame(step);
      };
      stopInertia();
      inertiaRAF.current = requestAnimationFrame(step);
    },
    [dragDampening, maxVerticalRotationDeg, stopInertia]
  );

  // v4: 휠 · 키 — 목표값을 지수로 따라간다(Kavieng 2-3: 1 − e^(−21·dt), dt 상한 50ms). 닿으면 멈춘다.
  const targetRef = useRef({ x: 0, y: 0 });
  const followRAF = useRef<number | null>(null);
  const follow = useCallback(() => {
    if (followRAF.current) return;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const a = 1 - Math.exp(-21 * dt);
      const cur = rotationRef.current;
      const t = targetRef.current;
      const nx = cur.x + (t.x - cur.x) * a;
      const ny = cur.y + (t.y - cur.y) * a;
      const done = Math.abs(t.x - nx) < 0.01 && Math.abs(t.y - ny) < 0.01;
      rotationRef.current = done ? { ...t } : { x: nx, y: ny };
      applyTransform(rotationRef.current.x, rotationRef.current.y);
      followRAF.current = done ? null : requestAnimationFrame(step);
    };
    followRAF.current = requestAnimationFrame(step);
  }, []);
  const nudge = useCallback(
    (dyDeg: number, dxDeg = 0) => {
      if (focusedElRef.current) return;
      stopInertia();
      const t = targetRef.current;
      targetRef.current = { x: clamp(t.x + dxDeg, -maxVerticalRotationDeg, maxVerticalRotationDeg), y: t.y + dyDeg };
      follow();
    },
    [follow, maxVerticalRotationDeg, stopInertia]
  );

  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const onWheel = (e: WheelEvent) => {
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      const dy = e.deltaY * unit;
      if (!dy) return;
      e.preventDefault();
      nudge(-(dy * wheelFactor) / dragSensitivity);
    };
    main.addEventListener('wheel', onWheel, { passive: false });
    return () => main.removeEventListener('wheel', onWheel);
  }, [nudge, wheelFactor, dragSensitivity]);

  useEffect(() => {
    if (apiRef) {
      apiRef.current = {
        getRotation: () => ({ ...rotationRef.current }),
        setRotation: (x: number, y: number) => {
          rotationRef.current = { x, y };
          targetRef.current = { x, y };
          applyTransform(x, y);
        },
        nudge
      };
    }
    if (rootRefOut) rootRefOut.current = rootRef.current;
  });

  useEffect(
    () => () => {
      if (followRAF.current) cancelAnimationFrame(followRAF.current);
      if (centerRAF.current) cancelAnimationFrame(centerRAF.current);
    },
    []
  );

  useGesture(
    {
      onDragStart: ({ event }) => {
        if (focusedElRef.current) return;
        stopInertia();
        if (followRAF.current) {
          cancelAnimationFrame(followRAF.current);
          followRAF.current = null;
        }
        const evt = event as PointerEvent;
        draggingRef.current = true;
        movedRef.current = false;
        startRotRef.current = { ...rotationRef.current };
        startPosRef.current = { x: evt.clientX, y: evt.clientY };
      },
      onDrag: ({ event, last, velocity = [0, 0], direction = [0, 0], movement }) => {
        if (focusedElRef.current || !draggingRef.current || !startPosRef.current) return;

        const evt = event as PointerEvent;
        const dxTotal = evt.clientX - startPosRef.current.x;
        const dyTotal = evt.clientY - startPosRef.current.y;

        if (!movedRef.current) {
          const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
          if (dist2 > 16) movedRef.current = true;
        }

        const nextX = clamp(
          startRotRef.current.x - dyTotal / dragSensitivity,
          -maxVerticalRotationDeg,
          maxVerticalRotationDeg
        );
        const nextY = wrapAngleSigned(startRotRef.current.y + dxTotal / dragSensitivity);

        if (rotationRef.current.x !== nextX || rotationRef.current.y !== nextY) {
          rotationRef.current = { x: nextX, y: nextY };
          targetRef.current = { x: nextX, y: nextY };
          applyTransform(nextX, nextY);
        }

        if (last) {
          draggingRef.current = false;

          let [vMagX, vMagY] = velocity;
          const [dirX, dirY] = direction;
          let vx = vMagX * dirX;
          let vy = vMagY * dirY;

          if (Math.abs(vx) < 0.001 && Math.abs(vy) < 0.001 && Array.isArray(movement)) {
            const [mx, my] = movement;
            vx = clamp((mx / dragSensitivity) * 0.02, -1.2, 1.2);
            vy = clamp((my / dragSensitivity) * 0.02, -1.2, 1.2);
          }

          if (Math.abs(vx) > 0.005 || Math.abs(vy) > 0.005) {
            startInertia(vx, vy);
          }

          if (movedRef.current) lastDragEndAt.current = performance.now();

          movedRef.current = false;
        }
      }
    },
    { target: mainRef, eventOptions: { passive: true } }
  );

  const openItemFromElement = (el: HTMLElement) => {
    if (openingRef.current) return;
    // v4: 확대 대신 작품 방으로
    if (onItemClick) {
      const idx = Number((el.parentElement as HTMLElement).dataset.idx);
      const it = items[idx];
      if (it) onItemClick(it, el);
      return;
    }
    openingRef.current = true;
    openStartedAtRef.current = performance.now();
    lockScroll();

    const parent = el.parentElement as HTMLElement;
    focusedElRef.current = el;
    el.setAttribute('data-focused', 'true');

    const offsetX = getDataNumber(parent, 'offsetX', 0);
    const offsetY = getDataNumber(parent, 'offsetY', 0);
    const sizeX = getDataNumber(parent, 'sizeX', 2);
    const sizeY = getDataNumber(parent, 'sizeY', 2);

    const parentRot = computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments);
    const parentY = normalizeAngle(parentRot.rotateY);
    const globalY = normalizeAngle(rotationRef.current.y);
    let rotY = -(parentY + globalY) % 360;
    if (rotY < -180) rotY += 360;
    const rotX = -parentRot.rotateX - rotationRef.current.x;
    parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
    parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

    const refDiv = document.createElement('div');
    refDiv.className = 'item__image item__image--reference';
    refDiv.style.opacity = '0';
    refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
    parent.appendChild(refDiv);

    void refDiv.offsetHeight;

    const tileR = refDiv.getBoundingClientRect();
    const mainR = mainRef.current?.getBoundingClientRect();
    const frameR = frameRef.current?.getBoundingClientRect();

    if (!mainR || !frameR || tileR.width <= 0 || tileR.height <= 0) {
      openingRef.current = false;
      focusedElRef.current = null;
      parent.removeChild(refDiv);
      unlockScroll();
      return;
    }

    originalTilePositionRef.current = {
      left: tileR.left,
      top: tileR.top,
      width: tileR.width,
      height: tileR.height
    };

    el.style.visibility = 'hidden';
    (el.style as any).zIndex = 0;

    const overlay = document.createElement('div');
    overlay.className = 'enlarge';
    overlay.style.position = 'absolute';
    overlay.style.left = frameR.left - mainR.left + 'px';
    overlay.style.top = frameR.top - mainR.top + 'px';
    overlay.style.width = frameR.width + 'px';
    overlay.style.height = frameR.height + 'px';
    overlay.style.opacity = '0';
    overlay.style.zIndex = '30';
    overlay.style.willChange = 'transform, opacity';
    overlay.style.transformOrigin = 'top left';
    overlay.style.transition = `transform ${enlargeTransitionMs}ms ease, opacity ${enlargeTransitionMs}ms ease`;

    const rawSrc = parent.dataset.src || (el.querySelector('img') as HTMLImageElement)?.src || '';
    const img = document.createElement('img');
    img.src = rawSrc;
    overlay.appendChild(img);
    viewerRef.current!.appendChild(overlay);

    const tx0 = tileR.left - frameR.left;
    const ty0 = tileR.top - frameR.top;
    const sx0 = tileR.width / frameR.width;
    const sy0 = tileR.height / frameR.height;

    const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
    const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

    overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

    setTimeout(() => {
      if (!overlay.parentElement) return;
      overlay.style.opacity = '1';
      overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
      rootRef.current?.setAttribute('data-enlarging', 'true');
    }, 16);

    const wantsResize = openedImageWidth || openedImageHeight;
    if (wantsResize) {
      const onFirstEnd = (ev: TransitionEvent) => {
        if (ev.propertyName !== 'transform') return;
        overlay.removeEventListener('transitionend', onFirstEnd);
        const prevTransition = overlay.style.transition;
        overlay.style.transition = 'none';
        const tempWidth = openedImageWidth || `${frameR.width}px`;
        const tempHeight = openedImageHeight || `${frameR.height}px`;
        overlay.style.width = tempWidth;
        overlay.style.height = tempHeight;
        const newRect = overlay.getBoundingClientRect();
        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';
        void overlay.offsetWidth;
        overlay.style.transition = `left ${enlargeTransitionMs}ms ease, top ${enlargeTransitionMs}ms ease, width ${enlargeTransitionMs}ms ease, height ${enlargeTransitionMs}ms ease`;
        const centeredLeft = frameR.left - mainR.left + (frameR.width - newRect.width) / 2;
        const centeredTop = frameR.top - mainR.top + (frameR.height - newRect.height) / 2;
        requestAnimationFrame(() => {
          overlay.style.left = `${centeredLeft}px`;
          overlay.style.top = `${centeredTop}px`;
          overlay.style.width = tempWidth;
          overlay.style.height = tempHeight;
        });
        const cleanupSecond = () => {
          overlay.removeEventListener('transitionend', cleanupSecond);
          overlay.style.transition = prevTransition;
        };
        overlay.addEventListener('transitionend', cleanupSecond, {
          once: true
        });
      };
      overlay.addEventListener('transitionend', onFirstEnd);
    }
  };

  const onTileClick = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      if (draggingRef.current) return;
      if (movedRef.current) return;
      if (performance.now() - lastDragEndAt.current < 80) return;
      if (openingRef.current) return;
      openItemFromElement(e.currentTarget);
    },
    [openItemFromElement]
  );

  const onTilePointerUp = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      if (e.pointerType !== 'touch') return;
      if (draggingRef.current) return;
      if (movedRef.current) return;
      if (performance.now() - lastDragEndAt.current < 80) return;
      if (openingRef.current) return;
      openItemFromElement(e.currentTarget);
    },
    [openItemFromElement]
  );

  useEffect(() => {
    const scrim = scrimRef.current;
    if (!scrim) return;

    const close = () => {
      if (performance.now() - openStartedAtRef.current < 250) return;

      const el = focusedElRef.current;
      if (!el) return;
      const parent = el.parentElement as HTMLElement;
      const overlay = viewerRef.current?.querySelector('.enlarge') as HTMLElement | null;
      if (!overlay) return;

      const refDiv = parent.querySelector('.item__image--reference') as HTMLElement | null;

      const originalPos = originalTilePositionRef.current;
      if (!originalPos) {
        overlay.remove();
        if (refDiv) refDiv.remove();
        parent.style.setProperty('--rot-y-delta', `0deg`);
        parent.style.setProperty('--rot-x-delta', `0deg`);
        el.style.visibility = '';
        (el.style as any).zIndex = 0;
        focusedElRef.current = null;
        rootRef.current?.removeAttribute('data-enlarging');
        openingRef.current = false;
        unlockScroll();
        return;
      }

      const currentRect = overlay.getBoundingClientRect();
      const rootRect = rootRef.current!.getBoundingClientRect();

      const originalPosRelativeToRoot = {
        left: originalPos.left - rootRect.left,
        top: originalPos.top - rootRect.top,
        width: originalPos.width,
        height: originalPos.height
      };

      const overlayRelativeToRoot = {
        left: currentRect.left - rootRect.left,
        top: currentRect.top - rootRect.top,
        width: currentRect.width,
        height: currentRect.height
      };

      const animatingOverlay = document.createElement('div');
      animatingOverlay.className = 'enlarge-closing';
      animatingOverlay.style.cssText = `
        position: absolute;
        left: ${overlayRelativeToRoot.left}px;
        top: ${overlayRelativeToRoot.top}px;
        width: ${overlayRelativeToRoot.width}px;
        height: ${overlayRelativeToRoot.height}px;
        z-index: 9999;
        border-radius: var(--enlarge-radius, 32px);
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0,0,0,.35);
        transition: all ${enlargeTransitionMs}ms ease-out;
        pointer-events: none;
        margin: 0;
        transform: none;
      `;

      const originalImg = overlay.querySelector('img');
      if (originalImg) {
        const img = originalImg.cloneNode() as HTMLImageElement;
        img.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        animatingOverlay.appendChild(img);
      }

      overlay.remove();
      rootRef.current!.appendChild(animatingOverlay);

      void animatingOverlay.getBoundingClientRect();

      requestAnimationFrame(() => {
        animatingOverlay.style.left = originalPosRelativeToRoot.left + 'px';
        animatingOverlay.style.top = originalPosRelativeToRoot.top + 'px';
        animatingOverlay.style.width = originalPosRelativeToRoot.width + 'px';
        animatingOverlay.style.height = originalPosRelativeToRoot.height + 'px';
        animatingOverlay.style.opacity = '0';
      });

      const cleanup = () => {
        animatingOverlay.remove();
        originalTilePositionRef.current = null;

        if (refDiv) refDiv.remove();
        parent.style.transition = 'none';
        el.style.transition = 'none';

        parent.style.setProperty('--rot-y-delta', `0deg`);
        parent.style.setProperty('--rot-x-delta', `0deg`);

        requestAnimationFrame(() => {
          el.style.visibility = '';
          el.style.opacity = '0';
          (el.style as any).zIndex = 0;
          focusedElRef.current = null;
          rootRef.current?.removeAttribute('data-enlarging');

          requestAnimationFrame(() => {
            parent.style.transition = '';
            el.style.transition = 'opacity 300ms ease-out';

            requestAnimationFrame(() => {
              el.style.opacity = '1';
              setTimeout(() => {
                el.style.transition = '';
                el.style.opacity = '';
                openingRef.current = false;
                if (!draggingRef.current && rootRef.current?.getAttribute('data-enlarging') !== 'true') {
                  document.body.classList.remove('dg-scroll-lock');
                }
              }, 300);
            });
          });
        });
      };

      animatingOverlay.addEventListener('transitionend', cleanup, {
        once: true
      });
    };

    scrim.addEventListener('click', close);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      scrim.removeEventListener('click', close);
      window.removeEventListener('keydown', onKey);
    };
  }, [enlargeTransitionMs, unlockScroll]);

  useEffect(() => {
    return () => {
      document.body.classList.remove('dg-scroll-lock');
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="sphere-root"
      style={
        {
          ['--segments-x' as any]: segments,
          ['--segments-y' as any]: segY,
          ['--overlay-blur-color' as any]: overlayBlurColor,
          ['--tile-radius' as any]: imageBorderRadius,
          ['--enlarge-radius' as any]: openedImageBorderRadius,
          ['--image-filter' as any]: grayscale ? 'var(--image-filter-gray)' : 'none'
        } as CSSProperties
      }
    >
      <main ref={mainRef} className="sphere-main">
        {/* v4: 타일은 보조기술에서 숨긴다 — 같은 작품 목록이 벽 오른쪽 아래에 링크로 있다 */}
        <div className="stage" aria-hidden="true">
          <div ref={sphereRef} className="sphere">
            {items.map((it, i) => (
              <div
                key={`${it.x},${it.y},${i}`}
                className="item"
                data-idx={i}
                data-slug={it.slug}
                data-src={it.src}
                data-video={videoAt.has(i) ? videoAt.get(i)!.slug : undefined}
                data-offset-x={it.x}
                data-offset-y={it.y}
                data-size-x={it.sizeX}
                data-size-y={it.sizeY}
                style={
                  {
                    ['--offset-x' as any]: it.x,
                    ['--offset-y' as any]: it.y,
                    ['--item-size-x' as any]: it.sizeX,
                    ['--item-size-y' as any]: it.sizeY
                  } as CSSProperties
                }
              >
                <div
                  className="item__image"
                  role="button"
                  tabIndex={-1}
                  aria-label={it.alt || 'Open image'}
                  onClick={onTileClick}
                  onPointerUp={onTilePointerUp}
                >
                  {videoAt.has(i) ? (
                    // v4: 영상 칸 — 덮개 없이 클립만(흑백 → 호버 컬러는 그림 칸과 같은 규칙)
                    <video
                      ref={(el) => {
                        if (el) videoEls.current.set(i, el);
                        else videoEls.current.delete(i);
                      }}
                      src={videoAt.get(i)!.src}
                      poster={videoAt.get(i)!.poster}
                      muted
                      loop
                      playsInline
                      preload="none"
                      aria-hidden="true"
                    />
                  ) : (
                    /* v4: AVIF · WebP · JPG × 360w · 720w(Kavieng 5절 썸네일 전달) */
                    <picture>
                      {it.avif && <source type="image/avif" srcSet={it.avif} sizes="300px" />}
                      {it.webp && <source type="image/webp" srcSet={it.webp} sizes="300px" />}
                      <img src={it.src} draggable={false} alt={it.alt} decoding="async" />
                    </picture>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overlay" />
        <div className="overlay overlay--blur" />
        <div className="edge-fade edge-fade--top" />
        <div className="edge-fade edge-fade--bottom" />

        <div className="viewer" ref={viewerRef}>
          <div ref={scrimRef} className="scrim" />
          <div ref={frameRef} className="frame" />
        </div>
      </main>
    </div>
  );
}
