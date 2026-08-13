/**
 * A proposal is a Core value that has not been decided yet.
 *
 * There is no proposal store. Once written, a proposal IS the Core value plus
 * its `CoreValueMeta`, and "still a proposal" means an authority below
 * `confirmed`. That is the whole model — it keeps brand values in exactly one
 * place (Principle II) and makes proposals survive a closed tab for free,
 * because they live on the brand.
 *
 * This module holds the type, the closed source → path map, and the grouping
 * the review renders. It performs no writes and reads no store.
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
 * The review's sections.
 *
 * Five, fixed, and ordered from most concrete to most abstract — a person
 * recognises their logo instantly and needs a moment to read a mission
 * statement. `material` is a section but carries no proposals: a file is not a
 * claim about the brand, so it is listed, not reviewed.
 */
export const REVIEW_SECTIONS = ['identity', 'visual', 'thinking', 'business', 'material'] as const;
export type ReviewSection = (typeof REVIEW_SECTIONS)[number];

export const SECTION_LABEL: Record<ReviewSection, string> = {
  identity: 'Identity',
  visual: 'Visual direction',
  thinking: 'Brand thinking',
  business: 'Business',
  material: 'Material',
};

/** Human label for a Core path, in the user's words rather than the schema's. */
export const PATH_LABEL: Partial<Record<CoreFieldPath, string>> = {
  'colors.primary': 'Colours',
  'typography.primary': 'Typeface',
  'typography.secondary': 'Second typeface',
  'strategy.mission': 'Mission',
  'strategy.vision': 'Where it’s going',
  'strategy.values': 'What it stands for',
  'strategy.positioning': 'Where it sits',
  'strategy.targetAudience': 'Who it’s for',
  'voice.tone': 'How it sounds',
};

/** Which section a proposal belongs to. Anything unmapped is not proposed. */
export function sectionFor(path: CoreFieldPath): ReviewSection | null {
  if (path.startsWith('logos.')) return 'identity';
  if (path.startsWith('colors.') || path.startsWith('typography.') || path.startsWith('visualStyle.')) {
    return 'visual';
  }
  if (path.startsWith('strategy.') || path.startsWith('voice.')) return 'thinking';
  if (path.startsWith('positioning.')) return 'business';
  return null;
}

/** Groups proposals for rendering, preserving each section's fixed order. */
export function groupBySection(proposals: Proposal[]): Array<{ section: ReviewSection; items: Proposal[] }> {
  const out: Array<{ section: ReviewSection; items: Proposal[] }> = [];
  for (const section of REVIEW_SECTIONS) {
    const items = proposals.filter((p) => sectionFor(p.corePath) === section);
    // An empty section is NOT rendered. Drawing "Type: none" is what turns a
    // review into a form; the schema stays underneath.
    if (items.length) out.push({ section, items });
  }
  return out;
}
