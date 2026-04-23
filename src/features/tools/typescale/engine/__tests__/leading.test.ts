import { describe, it, expect } from 'vitest';
import { leadingFor } from '../leading';

describe('leadingFor', () => {
  it('normal curve: big headings tight, body loose', () => {
    expect(leadingFor(72, 'normal')).toBeLessThan(1.15);
    expect(leadingFor(48, 'normal')).toBeLessThan(1.25);
    expect(leadingFor(16, 'normal')).toBeGreaterThan(1.4);
    expect(leadingFor(12, 'normal')).toBeGreaterThan(1.5);
  });
  it('tight curve is tighter than normal at every size', () => {
    expect(leadingFor(48, 'tight')).toBeLessThan(leadingFor(48, 'normal'));
    expect(leadingFor(16, 'tight')).toBeLessThan(leadingFor(16, 'normal'));
  });
  it('loose curve is looser than normal at every size', () => {
    expect(leadingFor(48, 'loose')).toBeGreaterThan(leadingFor(48, 'normal'));
    expect(leadingFor(16, 'loose')).toBeGreaterThan(leadingFor(16, 'normal'));
  });
  it('custom falls back to normal when not provided', () => {
    expect(leadingFor(16, 'custom')).toBe(leadingFor(16, 'normal'));
  });
});
