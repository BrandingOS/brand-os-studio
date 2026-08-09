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

    const dbBrands = (data ?? []).map(this.mapFromDatabase);
    const dbBrandIds = new Set(dbBrands.map((b) => b.id));

    // Merge: DB brands first, then seed brands (with any user overrides
    // applied via the seed-override layer) that aren't already represented.
    const seeds = SEED_BRANDS
      .filter((b) => !dbBrandIds.has(b.id))
      .map(applySeedOverride);
    return migrateBrands([...dbBrands, ...seeds]);
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
    };
    if (extras.guidelines !== undefined) brandData.guidelines = extras.guidelines;
    if (extras.strategy !== undefined) brandData.strategy = extras.strategy;
    // Logo variants used to require a follow-up update() — one that silently
    // failed left an onboarded brand with no logos at all. They're a plain
    // JSONB column, so write them with the row.
    if (extras.logoAssets !== undefined) brandData.logo_assets = extras.logoAssets;

    const { data, error } = await supabase
      .from('brands')
      .insert(brandData)
      .select()
      .single();

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

    if (error) throw error;
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
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      fonts: data.fonts || { primary: 'Inter' },
      tone: data.tone || '',
      audience: data.audience || '',
      strategy: data.strategy || undefined,
      guidelines: data.guidelines || undefined,
      identity: data.identity || undefined,
      identitySchemaVersion: data.identity_schema_version || undefined,
      isPublic: data.is_public || false,
      publicUrl: data.public_url || undefined,
      customDomain: data.custom_domain || undefined,
      assets: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}
