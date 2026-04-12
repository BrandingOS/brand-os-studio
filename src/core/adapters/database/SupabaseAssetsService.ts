import { supabase } from '@/integrations/supabase/client';
import type { Asset } from '@/shared/types/brand';
import type { IAssetsService, CreateAssetInput } from '@/core/types/services';

export class SupabaseAssetsService implements IAssetsService {
  async listForBrand(brandId: string): Promise<Asset[]> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapAsset);
  }

  async getById(id: string): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapAsset(data) : null;
  }

  async create(input: CreateAssetInput): Promise<Asset> {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('assets')
      .insert({
        brand_id: input.brandId,
        name: input.name,
        type: input.type,
        category: input.category,
        source: input.source || 'upload',
        url: input.url,
        storage_path: input.storagePath,
        size: input.size || 0,
        tags: input.tags || [],
        metadata: input.metadata || {},
        uploaded_by: user?.id,
      })
      .select()
      .single();

    if (error) throw error;
    return mapAsset(data);
  }

  async update(id: string, patch: Partial<CreateAssetInput>): Promise<Asset> {
    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.type !== undefined) updateData.type = patch.type;
    if (patch.category !== undefined) updateData.category = patch.category;
    if (patch.source !== undefined) updateData.source = patch.source;
    if (patch.url !== undefined) updateData.url = patch.url;
    if (patch.storagePath !== undefined) updateData.storage_path = patch.storagePath;
    if (patch.size !== undefined) updateData.size = patch.size;
    if (patch.tags !== undefined) updateData.tags = patch.tags;
    if (patch.metadata !== undefined) updateData.metadata = patch.metadata;

    const { data, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapAsset(data);
  }

  async delete(id: string): Promise<void> {
    // Get asset to clean up storage if needed
    const { data: asset } = await supabase
      .from('assets')
      .select('storage_path')
      .eq('id', id)
      .maybeSingle();

    // Delete from storage if it has a storage path
    if (asset?.storage_path) {
      await supabase.storage
        .from('brand-assets')
        .remove([asset.storage_path]);
    }

    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

function mapAsset(data: any): Asset {
  return {
    id: data.id,
    name: data.name,
    type: data.type,
    category: data.category,
    source: data.source || 'upload',
    url: data.url,
    size: data.size || 0,
    tags: data.tags || [],
    metadata: data.metadata || {},
    createdAt: new Date(data.created_at),
  };
}
