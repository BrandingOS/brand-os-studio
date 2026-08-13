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

/**
 * Seed brands are always available regardless of database state.
 * They appear as read-only examples for all users.
 */
const SEED_BRANDS: Brand[] = [raqmBrand, skamBrand, vectorBrand, uniexBrand, demoBrandIdentity];
const SEED_BRAND_IDS = new Set(SEED_BRANDS.map((b) => b.id));

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
    if (
      result.error &&
      (result.error.code === '42703' ||
        /column .* does not exist/i.test(result.error.message ?? ''))
    ) {
      delete brandData.onboarding;
      result = await insertRow();
    }

    const { data, error } = result;
    if (error) throw error;
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
      const missingCol =
        error.code === '42703' || /column .* does not exist/i.test(error.message ?? '');
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
      const TOLERATED_COLS = ['logo_system', 'brand_assets', 'business_info', 'onboarding'] as const;

      if (missingCol) {
        // Drop ONLY the column the database named. The previous version removed
        // every optional column at once, so one absent column silently discarded
        // valid logo and business values that the same patch was saving.
        const attempt = { ...updateData };
        let lastError = error;

        for (let i = 0; i <= TOLERATED_COLS.length; i += 1) {
          const named = /column "?([a-z_]+)"?/i.exec(lastError.message ?? '')?.[1];
          if (!named || !(named in attempt)) break;
          if (!TOLERATED_COLS.includes(named as (typeof TOLERATED_COLS)[number])) break;

          delete attempt[named];
          const retry = await supabase
            .from('brands')
            .update(attempt)
            .eq('id', id)
            .select()
            .single();
          if (!retry.error) return migrateBrandToCurrent(this.mapFromDatabase(retry.data));

          const stillMissing =
            retry.error.code === '42703' ||
            /column .* does not exist/i.test(retry.error.message ?? '');
          if (!stillMissing) throw retry.error;
          lastError = retry.error;
        }
      }
      throw error;
    }
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
      onboarding: data.onboarding || undefined,
      isPublic: data.is_public || false,
      publicUrl: data.public_url || undefined,
      customDomain: data.custom_domain || undefined,
      assets: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
