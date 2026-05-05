/**
 * Realtime service — manages Supabase Realtime channel subscriptions.
 *
 * Provides a centralized way to subscribe to table changes and presence
 * channels, with automatic cleanup.
 */
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const channels = new Map<string, RealtimeChannel>();

export const realtimeService = {
  /**
   * Subscribe to changes on a table, scoped to a filter.
   */
  subscribeToTable<T extends Record<string, unknown>>(
    channelName: string,
    table: string,
    filter: string,
    callbacks: {
      onInsert?: (payload: T) => void;
      onUpdate?: (payload: T) => void;
      onDelete?: (payload: { old: T }) => void;
    },
  ): RealtimeChannel {
    // Unsubscribe if already subscribed
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter },
        (payload) => callbacks.onInsert?.(payload.new as T),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table, filter },
        (payload) => callbacks.onUpdate?.(payload.new as T),
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table, filter },
        (payload) => callbacks.onDelete?.({ old: payload.old as T }),
      )
      .subscribe();

    channels.set(channelName, channel);
    return channel;
  },

  /**
   * Join a presence channel and track who's active.
   */
  joinPresence(
    channelName: string,
    userInfo: { userId: string; name: string; avatarUrl?: string },
    onSync: (presences: Array<{ userId: string; name: string; avatarUrl?: string }>) => void,
  ): RealtimeChannel {
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, { config: { presence: { key: userInfo.userId } } })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flatMap((presence: any[]) =>
          presence.map((p) => ({
            userId: p.userId,
            name: p.name,
            avatarUrl: p.avatarUrl,
          })),
        );
        onSync(users);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track(userInfo);
        }
      });

    channels.set(channelName, channel);
    return channel;
  },

  /**
   * Phase 7.3 — Subscribe to a broadcast channel for real-time
   * peer-to-peer events (cursors, typing indicators, etc.). The
   * returned channel exposes a `.send(event, payload)` API the
   * caller uses to broadcast — see `broadcast(channelName, ...)`.
   */
  joinBroadcast<T = unknown>(
    channelName: string,
    event: string,
    onMessage: (payload: T) => void,
  ): RealtimeChannel {
    this.unsubscribe(channelName);

    const channel = supabase
      .channel(channelName, { config: { broadcast: { self: false } } })
      .on('broadcast', { event }, ({ payload }) => onMessage(payload as T))
      .subscribe();

    channels.set(channelName, channel);
    return channel;
  },

  /**
   * Phase 7.3 — Send a broadcast event on an already-joined channel.
   * No-op when the channel hasn't been joined (caller forgot
   * joinBroadcast or is unauthenticated). Returns the channel's
   * send promise so callers can await delivery if needed; most call
   * sites fire-and-forget.
   */
  broadcast(channelName: string, event: string, payload: unknown): void {
    const channel = channels.get(channelName);
    if (!channel) return;
    void channel.send({ type: 'broadcast', event, payload });
  },

  /**
   * Unsubscribe from a specific channel.
   */
  unsubscribe(channelName: string): void {
    const channel = channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      channels.delete(channelName);
    }
  },

  /**
   * Unsubscribe from all channels.
   */
  unsubscribeAll(): void {
    for (const [name] of channels) {
      this.unsubscribe(name);
    }
  },
};
