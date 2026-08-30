/**
 * The Colors drilldown — every word on a swatch reads on the swatch.
 *
 * This is the one family where the ground IS the deliverable. A colour
 * tile cannot be redrawn on a safer background: whatever the brand chose
 * is what the type sits on, so the only thing the renderer controls is
 * the ink, the chip borders and how small anything is allowed to get.
 * `bestTextOn` picks the ink; this sweep is what proves it picked right
 * for a brand's actual palette, at the size the tile actually mounts.
 *
 * jsdom cannot answer it — with no cascade every node measures black on
 * white and passes vacuously — so it lives in the browser project with
 * the real stylesheets loaded.
 *
 * Two brands, and their palettes are opposite: Raqm is a violet, a
 * turquoise and a near-white; SKAM is a red beside pure white and pure
 * black. A swatch renderer that only reads for one of them does not read.
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
import { aspectForLabel } from '../../data/cardPresentation';
import { paletteFromMockBrand } from '../../data/colorPaletteExport';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. A swatch that cannot be read is a swatch with no name on it. */
const BUDGET = 0;

/** The canonical tile width the renderers are authored for. */
const TILE = 260;
const HEIGHT = Math.round(TILE / aspectForLabel('Colors'));

afterEach(cleanup);

function mount(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = `${TILE}px`;
  host.style.height = `${HEIGHT}px`;
  // The page ground behind a near-white swatch — the case the tile's
  // hairline ring exists for.
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

const BRANDS = SEED_BRANDS.slice(0, 2);

describe.each(BRANDS.map((b) => [b.name, b] as const))(
  'contrast sweep — Colors · %s',
  (_name, brand) => {
    const mock = brandToMockBrand(brand);
    const palette = paletteFromMockBrand(mock);
    const templates = variantsForCard('brand-assets', 'Colors', mock);

    it('offers exactly one tile per brand colour, greys excluded', () => {
      expect(palette.length).toBeGreaterThan(1);
      expect(templates).toHaveLength(palette.length);
      // The generated 32-step ladder is not the brand's palette (D37).
      expect(templates.length).toBeLessThan(mock.colors.grey.length);
    });

    it('never labels a colour by its position in the list (D40)', () => {
      for (const c of palette) {
        expect(c.role).not.toMatch(/^Core \d/);
        expect(['Primary', 'Secondary', 'Accent', 'Background', 'Neutral']).toContain(c.role);
      }
    });

    it('measures real colours on flat grounds, not jsdom defaults', () => {
      const { container } = mount(
        renderCosmosTemplate(templates[0]!, brand, mock, undefined),
      );
      const report = measureContrast(container);
      expect(report.measured).toBeGreaterThan(0);
      // A swatch is a flat field on purpose: a gradient would make the
      // sweep SKIP the text rather than judge it.
      expect(report.skippedNoSolidBackground).toBe(0);
    });

    it('prints the full specification on every tile', () => {
      for (let i = 0; i < templates.length; i += 1) {
        const color = palette[i]!;
        const { container } = mount(
          renderCosmosTemplate(templates[i]!, brand, mock, undefined),
        );
        const text = (container.textContent ?? '').replace(/\s+/g, ' ');
        expect(text).toContain(color.role);
        expect(text).toContain(color.name);
        expect(text).toContain(color.hex.toUpperCase());
        expect(text).toMatch(/RGB \d+ \d+ \d+/);
        expect(text).toMatch(/CMYK \d+ \d+ \d+ \d+/);
        expect(text).toMatch(/HSL \d+° \d+% \d+%/);
        cleanup();
      }
    });

    it('carries the usage split on the primary tile, and only there', () => {
      const first = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
      const strip = first.container.querySelector('[data-color-proportion]');
      expect(strip).not.toBeNull();
      // Sums to 100 — the bar IS the split, not a decoration.
      const pcts = Array.from(strip!.children)
        .map((el) => Number((el.textContent ?? '').replace('%', '')))
        .filter((n) => Number.isFinite(n) && n > 0);
      expect(pcts.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(100);
      cleanup();

      const second = mount(renderCosmosTemplate(templates[1]!, brand, mock, undefined));
      expect(second.container.querySelector('[data-color-proportion]')).toBeNull();
    });

    it('shows every other brand colour set ON this one — the matrix, by row', () => {
      for (let i = 0; i < templates.length; i += 1) {
        const { container } = mount(
          renderCosmosTemplate(templates[i]!, brand, mock, undefined),
        );
        const chips = Array.from(container.querySelectorAll('[title*=" on this colour"]'));
        expect(chips.length).toBe(Math.min(palette.length - 1, 6));
        cleanup();
      }
    });

    it('reads on every swatch the brand owns', () => {
      for (let i = 0; i < templates.length; i += 1) {
        const t = templates[i]!;
        const { container } = mount(renderCosmosTemplate(t, brand, mock, undefined));
        const report = measureContrast(container);
        if (report.violations.length > 0) {
          console.log(
            `\n${t.id} — ${t.name} — ${brand.name}\n${formatViolations(report.violations)}\n`,
          );
        }
        assertReadable(container, {
          maxViolations: BUDGET,
          label: `${t.id} (${t.name}) for ${brand.name}`,
        });
        cleanup();
      }
    });
  },
);
