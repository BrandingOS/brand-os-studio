/**
 * The Photos unit of an export — what actually reaches the zip.
 *
 * `photoExport.test.ts` proves the BUILDER; this proves the WIRING, and the
 * wiring is where D1 and D12 lived. The card's ⬇ and the kit's ⬇ both run
 * `writeUnit`, and its `photos` case used to fetch each source, trust
 * `res.ok`, and name the file from the mime type — which is how the app's own
 * `index.html` shipped as `photo-1.html`.
 *
 * It lives beside the builder rather than in `exportEverything.test.ts` so the
 * two halves of this defect are read together.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import JSZip from 'jszip';
import { planKitExport, writeUnit } from './exportEverything';
import { KIT_CATALOG } from '../catalog/catalog';
import { resetPhotoSourceCache, writePhotoDirection } from './photoExport';
import type { ZipFolder } from './zipFile';
import type { ExportSkip } from './zipFile';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { mockBrand } from '@/features/setup/data/mockBrand';
import { useBrandStore } from '@/shared/store/brandStore';
import type { Brand } from '@/shared/types/brand';

const PHOTOS_ENTRY = KIT_CATALOG.find((e) => e.storageLabel === 'Photos')!;

/** The document a single-page app answers a missing file with. */
const SPA_INDEX = '<!doctype html>\n<html><head><title>BrandingOS</title></head></html>';
const PNG = new Uint8Array(33);
PNG.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
PNG.set([0x49, 0x48, 0x44, 0x52], 12);
new DataView(PNG.buffer).setUint32(8, 13);
new DataView(PNG.buffer).setUint32(16, 4);
new DataView(PNG.buffer).setUint32(20, 4);

function response(body: Uint8Array | string, contentType: string, status = 200): Response {
  const bytes = typeof body === 'string' ? new TextEncoder().encode(body) : body;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  } as unknown as Response;
}

const brand = (photos: Array<{ id: string; src: string }>): MockBrand =>
  ({ ...mockBrand, name: 'SKAM', photos: photos.map((p, i) => ({ ...p, slot: 'ABCDEF'[i] })) }) as MockBrand;

async function runPhotosUnit(mock: MockBrand) {
  const [unit] = planKitExport([PHOTOS_ENTRY]);
  expect(unit.kind).toBe('photos');
  const zip = new JSZip();
  const skipped: ExportSkip[] = [];
  const added = await writeUnit(
    unit,
    zip as unknown as ZipFolder,
    { brand: mock, sourceBrand: null } as Parameters<typeof writeUnit>[2],
    skipped,
  );
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  return { added, skipped, names, zip };
}

beforeEach(() => {
  resetPhotoSourceCache();
  localStorage.removeItem('brandos:brand-kit:photos');
  // No canvas in jsdom, so a treated copy would fail; the default treatment is
  // Original, which needs none.
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/images/grain.png') return response(SPA_INDEX, 'text/html; charset=utf-8');
      if (url.endsWith('.png')) return response(PNG, 'image/png');
      return response('', 'text/plain', 404);
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.removeItem('brandos:brand-kit:photos');
  useBrandStore.setState({ list: [], current: undefined } as never);
});

describe('the Photos unit', () => {
  it('never zips the app’s own page as a photograph — D1', async () => {
    const { added, skipped, names } = await runPhotosUnit(
      brand([{ id: 'grain', src: '/images/grain.png' }]),
    );
    expect(names.some((n) => /\.html?$/.test(n))).toBe(false);
    expect(names.some((n) => n.startsWith('photo-'))).toBe(false);
    expect(skipped.map((s) => s.reason)).toContain('the server answered with text/html, not an image');
    // Something DID leave, and it explains itself — D12.
    expect(added).toBe(true);
    expect(names).toEqual(['photos/art-direction.md']);
  });

  it('names the file after the picture, and files it under originals/', async () => {
    const { added, names, skipped } = await runPhotosUnit(
      brand([{ id: 'a', src: 'https://cdn.test/night-market.png' }]),
    );
    expect(added).toBe(true);
    expect(skipped).toEqual([]);
    expect(names).toContain('photos/originals/night-market.png');
  });

  it('the bytes in the zip are the bytes that were verified', async () => {
    const { zip } = await runPhotosUnit(brand([{ id: 'a', src: 'https://cdn.test/a.png' }]));
    const bytes = await zip.file('photos/originals/a.png')!.async('uint8array');
    expect(Array.from(bytes.slice(0, 8))).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  });

  it('a brand with neither photographs nor rules writes nothing, and says so', async () => {
    const { added, names, skipped } = await runPhotosUnit(brand([]));
    expect(added).toBe(false);
    expect(names).toEqual([]);
    expect(skipped.map((s) => s.reason)).toContain('this brand has no photos yet');
  });

  it('a brand with rules and no photographs still exports the rules — D12', async () => {
    const record = { id: 'brand-x', name: 'SKAM' } as Brand;
    useBrandStore.setState({ list: [record], current: record } as never);
    writePhotoDirection('brand-x', {
      note: 'Daylight only. No stock.',
      defaultTreatment: 'original',
      treatments: {},
      order: [],
      hidden: [],
    });
    const { added, names, zip } = await runPhotosUnit(brand([]));
    expect(added).toBe(true);
    expect(names).toEqual(['photos/art-direction.md']);
    expect(await zip.file('photos/art-direction.md')!.async('string')).toContain('Daylight only.');
  });
});
