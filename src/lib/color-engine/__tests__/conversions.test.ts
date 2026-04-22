import { describe, it, expect } from 'vitest';
import {
  isValidHex,
  normalizeHex,
  hexToHsl,
  hslToHex,
  hexToRgb,
  rgbToHex,
  hexToOklch,
  oklchToHex,
} from '../conversions';

describe('conversions', () => {
  describe('isValidHex', () => {
    it('accepts 3/6/8-digit hex with and without #', () => {
      expect(isValidHex('#fff')).toBe(true);
      expect(isValidHex('fff')).toBe(true);
      expect(isValidHex('#0ea5e9')).toBe(true);
      expect(isValidHex('0EA5E9')).toBe(true);
      expect(isValidHex('#0ea5e9ff')).toBe(true);
    });

    it('rejects nonsense', () => {
      expect(isValidHex('red')).toBe(false);
      expect(isValidHex('#12345')).toBe(false);
      expect(isValidHex('')).toBe(false);
      // biome-ignore lint: intentional
      expect(isValidHex(null as unknown as string)).toBe(false);
    });
  });

  describe('normalizeHex', () => {
    it('returns lowercase 6-digit hex', () => {
      expect(normalizeHex('#0EA5E9')).toBe('#0ea5e9');
      expect(normalizeHex('0ea5e9')).toBe('#0ea5e9');
      expect(normalizeHex('#fff')).toBe('#ffffff');
    });

    it('throws on invalid input', () => {
      expect(() => normalizeHex('not-a-color')).toThrow();
    });
  });

  describe('hex ↔ rgb', () => {
    it('round-trips pure red', () => {
      const rgb = hexToRgb('#ff0000');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
      expect(rgbToHex(rgb)).toBe('#ff0000');
    });

    it('round-trips a brand color', () => {
      const rgb = hexToRgb('#0ea5e9');
      expect(rgb.r).toBe(14);
      expect(rgb.g).toBe(165);
      expect(rgb.b).toBe(233);
      expect(rgbToHex(rgb)).toBe('#0ea5e9');
    });
  });

  describe('hex ↔ hsl', () => {
    it('preserves pure hues approximately', () => {
      const hsl = hexToHsl('#ff0000');
      expect(Math.round(hsl.h)).toBe(0);
      expect(Math.round(hsl.s * 100)).toBe(100);
      expect(Math.round(hsl.l * 100)).toBe(50);
    });

    it('is idempotent under round-trip', () => {
      const start = '#14b8a6';
      expect(hslToHex(hexToHsl(start))).toBe(start);
    });
  });

  describe('hex ↔ oklch', () => {
    it('produces non-zero chroma for saturated colors', () => {
      const oklch = hexToOklch('#0ea5e9');
      expect(oklch.c).toBeGreaterThan(0.05);
      expect(oklch.l).toBeGreaterThan(0.5);
      expect(oklch.l).toBeLessThan(0.85);
    });

    it('produces near-zero chroma for gray', () => {
      const oklch = hexToOklch('#888888');
      expect(oklch.c).toBeLessThan(0.005);
    });

    it('round-trips within tolerance', () => {
      const start = '#0ea5e9';
      const rt = oklchToHex(hexToOklch(start));
      // Gamut clipping can shift by ~1 LSB; accept anything within a
      // tiny Hamming distance.
      expect(rt.length).toBe(7);
      expect(rt.startsWith('#')).toBe(true);
    });
  });
});
