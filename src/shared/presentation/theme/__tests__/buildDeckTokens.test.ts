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
  it('emits per-role + alias vars on empty theme', () => {
    const vars = buildDeckCssVars(baseBrand, EMPTY_THEME);
    // Per-role
    expect(vars['--deck-font-h1']).toBeTypeOf('string');
    expect(vars['--deck-font-body']).toBeTypeOf('string');
    expect(vars['--deck-text-h1']).toMatch(/px$/);
    expect(vars['--deck-text-body']).toMatch(/px$/);
    expect(vars['--deck-text-caption']).toMatch(/px$/);
    expect(vars['--deck-text-h4']).toMatch(/px$/);
    expect(vars['--deck-color-h1']).toMatch(/^#/);
    expect(vars['--deck-color-body']).toMatch(/^#/);
    expect(vars['--deck-weight-h1']).toBeTypeOf('string');
    // Alias group vars (legacy consumers)
    expect(vars['--deck-font-heading']).toBeTypeOf('string');
    expect(vars['--deck-text-heading']).toMatch(/^#/); // historical: this var is COLOR
    // Surface
    expect(vars['--deck-bg-page']).toMatch(/^#/);
    // Density (default = comfortable)
    expect(vars['--deck-pad-x']).toBe('56px');
    expect(vars['--deck-pad-y']).toBe('40px');
  });

  it('per-role font override wins over brand', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      typography: {
        roles: {
          h1: { font: 'Garamond, serif' },
          body: { font: 'Helvetica, sans-serif' },
        },
      },
    });
    expect(vars['--deck-font-h1']).toBe('Garamond, serif');
    expect(vars['--deck-font-body']).toBe('Helvetica, sans-serif');
    // h2 untouched: falls back to brand heading family
    expect(vars['--deck-font-h2']).not.toBe('Garamond, serif');
  });

  it('per-role size override wins', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      typography: { roles: { body: { sizePx: 22 } } },
    });
    expect(vars['--deck-text-body']).toBe('22px');
    // caption untouched
    expect(vars['--deck-text-caption']).not.toBe('22px');
  });

  it('per-role weight + line-height + color overrides', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      typography: {
        roles: {
          h1: { weight: 800, lineHeight: 1.5, color: '#ff0000' },
        },
      },
    });
    expect(vars['--deck-weight-h1']).toBe('800');
    expect(vars['--deck-leading-h1']).toBe('1.5');
    expect(vars['--deck-color-h1']).toBe('#ff0000');
  });

  it('color overrides — page bg / cardBg / accent win over brand palette', () => {
    const vars = buildDeckCssVars(baseBrand, {
      ...EMPTY_THEME,
      colors: { bg: '#ff0000', cardBg: '#00ff00', accent: '#0000ff' },
    });
    expect(vars['--deck-bg-page']).toBe('#ff0000');
    expect(vars['--deck-bg-card']).toBe('#00ff00');
    expect(vars['--deck-accent']).toBe('#0000ff');
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

  it('density emits chrome-pad tokens for slide-canvas edges', () => {
    const compact = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, density: 'compact' });
    expect(compact['--deck-chrome-pad-x']).toBe('56px');
    expect(compact['--deck-chrome-pad-y']).toBe('36px');

    const spacious = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, density: 'spacious' });
    expect(spacious['--deck-chrome-pad-x']).toBe('144px');
    expect(spacious['--deck-chrome-pad-y']).toBe('96px');
  });

  it('style maps borderRadius / shadow', () => {
    const sharp = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, style: { ...EMPTY_THEME.style, borderRadius: 'sharp', shadow: 'none' } });
    expect(sharp['--deck-radius']).toBe('0px');
    expect(sharp['--deck-shadow']).toBe('none');

    const pill = buildDeckCssVars(baseBrand, { ...EMPTY_THEME, style: { ...EMPTY_THEME.style, borderRadius: 'pill', shadow: 'lifted' } });
    expect(pill['--deck-radius']).toBe('999px');
    expect(pill['--deck-shadow']).toContain('rgba');
  });
});
