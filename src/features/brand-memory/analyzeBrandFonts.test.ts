// Phase 6.5 — font analysis tests.
import { describe, expect, it } from 'vitest';
import {
  analyzeDocumentFonts,
  rankBrandFonts,
  normalizeFontFamily,
} from './analyzeBrandFonts';
import type { BrandOSDocument } from '@/features/editor/schema';

const docWithFonts = (
  fonts: string[],
): BrandOSDocument =>
  ({
    schemaVersion: 1,
    id: '11111111-1111-1111-1111-111111111111',
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

describe('normalizeFontFamily', () => {
  it('trims whitespace', () => {
    expect(normalizeFontFamily('  Inter  ')).toBe('Inter');
  });
  it('strips surrounding double quotes', () => {
    expect(normalizeFontFamily('"Helvetica Neue"')).toBe('Helvetica Neue');
  });
  it('strips surrounding single quotes', () => {
    expect(normalizeFontFamily("'Roboto Mono'")).toBe('Roboto Mono');
  });
  it('preserves case', () => {
    expect(normalizeFontFamily('GT America')).toBe('GT America');
  });
  it('returns null for empty', () => {
    expect(normalizeFontFamily('')).toBeNull();
    expect(normalizeFontFamily('   ')).toBeNull();
  });
});

describe('analyzeDocumentFonts', () => {
  it('counts font families across text layers', () => {
    const doc = docWithFonts(['Inter', 'Inter', 'Roboto']);
    const counts = analyzeDocumentFonts(doc);
    expect(counts.get('Inter')).toBe(2);
    expect(counts.get('Roboto')).toBe(1);
  });

  it('skips SlotRef-bound fonts', () => {
    const doc = docWithFonts(['Inter']);
    // Replace the layer's fontFamily with a SlotRef.
    (doc.pages[0].layers[0] as { fontFamily: unknown }).fontFamily = {
      slotRef: 'kit',
      path: 'fontHeading',
    };
    const counts = analyzeDocumentFonts(doc);
    expect(counts.size).toBe(0);
  });

  it('walks group children', () => {
    const doc = docWithFonts(['Inter']);
    doc.pages[0].layers = [
      {
        id: '44444444-4444-4444-4444-444444444444',
        kind: 'group',
        name: 'G',
        transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
        opacity: 1, visible: true, locked: false, brandLocked: false,
        children: [
          {
            id: '55555555-5555-5555-5555-555555555555',
            kind: 'text', name: 'T',
            transform: { x: 0, y: 0, width: 100, height: 100, rotation: 0, scaleX: 1, scaleY: 1 },
            opacity: 1, visible: true, locked: false, brandLocked: false,
            text: 'x', fontFamily: 'Times New Roman', fontSize: 24, fontWeight: 400,
            textAlign: 'left', lineHeight: 1.2, color: '#000',
          },
        ],
      },
    ] as never;
    const counts = analyzeDocumentFonts(doc);
    expect(counts.get('Times New Roman')).toBe(1);
  });
});

describe('rankBrandFonts', () => {
  it('merges multiple docs and ranks by count desc', () => {
    const a = analyzeDocumentFonts(docWithFonts(['Inter', 'Inter']));
    const b = analyzeDocumentFonts(docWithFonts(['Inter', 'Roboto']));
    const ranked = rankBrandFonts([a, b]);
    expect(ranked).toEqual([
      { family: 'Inter', count: 3 },
      { family: 'Roboto', count: 1 },
    ]);
  });

  it('breaks ties alphabetically', () => {
    const a = analyzeDocumentFonts(docWithFonts(['Roboto']));
    const b = analyzeDocumentFonts(docWithFonts(['Inter']));
    const ranked = rankBrandFonts([a, b]);
    expect(ranked.map((r) => r.family)).toEqual(['Inter', 'Roboto']);
  });

  it('honors limit', () => {
    const a = analyzeDocumentFonts(docWithFonts(['A', 'B', 'C', 'D']));
    const ranked = rankBrandFonts([a], { limit: 2 });
    expect(ranked).toHaveLength(2);
  });
});
