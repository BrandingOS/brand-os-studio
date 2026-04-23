import { describe, it, expect } from 'vitest';
import { RATIOS, resolveRatio } from '../ratios';

describe('ratios', () => {
  it('known ratios match canonical values', () => {
    expect(RATIOS['minor-second']).toBeCloseTo(1.067, 3);
    expect(RATIOS['major-second']).toBeCloseTo(1.125, 3);
    expect(RATIOS['minor-third']).toBeCloseTo(1.2, 3);
    expect(RATIOS['major-third']).toBeCloseTo(1.25, 3);
    expect(RATIOS['perfect-fourth']).toBeCloseTo(1.333, 3);
    expect(RATIOS['augmented-fourth']).toBeCloseTo(1.414, 3);
    expect(RATIOS['perfect-fifth']).toBeCloseTo(1.5, 3);
    expect(RATIOS['golden']).toBeCloseTo(1.618, 3);
  });

  it('resolveRatio returns custom value for custom name', () => {
    expect(resolveRatio({ name: 'custom', value: 1.42 })).toBe(1.42);
  });

  it('resolveRatio looks up known names', () => {
    expect(resolveRatio({ name: 'major-third', value: 0 })).toBeCloseTo(1.25, 3);
  });
});
