/**
 * Per-kind variant registry — 5 variants × 13 slide kinds.
 *
 * Each kind exposes A/B/C/D/E. Variant A is always the original
 * single-variant implementation extracted from UniexPitchSlides.tsx;
 * B/C/D/E are alternate compositions designed to feel
 * fundamentally different (split layouts, image heroes, glass cards,
 * timelines, etc.) while reading the SAME content.
 */

import { MASTER_VARIANTS } from './Master';
import { COVER_VARIANTS } from './Cover';
import { PROBLEM_VARIANTS } from './Problem';
import { SOLUTION_VARIANTS } from './Solution';
import { PROCESS_VARIANTS } from './Process';
import { DIFFERENTIATORS_VARIANTS } from './Differentiators';
import { FOUNDATIONS_VARIANTS } from './Foundations';
import { PROGRAMS_INTRO_VARIANTS } from './ProgramsIntro';
import { PROGRAM_DETAIL_VARIANTS } from './ProgramDetail';
import { SCHOOL_BENEFITS_VARIANTS } from './SchoolBenefits';
import { METRICS_VARIANTS } from './Metrics';
import { IMPACT_VARIANTS } from './Impact';
import { TEAM_VARIANTS } from './Team';
import { TEAM_DETAIL_VARIANTS } from './TeamDetail';
import { CTA_VARIANTS } from './Cta';

export type VariantKey = 'A' | 'B' | 'C' | 'D' | 'E';

export const VARIANTS = {
  master: MASTER_VARIANTS,
  cover: COVER_VARIANTS,
  problem: PROBLEM_VARIANTS,
  solution: SOLUTION_VARIANTS,
  process: PROCESS_VARIANTS,
  differentiators: DIFFERENTIATORS_VARIANTS,
  foundations: FOUNDATIONS_VARIANTS,
  'programs-intro': PROGRAMS_INTRO_VARIANTS,
  'program-detail': PROGRAM_DETAIL_VARIANTS,
  'school-benefits': SCHOOL_BENEFITS_VARIANTS,
  metrics: METRICS_VARIANTS,
  impact: IMPACT_VARIANTS,
  team: TEAM_VARIANTS,
  'team-detail': TEAM_DETAIL_VARIANTS,
  cta: CTA_VARIANTS,
} as const;

export type SlideKind = keyof typeof VARIANTS;
