/**
 * Shared types and helpers for the showcase tiles.
 *
 * Every showcase takes the same `ShowcaseProps`, so `MainBoard` can
 * render whichever one the active tab points to without per-tab
 * plumbing. The `palette` is the full Zustand snapshot; showcases pull
 * whatever tokens/scales they need.
 */
import { apcaContrast, type ColorScale, type PaletteSystem } from '@/lib/color-engine';

export interface ShowcaseProps {
  palette: PaletteSystem;
  /** Present when the user added a secondary scale. */
  secondary?: ColorScale | null;
}

/**
 * Pick the best-contrast foreground hex (either `#ffffff` or `#111111`)
 * against the given background. Showcase cards use this whenever they
 * render text on a brand-colored surface so it stays legible.
 */
export function pickOn(bgHex: string, onDark = '#ffffff', onLight = '#111111'): string {
  const lightDelta = Math.abs(apcaContrast(onDark, bgHex));
  const darkDelta = Math.abs(apcaContrast(onLight, bgHex));
  return lightDelta >= darkDelta ? onDark : onLight;
}

/**
 * Lightweight "is this scale light or dark at 500?" check — some tiles
 * flip layout direction based on whether the brand reads as bright or
 * deep. Used for hero placement and accent contrast.
 */
export function isDarkScale(scale: ColorScale): boolean {
  return scale.shades[500].oklch.l < 0.6;
}
