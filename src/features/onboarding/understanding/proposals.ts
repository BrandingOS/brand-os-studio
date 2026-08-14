/**
 * A proposal is a Core value that has not been decided yet.
 *
 * There is no proposal store. Once written, a proposal IS the Core value plus
 * its `CoreValueMeta`, and "still a proposal" means an authority below
 * `confirmed`. That is the whole model — it keeps brand values in exactly one
 * place (Principle II) and makes proposals survive a closed tab for free,
 * because they live on the brand.
 *
 * This module holds the type, the section map and the labels the review
 * renders. It performs no writes and reads no store.
 */
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import type { Provenance } from '@/domain/brand/coreMeta';

/** Provenances a machine may claim. `user-entered` is not one of them. */
export type ProposalProvenance = Extract<Provenance, 'ai-suggested' | 'inferred'>;

export interface Proposal {
  /** Closed registry — never a free-form string. */
  corePath: CoreFieldPath;
  /** Shaped for the canonical op that will write it. */
  value: unknown;
  provenance: ProposalProvenance;
  /**
   * What the belief rests on, in the user's language — "your description",
   * "logo.svg". Rendered as the origin line under the value, which is how the
   * review distinguishes what we worked out from what the user gave us without
   * a badge on every row.
   */
  evidence: string;
}

/**
 * Business facts, which are NOT Core.
 *
 * These describe what the business IS rather than what the brand looks and
 * sounds like, so they live in Business Info and carry no authority sidecar:
 * an edit saves them and there is nothing to confirm. The review never explains
 * this — FR-070 forbids exposing the model — it simply behaves correctly.
 *
 * Deliberately NOT mirrored into `positioning.category`, which is a distinct
 * Core concept (the market category a brand competes in).
 */
export interface BusinessFacts {
  /** A vocabulary member id, or the user's own wording. */
  industry?: string;
  tagline?: string;
  /** Products and services, comma-joined for `businessInfo.description`. */
  description?: string;
  audienceSummary?: string;
  website?: string;
}

/**
 * The review's sections.
 *
 * The composition and order of the flow this restores — a person recognises
 * their logo instantly and needs a moment to read a mission. `links` and
 * `assets` are sections but carry no Core proposals: a file is not a claim
 * about the brand, so it is listed, not reviewed.
 */
export const REVIEW_SECTIONS = ['logos', 'colors', 'fonts', 'links', 'about', 'library'] as const;
export type ReviewSection = (typeof REVIEW_SECTIONS)[number];

export const SECTION_LABEL: Record<ReviewSection, string> = {
  logos: 'Logos',
  colors: 'Colors',
  fonts: 'Fonts',
  links: 'Links',
  about: 'About',
  library: 'Brand assets',
};

/** Human label for a Core path, in the user's words rather than the schema's. */
export const PATH_LABEL: Partial<Record<CoreFieldPath, string>> = {
  'colors.primary': 'Colours',
  'typography.primary': 'Typeface',
  'typography.secondary': 'Second typeface',
  'visualStyle.descriptors': 'Style',
  'strategy.mission': 'Mission',
  'strategy.vision': 'Where it’s going',
  'strategy.values': 'Values',
  'strategy.positioning': 'Where it sits',
  'strategy.personality': 'Personality',
  'strategy.targetAudience': 'Who it’s for',
  'voice.tone': 'Tone',
};

/**
 * Which Core paths are chosen from a controlled vocabulary.
 *
 * The review renders these as chips and everything else as text — FR-068's
 * rule that meaningful prose must not become an artificial dropdown.
 */
export const PATH_VOCABULARY: Partial<Record<CoreFieldPath, 'style' | 'personality' | 'tone' | 'values'>> = {
  'visualStyle.descriptors': 'style',
  'strategy.personality': 'personality',
  'voice.tone': 'tone',
  'strategy.values': 'values',
};

/** Which section a proposal belongs to. Anything unmapped is not proposed. */
export function sectionFor(path: CoreFieldPath): ReviewSection | null {
  if (path.startsWith('logos.')) return 'logos';
  if (path.startsWith('colors.')) return 'colors';
  if (path.startsWith('typography.')) return 'fonts';
  if (
    path.startsWith('strategy.') ||
    path.startsWith('voice.') ||
    path.startsWith('visualStyle.') ||
    path.startsWith('positioning.')
  ) {
    return 'about';
  }
  return null;
}

/** Groups proposals for rendering, preserving each section's fixed order. */
export function groupBySection(proposals: Proposal[]): Array<{ section: ReviewSection; items: Proposal[] }> {
  const out: Array<{ section: ReviewSection; items: Proposal[] }> = [];
  for (const section of REVIEW_SECTIONS) {
    const items = proposals.filter((p) => sectionFor(p.corePath) === section);
    // An empty section is NOT rendered from proposals alone. Drawing
    // "Type: none" is what turns a review into a form; the schema stays
    // underneath.
    if (items.length) out.push({ section, items });
  }
  return out;
}

/** The order the About section lists its rows in — most concrete first. */
export const ABOUT_ORDER: CoreFieldPath[] = [
  'visualStyle.descriptors',
  'strategy.personality',
  'voice.tone',
  'strategy.values',
  'strategy.mission',
  'strategy.targetAudience',
  'strategy.positioning',
  'strategy.vision',
];
