import { describe, it, expect } from 'vitest';
import { buildLadder } from '../scale';

describe('buildLadder', () => {
  it('produces stepsUp + stepsDown + 1 rungs', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.2, stepsUp: 6, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    expect(steps).toHaveLength(9);
  });
  it('base index is 0 and base size is basePx', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const base = steps.find(s => s.index === 0);
    expect(base?.sizePx).toBe(16);
  });
  it('steps are strictly increasing in sizePx', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.25, stepsUp: 6, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const sorted = [...steps].sort((a, b) => a.index - b.index);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i].sizePx).toBeGreaterThan(sorted[i - 1].sizePx);
  });
  it('ids are stable and unique', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.2, stepsUp: 4, stepsDown: 2, leading: 'normal', tracking: 'normal' });
    const ids = new Set(steps.map(s => s.id));
    expect(ids.size).toBe(steps.length);
    expect(ids.has('t-2')).toBe(true);
    expect(ids.has('t0')).toBe(true);
    expect(ids.has('t4')).toBe(true);
  });
  it('16 × minor-third, step +4 ≈ 33.18', () => {
    const steps = buildLadder({ basePx: 16, ratio: 1.2, stepsUp: 4, stepsDown: 0, leading: 'normal', tracking: 'normal' });
    const top = steps.find(s => s.index === 4)!;
    expect(top.sizePx).toBeCloseTo(33.18, 1);
  });
});
