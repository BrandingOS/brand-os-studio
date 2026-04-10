/**
 * Activity log service — records user actions across the app.
 *
 * Tries Supabase `activity_log` table first. Falls back to localStorage
 * when the table doesn't exist yet (pre-migration).
 */
import { supabase } from '@/integrations/supabase/client';

export type ActivityEventType =
  | 'brand_created'
  | 'brand_updated'
  | 'asset_uploaded'
  | 'asset_exported'
  | 'guideline_updated'
  | 'guideline_published'
  | 'comment_posted'
  | 'comment_resolved'
  | 'approval_submitted'
  | 'approval_approved'
  | 'approval_rejected'
  | 'member_invited'
  | 'member_joined'
  | 'member_removed';

export interface ActivityEvent {
  id: string;
  brandId: string;
  brandName?: string;
  userId?: string;
  userName?: string;
  eventType: ActivityEventType;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

const STORAGE_KEY = 'brandos-activity-log';

function getLocalEvents(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEvents(events: ActivityEvent[]) {
  // Keep last 200 events
  const trimmed = events.slice(0, 200);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
}

export const activityService = {
  /** Log a new activity event */
  async log(event: Omit<ActivityEvent, 'id' | 'createdAt'>): Promise<void> {
    const entry: ActivityEvent = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      ...event,
    };

    // Try Supabase first
    try {
      const { error } = await supabase.from('activity_log').insert({
        id: entry.id,
        brand_id: entry.brandId,
        brand_name: entry.brandName,
        user_id: entry.userId,
        user_name: entry.userName,
        event_type: entry.eventType,
        title: entry.title,
        description: entry.description,
        metadata: entry.metadata,
        created_at: new Date(entry.createdAt).toISOString(),
      });
      if (error) throw error;
      return;
    } catch {
      // Table doesn't exist yet — fall back to localStorage
    }

    const events = getLocalEvents();
    events.unshift(entry);
    saveLocalEvents(events);
  },

  /** Get activity events for a brand (or all brands if brandId is omitted) */
  async list(options?: { brandId?: string; limit?: number }): Promise<ActivityEvent[]> {
    const limit = options?.limit || 50;

    // Try Supabase first
    try {
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

      if (data && data.length > 0) {
        return data.map((row: any) => ({
          id: row.id,
          brandId: row.brand_id,
          brandName: row.brand_name,
          userId: row.user_id,
          userName: row.user_name,
          eventType: row.event_type,
          title: row.title,
          description: row.description,
          metadata: row.metadata,
          createdAt: new Date(row.created_at).getTime(),
        }));
      }
    } catch {
      // Table doesn't exist yet
    }

    // Fall back to localStorage
    let events = getLocalEvents();
    if (options?.brandId) {
      events = events.filter((e) => e.brandId === options.brandId);
    }
    return events.slice(0, limit);
  },
};
