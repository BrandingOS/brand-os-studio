/**
 * The worked example for the bind sweep.
 *
 * Invoices is the only family with any binding today (`contentBinding.ts`:
 * designs 1-8 of the Wave 1 renderer; Wave 2 takes no content prop at all),
 * so it is the family this test measures — and the number below is a
 * MEASUREMENT, not a target. A family agent raising it should raise the
 * number here in the same commit; that is the whole point of pinning it.
 */
import { describe, it, expect } from 'vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import {
  assertFullyBound,
  boundVariantCount,
  fieldPathsForFamily,
  formatMissing,
  renderAllVariants,
} from './bindSweep';

afterEach(cleanup);

/** Measured 2026-08-29 on `feat/brand-kit-strongest` — after the Invoice family conversion. */
const INVOICE_BOUND_TODAY = 20;

describe('bind sweep — invoices', () => {
  const results = renderAllVariants('stationery', 'Invoice');

  it('renders every variant the card offers', () => {
    // Twenty curated designs after the conversion — the hundred "wave-2"
    // generations are archived, not shown.
    expect(results.length).toBeGreaterThanOrEqual(20);
  });

  it('finds exactly the designs that bind today', () => {
    expect(boundVariantCount(results)).toBe(INVOICE_BOUND_TODAY);
    // And that is EVERY kept design — the unbound ones are archived.
    expect(boundVariantCount(results)).toBe(results.length);
  });

  it('reports the paths a bound design declared', () => {
    const bound = results.find((r) => r.paths.length > 0);
    expect(bound).toBeDefined();
    // Real content paths, in the same vocabulary the panel uses.
    expect(bound!.paths.some((p) => p.startsWith('lineItems.'))).toBe(true);
  });

  it('knows the field paths the invoice panel offers', () => {
    const paths = fieldPathsForFamily('invoices');
    expect(paths).toContain('number');
    expect(paths).toContain('clientName');
    expect(paths.some((p) => p.startsWith('lineItems.0.'))).toBe(true);
  });

  it('fails loudly, naming variants and paths, while the family is unbound', () => {
    // This is what a family agent sees until their family is finished.
    expect(() =>
      assertFullyBound(
        { sectionKey: 'stationery', storageLabel: 'Invoice' },
        fieldPathsForFamily('invoices'),
      ),
    ).toThrow(/missing:/);
  });

  it('reports nothing missing when the required set is already declared', () => {
    const bound = results.find((r) => r.paths.length > 0)!;
    expect(formatMissing([bound], bound.paths)).toBe('');
  });

  it('sweeps a family with no content kind without throwing', () => {
    // The honest answer for an unwired family is "no paths anywhere".
    // Brand assets have no content kind by design — they ARE the brand.
    const logos = renderAllVariants('brand-assets', 'Logos');
    expect(logos.length).toBeGreaterThan(0);
    expect(boundVariantCount(logos)).toBe(0);
  });
});
