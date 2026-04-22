import { describe, it, expect } from 'vitest';
import { generateHarmony, ALL_HARMONIES } from '../harmony';
import { hexToOklch } from '../conversions';

describe('harmony', () => {
  it('produces a descriptor for every harmony', () => {
    for (const name of ALL_HARMONIES) {
      const result = generateHarmony('#0ea5e9', name);
      expect(result.descriptor.length).toBeGreaterThan(10);
      expect(result.seeds.length).toBeGreaterThan(0);
      for (const seed of result.seeds) {
        expect(seed).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('complementary rotates hue by ~180deg', () => {
    const result = generateHarmony('#0ea5e9', 'complementary');
    const a = hexToOklch(result.seeds[0]).h;
    const b = hexToOklch(result.seeds[1]).h;
    const delta = ((b - a + 540) % 360) - 180;
    expect(Math.abs(Math.abs(delta) - 180)).toBeLessThan(2);
  });

  it('triadic produces three evenly-spaced hues', () => {
    const result = generateHarmony('#0ea5e9', 'triadic');
    expect(result.seeds).toHaveLength(3);
    const hues = result.seeds.map((s) => hexToOklch(s).h);
    const gap1 = ((hues[1] - hues[0] + 360) % 360);
    const gap2 = ((hues[2] - hues[1] + 360) % 360);
    expect(Math.abs(gap1 - 120)).toBeLessThan(2);
    expect(Math.abs(gap2 - 120)).toBeLessThan(2);
  });

  it('analogous produces seeds close to the source hue', () => {
    const source = hexToOklch('#0ea5e9').h;
    const result = generateHarmony('#0ea5e9', 'analogous');
    for (const s of result.seeds) {
      const h = hexToOklch(s).h;
      const delta = Math.min(Math.abs(h - source), 360 - Math.abs(h - source));
      expect(delta).toBeLessThanOrEqual(35);
    }
  });

  it('monochromatic returns one seed', () => {
    const result = generateHarmony('#0ea5e9', 'monochromatic');
    expect(result.seeds).toHaveLength(1);
  });
});
