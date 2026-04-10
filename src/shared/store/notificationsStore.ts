/**
 * Notifications store — in-app notification center.
 *
 * localStorage-backed for v1. Will be upgraded to Supabase + Realtime
 * when the notifications table is created.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export type NotificationType =
  | 'comment_reply'
  | 'comment_mention'
  | 'approval_requested'
  | 'approval_approved'
  | 'approval_rejected'
  | 'member_invited'
  | 'brand_shared'
  | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body?: string;
  href?: string;
  brandId?: string;
  read: boolean;
  createdAt: number;
}

interface NotificationsStore {
  items: Notification[];
  unreadCount: () => number;
  add: (input: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useNotificationsStore = create<NotificationsStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],

        unreadCount: () => get().items.filter((n) => !n.read).length,

        add: (input) => {
          const notification: Notification = {
            id: crypto.randomUUID(),
            read: false,
            createdAt: Date.now(),
            ...input,
          };
          set(
            (state) => ({ items: [notification, ...state.items].slice(0, 100) }),
            false,
            'notifications/add',
          );
        },

        markRead: (id) => {
          set(
            (state) => ({
              items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
            }),
            false,
            'notifications/markRead',
          );
        },

        markAllRead: () => {
          set(
            (state) => ({
              items: state.items.map((n) => ({ ...n, read: true })),
            }),
            false,
            'notifications/markAllRead',
          );
        },

        remove: (id) => {
          set(
            (state) => ({ items: state.items.filter((n) => n.id !== id) }),
            false,
            'notifications/remove',
          );
        },

        clear: () => {
          set({ items: [] }, false, 'notifications/clear');
        },
      }),
      { name: 'brandos-notifications' },
    ),
    { name: 'notifications-store' },
  ),
);
