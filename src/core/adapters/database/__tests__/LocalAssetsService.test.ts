/**
 * LocalAssetsService — guest DAM library persistence (Batch B / B2).
 * Round-trips through localStorage and locates assets by id across brand buckets.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAssetsService } from '../LocalAssetsService';

describe('LocalAssetsService', () => {
  beforeEach(() => localStorage.clear());

  it('create → listForBrand → update → delete round-trips', async () => {
    const svc = new LocalAssetsService();
    const a = await svc.create({
      brandId: 'b1', name: 'hero.png', type: 'image', category: 'photo', url: 'https://x/hero.png', size: 123,
    });
    expect(a.id).toBeTruthy();

    let list = await svc.listForBrand('b1');
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe('hero.png');

    await svc.update(a.id, { name: 'renamed.png', tags: ['brand'] });
    expect((await svc.getById(a.id))?.name).toBe('renamed.png');
    expect((await svc.getById(a.id))?.tags).toEqual(['brand']);

    await svc.delete(a.id);
    list = await svc.listForBrand('b1');
    expect(list).toHaveLength(0);
    expect(await svc.getById(a.id)).toBeNull();
  });

  it('scopes assets per brand', async () => {
    const svc = new LocalAssetsService();
    await svc.create({ brandId: 'b1', name: 'a', type: 'image', category: 'photo', url: 'u1' });
    await svc.create({ brandId: 'b2', name: 'b', type: 'image', category: 'photo', url: 'u2' });
    expect(await svc.listForBrand('b1')).toHaveLength(1);
    expect(await svc.listForBrand('b2')).toHaveLength(1);
  });
});
