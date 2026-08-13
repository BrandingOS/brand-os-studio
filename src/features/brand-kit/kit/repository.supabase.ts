/**
 * Server-backed Brand Kit state (`public.brand_kit_state`, migration 018).
 *
 * Kit state was browser-local for everyone, including authenticated users, so a
 * user's kit never survived a cache clear and never crossed devices. This is
 * the swap the `KitStateRepository` seam always existed for.
 *
 * Degrades the way 014/015/017 do: if the table is not deployed yet, every
 * operation falls back to `LocalKitStateRepository`, so shipping this ahead of
 * the migration changes nothing for the user. That fallback is also what makes
 * the down migration safe.
 */
import { supabase } from '@/integrations/supabase/client';
import { LocalKitStateRepository, type KitStateRepository } from './repository';
import type { BrandKitState } from './types';

// The generated Supabase types predate 018 — same untyped-accessor workaround
// used for `designs` and the 017 tables. Remove when types are regenerated.
const table = () => (supabase as any).from('brand_kit_state');

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205';
}

/** A local id (dev-bypass brands) can never satisfy a uuid column. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class SupabaseKitStateRepository implements KitStateRepository {
  private readonly local = new LocalKitStateRepository();

  async load(brandId: string): Promise<BrandKitState | null> {
    // Local brand ids (brand_1786…) would raise Postgres 22P02 against a uuid
    // column, so they stay local — the dev-bypass path keeps working.
    if (!UUID.test(brandId)) return this.local.load(brandId);

    const { data, error } = await table()
      .select('state')
      .eq('brand_id', brandId)
      .maybeSingle();

    if (error) {
      if (isMissingTable(error)) return this.local.load(brandId);
      throw error;
    }
    const state = data?.state as BrandKitState | undefined;
    // Same validity gate as the local repo: an unrecognised version is treated
    // as absent rather than half-loaded.
    if (!state || state.version !== 1 || typeof state.deliverables !== 'object') {
      return null;
    }
    return state;
  }

  async save(brandId: string, state: BrandKitState): Promise<boolean> {
    if (!UUID.test(brandId)) return this.local.save(brandId, state);

    const { error } = await table().upsert(
      { brand_id: brandId, version: state.version, state },
      { onConflict: 'brand_id' },
    );

    if (error) {
      if (isMissingTable(error)) return this.local.save(brandId, state);
      // Persistence failure is non-fatal for the caller (see kitStore.persist);
      // report it rather than throwing into an interaction.
      return false;
    }
    return true;
  }
}
