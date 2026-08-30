import type { FamilyCuration } from './types';
import { INVOICES_WAVE_2_IDS } from '../InvoicesExtended2';

/**
 * Owned by the invoices family. Names, archived ids and tags — nothing else.
 *
 * The family shipped 130 variants and offered 20. What was culled, and why:
 *
 *   • **The legacy eight** (`invoices-1` … `-8`) were four designs shown
 *     twice each by `InvoiceRenderer`'s `templateIndex % 4`, every one
 *     printing an invented client and an invented total. They reach the
 *     artwork through `renderTemplateDesign`, which carries no content, so
 *     they could never be made editable without changing a dispatch this
 *     family does not own.
 *   • **All 100 of wave 2** (`invoices-ext-23` … `-ext-122`) were generated
 *     from one `ITEMS` constant, named by their loop index ("Wave 2 · 43"),
 *     and bound nothing. One of them — `-ext-72`, the audit's wave-2 #50 —
 *     also overflowed its client name out of the pill it was drawn in
 *     (`.audit/OURS.md` D52). See `InvoicesExtended2.tsx`.
 *   • **`ext-18` Stamp Header** — a second stamp motif beside `ext-5`, and
 *     the round badge reads as a smudge at tile size.
 *   • **`ext-22` Ledger Lines** — the weakest of the editorial group; its
 *     reading is `ext-13`'s with a rule under it.
 *
 * Archiving, not deleting: every id above stays a valid persistence key, so
 * a customer who saved a customization against one still has it, and the
 * `-ext-N` → design index arithmetic in `InvoicesExtended.tsx` is untouched.
 */
export const curation: FamilyCuration = {
  archived: [
    ...Array.from({ length: 8 }, (_, i) => `invoices-${i + 1}`),
    'invoices-ext-18',
    'invoices-ext-22',
    ...INVOICES_WAVE_2_IDS,
  ],

  names: {
    'invoices-ext-1': 'Classic Pro',
    'invoices-ext-2': 'Side Stripe',
    'invoices-ext-3': 'Editorial Header',
    'invoices-ext-4': 'Brute Force',
    'invoices-ext-5': 'Stamped Due',
    'invoices-ext-6': 'Two-Colour Bands',
    'invoices-ext-7': 'Bottom Heavy',
    'invoices-ext-8': 'Receipt Roll',
    'invoices-ext-9': 'Index Card',
    'invoices-ext-10': 'Colour Wash',
    'invoices-ext-11': 'Numbered Items',
    'invoices-ext-12': 'Architectural',
    'invoices-ext-13': 'Big Title Light',
    'invoices-ext-14': 'Brand Border',
    'invoices-ext-15': 'Thank You Note',
    'invoices-ext-16': 'Side Totals',
    'invoices-ext-17': 'Mono Document',
    'invoices-ext-19': 'Diagonal Header',
    'invoices-ext-20': 'Itemised Cards',
    'invoices-ext-21': 'Centred Total',
  },

  /**
   * Two to three chips per design: what trade it suits, what job it does,
   * and how it looks. `Studio` / `Agency` / `Retail` / `Trades` are the
   * industry read; `Statement`, `Receipt`, `Quote`, `Reminder` the intent.
   */
  tags: {
    'invoices-ext-1': ['Agency', 'Statement', 'Classic'],
    'invoices-ext-2': ['Studio', 'Statement', 'Modern'],
    'invoices-ext-3': ['Studio', 'Statement', 'Editorial'],
    'invoices-ext-4': ['Tech', 'Statement', 'Bold'],
    'invoices-ext-5': ['Trades', 'Reminder', 'Vintage'],
    'invoices-ext-6': ['Retail', 'Statement', 'Colourful'],
    'invoices-ext-7': ['Agency', 'Reminder', 'Bold'],
    'invoices-ext-8': ['Retail', 'Receipt', 'Vintage'],
    'invoices-ext-9': ['Studio', 'Statement', 'Editorial'],
    'invoices-ext-10': ['Agency', 'Statement', 'Colourful'],
    'invoices-ext-11': ['Trades', 'Quote', 'Modern'],
    'invoices-ext-12': ['Trades', 'Quote', 'Technical'],
    'invoices-ext-13': ['Studio', 'Statement', 'Minimal'],
    'invoices-ext-14': ['Retail', 'Statement', 'Bold'],
    'invoices-ext-15': ['Studio', 'Receipt', 'Warm'],
    'invoices-ext-16': ['Agency', 'Quote', 'Modern'],
    'invoices-ext-17': ['Legal', 'Statement', 'Minimal'],
    'invoices-ext-19': ['Tech', 'Statement', 'Bold'],
    'invoices-ext-20': ['Retail', 'Quote', 'Modern'],
    'invoices-ext-21': ['Trades', 'Reminder', 'Editorial'],
  },
};
