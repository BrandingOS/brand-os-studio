import type { FamilyCuration } from './types';
import { QR_ARCHIVED_IDS, QR_NAMES, QR_TAGS } from '../QrCodeExtended';

/**
 * Owned by the qr family — Branded, Minimal, Rounded and Square.
 *
 * A hundred and twenty stills became twenty-four: six presentations for
 * each of the four styles. The old lists were `[...stills, ...stills,
 * ...stills]` — ten designs offered three times each — so two thirds of
 * every card was the same picture under a different number. The ninety-six
 * culled ids (`…-ext-7`…`-ext-30` in each of the four) stay reserved and
 * stay readable as persistence keys.
 *
 * The maps are READ FROM THE RENDERER: the six presentation names are
 * shared by all four styles because they ARE the same six readings of a
 * code, and a second copy here would be four more places to rename.
 */
export const curation: FamilyCuration = {
  names: QR_NAMES,
  tags: QR_TAGS,
  archived: QR_ARCHIVED_IDS,
};
