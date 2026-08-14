/**
 * The processing moment's stage machine.
 *
 * The whole design turns on one property: **a stage exists only when the work
 * it names is scheduled for this run.** A brand with no files never constructs
 * the file stages, so "Reading your brand files" is not skipped or hidden — it
 * is unrepresentable. That makes FR-058's honest-copy rule a property of the
 * code rather than a promise someone has to keep, and it is what SC-014 tests.
 *
 * Each stage owns one of the eight outer nodes of the mark, so the symbol
 * assembling IS the work completing rather than a decorative loop beside it.
 *
 * `run` returns the small real finding the moment may display — "3 logo
 * variations found". It returns `null` when the work produced nothing worth
 * saying; the moment never invents one.
 *
 * This module performs no timing and no I/O of its own. The ~1.2s minimum beat
 * (FR-061) is applied by the screen, AFTER the work resolves, and is never a
 * delay inserted between stages.
 *
 * Pure — no service, no store, no React.
 */
import type { OnboardingAsset } from '@/shared/upload/intakeTypes';

/** A small, true observation the moment may show. */
export interface Finding {
  /** "Typeface", "Industry", "Logos". */
  label: string;
  /** "Söhne", "Real Estate", "3 variations". */
  value: string;
}

export interface Stage {
  id: string;
  /** Present tense, real work. Never a description of something not running. */
  label: string;
  /** Which outer node lights when this completes. 0–7, clockwise from top-left. */
  node: number;
  run(): Promise<Finding | null> | Finding | null;
}

export interface StageInput {
  brandName: string;
  /** True when the user supplied any profile text. */
  hasText: boolean;
  /** True when that text was the structured brief. */
  hasBrief: boolean;
  website?: string;
  items: readonly OnboardingAsset[];
  /** Called when the real understanding pass finishes; supplies the findings. */
  results?: () => Partial<Record<string, Finding | null>>;
}

/**
 * Builds the stages this run will actually perform.
 *
 * The conditions are the point. Read them as the answer to "why did the user
 * see that message?" — every one of them is a fact about their input.
 */
export function planStages(input: StageInput): Stage[] {
  const stages: Stage[] = [];
  const results = input.results ?? (() => ({}));
  const finding = (key: string) => () => results()[key] ?? null;

  const images = input.items.filter((a) => a.kind === 'image' && !a.generated);
  const fonts = input.items.filter((a) => a.kind === 'font');
  const files = input.items.filter((a) => a.kind !== 'color');

  if (input.hasText) {
    stages.push({
      id: 'brief',
      // The copy differs because the WORK differs — a structured brief is read,
      // free prose has to be understood. Saying the same thing for both would
      // be the first small lie.
      label: input.hasBrief ? 'Reading your brand brief' : 'Understanding your brand',
      node: 0,
      run: finding('brief'),
    });
  }

  stages.push({
    id: 'structure',
    label: 'Structuring your brand information',
    node: 1,
    run: finding('structure'),
  });

  if (input.website) {
    stages.push({ id: 'website', label: 'Checking your website', node: 2, run: finding('website') });
  }

  if (files.length) {
    stages.push({ id: 'files', label: 'Organising your brand files', node: 3, run: finding('files') });
  }

  if (images.length) {
    stages.push({ id: 'logos', label: 'Finding your logo system', node: 4, run: finding('logos') });
    stages.push({ id: 'colors', label: 'Extracting your colours', node: 5, run: finding('colors') });
  }

  if (fonts.length) {
    stages.push({ id: 'fonts', label: 'Identifying your typography', node: 6, run: finding('fonts') });
  }

  stages.push({
    id: 'style',
    label: 'Mapping your visual direction',
    node: 7,
    run: finding('style'),
  });

  return stages;
}

/** The minimum the screen is shown for, so it never flashes past. */
export const MINIMUM_BEAT_MS = 1200;

/**
 * How long the moment should stay on screen.
 *
 * A FLOOR, never an addition: work that took longer than the beat is shown for
 * exactly as long as it took. This is the function that keeps "premium moment"
 * from becoming "fake delay".
 */
export function screenDuration(workMs: number, minimum = MINIMUM_BEAT_MS): number {
  return Math.max(workMs, minimum);
}

/** Builds the findings map from a completed understanding pass. */
export function findingsFrom(input: {
  logoGroups?: number;
  logoVariants?: number;
  colors?: number;
  typeface?: string;
  industryLabel?: string;
  fileCount?: number;
}): Record<string, Finding | null> {
  const out: Record<string, Finding | null> = {};
  if (input.industryLabel) out.structure = { label: 'Industry', value: input.industryLabel };
  if (input.fileCount) out.files = { label: 'Files', value: `${input.fileCount} organised` };
  if (input.logoGroups) {
    out.logos = {
      label: 'Logos',
      value:
        input.logoVariants && input.logoVariants > 0
          ? `${input.logoGroups} · ${input.logoVariants} variation${input.logoVariants === 1 ? '' : 's'}`
          : `${input.logoGroups} found`,
    };
  }
  if (input.colors) out.colors = { label: 'Colours', value: `${input.colors} identified` };
  if (input.typeface) out.fonts = { label: 'Typeface', value: input.typeface };
  return out;
}
