/**
 * Invoices — every figure on every document reads, on either brand.
 *
 * An invoice is the one deliverable in this kit that is a legal record.
 * It gets printed, filed, and read by somebody who did not choose the
 * design and cannot zoom, hover or switch to dark mode — so the budget
 * is ZERO, for the featured three and for all twenty. A due date nobody
 * can make out is a due date nobody pays by.
 *
 * jsdom cannot answer this. It has no cascade, so every renderer measures
 * as black on white and passes vacuously. The failures worth catching are
 * PAIRINGS — a muted grey on a tinted well, a stamp printed in the
 * brand's own colour on a panel of the same colour, reversed type on a
 * band that turned out to be paper — and only a browser with the real
 * stylesheets loaded can see them.
 *
 * Two brands, because the pairing that fails is the brand's OWN: Raqm is
 * a violet on cream, SKAM a red on near-black. An invoice that reads for
 * one of them is not an invoice that reads.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults instead of the design.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { hydrateContent, type DeliverableContent } from '@/features/brandkit/content/kinds';
import { variantsForCard } from '../../data/legacy-mapping';
import { featuredTemplates } from '../../data/cardPresentation';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. See the header. */
const BUDGET = 0;

afterEach(cleanup);

const all = variantsForCard('stationery', 'Invoice', mockBrand);
const featured = featuredTemplates('Invoice', all);

/**
 * A discount, because the line only exists when there is one.
 *
 * The default is zero and nothing draws it, so a sweep with the defaults
 * never measures the discount row at all — which is how a family passes
 * a contrast sweep while the one row a customer argues about is the row
 * nobody can read.
 */
function invoiceWithADiscount(): DeliverableContent {
  const base = hydrateContent('invoice', mockBrand, undefined);
  return { ...base, discountRate: 10 } as DeliverableContent;
}

/** Renderers are authored for a ~260px card and starve when laid out wider. */
function mountAt260(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

function gridHost() {
  const host = document.createElement('div');
  document.body.appendChild(host);
  return host;
}

describe('contrast sweep — invoices', () => {
  it('has twenty designs and three featured ones to measure', () => {
    expect(all).toHaveLength(20);
    expect(featured).toHaveLength(3);
  });

  it('measures real colours, not jsdom defaults', () => {
    const { container } = mountAt260(
      renderCosmosTemplate(featured[0]!, SEED_BRANDS[0]!, mockBrand, undefined),
    );
    const report = measureContrast(container);
    expect(report.measured).toBeGreaterThan(0);
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  it('judges every design rather than skipping one', () => {
    // Every invoice prints its figures on a FLAT ground on purpose, and
    // this is the assertion that keeps it that way. `Colour Wash` was
    // drawn as one brand→tint gradient with the type laid over it, and a
    // gradient is not one colour: all three of its head lines were
    // SKIPPED rather than judged, so a white "Invoice" fading into a pale
    // tint "passed" by being unmeasurable. The head is a flat band now
    // and the fade is its own strip with nothing written on it.
    const host = gridHost();
    render(
      <>
        {all.map((t) => (
          <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
            {renderCosmosTemplate(t, SEED_BRANDS[0]!, mockBrand, undefined)}
          </div>
        ))}
      </>,
      { container: host },
    );
    const report = measureContrast(host);
    expect(report.measured).toBeGreaterThan(all.length * 10);
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  for (const brand of SEED_BRANDS.slice(0, 2)) {
    for (const template of featured) {
      it(`${template.name} reads for ${brand.name}`, () => {
        const { container } = mountAt260(
          renderCosmosTemplate(template, brand, mockBrand, undefined),
        );
        const report = measureContrast(container);
        if (report.violations.length > 0) {
          console.log(
            `\n${template.id} — ${template.name} — ${brand.name}\n` +
              `${formatViolations(report.violations)}\n`,
          );
        }
        expect(report.violations.length).toBeLessThanOrEqual(BUDGET);
      });
    }
  }

  it('holds the whole featured set to one budget', () => {
    const host = gridHost();
    render(
      <>
        {SEED_BRANDS.slice(0, 2).map((brand) =>
          featured.map((t) => (
            <div key={`${brand.id}-${t.id}`} style={{ width: 260, background: '#ffffff' }}>
              {renderCosmosTemplate(t, brand, mockBrand, undefined)}
            </div>
          )),
        )}
      </>,
      { container: host },
    );
    assertReadable(host, { maxViolations: BUDGET, label: 'the featured invoices' });
  });

  // The picker offers all twenty. A design nobody featured is still a
  // design a customer can choose, and then send to a client every month.
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`reads for every kept design, not only the featured three — ${brand.name}`, () => {
      const host = gridHost();
      render(
        <>
          {all.map((t) => (
            <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
              {renderCosmosTemplate(t, brand, mockBrand, undefined)}
            </div>
          ))}
        </>,
        { container: host },
      );
      assertReadable(host, { maxViolations: BUDGET, label: `every invoice for ${brand.name}` });
    });
  }

  // The discount row is drawn only when a discount exists, so the sweep
  // above never sees it.
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`reads once a discount is on the invoice — ${brand.name}`, () => {
      const content = invoiceWithADiscount();
      const host = gridHost();
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
      assertReadable(host, {
        maxViolations: BUDGET,
        label: `every discounted invoice for ${brand.name}`,
      });
    });
  }
});
