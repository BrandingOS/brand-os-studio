import { supabase } from '@/integrations/supabase/client';
import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import type { IBrandsService } from '@/core/types/services';
import { demoBrandIdentity } from '@/data/demo';
import { raqmBrand } from '@/data/brands/raqm';
import { skamBrand } from '@/data/brands/skam';
import { vectorBrand } from '@/data/brands/vector';
import { uniexBrand } from '@/data/brands/uniex';
import { migrateBrandToCurrent, migrateBrands } from '@/shared/brand/migrateSchema';
import { applySeedOverride, patchSeedOverride } from '@/shared/brand/seedBrandOverrides';
import { forgetMarker, rememberMarker, rememberedMarker } from './onboardingMarkerFallback';
import {
  forgetWorkspaceCard,
  rememberWorkspaceCard,
  rememberedWorkspaceCard,
} from './workspaceCardFallback';

/**
 * Seed brands are always available regardless of database state.
 * They appear as read-only examples for all users.
 */
const SEED_BRANDS: Brand[] = [raqmBrand, skamBrand, vectorBrand, uniexBrand, demoBrandIdentity];
const SEED_BRAND_IDS = new Set(SEED_BRANDS.map((b) => b.id));

/**
 * The column this error says the database does not have — or `null`.
 *
 * PostgREST reports a missing column TWO ways, and the tolerance below was only
 * written for one of them:
 *
 *   42703     `column "onboarding" does not exist`
 *             Postgres itself rejected the statement.
 *   PGRST204  `Could not find the 'onboarding' column of 'brands' in the
 *             schema cache`
 *             PostgREST rejected the payload against its own schema cache,
 *             before Postgres ever saw it.
 *
 * The second is the one an INSERT or UPDATE naming an unknown column actually
 * hits, so checking only for 42703 meant the pre-migration tolerance never ran
 * on the path it exists for. The visible cost was exact: on an environment
 * carrying the 002 code without migration 022, creating a brand failed
 * outright, and every write of the onboarding marker with it — so a brand left
 * mid-flow came back reading as finished and sat in the dashboard among the
 * brands its owner had actually completed.
 *
 * Returns `''` when the column cannot be named, which callers read as "some
 * column, we do not know which".
 */
export function missingColumnName(
  error: { code?: string; message?: string } | null | undefined,
): string | null {
  if (!error) return null;
  const message = error.message ?? '';
  const fromCache = /could not find the '?"?([a-z_]+)'?"?\s+column/i.exec(message)?.[1];
  if (error.code === 'PGRST204' || fromCache) return fromCache ?? '';
  if (error.code === '42703' || /column .* does not exist/i.test(message)) {
    return /column "?([a-z_]+)"?/i.exec(message)?.[1] ?? '';
  }
  return null;
}

export class SupabaseBrandsService implements IBrandsService {
  async list(workspaceId?: string): Promise<Brand[]> {
    let query = supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false });

    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Authenticated users' list is their REAL brands only. Seed/demo brands
    // (raqm/skam/vector/uniex/demo) are NOT injected here — they must not appear
    // as user-owned records (Batch C / C5). They remain reachable by direct URL
    // via getById/getBySlug (the explicit demo boundary), and guest mode
    // (LocalBrandsService) still surfaces them as examples.
    const dbBrands = (data ?? []).map(this.mapFromDatabase);
    return migrateBrands(dbBrands);
  }

  async getById(id: string): Promise<Brand | null> {
    // Check seed brands first — apply any saved user overrides on top.
    const seed = SEED_BRANDS.find((b) => b.id === id);
    if (seed) return migrateBrandToCurrent(applySeedOverride(seed));

    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? migrateBrandToCurrent(this.mapFromDatabase(data)) : null;
  }

  async getBySlug(slug: string): Promise<Brand | null> {
    // Check seed brands first — apply any saved user overrides on top.
    const seed = SEED_BRANDS.find((b) => b.slug === slug);
    if (seed) return migrateBrandToCurrent(applySeedOverride(seed));

    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    return data ? migrateBrandToCurrent(this.mapFromDatabase(data)) : null;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const brandData: Record<string, unknown> = {
      user_id: user.id,
      name: input.name,
      logo_url: input.logo,
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor,
      fonts: input.fonts,
      tone: input.tone,
      audience: input.audience,
    };

    if (input.slug) brandData.slug = input.slug;
    if (input.workspaceId) brandData.workspace_id = input.workspaceId;
    const extras = input as typeof input & {
      guidelines?: unknown;
      strategy?: unknown;
      logoAssets?: unknown;
      onboarding?: unknown;
    };
    if (extras.guidelines !== undefined) brandData.guidelines = extras.guidelines;
    if (extras.strategy !== undefined) brandData.strategy = extras.strategy;
    // Logo variants used to require a follow-up update() — one that silently
    // failed left an onboarded brand with no logos at all. They're a plain
    // JSONB column, so write them with the row.
    if (extras.logoAssets !== undefined) brandData.logo_assets = extras.logoAssets;
    // The onboarding marker travels WITH the insert (spec 002). A follow-up
    // update would mean a window where the brand exists but has no recorded
    // step — close the tab in that window and resume sends you to Setup on a
    // brand you never finished.
    if (extras.onboarding !== undefined) brandData.onboarding = extras.onboarding;

    // One call site, reused for the retry — a second `.insert()` expression
    // would duplicate the generated-types overload complaint this file already
    // carries, and the ratchet reads that as a new error.
    const insertRow = () => supabase.from('brands').insert(brandData).select().single();

    let result = await insertRow();

    // Pre-022 tolerance, mirroring update()'s: an environment with the code but
    // not the migration must still create brands. The marker is the only thing
    // lost, and its absence reads as "finished" — the safe direction.
    const absent = missingColumnName(result.error);
    let markerDropped: unknown;
    if (absent !== null && (absent === 'onboarding' || absent === '')) {
      markerDropped = brandData.onboarding;
      delete brandData.onboarding;
      result = await insertRow();
    }

    const { data, error } = result;
    if (error) throw error;
    // The row exists now, so the marker the column could not take gets a home
    // against its id. Without this the brand comes back unmarked, which every
    // reader is obliged to call finished.
    if (markerDropped !== undefined) rememberMarker(data.id, markerDropped);
    // Migrated like getBySlug — the store caches this as `current`.
    return migrateBrandToCurrent(this.mapFromDatabase(data));
  }

  async update(id: string, patch: Partial<Brand>): Promise<Brand> {
    // Seed brands can't be updated as DB rows. Persist the patch in
    // localStorage via the seed-override layer so it survives reload
    // and propagates to every consumer reading the brand.
    if (SEED_BRAND_IDS.has(id)) {
      const seed = SEED_BRANDS.find((b) => b.id === id);
      if (seed) {
        patchSeedOverride(id, { ...patch, updatedAt: new Date() });
        return migrateBrandToCurrent(applySeedOverride(seed));
      }
    }

    const updateData: Record<string, unknown> = {};

    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.logo !== undefined) updateData.logo_url = patch.logo;
    if (patch.logoAssets !== undefined) updateData.logo_assets = patch.logoAssets;
    // Durable logo Asset records + refs (migration 014). Persist the assetId-based
    // logoSystem + brandAssets so ids are minted once (by stageLogoAssignment) and
    // never re-derived from URL hashes on read.
    if (patch.logoSystem !== undefined) updateData.logo_system = patch.logoSystem;
    if (patch.brandAssets !== undefined) updateData.brand_assets = patch.brandAssets;
    if (patch.primaryColor !== undefined) updateData.primary_color = patch.primaryColor;
    if (patch.secondaryColor !== undefined) updateData.secondary_color = patch.secondaryColor;
    if (patch.fonts !== undefined) updateData.fonts = patch.fonts;
    if (patch.tone !== undefined) updateData.tone = patch.tone;
    if (patch.audience !== undefined) updateData.audience = patch.audience;
    if (patch.strategy !== undefined) updateData.strategy = patch.strategy;
    // Canonical identity blob (migration 013). Home for accent/neutrals, numeric
    // font weights, and rich voice — fields with no legacy scalar column.
    if (patch.identity !== undefined) updateData.identity = patch.identity;
    if (patch.identitySchemaVersion !== undefined)
      updateData.identity_schema_version = patch.identitySchemaVersion;
    // Brand Core authority/provenance sidecar + Business Info (migration 016).
    if (patch.identityMeta !== undefined) updateData.identity_meta = patch.identityMeta;
    if (patch.businessInfo !== undefined) updateData.business_info = patch.businessInfo;
    // Onboarding progress (migration 022). Tolerated below when the column is
    // absent — losing your place is survivable, a failed save is not.
    if (patch.onboarding !== undefined) updateData.onboarding = patch.onboarding;
    // Dashboard card presentation (migration 031). Tolerated below when the
    // column is absent, with the value kept per-browser so a rename the user
    // just made does not vanish in front of them.
    if (patch.workspaceCard !== undefined) updateData.workspace_card = patch.workspaceCard;
    if (patch.guidelines !== undefined) updateData.guidelines = patch.guidelines;
    if (patch.isPublic !== undefined) updateData.is_public = patch.isPublic;
    if (patch.publicUrl !== undefined) updateData.public_url = patch.publicUrl;
    if (patch.customDomain !== undefined) updateData.custom_domain = patch.customDomain;

    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Pre-014 tolerance: the durable logo columns (`logo_system`/`brand_assets`)
      // may not exist yet in this environment. Rather than fail the whole save,
      // retry without them — logos fall back to the legacy URL derivation (no
      // regression). Once migration 014 is deployed the first branch persists them.
      const missingCol = missingColumnName(error) !== null;
      // Same tolerance extended to the migration-016 columns: an environment
      // that has the code but not the migration must still save everything
      // else, exactly as the pre-014 path does. The dropped fields degrade to
      // their read-time defaults (no authority recorded, no business facts) —
      // never to a failed save.
      //
      // `identity_meta` is NOT in this list, on purpose. It carries authority
      // and attribution: dropping it would let a save that lost the fact a
      // value is Official report success, so `promoteCoreValue` would skip its
      // compensation and leave a Kit adoption behind a value that reloads as
      // merely provisional. A missing column there is a deployment error and
      // must surface as one.
      const TOLERATED_COLS = [
        'logo_system',
        'brand_assets',
        'business_info',
        'onboarding',
        'workspace_card',
      ] as const;

      if (missingCol) {
        // Drop ONLY the column the database named. The previous version removed
        // every optional column at once, so one absent column silently discarded
        // valid logo and business values that the same patch was saving.
        const attempt = { ...updateData };
        let lastError = error;

        for (let i = 0; i <= TOLERATED_COLS.length; i += 1) {
          const named = missingColumnName(lastError);
          if (!named || !(named in attempt)) break;
          if (!TOLERATED_COLS.includes(named as (typeof TOLERATED_COLS)[number])) break;

          // The two dropped fields with somewhere else to go.
          if (named === 'onboarding') rememberMarker(id, attempt.onboarding);
          if (named === 'workspace_card') rememberWorkspaceCard(id, attempt.workspace_card);
          delete attempt[named];

          // Nothing left to send. An empty PATCH matches no rows, so PostgREST
          // answers PGRST116 and the caller sees a failed save for a write that
          // has in fact been fully honoured — the marker is in the fallback and
          // there was never anything else in the patch. That failure propagated:
          // the understanding pass writes the marker on its own, so it threw
          // mid-flight and the review rendered with no projection at all.
          if (Object.keys(attempt).length === 0) {
            const row = await supabase.from('brands').select('*').eq('id', id).single();
            if (row.error) throw row.error;
            return migrateBrandToCurrent(this.mapFromDatabase(row.data));
          }

          const retry = await supabase
            .from('brands')
            .update(attempt)
            .eq('id', id)
            .select()
            .single();
          if (!retry.error) return migrateBrandToCurrent(this.mapFromDatabase(retry.data));

          if (missingColumnName(retry.error) === null) throw retry.error;
          lastError = retry.error;
        }
      }
      throw error;
    }
    // The write named the column and the database took it, so the column
    // exists and the row is now authoritative for this brand's card. Drop the
    // per-browser copy: left behind, it would outlive the value it stood in
    // for and resurrect a card the user has since cleared.
    if ('workspace_card' in updateData) forgetWorkspaceCard(id);
    // Migrated like getBySlug — the store caches this as `current`.
    return migrateBrandToCurrent(this.mapFromDatabase(data));
  }

  async delete(id: string): Promise<void> {
    // Seed brands can't be deleted
    if (SEED_BRAND_IDS.has(id)) return;

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);

    if (error) throw error;
    // Nothing left to remember a place in a flow for, or a card for.
    forgetMarker(id);
    forgetWorkspaceCard(id);
  }

  private mapFromDatabase(data: any): Brand {
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      logo: data.logo_url,
      logoAssets: data.logo_assets || undefined,
      // Durable logo refs + records (migration 014). Preferred over URL-hash
      // re-derivation by migrateBrandToCurrent (`cleanBrand.logoSystem ?? …`).
      logoSystem: data.logo_system || undefined,
      brandAssets: data.brand_assets || undefined,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      fonts: data.fonts || { primary: 'Inter' },
      tone: data.tone || '',
      audience: data.audience || '',
      strategy: data.strategy || undefined,
      guidelines: data.guidelines || undefined,
      identity: data.identity || undefined,
      identitySchemaVersion: data.identity_schema_version || undefined,
      identityMeta: data.identity_meta || undefined,
      businessInfo: data.business_info || undefined,
      // The row wins whenever it has one. The fallback only answers for brands
      // whose marker the database had nowhere to put (pre-022), and it stops
      // being consulted for a brand the moment the column carries its marker.
      onboarding: data.onboarding || (rememberedMarker(data.id) as Brand['onboarding']) || undefined,
      // Same rule as the marker above: the row wins whenever it has a value,
      // and the per-browser copy only answers for brands whose card the
      // database had nowhere to put (pre-031).
      workspaceCard: data.workspace_card || rememberedWorkspaceCard(data.id) || undefined,
      isPublic: data.is_public || false,
      // Carried, not dropped: the access model needs to know which workspace a brand is in
      workspaceId: data.workspace_id ?? undefined,
      archivedAt: data.archived_at ? new Date(data.archived_at) : null,
      version: typeof data.version === 'number' ? data.version : undefined,
      updatedBy: data.updated_by ?? null,
      publicUrl: data.public_url || undefined,
      customDomain: data.custom_domain || undefined,
      assets: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
