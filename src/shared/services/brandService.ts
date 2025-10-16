import type { Brand, CreateBrandInput } from '../types/brand';
import { useSessionStore } from '../store/sessionStore';

export interface BrandService {
  getAll(): Promise<Brand[]>;
  getById(id: string): Promise<Brand>;
  create(input: CreateBrandInput): Promise<Brand>;
  update(id: string, patch: Partial<Brand>): Promise<void>;
  delete(id: string): Promise<void>;
}

// Guest implementation using localStorage
class BrandServiceGuest implements BrandService {
  private readonly storageKey = 'brandos:brands';

  private getBrands(): Brand[] {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveBrands(brands: Brand[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(brands));
  }

  async getAll(): Promise<Brand[]> {
    return this.getBrands();
  }

  async getById(id: string): Promise<Brand> {
    const brands = this.getBrands();
    const brand = brands.find(b => b.id === id);
    if (!brand) throw new Error(`Brand with id ${id} not found`);
    return brand;
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const brands = this.getBrands();
    
    // Guest users can only have one brand - replace existing one
    console.log('Creating brand for guest, existing brands:', brands.length);
    if (brands.length >= 1) {
      console.log('Replacing existing brand for guest user');
      // Clear existing brands for guest users
      this.saveBrands([]);
    }

    const brand: Brand = {
      ...input,
      id: `brand_${Date.now()}`,
      slug: input.slug || this.generateSlug(input.name),
      assets: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('Created brand:', brand);
    const newBrands = [brand]; // Only keep the new brand for guest users
    this.saveBrands(newBrands);
    return brand;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }

  async update(id: string, patch: Partial<Brand>): Promise<void> {
    const brands = this.getBrands();
    const index = brands.findIndex(b => b.id === id);
    if (index === -1) throw new Error(`Brand with id ${id} not found`);
    
    brands[index] = { ...brands[index], ...patch, updatedAt: new Date() };
    this.saveBrands(brands);
  }

  async delete(id: string): Promise<void> {
    const brands = this.getBrands();
    const filtered = brands.filter(b => b.id !== id);
    this.saveBrands(filtered);
  }
}

// Supabase implementation for authenticated users
class BrandServiceSupabase implements BrandService {
  async getAll(): Promise<Brand[]> {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    
    return (data || []).map(this.mapFromDatabase);
  }

  async getAllBrands(): Promise<Brand[]> {
    // Admin function to get all brands regardless of user
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    
    return (data || []).map(this.mapFromDatabase);
  }

  async getById(id: string): Promise<Brand> {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw new Error(error.message);
    if (!data) throw new Error(`Brand with id ${id} not found`);
    
    return this.mapFromDatabase(data);
  }

  async create(input: CreateBrandInput): Promise<Brand> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User must be authenticated to create a brand');
    }
    
    const brandData = {
      name: input.name,
      slug: input.slug || this.generateSlug(input.name),
      primary_color: input.primaryColor,
      secondary_color: input.secondaryColor,
      logo_url: input.logo,
      fonts: input.fonts,
      tone: input.tone,
      audience: input.audience,
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from('brands')
      .insert(brandData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    return this.mapFromDatabase(data);
  }

  async update(id: string, patch: Partial<Brand>): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const updateData: any = {};
    if (patch.name) updateData.name = patch.name;
    if (patch.primaryColor) updateData.primary_color = patch.primaryColor;
    if (patch.secondaryColor) updateData.secondary_color = patch.secondaryColor;
    if (patch.logo) updateData.logo_url = patch.logo;
    if (patch.fonts) updateData.fonts = patch.fonts;
    if (patch.tone) updateData.tone = patch.tone;
    if (patch.audience) updateData.audience = patch.audience;

    const { error } = await supabase
      .from('brands')
      .update(updateData)
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }

  async delete(id: string): Promise<void> {
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { error } = await supabase
      .from('brands')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_');
  }

  private mapFromDatabase(data: any): Brand {
    return {
      id: data.id,
      slug: data.slug,
      name: data.name,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      logo: data.logo_url,
      fonts: data.fonts || { primary: 'Inter', secondary: 'Roboto' },
      tone: data.tone,
      audience: data.audience,
      assets: [],
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }
}

// Service factory
export async function getBrandService(): Promise<BrandService> {
  const { mode } = useSessionStore.getState();
  
  // If in guest mode, use guest service
  if (mode === 'guest') {
    return new BrandServiceGuest();
  }
  
  // If in user mode, check if there's a real Supabase session
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();
  
  // If no real Supabase user (e.g., dev mode auto-login), use guest service
  if (!user) {
    console.log('No real Supabase session found, using guest service');
    return new BrandServiceGuest();
  }
  
  // Real authenticated user - use Supabase service
  return new BrandServiceSupabase();
}

// Admin service to get all brands
export function getAdminBrandService(): BrandServiceSupabase {
  return new BrandServiceSupabase();
}