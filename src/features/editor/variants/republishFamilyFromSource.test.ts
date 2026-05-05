// Phase 5.3b — republishFamilyFromSource tests.
import { describe, expect, it } from 'vitest';
import { republishFamilyFromSource } from './republishFamilyFromSource';
import { generateResizeVariants } from './generateResizeVariants';
import type { BrandOSDocument } from '../schema';

function squareSource(): BrandOSDocument {
  return {
    schemaVersion: 1,
    id: 'src-1',
    contentType: 'social-post',
    brandId: 'brand-raqm',
    masterPages: [],
    metadata: {},
    pages: [{
      id: 'p-1', name: 'P', width: 1000, height: 1000,
      background: { fill: '#fff' },
      layers: [{
        id: 'l-text',
        kind: 'text',
        name: 'Headline',
        transform: { x: 100, y: 100, width: 800, height: 200, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, visible: true, locked: false, brandLocked: false,
        text: 'Hello',
        fontFamily: 'Inter', fontSize: 48, color: '#000',
        fontWeight: 'bold', textAlign: 'left', lineHeight: 1.2,
      }],
    }],
  } as BrandOSDocument;
}

describe('republishFamilyFromSource', () => {
  it('throws if source has no familyId', () => {
    const source = squareSource();
    expect(() =>
      republishFamilyFromSource({ source, existingVariants: [] }),
    ).toThrow(/familyId/);
  });

  it('returns empty variants when family has no variants yet', () => {
    const source = squareSource();
    source.familyId = '00000000-0000-0000-0000-0000000000aa';
    const result = republishFamilyFromSource({ source, existingVariants: [] });
    expect(result.variants).toEqual([]);
    expect(result.source.familyId).toBe(source.familyId);
  });

  it('preserves each existing variant id; overwrites the doc body with current source state', () => {
    const source = squareSource();
    const initial = generateResizeVariants({
      source,
      targets: [
        { label: 'Story 9:16', width: 1080, height: 1920 },
        { label: 'Portrait 4:5', width: 1080, height: 1350 },
      ],
    });

    // Mutate the source: change text content. Republish.
    const updated = { ...initial.sourceWithFamily };
    updated.pages = updated.pages.map((p) => ({
      ...p,
      layers: p.layers.map((l) =>
        l.id === 'l-text' ? { ...l, text: 'Goodbye' } : l,
      ),
    }));

    const result = republishFamilyFromSource({
      source: updated,
      existingVariants: initial.variants,
    });

    expect(result.variants).toHaveLength(2);
    expect(result.variants[0].id).toBe(initial.variants[0].id);
    expect(result.variants[1].id).toBe(initial.variants[1].id);
    for (const v of result.variants) {
      const text = v.pages[0].layers.find((l) => l.id === 'l-text')!;
      expect((text as { text: string }).text).toBe('Goodbye');
    }
    expect(result.variants[0].pages[0].width).toBe(1080);
    expect(result.variants[0].pages[0].height).toBe(1920);
    expect(result.variants[1].pages[0].width).toBe(1080);
    expect(result.variants[1].pages[0].height).toBe(1350);
  });

  it('preserves familyId across the rebuild', () => {
    const source = squareSource();
    const initial = generateResizeVariants({
      source,
      targets: [{ label: 'Story', width: 1080, height: 1920 }],
    });
    const result = republishFamilyFromSource({
      source: initial.sourceWithFamily,
      existingVariants: initial.variants,
    });
    expect(result.source.familyId).toBe(initial.familyId);
    expect(result.variants[0].familyId).toBe(initial.familyId);
  });

  it('preserves sourceDesignId pointer on each rebuilt variant', () => {
    const source = squareSource();
    const initial = generateResizeVariants({
      source,
      targets: [{ label: 'Story', width: 1080, height: 1920 }],
    });
    const result = republishFamilyFromSource({
      source: initial.sourceWithFamily,
      existingVariants: initial.variants,
    });
    expect(result.variants[0].sourceDesignId).toBe(source.id);
  });

  it('uses the resolvePresetLabel hook when supplied', () => {
    const source = squareSource();
    source.familyId = 'fam-1';
    const variant = {
      ...source,
      id: 'v-1',
      familyId: 'fam-1',
      sourceDesignId: source.id,
      pages: [{ ...source.pages[0], width: 1080, height: 1920 }],
    } as BrandOSDocument;

    const result = republishFamilyFromSource({
      source,
      existingVariants: [variant],
      resolvePresetLabel: (w, h) =>
        w === 1080 && h === 1920 ? 'Story 9:16' : null,
    });
    expect(result.presetLabels).toEqual(['Story 9:16']);
  });

  it('falls back to "WxH" label when no resolver', () => {
    const source = squareSource();
    source.familyId = 'fam-1';
    const variant = {
      ...source,
      id: 'v-1',
      familyId: 'fam-1',
      sourceDesignId: source.id,
      pages: [{ ...source.pages[0], width: 1080, height: 1920 }],
    } as BrandOSDocument;

    const result = republishFamilyFromSource({
      source,
      existingVariants: [variant],
    });
    expect(result.presetLabels).toEqual(['1080×1920']);
  });
});
