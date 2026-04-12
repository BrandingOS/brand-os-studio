/**
 * Subscribe to real-time notification delivery for the current user.
 * Pushes new notifications into the notificationsStore.
 */
import { useEffect } from 'react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useNotificationsStore } from '@/shared/store/notificationsStore';
import { realtimeService } from '@/shared/services/realtime';

export function useRealtimeNotifications() {
  const user = useSessionStore((s) => s.user);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const add = useNotificationsStore((s) => s.add);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const channelName = `notifications:${user.id}`;

    realtimeService.subscribeToTable(
      channelName,
      'notifications',
      `user_id=eq.${user.id}`,
      {
        onInsert: (payload: any) => {
          // Check if already in store
          const store = useNotificationsStore.getState();
          if (store.items.some((n) => n.id === payload.id)) return;

          add({
            type: payload.type,
            title: payload.title,
            body: payload.body,
            href: payload.href,
            brandId: payload.brand_id,
          });
        },
      },
    );

    return () => {
      realtimeService.unsubscribe(channelName);
    };
  }, [isAuthenticated, user?.id, add]);
}
