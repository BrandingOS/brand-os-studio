import { supabase } from '@/integrations/supabase/client';
import type { IActivityService, ActivityEventData, CreateActivityInput } from '@/core/types/services';

export class SupabaseActivityService implements IActivityService {
  async log(event: CreateActivityInput): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('activity_log').insert({
      brand_id: event.brandId,
      brand_name: event.brandName,
      user_id: user?.id,
      user_name: event.userName,
      event_type: event.eventType,
      title: event.title,
      description: event.description,
      metadata: event.metadata || {},
    });

    if (error) throw error;
  }

  async list(options?: { brandId?: string; limit?: number }): Promise<ActivityEventData[]> {
    const limit = options?.limit || 50;

    let query = supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (options?.brandId) {
      query = query.eq('brand_id', options.brandId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map(mapActivity);
  }
}

function mapActivity(data: any): ActivityEventData {
  return {
    id: data.id,
    brandId: data.brand_id || undefined,
    brandName: data.brand_name || undefined,
    userId: data.user_id || undefined,
    userName: data.user_name || undefined,
    eventType: data.event_type,
    title: data.title,
    description: data.description || undefined,
    metadata: data.metadata || {},
    createdAt: new Date(data.created_at).getTime(),
  };
}
