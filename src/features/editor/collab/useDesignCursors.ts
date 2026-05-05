// Phase 7.3 — Multiplayer cursor sync.
//
// One Supabase Realtime broadcast channel per (brand, design). Each
// peer sends its CURRENT cursor at a throttled cadence; receivers keep
// a map keyed by userId of {x, y, pageId, name, color, lastSeen} and
// expose it for an overlay to render.
//
// Coordinates are PAGE-RELATIVE (0..1 inside the active page) so peers
// at different zoom/pan see each other accurately. Send is throttled
// to 33ms (~30 Hz) to keep the channel under Supabase's 200 msg/sec
// per-channel limit when multiple peers are active.
//
// Stale entries are pruned automatically — if we haven't heard from a
// peer for >5s they're considered "left" and disappear from the
// overlay.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSessionStore } from '@/shared/store/sessionStore';
import { realtimeService } from '@/shared/services/realtime';

export interface CursorState {
  userId: string;
  name: string;
  color: string;
  pageId: string;
  /** Page-relative x in [0, 1]. */
  x: number;
  /** Page-relative y in [0, 1]. */
  y: number;
  /** Wall-clock ms when this cursor was last received. */
  lastSeen: number;
}

const SEND_THROTTLE_MS = 33;       // ~30 Hz
const STALE_TTL_MS = 5_000;        // prune cursors silent > 5s
const PRUNE_INTERVAL_MS = 1_000;

const COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316',
];

/** Stable per-user color so the same person always gets the same hue. */
function colorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

interface UseDesignCursorsResult {
  /** Other users' cursors keyed by userId. Self is excluded. */
  others: CursorState[];
  /** Stable color the local user is broadcasting (used by the overlay
   *  if you want to show your own pointer in the same hue). */
  selfColor: string | null;
  /** Send the local cursor position (page-relative coords). Throttled
   *  internally — call as often as you like. */
  sendCursor: (pageId: string, x: number, y: number) => void;
}

export function useDesignCursors(
  brandId: string | null | undefined,
  designId: string | null | undefined,
): UseDesignCursorsResult {
  const user = useSessionStore((s) => s.user);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const [others, setOthers] = useState<Map<string, CursorState>>(new Map());

  const selfColor = user ? colorForUser(user.id) : null;
  const channelName =
    brandId && designId ? `cursors:${brandId}:design:${designId}` : null;

  const lastSentAtRef = useRef(0);
  const pendingRef = useRef<{ pageId: string; x: number; y: number } | null>(
    null,
  );
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to the channel.
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !channelName) return;
    realtimeService.joinBroadcast<CursorState>(channelName, 'cursor', (msg) => {
      if (msg.userId === user.id) return; // self-echo guard
      setOthers((prev) => {
        const next = new Map(prev);
        next.set(msg.userId, { ...msg, lastSeen: Date.now() });
        return next;
      });
    });
    return () => {
      realtimeService.unsubscribe(channelName);
    };
  }, [channelName, isAuthenticated, user?.id]);

  // Periodically prune stale cursors so disconnected peers fade out.
  useEffect(() => {
    if (!channelName) return;
    const id = setInterval(() => {
      const cutoff = Date.now() - STALE_TTL_MS;
      setOthers((prev) => {
        let mutated = false;
        const next = new Map(prev);
        for (const [k, v] of prev) {
          if (v.lastSeen < cutoff) {
            next.delete(k);
            mutated = true;
          }
        }
        return mutated ? next : prev;
      });
    }, PRUNE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [channelName]);

  const sendCursor = useCallback(
    (pageId: string, x: number, y: number) => {
      if (!channelName || !user?.id || !selfColor) return;
      pendingRef.current = { pageId, x, y };
      const now = Date.now();
      const elapsed = now - lastSentAtRef.current;
      if (elapsed >= SEND_THROTTLE_MS) {
        flushSend();
      } else if (!sendTimerRef.current) {
        sendTimerRef.current = setTimeout(() => {
          sendTimerRef.current = null;
          flushSend();
        }, SEND_THROTTLE_MS - elapsed);
      }

      function flushSend() {
        const p = pendingRef.current;
        if (!p) return;
        pendingRef.current = null;
        lastSentAtRef.current = Date.now();
        const payload: CursorState = {
          userId: user!.id,
          name: user!.name,
          color: selfColor!,
          pageId: p.pageId,
          x: p.x,
          y: p.y,
          lastSeen: Date.now(),
        };
        realtimeService.broadcast(channelName!, 'cursor', payload);
      }
    },
    [channelName, user?.id, user?.name, selfColor],
  );

  // Cleanup pending timers on unmount.
  useEffect(
    () => () => {
      if (sendTimerRef.current) {
        clearTimeout(sendTimerRef.current);
        sendTimerRef.current = null;
      }
    },
    [],
  );

  return {
    others: Array.from(others.values()),
    selfColor,
    sendCursor,
  };
}
