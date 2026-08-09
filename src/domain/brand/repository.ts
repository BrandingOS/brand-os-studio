/**
 * BrandRepository port (Stage 2B).
 *
 * The single authoritative read/write contract for the canonical Brand. The
 * application layer depends on THIS interface; infrastructure (Supabase / local)
 * implements it in src/platform/brand. Consumers never talk to the database or
 * localStorage directly — that is what removes the "component persists directly"
 * bypass and the stale-mirror re-derivation from every migrated path.
 */
import type { CanonicalBrand } from './identity';

export interface BrandRepository {
  getById(id: string): Promise<CanonicalBrand | null>;
  getBySlug(slug: string): Promise<CanonicalBrand | null>;
  /**
   * Persist the canonical identity as the source of truth. Implementations MUST
   * write the canonical identity intentionally (no field dropping) and MUST NOT
   * re-derive it from a legacy mirror on the next read.
   */
  save(brand: CanonicalBrand): Promise<CanonicalBrand>;
}
