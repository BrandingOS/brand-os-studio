/**
 * Letterhead — every word of every letter reads, on either brand.
 *
 * jsdom cannot answer this. It has no cascade, so every renderer measures
 * as black on white and passes vacuously. The failures worth catching are
 * PAIRINGS, not strings — reversed type on a band, a muted grey on a
 * tinted well, the brand's own colour printed on its own panel — and only
 * a browser with the real stylesheets loaded can see them.
 *
 * The budget is ZERO, for the featured three and for all twenty. A
 * letterhead is a document that gets PRINTED: there is no zoom, no
 * hover-to-reveal and no dark-mode escape hatch, and a contact line
 * nobody can make out is a contact line that has cost its owner a reply.
 *
 * What this measured, and what it changed: `letterhead-ext-8` (Diagonal
 * Header) put the brand colour in an absolutely positioned sibling and
 * the reversed type in a transparent block on top. Climbing from the text
 * for an opaque ancestor found the white sheet, so both lines measured
 * white-on-white at 1.00:1. That was not only a measurement artefact —
 * the masthead ranged its sender name RIGHT, which is exactly where the
 * diagonal cuts the band shortest, so a long name really could sit off
 * the colour. The band now CONTAINS its own type. See the renderer.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults instead of the design.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { featuredTemplates } from '../../data/cardPresentation';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. See the header. */
const BUDGET = 0;

afterEach(cleanup);

const all = variantsForCard('stationery', 'Letterhead', mockBrand);
const featured = featuredTemplates('Letterhead', all);

/** Renderers are authored for a ~260px card and starve when laid out wider. */
function mountAt260(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

describe('contrast sweep — letterheads', () => {
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
    // Every letterhead paints its type on a flat ground on purpose. Text
    // over a gradient is SKIPPED rather than judged, which is how a
    // family "passes" this sweep without being readable.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  // Two brands, because the pairing that fails is the brand's OWN: Raqm
  // is a violet on cream, SKAM a red on near-black. A letterhead that
  // reads for one of them is not a letterhead that reads.
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
    assertReadable(host, { maxViolations: BUDGET, label: 'the featured letterheads' });
  });

  // The picker offers all twenty. A design nobody featured is still a
  // design a customer can choose, and then print two hundred of.
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
      assertReadable(host, { maxViolations: BUDGET, label: `every letterhead for ${brand.name}` });
    });
  }
});
