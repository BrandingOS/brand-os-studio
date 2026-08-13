/**
 * The read-only Library projection.
 *
 * This exists so ~34 synchronous readers keep working while the Library becomes
 * the authoritative asset store. The tests therefore care about two things: that
 * a Library item is resolvable the way `useBrandLogo` resolves one, and that the
 * projection cannot become a second place asset truth is written.
 */
import { describe, it, expect } from 'vitest';
import type { Asset, Brand } from '@/shared/types/brand';
import type { BrandAsset } from '@/shared/types/brandAssets';
import {
  assetToBrandAsset,
  projectLibraryOntoBrand,
  unIngestedCount,
} from '../libraryProjection';

function libItem(over: Partial<Asset> = {}): Asset {
  return {
    id: 'lib_1',
    name: 'logo.svg',
    type: 'logo',
    category: 'logo',
    source: 'upload',
    url: 'https://cdn.test/logo.svg',
    size: 10,
    tags: [],
    metadata: {},
    createdAt: new Date('2026-08-13T00:00:00.000Z'),
    origin: 'uploaded',
    deletedAt: null,
    ...over,
  } as Asset;
}

function brand(over: Partial<Brand> = {}): Brand {
  return {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#111',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as Brand;
}

describe('assetToBrandAsset', () => {
  it('keeps the id, because that is what refs resolve against', () => {
    expect(assetToBrandAsset(libItem({ id: 'a_1' })).id).toBe('a_1');
  });

  it('infers the format from metadata, then the url', () => {
    expect(assetToBrandAsset(libItem()).formats.svg?.url).toBe('https://cdn.test/logo.svg');
    expect(
      assetToBrandAsset(libItem({ url: 'https://cdn.test/x.webp' })).formats.webp,
    ).toBeTruthy();
    expect(
      assetToBrandAsset(libItem({ url: 'https://x/y', metadata: { format: 'image/png' } })).formats.png,
    ).toBeTruthy();
  });

  it('maps Library type onto BrandAsset kind', () => {
    expect(assetToBrandAsset(libItem({ type: 'logo' })).kind).toBe('logo');
    expect(assetToBrandAsset(libItem({ type: 'font' })).kind).toBe('font');
    expect(assetToBrandAsset(libItem({ type: 'image' })).kind).toBe('image');
  });
});

describe('projectLibraryOntoBrand', () => {
  it('makes a Library item resolvable the way useBrandLogo resolves one', () => {
    const projected = projectLibraryOntoBrand(
      brand({ logoSystem: { primary: { assetId: 'lib_1' } } }),
      [libItem({ id: 'lib_1' })],
    );
    // This exact lookup is what ~34 readers perform.
    const hit = projected.brandAssets?.find((a) => a.id === 'lib_1');
    expect(hit).toBeTruthy();
    expect(Object.values(hit!.formats)[0]?.url).toBe('https://cdn.test/logo.svg');
  });

  it('unions with stored entries the Library has not absorbed yet', () => {
    const stored = { id: 'old_1', kind: 'logo', name: 'old.svg', formats: { svg: { url: 'u', size: 1 } }, metadata: { createdAt: 'x', version: 1 } } as BrandAsset;
    const projected = projectLibraryOntoBrand(
      brand({ brandAssets: [stored] }),
      [libItem({ id: 'lib_1' })],
    );
    expect(projected.brandAssets?.map((a) => a.id).sort()).toEqual(['lib_1', 'old_1']);
  });

  it('the Library wins on an id collision — it is the authoritative copy', () => {
    const stale = { id: 'lib_1', kind: 'logo', name: 'STALE', formats: { svg: { url: 'stale', size: 1 } }, metadata: { createdAt: 'x', version: 1 } } as BrandAsset;
    const projected = projectLibraryOntoBrand(
      brand({ brandAssets: [stale] }),
      [libItem({ id: 'lib_1', name: 'FRESH' })],
    );
    const hit = projected.brandAssets?.find((a) => a.id === 'lib_1');
    expect(hit?.name).toBe('FRESH');
  });

  it('excludes tombstoned items — a deleted asset stops rendering', () => {
    const projected = projectLibraryOntoBrand(brand(), [
      libItem({ id: 'lib_1' }),
      libItem({ id: 'lib_2', deletedAt: new Date(), url: '' }),
    ]);
    expect(projected.brandAssets?.map((a) => a.id)).toEqual(['lib_1']);
  });

  it('does not mutate the input brand — it is a projection, not a write', () => {
    const original = brand({ brandAssets: [] });
    const projected = projectLibraryOntoBrand(original, [libItem()]);
    expect(original.brandAssets).toEqual([]);
    expect(projected).not.toBe(original);
  });

  it('is reconstructible: same inputs give the same projection', () => {
    const b = brand();
    const items = [libItem()];
    expect(projectLibraryOntoBrand(b, items)).toEqual(projectLibraryOntoBrand(b, items));
  });
});

describe('unIngestedCount — the retirement gauge', () => {
  const stored = (id: string) =>
    ({ id, kind: 'logo', name: id, formats: {}, metadata: { createdAt: 'x', version: 1 } } as BrandAsset);

  it('counts stored entries the Library has not absorbed', () => {
    expect(unIngestedCount(brand({ brandAssets: [stored('a'), stored('b')] }), [])).toBe(2);
  });

  it('counts zero once every entry is in the Library — by id or legacy ref', () => {
    const b = brand({ brandAssets: [stored('a'), stored('b')] });
    const lib = [libItem({ id: 'a' }), libItem({ id: 'uuid-x', legacyRefId: 'b' })];
    expect(unIngestedCount(b, lib)).toBe(0);
  });
});

describe('CodeRabbit #24 — a deleted asset must stop rendering', () => {
  const stored = (id: string) =>
    ({ id, kind: 'logo', name: id, formats: { svg: { url: 'u', size: 1 } }, metadata: { createdAt: 'x', version: 1 } } as BrandAsset);

  it('subtracts a stored entry whose id was tombstoned', () => {
    const projected = projectLibraryOntoBrand(
      brand({ brandAssets: [stored('lib_1')] }),
      [libItem({ id: 'lib_1', deletedAt: new Date(), url: '' })],
    );
    expect(projected.brandAssets).toEqual([]);
  });

  it('subtracts a stored entry matched by the tombstone\'s legacyRefId', () => {
    // The ingest case: the Library row has a new uuid, the stored array still
    // carries the old id. Deleting must remove BOTH aliases.
    const projected = projectLibraryOntoBrand(
      brand({ brandAssets: [stored('old_1')] }),
      [libItem({ id: 'uuid-x', legacyRefId: 'old_1', deletedAt: new Date(), url: '' })],
    );
    expect(projected.brandAssets).toEqual([]);
  });

  it('leaves unrelated stored entries alone', () => {
    const projected = projectLibraryOntoBrand(
      brand({ brandAssets: [stored('keep_me'), stored('lib_1')] }),
      [libItem({ id: 'lib_1', deletedAt: new Date(), url: '' })],
    );
    expect(projected.brandAssets?.map((a) => a.id)).toEqual(['keep_me']);
  });
});

describe('CodeRabbit Round 4 #16 — an ingested item must not appear twice', () => {
  const stored = (id: string, url: string) =>
    ({ id, kind: 'logo', name: id, formats: { svg: { url, size: 1 } },
       metadata: { createdAt: 'x', version: 1 } } as BrandAsset);

  it('drops the stored entry the Library absorbed under a new id', () => {
    // Ingest preserves the legacy id where it can. When the store mints its
    // own instead, the Library copy carries the old id in `legacyRefId` — and
    // keyed by id alone the two never collide, so readers saw one asset twice.
    const projected = projectLibraryOntoBrand(
      brand({ brandAssets: [stored('old_1', 'https://cdn.test/STALE.svg')] }),
      [libItem({ id: 'uuid-x', legacyRefId: 'old_1', url: 'https://cdn.test/FRESH.svg' })],
    );
    expect(projected.brandAssets).toHaveLength(1);
    expect(projected.brandAssets?.[0].id).toBe('uuid-x');
    expect(Object.values(projected.brandAssets![0].formats)[0]?.url).toBe(
      'https://cdn.test/FRESH.svg',
    );
  });

  it('agrees with the retirement gauge — nothing un-ingested, nothing aliased', () => {
    const b = brand({ brandAssets: [stored('old_1', 'u')] });
    const lib = [libItem({ id: 'uuid-x', legacyRefId: 'old_1' })];
    expect(unIngestedCount(b, lib)).toBe(0);
    expect(projectLibraryOntoBrand(b, lib).brandAssets).toHaveLength(1);
  });

  it('still keeps a stored entry the Library has NOT absorbed', () => {
    const projected = projectLibraryOntoBrand(
      brand({ brandAssets: [stored('old_1', 'u')] }),
      [libItem({ id: 'uuid-x', legacyRefId: 'someone_else' })],
    );
    expect(projected.brandAssets?.map((a) => a.id).sort()).toEqual(['old_1', 'uuid-x']);
  });
});

describe('CodeRabbit Round 4 #15 — content identity survives the round trip', () => {
  it('projects contentHash and version back onto the BrandAsset', () => {
    // After a reload the projection is the ONLY view `stageAsset` has of an
    // existing asset. Drop these and re-uploading the same image creates a
    // duplicate, and the replacement version resets.
    const projected = assetToBrandAsset(
      libItem({ metadata: { contentHash: 'f90bbb59', version: 3 } }),
    );
    expect(projected.metadata.contentHash).toBe('f90bbb59');
    expect(projected.metadata.version).toBe(3);
  });

  it('defaults version to 1 for an item that predates the field', () => {
    expect(assetToBrandAsset(libItem()).metadata.version).toBe(1);
  });
});
