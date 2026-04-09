/**
 * Palette construction + color helpers used by the engine and UI.
 *
 * This module is the bridge between a brand and the engine's
 * `PaletteContext` — and also the place where extracted-from-pixel
 * colors land for public-mode use (we don't have a brand to read from).
 */
import type { Brand } from '@/shared/types/brand';
import type { ColorRef, PaletteContext } from './types';

const BLACK: ColorRef = { hex: '#000000', source: 'neutral', label: 'Black' };
const WHITE: ColorRef = { hex: '#FFFFFF', source: 'neutral', label: 'White' };

export function emptyPalette(): PaletteContext {
  return {
    brandColors: [],
    customColors: [],
    neutrals: { black: BLACK, white: WHITE },
  };
}

export function paletteFromBrand(brand: Brand): PaletteContext {
  const colors: ColorRef[] = [];
  if (brand.primaryColor) {
    colors.push({
      hex: brand.primaryColor,
      source: 'brand-primary',
      label: 'Primary',
    });
  }
  if (brand.secondaryColor) {
    colors.push({
      hex: brand.secondaryColor,
      source: 'brand-secondary',
      label: 'Secondary',
    });
  }
  // Brand guidelines may carry an accent — pull it through if present.
  const accent = brand.guidelines?.colorPalette?.accent?.hex;
  if (accent) {
    colors.push({ hex: accent, source: 'brand-accent', label: 'Accent' });
  }
  return {
    brandColors: colors,
    customColors: [],
    neutrals: { black: BLACK, white: WHITE },
  };
}

export function paletteFromColors(hexes: string[]): PaletteContext {
  return {
    brandColors: hexes.slice(0, 3).map((hex, i) => ({
      hex,
      source: i === 0 ? 'brand-primary' : i === 1 ? 'brand-secondary' : 'brand-accent',
      label: i === 0 ? 'Primary' : i === 1 ? 'Secondary' : 'Accent',
    })),
    customColors: [],
    neutrals: { black: BLACK, white: WHITE },
  };
}

export function addCustomColor(palette: PaletteContext, hex: string): PaletteContext {
  if (palette.customColors.some((c) => c.hex.toLowerCase() === hex.toLowerCase())) {
    return palette;
  }
  return {
    ...palette,
    customColors: [
      ...palette.customColors,
      { hex, source: 'custom', label: `Custom ${palette.customColors.length + 1}` },
    ],
  };
}

export function allPaletteColors(p: PaletteContext): ColorRef[] {
  return [...p.brandColors, ...p.customColors, p.neutrals.white, p.neutrals.black];
}

// ─── Hex / contrast helpers (small, self-contained, no external dep) ───

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(v.substring(0, 2), 16),
    g: parseInt(v.substring(2, 4), 16),
    b: parseInt(v.substring(4, 6), 16),
  };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export type ContrastGrade = 'AAA' | 'AA' | 'AA-large' | 'fail';

export function gradeContrast(fg: string, bg: string): ContrastGrade {
  const r = contrastRatio(fg, bg);
  if (r >= 7) return 'AAA';
  if (r >= 4.5) return 'AA';
  if (r >= 3) return 'AA-large';
  return 'fail';
}

export function isLightHex(hex: string): boolean {
  return relativeLuminance(hex) > 0.179;
}
