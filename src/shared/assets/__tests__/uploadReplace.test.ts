/**
 * Uploading over an asset that already exists in the Library.
 *
 * `stageAsset` deliberately REUSES an id in two cases — an explicit replace,
 * and a content-hash match — so the upload path has to recognise that it is
 * looking at an existing Library item. Creating instead is not a cosmetic
 * mistake: in Supabase it is a duplicate-key error, so every logo replace fails
 * for authenticated users while working fine locally.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { LocalAssetsService } from '@/core/adapters/database/LocalAssetsService';
import type { Brand } from '@/shared/types/brand';

const BRAND_ID = 'brand_a';
let assets: LocalAssetsService;
let brand: Brand;

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock('@/core', () => ({ useService: () => assets }));

vi.mock('@/shared/store/brandStore', () => {
  const update = vi.fn(async () => brand);
  const reprojectLibrary = vi.fn(async () => {});
  const state = () => ({ list: [brand], current: brand, update, reprojectLibrary });
  const useBrandStore = ((sel: (s: unknown) => unknown) => sel(state())) as unknown as {
    (sel: (s: unknown) => unknown): unknown;
    getState: () => ReturnType<typeof state>;
  };
  useBrandStore.getState = state;
  return { useBrandStore };
});

// jsdom has no canvas, so the real compressors cannot run. The stand-in url
// deliberately has no image extension and no `data:image/` prefix: the hook's
// dimension probe short-circuits on those, and jsdom's `Image` never fires
// `onload`, so anything else would hang forever.
const COMPRESSED = 'blob:test/new-material';
vi.mock('@/shared/utils/imageUpload', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  compressLogo: async () => 'blob:test/new-material',
  compressAsset: async () => 'blob:test/new-material',
  compressImage: async () => 'blob:test/new-material',
}));

import { useAssetUpload } from '../useAssetUpload';

function file(name = 'logo.png'): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });
}

beforeEach(() => {
  // jsdom implements neither of these, and the upload path uses them.
  (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => 'blob:test/x';
  (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => {};
  localStorage.clear();
  assets = new LocalAssetsService();
  brand = {
    id: BRAND_ID,
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#111',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    brandAssets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Brand;
});

describe('CodeRabbit Round 2 #13 — a replacement updates, it does not create', () => {
  it('re-uploading identical content does not add a second Library item', async () => {
    const { result } = renderHook(() => useAssetUpload(BRAND_ID));

    await act(async () => {
      await result.current.upload(file(), { kind: 'image' });
    });
    const afterFirst = await assets.listLibrary(BRAND_ID);
    expect(afterFirst).toHaveLength(1);

    // Same bytes → same content hash → stageAsset reuses the id. Before the
    // fix this became a create with an id the Library already had.
    brand = { ...brand, brandAssets: afterFirst.map((a) => ({ id: a.id })) } as Brand;
    await act(async () => {
      await result.current.upload(file(), { kind: 'image' });
    });

    const afterSecond = await assets.listLibrary(BRAND_ID);
    expect(afterSecond).toHaveLength(1);
    expect(afterSecond[0].id).toBe(afterFirst[0].id);
  });

  it('an explicit replace keeps ONE item and points it at the new material', async () => {
    const existing = await assets.create({
      brandId: BRAND_ID,
      name: 'old.png',
      type: 'logo',
      category: 'logo',
      url: 'https://cdn.test/old.png',
      legacyRefId: 'asset-legacy-1',
    });
    brand = {
      ...brand,
      brandAssets: [{ id: existing.id, kind: 'logo', name: 'old.png', formats: {}, metadata: {} }],
    } as Brand;

    const { result } = renderHook(() => useAssetUpload(BRAND_ID));
    await act(async () => {
      await result.current.upload(file('new.png'), { kind: 'image', replaceAssetId: existing.id });
    });

    const items = await assets.listLibrary(BRAND_ID);
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(existing.id);
    expect(items[0].url).toBe(COMPRESSED);
    // Identity survives the replace.
    expect(items[0].legacyRefId).toBe('asset-legacy-1');
  });
});
