/**
 * Persistent slide HTML snapshot store
 *
 * Single source of truth for "the last edited HTML of each slide" across
 * the whole app. Survives page reload via Zustand persist middleware.
 *
 * Keyed by `(editorKey, slideId)` — same key shape as the existing
 * useHistory store, so each editor instance (brand-guides-{brandId},
 * logo-pres-{brandId}, social-{brandId}-{platform}, etc.) gets its own
 * isolated snapshot map.
 *
 * Why a separate store from useEditorHistoryStore: history snapshots are
 * per-edit (one entry per change for undo/redo), and clearing them doesn't
 * make sense for "the canonical latest version". This store holds only
 * the LATEST snapshot per slide.
 *
 * Why a separate store from presentationDocsStore: not every editor host
 * has a doc concept (brand-guides doesn't). Using one shared store keyed
 * by editorKey lets every surface adopt this with one prop, no per-surface
 * doc-store integration needed.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SlideSnapshotState {
  /** editorKey -> slideId -> html */
  snapshots: Record<string, Record<string, string>>;

  set: (editorKey: string, slideId: string, html: string) => void;
  get: (editorKey: string, slideId: string) => string | undefined;
  getAllForEditor: (editorKey: string) => Record<string, string>;
  clearSlide: (editorKey: string, slideId: string) => void;
  clearEditor: (editorKey: string) => void;
}

export const useSlideSnapshotStore = create<SlideSnapshotState>()(
  persist(
    (set, get) => ({
      snapshots: {},

      set: (editorKey, slideId, html) =>
        set((state) => ({
          snapshots: {
            ...state.snapshots,
            [editorKey]: {
              ...(state.snapshots[editorKey] || {}),
              [slideId]: html,
            },
          },
        })),

      get: (editorKey, slideId) => get().snapshots[editorKey]?.[slideId],

      getAllForEditor: (editorKey) => get().snapshots[editorKey] || {},

      clearSlide: (editorKey, slideId) =>
        set((state) => {
          const editorMap = { ...(state.snapshots[editorKey] || {}) };
          delete editorMap[slideId];
          return {
            snapshots: { ...state.snapshots, [editorKey]: editorMap },
          };
        }),

      clearEditor: (editorKey) =>
        set((state) => {
          const next = { ...state.snapshots };
          delete next[editorKey];
          return { snapshots: next };
        }),
    }),
    { name: 'slide-snapshots' },
  ),
);
