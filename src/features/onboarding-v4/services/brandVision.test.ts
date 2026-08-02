import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useV4Store } from '../store/onboardingV4Store';
import type { BrandVisionVerdict } from './brandVision';
import { classifyImage, verdictToPatch } from './brandVision';

function verdict(patch: Partial<BrandVisionVerdict> = {}): BrandVisionVerdict {
  return {
    category: 'logo_mark',
    confidence: 0.95,
    placement: 'logos',
    is_logo: true,
    logo_slot: 'mark',
    reasoning: 'test',
    needs_review: false,
    ...patch,
  };
}

describe('verdictToPatch', () => {
  const current = { kind: 'image' as const, sub: 'PNG · 10 KB' };

  it('routes logos with an AI slot hint (never a hard slot)', () => {
    const patch = verdictToPatch(verdict(), current);
    expect(patch.isLogo).toBe(true);
    expect(patch.aiLogoSlot).toBe('mark');
    // A hard logoSlot would hide the tile from the dropzone list.
    expect(patch.logoSlot).toBeUndefined();
    expect(patch.kind).toBe('image');
    expect(patch.sub).toContain('✨ logo mark');
  });

  it('routes plain images out of the logo group', () => {
    const patch = verdictToPatch(verdict({ category: 'photo', placement: 'images', is_logo: false, logo_slot: null }), current);
    expect(patch.isLogo).toBe(false);
    expect(patch.logoSlot).toBeUndefined();
  });

  it('never strips "logo" from an upload the heuristics already flagged', () => {
    // A detailed mark can read as "pattern" to the model; losing the logo
    // flag here would drop it from the brand at save time.
    const knownLogo = { kind: 'image' as const, sub: 'PNG · 9 KB', isLogo: true };
    const patch = verdictToPatch(
      verdict({ category: 'pattern', placement: 'images', is_logo: false, logo_slot: null }),
      knownLogo,
    );
    expect(patch.isLogo).toBeUndefined(); // untouched — stays a logo
    expect(patch.kind).toBeUndefined();
    expect(patch.sub).toContain('✨ pattern');
  });

  it('still promotes an unrecognized image to a logo', () => {
    const plain = { kind: 'image' as const, sub: 'PNG · 9 KB', isLogo: false };
    const patch = verdictToPatch(verdict({ logo_slot: 'wordmark' }), plain);
    expect(patch.isLogo).toBe(true);
    expect(patch.aiLogoSlot).toBe('wordmark');
  });

  it('keeps palette images as image cards', () => {
    const patch = verdictToPatch(verdict({ category: 'palette', placement: 'colors', is_logo: false, logo_slot: null }), current);
    expect(patch.kind).toBe('image');
    expect(patch.isLogo).toBe(false);
  });

  it('moves document images to files', () => {
    const patch = verdictToPatch(verdict({ category: 'document', placement: 'files', is_logo: false, logo_slot: null }), current);
    expect(patch.kind).toBe('file');
  });

  it('does not duplicate the AI tag in sub', () => {
    const tagged = { kind: 'image' as const, sub: 'PNG · 10 KB · ✨ photo' };
    const patch = verdictToPatch(verdict(), tagged);
    expect(patch.sub?.match(/✨/g)?.length).toBe(1);
  });
});

describe('classifyAndRoute — placement authority', () => {
  beforeEach(() => {
    useV4Store.getState().reset();
  });

  it('never demotes an asset the user already placed in a logo slot', async () => {
    const { classifyAndRoute } = await import('./brandVision');
    const store = useV4Store.getState();
    store.addAsset({
      id: 'a1',
      name: 'mark.png',
      sub: 'PNG · 10 KB',
      kind: 'image',
      isLogo: true,
      logoSlot: 'primary',
      previewUrl: null,
      uploadStatus: 'done',
      uploadProgress: 1,
    });
    // Model misreads a detailed mark as a pattern.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => verdict({ category: 'pattern', placement: 'images', is_logo: false, logo_slot: null }),
      }),
    );
    classifyAndRoute('a1', new File(['x'], 'mark.png', { type: 'image/png' }));
    await new Promise((r) => setTimeout(r, 20));
    const after = useV4Store.getState().assets.find((a) => a.id === 'a1');
    expect(after?.isLogo).toBe(true);
    expect(after?.logoSlot).toBe('primary');
    vi.unstubAllGlobals();
  });
});

describe('classifyImage', () => {
  beforeEach(() => {
    useV4Store.getState().reset();
  });

  it('returns the verdict on success', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => verdict(),
    });
    const result = await classifyImage(new File(['x'], 'a.png', { type: 'image/png' }), fetchImpl as any);
    expect(result?.category).toBe('logo_mark');
    const [url, init] = fetchImpl.mock.calls[0];
    expect(String(url)).toContain('/classify');
    expect((init.body as FormData).get('engine')).toBe('custom');
  });

  it('returns null when the service is down (and trips the breaker)', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'));
    const result = await classifyImage(new File(['x'], 'a.png', { type: 'image/png' }), fetchImpl as any);
    expect(result).toBeNull();
    // Second call short-circuits without hitting fetch (breaker open).
    const result2 = await classifyImage(new File(['x'], 'b.png', { type: 'image/png' }), fetchImpl as any);
    expect(result2).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
