/**
 * Brand Color Engine
 * Professional color system for brand identity management.
 * Inspired by Coolors but built for branding context.
 */

// ─── Types ─────────────────────────────────────────────────────

export interface BrandColor {
  hex: string;
  name: string;
  role: ColorRole;
  locked?: boolean;
}

export type ColorRole = 'primary' | 'secondary' | 'accent' | 'neutral' | 'background' | 'text';

export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
  luminance: number;
  isLight: boolean;
}

export interface ContrastResult {
  ratio: number;
  aa: boolean;       // >= 4.5:1 for normal text
  aaLarge: boolean;   // >= 3:1 for large text
  aaa: boolean;       // >= 7:1 for enhanced
  grade: 'pass' | 'warn' | 'fail';
}

export interface PaletteHarmony {
  name: string;
  colors: string[];
  description: string;
}

// ─── Conversions ───────────────────────────────────────────────

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rs = r / 255, gs = g / 255, bs = b / 255;
  const max = Math.max(rs, gs, bs), min = Math.min(rs, gs, bs);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rs) h = ((gs - bs) / d + (gs < bs ? 6 : 0)) / 6;
  else if (max === gs) h = ((bs - rs) / d + 2) / 6;
  else h = ((rs - gs) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function hslToHex(h: number, s: number, l: number): string {
  const ss = s / 100, ll = l / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = ll - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

// ─── Analysis ──────────────────────────────────────────────────

export function getColorInfo(hex: string): ColorInfo {
  const rgb = hexToRgb(hex);
  const hsl = hexToHsl(hex);
  const luminance = relativeLuminance(hex);
  return { hex, rgb, hsl, luminance, isLight: luminance > 0.179 };
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function checkContrast(fg: string, bg: string): ContrastResult {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  return {
    ratio,
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    grade: ratio >= 4.5 ? 'pass' : ratio >= 3 ? 'warn' : 'fail',
  };
}

// ─── Harmony Generation ────────────────────────────────────────

export function generateHarmonies(baseHex: string): PaletteHarmony[] {
  const { h, s, l } = hexToHsl(baseHex);

  return [
    {
      name: 'Complementary',
      colors: [baseHex, hslToHex((h + 180) % 360, s, l)],
      description: 'Opposite on the color wheel — high contrast, bold feel',
    },
    {
      name: 'Analogous',
      colors: [hslToHex((h - 30 + 360) % 360, s, l), baseHex, hslToHex((h + 30) % 360, s, l)],
      description: 'Adjacent colors — harmonious, cohesive feel',
    },
    {
      name: 'Triadic',
      colors: [baseHex, hslToHex((h + 120) % 360, s, l), hslToHex((h + 240) % 360, s, l)],
      description: 'Evenly spaced — vibrant, balanced feel',
    },
    {
      name: 'Split Complementary',
      colors: [baseHex, hslToHex((h + 150) % 360, s, l), hslToHex((h + 210) % 360, s, l)],
      description: 'Complement neighbors — nuanced contrast',
    },
    {
      name: 'Monochromatic',
      colors: [
        hslToHex(h, s, Math.max(10, l - 30)),
        hslToHex(h, s, Math.max(10, l - 15)),
        baseHex,
        hslToHex(h, s, Math.min(95, l + 15)),
        hslToHex(h, s, Math.min(95, l + 30)),
      ],
      description: 'Shades and tints — sophisticated, unified feel',
    },
  ];
}

// ─── Shade Generation ──────────────────────────────────────────

export function generateShades(hex: string, count: number = 9): string[] {
  const { h, s } = hexToHsl(hex);
  const shades: string[] = [];
  for (let i = 0; i < count; i++) {
    const l = 95 - (i * (85 / (count - 1)));
    shades.push(hslToHex(h, Math.min(100, s + (i < count / 2 ? -5 : 5)), Math.round(l)));
  }
  return shades;
}

// ─── Auto Palette from Brand Colors ────────────────────────────

export function suggestNeutrals(primaryHex: string): string[] {
  const { h } = hexToHsl(primaryHex);
  // Tinted neutrals matching the brand hue
  return [
    hslToHex(h, 5, 98),  // Near white
    hslToHex(h, 5, 94),  // Light
    hslToHex(h, 4, 82),  // Border
    hslToHex(h, 4, 55),  // Muted
    hslToHex(h, 5, 35),  // Body text
    hslToHex(h, 8, 10),  // Headline / dark
  ];
}

export function suggestAccent(primaryHex: string): string {
  const { h, s, l } = hexToHsl(primaryHex);
  // Triadic accent — 120° rotation
  return hslToHex((h + 120) % 360, Math.min(100, s + 10), Math.min(60, l + 5));
}

// ─── Palette Validation ────────────────────────────────────────

export interface PaletteIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  colors: string[];
}

export function validatePalette(colors: BrandColor[]): PaletteIssue[] {
  const issues: PaletteIssue[] = [];

  // Check for duplicate colors
  const hexSet = new Set<string>();
  for (const c of colors) {
    const normalized = c.hex.toLowerCase();
    if (hexSet.has(normalized)) {
      issues.push({ severity: 'warning', message: `Duplicate color: ${c.hex}`, colors: [c.hex] });
    }
    hexSet.add(normalized);
  }

  // Check primary against white
  const primary = colors.find(c => c.role === 'primary');
  if (primary) {
    const whiteContrast = checkContrast(primary.hex, '#FFFFFF');
    if (!whiteContrast.aaLarge) {
      issues.push({ severity: 'warning', message: `Primary color has low contrast on white (${whiteContrast.ratio.toFixed(1)}:1)`, colors: [primary.hex, '#FFFFFF'] });
    }
  }

  // Check primary vs secondary similarity
  const secondary = colors.find(c => c.role === 'secondary');
  if (primary && secondary) {
    const { h: h1 } = hexToHsl(primary.hex);
    const { h: h2 } = hexToHsl(secondary.hex);
    const hDiff = Math.abs(h1 - h2);
    if (hDiff < 15 || hDiff > 345) {
      issues.push({ severity: 'info', message: 'Primary and secondary colors are very similar in hue', colors: [primary.hex, secondary.hex] });
    }
  }

  // Check no primary
  if (!primary) {
    issues.push({ severity: 'error', message: 'No primary color defined', colors: [] });
  }

  return issues;
}

// ─── Color Name Suggestion ─────────────────────────────────────

export function suggestColorName(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 10) {
    if (l > 90) return 'White';
    if (l > 70) return 'Light Gray';
    if (l > 40) return 'Gray';
    if (l > 15) return 'Dark Gray';
    return 'Black';
  }
  const hueNames: [number, string][] = [
    [15, 'Red'], [45, 'Orange'], [65, 'Yellow'], [80, 'Lime'],
    [150, 'Green'], [180, 'Teal'], [210, 'Cyan'], [250, 'Blue'],
    [280, 'Indigo'], [320, 'Purple'], [345, 'Pink'], [360, 'Red'],
  ];
  let name = 'Color';
  for (const [maxH, n] of hueNames) {
    if (h <= maxH) { name = n; break; }
  }
  if (l > 70) return `Light ${name}`;
  if (l < 30) return `Dark ${name}`;
  return name;
}
