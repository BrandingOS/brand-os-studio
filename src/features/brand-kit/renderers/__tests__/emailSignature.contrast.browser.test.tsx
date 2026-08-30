/**
 * Email signatures — every word of every signature reads.
 *
 * jsdom cannot answer this: it has no cascade, so every renderer measures
 * as black on white and passes vacuously. The failures worth catching here
 * are pairings, not strings — a brand colour printed on its own panel, a
 * muted grey on a tinted ground, white type on a mid-tone band — and only
 * a browser with the real stylesheets loaded can see them.
 *
 * The budget is ZERO, and it is zero for both brands. A signature is the
 * one deliverable a stranger reads on a phone, in a client that has
 * already stripped half the styling; there is no design here worth a
 * detail nobody can make out.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults.
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

const all = variantsForCard('web', 'Email Signature', mockBrand);
const featured = featuredTemplates('Email Signature', all);

/** Renderers are authored for a ~260px card and starve when laid out wider. */
function mountAt260(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

describe('contrast sweep — email signatures', () => {
  it('has three featured designs to measure', () => {
    expect(featured).toHaveLength(3);
  });

  it('measures real colours, not jsdom defaults', () => {
    const { container } = mountAt260(
      renderCosmosTemplate(featured[0]!, SEED_BRANDS[0]!, mockBrand, undefined),
    );
    const report = measureContrast(container);
    expect(
      report.measured + report.skippedNoSolidBackground + report.skippedInvisible,
    ).toBeGreaterThan(0);
    // Every signature paints on a flat ground on purpose: a gradient would
    // make the sweep skip the text rather than judge it, which is how a
    // family "passes" without being readable.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  // Two brands, because the pairing that fails is the brand's own: Raqm is
  // a violet on cream, SKAM a red on near-black, and a signature that only
  // reads for one of them is a signature that does not read.
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
    assertReadable(host, { maxViolations: BUDGET, label: 'the featured email signatures' });
  });

  it('reads for every kept design, not only the featured three', () => {
    // The picker offers all sixteen; a design nobody featured is still a
    // design a customer can choose.
    const host = document.createElement('div');
    document.body.appendChild(host);
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
    assertReadable(host, { maxViolations: BUDGET, label: 'every email signature' });
  });
});
