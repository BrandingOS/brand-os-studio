// The document every generation entry point opens.
//
// One rule is load-bearing and easy to break by "improving" the seed: the page
// must be EMPTY. Generated images arrive as new pages after the active one, so
// anything seeded here would sit in front of every result forever.

import { describe, expect, it } from 'vitest';
import { BrandOSDocumentSchema } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import { seedAiImageCanvas, canvasSizeForFormat } from './aiCanvasSeed';
import { readAiMetadata } from './aiMetadata';

const brand: Brand = {
  id: 'brand-1', slug: 'acme', name: 'Acme',
  primaryColor: '#1A1A2E', fonts: { primary: 'Inter' },
  tone: '', audience: '', assets: [],
  createdAt: new Date(), updatedAt: new Date(),
};

describe('seedAiImageCanvas', () => {
  it('produces a schema-valid document with exactly one empty page', () => {
    const doc = seedAiImageCanvas(brand, { prompt: 'a red car' });
    expect(() => BrandOSDocumentSchema.parse(doc)).not.toThrow();
    expect(doc.pages).toHaveLength(1);
    expect(doc.pages[0].layers).toEqual([]);
    expect(doc.brandId).toBe('brand-1');
  });

  it('marks the doc as AI-origin and stages the prompt for the panel', () => {
    const ai = readAiMetadata(seedAiImageCanvas(brand, { prompt: 'a red car' }));
    expect(ai.origin).toBe('ai-image');
    expect(ai.pendingPrompt).toBe('a red car');
  });

  it('omits pendingPrompt when there is nothing to hand off', () => {
    expect(readAiMetadata(seedAiImageCanvas(brand)).pendingPrompt).toBeUndefined();
  });

  it('sizes the canvas from the format, longest edge 1080', () => {
    expect(canvasSizeForFormat('auto')).toEqual({ width: 1080, height: 1080 });
    expect(canvasSizeForFormat('square')).toEqual({ width: 1080, height: 1080 });
    expect(canvasSizeForFormat('vertical')).toEqual({ width: 608, height: 1080 });
    expect(canvasSizeForFormat('widescreen')).toEqual({ width: 1080, height: 608 });
    // An unknown id falls back to Auto rather than producing a zero-size page.
    expect(canvasSizeForFormat('nonsense')).toEqual({ width: 1080, height: 1080 });
  });
});
