import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createBrandResilient, isDuplicateSlugError } from './createBrand';
import { useBrandStore } from '@/shared/store/brandStore';
import { brandsService } from '@/features/brand/services/brands.local';

describe('isDuplicateSlugError', () => {
  it('matches Postgres unique-violation shapes', () => {
    expect(isDuplicateSlugError({ code: '23505' })).toBe(true);
    expect(isDuplicateSlugError({ message: 'duplicate key value violates unique constraint "brands_slug_unique"' })).toBe(true);
    expect(isDuplicateSlugError(new Error('network down'))).toBe(false);
    expect(isDuplicateSlugError(null)).toBe(false);
  });
});

describe('createBrandResilient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries with a suffixed NAME on duplicate-slug errors', async () => {
    const create = vi
      .fn()
      .mockRejectedValueOnce({ code: '23505' })
      .mockRejectedValueOnce({ code: '23505' })
      .mockImplementation(async (input: { name: string }) => ({ id: 'b1', slug: 'x', name: input.name }));
    vi.spyOn(useBrandStore, 'getState').mockReturnValue({ create } as never);

    const brand = await createBrandResilient({ name: 'Kaafex' });
    expect(create).toHaveBeenCalledTimes(3);
    // 3rd attempt carries " 3" (attempt index 2 → suffix attempt+2)
    expect(create.mock.calls[2][0].name).toBe('Kaafex 3');
    expect(brand).toBeTruthy();
  });

  it('re-throws non-slug errors immediately', async () => {
    const boom = new Error('RLS says no');
    const create = vi.fn().mockRejectedValue(boom);
    vi.spyOn(useBrandStore, 'getState').mockReturnValue({ create } as never);
    await expect(createBrandResilient({ name: 'X' })).rejects.toBe(boom);
    expect(create).toHaveBeenCalledTimes(1);
  });
});

describe('LocalBrandsService slug uniquification', () => {
  beforeEach(() => {
    localStorage.removeItem('brandos:brands');
  });

  it('two brands with the same name get distinct slugs', async () => {
    const input = { name: 'QA Slug Brand', primaryColor: '#112233' } as never;
    const first = await brandsService.create(input);
    const second = await brandsService.create(input);
    expect(first.slug).toBe('qa-slug-brand');
    expect(second.slug).toBe('qa-slug-brand-2');
    localStorage.removeItem('brandos:brands');
  });
});
