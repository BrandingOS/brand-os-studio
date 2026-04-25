import { describe, it, expect } from 'vitest';

import { raqmBrand } from '@/data/brands/raqm';
import { skamBrand } from '@/data/brands/skam';
import { vectorBrand } from '@/data/brands/vector';

import {
  buildBrandPalette,
  isPaletteReadable,
  pickSurfaceTokens,
  type SurfaceKind,
} from './brandPalette';
import { contrastRatio } from './logoOnBackground';

const ALL_KINDS: SurfaceKind[] = [
  'page',
  'card',
  'elevated',
  'subtle',
  'brand',
  'brand-secondary',
  'inverted',
];

describe('brandPalette', () => {
  for (const brand of [raqmBrand, skamBrand, vectorBrand]) {
    describe(brand.name, () => {
      const lightPalette = buildBrandPalette(brand, 'light');
      const darkPalette = buildBrandPalette(brand, 'dark');

      it('builds a palette with all required tokens', () => {
        expect(lightPalette.brand.primary).toMatch(/^#[0-9a-f]{6}$/i);
        expect(lightPalette.brand.secondary).toMatch(/^#[0-9a-f]{6}$/i);
        expect(lightPalette.brand.accent).toMatch(/^#[0-9a-f]{6}$/i);
        expect(lightPalette.bg.page).toBeDefined();
        expect(lightPalette.text.heading).toBeDefined();
      });

      it('every light-mode surface clears 4.5:1 body-text contrast', () => {
        for (const kind of ALL_KINDS) {
          const t = pickSurfaceTokens(lightPalette, kind);
          const ratio = contrastRatio(t.text, t.bg);
          expect(
            ratio,
            `surface "${kind}" on ${brand.name} (light) → text ${t.text} on bg ${t.bg} = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('every dark-mode surface clears 4.5:1 body-text contrast', () => {
        for (const kind of ALL_KINDS) {
          const t = pickSurfaceTokens(darkPalette, kind);
          const ratio = contrastRatio(t.text, t.bg);
          expect(
            ratio,
            `surface "${kind}" on ${brand.name} (dark) → text ${t.text} on bg ${t.bg} = ${ratio.toFixed(2)}:1`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('isPaletteReadable returns true for both modes', () => {
        expect(isPaletteReadable(lightPalette)).toBe(true);
        expect(isPaletteReadable(darkPalette)).toBe(true);
      });
    });
  }

  it('falls back gracefully when brand has no colorSystem', () => {
    const minimal = { primaryColor: '#7c3aed' } as never;
    const palette = buildBrandPalette(minimal, 'light');
    expect(palette.brand.primary.toLowerCase()).toBe('#7c3aed');
    expect(isPaletteReadable(palette)).toBe(true);
  });
});
