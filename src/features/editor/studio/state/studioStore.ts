// Studio state.
//
// The old shell mirrored the whole document into `useState` and the
// adapter emits `change` on EVERY Fabric event — every mouse-move frame
// of a drag. So one drag re-rendered a 1000-line component and all of
// its children, dozens of times a second, and reset the autosave timer
// each time. The canvas was fine (Fabric paints itself); React was the
// bottleneck.
//
// Two rules fix it, and they are the whole design of this file:
//
//   1. GEOMETRY DOES NOT FLOW THROUGH REACT DURING A GESTURE. Document
//      updates are coalesced to one per animation frame, so the ceiling
//      is 60 store writes a second instead of one per pointer event.
//   2. COMPONENTS SUBSCRIBE TO SLICES. Selectors return primitives or
//      shallow-comparable shapes, so the pages strip does not re-render
//      because a layer moved 2px.
//
// The store is module-scoped rather than context-provided: the editor is
// a fullscreen route and two never coexist. `resetStudio` runs on mount
// so a second visit never inherits the first one's selection.

import { useCallback, useRef } from 'react';
import { create } from 'zustand';
import type { BrandOSDocument, Layer, Page } from '@/features/editor/schema';

export type RailId =
  | 'brand'
  | 'templates'
  | 'elements'
  | 'text'
  | 'uploads'
  | 'ai'
  | 'layers';

export interface StudioState {
  doc: BrandOSDocument | null;
  activePageId: string;
  editingMasterId: string | null;
  selection: string[];

  /** Viewport — owned here, pushed into the adapter's viewportTransform. */
  zoom: number;
  panX: number;
  panY: number;

  /** Open rail entry, or null when the panel is collapsed. */
  rail: RailId | null;
  /** True while a pointer gesture owns the canvas (drag / resize / pan). */
  interacting: boolean;
  /** Read-only — the viewer has no `designs.edit` capability. */
  readOnly: boolean;

  setDoc: (doc: BrandOSDocument) => void;
  setActivePageId: (id: string) => void;
  setEditingMasterId: (id: string | null) => void;
  setSelection: (ids: string[]) => void;
  setViewport: (v: { zoom?: number; panX?: number; panY?: number }) => void;
  setRail: (rail: RailId | null) => void;
  setInteracting: (interacting: boolean) => void;
  setReadOnly: (readOnly: boolean) => void;
}

const INITIAL = {
  doc: null,
  activePageId: '',
  editingMasterId: null,
  selection: [] as string[],
  zoom: 1,
  panX: 0,
  panY: 0,
  rail: 'brand' as RailId | null,
  interacting: false,
  readOnly: false,
};

export const useStudioStore = create<StudioState>((set) => ({
  ...INITIAL,
  setDoc: (doc) => set({ doc }),
  setActivePageId: (activePageId) => set({ activePageId }),
  setEditingMasterId: (editingMasterId) => set({ editingMasterId }),
  setSelection: (selection) => set({ selection }),
  setViewport: (v) => set((s) => ({ ...s, ...v })),
  setRail: (rail) => set({ rail }),
  setInteracting: (interacting) => set({ interacting }),
  setReadOnly: (readOnly) => set({ readOnly }),
}));

export function resetStudio(): void {
  useStudioStore.setState({ ...INITIAL });
}

// ─── Coalesced document writes ─────────────────────────────────────────

/**
 * Feed an adapter `change` into the store at most once per frame.
 *
 * Returns a disposer that also flushes anything pending, so the last
 * state of a gesture is never dropped on unmount — losing that would
 * lose the final position of whatever the user was dragging when they
 * navigated away.
 */
export function createDocumentSink(
  apply: (doc: BrandOSDocument) => void,
): { push: (doc: BrandOSDocument) => void; dispose: () => void } {
  let pending: BrandOSDocument | null = null;
  let frame: number | null = null;

  const flush = () => {
    frame = null;
    const doc = pending;
    pending = null;
    if (doc) apply(doc);
  };

  return {
    push(doc) {
      pending = doc;
      if (frame !== null) return;
      frame =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame(flush)
          : (setTimeout(flush, 16) as unknown as number);
    },
    dispose() {
      if (frame !== null) {
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
        else clearTimeout(frame as unknown as NodeJS.Timeout);
        frame = null;
      }
      flush();
    },
  };
}

// ─── Shallow selection ─────────────────────────────────────────────────
//
// zustand 5 compares with Object.is, so a selector that builds an array
// or object returns a new reference every time the store changes and
// re-renders its component on every frame of a drag — exactly what this
// file exists to prevent.
//
// `useShallowStudio` keeps the previous result and returns THAT when the
// new one is shallow-equal, so Object.is passes and zustand bails out.
// Written here rather than imported from `zustand/react/shallow`
// because that entry point is pre-bundled by Vite as its own dependency
// chunk, which loads a second copy of React and every hook inside it
// throws "Invalid hook call".

function shallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  return ka.every(
    (k) =>
      Object.prototype.hasOwnProperty.call(b, k) &&
      Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

/**
 * One level deeper than shallow: for a list of records, compare the
 * records' own fields. A page-summary array is rebuilt on every store
 * write, so a plain shallow compare of the ARRAY never matches.
 */
function listEqual(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return shallowEqual(a, b);
  if (a.length !== b.length) return false;
  return a.every((item, i) => shallowEqual(item, b[i]));
}

export function useShallowStudio<T>(select: (s: StudioState) => T): T {
  const prev = useRef<{ value: T } | null>(null);
  const stable = useCallback(
    (s: StudioState): T => {
      const next = select(s);
      if (prev.current && listEqual(prev.current.value, next)) return prev.current.value;
      prev.current = { value: next };
      return next;
    },
    // The caller passes an inline selector, so it is a new function on
    // every render by design; the cache lives in the ref, not here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return useStudioStore(stable);
}

// ─── Selectors ─────────────────────────────────────────────────────────
//
// Every hook below exists so a component can subscribe to the smallest
// thing it actually renders. Reaching for `useStudioStore(s => s.doc)`
// in a component re-renders it on every frame of every drag, which is
// the exact problem this file was written to remove.

export function useActivePage(): Page | null {
  return useStudioStore((s) => {
    if (!s.doc) return null;
    if (s.editingMasterId) {
      return s.doc.masterPages.find((p) => p.id === s.editingMasterId) ?? null;
    }
    return s.doc.pages.find((p) => p.id === s.activePageId) ?? s.doc.pages[0] ?? null;
  });
}

export interface PageSummary {
  id: string;
  name: string;
  width: number;
  height: number;
  layerCount: number;
}

/**
 * The pages strip's data.
 *
 * Shallow-compared on a flat array of primitives, so moving a layer
 * re-renders nothing here: `layerCount` only changes when a layer is
 * added or removed.
 */
export function usePageSummaries(): PageSummary[] {
  return useShallowStudio((s) =>
    (s.doc?.pages ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      width: p.width,
      height: p.height,
      layerCount: p.layers.length,
    })),
  );
}

/** The selected layers, in paint order. */
export function useSelectedLayers(): Layer[] {
  // NOT shallow-compared by identity: a layer object is rebuilt on
  // every emit, so the list only settles when the CONTENT settles —
  // which is what the context bar needs, since it renders live values
  // while a drag is in flight.
  return useShallowStudio((s) => {
    const page = activePageOf(s);
    if (!page || s.selection.length === 0) return [];
    const wanted = new Set(s.selection);
    return page.layers.filter((l) => wanted.has(l.id));
  });
}

/** The single selected layer, or null for none / many. */
export function useSelectedLayer(): Layer | null {
  const layers = useSelectedLayers();
  return layers.length === 1 ? layers[0] : null;
}

export function useSelectionCount(): number {
  return useStudioStore((s) => s.selection.length);
}

export function useViewport(): { zoom: number; panX: number; panY: number } {
  return useShallowStudio((s) => ({ zoom: s.zoom, panX: s.panX, panY: s.panY }));
}

export function activePageOf(s: StudioState): Page | null {
  if (!s.doc) return null;
  if (s.editingMasterId) {
    return s.doc.masterPages.find((p) => p.id === s.editingMasterId) ?? null;
  }
  return s.doc.pages.find((p) => p.id === s.activePageId) ?? s.doc.pages[0] ?? null;
}

/** Non-reactive read, for event handlers that must not subscribe. */
export function readStudio(): StudioState {
  return useStudioStore.getState();
}
