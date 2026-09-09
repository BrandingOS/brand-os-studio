/**
 * Why a card's Download cannot run — one answer, for every menu that asks.
 *
 * A menu row that produces nothing is the worst of the failures this file
 * exists to end: no file, no error, no explanation. It shipped twice for
 * Photos (QA Q13 — five rows, no file; QA Q14 — a picture of the empty
 * state under the missing photograph's name) and once for Icons, where a
 * brand with no icon set answered every row with "Nothing to export".
 *
 * The rule is the same in all three cases and is now stated once: a family
 * with no material says so IN THE MENU, on every row, before anything is
 * pressed. `downloadOptionsFor(entry, reason)` is what renders it.
 *
 * It reads the EFFECTIVE brand — the one the page is drawing, overlays
 * included — because the question is "is there anything on this card", and
 * the card is drawn from that brand and not from the stored record.
 */
import type { MockBrand } from '@/features/setup/data/mockBrand';
import type { KitEntry } from '../catalog/catalog';
import { unitKindFor } from './exportFormats';
import { photosUnavailableReason } from './photoExport';

export const NO_LOGOS_REASON =
  'This brand has no logo yet — add one in Setup and this exports every variant';
export const NO_COLORS_REASON =
  'This brand has no palette yet — add colours in Setup and this exports them';
export const NO_FONTS_REASON =
  'This brand has no typefaces yet — add them in Setup → Typography and this exports the files';
export const NO_ICONS_REASON =
  'This brand has no icon set yet — add icons from the Icons drilldown and this exports them';

/** The reason this entry cannot be downloaded, or nothing when it can. */
export function entryUnavailableReason(
  entry: KitEntry,
  brand: MockBrand | null | undefined,
): string | undefined {
  switch (unitKindFor(entry)) {
    case 'photos':
      return photosUnavailableReason(brand);
    case 'logos':
      return brand?.logos?.length ? undefined : NO_LOGOS_REASON;
    case 'colors':
      return brand?.colors?.core?.length || brand?.colors?.accent?.length
        ? undefined
        : NO_COLORS_REASON;
    case 'fonts':
      return brand?.fonts?.length ? undefined : NO_FONTS_REASON;
    case 'icons':
      return brand?.icons?.length ? undefined : NO_ICONS_REASON;
    default:
      // Everything else is DRAWN from the brand rather than assembled out
      // of files it owns, so there is always something to export.
      return undefined;
  }
}
