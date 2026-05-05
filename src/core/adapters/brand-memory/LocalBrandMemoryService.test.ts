// Phase 6.3 — LocalBrandMemoryService tests.
import { describe, expect, it, vi } from 'vitest';
import { LocalBrandMemoryService } from './LocalBrandMemoryService';
import type { IDesignStorage, DesignSummary } from '@/core/types/services';
import type { BrandOSDocument } from '@/features/editor/schema';

const docWith = (background: string, fills: string[]): BrandOSDocument => ({
  schemaVersion: 1,
  id: '11111111-1111-1111-1111-111111111111',
  contentType: 'social-post',
  brandId: 'brand-raqm',
  masterPages: [],
  metadata: {},
  pages: [{
    id: '22222222-2222-2222-2222-222222222222',
    name: 'P', width: 1080, height: 1080,
    background,
    layers: fills.map((fill, i) => ({
      id: `33333333-3333-3333-3333-${String(i).padStart(12, '0')}`,
      kind: 'shape' as const, name: 'Shape',
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
      shape: 'rectangle' as const, fill,
    })),
  }],
} as BrandOSDocument);

const docWithFonts = (fonts: string[]): BrandOSDocument => ({
  schemaVersion: 1,
  id: '11111111-1111-1111-1111-aaaaaaaaaaaa',
  contentType: 'social-post',
  brandId: 'brand-raqm',
  masterPages: [],
  metadata: {},
  pages: [{
    id: '22222222-2222-2222-2222-222222222222',
    name: 'P', width: 1080, height: 1080,
    background: '#fff',
    layers: fonts.map((family, i) => ({
      id: `33333333-3333-3333-3333-${String(i).padStart(12, '0')}`,
      kind: 'text' as const, name: 'Headline',
      transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
      opacity: 1, visible: true, locked: false, brandLocked: false,
      text: 'x', fontFamily: family, fontSize: 24, fontWeight: 400,
      textAlign: 'left' as const, lineHeight: 1.2, color: '#000',
    })),
  }],
} as BrandOSDocument);

function makeStorage(designsByBrand: Record<string, BrandOSDocument[]>): IDesignStorage {
  const summaries: Record<string, DesignSummary[]> = {};
  for (const [brandId, docs] of Object.entries(designsByBrand)) {
    summaries[brandId] = docs.map((d) => ({ id: d.id, name: 'Design ' + d.id }));
  }
  return {
    saveDesign: vi.fn(),
    loadDesign: vi.fn(async (brandId: string, id: string) =>
      designsByBrand[brandId]?.find((d) => d.id === id) ?? null,
    ),
    listDesigns: vi.fn(async (brandId: string) => summaries[brandId] ?? []),
    deleteDesign: vi.fn(),
  };
}

describe('LocalBrandMemoryService', () => {
  it('returns null when the brand has no designs', async () => {
    const svc = new LocalBrandMemoryService(makeStorage({}));
    const snap = await svc.getSnapshot('empty-brand');
    expect(snap).toBeNull();
  });

  it('analyzes one design and returns ranked colors', async () => {
    const doc = docWith('#ffffff', ['#ff0000', '#ff0000', '#00ff00']);
    const svc = new LocalBrandMemoryService(makeStorage({ b: [doc] }));
    const snap = await svc.getSnapshot('b');
    expect(snap).not.toBeNull();
    expect(snap!.colors[0]).toEqual({ hex: '#ff0000', count: 2 });
    expect(snap!.colors.find((c) => c.hex === '#00ff00')?.count).toBe(1);
    expect(snap!.colors.find((c) => c.hex === '#ffffff')?.count).toBe(1);
  });

  it('aggregates across multiple designs', async () => {
    const a = docWith('#fff', ['#ff0000']);
    const b = docWith('#fff', ['#ff0000', '#00ff00']);
    const c = docWith('#fff', ['#0000ff']);
    a.id = '11111111-1111-1111-1111-aaaaaaaaaaaa';
    b.id = '11111111-1111-1111-1111-bbbbbbbbbbbb';
    c.id = '11111111-1111-1111-1111-cccccccccccc';
    const svc = new LocalBrandMemoryService(makeStorage({ b: [a, b, c] }));
    const snap = await svc.getSnapshot('b');
    expect(snap!.colors[0]).toEqual({ hex: '#ffffff', count: 3 });    // background × 3
    expect(snap!.colors.find((c) => c.hex === '#ff0000')?.count).toBe(2);
  });

  it('honors caller-supplied limit', async () => {
    const doc = docWith('#fff', ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00']);
    const svc = new LocalBrandMemoryService(makeStorage({ b: [doc] }));
    const snap = await svc.getSnapshot('b', { limit: 2 });
    expect(snap!.colors).toHaveLength(2);
  });

  it('caches across calls; refresh forces recompute', async () => {
    const docA = docWith('#fff', ['#ff0000']);
    const storage = makeStorage({ b: [docA] });
    const svc = new LocalBrandMemoryService(storage);
    await svc.getSnapshot('b');
    await svc.getSnapshot('b');    // should hit cache
    expect(storage.listDesigns).toHaveBeenCalledTimes(1);
    await svc.refresh('b');         // forces recompute
    expect(storage.listDesigns).toHaveBeenCalledTimes(2);
  });

  it('produces a fresh ISO timestamp on refresh', async () => {
    const doc = docWith('#fff', ['#ff0000']);
    const svc = new LocalBrandMemoryService(makeStorage({ b: [doc] }));
    const first = await svc.refresh('b');
    await new Promise((r) => setTimeout(r, 5));
    const second = await svc.refresh('b');
    expect(first!.computedAt).not.toBe(second!.computedAt);
  });

  it('emits a ranked fonts list alongside colors (Phase 6.5)', async () => {
    const a = docWithFonts(['Inter', 'Inter']);
    const b = docWithFonts(['Inter', 'Roboto']);
    a.id = '11111111-1111-1111-1111-aaaaaaaaaaaa';
    b.id = '11111111-1111-1111-1111-bbbbbbbbbbbb';
    const svc = new LocalBrandMemoryService(makeStorage({ b: [a, b] }));
    const snap = await svc.getSnapshot('b');
    expect(snap!.fonts[0]).toEqual({ family: 'Inter', count: 3 });
    expect(snap!.fonts.find((f) => f.family === 'Roboto')?.count).toBe(1);
  });

  it('truncates fonts to caller-supplied limit', async () => {
    const doc = docWithFonts(['A', 'B', 'C', 'D', 'E']);
    const svc = new LocalBrandMemoryService(makeStorage({ b: [doc] }));
    const snap = await svc.getSnapshot('b', { limit: 2 });
    expect(snap!.fonts).toHaveLength(2);
  });
});
