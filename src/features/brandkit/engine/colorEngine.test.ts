import { describe, it, expect } from 'vitest';
import {
  hexToRgb, rgbToHex, hexToHsl, hslToHex,
  getColorInfo, checkContrast, generateHarmonies,
  generateShades, suggestColorName, validatePalette,
  type BrandColor,
} from './colorEngine';

describe('Color Conversions', () => {
  it('hexToRgb converts correctly', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('rgbToHex converts correctly', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
    expect(rgbToHex(0, 0, 0)).toBe('#000000');
    expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
  });

  it('hexToHsl converts correctly', () => {
    const red = hexToHsl('#ff0000');
    expect(red.h).toBe(0);
    expect(red.s).toBe(100);
    expect(red.l).toBe(50);
  });

  it('round-trips hex → hsl → hex', () => {
    const colors = ['#7231ff', '#00d4aa', '#ff5733'];
    for (const hex of colors) {
      const { h, s, l } = hexToHsl(hex);
      const result = hslToHex(h, s, l);
      // Allow small rounding differences
      const orig = hexToRgb(hex);
      const roundTrip = hexToRgb(result);
      expect(Math.abs(orig.r - roundTrip.r)).toBeLessThanOrEqual(2);
      expect(Math.abs(orig.g - roundTrip.g)).toBeLessThanOrEqual(2);
      expect(Math.abs(orig.b - roundTrip.b)).toBeLessThanOrEqual(2);
    }
  });
});

describe('Contrast Checking', () => {
  it('black on white is maximum contrast', () => {
    const result = checkContrast('#000000', '#ffffff');
    expect(result.ratio).toBeCloseTo(21, 0);
    expect(result.aa).toBe(true);
    expect(result.aaa).toBe(true);
  });

  it('white on white fails', () => {
    const result = checkContrast('#ffffff', '#ffffff');
    expect(result.ratio).toBeCloseTo(1, 0);
    expect(result.aa).toBe(false);
    expect(result.grade).toBe('fail');
  });

  it('medium contrast is classified correctly', () => {
    // #767676 on white is ~4.54:1 which passes AA
    const result = checkContrast('#767676', '#ffffff');
    expect(result.aaLarge).toBe(true);
    expect(result.aa).toBe(true);
    // A truly "warn" case: just below 4.5
    const warn = checkContrast('#888888', '#ffffff');
    expect(warn.grade).toBe('warn');
  });
});

describe('Harmony Generation', () => {
  it('generates 5 harmony types', () => {
    const harmonies = generateHarmonies('#7231ff');
    expect(harmonies).toHaveLength(5);
    expect(harmonies.map(h => h.name)).toEqual([
      'Complementary', 'Analogous', 'Triadic', 'Split Complementary', 'Monochromatic',
    ]);
  });

  it('complementary is 180° opposite', () => {
    const harmonies = generateHarmonies('#ff0000');
    const comp = harmonies.find(h => h.name === 'Complementary')!;
    expect(comp.colors).toHaveLength(2);
    const { h: compHue } = hexToHsl(comp.colors[1]);
    expect(compHue).toBe(180); // red(0) + 180 = cyan(180)
  });
});

describe('Shade Generation', () => {
  it('generates the correct number of shades', () => {
    const shades = generateShades('#7231ff', 9);
    expect(shades).toHaveLength(9);
  });

  it('shades go from light to dark', () => {
    const shades = generateShades('#7231ff', 5);
    const lightnesses = shades.map(s => hexToHsl(s).l);
    for (let i = 1; i < lightnesses.length; i++) {
      expect(lightnesses[i]).toBeLessThanOrEqual(lightnesses[i - 1]);
    }
  });
});

describe('Color Name Suggestion', () => {
  it('names basic colors', () => {
    expect(suggestColorName('#ff0000')).toBe('Red');
    expect(suggestColorName('#0000ff')).toBe('Blue');
    expect(suggestColorName('#00ff00')).toBe('Green');
  });

  it('names neutrals', () => {
    expect(suggestColorName('#ffffff')).toBe('White');
    expect(suggestColorName('#000000')).toBe('Black');
    expect(suggestColorName('#808080')).toBe('Gray');
  });
});

describe('Palette Validation', () => {
  it('reports missing primary', () => {
    const colors: BrandColor[] = [
      { hex: '#ff0000', name: 'Red', role: 'accent' },
    ];
    const result = validatePalette(colors);
    expect(result.some(i => i.severity === 'error' && i.message.includes('primary'))).toBe(true);
  });

  it('reports duplicate colors', () => {
    const colors: BrandColor[] = [
      { hex: '#ff0000', name: 'Red', role: 'primary' },
      { hex: '#ff0000', name: 'Red 2', role: 'accent' },
    ];
    const result = validatePalette(colors);
    expect(result.some(i => i.message.includes('Duplicate'))).toBe(true);
  });

  it('passes clean palette', () => {
    const colors: BrandColor[] = [
      { hex: '#7231ff', name: 'Purple', role: 'primary' },
      { hex: '#00d4aa', name: 'Green', role: 'secondary' },
    ];
    const result = validatePalette(colors);
    expect(result.filter(i => i.severity === 'error')).toHaveLength(0);
  });
});
