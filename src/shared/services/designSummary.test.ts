import { describe, it, expect } from 'vitest';
import { excludeTemplates } from './designSummary';
import type { DesignSummary } from '@/core/types/services';

describe('excludeTemplates', () => {
  it('drops masters and keeps working designs', () => {
    const rows = [
      { id: 'a', isTemplate: true },
      { id: 'b', isTemplate: false },
      { id: 'c' },
    ] as DesignSummary[];
    expect(excludeTemplates(rows).map((r) => r.id)).toEqual(['b', 'c']);
  });

  it('keeps a row with no isTemplate key at all (pre-flag legacy row)', () => {
    const rows = [{ id: 'legacy-1', contentType: 'invoice' }] as DesignSummary[];
    expect(excludeTemplates(rows).map((r) => r.id)).toEqual(['legacy-1']);
  });

  it('returns an empty array unchanged', () => {
    expect(excludeTemplates([])).toEqual([]);
  });

  it('drops every row when all are masters', () => {
    const rows = [
      { id: 'm1', isTemplate: true },
      { id: 'm2', isTemplate: true },
    ] as DesignSummary[];
    expect(excludeTemplates(rows)).toEqual([]);
  });
});
