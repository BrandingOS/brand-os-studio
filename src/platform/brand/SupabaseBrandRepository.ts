/**
 * Supabase BrandRepository adapter (Stage 2B) — the authenticated, server-backed,
 * cross-device write path for the canonical Brand identity.
 *
 * Reads/writes the `brands.identity` JSONB column (migration 013) as the source
 * of truth via the pure row mappers, keeping the legacy scalar columns in sync
 * for un-migrated consumers. It never reads or writes the `guidelines` mirror, so
 * no re-derivation can overwrite a freshly-saved canonical value.
 *
 * NOTE: activating this in production requires migration 013 to be deployed
 * (currently deploy-pending with the security release — see
 * docs/phase-2/security-deploy). The row-mapping + persistence semantics are
 * proven by the in-project mapper/round-trip tests and, at the SQL/JSONB level,
 * by the real-PostgreSQL PGlite harness (`scratchpad/pgverify/verify_2b.mjs`,
 * recorded in docs/phase-2/stage-2b). This adapter's supabase-js wiring itself
 * has no offline test (it needs a live PostgREST endpoint).
 */
import { supabase } from '@/integrations/supabase/client';
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';
import { canonicalToRow, rowToCanonical, type BrandRow } from './brandRow';

const COLUMNS =
  'id, slug, name, identity, identity_schema_version, primary_color, secondary_color, ' +
  'fonts, tone, audience, strategy, is_public, public_url, logo_url, created_at, updated_at';

export class SupabaseBrandRepository implements BrandRepository {
  async getById(id: string): Promise<CanonicalBrand | null> {
    const { data, error } = await supabase
      .from('brands')
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCanonical(data as unknown as BrandRow) : null;
  }

  async getBySlug(slug: string): Promise<CanonicalBrand | null> {
    const { data, error } = await supabase
      .from('brands')
      .select(COLUMNS)
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCanonical(data as unknown as BrandRow) : null;
  }

  async save(brand: CanonicalBrand): Promise<CanonicalBrand> {
    // Validate at the write boundary (one parse point) before persisting.
    const write = canonicalToRow(assertCanonicalBrand(brand));
    const { data, error } = await supabase
      .from('brands')
      .update(write as unknown as Record<string, unknown>)
      .eq('id', brand.id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    // No matching row → the update wrote nothing. Fail loudly rather than return
    // the input as if persisted (reviewer F2 — no silent write failure).
    if (!data) throw new Error(`SupabaseBrandRepository.save: no brand row updated for id=${brand.id}`);
    return rowToCanonical(data as unknown as BrandRow);
  }
}
