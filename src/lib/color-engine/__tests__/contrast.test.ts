import { describe, it, expect } from 'vitest';
import {
  wcagContrast,
  wcagLevel,
  apcaContrast,
  apcaLevel,
  evaluatePair,
} from '../contrast';

describe('contrast', () => {
  describe('wcagContrast', () => {
    it('black on white is 21:1', () => {
      expect(wcagContrast('#000000', '#ffffff')).toBeCloseTo(21, 1);
    });

    it('white on white is 1:1', () => {
      expect(wcagContrast('#ffffff', '#ffffff')).toBeCloseTo(1, 2);
    });

    it('is symmetric', () => {
      const a = wcagContrast('#0ea5e9', '#ffffff');
      const b = wcagContrast('#ffffff', '#0ea5e9');
      expect(a).toBeCloseTo(b, 3);
    });
  });

  describe('wcagLevel', () => {
    it('classifies thresholds', () => {
      expect(wcagLevel(7)).toBe('AAA');
      expect(wcagLevel(4.5)).toBe('AA');
      expect(wcagLevel(3)).toBe('AA-large');
      expect(wcagLevel(2)).toBe('fail');
    });
  });

  describe('apcaContrast', () => {
    it('gives negative Lc for light text on dark background', () => {
      const lc = apcaContrast('#ffffff', '#000000');
      expect(lc).toBeLessThan(0);
      expect(Math.abs(lc)).toBeGreaterThan(90);
    });

    it('gives positive Lc for dark text on light background', () => {
      const lc = apcaContrast('#000000', '#ffffff');
      expect(lc).toBeGreaterThan(0);
      expect(Math.abs(lc)).toBeGreaterThan(90);
    });

    it('is near-zero for same color', () => {
      const lc = apcaContrast('#0ea5e9', '#0ea5e9');
      expect(Math.abs(lc)).toBeLessThan(5);
    });
  });

  describe('apcaLevel', () => {
    it('classifies Lc magnitudes', () => {
      expect(apcaLevel(90)).toBe('fluent');
      expect(apcaLevel(-90)).toBe('fluent');
      expect(apcaLevel(75)).toBe('body');
      expect(apcaLevel(60)).toBe('large');
      expect(apcaLevel(45)).toBe('non-text');
      expect(apcaLevel(20)).toBe('fail');
    });
  });

  describe('evaluatePair', () => {
    it('returns both wcag and apca results with pass flags', () => {
      const result = evaluatePair('#000000', '#ffffff');
      expect(result.wcag.ratio).toBeCloseTo(21, 1);
      expect(result.wcag.passBody).toBe(true);
      expect(result.apca.passBody).toBe(true);
    });

    it('marks borderline combinations', () => {
      const result = evaluatePair('#999999', '#ffffff');
      expect(result.wcag.passBody).toBe(false);
    });
  });
});
