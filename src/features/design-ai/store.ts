/**
 * Design-with-AI — canvas state.
 *
 * Tool state, selection, and a thin snapshot-based history so we can undo/redo
 * any mutation from the toolbar, inspector, or AI. Fabric itself owns the
 * authoritative object state; snapshots are JSON strings of `canvas.toJSON()`.
 */
import { create } from 'zustand';

export type ToolId = 'select' | 'text' | 'rect' | 'ellipse' | 'line' | 'frame' | 'image';

interface DesignAiState {
  brandSlug: string | null;
  tool: ToolId;
  selectedIds: string[];
  past: string[];
  future: string[];
  zoom: number;
  isGenerating: boolean;
}

interface DesignAiActions {
  init: (brandSlug: string) => void;
  setTool: (tool: ToolId) => void;
  setSelected: (ids: string[]) => void;
  pushHistory: (snapshot: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  setZoom: (zoom: number) => void;
  setGenerating: (g: boolean) => void;
}

const HISTORY_CAP = 50;

export const useDesignAiStore = create<DesignAiState & DesignAiActions>((set, get) => ({
  brandSlug: null,
  tool: 'select',
  selectedIds: [],
  past: [],
  future: [],
  zoom: 1,
  isGenerating: false,

  init: (brandSlug) =>
    set((s) =>
      s.brandSlug === brandSlug
        ? s
        : {
            brandSlug,
            tool: 'select',
            selectedIds: [],
            past: [],
            future: [],
            zoom: 1,
            isGenerating: false,
          },
    ),
  setTool: (tool) => set({ tool }),
  setSelected: (selectedIds) => set({ selectedIds }),
  pushHistory: (snapshot) =>
    set((s) => {
      const last = s.past[s.past.length - 1];
      if (last === snapshot) return s;
      const past = [...s.past, snapshot].slice(-HISTORY_CAP);
      return { past, future: [] };
    }),
  undo: () => {
    const { past, future } = get();
    if (past.length < 2) return null;
    const current = past[past.length - 1];
    const prev = past[past.length - 2];
    set({ past: past.slice(0, -1), future: [current, ...future].slice(0, HISTORY_CAP) });
    return prev;
  },
  redo: () => {
    const { past, future } = get();
    if (!future.length) return null;
    const [next, ...rest] = future;
    set({ past: [...past, next].slice(-HISTORY_CAP), future: rest });
    return next;
  },
  setZoom: (zoom) => set({ zoom }),
  setGenerating: (isGenerating) => set({ isGenerating }),
}));
