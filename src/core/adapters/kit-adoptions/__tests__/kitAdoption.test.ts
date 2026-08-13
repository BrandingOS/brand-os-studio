/**
 * Official Brand Kit adoptions.
 *
 * The Kit is the product's trust boundary — "this is officially ours" has to
 * mean something. These tests pin the three rules that give it meaning: an
 * adoption is a reference and never a copy, un-adopting never destroys
 * material, and nothing can enter the Kit except an explicit human act.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalKitAdoptionService } from '../LocalKitAdoptionService';
import { LocalAssetsService } from '@/core/adapters/database/LocalAssetsService';
import type { HumanActor } from '@/domain/brand/coreMeta';

const BRAND = 'brand_a';
const OTHER = 'brand_b';
const actor: HumanActor = { kind: 'human', userId: 'u1' };

let svc: LocalKitAdoptionService;
beforeEach(() => {
  localStorage.clear();
  svc = new LocalKitAdoptionService();
});

describe('adoption records a reference, never a copy (INV-6)', () => {
  it('stores only the pointer plus who and when', async () => {
    const row = await svc.adopt({
      brandId: BRAND,
      targetKind: 'library_item',
      targetRef: 'asset_1',
      actor,
    });

    expect(row).toMatchObject({
      brandId: BRAND,
      targetKind: 'library_item',
      targetRef: 'asset_1',
      adoptedBy: 'u1',
    });
    expect(row.adoptedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // No payload of the adopted material rode along.
    expect(Object.keys(row).sort()).toEqual(
      ['adoptedAt', 'adoptedBy', 'brandId', 'id', 'targetKind', 'targetRef'].sort(),
    );
  });

  it('records the adopting human, not the system', async () => {
    const row = await svc.adopt({
      brandId: BRAND, targetKind: 'kit_deliverable', targetRef: 'stationery::Business Card', actor,
    });
    expect(row.adoptedBy).toBe('u1');
  });

  it('adopting twice is idempotent, not an error', async () => {
    const a = await svc.adopt({ brandId: BRAND, targetKind: 'library_item', targetRef: 'x', actor });
    const b = await svc.adopt({ brandId: BRAND, targetKind: 'library_item', targetRef: 'x', actor });
    expect(b.id).toBe(a.id);
    expect(await svc.list(BRAND)).toHaveLength(1);
  });
});

describe('nothing enters the Kit automatically (INV-9)', () => {
  it('a brand starts with an empty Kit', async () => {
    expect(await svc.list(BRAND)).toEqual([]);
  });

  it('creating Library material does NOT adopt it', async () => {
    const assets = new LocalAssetsService();
    await assets.create({
      brandId: BRAND, name: 'generated.png', type: 'image', category: 'photo',
      url: 'data:image/png;base64,X', origin: 'generated',
    });
    expect(await svc.list(BRAND)).toEqual([]);
  });
});

describe('core values have ONE entry point (INV-8)', () => {
  it('rejects a direct core_value adoption', async () => {
    await expect(
      svc.adopt({ brandId: BRAND, targetKind: 'core_value', targetRef: 'colors.primary', actor }),
    ).rejects.toThrow(/promoteCoreValue/);
  });

  it('accepts it when it comes through the promotion op', async () => {
    const row = await svc.adopt({
      brandId: BRAND,
      targetKind: 'core_value',
      targetRef: 'colors.primary',
      actor,
      viaCorePromotion: true,
    });
    expect(row.targetRef).toBe('colors.primary');
  });
});

describe('un-adopting removes only the record (INV-7)', () => {
  it('leaves the Library item completely intact', async () => {
    const assets = new LocalAssetsService();
    const item = await assets.create({
      brandId: BRAND, name: 'logo.svg', type: 'logo', category: 'logo',
      url: 'data:image/svg+xml,LOGO',
    });
    await svc.adopt({ brandId: BRAND, targetKind: 'library_item', targetRef: item.id, actor });

    await svc.unadopt(BRAND, 'library_item', item.id);

    expect(await svc.isAdopted(BRAND, 'library_item', item.id)).toBe(false);
    const still = await assets.getById(item.id);
    expect(still).not.toBeNull();
    expect(still?.deletedAt).toBeNull();
    expect(still?.url).toBe('data:image/svg+xml,LOGO');
  });

  it('un-adopting something that was never adopted is a no-op', async () => {
    await expect(svc.unadopt(BRAND, 'library_item', 'ghost')).resolves.toBeUndefined();
  });
});

describe('scoping', () => {
  it('adoptions are per brand', async () => {
    await svc.adopt({ brandId: BRAND, targetKind: 'library_item', targetRef: 'x', actor });
    expect(await svc.list(BRAND)).toHaveLength(1);
    expect(await svc.list(OTHER)).toHaveLength(0);
    expect(await svc.isAdopted(OTHER, 'library_item', 'x')).toBe(false);
  });

  it('the same ref under different kinds are different adoptions', async () => {
    await svc.adopt({ brandId: BRAND, targetKind: 'library_item', targetRef: 'x', actor });
    await svc.adopt({ brandId: BRAND, targetKind: 'kit_deliverable', targetRef: 'x', actor });
    expect(await svc.list(BRAND)).toHaveLength(2);
  });
});

describe('the Library consults adoptions before deleting', () => {
  it('an adopted item cannot be deleted without telling the user first', async () => {
    const assets = new LocalAssetsService({ adoptions: svc });
    const item = await assets.create({
      brandId: BRAND, name: 'official.svg', type: 'logo', category: 'logo',
      url: 'data:image/svg+xml,OFFICIAL',
    });
    await svc.adopt({ brandId: BRAND, targetKind: 'library_item', targetRef: item.id, actor });

    const outcome = await assets.softDelete(item.id);

    expect(outcome).toMatchObject({ ok: false, reason: 'adopted' });
    expect((await assets.getById(item.id))?.deletedAt).toBeNull();
  });

  it('once un-adopted, the same delete succeeds', async () => {
    const assets = new LocalAssetsService({ adoptions: svc });
    const item = await assets.create({
      brandId: BRAND, name: 'official.svg', type: 'logo', category: 'logo',
      url: 'data:image/svg+xml,OFFICIAL',
    });
    await svc.adopt({ brandId: BRAND, targetKind: 'library_item', targetRef: item.id, actor });
    await svc.unadopt(BRAND, 'library_item', item.id);

    expect(await assets.softDelete(item.id)).toEqual({ ok: true });
  });
});

describe('CodeRabbit Round 2 #7 — a second adopter never rewrites the first', () => {
  it('returns the ORIGINAL row, keeping its adopter, timestamp and note', async () => {
    const first = await svc.adopt({
      brandId: BRAND,
      targetKind: 'library_item',
      targetRef: 'asset_1',
      actor: { kind: 'human', userId: 'alice' },
      note: 'the launch mark',
    });

    const second = await svc.adopt({
      brandId: BRAND,
      targetKind: 'library_item',
      targetRef: 'asset_1',
      actor: { kind: 'human', userId: 'bob' },
      note: 'bob was here',
    });

    // Adopting twice is not an error, and it is not a second decision either.
    expect(second).toEqual(first);
    expect(second.adoptedBy).toBe('alice');
    expect(second.note).toBe('the launch mark');
    expect(await svc.list(BRAND)).toHaveLength(1);
  });

  it('the Supabase adapter is written to agree — it reads before it inserts', async () => {
    // Guards the divergence that made this a finding: the Supabase path used an
    // upsert whose conflict branch is an UPDATE, and migration 017 grants no
    // UPDATE policy on adoptions, so a second adopter got an RLS error where
    // the local path returned the existing row.
    const source = await import('fs/promises').then((fs) =>
      fs.readFile('src/core/adapters/kit-adoptions/SupabaseKitAdoptionService.ts', 'utf8'),
    );
    expect(source).not.toMatch(/\.upsert\(/);
    expect(source).toMatch(/maybeSingle\(\)[\s\S]*if \(!existing\.error && existing\.data\)/);
  });
});
