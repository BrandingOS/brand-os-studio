import { describe, it, expect } from 'vitest';
import { computeMetrics } from '../computeMetrics';
import type { Brand } from '@/shared/types/brand';

const baseBrand: Brand = {
  id: 'test', slug: 'test', name: 'Acme',
  primaryColor: '#0066FF', secondaryColor: '#00CC88',
  fonts: { primary: 'Inter', secondary: 'Playfair' },
  tone: 'Professional', audience: 'Tech professionals',
  assets: [], createdAt: new Date(), updatedAt: new Date(),
};

describe('computeMetrics', () => {
  it('returns zero metrics for null brand', () => {
    const m = computeMetrics(null, 0);
    expect(m.healthScore).toBe(0);
    expect(m.completeness).toBe(0);
    expect(m.checklist).toHaveLength(0);
  });

  it('produces 12-item checklist', () => {
    const m = computeMetrics(baseBrand, 0);
    expect(m.checklist).toHaveLength(12);
  });

  it('calculates completeness as percentage of done items', () => {
    const m = computeMetrics(baseBrand, 0);
    const doneCount = m.checklist.filter((c) => c.done).length;
    expect(m.completeness).toBe(Math.round((doneCount / 12) * 100));
  });

  it('generates WCAG contrast results', () => {
    const m = computeMetrics(baseBrand, 0);
    expect(m.contrastResults.length).toBeGreaterThanOrEqual(2);
    expect(m.contrastResults[0]).toHaveProperty('ratio');
    expect(m.contrastResults[0]).toHaveProperty('level');
    expect(['AAA', 'AA', 'Fail']).toContain(m.contrastResults[0].level);
  });

  it('adds primary-on-secondary contrast when both colors set', () => {
    const m = computeMetrics(baseBrand, 0);
    const combo = m.contrastResults.find((c) => c.label === 'Primary on secondary');
    expect(combo).toBeDefined();
  });

  it('calculates health score as weighted average (0-100)', () => {
    const m = computeMetrics(baseBrand, 0);
    expect(m.healthScore).toBeGreaterThanOrEqual(0);
    expect(m.healthScore).toBeLessThanOrEqual(100);
  });

  it('health breakdown has 4 categories', () => {
    const m = computeMetrics(baseBrand, 0);
    expect(m.healthBreakdown).toHaveLength(4);
    const labels = m.healthBreakdown.map((h) => h.label);
    expect(labels).toContain('Identity');
    expect(labels).toContain('Strategy');
    expect(labels).toContain('Content');
    expect(labels).toContain('Accessibility');
  });

  it('aggregates asset categories', () => {
    const brand: Brand = {
      ...baseBrand,
      assets: [
        { id: '1', name: 'a', type: 'image', category: 'photo', source: 'upload', url: '', size: 0, tags: [], createdAt: new Date() },
        { id: '2', name: 'b', type: 'image', category: 'photo', source: 'upload', url: '', size: 0, tags: [], createdAt: new Date() },
        { id: '3', name: 'c', type: 'logo', category: 'logo', source: 'upload', url: '', size: 0, tags: [], createdAt: new Date() },
      ],
    };
    const m = computeMetrics(brand, 0);
    expect(m.categoryBreakdown).toContainEqual({ category: 'photo', count: 2 });
    expect(m.categoryBreakdown).toContainEqual({ category: 'logo', count: 1 });
  });

  it('generates 30-day view series', () => {
    const m = computeMetrics(baseBrand, 0);
    expect(m.viewSeries).toHaveLength(30);
    expect(m.viewCount).toBeGreaterThan(0);
  });
});
