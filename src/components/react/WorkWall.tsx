/**
 * 작업 벽 — React Bits DomeGallery 를 감싸는 붙이는 코드(docs/v4-redesign.md 2절 · Kavieng 2-3 · 메인 지시 10-14).
 *  · 아래 가운데 읽음 「작품 · 형식 · 연도」 = 정면에 가장 가까운 타일(호버와 무관 — Kavieng)
 *  · 오른쪽 아래 작품 7편 목록(바로 가기 · 올리면 그 작품 타일이 컬러 — Kavieng data-project-spotlight)
 *  · 왼쪽 아래 「드래그해서 둘러보기」 · 화면 가운데 점(포인트색)
 *  · 3칸 = 주력 3편 후킹 클립(보일 때만 재생, 인트로가 끝나기 전엔 preload="none")
 *  · 타일 클릭 = 작품 방으로(Astro navigate) — 누른 그림이 방의 영상 칸으로 이어진다(view-transition-name: lead)
 *  · 인트로(잠든 벽) 동안 아주 느리게 저절로 돈다(.45°/s) → 입장(yk:enter)하면 1.1s 에 걸쳐 멈추고 영상 칸이 깨어난다
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { navigate } from 'astro:transitions/client';
import DomeGallery, { type DomeApi, type ItemDef } from './DomeGallery';

export type WallWork = { slug: string; title: string; format: string; year: string; href: string };
export type WallImage = { src: string; slug: string; k: number; avif?: string; webp?: string };
export type WallVideo = { slug: string; src: string; poster: string };

type Props = { images: WallImage[]; works: WallWork[]; videos?: WallVideo[]; hint: string; listLabel: string };

declare global {
  interface Window {
    __ykEnterAt?: number;
  }
}

const KEY_ROT = 'yk-wall-rot';

export default function WorkWall({ images, works, videos = [], hint, listLabel }: Props) {
  const apiRef = useRef<DomeApi | null>(null);
  const domeRoot = useRef<HTMLDivElement | null>(null);
  const [center, setCenter] = useState<string>('');
  const [spot, setSpot] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const bySlug = useMemo(() => new Map(works.map((w) => [w.slug, w])), [works]);
  const items = useMemo(
    () => images.map((im) => ({ src: im.src, slug: im.slug, k: im.k, avif: im.avif, webp: im.webp, alt: bySlug.get(im.slug)?.title ?? '' })),
    [images, bySlug],
  );

  const onCenterChange = useCallback((it: ItemDef) => setCenter(it.slug), []);

  const onItemClick = useCallback(
    (it: ItemDef, el: HTMLElement) => {
      const w = bySlug.get(it.slug);
      if (!w) return;
      const media = el.querySelector<HTMLElement>('img, video');
      // 누른 그림 → 작품 방 영상 칸(방 쪽 칸은 view-transition-name: lead)
      if (media && w.href.startsWith('/works/')) media.style.setProperty('view-transition-name', 'lead');
      try {
        const r = apiRef.current?.getRotation();
        if (r) sessionStorage.setItem(KEY_ROT, JSON.stringify(r));
      } catch {}
      navigate(w.href);
    },
    [bySlug],
  );

  // 돌아왔을 때 벽 위치 그대로(Kavieng: 닫으면 열기 전 위치)
  useEffect(() => {
    try {
      const r = JSON.parse(sessionStorage.getItem(KEY_ROT) ?? 'null');
      if (r && typeof r.y === 'number' && !document.documentElement.hasAttribute('data-intro')) apiRef.current?.setRotation(r.x ?? 0, r.y);
    } catch {}
  }, []);

  // 잠든 벽 — 인트로 동안 아주 느리게 돌다가 입장하면 1.1s 에 걸쳐 멈춘다
  useEffect(() => {
    const html = document.documentElement;
    if (!html.hasAttribute('data-intro') || window.__ykEnterAt) {
      setEntered(true);
      return;
    }
    const speed = { v: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 0.45 }; // °/s
    const tick = (_t: number, dt: number) => {
      const api = apiRef.current;
      if (!api || !speed.v) return;
      const r = api.getRotation();
      api.setRotation(r.x, r.y - (speed.v * dt) / 1000);
    };
    gsap.ticker.add(tick);
    const on = () => {
      setEntered(true);
      gsap.to(speed, { v: 0, duration: 1.1, ease: 'power3.out', onComplete: () => gsap.ticker.remove(tick) });
    };
    document.addEventListener('yk:enter', on, { once: true });
    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener('yk:enter', on);
    };
  }, []);

  // 키보드 ← → (Kavieng 56px · Shift 118px → 드래그 감도 20 으로 나눈 각도)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.documentElement.hasAttribute('data-intro')) return;
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      const step = (e.shiftKey ? 118 : 56) / 20;
      if (e.key === 'ArrowLeft') apiRef.current?.nudge(step);
      else if (e.key === 'ArrowRight') apiRef.current?.nudge(-step);
      else if (e.key === 'ArrowUp') apiRef.current?.nudge(0, step / 2);
      else if (e.key === 'ArrowDown') apiRef.current?.nudge(0, -step / 2);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cw = bySlug.get(center);
  const spotCss = works
    .map((w) => `.wall[data-spot="${w.slug}"] .item[data-slug="${w.slug}"] :is(img,video){filter:var(--image-filter-color)}`)
    .join('');

  return (
    <div className="wall" data-wall data-spot={spot ?? undefined}>
      <style>{spotCss}</style>
      <DomeGallery
        images={items}
        videos={videos}
        videoActive={entered}
        apiRef={apiRef}
        rootRef={domeRoot}
        onItemClick={onItemClick}
        onCenterChange={onCenterChange}
        overlayBlurColor="#050505"
        grayscale
        fit={0.92}
        fitBasis="width"
        minRadius={760}
        segments={26}
        segmentsY={43}
        rows={7}
        maxVerticalRotationDeg={6}
        dragSensitivity={20}
        dragDampening={0.6}
        imageBorderRadius="8px"
      />
      <i className="wall-dot" aria-hidden="true" />
      <div className="wall-ui">
        <p className="wall-hint">{hint}</p>
        <p className="wall-read" aria-live="polite" data-wall-read>
          {cw ? `${cw.title} · ${cw.format} · ${cw.year}` : ''}
        </p>
        <nav className="wall-list" aria-label={listLabel}>
          <ul>
            {works.map((w) => (
              <li key={w.slug}>
                <a
                  href={w.href}
                  data-wall-link={w.slug}
                  onPointerEnter={() => setSpot(w.slug)}
                  onPointerLeave={() => setSpot(null)}
                  onFocus={() => setSpot(w.slug)}
                  onBlur={() => setSpot(null)}
                >
                  {w.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
