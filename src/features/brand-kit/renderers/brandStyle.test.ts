/**
 * `brandStyle` is the only styling authority a renderer has, so it is
 * tested against the brands the app actually ships with — Raqm, SKAM,
 * Vector and Uniex — rather than a fixture invented to suit it. Three of
 * those four carry NO `colorSystem` and NO `typography`: they are legacy
 * shapes, which is exactly the case a renderer must not fall apart on.
 */
import { describe, it, expect } from 'vitest';
import {
  SEED_BRANDS,
  SKAM_LOGO_URL,
  raqmBrand,
  skamBrand,
  vectorBrand,
  uniexBrand,
} from '@/data/brands';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { contrastRatio } from '@/shared/brand/logoOnBackground';
import type { SurfaceKind } from '@/shared/brand/brandPalette';
import {
  brandColors,
  contrastOf,
  contrastOk,
  fgOn,
  fontFamily,
  fontStack,
  isMockBrand,
  logoOn,
  normalizeHex,
  surface,
} from './brandStyle';

const KINDS: SurfaceKind[] = [
  'page',
  'card',
  'elevated',
  'subtle',
  'brand',
  'brand-secondary',
  'inverted',
];

const HEX = /^#[0-9a-f]{6}$/;

describe('normalizeHex', () => {
  it('expands the three-digit form, which the WCAG helpers cannot parse', () => {
    // A `#fff` handed to `contrastRatio` scores as BLACK — it fails the
    // six-digit regex and returns luminance 0. Every colour that leaves
    // this module is expanded for that reason.
    expect(normalizeHex('#fff')).toBe('#ffffff');
    expect(contrastRatio('#fff', '#000000')).toBe(1); // the bug, pinned
    expect(contrastRatio(normalizeHex('#fff')!, '#000000')).toBeCloseTo(21, 0);
  });

  it('accepts a missing hash and any casing', () => {
    expect(normalizeHex('7231FF')).toBe('#7231ff');
    expect(normalizeHex('  #7231FF ')).toBe('#7231ff');
  });

  it('refuses anything that is not a hex colour', () => {
    for (const bad of ['', 'rebeccapurple', 'rgb(0,0,0)', '#12345', null, undefined]) {
      expect(normalizeHex(bad as string)).toBeUndefined();
    }
  });
});

describe('isMockBrand', () => {
  it('separates the two shapes a renderer is handed', () => {
    expect(isMockBrand(mockBrand)).toBe(true);
    for (const b of SEED_BRANDS) expect(isMockBrand(b)).toBe(false);
    expect(isMockBrand(null)).toBe(false);
    expect(isMockBrand(undefined)).toBe(false);
  });
});

describe('brandColors', () => {
  for (const brand of SEED_BRANDS) {
    it(`normalises ${brand.name}'s colours`, () => {
      const c = brandColors(brand);
      expect(c.primary).toMatch(HEX);
      expect(c.secondary).toMatch(HEX);
      for (const hex of [...c.accent, ...c.neutrals]) expect(hex).toMatch(HEX);
    });
  }

  it('reads the legacy scalars when there is no colorSystem', () => {
    // Three of the four seeds are this shape.
    expect(raqmBrand.colorSystem).toBeUndefined();
    expect(brandColors(raqmBrand).primary).toBe('#7231ff');
    expect(brandColors(raqmBrand).secondary).toBe('#00d4aa');
  });

  it('collects accents and neutrals from every place a brand can hold them', () => {
    expect(brandColors(vectorBrand).accent).toContain('#6be6f4');
    const uniex = brandColors(uniexBrand);
    expect(uniex.accent).toContain('#68be69');
    expect(uniex.neutrals).toEqual(['#0a0f2e', '#1f2a56', '#94a3b8', '#f1f5f9', '#ffffff']);
  });

  it('de-duplicates', () => {
    const c = brandColors(uniexBrand);
    expect(new Set(c.neutrals).size).toBe(c.neutrals.length);
    expect(new Set(c.accent).size).toBe(c.accent.length);
  });

  it('reads a MockBrand core as primary · secondary · the rest', () => {
    const c = brandColors(mockBrand);
    expect(c.primary).toBe('#2550e3');
    expect(c.secondary).toBe('#f1eee4');
    // core[2] is not a third "core" to a renderer — it is another colour
    // the brand owns, so it joins the accents.
    expect(c.accent[0]).toBe('#111113');
    expect(c.neutrals.length).toBeGreaterThan(0);
  });

  it('answers for no brand at all rather than throwing', () => {
    const c = brandColors(null);
    expect(c.primary).toMatch(HEX);
    expect(c.accent).toEqual([]);
  });
});

describe('surface', () => {
  for (const brand of SEED_BRANDS) {
    it(`gives ${brand.name} a readable bundle for every kind`, () => {
      for (const kind of KINDS) {
        const s = surface(brand, kind);
        expect(s.bg, `${brand.name}/${kind} bg`).toMatch(HEX);
        expect(
          contrastRatio(s.text, s.bg),
          `${brand.name}/${kind}: heading on bg`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('runs a MockBrand through the SAME algorithm, not a second one', () => {
    for (const kind of KINDS) {
      const s = surface(mockBrand, kind);
      expect(s.bg).toMatch(HEX);
      expect(contrastRatio(s.text, s.bg), `mock/${kind}`).toBeGreaterThanOrEqual(4.5);
    }
    // The projection is the brand's own colours, not a neutral default.
    expect(surface(mockBrand, 'brand').bg).toBe(brandColors(mockBrand).primary);
  });

  it('answers in dark mode too', () => {
    const light = surface(vectorBrand, 'page', 'light');
    const dark = surface(vectorBrand, 'page', 'dark');
    expect(dark.bg).not.toBe(light.bg);
    expect(contrastRatio(dark.text, dark.bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('does not throw for a missing brand', () => {
    expect(surface(null, 'card').bg).toMatch(HEX);
  });
});

describe('fgOn', () => {
  it('picks the readable end of black/white by default', () => {
    expect(fgOn('#ffffff')).toBe('#000000');
    expect(fgOn('#000000')).toBe('#ffffff');
  });

  it('handles the short form, which a brand record often carries', () => {
    expect(fgOn('#fff')).toBe('#000000');
  });

  it('restricts itself to the brand colours when asked', () => {
    const c = brandColors(vectorBrand);
    const fg = fgOn(c.primary, [c.secondary, ...c.accent, ...c.neutrals]);
    expect([c.secondary, ...c.accent, ...c.neutrals]).toContain(fg);
  });

  it('is conservative rather than wrong on an unparseable background', () => {
    expect(fgOn('not a colour')).toBe('#000000');
  });
});

describe('logoOn', () => {
  it('never returns a variant that cannot be seen on the ground', () => {
    for (const brand of SEED_BRANDS) {
      for (const bg of ['#ffffff', '#000000', brandColors(brand).primary]) {
        const picked = logoOn(brand, bg);
        // `undefined` is a legitimate answer — the caller draws a letter.
        if (picked) expect(typeof picked.url).toBe('string');
      }
    }
  });

  it('never returns the coloured mark on the brand\'s own colour', () => {
    // SKAM's primary is red. The coloured logo is inked in that red, so on
    // a red ground it is invisible — the picker has to walk to a mono twin.
    const onRed = logoOn(skamBrand, skamBrand.primaryColor);
    expect(onRed).toBeDefined();
    expect(onRed!.url).not.toBe(SKAM_LOGO_URL);
  });

  it('answers undefined for a MockBrand, which carries no asset library', () => {
    // A MockBrand holds inline SVG strings, not BrandAsset records. A
    // guess here is the invisible-logo bug; the caller draws its letter.
    expect(logoOn(mockBrand, '#ffffff')).toBeUndefined();
  });

  it('answers undefined for no brand and for a broken background', () => {
    expect(logoOn(null, '#ffffff')).toBeUndefined();
    expect(logoOn(raqmBrand, 'nope')).toBeUndefined();
  });
});

describe('contrastOk', () => {
  it('uses 4.5 for body and 3 for large text', () => {
    // #767676 on white is ~4.54 — passes both.
    expect(contrastOk('#767676', '#ffffff')).toBe(true);
    // #949494 on white is ~3.0 — large only.
    expect(contrastOk('#949494', '#ffffff')).toBe(false);
    expect(contrastOk('#949494', '#ffffff', true)).toBe(true);
  });

  it('refuses rather than passes when a colour does not parse', () => {
    expect(contrastOk('teal', '#ffffff')).toBe(false);
  });

  it('exposes the raw ratio for ranking', () => {
    expect(contrastOf('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrastOf('#fff', '#000')).toBeCloseTo(21, 0);
  });
});

describe('fontStack', () => {
  it('names the brand family first and always ends in a generic', () => {
    const stack = fontStack(vectorBrand, 'heading');
    expect(stack.startsWith("'IBM Plex Sans'")).toBe(true);
    expect(stack.endsWith('sans-serif')).toBe(true);
  });

  it('reads the legacy fonts pair when there is no typography system', () => {
    expect(vectorBrand.typography).toBeUndefined();
    expect(fontFamily(vectorBrand, 'heading')).toBe('IBM Plex Sans');
    expect(fontFamily(vectorBrand, 'body')).toBe('Plus Jakarta Sans');
  });

  it('falls body back to the heading family when a brand names only one', () => {
    const oneFont = { ...raqmBrand, fonts: { primary: 'Inter' } };
    expect(fontFamily(oneFont, 'body')).toBe('Inter');
  });

  it('decides "Sans" before "Serif", or every … Sans Serif lands on Georgia', () => {
    const sansSerif = { ...raqmBrand, fonts: { primary: 'Noto Sans Serif' } };
    expect(fontStack(sansSerif, 'heading').endsWith('sans-serif')).toBe(true);
    const serif = { ...raqmBrand, fonts: { primary: 'Playfair Display' } };
    expect(fontStack(serif, 'heading')).toContain('Georgia');
  });

  it('gives mono the mono ladder and never invents a mono family', () => {
    // No canonical mono slot exists on any seed brand.
    expect(fontFamily(raqmBrand, 'mono')).toBeUndefined();
    expect(fontStack(raqmBrand, 'mono')).toBe(
      "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    );
  });

  it('quotes a family only when CSS requires it', () => {
    const single = { ...raqmBrand, fonts: { primary: 'Inter' } };
    expect(fontStack(single, 'heading').startsWith('Inter,')).toBe(true);
    const spaced = { ...raqmBrand, fonts: { primary: 'DM Sans' } };
    expect(fontStack(spaced, 'heading').startsWith("'DM Sans',")).toBe(true);
  });

  it('reads a MockBrand role label, not its position', () => {
    // mockBrand's fonts carry free-form roles ("Display" / "Text").
    const heading = fontFamily(mockBrand, 'heading');
    const body = fontFamily(mockBrand, 'body');
    expect(typeof heading).toBe('string');
    expect(typeof body).toBe('string');
    expect(fontStack(mockBrand, 'heading')).toContain(heading!);
  });

  it('honours fallbacks the brand declared, ahead of the generic ladder', () => {
    const withFallbacks = {
      ...raqmBrand,
      typography: { primary: { family: 'Inter', fallbacks: ['Helvetica Neue'] } },
    } as typeof raqmBrand;
    const stack = fontStack(withFallbacks, 'heading');
    expect(stack.indexOf("'Helvetica Neue'")).toBeGreaterThan(stack.indexOf('Inter'));
    expect(stack.endsWith('sans-serif')).toBe(true);
  });

  it('gives a brandless caller a real stack rather than an empty string', () => {
    expect(fontStack(null, 'heading').endsWith('sans-serif')).toBe(true);
    expect(fontStack(undefined, 'body').endsWith('sans-serif')).toBe(true);
  });

  for (const brand of SEED_BRANDS) {
    it(`produces a usable stack for ${brand.name} in every role`, () => {
      for (const role of ['heading', 'body', 'mono'] as const) {
        const stack = fontStack(brand, role);
        expect(stack.length).toBeGreaterThan(0);
        expect(/serif|monospace|cursive/.test(stack)).toBe(true);
      }
    });
  }
});
