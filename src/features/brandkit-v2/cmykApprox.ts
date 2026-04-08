/**
 * Approximate sRGB → CMYK conversion for the brand-guide PDF + color guide.
 *
 * This is a simple uncalibrated approximation — fine for previews and
 * starting points. Real print workflows should use an ICC profile (out of
 * scope here).
 */

export interface CmykColor {
  c: number; // 0-100
  m: number;
  y: number;
  k: number;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '').padStart(6, '0');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function hexToCmyk(hex: string): CmykColor {
  const { r, g, b } = hexToRgb(hex);
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const k = 1 - Math.max(r1, g1, b1);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - r1 - k) / (1 - k);
  const m = (1 - g1 - k) / (1 - k);
  const y = (1 - b1 - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

export function formatCmyk(cmyk: CmykColor): string {
  return `C${cmyk.c} M${cmyk.m} Y${cmyk.y} K${cmyk.k}`;
}

export function formatRgb(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `R${r} G${g} B${b}`;
}
