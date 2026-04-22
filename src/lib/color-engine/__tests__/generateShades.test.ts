import { describe, it, expect } from 'vitest';
import { generateShades } from '../generateShades';
import { SHADE_STOPS } from '../types';
import { wcagContrast } from '../contrast';

describe('generateShades', () => {
  it('returns all 11 stops for every seed', () => {
    const seeds = ['#0ea5e9', '#f97316', '#14b8a6', '#7c3aed', '#dc2626'];
    for (const seed of seeds) {
      const scale = generateShades(seed);
      for (const stop of SHADE_STOPS) {
        expect(scale.shades[stop]).toBeDefined();
        expect(scale.shades[stop].hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('preserves inputHex (normalized)', () => {
    const scale = generateShades('#0EA5E9');
    expect(scale.inputHex).toBe('#0ea5e9');
  });

  it('produces a monotonically lighter-to-darker ramp', () => {
    const scale = generateShades('#0ea5e9');
    const lightnesses = SHADE_STOPS.map((s) => scale.shades[s].oklch.l);
    for (let i = 0; i < lightnesses.length - 1; i++) {
      expect(lightnesses[i]).toBeGreaterThan(lightnesses[i + 1]);
    }
  });

  it('produces readable contrast at the extremes', () => {
    const scale = generateShades('#0ea5e9');
    // 50 vs 900 should be well beyond AA body (4.5:1).
    const ratio = wcagContrast(scale.shades[50].hex, scale.shades[900].hex);
    expect(ratio).toBeGreaterThan(7);
  });

  it('locks the seed to the specified stop', () => {
    const scale = generateShades('#0ea5e9', { lockedShade: 500 });
    expect(scale.shades[500].hex).toBe('#0ea5e9');
    expect(scale.shades[500].locked).toBe(true);
  });

  it('applies per-stop overrides and marks them edited', () => {
    const scale = generateShades('#0ea5e9', {
      overrides: { 500: { hex: '#123456', locked: true } },
    });
    expect(scale.shades[500].hex).toBe('#123456');
    expect(scale.shades[500].edited).toBe(true);
    expect(scale.shades[500].locked).toBe(true);
  });

  it('snapshot: canonical sky palette', () => {
    const scale = generateShades('#0ea5e9');
    const hexes = SHADE_STOPS.map((s) => scale.shades[s].hex);
    expect(hexes).toMatchSnapshot();
  });

  it('snapshot: canonical orange palette', () => {
    const scale = generateShades('#f97316');
    const hexes = SHADE_STOPS.map((s) => scale.shades[s].hex);
    expect(hexes).toMatchSnapshot();
  });

  it('snapshot: canonical teal palette', () => {
    const scale = generateShades('#14b8a6');
    const hexes = SHADE_STOPS.map((s) => scale.shades[s].hex);
    expect(hexes).toMatchSnapshot();
  });
});
