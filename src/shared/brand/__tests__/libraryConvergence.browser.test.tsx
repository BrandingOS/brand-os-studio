/**
 * One Library, proven in a real browser.
 *
 * The claim under test is the one a user would notice: material saved from any
 * surface lands in the same Library AND is immediately resolvable through the
 * synchronous readers — `brand.brandAssets.find(...)`, the lookup ~34 modules
 * (including every logo render) still perform.
 *
 * That combination is the whole point of the projection. Writing to the Library
 * while the readers kept looking at a stale array would have been a silent
 * regression: logos simply stop appearing.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { container } from '@/core/container/ServiceContainer';
import { bootServices } from '@/core/boot';
import { useBrandStore } from '@/shared/store/brandStore';
import { projectLibraryOntoBrand } from '@/shared/brand/libraryProjection';
import { ingestBrandLibrary } from '@/application/brand/migrateLibrary';
import { SERVICE_KEYS, type IAssetsService, type IBrandsService } from '@/core/types/services';
import type { Brand } from '@/shared/types/brand';
import type { BrandAsset } from '@/shared/types/brandAssets';

const BRAND_ID = 'brand_lib_conv';

function seedBrand(over: Partial<Brand> = {}): Brand {
  return {
    id: BRAND_ID,
    slug: 'lib-conv',
    name: 'Lib Conv',
    schemaVersion: 3,
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

/** Registers a brands service backed by one mutable row. */
function installBrand(row: Brand) {
  let stored = row;
  container.register(SERVICE_KEYS.BRANDS, () => ({
    list: async () => [stored],
    getById: async (id: string) => (id === stored.id ? stored : null),
    getBySlug: async (slug: string) => (slug === stored.slug ? stored : null),
    create: async () => stored,
    update: async (_id: string, patch: Partial<Brand>) => {
      stored = { ...stored, ...patch, updatedAt: new Date() };
      return stored;
    },
    delete: async () => {},
  }) as IBrandsService);
  return () => stored;
}

/** The lookup useBrandLogo (and 33 others) perform. */
function resolveRef(brand: Brand | undefined, assetId: string): BrandAsset | undefined {
  return brand?.brandAssets?.find((a) => a.id === assetId);
}

beforeEach(() => {
  localStorage.clear();
  container.clear();
  bootServices();
  useBrandStore.setState({ list: [], current: undefined });
});

afterEach(() => {
  cleanup();
  container.clear();
  useBrandStore.setState({ list: [], current: undefined });
});

describe('uploads from any surface land in one Library', () => {
  it('an editor-style upload and a Setup-style upload share the same store', async () => {
    installBrand(seedBrand());
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);

    await assets.create({
      brandId: BRAND_ID, name: 'from-editor.png', type: 'image', category: 'photo',
      url: 'data:image/png;base64,AAA', origin: 'uploaded',
    });
    await assets.create({
      brandId: BRAND_ID, name: 'from-setup.svg', type: 'logo', category: 'logo',
      url: 'data:image/svg+xml,BBB', origin: 'uploaded',
    });

    const lib = await assets.listLibrary(BRAND_ID);
    expect(lib.map((a) => a.name).sort()).toEqual(['from-editor.png', 'from-setup.svg']);
    expect(lib.every((a) => a.origin === 'uploaded')).toBe(true);
  });
});

describe('the projection keeps the synchronous readers working', () => {
  it('a Library upload is resolvable through brandAssets after hydration', async () => {
    installBrand(seedBrand({ logoSystem: { primary: { assetId: 'logo_1' } } }));
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);

    // Nothing in the Library yet — the ref does not resolve.
    await useBrandStore.getState().loadById(BRAND_ID);
    expect(resolveRef(useBrandStore.getState().current, 'logo_1')).toBeUndefined();

    await assets.create({
      brandId: BRAND_ID, id: 'logo_1', name: 'mark.svg', type: 'logo', category: 'logo',
      url: 'data:image/svg+xml,MARK', origin: 'uploaded',
    });

    await useBrandStore.getState().loadById(BRAND_ID);
    const hit = resolveRef(useBrandStore.getState().current, 'logo_1');
    expect(hit).toBeTruthy();
    expect(Object.values(hit!.formats)[0]?.url).toBe('data:image/svg+xml,MARK');
  });

  it('reprojectLibrary surfaces a new upload with no reload', async () => {
    installBrand(seedBrand());
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    await useBrandStore.getState().loadById(BRAND_ID);
    expect(useBrandStore.getState().current?.brandAssets ?? []).toHaveLength(0);

    await assets.create({
      brandId: BRAND_ID, id: 'fresh_1', name: 'fresh.png', type: 'image', category: 'photo',
      url: 'data:image/png;base64,FRESH', origin: 'uploaded',
    });
    await useBrandStore.getState().reprojectLibrary(BRAND_ID);

    expect(resolveRef(useBrandStore.getState().current, 'fresh_1')).toBeTruthy();
  });

  it('a tombstoned item stops resolving in renders', async () => {
    installBrand(seedBrand());
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    const a = await assets.create({
      brandId: BRAND_ID, id: 'gone_1', name: 'gone.png', type: 'image', category: 'photo',
      url: 'data:image/png;base64,GONE', origin: 'uploaded',
    });
    await useBrandStore.getState().loadById(BRAND_ID);
    expect(resolveRef(useBrandStore.getState().current, 'gone_1')).toBeTruthy();

    await assets.softDelete(a.id);
    await useBrandStore.getState().reprojectLibrary(BRAND_ID);
    expect(resolveRef(useBrandStore.getState().current, 'gone_1')).toBeUndefined();
    // …but lineage still resolves it.
    expect(await assets.getById('gone_1')).not.toBeNull();
  });
});

describe('the projection is read-only', () => {
  it('brandAssets in an update patch is ignored, never persisted', async () => {
    const current = installBrand(seedBrand());
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    await assets.create({
      brandId: BRAND_ID, id: 'lib_1', name: 'real.png', type: 'image', category: 'photo',
      url: 'data:image/png;base64,REAL', origin: 'uploaded',
    });
    await useBrandStore.getState().loadById(BRAND_ID);

    // A caller tries to write the projection back — the classic way a derived
    // view becomes a second source of truth.
    await useBrandStore.getState().update(BRAND_ID, {
      name: 'Renamed',
      brandAssets: [{ id: 'injected', kind: 'logo', name: 'INJECTED', formats: {}, metadata: { createdAt: 'x', version: 1 } }],
    } as Partial<Brand>);

    // The legitimate field landed…
    expect(current().name).toBe('Renamed');
    // …the projection did NOT.
    expect((current().brandAssets ?? []).some((a) => a.id === 'injected')).toBe(false);
    expect(resolveRef(useBrandStore.getState().current, 'injected')).toBeUndefined();
    expect(resolveRef(useBrandStore.getState().current, 'lib_1')).toBeTruthy();
  });
});

describe('ingest + projection together', () => {
  it('a legacy brand keeps rendering its logo, then serves it from the Library', async () => {
    const legacyBrandAsset: BrandAsset = {
      id: 'legacy_logo',
      kind: 'logo',
      name: 'legacy.svg',
      formats: { svg: { url: 'data:image/svg+xml,LEGACY', size: 10 } },
      metadata: { createdAt: '2026-01-01T00:00:00.000Z', version: 1 },
    };
    const brand = seedBrand({
      brandAssets: [legacyBrandAsset],
      logoSystem: { primary: { assetId: 'legacy_logo' } },
    });
    installBrand(brand);
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);

    // Before ingest: the stored array still serves the reader.
    await useBrandStore.getState().loadById(BRAND_ID);
    expect(resolveRef(useBrandStore.getState().current, 'legacy_logo')).toBeTruthy();

    const report = await ingestBrandLibrary(brand, assets);
    expect(report.created).toBe(1);
    expect(report.logoRewrites).toEqual([]);      // id preserved → no rewrite
    expect(report.unresolvedLogoSlots).toEqual([]);

    // After ingest: still resolves, now from the Library.
    await useBrandStore.getState().loadById(BRAND_ID);
    expect(resolveRef(useBrandStore.getState().current, 'legacy_logo')).toBeTruthy();
    expect((await assets.listLibrary(BRAND_ID)).map((a) => a.legacyRefId)).toEqual(['legacy_logo']);
  });

  it('projection is reconstructible from the Library alone', async () => {
    installBrand(seedBrand());
    const assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
    await assets.create({
      brandId: BRAND_ID, id: 'x1', name: 'x.png', type: 'image', category: 'photo',
      url: 'data:image/png;base64,X', origin: 'uploaded',
    });

    const items = await assets.listForBrand(BRAND_ID);
    const a = projectLibraryOntoBrand(seedBrand(), items);
    const b = projectLibraryOntoBrand(seedBrand(), items);
    expect(a.brandAssets).toEqual(b.brandAssets);
    expect(a.brandAssets?.[0].id).toBe('x1');
  });
});
