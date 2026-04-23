import { describe, it, expect } from 'vitest';
import { toFluid } from '../fluid';
import type { ScaleStep } from '@/shared/types/typescale';

const step: ScaleStep = {
  id: 't2', index: 2, sizePx: 24, lineHeight: 1.3, letterSpacingEm: 0, weight: 600,
};

describe('toFluid', () => {
  it('embeds clamp() string in step.fluid.clamp', () => {
    const out = toFluid(step, { minVwPx: 320, maxVwPx: 1440, minRatioMultiplier: 0.75 });
    expect(out.fluid?.clamp.startsWith('clamp(')).toBe(true);
  });
  it('minPx = sizePx × minRatioMultiplier', () => {
    const out = toFluid(step, { minVwPx: 320, maxVwPx: 1440, minRatioMultiplier: 0.75 });
    expect(out.fluid?.minPx).toBeCloseTo(18, 2);
    expect(out.fluid?.maxPx).toBeCloseTo(24, 2);
  });
  it('preserves non-fluid fields', () => {
    const out = toFluid(step, { minVwPx: 320, maxVwPx: 1440, minRatioMultiplier: 0.75 });
    expect(out.sizePx).toBe(24);
    expect(out.lineHeight).toBe(1.3);
  });
});
