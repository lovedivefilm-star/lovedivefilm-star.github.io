import { oneandonly } from './case-studies/oneandonly';
import { firstimpression } from './case-studies/firstimpression';
import { butter } from './case-studies/butter';
import type { CaseStudy } from './case-studies/types';
export const CASE_STUDIES: Record<string, CaseStudy> = { oneandonly, firstimpression, butter };
export type { CaseStudy, StudyImage } from './case-studies/types';
