import { describe, it, expect } from 'vitest';
import { DEFAULT_SURFACES, defaultSemanticMap } from '../surfaces';
import { buildLadder } from '../scale';

describe('DEFAULT_SURFACES', () => {
  it('web base 16, ui base 16, presentation base 24, social base 32', () => {
    expect(DEFAULT_SURFACES.web.basePx).toBe(16);
    expect(DEFAULT_SURFACES.ui.basePx).toBe(16);
    expect(DEFAULT_SURFACES.presentation.basePx).toBe(24);
    expect(DEFAULT_SURFACES.social.basePx).toBe(32);
  });
  it('only web has a fluid config', () => {
    expect(DEFAULT_SURFACES.web.fluid).toBeDefined();
    expect(DEFAULT_SURFACES.ui.fluid).toBeUndefined();
    expect(DEFAULT_SURFACES.presentation.fluid).toBeUndefined();
    expect(DEFAULT_SURFACES.social.fluid).toBeUndefined();
  });
});

describe('defaultSemanticMap', () => {
  it('maps h1 and body sensibly on web', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 6, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const map = defaultSemanticMap('web', steps);
    expect(map.body?.stepId).toBe('t0');
    expect(map.h1).toBeDefined();
    expect(map.h1!.stepId).not.toBe('t0');
  });
});
