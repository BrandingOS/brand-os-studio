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
  /**
   * The website being scanned. When set, the plan IS the Brand Scan: the eight
   * stages approved at Gate 2, which fold the file, logo, colour and type work
   * into the scan's own steps — the mark has eight nodes and a scan has eight
   * moments; a ninth would be a lie about the geometry.
   */
  website?: string;
  items: readonly OnboardingAsset[];
  /** Called when the real understanding pass finishes; supplies the findings. */
  results?: () => Partial<Record<string, Finding | null>>;
  /**
   * Event-driven completion: a stage resolves when its key's event fires, not
   * when a timer reaches it. `planStages` uses it when supplied; the
   * `results()` snapshot stays the fallback for work that reports at the end.
   */
  awaitStage?: (key: string) => Promise<Finding | null>;
}

/** The scan's stage keys, in order. Index is the ring node. */
export const WEBSITE_STAGE_KEYS = ['site-opened', 'site-signals', 'site-identity', 'site-pages', 'site-voice', 'site-visual', 'site-profile', 'site-saving'] as const;
export type WebsiteStageKey = (typeof WEBSITE_STAGE_KEYS)[number];

export function websiteStageLabels(host: string): Record<WebsiteStageKey, string> {
  return {
    'site-opened': `Opening ${host}`,
    'site-signals': 'Reading brand signals',
    'site-identity': 'Finding your identity',
    'site-pages': 'Exploring key pages',
    'site-voice': 'Understanding your voice',
    'site-visual': 'Analysing visual language',
    'site-profile': 'Building your brand profile',
    'site-saving': 'Saving your brand',
  };
}

function hostOf(website: string): string {
  try {
    return new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`).hostname.replace(/^www\./, '');
  } catch {
    return website;
  }
}

/**
 * One deferred per stage key. The screen awaits them; the work resolves them
 * as its real events arrive; `resolveAll` closes whatever is left when the
 * work ends, so a stage whose phase failed still ends — with no finding.
 */
export interface StageSignals {
  promiseFor(key: string): Promise<Finding | null>;
  resolve(key: string, finding: Finding | null): void;
  resolveAll(): void;
  resolved(key: string): boolean;
}

export function createStageSignals(): StageSignals {
  const waits = new Map<string, { promise: Promise<Finding | null>; resolve: (f: Finding | null) => void; done: boolean }>();
  // Once the work has ended, a stage nobody had asked about yet is over too.
  let closed = false;
  const entry = (key: string) => {
    let e = waits.get(key);
    if (!e) {
      let resolve!: (f: Finding | null) => void;
      const promise = new Promise<Finding | null>((r) => {
        resolve = r;
      });
      e = { promise, resolve, done: false };
      waits.set(key, e);
      if (closed) {
        e.done = true;
        e.resolve(null);
      }
    }
    return e;
  };
  return {
    promiseFor: (key) => entry(key).promise,
    resolve: (key, finding) => {
      const e = entry(key);
      if (e.done) return;
      e.done = true;
      e.resolve(finding);
    },
    resolveAll: () => {
      closed = true;
      for (const e of waits.values()) {
        if (e.done) continue;
        e.done = true;
        e.resolve(null);
      }
    },
    resolved: (key) => closed || waits.get(key)?.done === true,
  };
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
  const finding = (key: string) => (input.awaitStage ? () => input.awaitStage!(key) : () => results()[key] ?? null);

  if (input.website) {
    const labels = websiteStageLabels(hostOf(input.website));
    return WEBSITE_STAGE_KEYS.map((key, node) => ({ id: key, label: labels[key], node, run: finding(key) }));
  }

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
