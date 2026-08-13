/**
 * Where a brand got to in onboarding.
 *
 * Brand-first onboarding (spec 002) creates the brand at the naming step, so a
 * brand can exist while the flow is still running. This module is the ONLY
 * place that interprets `brand.onboarding`, so the "is this finished?" question
 * has exactly one answer everywhere it is asked.
 *
 * Two properties are load-bearing:
 *
 *  1. **Absent means finished.** Every brand that predates 002 has no marker,
 *     and every brand created outside onboarding never gets one. Reading those
 *     as unfinished would drag people who are done back into the flow, so the
 *     default is the safe direction.
 *
 *  2. **A malformed marker never throws.** It degrades to the first step. A
 *     brand must stay openable no matter what is in this column — losing your
 *     place is a nuisance, losing access to your brand is not.
 */
import type { Brand } from '@/shared/types/brand';

/** The steps a user actually stands on. Understanding is a transition. */
export const ONBOARDING_STEPS = ['basics', 'material', 'review'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * Which entry path produced this brand. Recorded for Context, never asked for
 * up front — the user is not made to classify themselves (spec §Screen 1).
 * `new` is set when they take the "Help me start" path.
 */
export type OnboardingBranch = 'existing' | 'new';

export interface OnboardingState {
  step: OnboardingStep;
  branch: OnboardingBranch;
  /** ISO timestamp — when the brand was named. */
  startedAt: string;
  /** ISO timestamp, or null while onboarding is unfinished. */
  completedAt: string | null;
}

function isStep(v: unknown): v is OnboardingStep {
  return typeof v === 'string' && (ONBOARDING_STEPS as readonly string[]).includes(v);
}

/**
 * Reads the marker off a brand, tolerating anything.
 *
 * Returns `null` for "not in onboarding" — either no marker at all, or a
 * finished one. Callers asking "should I show the flow?" only need this.
 */
export function readOnboardingState(brand: Pick<Brand, 'onboarding'> | null | undefined): OnboardingState | null {
  const raw = brand?.onboarding as unknown;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  // A completed marker is history, not state. Everything downstream treats a
  // finished brand exactly like a brand that never onboarded.
  if (typeof o.completedAt === 'string' && o.completedAt) return null;
  return {
    step: isStep(o.step) ? o.step : 'basics',
    branch: o.branch === 'new' ? 'new' : 'existing',
    startedAt: typeof o.startedAt === 'string' ? o.startedAt : new Date().toISOString(),
    completedAt: null,
  };
}

/** True when the brand is mid-onboarding — the brand list's "Still setting up". */
export function isUnfinished(brand: Pick<Brand, 'onboarding'> | null | undefined): boolean {
  return readOnboardingState(brand) !== null;
}

/** The step to resume at. `basics` when there is nothing recorded. */
export function resumeStep(brand: Pick<Brand, 'onboarding'> | null | undefined): OnboardingStep {
  return readOnboardingState(brand)?.step ?? 'basics';
}

/** A fresh marker, for the moment the brand is named. */
export function startedState(branch: OnboardingBranch = 'existing'): OnboardingState {
  return { step: 'basics', branch, startedAt: new Date().toISOString(), completedAt: null };
}

/**
 * The marker after moving to `step`.
 *
 * Moving BACKWARDS rewrites the step, deliberately: the recorded step is where
 * the user is, not the furthest they reached. Someone who steps back to add a
 * file and closes the tab should return to where they were standing.
 */
export function atStep(current: OnboardingState | null, step: OnboardingStep): OnboardingState {
  const base = current ?? startedState();
  return { ...base, step, completedAt: null };
}

/** The marker after finishing. Written once; `completedAt` is never cleared. */
export function completedState(current: OnboardingState | null): OnboardingState {
  const base = current ?? startedState();
  return { ...base, step: 'review', completedAt: new Date().toISOString() };
}

/** Human label for the brand list. Deliberately a situation, not a deficiency. */
export function unfinishedLabel(brand: Pick<Brand, 'onboarding'> | null | undefined): string | null {
  const s = readOnboardingState(brand);
  if (!s) return null;
  const where: Record<OnboardingStep, string> = {
    basics: 'just started',
    material: 'left at your files',
    review: 'left at Review',
  };
  return `Still setting up · ${where[s.step]}`;
}
