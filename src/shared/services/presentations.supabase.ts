import { supabase } from '@/integrations/supabase/client';

export interface GuidelinePresentation {
  id: string;
  brand_id: string;
  user_id: string;
  title: string;
  description?: string;
  version: string;
  layout_type: string;
  theme_settings: Record<string, any>;
  slides: any[];
  slide_order: string[];
  export_settings: Record<string, any>;
  is_published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GuidelineSlide {
  id: string;
  presentation_id: string;
  slide_type: string;
  title: string;
  subtitle?: string;
  order_index: number;
  content: Record<string, any>;
  is_enabled: boolean;
  is_locked: boolean;
  background_color?: string;
  text_color?: string;
  custom_styles: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const presentationsService = {
  // Presentations CRUD
  async getPresentation(id: string) {
    const { data, error } = await supabase
      .from('guideline_presentations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getPresentationsByBrand(brandId: string) {
    const { data, error } = await supabase
      .from('guideline_presentations')
      .select('*')
      .eq('brand_id', brandId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createPresentation(presentation: Partial<GuidelinePresentation>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('guideline_presentations')
      .insert({
        brand_id: presentation.brand_id,
        title: presentation.title,
        description: presentation.description,
        layout_type: presentation.layout_type,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async updatePresentation(id: string, updates: Partial<GuidelinePresentation>) {
    const { data, error } = await supabase
      .from('guideline_presentations')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async deletePresentation(id: string) {
    const { error } = await supabase
      .from('guideline_presentations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Slides CRUD
  async getSlides(presentationId: string) {
    const { data, error } = await supabase
      .from('guideline_slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data as any[];
  },

  async createSlide(slide: Partial<GuidelineSlide>) {
    const { data, error } = await supabase
      .from('guideline_slides')
      .insert(slide as any)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async updateSlide(id: string, updates: Partial<GuidelineSlide>) {
    const { data, error } = await supabase
      .from('guideline_slides')
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async deleteSlide(id: string) {
    const { error } = await supabase
      .from('guideline_slides')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reorderSlides(presentationId: string, slideIds: string[]) {
    // Fetch existing slides to get required fields
    const { data: existingSlides } = await supabase
      .from('guideline_slides')
      .select('*')
      .eq('presentation_id', presentationId);
    
    if (!existingSlides) return;

    const updates = slideIds.map((id, index) => {
      const existing = existingSlides.find(s => s.id === id);
      return {
        ...existing,
        order_index: index,
      };
    });

    const { error } = await supabase
      .from('guideline_slides')
      .upsert(updates as any);

    if (error) throw error;
  },

  // Publish
  async publishPresentation(id: string) {
    const { data, error } = await supabase
      .from('guideline_presentations')
      .update({
        is_published: true,
        published_at: new Date().toISOString(),
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },

  async unpublishPresentation(id: string) {
    const { data, error } = await supabase
      .from('guideline_presentations')
      .update({
        is_published: false,
        published_at: null,
      } as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as any;
  },
};
