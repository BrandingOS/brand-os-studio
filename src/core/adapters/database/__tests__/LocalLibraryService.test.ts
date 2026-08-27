/**
 * The Brand Library, local implementation.
 *
 * Two things carry most of the weight here: that a Library item's state
 * (folder, flags, archive) actually persists per brand, and that DELETION
 * never breaks something else. The tombstone rule exists because a user
 * clearing out old uploads must not silently corrupt a design they made last
 * month.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAssetsService } from '../LocalAssetsService';
import type { IKitAdoptionService } from '@/core/services/IKitAdoptionService';
import type { CreateAssetInput } from '@/core/types/services';

const BRAND = 'brand_a';
const OTHER = 'brand_b';

function input(over: Partial<CreateAssetInput> = {}): CreateAssetInput {
  return {
    brandId: BRAND,
    name: 'logo.svg',
    type: 'image',
    category: 'logo',
    url: 'https://example.test/logo.svg',
    ...over,
  };
}

let svc: LocalAssetsService;
beforeEach(() => {
  localStorage.clear();
  svc = new LocalAssetsService();
});

describe('creation defaults', () => {
  it('a new item is an unfiled, unflagged, uploaded Library item', async () => {
    const a = await svc.create(input());
    expect(a).toMatchObject({
      origin: 'uploaded',
      folderId: null,
      isFavorite: false,
      isDisliked: false,
      useAsReference: false,
      archivedAt: null,
      deletedAt: null,
    });
  });

  it('carries origin, provenance and legacyRefId when supplied', async () => {
    const a = await svc.create(
      input({
        origin: 'generated',
        provenance: { kind: 'generated', generatedAt: '2026-08-13T00:00:00.000Z', prompt: 'a mark' },
        legacyRefId: 'old_asset_1',
      }),
    );
    expect(a.origin).toBe('generated');
    expect(a.provenance?.prompt).toBe('a mark');
    expect(a.legacyRefId).toBe('old_asset_1');
  });
});

describe('flags', () => {
  it('favourite and dislike are mutually exclusive — the later intent wins', async () => {
    const a = await svc.create(input());
    const disliked = await svc.setFlags(a.id, { isDisliked: true });
    expect(disliked).toMatchObject({ isDisliked: true, isFavorite: false });

    const favourited = await svc.setFlags(a.id, { isFavorite: true });
    expect(favourited).toMatchObject({ isFavorite: true, isDisliked: false });
  });

  it('use-as-reference is independent of favourite/dislike', async () => {
    const a = await svc.create(input());
    await svc.setFlags(a.id, { isDisliked: true });
    const r = await svc.setFlags(a.id, { useAsReference: true });
    expect(r).toMatchObject({ useAsReference: true, isDisliked: true });
  });

  it('persists across service instances (a reload)', async () => {
    const a = await svc.create(input());
    await svc.setFlags(a.id, { isFavorite: true });
    const reloaded = await new LocalAssetsService().getById(a.id);
    expect(reloaded?.isFavorite).toBe(true);
  });
});

describe('folders', () => {
  it('creates, lists, renames, and files items into them', async () => {
    const f = await svc.createFolder({ brandId: BRAND, name: 'Logos' });
    const a = await svc.create(input());
    const filed = await svc.moveToFolder(a.id, f.id);
    expect(filed.folderId).toBe(f.id);

    const renamed = await svc.renameFolder(f.id, 'Marks');
    expect(renamed.name).toBe('Marks');
    expect(await svc.listFolders(BRAND)).toHaveLength(1);
  });

  it('rejects a duplicate name at the same level (matching the DB constraint)', async () => {
    await svc.createFolder({ brandId: BRAND, name: 'Logos' });
    await expect(svc.createFolder({ brandId: BRAND, name: 'Logos' })).rejects.toThrow(/duplicate/i);
  });

  it('allows the same name under different parents', async () => {
    const root = await svc.createFolder({ brandId: BRAND, name: 'Brand' });
    await expect(
      svc.createFolder({ brandId: BRAND, name: 'Brand', parentId: root.id }),
    ).resolves.toBeTruthy();
  });

  it('deleting a folder unfiles its items — it never deletes material', async () => {
    const f = await svc.createFolder({ brandId: BRAND, name: 'Logos' });
    const a = await svc.create(input());
    await svc.moveToFolder(a.id, f.id);

    await svc.deleteFolder(f.id);

    const still = await svc.getById(a.id);
    expect(still).not.toBeNull();
    expect(still?.folderId).toBeNull();
  });
});

describe('listLibrary filtering', () => {
  it('hides archived items by default and returns them on request', async () => {
    const a = await svc.create(input());
    await svc.archive(a.id);
    expect(await svc.listLibrary(BRAND)).toHaveLength(0);
    expect(await svc.listLibrary(BRAND, { includeArchived: true })).toHaveLength(1);

    await svc.unarchive(a.id);
    expect(await svc.listLibrary(BRAND)).toHaveLength(1);
  });

  it('filters by origin, favourite, reference, folder, search and tags', async () => {
    const f = await svc.createFolder({ brandId: BRAND, name: 'Logos' });
    const uploaded = await svc.create(input({ name: 'mark.svg', tags: ['brand'] }));
    const generated = await svc.create(input({ name: 'hero.png', origin: 'generated' }));
    await svc.setFlags(uploaded.id, { isFavorite: true, useAsReference: true });
    await svc.moveToFolder(uploaded.id, f.id);

    expect((await svc.listLibrary(BRAND, { origin: ['generated'] })).map((a) => a.id)).toEqual([generated.id]);
    expect((await svc.listLibrary(BRAND, { favorite: true })).map((a) => a.id)).toEqual([uploaded.id]);
    expect((await svc.listLibrary(BRAND, { references: true })).map((a) => a.id)).toEqual([uploaded.id]);
    expect((await svc.listLibrary(BRAND, { folderId: f.id })).map((a) => a.id)).toEqual([uploaded.id]);
    expect((await svc.listLibrary(BRAND, { folderId: null })).map((a) => a.id)).toEqual([generated.id]);
    expect((await svc.listLibrary(BRAND, { search: 'hero' })).map((a) => a.id)).toEqual([generated.id]);
    expect((await svc.listLibrary(BRAND, { tags: ['brand'] })).map((a) => a.id)).toEqual([uploaded.id]);
  });

  it('scopes strictly per brand', async () => {
    await svc.create(input());
    await svc.create(input({ brandId: OTHER, name: 'other.svg' }));
    expect(await svc.listLibrary(BRAND)).toHaveLength(1);
    expect(await svc.listLibrary(OTHER)).toHaveLength(1);
  });
});

describe('softDelete — tombstone, not erasure', () => {
  it('removes the item from every Library view but keeps it resolvable', async () => {
    const a = await svc.create(input());
    expect(await svc.softDelete(a.id)).toEqual({ ok: true });

    expect(await svc.listLibrary(BRAND)).toHaveLength(0);
    expect(await svc.listLibrary(BRAND, { includeArchived: true })).toHaveLength(0);

    // The whole point: lineage still resolves to something with a name.
    const tomb = await svc.getById(a.id);
    expect(tomb).not.toBeNull();
    expect(tomb?.name).toBe('logo.svg');
    expect(tomb?.origin).toBe('uploaded');
    expect(tomb?.deletedAt).toBeTruthy();
  });

  it('clears the material but not the identity', async () => {
    const a = await svc.create(input());
    await svc.softDelete(a.id);
    const tomb = await svc.getById(a.id);
    expect(tomb?.url).toBe('');
    expect(tomb?.id).toBe(a.id);
  });

  it('is blocked when the Official Kit has adopted the item', async () => {
    const adoptions = {
      isAdopted: async () => true,
      list: async () => [],
      adopt: async () => { throw new Error('unused'); },
      unadopt: async () => {},
    } as unknown as IKitAdoptionService;

    const withKit = new LocalAssetsService({ adoptions });
    const a = await withKit.create(input());
    const outcome = await withKit.softDelete(a.id);

    expect(outcome).toMatchObject({ ok: false, reason: 'adopted' });
    // Nothing was tombstoned — the user has not decided yet.
    expect((await withKit.getById(a.id))?.deletedAt).toBeNull();
  });

  it('is blocked when saved work references the item', async () => {
    const a = await svc.create(
      input({
        origin: 'generated',
        provenance: {
          kind: 'generated',
          generatedAt: '2026-08-13T00:00:00.000Z',
          relations: { placedInDesignIds: ['design_1'] },
        },
      }),
    );
    const outcome = await svc.softDelete(a.id);
    expect(outcome).toMatchObject({ ok: false, reason: 'referenced', workItemIds: ['design_1'] });
  });

  it('never blocks when nothing depends on the item', async () => {
    const svcWithKit = new LocalAssetsService({
      adoptions: { isAdopted: async () => false } as unknown as IKitAdoptionService,
    });
    const a = await svcWithKit.create(input());
    expect(await svcWithKit.softDelete(a.id)).toEqual({ ok: true });
  });
});

describe('legacy surface still works', () => {
  it('listForBrand round-trips and excludes tombstones', async () => {
    const a = await svc.create(input());
    await svc.create(input({ name: 'second.svg' }));
    await svc.softDelete(a.id);
    const list = await svc.listForBrand(BRAND);
    expect(list.map((x) => x.name)).toEqual(['second.svg']);
  });

  it('update still patches the original fields', async () => {
    const a = await svc.create(input());
    const updated = await svc.update(a.id, { name: 'renamed.svg', tags: ['x'] });
    expect(updated).toMatchObject({ name: 'renamed.svg', tags: ['x'] });
  });
});

describe('CodeRabbit review — regressions', () => {
  it('#23 deleting a folder removes its DESCENDANTS too, matching ON DELETE CASCADE', async () => {
    const root = await svc.createFolder({ brandId: BRAND, name: 'Root' });
    const child = await svc.createFolder({ brandId: BRAND, name: 'Child', parentId: root.id });
    const grandchild = await svc.createFolder({ brandId: BRAND, name: 'GC', parentId: child.id });
    const asset = await svc.create(input());
    await svc.moveToFolder(asset.id, grandchild.id);

    await svc.deleteFolder(root.id);

    expect(await svc.listFolders(BRAND)).toEqual([]);
    // Material is never deleted — it just becomes unfiled.
    expect((await svc.getById(asset.id))?.folderId).toBeNull();
  });

  it('#23 an unrelated sibling tree survives', async () => {
    const a = await svc.createFolder({ brandId: BRAND, name: 'A' });
    await svc.createFolder({ brandId: BRAND, name: 'A-child', parentId: a.id });
    const b = await svc.createFolder({ brandId: BRAND, name: 'B' });

    await svc.deleteFolder(a.id);

    expect((await svc.listFolders(BRAND)).map((f) => f.id)).toEqual([b.id]);
  });

  it('#22 search matches NAME only, so both adapters agree', async () => {
    await svc.create(input({ name: 'mark.svg', tags: ['hero'] }));
    // 'hero' is a tag, not part of the name — the SQL path cannot match it.
    expect(await svc.listLibrary(BRAND, { search: 'hero' })).toHaveLength(0);
    expect(await svc.listLibrary(BRAND, { tags: ['hero'] })).toHaveLength(1);
    expect(await svc.listLibrary(BRAND, { search: 'mark' })).toHaveLength(1);
  });

  it('#19/#24 includeDeleted surfaces tombstones for the callers that need them', async () => {
    const a = await svc.create(input());
    await svc.softDelete(a.id);

    expect(await svc.listLibrary(BRAND)).toHaveLength(0);
    const withTombs = await svc.listLibrary(BRAND, { includeDeleted: true, includeArchived: true });
    expect(withTombs.map((x) => x.id)).toEqual([a.id]);
    expect(withTombs[0].deletedAt).toBeTruthy();
  });
});

describe('listLibraryForBrands (batched)', () => {
  it('groups by brand and omits empty brands', async () => {
    const a = await svc.create(input({ name: 'one' }));
    await svc.create(input({ name: 'two' }));
    await svc.create(input({ brandId: OTHER, name: 'theirs' }));
    const grouped = await svc.listLibraryForBrands([BRAND, 'brand-none']);
    expect(grouped.get(BRAND)?.length).toBe(2);
    expect(grouped.has('brand-none')).toBe(false);
    expect(grouped.has(OTHER)).toBe(false); // only asked-for brands come back
    expect(grouped.get(BRAND)?.some((x) => x.id === a.id)).toBe(true);
  });
});
