/**
 * Animations — the word reads on the frame the card comes to rest on.
 *
 * jsdom cannot answer this: it has no cascade, so every renderer measures
 * as black on white and passes vacuously. And this family has a second
 * reason to be measured in a browser: half its designs are staged on a
 * ground that ARRIVES — an iris that opens onto the brand colour, a panel
 * that pushes in from the left, a pair of shutters that part. The ink is
 * chosen against the ground the design ENDS on (`Scene.end`), so the only
 * honest place to measure it is the rest frame, which is exactly what a
 * paused-at-its-last-keyframe stage gives us.
 *
 * The budget is ZERO, for both brands. A motion piece has one line of text
 * on it; there is no design here worth the one word nobody can make out.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
// The real stylesheets. Without them every rule is inert and the sweep
// measures the browser's defaults.
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

const CARDS = ['Logo Reveal', 'Slide In', 'Fade', 'Rotate'] as const;

const ALL = Object.fromEntries(
  CARDS.map((label) => [label, variantsForCard('animations', label, mockBrand)]),
);
const FEATURED = Object.fromEntries(
  CARDS.map((label) => [label, featuredTemplates(label, ALL[label]!)]),
);

/**
 * Animations are square (`PICKER_ASPECT_BY_LABEL`), and the stage is
 * `height: 100%` — laid out in a host with no height it would measure
 * 260 × 0 and every text node would be skipped as invisible, which is how
 * a family "passes" this sweep without being readable.
 */
function mountSquare(node: ReactNode): HTMLElement {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.height = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  render(<>{node}</>, { container: host });
  return host;
}

describe('contrast sweep — animations', () => {
  it('features three designs on each of the four cards', () => {
    for (const label of CARDS) expect(FEATURED[label], label).toHaveLength(3);
  });

  it('measures real colours, not jsdom defaults', () => {
    const container = mountSquare(
      renderCosmosTemplate(FEATURED['Logo Reveal']![0]!, SEED_BRANDS[0]!, mockBrand, undefined),
    );
    const report = measureContrast(container);
    expect(report.measured).toBeGreaterThan(0);
    // Every design paints on a flat ground on purpose: a gradient would
    // make the sweep skip the text rather than judge it.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  // Two brands, because the pairing that fails is the brand's own: Raqm is
  // a violet on cream, SKAM a red on near-black. A design staged on the
  // brand colour reads for one and not the other unless the ink is chosen.
  for (const brand of SEED_BRANDS.slice(0, 2)) {
    for (const label of CARDS) {
      for (const template of FEATURED[label]!) {
        it(`${label} · ${template.name} reads for ${brand.name}`, () => {
          const container = mountSquare(
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
  }

  it('reads for every kept design, not only the featured twelve', () => {
    // The picker offers all forty; a design nobody featured is still a
    // design a customer can choose.
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      <>
        {SEED_BRANDS.slice(0, 2).map((brand) =>
          CARDS.flatMap((label) =>
            ALL[label]!.map((t) => (
              <div
                key={`${brand.id}-${t.id}`}
                style={{ width: 260, height: 260, background: '#ffffff' }}
              >
                {renderCosmosTemplate(t, brand, mockBrand, undefined)}
              </div>
            )),
          ),
        )}
      </>,
      { container: host },
    );
    assertReadable(host, { maxViolations: BUDGET, label: 'every animation' });
  });

  it('reads with the customer’s own word, however long it is', () => {
    // The word is `fit="shrink"`, so a long brand name loses size rather
    // than pushing the lockup out of the frame — but it still has to read.
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      <>
        {CARDS.flatMap((label) =>
          FEATURED[label]!.map((t) => (
            <div key={t.id} style={{ width: 260, height: 260, background: '#ffffff' }}>
              {renderCosmosTemplate(t, SEED_BRANDS[0]!, mockBrand, {
                kind: 'motion',
                text: 'Vandersteen & Whitfield Partners',
                durationMs: 2000,
                loop: false,
              })}
            </div>
          )),
        )}
      </>,
      { container: host },
    );
    assertReadable(host, { maxViolations: BUDGET, label: 'the featured animations, long word' });
  });
});
