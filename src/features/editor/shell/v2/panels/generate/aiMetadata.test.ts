import { describe, expect, it } from 'vitest';
import type { BrandOSDocument } from '@/features/editor/schema';
import { appendGenerations, generationForPage, isAiImageDoc, readAiMetadata, withAiMetadata } from './aiMetadata';

const doc = {
  schemaVersion: 1, id: 'd', contentType: 'social-post', brandId: 'b', masterPages: [],
  pages: [{ id: 'p1', name: 'P', width: 10, height: 10, background: '#fff', masterPageId: null, layers: [] }],
  metadata: {},
} as unknown as BrandOSDocument;

const rec = (pageId: string) => ({
  id: `g-${pageId}`, pageId, original: 'o', compiled: 'c', model: 'mock:svg', count: 1, batchId: 'b1',
  refs: [], kind: 'generate' as const, createdAt: '2026-08-17T00:00:00Z',
});

describe('aiMetadata', () => {
  it('reads an empty record from a plain doc', () => {
    expect(readAiMetadata(doc)).toEqual({ origin: undefined, pendingPrompt: undefined, generations: [] });
    expect(isAiImageDoc(doc)).toBe(false);
  });
  it('withAiMetadata sets origin and pendingPrompt, appendGenerations clears the pending prompt', () => {
    const a = withAiMetadata(doc, { pendingPrompt: 'a cat' });
    expect(isAiImageDoc(a)).toBe(true);
    expect(readAiMetadata(a).pendingPrompt).toBe('a cat');
    const b = appendGenerations(a, [rec('p2'), rec('p3')]);
    expect(readAiMetadata(b).pendingPrompt).toBeUndefined();
    expect(readAiMetadata(b).generations.map((g) => g.pageId)).toEqual(['p2', 'p3']);
    expect(generationForPage(b, 'p3')?.id).toBe('g-p3');
    expect(generationForPage(b, 'nope')).toBeUndefined();
    // untouched other metadata survives
    const c = withAiMetadata({ ...doc, metadata: { other: 1 } } as BrandOSDocument, {});
    expect((c.metadata as Record<string, unknown>).other).toBe(1);
  });
});
