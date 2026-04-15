import { create } from 'zustand';
import type { Brand } from '@/shared/types/brand';
import type { BentoDesign, BentoTile, SizePresetId, TileContent, TileKind, TileStyle } from './types';
import { TEMPLATES, getTemplate } from './templates';
import { generateTiles } from './shuffle';

function uid() { return Math.random().toString(36).slice(2, 10); }

interface BentoState {
  design: BentoDesign;
  selectedTileId: string | null;
  past: BentoDesign[];
  future: BentoDesign[];

  init: (brand: Brand | null | undefined, initial?: Partial<BentoDesign>) => void;
  setTemplate: (templateId: string, brand: Brand | null | undefined) => void;
  setSize: (id: SizePresetId, custom?: { width: number; height: number }) => void;
  setBackground: (hex: string) => void;
  setGap: (pct: number) => void;
  setRadius: (pct: number) => void;
  setPadding: (pct: number) => void;
  setGridSize: (cols: number, rows: number) => void;
  shuffle: (brand: Brand | null | undefined, mode: 'content' | 'layout+content') => void;
  selectTile: (id: string | null) => void;
  updateTile: (id: string, patch: Partial<BentoTile>) => void;
  updateTileContent: (id: string, patch: Partial<TileContent>) => void;
  updateTileStyle: (id: string, patch: Partial<TileStyle>) => void;
  updateTileGeometry: (id: string, geom: { row: number; col: number; rowSpan: number; colSpan: number }, opts?: { skipHistory?: boolean }) => void;
  beginInteraction: () => void;
  deleteTile: (id: string) => void;
  addTile: (kind: TileKind, brand: Brand | null | undefined) => void;
  addTileAt: (kind: TileKind, pos: { row: number; col: number; rowSpan?: number; colSpan?: number }, brand: Brand | null | undefined) => void;
  duplicateTile: (id: string, brand: Brand | null | undefined) => void;
  setTileKind: (id: string, kind: TileKind, brand: Brand | null | undefined) => void;
  undo: () => void;
  redo: () => void;
}

const DEFAULT_SIZE: SizePresetId = 'square';

function makeDefaultDesign(brand: Brand | null | undefined, overrides?: Partial<BentoDesign>): BentoDesign {
  const templateId = overrides?.templateId ?? TEMPLATES[0].id;
  const tpl = getTemplate(templateId);
  const tiles = overrides?.tiles ?? generateTiles({ brand, template: tpl });
  return {
    id: overrides?.id ?? uid(),
    templateId,
    sizeId: overrides?.sizeId ?? DEFAULT_SIZE,
    customSize: overrides?.customSize,
    tiles,
    backgroundColor: overrides?.backgroundColor ?? '#FFFFFF',
    gap: overrides?.gap ?? 1.2,
    radius: overrides?.radius ?? 2.0,
    padding: overrides?.padding ?? 1.2,
    cols: overrides?.cols ?? tpl.cols,
    rows: overrides?.rows ?? tpl.rows,
    title: overrides?.title,
    isPublic: overrides?.isPublic ?? false,
    createdAt: overrides?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function pushHistory(state: BentoState): Partial<BentoState> {
  const past = [...state.past, state.design].slice(-50);
  return { past, future: [] };
}

export const useBentoStore = create<BentoState>((set, get) => ({
  design: makeDefaultDesign(null),
  selectedTileId: null,
  past: [],
  future: [],

  init: (brand, initial) => {
    set({
      design: makeDefaultDesign(brand, initial),
      selectedTileId: null,
      past: [],
      future: [],
    });
  },

  setTemplate: (templateId, brand) => {
    const tpl = getTemplate(templateId);
    const prev = get().design;
    const history = pushHistory(get());
    set({
      ...history,
      design: {
        ...prev,
        templateId,
        cols: tpl.cols,
        rows: tpl.rows,
        tiles: generateTiles({ brand, template: tpl, preserveTiles: prev.tiles }),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setSize: (id, custom) => {
    const history = pushHistory(get());
    set({
      ...history,
      design: { ...get().design, sizeId: id, customSize: custom, updatedAt: new Date().toISOString() },
    });
  },

  setBackground: (hex) => {
    const history = pushHistory(get());
    set({ ...history, design: { ...get().design, backgroundColor: hex, updatedAt: new Date().toISOString() } });
  },

  setGap: (pct) => {
    set({ design: { ...get().design, gap: pct, updatedAt: new Date().toISOString() } });
  },

  setRadius: (pct) => {
    set({ design: { ...get().design, radius: pct, updatedAt: new Date().toISOString() } });
  },

  setPadding: (pct) => {
    set({ design: { ...get().design, padding: pct, updatedAt: new Date().toISOString() } });
  },

  setGridSize: (cols, rows) => {
    const history = pushHistory(get());
    set({ ...history, design: { ...get().design, cols, rows, updatedAt: new Date().toISOString() } });
  },

  shuffle: (brand, mode) => {
    const prev = get().design;
    const tpl = getTemplate(prev.templateId);
    const history = pushHistory(get());
    set({
      ...history,
      design: {
        ...prev,
        tiles: generateTiles({
          brand,
          template: tpl,
          preserveKinds: mode === 'content',
          preserveTiles: prev.tiles,
          seed: Math.floor(Math.random() * 1e9),
        }),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  selectTile: (id) => set({ selectedTileId: id }),

  updateTile: (id, patch) => {
    const prev = get().design;
    const history = pushHistory(get());
    set({
      ...history,
      design: {
        ...prev,
        tiles: prev.tiles.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateTileContent: (id, patch) => {
    const prev = get().design;
    const history = pushHistory(get());
    set({
      ...history,
      design: {
        ...prev,
        tiles: prev.tiles.map((t) =>
          t.id === id ? { ...t, content: { ...t.content, ...patch } } : t,
        ),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateTileStyle: (id, patch) => {
    const prev = get().design;
    const history = pushHistory(get());
    set({
      ...history,
      design: {
        ...prev,
        tiles: prev.tiles.map((t) =>
          t.id === id ? { ...t, style: { ...t.style, ...patch } } : t,
        ),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateTileGeometry: (id, geom, opts) => {
    const prev = get().design;
    const history = opts?.skipHistory ? {} : pushHistory(get());
    set({
      ...history,
      design: {
        ...prev,
        tiles: prev.tiles.map((t) => (t.id === id ? { ...t, ...geom } : t)),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  beginInteraction: () => {
    // Snapshot current state so a resize/drag gets one undoable entry.
    set(pushHistory(get()));
  },

  deleteTile: (id) => {
    const prev = get().design;
    if (prev.tiles.length <= 1) return;
    const history = pushHistory(get());
    set({
      ...history,
      selectedTileId: null,
      design: {
        ...prev,
        tiles: prev.tiles.filter((t) => t.id !== id),
        updatedAt: new Date().toISOString(),
      },
    });
  },

  addTile: (kind, brand) => {
    const prev = get().design;
    const history = pushHistory(get());
    // Find first empty-ish cell by trying 1,1 with span 1x1.
    const synthetic = generateTiles({
      brand,
      template: { id: 'synth', name: 'synth', cols: 1, rows: 1, tiles: [{ id: uid(), row: 1, col: 1, rowSpan: 1, colSpan: 1, kind }] },
    });
    const newTile: BentoTile = { ...synthetic[0], id: uid() };
    set({
      ...history,
      selectedTileId: newTile.id,
      design: {
        ...prev,
        tiles: [...prev.tiles, newTile],
        updatedAt: new Date().toISOString(),
      },
    });
  },

  addTileAt: (kind, pos, brand) => {
    const prev = get().design;
    const history = pushHistory(get());
    const synthetic = generateTiles({
      brand,
      template: {
        id: 'synth',
        name: 'synth',
        cols: 1,
        rows: 1,
        tiles: [{
          id: uid(),
          row: pos.row,
          col: pos.col,
          rowSpan: pos.rowSpan ?? 1,
          colSpan: pos.colSpan ?? 1,
          kind,
        }],
      },
    });
    const newTile: BentoTile = { ...synthetic[0], id: uid() };
    set({
      ...history,
      selectedTileId: newTile.id,
      design: {
        ...prev,
        tiles: [...prev.tiles, newTile],
        updatedAt: new Date().toISOString(),
      },
    });
  },

  duplicateTile: (id, _brand) => {
    const prev = get().design;
    const source = prev.tiles.find((t) => t.id === id);
    if (!source) return;
    const history = pushHistory(get());
    const newTile: BentoTile = {
      ...source,
      id: uid(),
      row: Math.min(source.row + 1, (prev.rows ?? 99)),
      col: Math.min(source.col + 1, (prev.cols ?? 99)),
    };
    set({
      ...history,
      selectedTileId: newTile.id,
      design: {
        ...prev,
        tiles: [...prev.tiles, newTile],
        updatedAt: new Date().toISOString(),
      },
    });
  },

  setTileKind: (id, kind, brand) => {
    const prev = get().design;
    const history = pushHistory(get());
    // Re-resolve content for the new kind.
    const r = () => Math.random();
    const tiles = prev.tiles.map((t) => {
      if (t.id !== id) return t;
      const { row, col, rowSpan, colSpan } = t;
      // Minimal inline content resolver — defer to generateTiles for consistency.
      const synthetic = generateTiles({
        brand,
        template: { id: 'synth', name: 'synth', cols: 1, rows: 1, tiles: [{ id, row, col, rowSpan, colSpan, kind }] },
      });
      return { ...synthetic[0] };
    });
    set({ ...history, design: { ...prev, tiles, updatedAt: new Date().toISOString() } });
    void r;
  },

  undo: () => {
    const { past, design, future } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({ design: prev, past: past.slice(0, -1), future: [design, ...future].slice(0, 50) });
  },

  redo: () => {
    const { past, design, future } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({ design: next, past: [...past, design].slice(-50), future: future.slice(1) });
  },
}));
