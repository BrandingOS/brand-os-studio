import { describe, it, expect } from 'vitest';
import { trackingFor } from '../tracking';

describe('trackingFor', () => {
  it('large headings get negative tracking on normal curve', () => {
    expect(trackingFor(72, 'normal')).toBeLessThan(0);
  });
  it('body text tracking is near zero on normal curve', () => {
    expect(Math.abs(trackingFor(16, 'normal'))).toBeLessThan(0.005);
  });
  it('tiny text gets positive tracking on normal curve', () => {
    expect(trackingFor(10, 'normal')).toBeGreaterThan(0);
  });
  it('tight curve is always <= normal', () => {
    expect(trackingFor(48, 'tight')).toBeLessThanOrEqual(trackingFor(48, 'normal'));
  });
  it('loose curve is always >= normal', () => {
    expect(trackingFor(16, 'loose')).toBeGreaterThanOrEqual(trackingFor(16, 'normal'));
  });
});
