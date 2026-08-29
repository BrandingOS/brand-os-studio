import type { Brand } from '@/shared/types/brand';
import type { LetterContent } from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import { LetterheadExtendedRenderer } from './LetterheadExtended';

/**
 * Letterhead — wave 2. Archived, and deliberately without artwork.
 *
 * This file used to hold 100 generated designs named "Wave 2 · 01" …
 * "Wave 2 · 100". Measured (`.audit/CODE.md` §2): every one of them bound
 * exactly ONE of the letter kind's eight fields — the body — so a customer
 * who typed a recipient, a date or a subject watched all three vanish;
 * `:104` printed a whole invented letter as a literal, `:105` signed it
 * "JANE.SMITH", `:99`/`:120` addressed it to "Acme Corp · NY", `:103-116`
 * stamped it URGENT / CONFIDENTIAL / EYES_ONLY in off-brand hues, and the
 * design at `:163` was a gradient with nothing on it. Two of the three
 * designs the kit FEATURED for this family came from here.
 *
 * All 100 ids (`letterhead-ext-31` … `letterhead-ext-130`) are archived in
 * `renderers/curation/letterhead.ts`, so nothing reaches this renderer from
 * the kit, the picker, an export or the editor. The ids are never reused —
 * a customization saved against one of them stays readable, and this module
 * still answers if a dev Archive toggle asks, by drawing the kept design at
 * the same position in the curated twenty.
 *
 * The module survives because `renderers/index.tsx` and
 * `data/legacy-mapping.ts` import it, and neither is this family's to edit.
 */
interface Props {
  brand: Brand;
  templateIndex: number;
  content?: LetterContent & { picks?: TemplateDesignPicks };
}

/** How many curated designs `LetterheadExtended` offers. */
const KEPT_DESIGNS = 20;

export function LetterheadExtended2Renderer({ brand, templateIndex, content }: Props) {
  return (
    <LetterheadExtendedRenderer
      brand={brand}
      templateIndex={((templateIndex % KEPT_DESIGNS) + KEPT_DESIGNS) % KEPT_DESIGNS}
      content={content}
    />
  );
}

/**
 * The 100 reserved wave-2 ids.
 *
 * Kept at full length — and kept generated, since a generated name is
 * honest about what these were — so `curation/letterhead.ts` archives ids
 * that really exist. Every one of them is archived; none is ever shown.
 */
export const LETTERHEAD_EXTENDED_2 = Array.from({ length: 100 }, (_, i) => ({
  idSuffix: `ext-${i + 31}`,
  name: `Wave 2 · ${String(i + 1).padStart(2, '0')}`,
  category: 'Modern',
}));
