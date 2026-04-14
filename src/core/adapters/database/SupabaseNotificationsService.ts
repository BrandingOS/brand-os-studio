import { supabase } from '@/integrations/supabase/client';
import type { INotificationsService, NotificationData, CreateNotificationInput } from '@/core/types/services';

export class SupabaseNotificationsService implements INotificationsService {
  async list(): Promise<NotificationData[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw error;
    return (data ?? []).map(mapNotification);
  }

  async create(input: CreateNotificationInput): Promise<NotificationData> {
    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href,
        brand_id: input.brandId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapNotification(data);
  }

  async markRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;
  }

  async markAllRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) throw error;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}

function mapNotification(data: any): NotificationData {
  return {
    id: data.id,
    userId: data.user_id,
    type: data.type,
    title: data.title,
    body: data.body || undefined,
    href: data.href || undefined,
    brandId: data.brand_id || undefined,
    read: data.read || false,
    createdAt: new Date(data.created_at).getTime(),
  };
}
