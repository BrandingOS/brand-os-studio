// Phase 5.3a — groupByFamily ordering tests.
import { describe, expect, it } from 'vitest';
import { groupByFamily } from './TemplatesPanel';
import type { DesignSummary } from '@/core/types/services';

const make = (overrides: Partial<DesignSummary>): DesignSummary => ({
  id: overrides.id ?? 'd-' + Math.random().toString(36).slice(2, 8),
  name: 'Untitled',
  ...overrides,
});

describe('groupByFamily', () => {
  it('returns lone designs in original order when no family ids set', () => {
    const designs = [make({ id: 'a' }), make({ id: 'b' }), make({ id: 'c' })];
    const out = groupByFamily(designs);
    expect(out.map((e) => e.design.id)).toEqual(['a', 'b', 'c']);
    expect(out.every((e) => e.role === 'lone')).toBe(true);
    expect(out.every((e) => e.familySize === 1)).toBe(true);
  });

  it('sources render before their variants within a family', () => {
    // Input order: variant first, then source — confirms grouping
    // re-orders to source-first.
    const designs = [
      make({ id: 'v1', familyId: 'fam', sourceDesignId: 'src' }),
      make({ id: 'src', familyId: 'fam' }),
      make({ id: 'v2', familyId: 'fam', sourceDesignId: 'src' }),
    ];
    const out = groupByFamily(designs);
    expect(out.map((e) => e.design.id)).toEqual(['src', 'v1', 'v2']);
    expect(out.map((e) => e.role)).toEqual(['source', 'variant', 'variant']);
    // Cluster size of 3 propagates to every member.
    expect(out.every((e) => e.familySize === 3)).toBe(true);
  });

  it('multiple families cluster separately', () => {
    const designs = [
      make({ id: 'srcA', familyId: 'A' }),
      make({ id: 'srcB', familyId: 'B' }),
      make({ id: 'vA1', familyId: 'A', sourceDesignId: 'srcA' }),
      make({ id: 'vB1', familyId: 'B', sourceDesignId: 'srcB' }),
    ];
    const out = groupByFamily(designs);
    // Family A first because its first member came first.
    expect(out.map((e) => e.design.id)).toEqual(['srcA', 'vA1', 'srcB', 'vB1']);
  });

  it('lone designs render after all families regardless of input order', () => {
    const designs = [
      make({ id: 'lone1' }),                                  // no family
      make({ id: 'src', familyId: 'fam' }),                   // family head
      make({ id: 'lone2' }),                                  // no family
      make({ id: 'v1', familyId: 'fam', sourceDesignId: 'src' }),
    ];
    const out = groupByFamily(designs);
    expect(out.map((e) => e.design.id)).toEqual(['src', 'v1', 'lone1', 'lone2']);
  });

  it('orphan variant (source not in list) renders as variant with cluster size = 1', () => {
    const designs = [
      make({ id: 'orphan', familyId: 'fam', sourceDesignId: 'missing-src' }),
    ];
    const out = groupByFamily(designs);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('variant');
    expect(out[0].familySize).toBe(1);
  });

  it('source with no variants still flagged as source with familySize 1', () => {
    const designs = [make({ id: 'src', familyId: 'fam' })];
    const out = groupByFamily(designs);
    expect(out).toHaveLength(1);
    expect(out[0].role).toBe('source');
    expect(out[0].familySize).toBe(1);
  });
});
