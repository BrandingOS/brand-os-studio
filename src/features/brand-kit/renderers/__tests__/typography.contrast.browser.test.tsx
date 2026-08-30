/**
 * The Typography drilldown — the specimen is the brand's, and it is silent.
 *
 * Two families of defect meet on this one card, and both of them are
 * invisible without a real browser:
 *
 *  • **D35 — the specimen was drawn in the product's own font.** An "Aa"
 *    and a family name set in Inter is a specimen of BrandingOS. SKAM's
 *    GT Super is a serif and it rendered as a sans, which is the one thing
 *    a typeface tile must never do. jsdom cannot catch this: with no
 *    cascade `getComputedStyle` answers with the same default for every
 *    node, so the assertion passes vacuously.
 *
 *  • **D33/D34 — 14 to 30 console errors on open.** Every family was
 *    fetched from a third-party TTF proxy that sends no CORS headers, and
 *    a family Google has never heard of was asked for anyway, answering
 *    400. The fix is structural — `isGoogleFontFamily` decides OFFLINE and
 *    the proxy is gone — so the test is structural too: nothing may reach
 *    the network except fonts.googleapis.com, and only for a family that
 *    is really there.
 *
 * The brands are deliberately opposite. Raqm's pair is Inter and DM Sans,
 * both catalogued and both fetchable. SKAM's heading face is GT Super, a
 * foundry family nothing can fetch — so the tile has to say so in words
 * rather than by failing.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
// The real stylesheets. Without them every utility class is inert and the
// sweep measures the browser's defaults.
import '@/index.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { _resetFontCache } from '@/shared/design-system/fonts';
import type { Brand } from '@/shared/types/brand';
import { variantsForCard } from '../../data/legacy-mapping';
import { aspectForLabel } from '../../data/cardPresentation';
import { parseWeights } from '../../data/fontExport';
import { renderCosmosTemplate } from '../index';
import { assertReadable, formatViolations, measureContrast } from '../__guards__/contrast';

/** Zero. A specimen nobody can read is not a specimen. */
const BUDGET = 0;

/** The canonical tile width the renderers are authored for. */
const TILE = 260;
const HEIGHT = Math.round(TILE / aspectForLabel('Fonts'));

/**
 * Raqm as the seed ships it, and SKAM with its canonical typography named.
 *
 * SKAM's serif lives in `guidelines.typography`, which is a different
 * field from `brand.typography`, so the projection would otherwise fall
 * back to the legacy pair and the foundry family — the whole point of the
 * second brand here — would never appear.
 */
const RAQM: Brand = SEED_BRANDS[0]!;
const SKAM: Brand = {
  ...SEED_BRANDS[1]!,
  typography: {
    primary: { family: 'GT Super', weights: [400, 500, 700], fallbacks: ['Georgia', 'serif'] },
    secondary: { family: 'Bricolage Grotesque', weights: [400, 600, 700, 800] },
  },
};

const BRANDS: ReadonlyArray<readonly [string, Brand]> = [
  ['Raqm', RAQM],
  ['SKAM', SKAM],
];

afterEach(() => {
  cleanup();
  document.head.querySelectorAll('link[data-brand-font]').forEach((el) => el.remove());
});

function mount(node: React.ReactNode) {
  const host = document.createElement('div');
  host.style.width = `${TILE}px`;
  host.style.height = `${HEIGHT}px`;
  host.style.background = '#ffffff';
  document.body.appendChild(host);
  return render(<>{node}</>, { container: host });
}

/** Every element on the tile whose text is set in a brand face. */
function typeset(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) => {
    const own = el.style.fontFamily;
    return Boolean(own);
  });
}

describe.each(BRANDS)('the Typography specimen · %s', (_name, brand) => {
  const mock = brandToMockBrand(brand);
  const templates = variantsForCard('brand-assets', 'Fonts', mock);

  it('offers one tile per typeface the brand declares', () => {
    expect(templates.length).toBe(mock.fonts.length);
    expect(templates.length).toBeGreaterThan(0);
  });

  it('sets every glyph in the family the tile names (D35)', () => {
    for (let i = 0; i < templates.length; i += 1) {
      const family = mock.fonts[i]!.family;
      const { container } = mount(renderCosmosTemplate(templates[i]!, brand, mock, undefined));

      const specimens = typeset(container).filter((el) =>
        getComputedStyle(el).fontFamily.includes(family),
      );
      // The family name, the nine-or-fewer weight glyphs and the four
      // scale steps are all set in it — never one token of it.
      expect(specimens.length).toBeGreaterThanOrEqual(5);

      // And nothing that is meant to be the specimen falls back to the
      // product's own UI font, which is what D35 actually looked like.
      for (const el of specimens) {
        const stack = getComputedStyle(el).fontFamily;
        expect(stack.startsWith(family) || stack.startsWith(`"${family}"`)).toBe(true);
      }
      cleanup();
    }
  });

  it('draws each declared weight at that weight, not four copies of one', () => {
    for (let i = 0; i < templates.length; i += 1) {
      const declared = parseWeights(mock.fonts[i]!.weights);
      const { container } = mount(renderCosmosTemplate(templates[i]!, brand, mock, undefined));
      const drawn = Array.from(container.querySelectorAll<HTMLElement>('*'))
        .filter((el) => el.textContent === 'Aa' && el.style.fontFamily)
        .map((el) => getComputedStyle(el).fontWeight);
      expect(drawn).toEqual(declared.map(String));
      cleanup();
    }
  });

  it('prints the scale with its real sizes, so the family is judged at them', () => {
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toContain('H1 48');
    expect(text).toContain('Body 16');
    expect(text).toContain('Caption 12');
  });

  it('says what the pairing is, and what the face is for', () => {
    const { container } = mount(renderCosmosTemplate(templates[0]!, brand, mock, undefined));
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    if (mock.fonts.length > 1) {
      expect(text).toContain(`Pairs with ${mock.fonts[1]!.family}`);
    } else {
      expect(text).toContain('sets everything in this one face');
    }
  });

  it('names where the files come from — and says when there are none (D32)', () => {
    for (let i = 0; i < templates.length; i += 1) {
      const family = mock.fonts[i]!.family;
      const { container } = mount(renderCosmosTemplate(templates[i]!, brand, mock, undefined));
      const text = (container.textContent ?? '').replace(/\s+/g, ' ');
      if (family === 'GT Super') {
        // A folder holding a README and nothing else, with nothing on
        // screen saying so, is what D32 was.
        expect(text).toContain('Not bundled');
        expect(text).toContain('Upload your licensed copy');
      } else {
        expect(text).toMatch(/Google Fonts|Your files/);
      }
      cleanup();
    }
  });

  it('reads at the size the tile actually mounts', () => {
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
});

/* ─── Silence ──────────────────────────────────────────────────────── */

describe('the Typography drilldown makes no noise (D33/D34)', () => {
  let errors: unknown[][];
  let warnings: unknown[][];
  let fetches: string[];

  beforeEach(() => {
    errors = [];
    warnings = [];
    fetches = [];
    // The loader remembers which families it has already asked for, and
    // the tiles above this block have asked for all of them. Without the
    // reset the sweep would measure an empty <head> and pass by accident.
    _resetFontCache();
    vi.spyOn(console, 'error').mockImplementation((...args) => {
      errors.push(args);
    });
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      warnings.push(args);
    });
    const realFetch = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      fetches.push(String(input instanceof Request ? input.url : input));
      return realFetch(input, init);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders every tile of both brands with an empty console', () => {
    for (const [, brand] of BRANDS) {
      const mock = brandToMockBrand(brand);
      for (const template of variantsForCard('brand-assets', 'Fonts', mock)) {
        mount(renderCosmosTemplate(template, brand, mock, undefined));
      }
    }
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('reaches no third-party font proxy — the CORS failures had one source', () => {
    for (const [, brand] of BRANDS) {
      const mock = brandToMockBrand(brand);
      for (const template of variantsForCard('brand-assets', 'Fonts', mock)) {
        mount(renderCosmosTemplate(template, brand, mock, undefined));
      }
    }
    // `gwfh.mranftl.com` sends no CORS headers, so every call it ever got
    // failed; the only thing it produced was `net::ERR_FAILED`.
    expect(fetches.filter((u) => /gwfh|mranftl/.test(u))).toEqual([]);
  });

  it('asks Google only for families Google has (D33/D34)', () => {
    for (const [, brand] of BRANDS) {
      const mock = brandToMockBrand(brand);
      for (const template of variantsForCard('brand-assets', 'Fonts', mock)) {
        mount(renderCosmosTemplate(template, brand, mock, undefined));
      }
    }
    const links = Array.from(
      document.head.querySelectorAll<HTMLLinkElement>('link[data-brand-font]'),
    );
    // Raqm's two are catalogued; SKAM's Bricolage is, and GT Super is not.
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link.href).toContain('fonts.googleapis.com');
      // The 400 that printed one red line per brand that licensed a real
      // typeface.
      expect(link.href).not.toMatch(/GT(\+|%20)Super/);
    }
  });
});
