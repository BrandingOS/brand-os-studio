import { describe, it, expect } from 'vitest';
import { serializeW3c } from '../w3c';
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

describe('serializeW3c', () => {
  it('each leaf declares $type: "typography"', () => {
    const parsed = JSON.parse(serializeW3c(t));
    const h1 = parsed.typescale.web.h1;
    expect(h1.$type).toBe('typography');
    expect(h1.$value.fontFamily).toBeTruthy();
  });
});
