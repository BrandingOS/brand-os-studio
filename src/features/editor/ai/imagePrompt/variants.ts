// variants — make four candidates four IDEAS, not four samples of one.
//
// Why this exists
// ───────────────
// Asking for four images sent one prompt with `count: 4`. Every production model
// Auto can route to declares `supportsSeed: false`, so the seed never reached a
// vendor either. Four candidates were therefore four draws from one conditioning:
// the same layout, the same light, the same idea, with the cup moved. A batch
// felt like one photograph taken four times, which is the opposite of what a
// person asks four for.
//
// So the batch is planned. Candidate 0 is always the straight reading of the
// request — whoever asked for one image, or wants the safe answer, gets it
// first. Every later candidate is pushed along the axes that actually change a
// design, chosen to be maximally distant from what has already been planned
// rather than randomly sampled: two type-dominant layouts in a batch of four is
// a wasted generation.
//
// What NEVER varies: the copy, the logo fidelity rule, the safe margin, the
// exclusions, and the identity of the subject. Those are the brief. Varying them
// would not be exploring the idea, it would be four different briefs.

import type { FormatContract } from './formatBriefs';

export interface VariantDirective {
  /** 0-based position in the batch. 0 is the straight reading. */
  index: number;
  archetype: string;
  crop: string;
  lighting: string;
  typeTreatment: string;
  colourDominance: string;
  medium: string;
}

const CROPS = [
  'the subject in its context, at a natural distance',
  'a tight macro crop — the subject fills nearly the whole frame',
  'a wide environmental shot — the subject occupies a quarter of the frame or less',
  'an overhead flat-lay, looking straight down',
];

const LIGHTING = [
  'hard directional sun throwing one clean graphic shadow',
  'soft north-window light, low contrast, no visible source',
  'night, lit by warm practical lights in the scene itself',
  'studio seamless, one large soft source with a black flag opposite',
  'backlit, a bright rim separating the subject from a darker ground',
];

const TYPE_TREATMENTS = [
  'oversized display type, tight tracking, set on two lines',
  'small caps gathered into a corner lockup with generous space around it',
  'type integrated into a surface in the scene itself — printed, painted or carved',
  'a stacked, flush-left column running down the long axis',
];

const COLOUR_DOMINANCE = [
  'the brand primary fills the ground; type reverses out of it',
  'a brand neutral fills the ground; the primary carries the type',
  'duotone, built from the two brand colours only',
  'full photographic colour, with the brand colour present as one accent object',
];

const MEDIA = [
  'photography',
  'graphic and vector, flat colour',
  'mixed — a photographic subject placed on a flat graphic field',
];

/** Cheap, stable string hash. Same prompt ⇒ same batch plan, so a rerun repeats. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Plan `n` directives for one batch.
 *
 * `archetypes` comes from the format contract, so a billboard explores
 * billboard layouts and a business card explores card layouts — the axes move,
 * the deliverable's own grammar does not.
 */
export function planVariants(
  n: number,
  contract: FormatContract,
  seedText: string,
  kind: 'design' | 'image',
): VariantDirective[] {
  const count = Math.max(1, Math.min(4, Math.trunc(n) || 1));
  const seed = hash(seedText);
  const archetypes = contract.archetypes.length ? contract.archetypes : ['image-dominant with a type block'];

  // Offsets are co-prime-ish strides from the seed so successive candidates land
  // far apart in each list rather than adjacent to one another.
  const pick = <T,>(list: T[], i: number, stride: number): T =>
    list[(seed + i * stride) % list.length];

  return Array.from({ length: count }, (_, i) => {
    if (i === 0) {
      // The straight reading. Still specified — an unspecified candidate is the
      // thin one — but specified conservatively.
      return {
        index: 0,
        archetype: archetypes[0],
        crop: CROPS[0],
        lighting: pick(LIGHTING, seed, 1),
        typeTreatment: kind === 'design' ? TYPE_TREATMENTS[0] : '',
        colourDominance: pick(COLOUR_DOMINANCE, seed, 1),
        medium: MEDIA[0],
      };
    }
    return {
      index: i,
      // Archetype moves first and fastest: it is the axis that most changes
      // what the piece IS.
      archetype: archetypes[i % archetypes.length],
      crop: pick(CROPS, i, 1),
      lighting: pick(LIGHTING, i, 2),
      typeTreatment: kind === 'design' ? pick(TYPE_TREATMENTS, i, 1) : '',
      colourDominance: pick(COLOUR_DOMINANCE, i, 3),
      // Keep most of a batch photographic; one alternative medium is exploration,
      // three is a different product.
      medium: i === 2 ? pick(MEDIA, i, 1) : MEDIA[0],
    };
  });
}

/** The VARIANT block, or '' for a single-image request that needs no framing. */
export function variantSection(v: VariantDirective, total: number): string {
  if (total <= 1) return '';
  const parts = [v.archetype, v.crop, v.lighting, v.typeTreatment, v.colourDominance, v.medium]
    .map((p) => p.trim())
    .filter(Boolean);
  return `VARIANT — exploration ${v.index + 1} of ${total}. Take this reading: ${parts.join('; ')}.`;
}
