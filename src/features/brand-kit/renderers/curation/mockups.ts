import type { FamilyCuration } from './types';
import { curationFor } from '../MockupScene';
import { MUG_SCENES } from '../MockupMugExtended';
import { TSHIRT_SCENES } from '../MockupTShirtExtended';
import { TOTE_SCENES } from '../MockupToteExtended';
import { STICKER_SCENES } from '../MockupStickerExtended';
import { BILLBOARD_SCENES } from '../MockupBillboardExtended';
import { MOCKUP_SCENES } from '../MockupsExtended';

/**
 * Owned by the mockups family. Names, archived ids and tags — nothing else.
 *
 * The family arrived as five hidden renderers of thirty designs each plus a
 * twenty-design grab-bag: 170 variants, none bound, none contrast-checked,
 * every one of them naming a hardcoded studio grey and printing the brand's
 * initial as a literal. It ships as 48 vector scenes — six per card across
 * eight cards — and everything else is archived.
 *
 * Names and tags are READ FROM THE SCENES rather than retyped here: a
 * design's name is part of the design, and a second hand-kept copy of 48
 * names drifts the first time one is renamed. `curationFor` is the same
 * derivation for every mockup module.
 */

/** `mockup-mug-ext-7` … `mockup-mug-ext-30`, and the same for four others. */
function retired(prefix: string, from: number, to: number): string[] {
  const ids: string[] = [];
  for (let n = from; n <= to; n += 1) ids.push(`${prefix}-ext-${n}`);
  return ids;
}

/**
 * Everything culled, by id.
 *
 * The five per-artifact families kept `ext-1…6` and retired `ext-7…30`.
 * The shared `mockups` type retired its whole original range —
 * `mockups-ext-1…20`, the phone case / wine bottle / concert ticket set —
 * because the range Signage, Business Card Stack and Device Screen now
 * occupy starts at 21 rather than reusing a key somebody may have saved
 * against.
 */
export const MOCKUP_ARCHIVED_IDS: string[] = [
  ...retired('mockup-mug', 7, 30),
  ...retired('mockup-tshirt', 7, 30),
  ...retired('mockup-tote', 7, 30),
  ...retired('mockup-sticker', 7, 30),
  ...retired('mockup-billboard', 7, 30),
  ...retired('mockups', 1, 20),
];

const FAMILIES = [
  curationFor('mockup-mug', MUG_SCENES),
  curationFor('mockup-tshirt', TSHIRT_SCENES),
  curationFor('mockup-tote', TOTE_SCENES),
  curationFor('mockup-sticker', STICKER_SCENES),
  curationFor('mockup-billboard', BILLBOARD_SCENES),
  // Signage + Business Card Stack + Device Screen, all on the `mockups`
  // type, so one derivation covers the three of them.
  curationFor('mockups', MOCKUP_SCENES),
];

export const MOCKUP_NAMES: Record<string, string> = Object.assign(
  {},
  ...FAMILIES.map((f) => f.names),
);

export const MOCKUP_TAGS: Record<string, string[]> = Object.assign(
  {},
  ...FAMILIES.map((f) => f.tags),
);

export const curation: FamilyCuration = {
  names: MOCKUP_NAMES,
  tags: MOCKUP_TAGS,
  archived: MOCKUP_ARCHIVED_IDS,
};
