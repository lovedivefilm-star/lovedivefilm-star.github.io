/**
 * 작품 방 v4 — 기존 데이터(works.ts · process/*.ts · scripts.ts)를 화면 칸으로 엮는다. 새 문장은 만들지 않는다.
 * 데이터가 없는 칸은 null/빈 배열 → 그 칸을 그리지 않는다(설계서 0절 4).
 */
import { MAIN_WORKS, TOOL_WORKS, WORKS, type Work } from './works';
import { roomOf } from './process';
import { STAGES, type Pic, type ScriptLine as ExLine, type StageKey, mmss } from './process/types';
import { SCRIPTS, type ScriptLine } from './scripts';

export type MetaRow = { k: string; v: string; key: string };

/** 메타 표 — 형식 · 역할 · 툴 · 제작 기간(설계서 2절의 연도 · 길이는 같은 사실이 다른 곳에 있어 뺐다). 값이 없으면 행 생략. */
export function metaRows(w: Work): MetaRow[] {
  const ov = roomOf(w.slug)?.overview;
  const spec = (k: string) => ov?.spec.find((s) => s.k === k)?.v;
  // 같은 사실은 한 곳에만(레퍼런스 절제 규칙 10): 길이는 재생 줄(「▶ 풀영상 재생 · 3:00」)에, 연도는 제작 기간에 이미 있다
  const period = spec('제작 기간') ?? '';
  const rows: MetaRow[] = [
    { k: '형식', v: spec('형식') ?? w.format ?? '', key: 'format' },
    { k: '역할', v: ov?.spec.find((s) => s.key === 'role')?.v ?? w.creditNote, key: 'role' },
    { k: '툴', v: ov?.tools.map((t) => t.v).join(' · ') ?? '', key: 'tools' },
    period ? { k: '제작 기간', v: period, key: 'period' } : { k: '연도', v: w.year ?? '', key: 'year' },
  ];
  return rows.filter((r) => r.v);
}

/** 히어로 대본 한 줄 — 대본의 첫 대사(첫 씬 안에 대사가 없으면 첫 지문). 원문 줄 통째. */
export function heroLine(slug: string): ScriptLine | null {
  const lines = SCRIPTS[slug] ?? [];
  let sceneCount = 0;
  let firstAct: ScriptLine | null = null;
  for (const l of lines) {
    if (l.t === 'scene') {
      sceneCount++;
      if (sceneCount > 1) break;
      continue;
    }
    if (l.t === 'dia') return l;
    if (l.t === 'act' && !firstAct && !/^INS\b/.test(l.s)) firstAct = l;
  }
  return firstAct;
}

/** 큰 제목 글자 크기 — Kavieng 글자 수 단계(2-4) ∩ 한 줄에 들어가는 크기 ∩ 첫 화면 상한(제목 · 역할 · 영상 칸이 첫 화면에). */
export function titleSize(s: string, cap = 'clamp(64px, 10.4vw, 150px)'): string {
  let em = 0;
  let n = 0;
  for (const ch of s) {
    n++;
    if (/[가-힣ㄱ-ㆎ]/.test(ch)) em += 1;
    else if (ch === ' ') em += 0.3;
    else if (/[.,!'’:;|[\]()\-]/.test(ch)) em += 0.36;
    else if (/[A-Z0-9]/.test(ch)) em += 0.7;
    else if (/[a-z]/.test(ch)) em += 0.55;
    else em += 0.7;
  }
  em = (em - 0.03 * n) * 1.06;
  const tier = n <= 16 ? 'clamp(92px, 15.7vw, 224px)' : n <= 28 ? 'clamp(78px, 11.4vw, 164px)' : 'clamp(64px, 8.6vw, 124px)';
  return `min(${tier}, calc((100vw - 80px) / ${em.toFixed(2)}), ${cap})`;
}

/** 다음 작품 — 주력 3 → 툴 방 → 처음(Kavieng: 마지막 다음은 처음으로) */
export const ROOM_ORDER = [...MAIN_WORKS.map((w) => ({ key: w.slug, href: `/works/${w.slug}/`, title: w.title })), { key: 'tools', href: '/tools/', title: '툴' }];
export const nextOf = (key: string) => ROOM_ORDER[(ROOM_ORDER.findIndex((r) => r.key === key) + 1) % ROOM_ORDER.length];
export const prevOf = (key: string) => ROOM_ORDER[(ROOM_ORDER.findIndex((r) => r.key === key) + ROOM_ORDER.length - 1) % ROOM_ORDER.length];

/** 큰 제목 줄 — 쉼표 뒤에서 줄을 나눈다(글자는 그대로, 보이는 줄만). 9:16 오른쪽 칸 두 줄 제목용 */
export const titleLines = (t: string) => t.split(/(?<=,)\s+/);

export type GalPic = Pic & { place: 'full' | 'left' | 'right' };
/** 갤러리 배치 — 1장 = 전체 · 2장 = 6+6 · 3장 = 전체 + 6+6(Kavieng 2-4) */
export const galPlace = (pics: Pic[]): GalPic[] => {
  const pl: GalPic['place'][][] = [[], ['full'], ['left', 'right'], ['full', 'left', 'right']];
  return pics.slice(0, 3).map((p, i) => ({ ...p, src: p.full ?? p.src, place: pl[pics.length]?.[i] ?? 'full' }));
};

export type Cut = { frame: string; lines: ExLine[] };
export type StepView = {
  key: StageKey;
  no: string;
  name: string;
  facts: string[];
  text?: { t: string; src: string }[];
  script?: ExLine[];
  pics: GalPic[];
  cuts: Cut[];
  frameAr: number;
};

/** 「이 장면이 만들어진 순서」 — 6단계. 대본 단계만 대본 발췌, 세그먼트 단계는 컷 프레임 띠 + 그 컷의 대본(처음 나올 때 한 번). */
export function steps(slug: string): { title: string; script: string; play: number; playLabel: string; list: StepView[] } | null {
  const p = roomOf(slug)?.process;
  if (!p) return null;
  const edit = p.stages.find((s) => s.key === 'edit');
  const strip = edit?.strip;
  const frameOf = new Map<string, string>();
  strip?.labels?.forEach((l, i) => strip.frames?.[i] && frameOf.set(l, strip.frames[i]));
  const work = WORKS.find((w) => w.slug === slug)!;
  const frameAr = work.ratio === '9:16' ? 9 / 16 : 306 / 128;
  const list: StepView[] = p.stages.map((s, i) => {
    const meta = STAGES[i];
    let cuts: Cut[] = [];
    if (s.key === 'segment') {
      const shown = new Set<number>();
      cuts = (s.segments ?? [])
        .filter((g) => g.lines.length && frameOf.has(g.cut))
        .map((g) => {
          const fresh = g.lines.filter((n) => !shown.has(n));
          fresh.forEach((n) => shown.add(n));
          return { frame: frameOf.get(g.cut)!, lines: fresh.map((n) => p.excerpt[n]) };
        });
    }
    return {
      key: s.key,
      no: meta.no,
      name: meta.name,
      facts: s.chips,
      text: s.text?.lines.map((l) => ({ t: l.t, src: l.src })),
      script: s.key === 'script' ? p.excerpt : undefined,
      pics: s.key === 'script' ? [] : galPlace(s.pics ?? []),
      cuts,
      frameAr,
    };
  });
  return { title: p.title, script: p.script, play: p.play, playLabel: mmss(p.play), list };
}

export { MAIN_WORKS, TOOL_WORKS };
