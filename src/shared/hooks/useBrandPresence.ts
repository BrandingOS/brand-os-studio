/**
 * Track who's currently viewing a brand page via Supabase Presence.
 */
import { useEffect, useState } from 'react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { realtimeService } from '@/shared/services/realtime';

interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl?: string;
}

export function useBrandPresence(brandId: string, pageKey?: string) {
  const user = useSessionStore((s) => s.user);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const [activeUsers, setActiveUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !brandId) return;

    const channelName = `presence:${brandId}${pageKey ? `:${pageKey}` : ''}`;

    realtimeService.joinPresence(
      channelName,
      {
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatar,
      },
      (users) => {
        // Filter out current user
        setActiveUsers(users.filter((u) => u.userId !== user.id));
      },
    );

    return () => {
      realtimeService.unsubscribe(channelName);
    };
  }, [isAuthenticated, user?.id, user?.name, user?.avatar, brandId, pageKey]);

  return activeUsers;
}
