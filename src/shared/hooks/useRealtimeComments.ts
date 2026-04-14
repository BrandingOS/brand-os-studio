/**
 * Subscribe to real-time comment changes for a brand+page.
 * Merges incoming comments into the commentsStore.
 */
import { useEffect } from 'react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useCommentsStore } from '@/features/comments/commentsStore';
import { realtimeService } from '@/shared/services/realtime';

export function useRealtimeComments(brandId: string, pageKey: string) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const add = useCommentsStore((s) => s.add);

  useEffect(() => {
    if (!isAuthenticated || !brandId || !pageKey) return;

    const channelName = `comments:${brandId}:${pageKey}`;

    realtimeService.subscribeToTable(
      channelName,
      'comments',
      `brand_id=eq.${brandId}`,
      {
        onInsert: (payload: any) => {
          // Only add if it's for our page and not already in store
          if (payload.page_key !== pageKey) return;
          const store = useCommentsStore.getState();
          if (store.comments[payload.id]) return; // Already have it

          add({
            threadId: payload.thread_id,
            brandId: payload.brand_id,
            pageKey: payload.page_key,
            anchor: payload.anchor,
            author: payload.author_name,
            authorEmail: payload.author_email,
            body: payload.body,
            parentId: payload.parent_id,
            resolved: payload.resolved,
          });
        },
      },
    );

    return () => {
      realtimeService.unsubscribe(channelName);
    };
  }, [isAuthenticated, brandId, pageKey, add]);
}
