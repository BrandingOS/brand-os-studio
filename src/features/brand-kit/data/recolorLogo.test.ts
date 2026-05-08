import { describe, expect, it } from 'vitest';
import { logoCombosFor, visuallyClose } from './recolorLogo';

describe('visuallyClose', () => {
  it('treats near-identical near-black shades as the same color', () => {
    expect(visuallyClose('#000000', '#080808')).toBe(true);
    expect(visuallyClose('#0A0A0F', '#181818')).toBe(true);
  });

  it('keeps obviously different shades distinct', () => {
    expect(visuallyClose('#000000', '#FFFFFF')).toBe(false);
    expect(visuallyClose('#000000', '#7231FF')).toBe(false);
    expect(visuallyClose('#FAFAFA', '#3A3A3A')).toBe(false);
  });
});

describe('logoCombosFor', () => {
  const oneLogo = [{ id: 'p', label: 'Primary', svg: '<svg/>' }];

  it('collapses a 32-step black→white ramp to a small set of distinct backgrounds', () => {
    // Mirrors the ramp `brandToMockBrand` produces for every brand.
    const ramp = Array.from({ length: 32 }, (_, i) => {
      const v = Math.round((i / 31) * 255);
      const h = v.toString(16).padStart(2, '0').toUpperCase();
      return { hex: `#${h}${h}${h}`, name: `Step${i}` };
    });
    const combos = logoCombosFor({
      logos: oneLogo,
      colors: {
        core: [{ hex: '#7231FF', name: 'Primary' }],
        accent: [],
        grey: ramp,
      },
    });
    // Mark colors used: Primary, White (Secondary skipped — only one core).
    // Dedup target: 32-step ramp + 1 brand color collapses to <= 8
    // representative backgrounds. Keep some headroom (the dedup is
    // perceptual, not a fixed fraction) but flag the regression if it
    // ever explodes back near 96.
    expect(combos.length).toBeLessThan(20);
  });

  it('keeps a curated brand palette intact (no spurious dedup)', () => {
    // Distinct brand colors should all survive — the dedup is for
    // collapsing near-identical neutrals, not for trimming a designer's
    // intentional palette.
    const combos = logoCombosFor({
      logos: oneLogo,
      colors: {
        core: [
          { hex: '#7231FF', name: 'Primary' },
          { hex: '#00D4AA', name: 'Secondary' },
        ],
        accent: [{ hex: '#F59E0B', name: 'Accent' }],
        grey: [
          { hex: '#FFFFFF', name: 'White' },
          { hex: '#000000', name: 'Black' },
        ],
      },
    });
    // Backgrounds: 5 distinct (Primary, Secondary, Accent, White, Black).
    // Marks: 3 (Primary, Secondary, White). 5*3 = 15, minus contrast skips.
    // With the kit's typical contrast skips (mark === bg, low contrast)
    // we expect at least 8 — well above the threshold.
    expect(combos.length).toBeGreaterThan(8);
  });

  it('returns empty when there are no logos', () => {
    const combos = logoCombosFor({
      logos: [],
      colors: { core: [{ hex: '#000', name: 'Primary' }], accent: [], grey: [] },
    });
    expect(combos).toEqual([]);
  });
});
