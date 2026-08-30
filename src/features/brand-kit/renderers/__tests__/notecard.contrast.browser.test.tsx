/**
 * Notecard — twelve designs, measured before anything shows them.
 *
 * The family has no catalog entry and no `MAP.stationery` row (see
 * `notecard.bind.test.tsx` for why, and for what wiring it up costs), so
 * `variantsForCard` cannot reach it and this suite builds the templates
 * from the exported lists. Everything below is the same bar every visible
 * family clears: budget ZERO, both seed brands, and no word painted on a
 * gradient where the sweep would skip it rather than judge it.
 *
 * Measuring an unreachable family is the point. When someone adds the two
 * lines that make the card visible, the question "is it ready?" is
 * already answered — and answered by measurement rather than by a
 * screenshot of the three designs somebody happened to look at.
 *
 * The eighteen wave-1 designs that were culled are what keeps this at
 * zero: `curation/notecard.ts` names Hand-Drawn, drawn in `Caveat,
 * cursive`, and Diagonal Stripe, whose type ran over a gradient nothing
 * could be read against. Neither was loosened into passing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { hydrateContent } from '@/features/brandkit/content/kinds';
import { curatedName, isArchived } from '../curation';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';
import { NOTECARD_EXTENDED } from '../NotecardExtended';
import { NOTECARD_EXTENDED_2 } from '../NotecardExtended2';

const BUDGET = 0;

afterEach(cleanup);

const all: BrandKitTemplate[] = [...NOTECARD_EXTENDED, ...NOTECARD_EXTENDED_2]
  .map(
    (t) =>
      ({
        id: `notecard-${t.idSuffix}`,
        name: curatedName(`notecard-${t.idSuffix}`) ?? t.name,
        category: t.category,
        type: 'notecard' as BrandKitTemplate['type'],
        orientation: 'landscape' as const,
        tags: ['notecard', 'extended', t.category],
      }) as BrandKitTemplate,
  )
  .filter((t) => !isArchived(t.id));

const content = hydrateContent('note', mockBrand, undefined);

function mountAt260(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

describe('contrast sweep — notecards', () => {
  it('has twelve designs to measure', () => {
    expect(all).toHaveLength(12);
  });

  it('measures real colours, not jsdom defaults', () => {
    const { container } = mountAt260(
      renderCosmosTemplate(all[0]!, SEED_BRANDS[0]!, mockBrand, content),
    );
    const report = measureContrast(container);
    expect(report.measured).toBeGreaterThan(0);
    // A note is three short lines. If any of them is over a gradient the
    // sweep skips it, and a family that passes by being unmeasurable has
    // not passed.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`every kept design reads for ${brand.name}`, () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      render(
        <>
          {all.map((t) => (
            <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
              {renderCosmosTemplate(t, brand, mockBrand, content)}
            </div>
          ))}
        </>,
        { container: host },
      );
      const report = measureContrast(host);
      if (report.violations.length > 0) {
        console.log(`\n${brand.name}\n${formatViolations(report.violations)}\n`);
      }
      assertReadable(host, { maxViolations: BUDGET, label: `every notecard for ${brand.name}` });
    });
  }
});
