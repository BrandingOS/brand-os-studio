// src/shared/presentation/theme/__tests__/buildDeckTokens.test.ts
import { describe, it, expect } from 'vitest';
import { buildDeckCssVars } from '../buildDeckTokens';
import { EMPTY_THEME } from '../types';
import type { Brand } from '@/shared/types/brand';

const baseBrand: Brand = {
  id: 'b1',
  slug: 'b1',
  name: 'Test',
  primaryColor: '#001563',
  fonts: { primary: 'Inter' },
  tone: '',
  audience: '',
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('buildDeckCssVars', () => {
  it('emits font, text, color, density vars on empty theme', () => {
    const vars = buildDeckCssVars(baseBrand, EMPTY_THEME);
    expect(vars['--deck-font-heading']).toBeTypeOf('string');
    expect(vars['--deck-font-body']).toBeTypeOf('string');
    expect(vars['--deck-text-h1']).toMatch(/px$/);
    expect(vars['--deck-text-body']).toMatch(/px$/);
    expect(vars['--deck-bg-page']).toMatch(/^#/);
    expect(vars['--deck-text-heading']).toMatch(/^#/);
    expect(vars['--deck-pad-x']).toBe('56px');         // comfortable default
    expect(vars['--deck-pad-y']).toBe('40px');
  });

  it('scaleMultiplier scales every text size', () => {
    const small = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, scaleMultiplier: 1 } });
    const big   = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, scaleMultiplier: 1.2 } });
    const px = (v: string | undefined) => Number(String(v).replace('px', ''));
    expect(px(big['--deck-text-h1']))      .toBeCloseTo(px(small['--deck-text-h1'])      * 1.2, 1);
    expect(px(big['--deck-text-body']))    .toBeCloseTo(px(small['--deck-text-body'])    * 1.2, 1);
    expect(px(big['--deck-text-caption'])) .toBeCloseTo(px(small['--deck-text-caption']) * 1.2, 1);
  });

  it('leadingMultiplier scales line-heights', () => {
    const tight = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, leadingMultiplier: 1 } });
    const loose = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, typography: { ...EMPTY_THEME.typography, leadingMultiplier: 1.2 } });
    expect(Number(loose['--deck-leading-body'])).toBeCloseTo(Number(tight['--deck-leading-body']) * 1.2, 2);
  });

  it('color overrides win over brand palette', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      colors: { bg: '#ff0000', heading: '#00ff00' },
    });
    expect(vars['--deck-bg-page']).toBe('#ff0000');
    expect(vars['--deck-text-heading']).toBe('#00ff00');
  });

  it('density compact → 32/24, spacious → 88/64', () => {
    const compact = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, density: 'compact' });
    expect(compact['--deck-pad-x']).toBe('32px');
    expect(compact['--deck-pad-y']).toBe('24px');
    expect(compact['--deck-gap']).toBe('16px');

    const spacious = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, density: 'spacious' });
    expect(spacious['--deck-pad-x']).toBe('88px');
    expect(spacious['--deck-pad-y']).toBe('64px');
    expect(spacious['--deck-gap']).toBe('32px');
  });

  it('style maps borderRadius / shadow', () => {
    const sharp = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, style: { ...EMPTY_THEME.style, borderRadius: 'sharp', shadow: 'none' } });
    expect(sharp['--deck-radius']).toBe('0px');
    expect(sharp['--deck-shadow']).toBe('none');

    const pill = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, style: { ...EMPTY_THEME.style, borderRadius: 'pill', shadow: 'lifted' } });
    expect(pill['--deck-radius']).toBe('999px');
    expect(pill['--deck-shadow']).toContain('rgba');
  });

  it('typography font overrides win', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      typography: { ...EMPTY_THEME.typography, headingFont: 'Garamond, serif', bodyFont: 'Helvetica, sans-serif' },
    });
    expect(vars['--deck-font-heading']).toBe('Garamond, serif');
    expect(vars['--deck-font-body']).toBe('Helvetica, sans-serif');
  });
});
