import { describe, it, expect } from 'vitest';
import { OUTPUT_SPECS, OUTPUT_SPEC_LIST, getOutputSpec } from './outputSpecs';

describe('output spec registry', () => {
  it('exports a non-empty registry', () => {
    expect(OUTPUT_SPEC_LIST.length).toBeGreaterThan(5);
  });

  it('every spec has consistent id keying', () => {
    for (const [key, spec] of Object.entries(OUTPUT_SPECS)) {
      expect(spec.id).toBe(key);
    }
  });

  it('every spec declares positive native dimensions', () => {
    for (const spec of OUTPUT_SPEC_LIST) {
      expect(spec.width).toBeGreaterThan(0);
      expect(spec.height).toBeGreaterThan(0);
      expect(spec.aspect).toMatch(/\d+\s*\/\s*\d+/);
    }
  });

  it('hybrid + ai specs declare a meaningful prompt key', () => {
    for (const spec of OUTPUT_SPEC_LIST) {
      if (spec.strategy === 'template') continue;
      expect(spec.promptKey).not.toBe('none');
    }
  });

  it('every spec has at least one required brand field', () => {
    for (const spec of OUTPUT_SPEC_LIST) {
      expect(spec.requires.length).toBeGreaterThan(0);
    }
  });

  it('getOutputSpec throws for unknown ids', () => {
    expect(() => getOutputSpec('not_a_real_type' as never)).toThrow();
  });
});
