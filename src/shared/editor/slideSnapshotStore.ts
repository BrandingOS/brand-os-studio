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
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStringStorage } from './idbStorage';

// One-time cleanup: the previous version persisted to localStorage and
// blew the 5 MB quota when slides contained inlined image data URLs.
// Drop the old key so freed space stays freed. Safe to call repeatedly.
try {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('slide-snapshots');
  }
} catch { /* ignore — private mode, etc. */ }

interface SlideSnapshotState {
  /** editorKey -> slideId -> html */
  snapshots: Record<string, Record<string, string>>;
  /** editorKey -> last viewed slide index (so reload returns to the same page) */
  currentSlideIndex: Record<string, number>;
  /**
   * True once Zustand persist has finished loading state from IndexedDB.
   * Consumers must NOT capture or freeze slides until this is true,
   * otherwise the freshly-rendered template will overwrite the saved
   * snapshot before it's read back.
   */
  hasHydrated: boolean;

  set: (editorKey: string, slideId: string, html: string) => void;
  get: (editorKey: string, slideId: string) => string | undefined;
  getAllForEditor: (editorKey: string) => Record<string, string>;
  clearSlide: (editorKey: string, slideId: string) => void;
  clearEditor: (editorKey: string) => void;

  setCurrentSlideIndex: (editorKey: string, index: number) => void;
  getCurrentSlideIndex: (editorKey: string) => number;

  _setHasHydrated: (v: boolean) => void;
}

export const useSlideSnapshotStore = create<SlideSnapshotState>()(
  persist(
    (set, get) => ({
      snapshots: {},
      currentSlideIndex: {},
      hasHydrated: false,

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
          const idx = { ...state.currentSlideIndex };
          delete idx[editorKey];
          return { snapshots: next, currentSlideIndex: idx };
        }),

      setCurrentSlideIndex: (editorKey, index) =>
        set((state) => ({
          currentSlideIndex: { ...state.currentSlideIndex, [editorKey]: index },
        })),

      getCurrentSlideIndex: (editorKey) => get().currentSlideIndex[editorKey] ?? 0,

      _setHasHydrated: (v) => set({ hasHydrated: v }),
    }),
    {
      name: 'slide-snapshots',
      // Use IndexedDB instead of localStorage — slide HTML snapshots can
      // include inlined logo data URLs that blow the 5 MB localStorage
      // quota. IDB has dramatically more room and is async-safe.
      storage: createJSONStorage(() => idbStringStorage),
      // Persist only the data fields, not the hydration flag itself
      partialize: (s) => ({ snapshots: s.snapshots, currentSlideIndex: s.currentSlideIndex } as any),
      onRehydrateStorage: () => (state) => {
        // Called once IDB read completes (success or failure). Flip the
        // flag so consumers know it's safe to read snapshots and freeze.
        state?._setHasHydrated(true);
      },
    },
  ),
);
