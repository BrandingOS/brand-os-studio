/**
 * The colours a deliverable editor offers.
 *
 * The editors used to offer `core + accent + grey`, and `grey` is the
 * GENERATED 32-step ladder every brand is drawn with — so a brand with eight
 * colours got a picker of thirty-nine. Two of the ladder's decorative names
 * collided with the brand's own (`Charcoal` / `Charcoal 2`, `Pearl` /
 * `Pearl 2`) and one of its hexes duplicated a brand colour outright
 * (`Graphite #3A3A3A` == `Charcoal #3A3A3A`), so the picker made the brand's
 * palette impossible to find inside a wall of near-identical greys and then
 * lied about which was which (QA Q16). D37/D39 fixed exactly this in the
 * EXPORTS and left it standing in the editor UI.
 *
 * What is offered instead:
 *
 *  • **The brand's own palette first**, through `paletteFromMockBrand` —
 *    the same function the exports use, so the swatch list and the shipped
 *    `colors/` folder can never disagree about what the brand owns.
 *  • **Then a short neutral ladder**, because a black and a near-white are
 *    genuinely useful on a business card and a brand does not always own
 *    one. Nine steps, not thirty-two; named for their POSITION on the ladder
 *    rather than with a decorative word, so no neutral can ever collide with
 *    a colour someone chose; and any step whose hex the brand already owns is
 *    dropped, so the same colour is never offered twice under two names.
 */
import { NEUTRAL_RAMP } from '@/features/setup/data/neutralRamp';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { normalizeHex, paletteFromMockBrand } from './colorPaletteExport';

export type EditorSwatch = {
  hex: string;
  name: string;
  /** A step of the generated ladder, not a colour the brand chose. */
  neutral?: boolean;
};

/** How many steps of the 32-step ladder are worth offering. */
const NEUTRAL_STEPS = 9;

/** Evenly spaced indices into the ramp, ends included. */
function ladderIndices(total: number, want: number): number[] {
  if (total <= want) return Array.from({ length: total }, (_, i) => i);
  return Array.from({ length: want }, (_, i) => Math.round((i * (total - 1)) / (want - 1)));
}

export function editorSwatches(brand: Pick<MockBrand, 'colors'>): EditorSwatch[] {
  const own = paletteFromMockBrand(brand).map((c) => ({
    hex: c.hex,
    name: c.name,
  }));
  const taken = new Set(own.map((c) => normalizeHex(c.hex)));

  const neutrals: EditorSwatch[] = [];
  for (const at of ladderIndices(NEUTRAL_RAMP.length, NEUTRAL_STEPS)) {
    const step = NEUTRAL_RAMP[at]!;
    const hex = normalizeHex(step.hex);
    if (taken.has(hex)) continue;
    taken.add(hex);
    // The ladder is a lightness ramp, so its position IS its meaning.
    const level = Math.round((at / (NEUTRAL_RAMP.length - 1)) * 100);
    neutrals.push({ hex: step.hex, name: `Neutral ${level}`, neutral: true });
  }

  return [...own, ...neutrals];
}
