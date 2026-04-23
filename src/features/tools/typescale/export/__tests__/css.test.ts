import { describe, it, expect } from 'vitest';
import { serializeCss } from '../css';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

function makeTypescale(): Typescale {
  const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
  return {
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
}

describe('serializeCss', () => {
  it('declares :root scope', () => {
    expect(serializeCss(makeTypescale())).toMatch(/:root\s*{/);
  });
  it('emits font family custom properties', () => {
    const out = serializeCss(makeTypescale());
    expect(out).toContain('--font-heading:');
    expect(out).toContain('--font-body:');
  });
  it('emits per-surface semantic size properties (web-h1)', () => {
    expect(serializeCss(makeTypescale())).toMatch(/--text-web-h1:\s*[0-9.]+px/);
  });
});
