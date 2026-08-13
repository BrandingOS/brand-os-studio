/**
 * The legacy asset ingest.
 *
 * This is the one step in the Library convergence that could actually lose
 * something, so the tests are written around the ways it could: running it
 * twice, running it on a brand whose logos point into the old array, and
 * running it at all without being sure first.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAssetsService } from '@/core/adapters/database/LocalAssetsService';
import type { Brand } from '@/shared/types/brand';
import type { BrandAsset } from '@/shared/types/brandAssets';
import { ingestBrandLibrary, formatIngestReport } from '../migrateLibrary';

const BRAND_ID = 'brand_1786308941230';

function brandAsset(id: string, over: Partial<BrandAsset> = {}): BrandAsset {
  return {
    id,
    kind: 'logo',
    name: `${id}.svg`,
    formats: {
      svg: { url: `https://cdn.test/${id}.svg`, size: 100 },
      png: { url: `https://cdn.test/${id}.png`, size: 900 },
    },
    metadata: { createdAt: '2026-01-01T00:00:00.000Z', version: 1 },
    ...over,
  } as BrandAsset;
}

function makeBrand(over: Partial<Brand> = {}): Brand {
  return {
    id: BRAND_ID,
    slug: 'acme',
    name: 'Acme',
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...over,
  } as Brand;
}

let svc: LocalAssetsService;
beforeEach(() => {
  localStorage.clear();
  svc = new LocalAssetsService();
});

describe('dry run', () => {
  it('writes NOTHING but reports what it would do', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1'), brandAsset('a_2')] });

    const report = await ingestBrandLibrary(brand, svc, { dryRun: true });

    expect(report.dryRun).toBe(true);
    expect(report.created).toBe(2);
    expect(await svc.listForBrand(BRAND_ID)).toHaveLength(0);
    expect(report.brandPatch).toEqual({});
  });

  it('predicts the same item count the real run creates', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1')], assets: [
      { id: 'legacy_1', name: 'photo.png', type: 'image', category: 'photo', source: 'upload',
        url: 'https://cdn.test/photo.png', size: 10, tags: [], createdAt: new Date() },
    ] });

    const dry = await ingestBrandLibrary(brand, svc, { dryRun: true });
    const real = await ingestBrandLibrary(brand, svc);

    expect(dry.created).toBe(real.created);
    expect(dry.created).toBe(2);
  });
});

describe('ingest', () => {
  it('moves both legacy arrays into the Library', async () => {
    const brand = makeBrand({
      brandAssets: [brandAsset('a_1')],
      assets: [
        { id: 'legacy_1', name: 'photo.png', type: 'image', category: 'photo', source: 'upload',
          url: 'https://cdn.test/photo.png', size: 10, tags: ['x'], createdAt: new Date() },
      ],
    });

    const report = await ingestBrandLibrary(brand, svc);

    expect(report.created).toBe(2);
    const lib = await svc.listForBrand(BRAND_ID);
    expect(lib.map((a) => a.name).sort()).toEqual(['a_1.svg', 'photo.png']);
    expect(report.items.map((i) => i.source).sort()).toEqual(['assets[]', 'brandAssets[]']);
  });

  it('prefers svg over png when a BrandAsset has several formats', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1')] });
    await ingestBrandLibrary(brand, svc);
    const [item] = await svc.listForBrand(BRAND_ID);
    expect(item.url).toBe('https://cdn.test/a_1.svg');
  });

  it('records legacyRefId on every ingested item', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1')] });
    await ingestBrandLibrary(brand, svc);
    const [item] = await svc.listForBrand(BRAND_ID);
    expect(item.legacyRefId).toBe('a_1');
  });

  it('skips an asset with no usable url instead of creating a broken item', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1', { formats: {} })] });
    const report = await ingestBrandLibrary(brand, svc);
    expect(report.created).toBe(0);
    expect(report.items[0].skippedReason).toBe('no-url');
    expect(await svc.listForBrand(BRAND_ID)).toHaveLength(0);
  });

  it('NEVER touches the legacy arrays', async () => {
    const brandAssets = [brandAsset('a_1')];
    const assets = [
      { id: 'legacy_1', name: 'p.png', type: 'image' as const, category: 'photo' as const,
        source: 'upload' as const, url: 'https://cdn.test/p.png', size: 1, tags: [], createdAt: new Date() },
    ];
    const brand = makeBrand({ brandAssets, assets });

    await ingestBrandLibrary(brand, svc);

    expect(brand.brandAssets).toHaveLength(1);
    expect(brand.assets).toHaveLength(1);
    expect(brandAssets[0].id).toBe('a_1');
  });
});

describe('idempotency', () => {
  it('running twice produces the same Library as running once', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1'), brandAsset('a_2')] });

    const first = await ingestBrandLibrary(brand, svc);
    const after1 = await svc.listForBrand(BRAND_ID);
    const second = await ingestBrandLibrary(brand, svc);
    const after2 = await svc.listForBrand(BRAND_ID);

    expect(first.created).toBe(2);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(2);
    expect(after2).toHaveLength(after1.length);
    expect(after2.map((a) => a.id).sort()).toEqual(after1.map((a) => a.id).sort());
  });

  it('a third run still changes nothing', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1')] });
    await ingestBrandLibrary(brand, svc);
    await ingestBrandLibrary(brand, svc);
    const third = await ingestBrandLibrary(brand, svc);
    expect(third.created).toBe(0);
    expect(await svc.listForBrand(BRAND_ID)).toHaveLength(1);
  });

  it('reports already-ingested items with the id they landed on', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1')] });
    await ingestBrandLibrary(brand, svc);
    const second = await ingestBrandLibrary(brand, svc);
    expect(second.items[0]).toMatchObject({
      skippedReason: 'already-ingested',
      resolvedId: 'a_1',
      idPreserved: true,
    });
  });
});

describe('id preservation and logoSystem', () => {
  it('preserves the legacy id, so logo refs need NO rewrite at all', async () => {
    const brand = makeBrand({
      brandAssets: [brandAsset('a_1')],
      logoSystem: { primary: { assetId: 'a_1' } },
    });

    const report = await ingestBrandLibrary(brand, svc);

    expect(report.items[0].idPreserved).toBe(true);
    expect(report.logoRewrites).toEqual([]);
    expect(report.brandPatch).toEqual({});
    // The original ref still resolves.
    expect(await svc.getById('a_1')).not.toBeNull();
  });

  it('every logo slot resolves after ingest', async () => {
    const brand = makeBrand({
      brandAssets: [brandAsset('a_1'), brandAsset('a_2'), brandAsset('a_3'), brandAsset('a_4')],
      logoSystem: {
        primary: { assetId: 'a_1' },
        wordmark: { assetId: 'a_2' },
        mono: { black: { assetId: 'a_3' } },
        orientations: { horizontal: { assetId: 'a_4' } },
      },
    });

    const report = await ingestBrandLibrary(brand, svc);
    expect(report.unresolvedLogoSlots).toEqual([]);
  });

  it('REPORTS a slot pointing at an asset that was never ingested', async () => {
    // The failure mode worth catching: a logo referencing something that is not
    // in either legacy array. Silence here would mean a user finds it instead.
    const brand = makeBrand({
      brandAssets: [brandAsset('a_1')],
      logoSystem: { primary: { assetId: 'a_1' }, wordmark: { assetId: 'ghost' } },
    });

    const report = await ingestBrandLibrary(brand, svc);
    expect(report.unresolvedLogoSlots).toEqual(['wordmark']);
  });

  it('rewrites a ref when the store could not preserve the id, and the patch is the caller\'s to persist', async () => {
    // Simulates the Supabase case: the store mints its own id.
    const mintingSvc = new LocalAssetsService();
    const original = mintingSvc.create.bind(mintingSvc);
    mintingSvc.create = ((input) => original({ ...input, id: undefined })) as typeof mintingSvc.create;

    const brand = makeBrand({
      brandAssets: [brandAsset('a_1')],
      logoSystem: { primary: { assetId: 'a_1' } },
    });

    const report = await ingestBrandLibrary(brand, mintingSvc);

    expect(report.items[0].idPreserved).toBe(false);
    expect(report.logoRewrites).toHaveLength(1);
    expect(report.logoRewrites[0]).toMatchObject({ slot: 'primary', fromAssetId: 'a_1' });
    expect(report.brandPatch.logoSystem?.primary?.assetId).toBe(report.logoRewrites[0].toAssetId);
    expect(report.unresolvedLogoSlots).toEqual([]);
    // The ingest does not write the brand — the caller owns that.
    expect(brand.logoSystem?.primary?.assetId).toBe('a_1');
  });
});

describe('report formatting', () => {
  it('summarises a clean run', async () => {
    const brand = makeBrand({ brandAssets: [brandAsset('a_1')] });
    const line = formatIngestReport(await ingestBrandLibrary(brand, svc, { dryRun: true }));
    expect(line).toContain('DRY RUN');
    expect(line).toContain('1 created');
    expect(line).toContain('no logo rewrites needed');
  });

  it('shouts about unresolved slots', async () => {
    const brand = makeBrand({
      brandAssets: [],
      logoSystem: { primary: { assetId: 'ghost' } },
    });
    const line = formatIngestReport(await ingestBrandLibrary(brand, svc));
    expect(line).toContain('UNRESOLVED SLOTS: primary');
  });
});
