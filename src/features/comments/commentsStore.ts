/**
 * Comments store — threaded comments per (brandId, pageKey, anchor).
 *
 * pageKey is a stable identifier for the surface ("guidelines", "assets",
 * "blocks/<docId>"). anchor is an optional element id for pinning to a
 * specific block. localStorage-backed for v1.
 */
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface Comment {
  id: string;
  threadId: string;
  brandId: string;
  pageKey: string;
  anchor?: string;
  author: string;
  authorEmail?: string;
  body: string;
  createdAt: number;
  resolved?: boolean;
  parentId?: string;
}

interface CommentsStore {
  comments: Record<string, Comment>;
  threadsForPage: (brandId: string, pageKey: string) => Comment[][];
  forAnchor: (brandId: string, pageKey: string, anchor: string) => Comment[];
  countForPage: (brandId: string, pageKey: string) => number;
  add: (input: Omit<Comment, 'id' | 'createdAt'>) => Comment;
  resolve: (threadId: string) => void;
  reopen: (threadId: string) => void;
  remove: (id: string) => void;
}

export const useCommentsStore = create<CommentsStore>()(
  devtools(
    persist(
      (set, get) => ({
        comments: {},

        threadsForPage: (brandId, pageKey) => {
          const all = Object.values(get().comments).filter((c) => c.brandId === brandId && c.pageKey === pageKey);
          // Group by threadId
          const map: Record<string, Comment[]> = {};
          for (const c of all) {
            if (!map[c.threadId]) map[c.threadId] = [];
            map[c.threadId].push(c);
          }
          return Object.values(map).map((arr) => arr.sort((a, b) => a.createdAt - b.createdAt));
        },

        forAnchor: (brandId, pageKey, anchor) =>
          Object.values(get().comments)
            .filter((c) => c.brandId === brandId && c.pageKey === pageKey && c.anchor === anchor)
            .sort((a, b) => a.createdAt - b.createdAt),

        countForPage: (brandId, pageKey) =>
          Object.values(get().comments).filter((c) => c.brandId === brandId && c.pageKey === pageKey && !c.resolved).length,

        add: (input) => {
          const c: Comment = { id: crypto.randomUUID(), createdAt: Date.now(), ...input };
          set((state) => ({ comments: { ...state.comments, [c.id]: c } }), false, 'comments/add');
          return c;
        },

        resolve: (threadId) => {
          set(
            (state) => {
              const next = { ...state.comments };
              for (const id of Object.keys(next)) {
                if (next[id].threadId === threadId) {
                  next[id] = { ...next[id], resolved: true };
                }
              }
              return { comments: next };
            },
            false,
            'comments/resolve',
          );
        },

        reopen: (threadId) => {
          set(
            (state) => {
              const next = { ...state.comments };
              for (const id of Object.keys(next)) {
                if (next[id].threadId === threadId) {
                  next[id] = { ...next[id], resolved: false };
                }
              }
              return { comments: next };
            },
            false,
            'comments/reopen',
          );
        },

        remove: (id) => {
          set(
            (state) => {
              const next = { ...state.comments };
              delete next[id];
              return { comments: next };
            },
            false,
            'comments/remove',
          );
        },
      }),
      { name: 'brandos-v5-comments' },
    ),
    { name: 'comments-store' },
  ),
);
