/**
 * WCAG 2.1 Color Contrast Utilities
 * Implements contrast ratio calculation and accessibility validation.
 */

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/** Convert sRGB channel (0-255) to linear value for luminance calc */
function sRGBtoLinear(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Calculate relative luminance per WCAG 2.1 */
export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * sRGBtoLinear(rgb.r) + 0.7152 * sRGBtoLinear(rgb.g) + 0.0722 * sRGBtoLinear(rgb.b);
}

/** Calculate WCAG contrast ratio between two colors (1:1 to 21:1) */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type WCAGLevel = 'AAA' | 'AA' | 'Fail';

/** Check WCAG level for normal text (min 4.5:1 AA, 7:1 AAA) */
export function getWCAGLevel(ratio: number): WCAGLevel {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  return 'Fail';
}

/** Check WCAG level for large text (min 3:1 AA, 4.5:1 AAA) */
export function getWCAGLevelLarge(ratio: number): WCAGLevel {
  if (ratio >= 4.5) return 'AAA';
  if (ratio >= 3) return 'AA';
  return 'Fail';
}

export interface ContrastResult {
  ratio: number;
  ratioText: string;
  normalText: WCAGLevel;
  largeText: WCAGLevel;
  passed: boolean;
}

/** Full contrast analysis between two colors */
export function analyzeContrast(fg: string, bg: string): ContrastResult {
  const ratio = contrastRatio(fg, bg);
  const normalText = getWCAGLevel(ratio);
  const largeText = getWCAGLevelLarge(ratio);
  return {
    ratio,
    ratioText: `${ratio.toFixed(2)}:1`,
    normalText,
    largeText,
    passed: normalText !== 'Fail',
  };
}

/** Suggest a lighter or darker shade to meet minimum contrast */
export function suggestAccessibleColor(color: string, background: string, targetRatio = 4.5): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const bgLum = relativeLuminance(background);
  let best = color;
  let bestDiff = Infinity;

  // Try adjusting brightness in small steps
  for (let factor = 0; factor <= 200; factor += 2) {
    // Try darker
    const dark = {
      r: Math.max(0, Math.round(rgb.r * (1 - factor / 200))),
      g: Math.max(0, Math.round(rgb.g * (1 - factor / 200))),
      b: Math.max(0, Math.round(rgb.b * (1 - factor / 200))),
    };
    const darkHex = `#${dark.r.toString(16).padStart(2, '0')}${dark.g.toString(16).padStart(2, '0')}${dark.b.toString(16).padStart(2, '0')}`;
    const darkRatio = contrastRatio(darkHex, background);
    if (darkRatio >= targetRatio) {
      const diff = Math.abs(darkRatio - targetRatio);
      if (diff < bestDiff) { bestDiff = diff; best = darkHex; }
    }

    // Try lighter
    const light = {
      r: Math.min(255, Math.round(rgb.r + (255 - rgb.r) * (factor / 200))),
      g: Math.min(255, Math.round(rgb.g + (255 - rgb.g) * (factor / 200))),
      b: Math.min(255, Math.round(rgb.b + (255 - rgb.b) * (factor / 200))),
    };
    const lightHex = `#${light.r.toString(16).padStart(2, '0')}${light.g.toString(16).padStart(2, '0')}${light.b.toString(16).padStart(2, '0')}`;
    const lightRatio = contrastRatio(lightHex, background);
    if (lightRatio >= targetRatio) {
      const diff = Math.abs(lightRatio - targetRatio);
      if (diff < bestDiff) { bestDiff = diff; best = lightHex; }
    }
  }

  return best;
}

/** Generate a contrast matrix for all color pairs */
export function contrastMatrix(colors: { name: string; hex: string }[]): {
  color1: string;
  color2: string;
  hex1: string;
  hex2: string;
  result: ContrastResult;
}[] {
  const pairs: ReturnType<typeof contrastMatrix> = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      pairs.push({
        color1: colors[i].name,
        color2: colors[j].name,
        hex1: colors[i].hex,
        hex2: colors[j].hex,
        result: analyzeContrast(colors[i].hex, colors[j].hex),
      });
    }
  }
  return pairs;
}
