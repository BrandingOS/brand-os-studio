import { describe, it, expect } from 'vitest';
import { serializeJs } from '../js';
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

describe('serializeJs', () => {
  it('exports a const named `typescale`', () => {
    expect(serializeJs(t)).toMatch(/export const typescale\s*=/);
  });
  it('includes as const at the end for literal inference', () => {
    expect(serializeJs(t)).toMatch(/} as const;$/);
  });
});
