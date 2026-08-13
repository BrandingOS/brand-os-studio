/**
 * The Official Brand Kit, end to end in a real browser, against the REAL
 * services rather than hand-made fakes.
 *
 * The user-visible claim: generated material is NOT official until someone
 * says so, saying so is attributed, and un-saying it never destroys anything.
 * Plus the rule that makes it coherent — a Core value can only become official
 * through the promotion op, so there is exactly one road to "officially ours".
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { container } from '@/core/container/ServiceContainer';
import { bootServices } from '@/core/boot';
import { SERVICE_KEYS, type IAssetsService, type IBrandsService } from '@/core/types/services';
import type { IKitAdoptionService } from '@/core/services/IKitAdoptionService';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { promoteCoreValue, demoteCoreValue } from '@/application/brand/promoteCoreValue';
import { coreValueMeta, type HumanActor } from '@/domain/brand';
import type { Brand } from '@/shared/types/brand';

const BRAND_ID = '22222222-2222-2222-2222-222222222222';
const actor: HumanActor = { kind: 'human', userId: 'u1' };

function seed(): Brand {
  return {
    id: BRAND_ID,
    slug: 'kit-e2e',
    name: 'Kit E2E',
    schemaVersion: 3,
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: 'friendly',
    audience: '',
    assets: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Brand;
}

function installBrand() {
  let stored = seed();
  container.register(SERVICE_KEYS.BRANDS, () => ({
    list: async () => [stored],
    getById: async (id: string) => (id === stored.id ? stored : null),
    getBySlug: async (s: string) => (s === stored.slug ? stored : null),
    create: async () => stored,
    update: async (_id: string, patch: Partial<Brand>) => {
      stored = { ...stored, ...patch, updatedAt: new Date() };
      return stored;
    },
    delete: async () => {},
  }) as IBrandsService);
  return () => stored;
}

let adoptions: IKitAdoptionService;
let assets: IAssetsService;
let repo: BrandServiceRepository;

beforeEach(() => {
  localStorage.clear();
  container.clear();
  bootServices();
  installBrand();
  adoptions = container.get<IKitAdoptionService>(SERVICE_KEYS.KIT_ADOPTIONS);
  assets = container.get<IAssetsService>(SERVICE_KEYS.ASSETS);
  repo = new BrandServiceRepository(container.get<IBrandsService>(SERVICE_KEYS.BRANDS));
});

afterEach(() => {
  cleanup();
  container.clear();
});

describe('generated material is not official until someone says so', () => {
  it('a generated asset exists in the Library but not in the Kit', async () => {
    const item = await assets.create({
      brandId: BRAND_ID, name: 'ai-mark.png', type: 'image', category: 'logo',
      url: 'data:image/png;base64,AI', origin: 'generated',
    });

    expect((await assets.listLibrary(BRAND_ID)).map((a) => a.id)).toEqual([item.id]);
    expect(await adoptions.list(BRAND_ID)).toEqual([]);
    expect(await adoptions.isAdopted(BRAND_ID, 'library_item', item.id)).toBe(false);
  });

  it('promoting it is explicit and attributed', async () => {
    const item = await assets.create({
      brandId: BRAND_ID, name: 'ai-mark.png', type: 'image', category: 'logo',
      url: 'data:image/png;base64,AI', origin: 'generated',
    });

    await adoptions.adopt({
      brandId: BRAND_ID, targetKind: 'library_item', targetRef: item.id, actor,
    });

    const kit = await adoptions.list(BRAND_ID);
    expect(kit).toHaveLength(1);
    expect(kit[0]).toMatchObject({ targetRef: item.id, adoptedBy: 'u1' });
    expect(kit[0].adoptedAt).toBeTruthy();
  });

  it('un-adopting leaves the material completely intact', async () => {
    const item = await assets.create({
      brandId: BRAND_ID, name: 'ai-mark.png', type: 'image', category: 'logo',
      url: 'data:image/png;base64,AI', origin: 'generated',
    });
    await adoptions.adopt({ brandId: BRAND_ID, targetKind: 'library_item', targetRef: item.id, actor });

    await adoptions.unadopt(BRAND_ID, 'library_item', item.id);

    expect(await adoptions.list(BRAND_ID)).toEqual([]);
    const still = await assets.getById(item.id);
    expect(still?.url).toBe('data:image/png;base64,AI');
    expect(still?.deletedAt).toBeNull();
  });
});

describe('a Core value becomes official through exactly one road', () => {
  it('promoteCoreValue writes the authority AND delegates the adoption', async () => {
    const updated = await promoteCoreValue(repo, BRAND_ID, 'colors.primary', 'official', actor, {
      adoptions,
    });

    expect(coreValueMeta(updated.identityMeta, 'colors.primary').authority).toBe('official');
    const kit = await adoptions.list(BRAND_ID);
    expect(kit).toHaveLength(1);
    expect(kit[0]).toMatchObject({ targetKind: 'core_value', targetRef: 'colors.primary' });
  });

  it('the adoption service refuses a direct core_value adoption', async () => {
    await expect(
      adoptions.adopt({
        brandId: BRAND_ID, targetKind: 'core_value', targetRef: 'colors.primary', actor,
      }),
    ).rejects.toThrow(/promoteCoreValue/);
    expect(await adoptions.list(BRAND_ID)).toEqual([]);
  });

  it('demoting removes the adoption but floors authority at confirmed', async () => {
    await promoteCoreValue(repo, BRAND_ID, 'colors.primary', 'official', actor, { adoptions });

    const after = await demoteCoreValue(repo, BRAND_ID, 'colors.primary', 'provisional', actor, {
      adoptions,
    });

    // Un-adopting is not un-deciding: a human had confirmed this value.
    expect(coreValueMeta(after.identityMeta, 'colors.primary').authority).toBe('confirmed');
    expect(await adoptions.list(BRAND_ID)).toEqual([]);
  });

  it('promotion preserves provenance end to end', async () => {
    const updated = await promoteCoreValue(repo, BRAND_ID, 'voice.tone', 'official', actor, {
      adoptions,
    });
    // Nothing rewrote where the value came from.
    expect(coreValueMeta(updated.identityMeta, 'voice.tone').provenance).toBeTruthy();
    expect(coreValueMeta(updated.identityMeta, 'voice.tone').promotedBy).toBe('u1');
  });
});

describe('the Kit protects what it owns', () => {
  it('an adopted Library item cannot be deleted without informing the user', async () => {
    const item = await assets.create({
      brandId: BRAND_ID, name: 'official.svg', type: 'logo', category: 'logo',
      url: 'data:image/svg+xml,OFFICIAL',
    });
    await adoptions.adopt({ brandId: BRAND_ID, targetKind: 'library_item', targetRef: item.id, actor });

    const outcome = await assets.softDelete(item.id);

    expect(outcome).toMatchObject({ ok: false, reason: 'adopted' });
    expect((await assets.getById(item.id))?.deletedAt).toBeNull();
  });
});
