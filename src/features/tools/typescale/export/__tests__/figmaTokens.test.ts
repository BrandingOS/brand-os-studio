import { describe, it, expect } from 'vitest';
import { serializeFigmaTokens } from '../figmaTokens';
import type { Typescale } from '@/shared/types/typescale';
import { DEFAULT_SURFACES, defaultSemanticMap, buildLadder } from '../../engine';

const steps = buildLadder({ basePx:16, ratio:1.25, stepsUp:4, stepsDown:2, leading:'normal', tracking:'normal' });
const t: Typescale = { schemaVersion:1,
  fonts:{ heading:{family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'},
          body:   {family:'Inter',source:'google',weights:[400],italic:false,fallback:'system-ui'} },
  surfaces:{
    web:{key:'web',...DEFAULT_SURFACES.web,steps,semantic:defaultSemanticMap('web',steps)},
    ui:{key:'ui',...DEFAULT_SURFACES.ui,steps,semantic:defaultSemanticMap('ui',steps)},
    presentation:{key:'presentation',...DEFAULT_SURFACES.presentation,steps,semantic:defaultSemanticMap('presentation',steps)},
    social:{key:'social',...DEFAULT_SURFACES.social,steps,semantic:defaultSemanticMap('social',steps)},
  },
  activeSurface:'web', updatedAt:'2026-04-23T00:00:00.000Z' };

describe('serializeFigmaTokens', () => {
  it('uses Figma Tokens Studio "typography" type', () => {
    const parsed = JSON.parse(serializeFigmaTokens(t));
    expect(parsed.global.web.h1.type).toBe('typography');
    expect(parsed.global.web.h1.value.fontFamily).toBeTruthy();
  });
});

describe('serializeFigmaTokens (hardening)', () => {
  it('emits fontSize with px unit', () => {
    const parsed = JSON.parse(serializeFigmaTokens(t));
    expect(parsed.global.web.h1.value.fontSize).toMatch(/px$/);
  });
  it('letterSpacing percent is rounded to 2 decimals', () => {
    const parsed = JSON.parse(serializeFigmaTokens(t));
    const v: string = parsed.global.web.body.value.letterSpacing;
    expect(v.endsWith('%')).toBe(true);
    // No long float tail: the digits before the % should have <= 2 decimals.
    const num = v.replace('%', '');
    const parts = num.split('.');
    if (parts.length === 2) expect(parts[1].length).toBeLessThanOrEqual(2);
  });
});
