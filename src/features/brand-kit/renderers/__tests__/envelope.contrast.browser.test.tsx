/**
 * Envelope — the address reads, or the letter does not arrive.
 *
 * This is the one deliverable in the kit with a reader who is not a
 * customer: a sorting machine and then a postman, both of whom get one
 * pass at it. There is no design here worth an address nobody can make
 * out, so the budget is ZERO — for the featured three and for all
 * sixteen, on both seed brands.
 *
 * jsdom cannot answer this: no cascade, so every renderer measures as
 * black on white and passes vacuously. The failures are PAIRINGS — a
 * brand red on a brand-tinted panel, a muted grey on a colour band,
 * reversed type on a half-tone ground — and only a browser with the real
 * stylesheets loaded can see them.
 *
 * Nothing needed fixing when this landed, and that is itself the result:
 * the fourteen wave-1 designs that could NOT be made to read were culled
 * rather than loosened. `curation/envelope.ts` names them — Vintage
 * Airmail's border-image stripes and Brand Tape's rotated strip both ran
 * type over a repeating gradient, which this sweep would have SKIPPED
 * rather than judged. That is the trap the `skippedNoSolidBackground`
 * assertion below exists to close: a family can "pass" by painting every
 * word on a gradient, and passing that way is worse than failing.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { featuredTemplates } from '../../data/cardPresentation';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

const BUDGET = 0;

afterEach(cleanup);

const all = variantsForCard('stationery', 'Envelope', mockBrand);
const featured = featuredTemplates('Envelope', all);

function mountAt260(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

describe('contrast sweep — envelopes', () => {
  it('has sixteen designs and three featured ones to measure', () => {
    expect(all).toHaveLength(16);
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
    const host = document.createElement('div');
    document.body.appendChild(host);
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
    assertReadable(host, { maxViolations: BUDGET, label: 'the featured envelopes' });
  });

  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`reads for every kept design, not only the featured three — ${brand.name}`, () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
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
      assertReadable(host, { maxViolations: BUDGET, label: `every envelope for ${brand.name}` });
    });
  }
});
