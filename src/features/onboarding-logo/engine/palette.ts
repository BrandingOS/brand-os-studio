/**
 * Palette construction and refinement.
 *
 * A palette here is five ROLES, not five colours: primary, secondary, accent,
 * and a light ground and dark ink tinted by the primary so pages look on-brand
 * without being pure grey (the same idea `brandPalette.suggestNeutrals` uses).
 * Every adjustment keeps the roles' jobs intact — the primary always reads on
 * the light ground, the ink always reads on both.
 */
import { hexToHsl, hexToRgb, hslToHex } from '@/shared/color/colorEngine';
import { contrastRatio } from '@/shared/brand/logoOnBackground';
import type { HueFamily, Palette } from '../model/types';

export interface Tone {
  /** Absolute hue; when absent, relative to the primary by `dh`. */
  h?: number;
  dh?: number;
  s: number;
  l: number;
}

export interface PaletteSpec {
  /** Candidate primary hues, best first. */
  hues: number[];
  sat: [number, number];
  light: [number, number];
  secondary: Tone;
  accent: Tone;
  /**
   * Which role a hue the OWNER brought (a coloured logo, a loved family) takes.
   * A near-black primary keeps its job and the owner's hue becomes the accent.
   */
  anchorRole: 'primary' | 'accent';
}

export const HUE_CENTERS: Record<Exclude<HueFamily, 'neutral'>, number> = {
  red: 356,
  orange: 24,
  yellow: 46,
  green: 135,
  teal: 178,
  blue: 214,
  purple: 268,
  pink: 330,
};

const norm = (h: number) => ((Math.round(h) % 360) + 360) % 360;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The family a colour belongs to. Low saturation is `neutral` whatever its hue. */
export function familyOf(hex: string): HueFamily {
  const { h, s, l } = hexToHsl(hex);
  if (s < 14 || l < 8 || l > 95) return 'neutral';
  return familyOfHue(h);
}

export function familyOfHue(h: number): Exclude<HueFamily, 'neutral'> {
  const hue = norm(h);
  if (hue >= 345 || hue < 12) return 'red';
  if (hue < 38) return 'orange';
  if (hue < 65) return 'yellow';
  if (hue < 160) return 'green';
  if (hue < 195) return 'teal';
  if (hue < 250) return 'blue';
  if (hue < 300) return 'purple';
  return 'pink';
}

function toneHex(primaryHue: number, t: Tone): string {
  const h = t.h !== undefined ? t.h : primaryHue + (t.dh ?? 0);
  return hslToHex(norm(h), clamp(t.s, 0, 100), clamp(t.l, 0, 100));
}

/** Darkens until `fg` reaches `min` contrast on `bg`. */
export function ensureContrast(fg: string, bg: string, min: number): string {
  const { h, s } = hexToHsl(fg);
  let { l } = hexToHsl(fg);
  let out = fg;
  for (let i = 0; i < 40 && contrastRatio(out, bg) < min; i++) {
    l = Math.max(0, l - 2);
    out = hslToHex(h, s, l);
  }
  return out;
}

/** The light ground and dark ink, tinted by the primary's hue. */
export function groundsFor(primary: string): Pick<Palette, 'light' | 'dark'> {
  const { h, s } = hexToHsl(primary);
  const tint = s < 12 ? 6 : 22;
  return {
    light: hslToHex(h, tint, 96),
    dark: hslToHex(h, Math.min(28, tint + 6), 11),
  };
}

/** The roles, made safe: primary readable on the ground (3:1, large-type floor). */
export function finishPalette(p: Omit<Palette, 'light' | 'dark'>): Palette {
  const grounds = groundsFor(p.primary);
  return {
    primary: ensureContrast(p.primary, grounds.light, 3),
    secondary: p.secondary,
    accent: p.accent,
    ...grounds,
  };
}

/** Picks a hue the owner has not ruled out, starting from `preferred`. */
export function allowedHue(preferred: number, avoid: HueFamily[]): number {
  const banned = new Set(avoid.filter((f) => f !== 'neutral'));
  if (!banned.size) return norm(preferred);
  for (let step = 0; step <= 12; step++) {
    for (const dir of [1, -1]) {
      const h = norm(preferred + dir * step * 30);
      if (!banned.has(familyOfHue(h))) return h;
    }
  }
  return norm(preferred);
}

export interface PaletteInputs {
  /** A hue the owner brought: a coloured logo, or the first loved family. */
  anchorHue?: number | null;
  avoid: HueFamily[];
  /** 0–1, picks within the spec's ranges deterministically. */
  seed: number;
  /** Which candidate hue to start from (variation index). */
  variant: number;
}

export function buildPalette(spec: PaletteSpec, input: PaletteInputs): Palette {
  const { seed, variant } = input;
  const sat = spec.sat[0] + (spec.sat[1] - spec.sat[0]) * seed;
  const light = spec.light[0] + (spec.light[1] - spec.light[0]) * (1 - seed);
  let primaryHue = spec.hues[variant % spec.hues.length];
  let accentOverride: string | undefined;

  if (input.anchorHue !== null && input.anchorHue !== undefined && variant === 0) {
    if (spec.anchorRole === 'primary') {
      primaryHue = input.anchorHue;
    } else {
      accentOverride = hslToHex(norm(input.anchorHue), 72, 52);
    }
  }
  primaryHue = allowedHue(primaryHue, input.avoid);

  const primary = hslToHex(primaryHue, sat, light);
  const secondaryHex = toneHex(primaryHue, spec.secondary);
  const accentHex = accentOverride ?? toneHex(primaryHue, spec.accent);
  return finishPalette({
    primary,
    secondary: avoidFamily(secondaryHex, input.avoid),
    accent: avoidFamily(accentHex, input.avoid),
  });
}

/** Moves a supporting colour out of a ruled-out family, keeping its s/l. */
function avoidFamily(hex: string, avoid: HueFamily[]): string {
  const fam = familyOf(hex);
  if (fam === 'neutral' || !avoid.includes(fam)) return hex;
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(allowedHue(h, avoid), s, l);
}

/* ── Refinement ────────────────────────────────────────────────────── */

export type PaletteNudge = 'warmer' | 'cooler' | 'brighter' | 'calmer' | 'deeper' | 'lighter';

export const NUDGES: Array<{ id: PaletteNudge; label: string }> = [
  { id: 'warmer', label: 'Warmer' },
  { id: 'cooler', label: 'Cooler' },
  { id: 'brighter', label: 'Brighter' },
  { id: 'calmer', label: 'Calmer' },
  { id: 'deeper', label: 'Deeper' },
  { id: 'lighter', label: 'Lighter' },
];

function shiftToward(h: number, target: number, by: number): number {
  const diff = ((target - h + 540) % 360) - 180;
  if (Math.abs(diff) <= by) return norm(target);
  return norm(h + Math.sign(diff) * by);
}

function nudgeOne(hex: string, nudge: PaletteNudge): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 10 && (nudge === 'warmer' || nudge === 'cooler' || nudge === 'brighter')) {
    // A near-neutral has no hue to move; give it a whisper of one.
    const target = nudge === 'cooler' ? 220 : 30;
    return hslToHex(target, s + 4, l);
  }
  switch (nudge) {
    case 'warmer':
      return hslToHex(shiftToward(h, 30, 10), s, l);
    case 'cooler':
      return hslToHex(shiftToward(h, 220, 10), s, l);
    case 'brighter':
      return hslToHex(h, clamp(s + 10, 0, 100), clamp(l + 2, 0, 92));
    case 'calmer':
      return hslToHex(h, clamp(s - 12, 0, 100), l);
    case 'deeper':
      return hslToHex(h, s, clamp(l - 7, 4, 100));
    case 'lighter':
      return hslToHex(h, s, clamp(l + 7, 0, 90));
  }
}

export function nudgePalette(p: Palette, nudge: PaletteNudge): Palette {
  return finishPalette({
    primary: nudgeOne(p.primary, nudge),
    secondary: nudgeOne(p.secondary, nudge),
    accent: nudgeOne(p.accent, nudge),
  });
}

/** Swaps two roles. Lets the owner promote the accent without retyping hex. */
export function swapRoles(p: Palette, a: 'primary' | 'secondary' | 'accent', b: 'primary' | 'secondary' | 'accent'): Palette {
  const next = { primary: p.primary, secondary: p.secondary, accent: p.accent };
  [next[a], next[b]] = [next[b], next[a]];
  return finishPalette(next);
}

/* ── Display values ────────────────────────────────────────────────── */

export function rgbString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

/**
 * A naive device CMYK. Labelled "approx." wherever it is shown: a real print
 * conversion needs the printer's profile, and pretending otherwise is how a
 * brand's red comes back brown.
 */
export function cmykString(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1) return '0, 0, 0, 100';
  const c = (1 - rr - k) / (1 - k);
  const m = (1 - gg - k) / (1 - k);
  const y = (1 - bb - k) / (1 - k);
  return [c, m, y, k].map((v) => Math.round(v * 100)).join(', ');
}

export const ROLE_LABEL: Record<keyof Palette, string> = {
  primary: 'Primary',
  secondary: 'Secondary',
  accent: 'Accent',
  light: 'Light ground',
  dark: 'Ink',
};

export const ROLE_USAGE: Record<keyof Palette, string> = {
  primary: 'The brand’s signature. Headlines, key surfaces, the logo’s colour.',
  secondary: 'Supports the primary. Secondary surfaces, illustrations, charts.',
  accent: 'Used sparingly — calls to action, highlights, one moment per layout.',
  light: 'The page. Most layouts are mostly this.',
  dark: 'Body text and the logo on light grounds.',
};

/** Rough share of a layout each role should occupy. */
export const ROLE_RATIO: Record<keyof Palette, number> = {
  light: 45,
  primary: 25,
  dark: 15,
  secondary: 10,
  accent: 5,
};
