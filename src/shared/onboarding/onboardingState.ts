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

/**
 * The steps a user actually stands on. Understanding is a transition.
 *
 * TWO, matching the interface this restores: one setup screen carrying the
 * brand name, the description and the upload area together, then the review.
 * Splitting them apart made the flow feel longer without making any step
 * clearer (spec FR-043).
 */
export const ONBOARDING_STEPS = ['setup', 'review'] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/**
 * What the website scan did for this brand, kept for resume and honest
 * reporting. Counts, codes and page names only — never copy, never bytes.
 */
export interface WebsiteScanSummary {
  url: string;
  status: 'complete' | 'partial' | 'failed';
  pagesRead: number;
  /** Non-fatal and fatal problems by code, with the page when there is one. */
  problems: Array<{ code: string; page?: string }>;
  /** Where each value came from ("northwind.studio/about"), keyed by Core path or `business.<field>`. */
  origins?: Record<string, string>;
  ai?: { tier?: string; reason?: string; calls: number; skipped?: string; ms?: number };
  timing?: { firstEventMs?: number; scanMs?: number; totalMs?: number };
  /** ISO timestamp. */
  at: string;
}

export interface OnboardingState {
  step: OnboardingStep;
  /** ISO timestamp — when the brand was named. */
  startedAt: string;
  /** ISO timestamp, or null while onboarding is unfinished. */
  completedAt: string | null;
  /**
   * The raw profile text, so resume on another device still has it.
   *
   * Onboarding's own transient input, NOT a brand concept — which is why it
   * lives on the marker rather than in `businessInfo.description`, where
   * products and services live. Two writers on one field would put the whole
   * brief on screen as the product list.
   */
  brief?: string;
  /** The last website scan, when one ran. */
  websiteScan?: WebsiteScanSummary;
  /**
   * Core paths that hold a COMPATIBILITY PLACEHOLDER, not a chosen value.
   *
   * `brands.primary_color` is `text not null` and the canonical schema requires
   * `colors.primary.hex` to match a hex pattern and `typography.primary.family`
   * to be non-empty — so a brand that has only been named cannot be persisted
   * with those genuinely absent. Rather than fabricate a brand colour, the
   * create path writes a documented neutral and records the path here.
   *
   * This list lives in ONBOARDING state, deliberately below the canonical
   * projection: it is not Core, it carries no authority, and Core metadata
   * records nothing for these paths. Anything asking "did the user choose a
   * primary colour?" can ask `isPlaceholderPath`, and the entry is dropped the
   * moment a real value is written.
   *
   * Absent on every brand that predates this, which reads as "no placeholders".
   */
  placeholders?: string[];
}

/**
 * The neutral stand-ins.
 *
 * Chosen to be obviously unclaimed rather than plausible: a mid-grey is not a
 * brand colour, and the system font stack is not a typeface decision. They
 * exist to satisfy a NOT NULL column and a zod pattern, nothing more.
 */
export const CORE_PLACEHOLDERS = {
  'colors.primary': '#8A877E',
  'typography.primary': 'system-ui',
} as const;

/** Paths that currently hold a placeholder rather than a chosen value. */
export function placeholderPaths(brand: Pick<Brand, 'onboarding'> | null | undefined): string[] {
  const raw = (brand?.onboarding as { placeholders?: unknown } | undefined)?.placeholders;
  return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : [];
}

/** True when this Core path holds a placeholder — never a value the user chose. */
export function isPlaceholderPath(
  brand: Pick<Brand, 'onboarding'> | null | undefined,
  path: string,
): boolean {
  return placeholderPaths(brand).includes(path);
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
  const placeholders = Array.isArray(o.placeholders)
    ? o.placeholders.filter((p): p is string => typeof p === 'string')
    : [];
  return {
    // An unrecognised step degrades to the first one. This is also how a brand
    // recorded under an earlier vocabulary ('basics'/'material'/'name'/'profile')
    // resumes rather than throwing.
    step: isStep(o.step) ? o.step : 'setup',
    startedAt: typeof o.startedAt === 'string' ? o.startedAt : new Date().toISOString(),
    completedAt: null,
    ...(typeof o.brief === 'string' && o.brief ? { brief: o.brief } : {}),
    ...(isScanSummary(o.websiteScan) ? { websiteScan: o.websiteScan } : {}),
    ...(placeholders.length ? { placeholders } : {}),
  };
}

function isScanSummary(v: unknown): v is WebsiteScanSummary {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return typeof s.url === 'string' && typeof s.status === 'string' && typeof s.at === 'string' && Array.isArray(s.problems);
}

/** Records a scan on the marker. Read-modify-write like every marker write. */
export function withWebsiteScan(current: OnboardingState | null, scan: WebsiteScanSummary): OnboardingState {
  const base = current ?? startedState();
  return { ...base, websiteScan: scan };
}

/** True when the brand is mid-onboarding — the brand list's "Still setting up". */
export function isUnfinished(brand: Pick<Brand, 'onboarding'> | null | undefined): boolean {
  return readOnboardingState(brand) !== null;
}

/** The step to resume at. `setup` when there is nothing recorded. */
export function resumeStep(brand: Pick<Brand, 'onboarding'> | null | undefined): OnboardingStep {
  return readOnboardingState(brand)?.step ?? 'setup';
}

/**
 * A fresh marker, for the moment the brand is named.
 *
 * `placeholders` lists what the create path had to invent to satisfy
 * persistence. A brand created with real values passes an empty list.
 */
export function startedState(placeholders: string[] = []): OnboardingState {
  return {
    step: 'setup',
    startedAt: new Date().toISOString(),
    completedAt: null,
    ...(placeholders.length ? { placeholders } : {}),
  };
}

/** The marker with the user's profile text recorded on it. */
export function withBrief(current: OnboardingState | null, brief: string): OnboardingState {
  const base = current ?? startedState();
  const text = brief.trim();
  return { ...base, ...(text ? { brief: text } : { brief: undefined }) };
}

/**
 * Drops a path from the placeholder list once a real value is written.
 *
 * Returns `null` when nothing changed, so callers can skip a pointless save.
 */
export function clearPlaceholders(
  current: OnboardingState | null,
  written: readonly string[],
): OnboardingState | null {
  if (!current?.placeholders?.length) return null;
  const next = current.placeholders.filter((p) => !written.includes(p));
  if (next.length === current.placeholders.length) return null;
  return { ...current, ...(next.length ? { placeholders: next } : { placeholders: undefined }) };
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
    setup: 'just started',
    review: 'left at Review',
  };
  return `Still setting up · ${where[s.step]}`;
}
