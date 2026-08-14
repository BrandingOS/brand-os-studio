/**
 * The closed vocabularies for categorical brand facts.
 *
 * Free text is unusable downstream. "Modern-ish, quite premium" and "premium,
 * modern" describe the same brand and share no token, so nothing can filter,
 * compare or recommend across them. These lists exist so those answers become
 * stable, machine-comparable members — which is the whole reason the
 * Build-with-AI prompt hands the options to the user's AI and asks it to pick.
 *
 * Three rules govern what may be in here:
 *
 *  1. **No synonym pairs.** A vocabulary with both `bold` and `energetic`
 *     filters badly, because two brands that mean the same thing land in
 *     different buckets. Every member below is a distinct axis.
 *  2. **No overlap with a field that already exists.** `illustrative` was
 *     rejected from `style` because `visualStyle.imageryStyle` already owns
 *     that concept, and `serene`/`energetic` because `voice.tone` does.
 *  3. **`Other` is always available** and preserves the user's own wording.
 *     A closed list that silently coerces is worse than free text, because the
 *     coercion is invisible.
 *
 * `id` is what persists. `label` is what a person reads. They differ so a label
 * can be reworded without invalidating every brand that chose it.
 */

export interface VocabularyMember {
  /** Stable. Persisted. Never rewritten. */
  id: string;
  /** Shown to the user. Safe to reword. */
  label: string;
  /** Optional grouping, used for chip ordering — never persisted. */
  group?: string;
}

/** The result of matching free text against a vocabulary. */
export type Normalized =
  | { kind: 'member'; member: VocabularyMember }
  /** Nothing fitted. The user's wording is kept verbatim. */
  | { kind: 'other'; text: string };

const m = (id: string, label: string, group?: string): VocabularyMember => ({ id, label, group });

/**
 * Visual style.
 *
 * Widened from the Foundation's original eight to seventeen (owner-approved,
 * plan §9b) so the vocabulary can carry filtering and recommendation later
 * rather than only covering today's screen. Grouped by the axis each member
 * varies along, which is also the chip order.
 *
 * MUST stay in sync with `StyleDescriptor` in `src/domain/brand/identity.ts`
 * and the `z.enum` in `invariants.ts`. A test asserts it.
 */
export const STYLE: VocabularyMember[] = [
  m('minimal', 'Minimal', 'Reduction'),
  m('maximal', 'Maximal', 'Reduction'),
  m('modern', 'Modern', 'Era'),
  m('classic', 'Classic', 'Era'),
  m('retro', 'Retro', 'Era'),
  m('futuristic', 'Futuristic', 'Era'),
  m('elegant', 'Elegant', 'Register'),
  m('luxury', 'Luxury', 'Register'),
  m('bold', 'Bold', 'Register'),
  m('playful', 'Playful', 'Register'),
  m('organic', 'Organic', 'Form'),
  m('geometric', 'Geometric', 'Form'),
  m('brutalist', 'Brutalist', 'Form'),
  m('editorial', 'Editorial', 'Discipline'),
  m('technical', 'Technical', 'Discipline'),
  m('corporate', 'Corporate', 'Discipline'),
  m('artisanal', 'Artisanal', 'Discipline'),
];

/** How the brand behaves. Distinct from `TONE`, which is how it speaks. */
export const PERSONALITY: VocabularyMember[] = [
  m('professional', 'Professional'),
  m('friendly', 'Friendly'),
  m('innovative', 'Innovative'),
  m('trustworthy', 'Trustworthy'),
  m('bold', 'Bold'),
  m('elegant', 'Elegant'),
  m('playful', 'Playful'),
  m('sophisticated', 'Sophisticated'),
  m('approachable', 'Approachable'),
  m('authoritative', 'Authoritative'),
  m('creative', 'Creative'),
  m('reliable', 'Reliable'),
  m('warm', 'Warm'),
  m('confident', 'Confident'),
];

/** How the brand speaks. At most one — a brand with two tones has none. */
export const TONE: VocabularyMember[] = [
  m('formal', 'Formal'),
  m('conversational', 'Conversational'),
  m('warm', 'Warm'),
  m('direct', 'Direct'),
  m('witty', 'Witty'),
  m('inspiring', 'Inspiring'),
  m('calm', 'Calm'),
  m('energetic', 'Energetic'),
  m('authoritative', 'Authoritative'),
];

/** What the brand believes. */
export const VALUES: VocabularyMember[] = [
  m('quality', 'Quality'),
  m('integrity', 'Integrity'),
  m('innovation', 'Innovation'),
  m('sustainability', 'Sustainability'),
  m('craftsmanship', 'Craftsmanship'),
  m('transparency', 'Transparency'),
  m('community', 'Community'),
  m('simplicity', 'Simplicity'),
  m('excellence', 'Excellence'),
  m('care', 'Care'),
  m('ambition', 'Ambition'),
  m('independence', 'Independence'),
  m('heritage', 'Heritage'),
  m('inclusivity', 'Inclusivity'),
];

/** What the business does. Written to Business Info, never to Core. */
export const INDUSTRY: VocabularyMember[] = [
  m('real-estate', 'Real Estate'),
  m('hospitality', 'Hospitality'),
  m('food-beverage', 'Food & Beverage'),
  m('retail', 'Retail'),
  m('fashion', 'Fashion'),
  m('health-wellness', 'Health & Wellness'),
  m('fitness', 'Fitness'),
  m('beauty', 'Beauty'),
  m('technology', 'Technology'),
  m('saas', 'SaaS'),
  m('finance', 'Finance'),
  m('legal', 'Legal'),
  m('education', 'Education'),
  m('construction', 'Construction'),
  m('manufacturing', 'Manufacturing'),
  m('logistics', 'Logistics'),
  m('automotive', 'Automotive'),
  m('travel', 'Travel'),
  m('media', 'Media'),
  m('marketing', 'Marketing'),
  m('non-profit', 'Non-profit'),
  m('agriculture', 'Agriculture'),
  m('energy', 'Energy'),
  m('entertainment', 'Entertainment'),
  m('professional-services', 'Professional Services'),
];

/** Every vocabulary, by the concept it answers. */
export const VOCABULARIES = {
  industry: INDUSTRY,
  style: STYLE,
  personality: PERSONALITY,
  tone: TONE,
  values: VALUES,
} as const;

export type VocabularyName = keyof typeof VOCABULARIES;

/** The labels, for embedding in the Build-with-AI prompt. */
export function labelsOf(name: VocabularyName): string[] {
  return VOCABULARIES[name].map((v) => v.label);
}

/** How many members a concept accepts. `tone` is deliberately singular. */
export const CARDINALITY: Record<VocabularyName, { min: number; max: number }> = {
  industry: { min: 1, max: 1 },
  style: { min: 2, max: 3 },
  personality: { min: 2, max: 4 },
  tone: { min: 1, max: 1 },
  values: { min: 3, max: 5 },
};
