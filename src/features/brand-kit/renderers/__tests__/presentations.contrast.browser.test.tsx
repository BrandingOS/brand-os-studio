/**
 * Presentations — every slide of every deck reads, on either brand.
 *
 * A deck is projected: it is looked at from the back of a room, once, for
 * as long as the speaker leaves it up. There is no zoom and no second
 * pass, so the budget is ZERO — for the featured three of each card and
 * for all forty kept slides.
 *
 * jsdom cannot answer this. It has no cascade, so every renderer measures
 * as black on white and passes vacuously. The failures worth catching
 * here are the family's own SURFACE choices: a pitch cover is the brand's
 * colour, a case study is near-black, a portfolio divider is inverted,
 * and every one of those grounds carries an eyebrow, a slide number and a
 * footer. `PresentationsExtended.ink()` measures each of those inks
 * before it uses one and drops back to the surface's own text colour —
 * this is the test that proves it, on brands the file has never seen.
 *
 * Two brands, because the pairing that fails is the brand's OWN: Raqm is
 * a violet on cream, SKAM a red on near-black.
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

const DECKS = ['Pitch Deck', 'Business Plan', 'Proposal', 'Case Studies'] as const;

function deckVariants(label: string) {
  return variantsForCard('presentations', label, mockBrand);
}

/**
 * A deck with a stat slide and a quote slide in it.
 *
 * The kind's defaults produce a title, two dividers, six pages and a
 * closing — no `stat`, no `quote` — so a sweep over the defaults never
 * mounts `StatSlide` or `QuoteSlide` at all. Both paint their headline in
 * the accent, which is exactly the ink most likely to fail on a brand
 * ground, so they are measured deliberately rather than by luck.
 */
function deckWithEveryKind(): DeliverableContent {
  const base = hydrateContent('deck', mockBrand, undefined) as DeliverableContent & {
    slides: Array<Record<string, unknown>>;
  };
  const slides = base.slides.map((slide, i) => {
    if (i === 6) return { ...slide, kind: 'stat', stat: { value: '4.8', label: 'Years running' } };
    if (i === 7) {
      return {
        ...slide,
        kind: 'quote',
        quote: { text: 'They made us look like ourselves.', by: 'A client' },
      };
    }
    return slide;
  });
  return { ...base, slides } as DeliverableContent;
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

describe('contrast sweep — presentations', () => {
  it('has ten slides per deck and three featured ones to measure', () => {
    for (const label of DECKS) {
      const all = deckVariants(label);
      expect(all, label).toHaveLength(10);
      expect(featuredTemplates(label, all), label).toHaveLength(3);
    }
  });

  it('measures real colours, not jsdom defaults', () => {
    const all = deckVariants('Pitch Deck');
    const { container } = mountAt260(
      renderCosmosTemplate(all[0]!, SEED_BRANDS[0]!, mockBrand, undefined),
    );
    const report = measureContrast(container);
    expect(report.measured).toBeGreaterThan(0);
    // Every slide paints its type on a flat ground on purpose. Text over a
    // gradient is SKIPPED rather than judged, which is how a family
    // "passes" this sweep without being readable.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  it('judges every slide rather than skipping one', () => {
    // A slide's ground is a SURFACE, never a gradient or a photograph, and
    // this is what keeps it so: text over a gradient has no single honest
    // ratio, so the sweep skips it — and a deck whose covers were all
    // washes would "pass" this file without one of them being readable.
    const host = gridHost();
    render(
      <>
        {DECKS.flatMap((label) =>
          deckVariants(label).map((t) => (
            <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
              {renderCosmosTemplate(t, SEED_BRANDS[0]!, mockBrand, undefined)}
            </div>
          )),
        )}
      </>,
      { container: host },
    );
    const report = measureContrast(host);
    expect(report.measured).toBeGreaterThan(40 * 4);
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  for (const brand of SEED_BRANDS.slice(0, 2)) {
    for (const label of DECKS) {
      it(`${label} reads for ${brand.name} — the featured three`, () => {
        const featured = featuredTemplates(label, deckVariants(label));
        const host = gridHost();
        render(
          <>
            {featured.map((t) => (
              <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
                {renderCosmosTemplate(t, brand, mockBrand, undefined)}
              </div>
            ))}
          </>,
          { container: host },
        );
        const report = measureContrast(host);
        if (report.violations.length > 0) {
          console.log(`\n${label} — ${brand.name}\n${formatViolations(report.violations)}\n`);
        }
        expect(report.violations.length).toBeLessThanOrEqual(BUDGET);
      });
    }
  }

  // The card shows three; the picker offers ten. A slide nobody featured
  // is still a slide that gets projected.
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`reads for all forty kept slides — ${brand.name}`, () => {
      const host = gridHost();
      render(
        <>
          {DECKS.flatMap((label) =>
            deckVariants(label).map((t) => (
              <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
                {renderCosmosTemplate(t, brand, mockBrand, undefined)}
              </div>
            )),
          )}
        </>,
        { container: host },
      );
      assertReadable(host, { maxViolations: BUDGET, label: `every slide for ${brand.name}` });
    });
  }

  // Stat and quote slides exist in the model and in the panel, and the
  // defaults do not produce one — so they are measured on purpose.
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    it(`reads a stat slide and a quote slide — ${brand.name}`, () => {
      const content = deckWithEveryKind();
      const host = gridHost();
      render(
        <>
          {DECKS.flatMap((label) =>
            deckVariants(label)
              .slice(6, 8)
              .map((t) => (
                <div key={t.id} style={{ width: 260, background: '#ffffff' }}>
                  {renderCosmosTemplate(t, brand, mockBrand, content)}
                </div>
              )),
          )}
        </>,
        { container: host },
      );
      assertReadable(host, { maxViolations: BUDGET, label: `stat and quote for ${brand.name}` });
    });
  }
});
