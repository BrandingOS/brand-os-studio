/**
 * The Icons drilldown — a specimen you can read, and a symbol you can see.
 *
 * Two different failures live on this tile and only one of them is text.
 *
 *  • The CAPTIONS — weight, tint hex, the icon's name, the size ladder — are
 *    ordinary text on the card's own ground and are swept like every other
 *    family's, budget zero.
 *  • The GLYPH is not text. It is a webfont character drawn through
 *    `::before`, so the contrast sweep cannot see it at all, and a brand
 *    whose primary is near-white would sail through this file with an
 *    invisible icon set. So the well's ground is asserted directly: the tint
 *    must clear 3:1 on whatever the renderer chose to draw it on.
 *
 * jsdom answers neither — with no cascade every node measures black on white
 * and passes vacuously — so this lives in the browser project with the real
 * stylesheets loaded.
 *
 * Two brands, and their tints are opposite: Raqm is a violet, SKAM a red
 * beside pure white and pure black.
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
import { iconLabel } from '../../data/iconPacks';
import { detectIconWeight, ICON_WEIGHTS } from '../../data/iconWeights';
import { renderCosmosTemplate } from '../index';
import { contrastRatio } from '@/shared/brand/logoOnBackground';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. A caption nobody can read is a caption that is not there. */
const BUDGET = 0;

/** The canonical tile width every renderer here is drawn for. */
const TILE = 260;
const HEIGHT = Math.round(TILE / aspectForLabel('Icons'));

/** WCAG's floor for graphics and large text. A symbol is a graphic. */
const GLYPH_MIN = 3;

afterEach(cleanup);

function mount(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = `${TILE}px`;
  host.style.height = `${HEIGHT}px`;
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

/** The first opaque background painted behind `el`, climbing to the root. */
function effectiveBackground(el: Element | null): string {
  let node: Element | null = el;
  while (node) {
    const bg = window.getComputedStyle(node).backgroundColor;
    const m = /^rgba?\(([^)]+)\)$/.exec(bg);
    if (m) {
      const parts = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
      const alpha = parts.length > 3 ? parts[3]! : 1;
      if (alpha > 0.95) return bg;
    }
    node = node.parentElement;
  }
  return 'rgb(255, 255, 255)';
}

function toHex(rgb: string): string {
  const m = /^rgba?\(([^)]+)\)$/.exec(rgb);
  if (!m) return '#000000';
  const [r, g, b] = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number);
  return `#${[r, g, b].map((n) => Math.round(n ?? 0).toString(16).padStart(2, '0')).join('')}`;
}

const BRANDS = SEED_BRANDS.slice(0, 2);

describe.each(BRANDS.map((b) => [b.name, b] as const))(
  'contrast sweep — Icons · %s',
  (_name, brand) => {
    const mock = brandToMockBrand(brand);
    const templates = variantsForCard('brand-assets', 'Icons', mock);

    it('offers a designed set, not fifty tiles (D59)', () => {
      expect(templates.length).toBeGreaterThanOrEqual(24);
      expect(templates.length).toBeLessThanOrEqual(32);
      expect(templates).toHaveLength(mock.icons.length);
    });

    it('every tile is a specimen — the name, the weight and the sizes', () => {
      for (let i = 0; i < templates.length; i += 1) {
        const source = mock.icons[i]!;
        const { container } = mount(
          renderCosmosTemplate(templates[i]!, brand, mock, undefined),
        );
        const text = (container.textContent ?? '').replace(/\s+/g, ' ');
        expect(text).toContain(iconLabel(source, i));
        const weight = detectIconWeight(source);
        expect(text).toContain(ICON_WEIGHTS.find((w) => w.id === weight)!.label);
        // The ladder the specimen actually draws.
        expect(text).toContain('48 · 32 · 24 px');
        cleanup();
      }
    });

    it('draws the symbol three times, at the sizes it names', () => {
      const { container } = mount(
        renderCosmosTemplate(templates[0]!, brand, mock, undefined),
      );
      const glyphs = Array.from(container.querySelectorAll('.bk-icon-specimen-glyph'));
      expect(glyphs).toHaveLength(3);
      const sizes = glyphs.map((g) => Math.round(parseFloat(window.getComputedStyle(g).fontSize)));
      expect(sizes).toEqual([48, 32, 24]);
    });

    it('keeps the hook the Icons download collects tiles by', () => {
      // `BrandKitCosmosPage` queries `.brand-asset-render--icon` and
      // `iconExport.readGlyphInfo` reads the codepoint off the `<i>` inside.
      // Rename either and the download silently produces an empty zip.
      const { container } = mount(
        renderCosmosTemplate(templates[0]!, brand, mock, undefined),
      );
      const root = container.querySelector('.brand-asset-render--icon');
      expect(root).not.toBeNull();
      expect(root!.querySelector('i')).not.toBeNull();
    });

    it('shows the tint the brand has decided on', () => {
      const tint = (mock.iconTint ?? mock.colors.core[0]!.hex).toUpperCase();
      const { container } = mount(
        renderCosmosTemplate(templates[0]!, brand, mock, undefined),
      );
      expect((container.textContent ?? '')).toContain(tint);
    });

    it('paints the symbol on a ground it can be seen on', () => {
      for (let i = 0; i < templates.length; i += 1) {
        const { container } = mount(
          renderCosmosTemplate(templates[i]!, brand, mock, undefined),
        );
        const glyph = container.querySelector('.bk-icon-specimen-glyph');
        expect(glyph).not.toBeNull();
        const ink = toHex(window.getComputedStyle(glyph!).color);
        const ground = toHex(effectiveBackground(glyph));
        const ratio = contrastRatio(ink, ground);
        expect(
          ratio,
          `${templates[i]!.name}: ${ink} on ${ground} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(GLYPH_MIN);
        cleanup();
      }
    });

    it('measures real colours, not jsdom defaults', () => {
      const { container } = mount(
        renderCosmosTemplate(templates[0]!, brand, mock, undefined),
      );
      const report = measureContrast(container);
      expect(report.measured).toBeGreaterThan(0);
      // A specimen sits on a flat ground on purpose — a gradient would make
      // the sweep SKIP the captions rather than judge them.
      expect(report.skippedNoSolidBackground).toBe(0);
    });

    it('every caption on every tile reads', () => {
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
