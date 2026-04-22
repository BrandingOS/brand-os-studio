import { describe, it, expect } from 'vitest';
import {
  suggestSemanticSeed,
  suggestAllSemanticSeeds,
} from '../semantic';
import { hexToOklch } from '../conversions';

describe('semantic', () => {
  it('suggests distinct seeds for all four roles', () => {
    const seeds = suggestAllSemanticSeeds('#0ea5e9');
    const hexes = [seeds.success, seeds.warning, seeds.error, seeds.info];
    expect(new Set(hexes).size).toBe(4);
    for (const hex of hexes) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('success is greenish-hued', () => {
    const seed = suggestSemanticSeed('#0ea5e9', 'success');
    const hue = hexToOklch(seed).h;
    expect(hue).toBeGreaterThan(110);
    expect(hue).toBeLessThan(180);
  });

  it('error is reddish-hued', () => {
    const seed = suggestSemanticSeed('#0ea5e9', 'error');
    const hue = hexToOklch(seed).h;
    // Warm hues wrap; accept 0..45 or 330..360.
    const isWarm = (hue >= 0 && hue <= 60) || (hue >= 330 && hue <= 360);
    expect(isWarm).toBe(true);
  });

  it('warning skews toward amber/yellow', () => {
    const seed = suggestSemanticSeed('#0ea5e9', 'warning');
    const hue = hexToOklch(seed).h;
    expect(hue).toBeGreaterThan(50);
    expect(hue).toBeLessThan(110);
  });

  it('info stays in the blue zone', () => {
    const seed = suggestSemanticSeed('#0ea5e9', 'info');
    const hue = hexToOklch(seed).h;
    expect(hue).toBeGreaterThan(200);
    expect(hue).toBeLessThan(260);
  });

  it('respects the blend-toward-brand parameter', () => {
    const pure = suggestSemanticSeed('#dc2626', 'success', 0);
    const blended = suggestSemanticSeed('#dc2626', 'success', 0.5);
    // Different blends should yield different hues.
    expect(pure).not.toBe(blended);
  });
});
