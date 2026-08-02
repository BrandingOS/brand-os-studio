/**
 * Persisted history store for the slide editor.
 *
 * Stores edit snapshots per (editorKey, slideId) so:
 * - Edits survive page reloads
 * - Undo/redo works across sessions
 * - Users can jump to any past snapshot via the History panel
 *
 * The current snapshot is the "live" state of that slide. Pushing a new
 * snapshot when not at the end of history truncates the redo branch.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Snapshot {
  html: string;
  timestamp: number;
  label?: string;
}

export interface SlideHistory {
  snapshots: Snapshot[];
  currentIndex: number;
}

// Hard cap per slide to keep localStorage manageable
const MAX_SNAPSHOTS = 50;

interface HistoryState {
  /** editorKey → slideId → SlideHistory */
  data: Record<string, Record<string, SlideHistory>>;

  pushSnapshot: (editorKey: string, slideId: string, html: string, label?: string) => void;
  undo: (editorKey: string, slideId: string) => Snapshot | null;
  redo: (editorKey: string, slideId: string) => Snapshot | null;
  jumpTo: (editorKey: string, slideId: string, index: number) => Snapshot | null;
  getHistory: (editorKey: string, slideId: string) => SlideHistory | undefined;
  getCurrentSnapshot: (editorKey: string, slideId: string) => Snapshot | null;
  canUndo: (editorKey: string, slideId: string) => boolean;
  canRedo: (editorKey: string, slideId: string) => boolean;
  clearSlide: (editorKey: string, slideId: string) => void;
  clearEditor: (editorKey: string) => void;
}

export const useEditorHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      data: {},

      pushSnapshot: (editorKey, slideId, html, label) =>
        set((state) => {
          const editorData = state.data[editorKey] || {};
          const slideHistory = editorData[slideId] || { snapshots: [], currentIndex: -1 };

          // Avoid duplicate snapshots
          const last = slideHistory.snapshots[slideHistory.currentIndex];
          if (last && last.html === html) return state;

          // If we are not at the end (user undid then made an edit), drop the redo branch
          const truncated = slideHistory.snapshots.slice(0, slideHistory.currentIndex + 1);

          // Append new snapshot
          truncated.push({ html, timestamp: Date.now(), label });

          // Cap to MAX_SNAPSHOTS
          const trimmed = truncated.length > MAX_SNAPSHOTS
            ? truncated.slice(truncated.length - MAX_SNAPSHOTS)
            : truncated;

          const newSlideHistory: SlideHistory = {
            snapshots: trimmed,
            currentIndex: trimmed.length - 1,
          };

          return {
            data: {
              ...state.data,
              [editorKey]: {
                ...editorData,
                [slideId]: newSlideHistory,
              },
            },
          };
        }),

      undo: (editorKey, slideId) => {
        const slideHistory = get().data[editorKey]?.[slideId];
        if (!slideHistory || slideHistory.currentIndex <= 0) return null;
        const newIndex = slideHistory.currentIndex - 1;
        set((state) => ({
          data: {
            ...state.data,
            [editorKey]: {
              ...state.data[editorKey],
              [slideId]: { ...slideHistory, currentIndex: newIndex },
            },
          },
        }));
        return slideHistory.snapshots[newIndex];
      },

      redo: (editorKey, slideId) => {
        const slideHistory = get().data[editorKey]?.[slideId];
        if (!slideHistory || slideHistory.currentIndex >= slideHistory.snapshots.length - 1) return null;
        const newIndex = slideHistory.currentIndex + 1;
        set((state) => ({
          data: {
            ...state.data,
            [editorKey]: {
              ...state.data[editorKey],
              [slideId]: { ...slideHistory, currentIndex: newIndex },
            },
          },
        }));
        return slideHistory.snapshots[newIndex];
      },

      jumpTo: (editorKey, slideId, index) => {
        const slideHistory = get().data[editorKey]?.[slideId];
        if (!slideHistory) return null;
        if (index < 0 || index >= slideHistory.snapshots.length) return null;
        set((state) => ({
          data: {
            ...state.data,
            [editorKey]: {
              ...state.data[editorKey],
              [slideId]: { ...slideHistory, currentIndex: index },
            },
          },
        }));
        return slideHistory.snapshots[index];
      },

      getHistory: (editorKey, slideId) => get().data[editorKey]?.[slideId],

      getCurrentSnapshot: (editorKey, slideId) => {
        const sh = get().data[editorKey]?.[slideId];
        if (!sh || sh.currentIndex < 0) return null;
        return sh.snapshots[sh.currentIndex] || null;
      },

      canUndo: (editorKey, slideId) => {
        const sh = get().data[editorKey]?.[slideId];
        return !!sh && sh.currentIndex > 0;
      },

      canRedo: (editorKey, slideId) => {
        const sh = get().data[editorKey]?.[slideId];
        return !!sh && sh.currentIndex < sh.snapshots.length - 1;
      },

      clearSlide: (editorKey, slideId) =>
        set((state) => {
          const editorData = state.data[editorKey];
          if (!editorData) return state;
          const { [slideId]: _, ...rest } = editorData;
          return { data: { ...state.data, [editorKey]: rest } };
        }),

      clearEditor: (editorKey) =>
        set((state) => {
          const { [editorKey]: _, ...rest } = state.data;
          return { data: rest };
        }),
    }),
    {
      name: 'editor-history',
      // Undo history is full HTML per snapshot, so it grows fast: unbounded,
      // it reached 1.5 MB of a ~5 MB localStorage budget and starved the rest
      // of the app (brands then failed to save at all). Persist a recent
      // working set only — deep history is a nice-to-have, saving is not.
      // In-memory state keeps the full MAX_SNAPSHOTS for the live session.
      partialize: (state) => ({
        data: capPersistedHistory(state.data),
      }),
    },
  ),
);

/** How much history survives a reload (the live session keeps more). */
const PERSISTED_SNAPSHOTS_PER_SLIDE = 8;
const PERSISTED_SLIDES_PER_EDITOR = 12;
const PERSISTED_EDITORS = 4;

/** Trim the history tree to a recent working set before it hits storage. */
export function capPersistedHistory(
  data: Record<string, Record<string, SlideHistory>>,
): Record<string, Record<string, SlideHistory>> {
  const lastTouched = (slides: Record<string, SlideHistory>) =>
    Math.max(
      0,
      ...Object.values(slides).flatMap((h) => h.snapshots.map((s) => s.timestamp || 0)),
    );

  const editors = Object.entries(data)
    .sort((a, b) => lastTouched(b[1]) - lastTouched(a[1]))
    .slice(0, PERSISTED_EDITORS);

  const out: Record<string, Record<string, SlideHistory>> = {};
  for (const [editorKey, slides] of editors) {
    const kept = Object.entries(slides)
      .sort(
        (a, b) =>
          (b[1].snapshots.at(-1)?.timestamp ?? 0) - (a[1].snapshots.at(-1)?.timestamp ?? 0),
      )
      .slice(0, PERSISTED_SLIDES_PER_EDITOR);

    const slideOut: Record<string, SlideHistory> = {};
    for (const [slideId, history] of kept) {
      // Keep the tail — the newest snapshots, with the current one included.
      const start = Math.max(0, history.snapshots.length - PERSISTED_SNAPSHOTS_PER_SLIDE);
      const snapshots = history.snapshots.slice(start);
      slideOut[slideId] = {
        snapshots,
        currentIndex: Math.max(0, Math.min(history.currentIndex - start, snapshots.length - 1)),
      };
    }
    out[editorKey] = slideOut;
  }
  return out;
}
