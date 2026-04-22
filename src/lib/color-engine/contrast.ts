/**
 * Contrast functions for UI Color System.
 *
 * Supports both WCAG 2.x relative-luminance contrast and APCA (Accessible
 * Perceptual Contrast Algorithm) via the `apca-w3` package. Engines must
 * not hand-roll APCA — the algorithm includes clamping, polarity, and
 * anti-aliasing compensation that's easy to get wrong.
 */
import { APCAcontrast, sRGBtoY } from 'apca-w3';

import { hexToRgb } from './conversions';
import type { RgbTuple } from './types';

/** WCAG 2.x relative luminance of an sRGB color. */
export function relativeLuminance(rgb: RgbTuple): number {
  const channel = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const r = channel(rgb.r);
  const g = channel(rgb.g);
  const b = channel(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two colors (range 1..21). */
export function wcagContrast(fgHex: string, bgHex: string): number {
  const fg = relativeLuminance(hexToRgb(fgHex));
  const bg = relativeLuminance(hexToRgb(bgHex));
  const light = Math.max(fg, bg);
  const dark = Math.min(fg, bg);
  return (light + 0.05) / (dark + 0.05);
}

export type WcagLevel = 'AAA' | 'AA' | 'AA-large' | 'fail';

/** Classify a WCAG ratio for normal text. */
export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA-large';
  return 'fail';
}

/**
 * APCA "Lightness contrast" score (Lc). Signed — negative for light text
 * on dark backgrounds, positive for dark text on light. Absolute values
 * of 75+ pass for body text, 60+ for large text.
 */
export function apcaContrast(fgHex: string, bgHex: string): number {
  const fg = hexToRgb(fgHex);
  const bg = hexToRgb(bgHex);
  const result = APCAcontrast(
    sRGBtoY([fg.r, fg.g, fg.b]),
    sRGBtoY([bg.r, bg.g, bg.b]),
  );
  // apca-w3 can return a string ("Lc 75") in some codepaths — coerce.
  return typeof result === 'number' ? result : Number.parseFloat(String(result));
}

export type ApcaLevel = 'fluent' | 'body' | 'large' | 'non-text' | 'fail';

/** Classify APCA Lc. Thresholds are absolute values. */
export function apcaLevel(lc: number): ApcaLevel {
  const abs = Math.abs(lc);
  if (abs >= 90) return 'fluent';
  if (abs >= 75) return 'body';
  if (abs >= 60) return 'large';
  if (abs >= 45) return 'non-text';
  return 'fail';
}

export interface ContrastResult {
  wcag: { ratio: number; level: WcagLevel; passBody: boolean; passLarge: boolean };
  apca: { lc: number; level: ApcaLevel; passBody: boolean; passLarge: boolean };
}

export function evaluatePair(fgHex: string, bgHex: string): ContrastResult {
  const ratio = wcagContrast(fgHex, bgHex);
  const lc = apcaContrast(fgHex, bgHex);
  const level = wcagLevel(ratio);
  const lvlApca = apcaLevel(lc);
  return {
    wcag: {
      ratio,
      level,
      passBody: ratio >= 4.5,
      passLarge: ratio >= 3,
    },
    apca: {
      lc,
      level: lvlApca,
      passBody: Math.abs(lc) >= 75,
      passLarge: Math.abs(lc) >= 60,
    },
  };
}
