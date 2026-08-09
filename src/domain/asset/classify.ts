/**
 * The ONE asset-classification boundary (Stage 2C).
 *
 * Every new/migrated path that needs to decide "what kind of asset is this?"
 * calls `classifyAsset` — replacing the scattered ad-hoc inference. Precedence:
 *
 *   1. explicitKind   — a manual correction ALWAYS wins (the human is right).
 *   2. file type       — fonts and documents are determined by their bytes, not
 *                        by any suggestion (a .ttf is a font even if an AI guessed
 *                        "logo").
 *   3. suggestedKind   — a hint from upload context OR AI (e.g. brand-vision).
 *                        AI/context may distinguish logo vs icon vs image, which
 *                        a mime type cannot — but it is only a suggestion.
 *   4. default 'image' — any remaining raster/vector with no role.
 *
 * AI classification therefore AUGMENTS but is never the canonical truth on its
 * own, and manual correction always remains possible.
 */
import type { AssetKind } from './asset';

export interface ClassifyInput {
  mime?: string;
  filename?: string;
  /** Manual/user-set kind — authoritative. */
  explicitKind?: AssetKind;
  /** Context- or AI-suggested kind (e.g. brand-vision). A hint only. */
  suggestedKind?: AssetKind;
}

const FONT_EXT = /\.(ttf|otf|woff2?|eot)$/i;
const FONT_MIME = /^(font\/|application\/(x-font-|vnd\.ms-fontobject|font-))/i;
const DOC_EXT = /\.pdf$/i;

function isFont(i: ClassifyInput): boolean {
  return (!!i.mime && FONT_MIME.test(i.mime)) || (!!i.filename && FONT_EXT.test(i.filename));
}

function isDocument(i: ClassifyInput): boolean {
  return i.mime === 'application/pdf' || (!!i.filename && DOC_EXT.test(i.filename));
}

/** Single source of asset-kind classification. */
export function classifyAsset(input: ClassifyInput): AssetKind {
  // 1. Manual correction wins outright.
  if (input.explicitKind) return input.explicitKind;

  // 2. Deterministic file-type rules override any suggestion.
  if (isFont(input)) return 'font';
  if (isDocument(input)) return 'document';

  // 3. Context/AI hint (logo vs icon vs image — undecidable from mime alone).
  if (input.suggestedKind) return input.suggestedKind;

  // 4. Default.
  return 'image';
}
