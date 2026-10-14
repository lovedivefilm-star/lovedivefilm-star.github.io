/**
 * 작업 벽(홈) 타일 — 완성본 프레임만(설계서 0절 6 · 2절).
 *
 * 정본: 장면 에이전트(2026-10-14)의 `src/data/wall.json`(7편 × 6 = 42항목) + `public/media/wall/`(1.64:1 크롭 · AVIF/WebP/JPG × 360/720).
 * 출처: src/data/media-sources.json 의 `wall/*`(wall-sources.json 을 합침).
 * 보류(메인 판단 10-14): 뮤직비디오 face 칸 4장(n=1 · 2 · 3 · 5)은 실제 영화 배우 얼굴로 보여 작가 확인 전 — 벽 · 인트로 · 404 어디에도 쓰지 않는다.
 * wall.json 이 없을 때만 이미 있는 완성본 프레임으로 임시로 채운다.
 */
import { WORKS, workBySlug } from './works';

export type WallTile = {
  /** 기본 그림(JPG 720) */
  src: string;
  /** AVIF / WebP srcset(360w · 720w) — 없으면 빈 문자열 */
  avif: string;
  webp: string;
  slug: string;
  /** 같은 작품 안 순번(0~) */
  k: number;
  /** 완성본 시각(초) */
  t?: number;
};

/** 작가 확인 전 — 쓰지 않는 칸 */
export const WALL_HOLD = new Set(['musicvideo:1', 'musicvideo:2', 'musicvideo:3', 'musicvideo:5']);

const found = import.meta.glob('./wall.json', { eager: true, import: 'default' }) as Record<string, unknown>;
const raw = found['./wall.json'];

type RawItem = { slug?: string; n?: number; t?: number; face?: boolean; src?: Record<string, string> | string };

function parseWall(j: unknown): WallTile[] | null {
  if (!Array.isArray(j)) return null;
  const count: Record<string, number> = {};
  const out: WallTile[] = [];
  for (const it of j as RawItem[]) {
    if (!it?.slug || !workBySlug(it.slug)) continue;
    if (WALL_HOLD.has(`${it.slug}:${it.n}`)) continue;
    const s = it.src;
    if (!s) continue;
    const pick = (k: string) => (typeof s === 'string' ? '' : s[k] ?? '');
    const src = typeof s === 'string' ? s : pick('jpg720') || pick('webp720') || pick('avif720');
    if (!src) continue;
    const set = (a: string, b: string) => [pick(a) && `${pick(a)} 360w`, pick(b) && `${pick(b)} 720w`].filter(Boolean).join(', ');
    const k = count[it.slug] ?? 0;
    count[it.slug] = k + 1;
    out.push({ src, avif: set('avif360', 'avif720'), webp: set('webp360', 'webp720'), slug: it.slug, k, t: it.t });
  }
  return out.length ? out : null;
}

/** 임시 — wall.json 이 없을 때만(이미 사이트에 있는 완성본 프레임) */
const TEMP: Record<string, string[]> = {
  oneandonly: ['poster_oneandonly.jpg', 'process/oneandonly/oo_05_1.jpg', 'process/oneandonly/oo_end_1.jpg'],
  firstimpression: ['poster_firstimpression.jpg', 'process/firstimpression/fi_gen_1.jpg', 'process/firstimpression/fi_done_1.jpg'],
  butter: ['poster_butter.jpg', 'process/butter/f_0625.jpg', 'process/butter/f_0659.jpg'],
  kinetic: ['poster_kinetic.jpg'],
  mindhunter: ['poster_mindhunter.jpg'],
  curlyshyll: ['poster_curlyshyll.jpg'],
  musicvideo: ['poster_musicvideo.jpg'],
};
const temp = (): WallTile[] =>
  WORKS.flatMap((w) => (TEMP[w.slug] ?? []).map((f, k) => ({ src: `/media/${f}`, avif: '', webp: '', slug: w.slug, k })));

export const WALL_FROM_AGENT = !!parseWall(raw);
export const WALL_TILES: WallTile[] = parseWall(raw) ?? temp();

/**
 * 벽 배치 순서 — 작품을 돌아가며 하나씩(같은 작품 · 같은 장면이 이웃 칸에 붙지 않게). 결정적(빌드마다 같음).
 * DomeGallery 는 칸(26열 × 7행 = 182)을 이 목록으로 되풀이해 채운다 — 같은 장면은 40칸마다 한 번(이웃 칸 = ±1 · ±7).
 */
export function wallOrder(tiles: WallTile[] = WALL_TILES): WallTile[] {
  const by = new Map<string, WallTile[]>();
  for (const t of tiles) by.set(t.slug, [...(by.get(t.slug) ?? []), t]);
  const queues = [...by.values()];
  const out: WallTile[] = [];
  for (let round = 0; out.length < tiles.length; round++) {
    for (const q of queues) if (q[round]) out.push(q[round]);
  }
  return out;
}

const first = (slug: string) => WALL_TILES.find((t) => t.slug === slug);
/** 작품 방 판(히어로 왼쪽)의 기본 그림 — 벽을 거치지 않고 들어온 경우(직링크 · 다음 작품) */
export const plateOf = (slug: string) => first(slug)?.src ?? workBySlug(slug)?.poster ?? '';
