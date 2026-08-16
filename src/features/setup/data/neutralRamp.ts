/**
 * The canonical black→white ladder Setup shows under "Neutral Colors".
 *
 * GENERATED, not stored. It is the same 32 steps for every brand — decoration
 * the page draws, never something the brand decided — and that is exactly why
 * it lives in one place now: the read side rendered it and the write side sent
 * it straight back as `brand.neutrals`, so the first save from Setup replaced
 * whatever off-white or warm grey the brand actually owned with 32 pure greys.
 * A three-colour palette came out of onboarding and left Setup as two.
 *
 * Anything a caller finds in this list came from here. Only what is NOT in it
 * is the brand's own.
 */

/** 32 distinct words, so no two steps collide and get suffixed "Black 2". */
const NEUTRAL_NAMES = [
  'Black',     'Jet',        'Onyx',     'Obsidian',
  'Coal',      'Charcoal',   'Iron',     'Graphite',
  'Anthracite','Slate',      'Lead',     'Pewter',
  'Steel',     'Storm',      'Smoke',    'Granite',
  'Stone',     'Ash',        'Dove',     'Silver',
  'Fog',       'Mist',       'Cloud',    'Platinum',
  'Pearl',     'Linen',      'Bone',     'Ivory',
  'Eggshell',  'Snow',       'Chalk',    'White',
];

export const NEUTRAL_RAMP: ReadonlyArray<{ hex: string; name: string }> = NEUTRAL_NAMES.map(
  (name, i) => {
    const v = Math.round((i / (NEUTRAL_NAMES.length - 1)) * 255);
    const h = v.toString(16).padStart(2, '0').toUpperCase();
    return { hex: `#${h}${h}${h}`, name };
  },
);

const RAMP_HEXES: ReadonlySet<string> = new Set(NEUTRAL_RAMP.map((s) => s.hex));

/** True when this swatch is a step of the generated ladder rather than data. */
export function isRampStep(hex: string): boolean {
  return RAMP_HEXES.has(hex.toUpperCase().replace(/^#?/, '#'));
}
