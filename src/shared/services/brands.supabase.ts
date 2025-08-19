import { supabase } from '@/integrations/supabase/client';
import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import type { BrandsService } from './brands.service';

export class SupabaseBrandsService implements BrandsService {
  async list(): Promise<Brand[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return data.map(this.mapFromDatabase);
  }

  async getById(id: string): Promise<Brand | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data ? this.mapFromDatabase(data) : null;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const brandData = {
      user_id: user.id,
      name: input.name,
      logo_url: input.logo,
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor,
      fonts: input.fonts,
      tone: input.tone,
      audience: input.audience,
    };

    const { data, error } = await supabase
      .from('brands')
      .insert(brandData)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  }

  async update(id: string, patch: Partial<Brand>): Promise<Brand> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const updateData: any = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.logo !== undefined) updateData.logo_url = patch.logo;
    if (patch.primaryColor !== undefined) updateData.primary_color = patch.primaryColor;
    if (patch.secondaryColor !== undefined) updateData.secondary_color = patch.secondaryColor;
    if (patch.fonts !== undefined) updateData.fonts = patch.fonts;
    if (patch.tone !== undefined) updateData.tone = patch.tone;
    if (patch.audience !== undefined) updateData.audience = patch.audience;

    const { data, error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return this.mapFromDatabase(data);
  }

  async delete(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  private mapFromDatabase(data: any): Brand {
    return {
      id: data.id,
      name: data.name,
      logo: data.logo_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      fonts: data.fonts,
      tone: data.tone,
      audience: data.audience,
      assets: [], // TODO: Load from storage when needed
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

export const supabaseBrandsService = new SupabaseBrandsService();