/**
 * Invoices — twenty documents that add up.
 *
 * This is the family where "the design is not the data" cost the most.
 * 130 variants shipped: the legacy eight were four designs shown twice
 * each by `templateIndex % 4`, and all hundred of wave 2 came out of one
 * `ITEMS` constant with names from their loop index. Every one of them
 * printed an invented client and an invented total, and the total was a
 * STRING — so editing a price left it saying whatever it had always said.
 *
 * The bind sweep is what catches the survivors of that. An invoice that
 * declares the line items but not the tax rate is an invoice where the
 * customer changes 5% to 20%, watches the total move, and never finds out
 * why the page still says 5%.
 *
 * ## Two sweeps, because one field is conditional
 *
 * `discountRate` defaults to 0 and a zero discount is not a fact worth a
 * line on the page — so with the kind's own defaults, nothing declares
 * it, and nothing should. The second sweep supplies a real discount and
 * demands every design declare it. Both directions matter: the first
 * proves no design invents a discount nobody gave, the second proves
 * every design has somewhere to put one.
 *
 * ## Why `currency` is declared on the TOTAL
 *
 * The total is derived and deliberately not editable — a figure a
 * customer can type over is a figure that can disagree with the numbers
 * above it. But the currency it is quoted in IS theirs, and the total is
 * where a reader looks to find out what currency an invoice is in, so
 * that is the control the total's own region opens.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { variantsForCard } from '../../data/legacy-mapping';
import { DEFAULT_FEATURED_IDS_BY_LABEL, isGeneratedName } from '../../data/cardPresentation';
import { curatedName, isArchived, tagsFor } from '../curation';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  renderAllVariants,
} from '../__guards__/bindSweep';
import { INVOICES_EXTENDED } from '../InvoicesExtended';
import { INVOICES_WAVE_2_IDS } from '../InvoicesExtended2';

afterEach(cleanup);

const SECTION = 'stationery';
const LABEL = 'Invoice';

const KEPT_IDS = [
  'invoices-ext-1', 'invoices-ext-2', 'invoices-ext-3', 'invoices-ext-4',
  'invoices-ext-5', 'invoices-ext-6', 'invoices-ext-7', 'invoices-ext-8',
  'invoices-ext-9', 'invoices-ext-10', 'invoices-ext-11', 'invoices-ext-12',
  'invoices-ext-13', 'invoices-ext-14', 'invoices-ext-15', 'invoices-ext-16',
  'invoices-ext-17', 'invoices-ext-19', 'invoices-ext-20', 'invoices-ext-21',
];

/**
 * Everything the `invoice` panel offers except `discountRate`, which the
 * defaults set to zero. List items are addressed at row 0 — the panel's
 * control is the list, the artwork's paths are its members.
 */
const INVOICE_PATHS = [
  'issuerName',
  'issuerAddress',
  'clientName',
  'clientAddress',
  'number',
  'issueDate',
  'dueDate',
  'currency',
  'lineItems.0.label',
  'lineItems.0.qty',
  'lineItems.0.unitPrice',
  'taxRate',
  'notes',
];

/** The kind's defaults with a real discount, which they deliberately lack. */
function invoiceWithADiscount(): DeliverableContent {
  const base = hydrateContent('invoice', mockBrand, undefined);
  return { ...base, discountRate: 10 } as DeliverableContent;
}

describe('invoices — curation', () => {
  it('shows twenty designs, not a hundred and thirty', () => {
    const shown = variantsForCard(SECTION, LABEL, mockBrand);
    expect(shown.map((t) => t.id)).toEqual(KEPT_IDS);
  });

  it('archives the legacy eight and the whole of wave 2, reserving every id', () => {
    // The legacy eight reach their artwork through `renderTemplateDesign`,
    // which carries no content — they could never be made editable
    // without changing a dispatch this family does not own.
    for (let n = 1; n <= 8; n += 1) expect(isArchived(`invoices-${n}`), `invoices-${n}`).toBe(true);
    expect(INVOICES_WAVE_2_IDS).toHaveLength(100);
    for (const id of INVOICES_WAVE_2_IDS) expect(isArchived(id), id).toBe(true);
    // Two wave-1 designs went too: a second stamp motif beside `ext-5`,
    // and the weakest of the editorial group.
    expect(isArchived('invoices-ext-18')).toBe(true);
    expect(isArchived('invoices-ext-22')).toBe(true);
    for (const id of KEPT_IDS) expect(isArchived(id), id).toBe(false);
    expect(INVOICES_EXTENDED).toHaveLength(22);
  });

  it('gives every kept design a designer’s name and its filter chips', () => {
    for (const template of variantsForCard(SECTION, LABEL, mockBrand)) {
      expect(curatedName(template.id), template.id).toBeTruthy();
      expect(template.name).toBe(curatedName(template.id));
      expect(isGeneratedName(template.name), template.id).toBe(false);
      expect(tagsFor(template.id).length, template.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('names no two designs the same', () => {
    const names = KEPT_IDS.map((id) => curatedName(id));
    expect(new Set(names).size).toBe(names.length);
  });

  it('features three of the twenty, none of them a generator’s output', () => {
    const featured = DEFAULT_FEATURED_IDS_BY_LABEL[LABEL] ?? [];
    expect(featured).toHaveLength(3);
    for (const id of featured) {
      expect(KEPT_IDS).toContain(id);
      expect(isGeneratedName(curatedName(id)), id).toBe(false);
    }
  });
});

describe('invoices — binding', () => {
  it('knows the field paths the invoice panel offers', () => {
    const panel = fieldPathsForFamily('invoices');
    expect(panel).toEqual(
      expect.arrayContaining([...INVOICE_PATHS, 'discountRate']),
    );
    expect(panel).toHaveLength(INVOICE_PATHS.length + 1);
  });

  it('binds every field in every kept design', () => {
    assertFullyBound({ sectionKey: SECTION, storageLabel: LABEL }, INVOICE_PATHS);
  });

  it('leaves no design unbound', () => {
    const results = renderAllVariants(SECTION, LABEL);
    expect(results).toHaveLength(20);
    expect(boundVariantCount(results)).toBe(20);
  });

  it('states a discount on every design once there is one to state', () => {
    assertFullyBound(
      { sectionKey: SECTION, storageLabel: LABEL, content: invoiceWithADiscount() },
      [...INVOICE_PATHS, 'discountRate'],
    );
  });

  it('invents no discount when there is none', () => {
    // The inverse of the sweep above, and the reason the default is zero:
    // a line reading "Discount 0% · −$0" is a term nobody agreed.
    for (const result of renderAllVariants(SECTION, LABEL)) {
      expect(result.paths, result.template.id).not.toContain('discountRate');
    }
  });

  it('declares every line item the design shows, not only the first', () => {
    // Rows are capped at what a design has room for and the remainder is
    // counted. Whatever it SHOWS has to be editable, or the customer
    // edits row three and watches row three not change.
    for (const result of renderAllVariants(SECTION, LABEL)) {
      const rows = new Set(
        result.paths
          .filter((p) => p.startsWith('lineItems.'))
          .map((p) => p.split('.')[1]),
      );
      expect(rows.size, result.template.id).toBeGreaterThan(0);
      for (const row of rows) {
        for (const leaf of ['label', 'qty', 'unitPrice']) {
          expect(result.paths, `${result.template.id} row ${row}`).toContain(
            `lineItems.${row}.${leaf}`,
          );
        }
      }
    }
  });

  it('declares nothing it cannot edit', () => {
    const known = new Set([...INVOICE_PATHS, 'discountRate']);
    for (const result of renderAllVariants(SECTION, LABEL, undefined, {
      content: invoiceWithADiscount(),
    })) {
      for (const path of result.paths) {
        const normalised = path.replace(/^lineItems\.\d+\./, 'lineItems.0.');
        expect(known.has(normalised), `${result.template.id} declares ${path}`).toBe(true);
      }
    }
  });
});
