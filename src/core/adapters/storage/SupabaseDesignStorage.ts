import { supabase } from '@/integrations/supabase/client';
import type { DesignSummary, IDesignStorage } from '@/core/types/services';
import { LocalDesignStorage } from './LocalDesignStorage';

/**
 * SupabaseDesignStorage — server-backed durable design persistence (migration 015
 * `public.designs`). This is the authenticated `IDesignStorage`: a logged-in
 * user's saved designs live in the DB (cross-device, survive cache-clear, share-able)
 * instead of localStorage.
 *
 * Tolerance: if the `designs` table is not present yet (pre-015 environment) OR a
 * row isn't found server-side (e.g. a design saved locally before this shipped),
 * every method DELEGATES to a `LocalDesignStorage` fallback. So the adapter is safe
 * to ship before the migration deploys and never loses continuity with pre-existing
 * local designs — new saves go to the server once 015 is live.
 */
const SUMMARY_COLUMNS =
  'id, name, thumbnail_url, content_type, width, height, source_template_id, ' +
  'is_template, family_id, source_design_id, updated_at';

// The `designs` table (migration 015) is not in the generated Supabase types yet
// (they regenerate after deploy), so reach it through an untyped query builder.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const designsTable = () => (supabase as any).from('designs');

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  // 42P01 = undefined_table (direct SQL); PGRST205 = PostgREST "relation not found".
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .* does not exist|could not find the table/i.test(error.message ?? '')
  );
}

function rowToSummary(row: Record<string, unknown>): DesignSummary {
  return {
    id: row.id as string,
    name: (row.name as string) ?? undefined,
    thumbnailUrl: (row.thumbnail_url as string) ?? undefined,
    contentType: (row.content_type as string) ?? undefined,
    width: (row.width as number) ?? undefined,
    height: (row.height as number) ?? undefined,
    sourceTemplateId: (row.source_template_id as string) ?? undefined,
    isTemplate: (row.is_template as boolean) ?? undefined,
    familyId: (row.family_id as string) ?? undefined,
    sourceDesignId: (row.source_design_id as string) ?? undefined,
    updatedAt: (row.updated_at as string) ?? undefined,
  };
}

export class SupabaseDesignStorage implements IDesignStorage {
  private readonly fallback = new LocalDesignStorage();

  async saveDesign(
    brandId: string,
    designId: string,
    data: unknown,
    meta?: Partial<DesignSummary>,
  ): Promise<void> {
    const row: Record<string, unknown> = {
      brand_id: brandId,
      id: designId,
      data,
      updated_at: new Date().toISOString(),
    };
    if (meta?.name !== undefined) row.name = meta.name;
    if (meta?.thumbnailUrl !== undefined) row.thumbnail_url = meta.thumbnailUrl;
    if (meta?.contentType !== undefined) row.content_type = meta.contentType;
    if (meta?.width !== undefined) row.width = meta.width;
    if (meta?.height !== undefined) row.height = meta.height;
    if (meta?.sourceTemplateId !== undefined) row.source_template_id = meta.sourceTemplateId;
    if (meta?.isTemplate !== undefined) row.is_template = meta.isTemplate;
    if (meta?.familyId !== undefined) row.family_id = meta.familyId;
    if (meta?.sourceDesignId !== undefined) row.source_design_id = meta.sourceDesignId;

    const { error } = await designsTable().upsert(row, { onConflict: 'brand_id,id' });
    if (error) {
      if (isMissingTable(error)) return this.fallback.saveDesign(brandId, designId, data, meta);
      throw error;
    }
  }

  async loadDesign(brandId: string, designId: string): Promise<unknown | null> {
    const { data, error } = await designsTable()
      .select('data')
      .eq('brand_id', brandId)
      .eq('id', designId)
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) return this.fallback.loadDesign(brandId, designId);
      throw error;
    }
    // Continuity: a design saved locally before 015 has no server row — fall back.
    if (!data) return this.fallback.loadDesign(brandId, designId);
    return (data as { data: unknown }).data ?? null;
  }

  async listDesigns(brandId: string): Promise<DesignSummary[]> {
    const { data, error } = await designsTable()
      .select(SUMMARY_COLUMNS)
      .eq('brand_id', brandId)
      .order('updated_at', { ascending: false });
    if (error) {
      if (isMissingTable(error)) return this.fallback.listDesigns(brandId);
      throw error;
    }
    const server = (data ?? []).map((r) => rowToSummary(r as Record<string, unknown>));
    // Merge any pre-015 local-only designs the server doesn't have yet (continuity).
    const seen = new Set(server.map((s) => s.id));
    const local = (await this.fallback.listDesigns(brandId)).filter((s) => !seen.has(s.id));
    return [...server, ...local].sort(
      (a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.id.localeCompare(b.id),
    );
  }

  async deleteDesign(brandId: string, designId: string): Promise<void> {
    const { error } = await designsTable()
      .delete()
      .eq('brand_id', brandId)
      .eq('id', designId);
    if (error && !isMissingTable(error)) throw error;
    // Always clear any local copy too (pre-015 or fallback-written).
    await this.fallback.deleteDesign(brandId, designId);
  }
}
