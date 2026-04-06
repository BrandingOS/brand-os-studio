/**
 * Editor Selection Store
 *
 * Tracks the currently selected element inside the slide canvas so the
 * shared ContentInspector knows what to render. Replaces the per-feature
 * inspector pattern (e.g. LogoConceptInspector) with a single source of
 * truth that any surface can read from.
 *
 * Selection types:
 *   - 'text'   → text/heading/paragraph node
 *   - 'image'  → <img> element (logo, photo, asset)
 *   - 'shape'  → div/SVG with brand color fill
 *   - 'slide'  → the whole current slide (no element selected)
 */

import { create } from 'zustand';

export type SelectionType = 'text' | 'image' | 'shape' | 'slide';

export interface SelectedElement {
  /** Surface that owns this selection (e.g. 'logo-presentation', 'brand-guide'). */
  surface: string;
  /** Slide id from SlideData. */
  slideId: string;
  /** DOM element id or data-attr identifier. May be undefined for whole-slide. */
  elementId?: string;
  type: SelectionType;
  /** Live DOM ref (transient — not persisted) */
  el?: HTMLElement | null;
  /** Bounding rect at selection time, used by inspector positioning. */
  rect?: DOMRect;
  /** Arbitrary metadata (text content, image src, etc.) for the inspector to display. */
  data?: Record<string, unknown>;
}

interface SelectionState {
  selected: SelectedElement | null;
  select: (sel: SelectedElement | null) => void;
  clear: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selected: null,
  select: (sel) => set({ selected: sel }),
  clear: () => set({ selected: null }),
}));
