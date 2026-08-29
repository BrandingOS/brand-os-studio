import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import { NotecardExtendedRenderer } from './NotecardExtended';

/**
 * Notecard, wave 2 — archived in full.
 *
 * A hundred generated designs named `Wave 2 · 01` … `Wave 2 · 100`,
 * carrying invented greetings and a signature reading "Jane", an issue
 * number, a season, an off-brand status dot, and the same ten-motif
 * "Pentagram" block this repo also pasted into `LetterheadExtended2`,
 * `EnvelopeExtended2` and `InvoicesExtended2`.
 *
 * Every id is archived in `curation/notecard.ts`. The list below keeps
 * the exact `ext-31 … ext-130` suffixes so those keys stay reserved — ids
 * are persistence keys and are never renumbered or reused — and the
 * renderer paints the family's reference design so a stale reference is
 * an ordinary notecard rather than a hole. See `EnvelopeExtended2.tsx`
 * for the same reasoning at length.
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  content?: DeliverableContent;
}

export function NotecardExtended2Renderer({ brand, content }: Props) {
  return <NotecardExtendedRenderer brand={brand} templateIndex={0} content={content} />;
}

/** Reserved ids — `ext-31 … ext-130`. Every one of them is archived. */
export const NOTECARD_EXTENDED_2 = Array.from({ length: 100 }, (_, i) => ({
  idSuffix: `ext-${i + 31}`,
  name: `Wave 2 · ${String(i + 1).padStart(2, '0')}`,
  category: 'Modern',
}));
