import { beforeEach, describe, expect, it } from 'vitest';
import { LocalBrandsService } from './brands.local';
import { raqmBrand } from '@/data/brands/raqm';

/**
 * The split between what is LISTED and what is RESOLVABLE.
 *
 * Seed brands used to be merged into `list()`, so a signed-out visitor met
 * five brands that are not this product — and could not delete any of them,
 * because `delete()` refuses by design. That is what made them the wrong
 * answer to "give people something to look at", and why the demo brand is an
 * ordinary row an account is GIVEN instead (migration 033).
 *
 * They are still resolvable by id and slug, so direct URLs, tests and dev
 * demos keep working. These tests hold that line in both directions.
 */
describe('LocalBrandsService — listed vs resolvable', () => {
  let service: LocalBrandsService;

  beforeEach(() => {
    localStorage.clear();
    service = new LocalBrandsService();
  });

  it('lists nothing for a visitor who has created nothing', async () => {
    await expect(service.list()).resolves.toEqual([]);
  });

  it('never lists a seed brand, even alongside real ones', async () => {
    await service.create({ name: 'Mine', primaryColor: '#123456' } as never);

    const listed = await service.list();
    expect(listed.map((b) => b.name)).toEqual(['Mine']);
    expect(listed.some((b) => b.id === raqmBrand.id)).toBe(false);
  });

  it('still resolves a seed brand by id — direct URLs must keep working', async () => {
    const found = await service.getById(raqmBrand.id);
    expect(found?.name).toBe(raqmBrand.name);
  });

  it('lists a brand the visitor created', async () => {
    const created = await service.create({
      name: 'Studio Nine',
      primaryColor: '#0E0E0E',
    } as never);

    const listed = await service.list();
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);
  });

  it('a deleted brand stays deleted', async () => {
    const created = await service.create({ name: 'Temp', primaryColor: '#fff' } as never);
    await service.delete(created.id);
    await expect(service.list()).resolves.toEqual([]);

    // And a fresh service reading the same storage agrees.
    await expect(new LocalBrandsService().list()).resolves.toEqual([]);
  });

  it('refuses to delete a seed brand — the reason they cannot be the demo', async () => {
    await service.delete(raqmBrand.id);
    expect(await service.getById(raqmBrand.id)).not.toBeNull();
  });
});
