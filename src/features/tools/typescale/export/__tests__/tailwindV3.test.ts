import { describe, it, expect } from 'vitest';
import { serializeTailwindV3 } from '../tailwindV3';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

function ts(): Typescale {
  const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
  return {
    schemaVersion: 1,
    fonts: { heading: { family:'Inter', source:'google', weights:[400,700], italic:false, fallback:'system-ui' },
             body:    { family:'Inter', source:'google', weights:[400,700], italic:false, fallback:'system-ui' } },
    surfaces: {
      web:         { key:'web',         ...DEFAULT_SURFACES.web,         steps, semantic: defaultSemanticMap('web', steps) },
      ui:          { key:'ui',          ...DEFAULT_SURFACES.ui,          steps, semantic: defaultSemanticMap('ui', steps) },
      presentation:{ key:'presentation',...DEFAULT_SURFACES.presentation,steps, semantic: defaultSemanticMap('presentation', steps) },
      social:      { key:'social',      ...DEFAULT_SURFACES.social,      steps, semantic: defaultSemanticMap('social', steps) },
    },
    activeSurface: 'web',
    updatedAt: '2026-04-23T00:00:00.000Z',
  };
}

describe('serializeTailwindV3', () => {
  it('returns a theme.extend block', () => {
    const out = serializeTailwindV3(ts());
    expect(out).toContain('theme: {');
    expect(out).toContain('extend: {');
    expect(out).toContain('fontSize:');
    expect(out).toContain('fontFamily:');
  });
  it('includes web-h1 entry with [fontSize, { lineHeight, letterSpacing }]', () => {
    expect(serializeTailwindV3(ts())).toMatch(/'web-h1':\s*\[/);
  });
});
