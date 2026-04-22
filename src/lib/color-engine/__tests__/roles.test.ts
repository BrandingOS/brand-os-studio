import { describe, it, expect } from 'vitest';
import { generateShades } from '../generateShades';
import {
  suggestNeutralScale,
  generateSemanticTokens,
  pickOnColor,
} from '../roles';
import { suggestSemanticSeed } from '../semantic';
import type { RolePaletteMap } from '../types';
import { wcagContrast, apcaContrast } from '../contrast';

function buildRoles(primaryHex: string): RolePaletteMap {
  return {
    primary: generateShades(primaryHex),
    secondary: null,
    tertiary: null,
    neutral: suggestNeutralScale(primaryHex),
    success: generateShades(suggestSemanticSeed(primaryHex, 'success')),
    warning: generateShades(suggestSemanticSeed(primaryHex, 'warning')),
    error: generateShades(suggestSemanticSeed(primaryHex, 'error')),
    info: generateShades(suggestSemanticSeed(primaryHex, 'info')),
  };
}

describe('roles', () => {
  describe('suggestNeutralScale', () => {
    it('produces a near-gray ramp tinted by the primary hue', () => {
      const scale = suggestNeutralScale('#0ea5e9');
      // Chroma should be low at every stop.
      for (const value of Object.values(scale.shades)) {
        expect(value.oklch.c).toBeLessThan(0.04);
      }
    });
  });

  describe('pickOnColor', () => {
    it('prefers light text on a mid-saturated primary', () => {
      const scale = generateShades('#0ea5e9');
      const onColor = pickOnColor(scale);
      // 600 of sky is dark enough that near-white wins.
      expect(onColor).toBe(scale.shades[50].hex);
    });

    it('prefers dark text when the role 600 is bright (locked yellow)', () => {
      // Lock the seed to the 600 stop so 600 stays a bright yellow —
      // this is the designer flow when "my brand yellow is the 600".
      const scale = generateShades('#facc15', { lockedShade: 600 });
      const onColor = pickOnColor(scale);
      expect(onColor).toBe(scale.shades[950].hex);
    });
  });

  describe('generateSemanticTokens', () => {
    it('produces a full light-theme token set', () => {
      const roles = buildRoles('#0ea5e9');
      const tokens = generateSemanticTokens(roles, 'light');
      expect(tokens.canvas).toMatch(/^#[0-9a-f]{6}$/);
      expect(tokens.surface).toBe('#ffffff');
      expect(tokens.textPrimary).toMatch(/^#[0-9a-f]{6}$/);
      expect(tokens.chart1).toBe(roles.primary.shades[500].hex);
    });

    it('produces a dark-theme token set with dark canvas', () => {
      const roles = buildRoles('#0ea5e9');
      const tokens = generateSemanticTokens(roles, 'dark');
      expect(tokens.canvas).toMatch(/^#[0-9a-f]{6}$/);
      const canvasRatio = wcagContrast(tokens.textPrimary, tokens.canvas);
      expect(canvasRatio).toBeGreaterThan(4.5);
    });

    it('text on surface passes AA body in light mode', () => {
      const roles = buildRoles('#0ea5e9');
      const tokens = generateSemanticTokens(roles, 'light');
      expect(wcagContrast(tokens.textPrimary, tokens.surface)).toBeGreaterThan(4.5);
    });

    it('button primary pair has strong APCA', () => {
      const roles = buildRoles('#0ea5e9');
      const tokens = generateSemanticTokens(roles, 'light');
      const lc = Math.abs(apcaContrast(tokens.buttonPrimaryFg, tokens.buttonPrimaryBg));
      expect(lc).toBeGreaterThan(45);
    });

    it('returns 6 chart colors', () => {
      const roles = buildRoles('#0ea5e9');
      const tokens = generateSemanticTokens(roles, 'light');
      const charts = [tokens.chart1, tokens.chart2, tokens.chart3, tokens.chart4, tokens.chart5, tokens.chart6];
      expect(new Set(charts).size).toBeGreaterThan(4);
    });
  });
});
