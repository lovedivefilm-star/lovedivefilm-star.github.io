/**
 * 작품 방 데이터 모음 — 작품마다 `src/data/process/<slug>.ts`(형식은 ./types.ts).
 * 빌드 때(그리고 시험이 불러올 때) 형식을 검사한다 — 어긋나면 빌드가 멈춘다.
 */
import { STAGES, type WorkRoom } from './types';
import { BUTTER } from './butter';
import { ONEANDONLY } from './oneandonly';
import { FIRSTIMPRESSION } from './firstimpression';

export const WORK_ROOMS: Record<string, WorkRoom> = {
  oneandonly: ONEANDONLY,
  firstimpression: FIRSTIMPRESSION,
  butter: BUTTER,
};

export const roomOf = (slug: string): WorkRoom | undefined => WORK_ROOMS[slug];

/** 과정 데이터가 들어온 작품(과정 구역을 그리는 작품) */
export const PROCESS_READY = Object.values(WORK_ROOMS)
  .filter((r) => !!r.process)
  .map((r) => r.slug);

for (const r of Object.values(WORK_ROOMS)) {
  const p = r.process;
  if (!p) continue;
  const bad = (m: string) => {
    throw new Error(`작품 방 데이터 ${r.slug}: ${m}`);
  };
  const n = p.excerpt.length;
  const okLine = (i: number) => Number.isInteger(i) && i >= 0 && i < n;
  if (p.stages.length !== STAGES.length) bad(`단계 ${p.stages.length}개 (6개여야 함)`);
  p.stages.forEach((s, k) => {
    if (s.key !== STAGES[k].key) bad(`단계 ${k + 1} 이 ${s.key} (${STAGES[k].key} 여야 함)`);
    if (s.chips.length < 1 || s.chips.length > 3) bad(`${s.key} 칩 ${s.chips.length}개 (1~3)`);
    if ((s.pics?.length ?? 0) > 3) bad(`${s.key} 그림 ${s.pics!.length}장 (3장까지)`);
    if (s.text && s.text.lines.length > 3) bad(`${s.key} 원문 ${s.text.lines.length}문장 (3문장까지)`);
    if (!s.lit.length || !s.lit.every(okLine)) bad(`${s.key} 밝힐 줄 [${s.lit.join(', ')}] 이 발췌(0~${n - 1}) 밖`);
    for (const g of s.segments ?? []) if (!g.lines.every(okLine)) bad(`${s.key} 세그먼트 ${g.cut} 줄이 발췌 밖`);
  });
  for (const q of p.pairs) if (!q.lines.length || !q.lines.every(okLine)) bad(`완성 짝 ${q.t}초 줄이 발췌 밖`);
  if (p.pairs.length < 1 || p.pairs.length > 3) bad(`완성 짝 ${p.pairs.length}개 (1~3)`);
}
