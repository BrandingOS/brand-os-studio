/**
 * Business cards — every word of every card reads.
 *
 * jsdom cannot answer this: it has no cascade, so every renderer measures
 * as black on white and passes vacuously. The failure worth catching here
 * is a PAIRING, not a string — and the family shipped one. The guard's own
 * worked example (`__guards__/contrast.browser.test.tsx`) recorded it:
 * "Brute Force" printed the job title in Raqm's violet `#7231ff` on its own
 * near-black panel `#0f1216`, 3.22:1 where 4.5 is required. Nothing about
 * the string was wrong. The literal scan could not see it, and neither
 * could a screenshot of a card whose type looked, at a glance, deliberate.
 *
 * The budget is ZERO, for both seed brands and for all twenty-four designs
 * — not only the three the Brand Kit page features. A design nobody
 * featured is still a design a customer can choose, and a card is read at
 * arm's length on paper, where there is no zoom.
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

const all = variantsForCard('stationery', 'Business Card', mockBrand);
const featured = featuredTemplates('Business Card', all);

/**
 * Renderers are authored for a ~260px card and starve when laid out wider.
 *
 * The HEIGHT matters as much as the width here, and it is easy to leave
 * out: `CardStage` is `height: 100%`, so in an auto-height host it
 * resolves to zero, both cards collapse, and every measurement below is
 * taken against a layout nobody will ever see. 260 × 162 is the tile the
 * drilldown draws — `PICKER_ASPECT_BY_LABEL['Business Card']` is 1.6.
 */
const TILE_W = 260;
const TILE_H = Math.round(TILE_W / 1.6);

function tile(): HTMLDivElement {
  const host = document.createElement('div');
  host.style.width = `${TILE_W}px`;
  host.style.height = `${TILE_H}px`;
  host.style.background = '#ffffff';
  return host;
}

function mountAt260(node: React.ReactNode) {
  const host = tile();
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

describe('contrast sweep — business cards', () => {
  it('has twenty-four designs and three featured ones to measure', () => {
    expect(all).toHaveLength(24);
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
    // Every card paints on a flat ground on purpose. A design that put its
    // type on a gradient would make the sweep SKIP the text rather than
    // judge it, which is how a family "passes" without being readable —
    // Drafting Grid draws its grid as a SIBLING layer for exactly this
    // reason, so its text is still measured against the paper.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  // Two brands, because the pairing that fails is the brand's own: Raqm is
  // a violet on cream, SKAM a red on near-black, and a card that only reads
  // for one of them is a card that does not read.
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
            <div
              key={`${brand.id}-${t.id}`}
              style={{ width: TILE_W, height: TILE_H, background: '#ffffff' }}
            >
              {renderCosmosTemplate(t, brand, mockBrand, undefined)}
            </div>
          )),
        )}
      </>,
      { container: host },
    );
    assertReadable(host, { maxViolations: BUDGET, label: 'the featured business cards' });
  });

  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`reads for every kept design, not only the featured three — ${brand.name}`, () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      render(
        <>
          {all.map((t) => (
            <div key={t.id} style={{ width: TILE_W, height: TILE_H, background: '#ffffff' }}>
              {renderCosmosTemplate(t, brand, mockBrand, undefined)}
            </div>
          ))}
        </>,
        { container: host },
      );
      assertReadable(host, {
        maxViolations: BUDGET,
        label: `every business card for ${brand.name}`,
      });
    });
  }
});

/**
 * Nothing is clipped at the size the tile is drawn.
 *
 * `Face` is `overflow: hidden`, which is what keeps a long name from
 * pushing the card apart — and also what makes a design that is simply too
 * full fail SILENTLY: the last contact line is cut through the middle of
 * its glyphs and the tile still looks deliberate. The ladder designs
 * (Ledger, Seal) shipped exactly that.
 *
 * A clipped box is one whose scroll height exceeds the height it was
 * given. Measured at 260px, which is the width the drilldown and every
 * offscreen export mount at.
 */
describe('business cards — nothing is clipped at 260px', () => {
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`every design fits its card for ${brand.name}`, () => {
      const overflowing: string[] = [];
      for (const template of all) {
        const { container } = mountAt260(
          renderCosmosTemplate(template, brand, mockBrand, undefined),
        );
        for (const el of Array.from(container.querySelectorAll<HTMLElement>('*'))) {
          if (getComputedStyle(el).overflow !== 'hidden') continue;
          const over = el.scrollHeight - el.clientHeight;
          if (over > 1) overflowing.push(`${template.id} (${template.name}) — ${over}px`);
        }
        cleanup();
      }
      expect(overflowing, `clipped:\n  ${overflowing.join('\n  ')}`).toEqual([]);
    });
  }
});
