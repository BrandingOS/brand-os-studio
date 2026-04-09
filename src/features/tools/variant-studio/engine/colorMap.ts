/**
 * colorMap — derive per-layer color picks from a `colorMode` and palette.
 *
 * Pure function. The renderer reads the resulting `ColorMap` and applies
 * it to the icon and wordmark layers; backgrounds are handled separately
 * via `Background`.
 *
 * Brand mode is intentionally smart: it picks the highest-contrast brand
 * color against the chosen background, falling back to neutrals when no
 * brand color clears the AA threshold.
 */
import type { ColorMap, ColorMode, ColorRef, PaletteContext } from './types';
import { contrastRatio } from './palette';

export function deriveColorMap(
  mode: ColorMode,
  palette: PaletteContext,
  bgHex: string,
  override?: Partial<ColorMap>,
): ColorMap {
  if (mode === 'mono-black') {
    return {
      icon: palette.neutrals.black,
      wordmark: palette.neutrals.black,
    };
  }
  if (mode === 'mono-white') {
    return {
      icon: palette.neutrals.white,
      wordmark: palette.neutrals.white,
    };
  }
  if (mode === 'inverse') {
    // For inverse, we treat brand colors as the canonical fills and let
    // the renderer apply a luminance flip. We still report what the user
    // sees so the contrast pill is meaningful.
    const primary = palette.brandColors[0];
    return {
      icon: primary ?? palette.neutrals.white,
      wordmark: primary ?? palette.neutrals.white,
    };
  }
  if (mode === 'custom') {
    return {
      icon: override?.icon ?? palette.brandColors[0] ?? palette.neutrals.black,
      wordmark: override?.wordmark ?? palette.brandColors[0] ?? palette.neutrals.black,
      accent: override?.accent,
    };
  }
  // 'brand' — pick best contrast against background.
  const candidates: ColorRef[] = [
    ...palette.brandColors,
    palette.neutrals.black,
    palette.neutrals.white,
  ];
  const best = pickHighestContrast(candidates, bgHex);
  // Use the brand primary specifically when it clears AA; otherwise the
  // best contrast pick (which may be black/white).
  const primary = palette.brandColors[0];
  const usePrimary = primary && contrastRatio(primary.hex, bgHex) >= 4.5;
  return {
    icon: usePrimary ? primary : best,
    wordmark: usePrimary ? primary : best,
  };
}

function pickHighestContrast(candidates: ColorRef[], bgHex: string): ColorRef {
  let best = candidates[0];
  let bestRatio = 0;
  for (const c of candidates) {
    const r = contrastRatio(c.hex, bgHex);
    if (r > bestRatio) {
      best = c;
      bestRatio = r;
    }
  }
  return best;
}
