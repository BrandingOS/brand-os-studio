/**
 * BrandServiceRepository (Stage 2D) — a canonical BrandRepository backed by the
 * existing DI brands service (Local for guests, Supabase for authenticated users).
 *
 * This is the production-safe canonical repository for the COLOR slice TODAY: it
 * does not depend on migration 013's `identity` column. Reads project the legacy
 * brand through `fromLegacyBrand` (fresh scalar beats a stale guidelines mirror);
 * writes project the canonical brand through `toLegacyBrandPatch` (scalar +
 * colorSystem, never the guidelines mirror). Core color (primary/secondary) rides
 * on the existing `primary_color`/`secondary_color` columns; the identity-column
 * `SupabaseBrandRepository` becomes the full-fidelity implementation once 013 ships.
 */
import type { IBrandsService } from '@/core/types/services';
import type { BrandRepository } from '@/domain/brand/repository';
import {
  fromLegacyBrand,
  toLegacyBrandPatch,
  type CanonicalBrand,
} from '@/domain/brand';

export class BrandServiceRepository implements BrandRepository {
  constructor(private readonly svc: IBrandsService) {}

  async getById(id: string): Promise<CanonicalBrand | null> {
    const b = await this.svc.getById(id);
    return b ? fromLegacyBrand(b) : null;
  }

  async getBySlug(slug: string): Promise<CanonicalBrand | null> {
    const b = await this.svc.getBySlug(slug);
    return b ? fromLegacyBrand(b) : null;
  }

  async save(brand: CanonicalBrand): Promise<CanonicalBrand> {
    const updated = await this.svc.update(brand.id, toLegacyBrandPatch(brand));
    return fromLegacyBrand(updated);
  }
}
