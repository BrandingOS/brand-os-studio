/**
 * Visual style writes.
 *
 * The case worth pinning: a partial patch carrying an explicit `undefined`.
 * A spread treats that as "set to nothing" while the metadata pass treats it as
 * "not touched" — so a stored attribute could be erased with no record of who
 * erased it, which is precisely the accountability the Core metadata exists for.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { coreValueMeta } from '@/domain/brand';
import { changeBrandVisualStyle } from '../changeBrandVisualStyle';

function makeRepo() {
  let row = {
    id: 'b1',
    slug: 'acme',
    name: 'Acme',
    schemaVersion: 3,
    primaryColor: '#111111',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  } as Brand;

  const svc: Partial<IBrandsService> = {
    getById: async (id: string) => (id === row.id ? row : null),
    update: async (_id: string, patch: Partial<Brand>) => {
      row = { ...row, ...patch, updatedAt: new Date() };
      return row;
    },
  };
  return new BrandServiceRepository(svc as IBrandsService);
}

describe('changeBrandVisualStyle', () => {
  it('applies a defined attribute and stamps it', async () => {
    const repo = makeRepo();
    const out = await changeBrandVisualStyle(repo, 'b1', { density: 'airy' });
    expect(out.identity.visualStyle.density).toBe('airy');
    expect(coreValueMeta(out.identityMeta, 'visualStyle.density').authority).toBe('provisional');
  });

  it('CodeRabbit Round 2 #3 — an explicit undefined does NOT erase a stored value', async () => {
    const repo = makeRepo();
    const seeded = await changeBrandVisualStyle(repo, 'b1', {
      density: 'airy',
      cornerStyle: 'rounded',
    });
    expect(seeded.identity.visualStyle.density).toBe('airy');

    const out = await changeBrandVisualStyle(repo, 'b1', {
      cornerStyle: 'sharp',
      density: undefined,
    });

    expect(out.identity.visualStyle.cornerStyle).toBe('sharp');
    // The value survives, because nothing recorded a decision to remove it.
    expect(out.identity.visualStyle.density).toBe('airy');
  });

  it('stamps only the attributes actually written', async () => {
    const repo = makeRepo();
    const out = await changeBrandVisualStyle(repo, 'b1', {
      cornerStyle: 'sharp',
      density: undefined,
    });
    expect(out.identityMeta['visualStyle.cornerStyle']).toBeTruthy();
    expect(out.identityMeta['visualStyle.density']).toBeUndefined();
  });
});
