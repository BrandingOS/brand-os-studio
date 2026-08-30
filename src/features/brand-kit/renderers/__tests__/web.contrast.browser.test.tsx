/**
 * The web three — every word on a favicon, a website and a landing page
 * reads.
 *
 * jsdom cannot answer this: with no cascade every renderer measures as
 * black on white and passes vacuously. The pairings that fail here are the
 * brand's own — an eyebrow in the accent colour on a tinted panel, a muted
 * grey on the brand's field, a secondary button's underline on a saturated
 * band — and only a browser with the real stylesheets loaded can see them.
 *
 * These three families are also the ones with the most GROUNDS: a favicon
 * design is literally "the same mark on four backgrounds", and a website
 * hero puts paper, brand colour and inverted next to each other inside one
 * tile. That is exactly where a hand-paired colour goes wrong, which is
 * why the budget is zero and why it is zero for both seed brands.
 *
 * The mount is deliberate. These renderers are `w-full h-full`: given a
 * width and no height they collapse, every text node measures as
 * zero-area, the sweep counts them all `skippedInvisible` and the suite
 * passes having measured nothing. So the host is sized at the card's own
 * aspect — the same number `ScalingStage` uses.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { aspectForLabel, featuredTemplates } from '../../data/cardPresentation';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. See the header. */
const BUDGET = 0;

/** The canonical tile width the renderers are authored for. */
const TILE = 260;

afterEach(cleanup);

const LABELS = ['Favicon', 'Website', 'Landing Page'] as const;

function heightFor(label: string): number {
  return Math.round(TILE / aspectForLabel(label));
}

/** A host at the card's real shape — see the header on why height matters. */
function stage(label: string): HTMLElement {
  const host = document.createElement('div');
  host.style.width = `${TILE}px`;
  host.style.height = `${heightFor(label)}px`;
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return host;
}

function mount(label: string, node: React.ReactNode) {
  const host = stage(label);
  return render(<>{node}</>, { container: host });
}

describe.each(LABELS)('contrast sweep — %s', (label) => {
  const all = variantsForCard('web', label, mockBrand);
  const featured = featuredTemplates(label, all);

  it('has twelve designs and three featured ones to measure', () => {
    expect(all).toHaveLength(12);
    expect(featured).toHaveLength(3);
  });

  it('measures real colours, not jsdom defaults', () => {
    const { container } = mount(
      label,
      renderCosmosTemplate(featured[0]!, SEED_BRANDS[0]!, mockBrand, undefined),
    );
    const report = measureContrast(container);
    expect(report.measured).toBeGreaterThan(0);
    // Every one of these paints on a flat ground on purpose: a gradient
    // makes the sweep SKIP the text rather than judge it, which is how a
    // family "passes" without being readable.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  // Two brands, because the pairing that fails is the brand's own: Raqm is
  // a violet on cream, SKAM a red on near-black, and a hero that only
  // reads for one of them does not read.
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    for (const template of featured) {
      it(`${template.name} reads for ${brand.name}`, () => {
        const { container } = mount(
          label,
          renderCosmosTemplate(template as BrandKitTemplate, brand, mockBrand, undefined),
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

  it('reads for every kept design, not only the featured three', () => {
    // The picker offers all twelve; a design nobody featured is still a
    // design a customer can choose.
    for (const brand of SEED_BRANDS.slice(0, 2)) {
      for (const t of all) {
        const { container } = mount(
          label,
          renderCosmosTemplate(t, brand, mockBrand, undefined),
        );
        assertReadable(container, {
          maxViolations: BUDGET,
          label: `${t.id} (${t.name}) for ${brand.name}`,
        });
        cleanup();
      }
    }
  });
});
