/**
 * Social — every word of every post reads, on both brands.
 *
 * This is the layer jsdom cannot reach. jsdom has no cascade, so every
 * renderer measures as black on white and passes vacuously; the failures
 * that actually shipped here were PAIRINGS — a caption at `opacity: .7`
 * on a saturated brand ground, a primary-colour mark on a primary-colour
 * post, white type on a mid-tone band — and only a browser with the real
 * stylesheets loaded can see them.
 *
 * The budget is ZERO for both brands. A post is read on a phone, at a
 * thumbnail, while scrolling; there is no design in this family worth a
 * line nobody can make out. Raqm is a violet on cream and SKAM a red on
 * near-black, which is the pair that catches a design drawn for one of
 * them: a ground chosen by eye passes for the brand it was chosen with
 * and fails for the other.
 *
 * `skippedNoSolidBackground` is asserted to be 0 as well, because a
 * family can "pass" this sweep by painting all its text on a gradient —
 * which is not a pass, it is an unmeasurable design. Every ground in this
 * family is a flat colour on purpose.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { BrandKitTemplate } from '@/features/brandkit/types';
import { variantsForCard } from '../../data/legacy-mapping';
import { featuredTemplates } from '../../data/cardPresentation';
import { aspectForType } from '../../kit/registry';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. See the header. */
const BUDGET = 0;

afterEach(cleanup);

const CARDS = ['Post', 'Story', 'Cover', 'Profile'] as const;

/** Two brands, because the pairing that fails is the brand's own. */
const BRANDS = SEED_BRANDS.slice(0, 2);

/**
 * Renderers are authored for a ~260px card and starve when laid out
 * wider; they also fill their tile edge to edge, so the tile has to carry
 * the real aspect ratio or a 9:16 story measures as a 260px square.
 */
const TILE_WIDTH = 260;

function tileSize(template: BrandKitTemplate): { width: number; height: number } {
  const aspect = aspectForType(template.type as string);
  return { width: TILE_WIDTH, height: Math.round(TILE_WIDTH / aspect) };
}

function tileStyle(template: BrandKitTemplate): React.CSSProperties {
  return { ...tileSize(template), background: '#ffffff' };
}

function mountTile(template: BrandKitTemplate, brand: (typeof SEED_BRANDS)[number]) {
  const { width, height } = tileSize(template);
  const host = document.createElement('div');
  host.style.width = `${width}px`;
  host.style.height = `${height}px`;
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{renderCosmosTemplate(template, brand, mockBrand, undefined)}</>, {
    container: host,
  });
}

describe('contrast sweep — social', () => {
  for (const label of CARDS) {
    const all = variantsForCard('social', label, mockBrand);
    const featured = featuredTemplates(label, all);

    describe(label, () => {
      it('has three featured designs to measure', () => {
        expect(featured).toHaveLength(3);
        expect(all.length).toBeGreaterThanOrEqual(12);
      });

      it('measures real colours, not jsdom defaults, and never a gradient', () => {
        const { container } = mountTile(featured[0]!, BRANDS[0]!);
        const report = measureContrast(container);
        // A design that measured one node is a design that painted one
        // word — the assertion has to be that the whole thing was seen,
        // not that the sweep ran. Two is the floor because a profile icon
        // showing the brand's LOGO has no letters to measure: what is
        // left is the account line, which is the name and the address.
        expect(report.measured).toBeGreaterThanOrEqual(2);
        expect(report.skippedNoSolidBackground).toBe(0);
        expect(report.skippedInvisible).toBe(0);
      });

      for (const brand of BRANDS) {
        for (const template of featured) {
          it(`${template.name} reads for ${brand.name}`, () => {
            const { container } = mountTile(template, brand);
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
        // The picker offers all of them; a design nobody featured is
        // still a design a customer can choose.
        const host = document.createElement('div');
        document.body.appendChild(host);
        render(
          <>
            {BRANDS.map((brand) =>
              all.map((t) => (
                <div key={`${brand.id}-${t.id}`} style={tileStyle(t)}>
                  {renderCosmosTemplate(t, brand, mockBrand, undefined)}
                </div>
              )),
            )}
          </>,
          { container: host },
        );
        assertReadable(host, { maxViolations: BUDGET, label: `every ${label} design` });
      });
    });
  }
});
