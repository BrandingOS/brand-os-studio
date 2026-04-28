// EditorAdapter — the boundary between the editor shell and Fabric.js.
//
// The rest of BrandOS (brand engine, AI, templates, content-type configs)
// MUST NOT import from `fabric` directly; everything goes through this
// interface. The lint guard in `eslint.config.js` enforces it.
//
// Implementation lives in `./FabricAdapter.ts` (Phase 1). This file is
// the contract — keep it stable, keep it small, keep it free of any
// canvas-implementation detail (no x/y math, no Fabric types leaking).

import type { BrandOSDocument, Layer, Page } from '@/features/editor/schema';

export interface SelectionState {
  layerIds: string[];
  pageId: string;
}

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'svg';
  /** 1 = native, 2 = retina. */
  scale?: number;
  /** Undefined = all pages. */
  pageIds?: string[];
  /** 0–1 for jpg only. */
  quality?: number;
}

/**
 * Result returned by `applyLayerPatchAcrossPages`. Tells callers
 * (UI or AI) what actually changed, so they can confirm to the user
 * (e.g. "Updated 4 headlines across 3 pages").
 */
export interface ApplyLayerPatchAcrossPagesResult {
  /** Ids of layers whose properties were patched. */
  mutatedLayerIds: string[];
  /** Ids of pages that contained at least one mutated layer. */
  affectedPageIds: string[];
}

export type EditorEvent = 'change' | 'selection';
export type EditorEventHandler<E extends EditorEvent> = E extends 'change'
  ? (doc: BrandOSDocument) => void
  : (sel: SelectionState) => void;

/** Returned by `on(...)` so callers can detach a listener. */
export type Unsubscribe = () => void;

export interface EditorAdapter {
  // Lifecycle
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;

  // Document
  loadDocument(doc: BrandOSDocument): Promise<void>;
  getDocument(): BrandOSDocument;

  // Page navigation
  setActivePage(pageId: string): void;
  getActivePageId(): string;

  // Page CRUD (Phase 2 — multi-page support)
  addPage(page: Page, index?: number): void;
  removePage(pageId: string): void;
  /** Duplicates a page including its layers (fresh ids); returns the new page id. */
  duplicatePage(pageId: string): string;
  reorderPage(pageId: string, newIndex: number): void;
  updatePageDimensions(pageId: string, width: number, height: number): void;

  // Master pages (Phase 2 — PowerPoint-style template inheritance)
  addMasterPage(master: Page): void;
  removeMasterPage(masterId: string): void;
  /** Pass `null` to detach. */
  applyMasterToPage(pageId: string, masterId: string | null): void;
  /**
   * Enter "Edit Master" mode: the canvas swaps to the master's own
   * layers as if the master were a regular page, allowing direct
   * edits. Calling `setActivePage` while in master mode exits it.
   */
  enterMasterMode(masterId: string): void;
  exitMasterMode(): void;
  /** Returns the master being edited, or null when in normal mode. */
  getEditingMasterId(): string | null;

  /**
   * Replace the entire document with a new one, preserving the
   * undo history (unlike `loadDocument`, which RESETS history).
   *
   * Used when bulk-transforming the document — re-applying a brand
   * kit (Step 5b), AI batch edits, cross-page propagation that's
   * easier to compute as a new doc than as a sequence of patches.
   *
   * Wrap in `batch(label, () => replaceDocument(next))` to make the
   * replace appear as a single labeled undo step. Outside a batch,
   * the replace commits one history entry on its own.
   *
   * The active page id is preserved when the replacement still
   * contains a page with the same id; otherwise it falls back to
   * the first page in the new document.
   */
  replaceDocument(doc: BrandOSDocument): Promise<void>;

  // Layer operations
  addLayer(pageId: string, layer: Layer): void;
  updateLayer(pageId: string, layerId: string, patch: Partial<Layer>): void;
  removeLayer(pageId: string, layerId: string): void;
  reorderLayer(pageId: string, layerId: string, newIndex: number): void;

  /**
   * Cross-page bulk mutation: walk every layer in `doc.pages` (NOT
   * master pages), apply `patch` to layers where `predicate` returns
   * true, and commit the entire set as a single batch (one undo
   * entry, one change event, labeled with `batchLabel`).
   *
   * Used by:
   *   • Phase 3 step 6 — the cross-page Sonner prompt's
   *     "Apply to all N pages" / "Similar layers only on this page"
   *     actions. The Sonner constructs the predicate from the
   *     reference layer's SlotRef + property.
   *   • Phase 3.5 AI Mode 3 — natural-language commands like
   *     "change all headlines to the accent color" parse into a
   *     predicate + patch + label and call this directly.
   *
   * Returns the layer ids that actually mutated and the page ids
   * affected, so callers (UI or AI) can confirm to the user what
   * changed. When `predicate` matches no layers, the function is a
   * no-op: no batch, no change event, no undo entry — and the
   * returned arrays are empty.
   *
   * Master pages are intentionally excluded from the search, matching
   * `findSimilarLayers`'s scope rule. Master-layer edits propagate
   * through the master overlay rendering, which is a separate
   * propagation model.
   *
   * Group children ARE recursed (predicate is called for every layer
   * in the tree, not just top-level page layers).
   */
  applyLayerPatchAcrossPages(
    predicate: (layer: Layer, pageId: string) => boolean,
    patch: Partial<Layer>,
    batchLabel: string,
  ): ApplyLayerPatchAcrossPagesResult;

  // Selection
  getSelection(): SelectionState;
  setSelection(layerIds: string[]): void;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /**
   * Run `fn` with per-mutation history snapshots and change events
   * suppressed. After `fn` returns, ONE snapshot is taken (with the
   * given label) and ONE change event fires. Used for any mutation
   * sequence that should be a single undo entry — re-applying a
   * brand kit, AI deltas, cross-page propagation, smart duplicate.
   *
   * The label surfaces in any future undo-history UI ("AI: convert
   * to social posts" rather than "Step 47"). Nesting is supported:
   * inner batches are silently absorbed by the outer batch.
   *
   * Errors thrown inside `fn` propagate, but the batch state is
   * cleaned up so subsequent mutations behave normally.
   */
  batch(label: string, fn: () => void): void;

  // Export
  exportAs(options: ExportOptions): Promise<Blob>;

  // Events
  on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe;
}
