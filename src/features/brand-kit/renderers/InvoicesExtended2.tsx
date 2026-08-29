import type { Brand } from '@/shared/types/brand';
import { isInvoice, type DeliverableContent } from '@/features/brandkit/content/kinds';
import { InvoicesExtendedRenderer } from './InvoicesExtended';

/**
 * Invoices — Wave 2. Retired.
 *
 * This file held 100 generated designs (`invoices-ext-23` … `-ext-122`).
 * They were generated, not designed: a single module-level
 * `ITEMS = [['Strategy', '$2,400'], …]` was mapped into all 100, every
 * total was the string `$8,300`, the client was a literal, and the
 * renderer declared no `content` prop at all — so the Quick Edit panel
 * (which is keyed by template TYPE, not by design) offered a customer
 * fields that changed nothing on screen. They also reached the customer
 * as "Wave 2 · 43" in the picker and as 100 numbered PNGs in a 16 MB zip
 * (`.audit/OURS.md` D21, D22, D52).
 *
 * All 100 ids are archived in `renderers/curation/invoices.ts`, which is
 * what removes them from the drilldown, the picker and every export while
 * keeping the ids valid for anything already saved against them. The
 * curated family is the 20 wave-1 designs in `InvoicesExtended.tsx`.
 *
 * The module stays because the shared dispatch (`renderers/index.tsx`) and
 * the template list (`data/legacy-mapping.ts`) import it, and neither is a
 * family agent's file to edit. `INVOICES_EXTENDED_2` being empty is what
 * actually stops the ids being emitted; the renderer below is only reached
 * if something asks for one anyway, and it answers with the wave-1 design
 * of the same rank rather than a blank tile.
 */
export const INVOICES_EXTENDED_2: ReadonlyArray<{
  idSuffix: string;
  name: string;
  category: string;
}> = [];

/** The ids this file used to emit, for the curation record. */
export const INVOICES_WAVE_2_IDS: ReadonlyArray<string> = Array.from(
  { length: 100 },
  (_, i) => `invoices-ext-${23 + i}`,
);

interface Props {
  brand: Brand;
  templateIndex: number;
  /** The shared dispatch spreads the whole union; narrowing is ours. */
  content?: DeliverableContent;
}

export function InvoicesExtended2Renderer({ brand, templateIndex, content }: Props) {
  return (
    <InvoicesExtendedRenderer
      brand={brand}
      templateIndex={templateIndex % 22}
      content={content && isInvoice(content) ? content : undefined}
    />
  );
}
