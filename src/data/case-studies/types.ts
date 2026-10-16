import type { PageLine } from '../pages';

export type StudyImage = { img: string; w: number; h: number; alt: string; caption: string };
export type CaseStudy = {
  id: string;
  title: string;
  summary: string;
  role: string;
  script: { label: string; note?: string; src: string; lines: PageLine[]; focus: number[] };
  choices: { heading: string; text: string; at: number; basis: string }[];
  material: { title: string; note: string; images: StudyImage[] };
  scene: { start: number; end: number; clip: string; poster: string; w: number; h: number; caption: string; beats: { t: number; label: string; note?: string }[] };
  /** Context and focus indexes refer to the full, unchanged script.lines array. */
  panels: { id: string; title: string; contextStart: number; contextEnd: number; focus?: number[]; choiceIndexes: number[]; scene: CaseStudy['scene'] }[];
  /** Private research only; never render these paths, logs or prompt contents. */
  basis: string[];
};
