import { describe, it, expect } from 'vitest';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '@/features/tools/typescale/engine';
import { mirrorTypographyFromTypescale } from '../brandStore';

const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
const next: Typescale = {
  schemaVersion: 1,
  fonts: {
    heading: { family: 'Playfair Display', source: 'google', weights: [400, 700], italic: false, fallback: 'serif' },
    body:    { family: 'Inter',             source: 'google', weights: [400, 500, 700], italic: false, fallback: 'system-ui, sans-serif' },
  },
  surfaces: {
    web:          { key: 'web',          ...DEFAULT_SURFACES.web,          steps, semantic: defaultSemanticMap('web', steps) },
    ui:           { key: 'ui',           ...DEFAULT_SURFACES.ui,           steps, semantic: defaultSemanticMap('ui', steps) },
    presentation: { key: 'presentation', ...DEFAULT_SURFACES.presentation, steps, semantic: defaultSemanticMap('presentation', steps) },
    social:       { key: 'social',       ...DEFAULT_SURFACES.social,       steps, semantic: defaultSemanticMap('social', steps) },
  },
  activeSurface: 'web',
  updatedAt: '2026-04-23T00:00:00.000Z',
};

describe('mirrorTypographyFromTypescale', () => {
  it('writes heading family to typography.primary.family', () => {
    const out = mirrorTypographyFromTypescale(undefined, next);
    expect(out.primary.family).toBe('Playfair Display');
    expect(out.secondary?.family).toBe('Inter');
  });
  it('populates the flat scale (h1, body) as px strings', () => {
    const out = mirrorTypographyFromTypescale(undefined, next);
    expect(out.scale?.body).toMatch(/^[0-9.]+px$/);
    expect(out.scale?.h1).toMatch(/^[0-9.]+px$/);
  });
  it('fallbacks are split into an array', () => {
    const out = mirrorTypographyFromTypescale(undefined, next);
    expect(Array.isArray(out.secondary?.fallbacks)).toBe(true);
    expect(out.secondary?.fallbacks).toEqual(['system-ui', 'sans-serif']);
  });
  it('preserves existing accent when no mono font is provided', () => {
    const existing = {
      primary: { family: 'Old', weights: [400], fallbacks: ['x'] },
      accent: { family: 'KeepMe', weights: [400], fallbacks: ['mono'] },
    };
    const out = mirrorTypographyFromTypescale(existing as any, next);
    expect(out.accent?.family).toBe('KeepMe');
  });
});
