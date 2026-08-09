/**
 * Batch A2 — Typography-family slice, real chain.
 */
import { describe, it, expect } from 'vitest';
import type { Brand } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { brandTokenStyle } from '@/shared/design-system/PresentationStyleAdapter';
import { BrandServiceRepository } from '@/platform/brand/BrandServiceRepository';
import { changeBrandTypographyFamilies } from '../changeBrandTypography';

function svc(seed: Brand): IBrandsService {
  let stored = seed;
  return {
    list: async () => [stored],
    getById: async () => migrateBrandToCurrent(stored),
    getBySlug: async () => migrateBrandToCurrent(stored),
    create: async () => stored,
    update: async (_id, patch) => { stored = { ...stored, ...patch }; return migrateBrandToCurrent(stored); },
    delete: async () => {},
  };
}

function seed(): Brand {
  return {
    id: 'b1', slug: 'acme', name: 'Acme', schemaVersion: 3,
    primaryColor: '#111111', fonts: { primary: 'Inter' }, tone: 't', audience: 'a', assets: [],
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-02'),
  } as Brand;
}

describe('Typography family — real chain', () => {
  it('edit → persist → reload keeps the new family; legacy fonts stay in sync one-way', async () => {
    const service = svc(seed());
    const repo = new BrandServiceRepository(service);
    await changeBrandTypographyFamilies(repo, 'b1', { primary: 'Satoshi', secondary: 'Georgia' });

    const reloaded = await service.getById('b1');
    expect(reloaded!.typography?.primary?.family).toBe('Satoshi');
    expect(reloaded!.fonts?.primary).toBe('Satoshi'); // one-way legacy projection
    expect(reloaded!.typography?.secondary?.family).toBe('Georgia');
  });

  it('the paint-path reader (brandTokenStyle) reflects the canonical family', async () => {
    const service = svc(seed());
    const repo = new BrandServiceRepository(service);
    await changeBrandTypographyFamilies(repo, 'b1', { primary: 'Satoshi' });
    const vars = brandTokenStyle(await service.getById('b1'));
    expect(vars['--brand-font-heading']).toContain('Satoshi');
  });
});
