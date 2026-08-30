/**
 * The logo system — every word of it reads, on both brands.
 *
 * Most of this card is artwork rather than type, so the sweep is measuring a
 * small, specific population: the clear-space diagram's four R's and its
 * formula, the minimum-size ladder's three labels, and each misuse tile's
 * rule. Those are the only words in the system, which is exactly why they may
 * not be the ones nobody can make out — a guideline whose RULES are unreadable
 * has published pictures, not a system.
 *
 * The budget is zero, with ONE tile excluded by name (see below).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { variantsForCard } from '../../data/legacy-mapping';
import { logoCombosFor, MIN_PAIRING_CONTRAST } from '../../data/recolorLogo';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

const BUDGET = 0;

afterEach(cleanup);

const BRANDS = SEED_BRANDS.slice(0, 2);

/** Renderers are authored for a ~260px card and starve when laid out wider. */
function mountAt260(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = '260px';
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

/**
 * The ONE tile this sweep may not judge: `misuse: 'contrast'`.
 *
 * Its whole subject is a logo on a ground that does not clear the floor, so it
 * is DRAWN too close on purpose — `logoCombosFor` builds its background with
 * `nudgeToward(ink, stage, 0.72)` for exactly that reason. Its caption ("Keep
 * at least 3:1") therefore sits on a ground chosen to be wrong, and a sweep
 * that passed it would be a sweep that had stopped measuring. Excluded by
 * name, never by raising the budget: every other tile, including the other two
 * misuses, is held to zero.
 */
function tilesFor(brand: (typeof BRANDS)[number]) {
  const mock = brandToMockBrand(brand);
  const all = variantsForCard('brand-assets', 'Logos', mock);
  const combos = logoCombosFor(mock);
  const originals = mock.logos.length;
  const lowContrastIndex = combos.findIndex((t) => t.misuse === 'contrast');
  const excluded = lowContrastIndex >= 0 ? originals + lowContrastIndex : -1;
  return {
    mock,
    all,
    measurable: all.filter((_, i) => i !== excluded),
    excludedId: excluded >= 0 ? all[excluded]?.id : undefined,
  };
}

describe('contrast sweep — the logo system', () => {
  it('has a system to measure, not a wall of colour combinations', () => {
    for (const brand of BRANDS) {
      const { mock, all } = tilesFor(brand);
      const combos = logoCombosFor(mock);
      expect(all.length).toBe(mock.logos.length + combos.length);
      // Pairings, treatments, and the five rule tiles.
      expect(combos.filter((t) => t.kind === 'clear-space')).toHaveLength(1);
      expect(combos.filter((t) => t.kind === 'min-size')).toHaveLength(1);
      expect(combos.filter((t) => t.kind === 'misuse')).toHaveLength(3);
    }
  });

  it('measures real colours, not jsdom defaults', () => {
    const { mock, all } = tilesFor(BRANDS[0]!);
    const clearSpace = all.find((t) => t.name.startsWith('Clear space'));
    expect(clearSpace).toBeDefined();
    const { container } = mountAt260(
      renderCosmosTemplate(clearSpace!, BRANDS[0]!, mock, undefined),
    );
    const report = measureContrast(container);
    expect(report.measured).toBeGreaterThan(0);
    // Every tile paints on a flat ground on purpose: a gradient would make
    // the sweep SKIP the words rather than judge them, which is how a family
    // "passes" without being readable.
    expect(report.skippedNoSolidBackground).toBe(0);
  });

  it('excludes a tile that really would fail, not one that merely might', () => {
    // An exclusion nobody can justify is a budget rise in disguise. The
    // low-contrast misuse has to actually violate — if it ever stops
    // violating it has stopped illustrating its own rule, and this test says
    // so rather than quietly passing.
    for (const brand of BRANDS) {
      const { mock, all, excludedId } = tilesFor(brand);
      expect(excludedId).toBeDefined();
      // Measured on the TILE'S OWN MODEL, not on its words: what this
      // tile gets wrong is the LOGO on its ground, and `measureContrast`
      // only judges text — so asking it here would answer "no violations"
      // about a tile whose whole subject is a violation.
      const tile = logoCombosFor(mock).find((t) => t.misuse === 'contrast');
      expect(tile).toBeDefined();
      expect(tile!.contrast).toBeLessThan(MIN_PAIRING_CONTRAST);
      // And its words stay readable — the rule is illustrated, not shouted.
      const template = all.find((t) => t.id === excludedId)!;
      const { container } = mountAt260(
        renderCosmosTemplate(template, brand, mock, undefined),
      );
      expect(measureContrast(container).violations).toEqual([]);
      cleanup();
    }
  });

  for (const brand of BRANDS) {
    it(`every tile reads for ${brand.name}`, () => {
      const { mock, measurable } = tilesFor(brand);
      const failures: string[] = [];
      for (const template of measurable) {
        const { container, unmount } = mountAt260(
          renderCosmosTemplate(template, brand, mock, undefined),
        );
        const report = measureContrast(container);
        if (report.violations.length > 0) {
          failures.push(`${template.id} — ${template.name}\n${formatViolations(report.violations)}`);
        }
        unmount();
      }
      if (failures.length > 0) console.log(`\n${brand.name}\n${failures.join('\n')}\n`);
      expect(failures.length).toBeLessThanOrEqual(BUDGET);
    });
  }

  it('holds the whole system, both brands, to one budget', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(
      <>
        {BRANDS.map((brand) => {
          const { mock, measurable } = tilesFor(brand);
          return measurable.map((t) => (
            <div key={`${brand.id}-${t.id}`} style={{ width: 260, background: '#ffffff' }}>
              {renderCosmosTemplate(t, brand, mock, undefined)}
            </div>
          ));
        })}
      </>,
      { container: host },
    );
    assertReadable(host, { maxViolations: BUDGET, label: 'the logo system' });
  });
});
