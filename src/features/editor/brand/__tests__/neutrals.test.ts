// Unit tests for the neutrals normalization function.
//
// Acceptance: for any input length 1..N, output is exactly 6 entries
// forming a monotonic luminance ramp.

import { describe, expect, it } from 'vitest';
import { normalizeNeutrals } from '../neutrals';
import { hexToHsl } from '@/shared/color/colorEngine';

const isMonotonicLuminance = (hexes: string[]): boolean => {
  const ls = hexes.map((h) => hexToHsl(h).l);
  for (let i = 1; i < ls.length; i++) {
    if (ls[i] > ls[i - 1]) return false; // must be non-increasing
  }
  return true;
};

describe('normalizeNeutrals', () => {
  it('throws on empty input', () => {
    expect(() => normalizeNeutrals([])).toThrow();
  });

  it('1 entry → 6 copies (degenerate but defined)', () => {
    const out = normalizeNeutrals(['#888888']);
    expect(out).toHaveLength(6);
    expect(out.every((h) => h === '#888888')).toBe(true);
  });

  it('2 entries → interpolates a 6-stop ramp between them', () => {
    const out = normalizeNeutrals(['#ffffff', '#000000']);
    expect(out).toHaveLength(6);
    expect(isMonotonicLuminance(out)).toBe(true);
    // Endpoints should be (close to) the inputs' L values.
    const ls = out.map((h) => hexToHsl(h).l);
    expect(ls[0]).toBeGreaterThan(95);
    expect(ls[5]).toBeLessThan(5);
  });

  it('3 entries → uses all three as stops, output is monotonic', () => {
    const out = normalizeNeutrals(['#ffffff', '#888888', '#000000']);
    expect(out).toHaveLength(6);
    expect(isMonotonicLuminance(out)).toBe(true);
  });

  it.each([4, 5])('intermediate length %i → 6 monotonic entries', (n) => {
    // Build n entries spanning 95 → 5 luminance.
    const source = Array.from({ length: n }, (_, i) => {
      const l = Math.round(95 - (90 * i) / (n - 1));
      return `#${[l, l, l].map((v) => Math.round(v * 2.55).toString(16).padStart(2, '0')).join('')}`;
    });
    const out = normalizeNeutrals(source);
    expect(out).toHaveLength(6);
    expect(isMonotonicLuminance(out)).toBe(true);
  });

  it('exactly 6 entries → returned (sorted by luminance)', () => {
    const sorted = ['#fafafa', '#dddddd', '#aaaaaa', '#777777', '#444444', '#111111'];
    const out = normalizeNeutrals(sorted);
    expect(out).toEqual(sorted);
    expect(isMonotonicLuminance(out)).toBe(true);
  });

  it('6 entries in reverse order → output is sorted lightest→darkest', () => {
    const reversed = ['#111111', '#444444', '#777777', '#aaaaaa', '#dddddd', '#fafafa'];
    const out = normalizeNeutrals(reversed);
    expect(out[0]).toBe('#fafafa');
    expect(out[5]).toBe('#111111');
    expect(isMonotonicLuminance(out)).toBe(true);
  });

  it('7+ entries → even-spacing downsample to 6', () => {
    const source = [
      '#fafafa', '#e8e8e8', '#cccccc', '#aaaaaa',
      '#888888', '#555555', '#333333', '#111111',
    ];
    const out = normalizeNeutrals(source);
    expect(out).toHaveLength(6);
    expect(isMonotonicLuminance(out)).toBe(true);
  });

  it('12 entries → exactly 6 entries on a monotonic ramp', () => {
    const source = Array.from({ length: 12 }, (_, i) => {
      const l = Math.round(95 - (90 * i) / 11);
      return `#${[l, l, l]
        .map((v) => Math.round(v * 2.55).toString(16).padStart(2, '0'))
        .join('')}`;
    });
    const out = normalizeNeutrals(source);
    expect(out).toHaveLength(6);
    expect(isMonotonicLuminance(out)).toBe(true);
  });

  it('arbitrary-order 4-source produces a smooth ramp (no duplicate ends)', () => {
    // Phase 3 review's specific concern: padding-by-repeat would have
    // produced [light, mid1, mid2, dark, dark, dark]. HSL interpolation
    // must distribute the 6 stops across the source range.
    const source = ['#dddddd', '#888888', '#444444', '#111111'];
    const out = normalizeNeutrals(source);
    const ls = out.map((h) => hexToHsl(h).l);
    // No three consecutive identical L values (the failure mode of pad-repeat).
    for (let i = 0; i < ls.length - 2; i++) {
      const allSame = ls[i] === ls[i + 1] && ls[i + 1] === ls[i + 2];
      expect(allSame, `consecutive identical L at index ${i}: ${ls.join(',')}`).toBe(false);
    }
  });

  it('produces stable output for the same input', () => {
    const source = ['#ffffff', '#888888', '#000000'];
    const a = normalizeNeutrals(source);
    const b = normalizeNeutrals(source);
    expect(a).toEqual(b);
  });
});
