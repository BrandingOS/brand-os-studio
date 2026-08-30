import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import { EnvelopeExtendedRenderer } from './EnvelopeExtended';

/**
 * Envelope, wave 2 — archived in full.
 *
 * This file held a hundred generated designs named `Wave 2 · 01` …
 * `Wave 2 · 100`. The audit found "Jane Smith" in roughly seventy of
 * them, `jane@…` addresses, 99 hardcoded hexes that belonged to no
 * brand, and the same ten-motif "Pentagram" block copy-pasted into
 * `LetterheadExtended2`, `NotecardExtended2` and `InvoicesExtended2`
 * as well — so a customer browsing four different stationery families
 * was shown the same ten pictures four times.
 *
 * All hundred ids are archived in `curation/envelope.ts`. Two things
 * follow from that, and both are why this file still exists rather than
 * being deleted:
 *
 *   • **The ids stay reserved.** `ENVELOPE_EXTENDED_2` keeps its exact
 *     `ext-31 … ext-130` suffixes so no future design can be numbered
 *     onto a key somebody's saved customization already occupies. Ids
 *     are persistence keys; they are never renumbered and never reused.
 *   • **A stale reference still paints an envelope.** Anything holding
 *     one of these ids from before the curation — a saved featured
 *     list, an export manifest — renders the family's reference design
 *     rather than a hole, and the content it was saved with comes with
 *     it.
 *
 * There is nothing to restore here. Wave 2's designs were not culled for
 * being crowded; they were culled for being placeholders.
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  content?: DeliverableContent;
}

export function EnvelopeExtended2Renderer({ brand, content }: Props) {
  return <EnvelopeExtendedRenderer brand={brand} templateIndex={0} content={content} />;
}

/** Reserved ids — `ext-31 … ext-130`. Every one of them is archived. */
export const ENVELOPE_EXTENDED_2 = Array.from({ length: 100 }, (_, i) => ({
  idSuffix: `ext-${i + 31}`,
  name: `Wave 2 · ${String(i + 1).padStart(2, '0')}`,
  category: 'Modern',
}));
