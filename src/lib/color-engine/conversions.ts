/**
 * Color conversions built on top of culori.
 *
 * Rule: engine code never hand-rolls OKLCH or gamma math. Every transform
 * that isn't HSL/RGB/HEX math goes through culori so we inherit its
 * well-tested gamut clipping, Bradford adaptation, and sRGB encoding.
 */
import {
  converter,
  formatHex,
  parse,
  type Oklch,
  type Rgb,
  type Hsl,
} from 'culori';

import type { HslTuple, OklchTuple, RgbTuple } from './types';

const toOklch = converter('oklch');
const toRgb = converter('rgb');
const toHsl = converter('hsl');

function parseOrThrow(input: string) {
  const parsed = parse(input);
  if (!parsed) throw new Error(`Invalid color: ${input}`);
  return parsed;
}

export function isValidHex(value: string): boolean {
  if (typeof value !== 'string') return false;
  return /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value.trim());
}

export function normalizeHex(value: string): string {
  const parsed = parseOrThrow(value);
  const hex = formatHex(parsed);
  if (!hex) throw new Error(`Could not normalize hex: ${value}`);
  return hex.toLowerCase();
}

export function hexToRgb(hex: string): RgbTuple {
  const parsed = parseOrThrow(hex);
  const rgb = toRgb(parsed) as Rgb;
  return {
    r: Math.round(clamp01(rgb.r) * 255),
    g: Math.round(clamp01(rgb.g) * 255),
    b: Math.round(clamp01(rgb.b) * 255),
  };
}

export function rgbToHex({ r, g, b }: RgbTuple): string {
  const hex = formatHex({
    mode: 'rgb',
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255),
  });
  if (!hex) throw new Error('rgbToHex: invalid RGB');
  return hex.toLowerCase();
}

export function hexToHsl(hex: string): HslTuple {
  const parsed = parseOrThrow(hex);
  const hsl = toHsl(parsed) as Hsl;
  return {
    h: isFiniteNumber(hsl.h) ? hsl.h : 0,
    s: clamp01(hsl.s ?? 0),
    l: clamp01(hsl.l ?? 0),
  };
}

export function hslToHex({ h, s, l }: HslTuple): string {
  const hex = formatHex({
    mode: 'hsl',
    h: wrapHue(h),
    s: clamp01(s),
    l: clamp01(l),
  });
  if (!hex) throw new Error('hslToHex: invalid HSL');
  return hex.toLowerCase();
}

export function hexToOklch(hex: string): OklchTuple {
  const parsed = parseOrThrow(hex);
  const oklch = toOklch(parsed) as Oklch;
  return {
    l: clamp01(oklch.l ?? 0),
    c: Math.max(0, oklch.c ?? 0),
    h: isFiniteNumber(oklch.h) ? wrapHue(oklch.h) : 0,
  };
}

export function oklchToHex({ l, c, h }: OklchTuple): string {
  const hex = formatHex({
    mode: 'oklch',
    l: clamp01(l),
    c: Math.max(0, c),
    h: wrapHue(h),
  });
  if (!hex) throw new Error('oklchToHex: invalid OKLCH');
  return hex.toLowerCase();
}

export function rgbToHsl(rgb: RgbTuple): HslTuple {
  return hexToHsl(rgbToHex(rgb));
}

export function hslToRgb(hsl: HslTuple): RgbTuple {
  return hexToRgb(hslToHex(hsl));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function wrapHue(hue: number): number {
  if (!Number.isFinite(hue)) return 0;
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
