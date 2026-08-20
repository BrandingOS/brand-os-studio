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
import type { Brand } from '@/shared/types/brand';
import type { DocumentAdapter } from './DocumentAdapter';
export type { DocumentAdapter } from './DocumentAdapter';

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

export interface LayerEditingAdapter extends DocumentAdapter {
  // Page CRUD (Phase 2 — multi-page support)
  addPage(page: Page, index?: number): void;
  removePage(pageId: string): void;
  /**
   * Duplicates a page including its layers (fresh ids), inserts the
   * copy directly after the source in `pages`, returns the new page
   * id. Single undo entry. Used by the PageNavigator's right-click
   * "Duplicate → As-is" action.
   */
  duplicatePage(pageId: string): string;
  /**
   * Step 7 — "Duplicate → As variant". Same insertion + history
   * semantics as duplicatePage, but transforms the layer list so the
   * new page keeps the brand structure (logos, decorative shapes /
   * SVGs, typographic styling) while clearing per-page content
   * (text content cleared to '', images dropped). Empty groups
   * collapse out. See `duplicatePageVariant.ts` for the rule table.
   */
  duplicatePageAsVariant(pageId: string): string;
  /**
   * Step 7 — "Duplicate → Empty". A fresh page with the source's
   * dimensions and master-page binding but zero layers. Single undo
   * entry. Used when the user wants a blank slate that still fits
   * the document's surface.
   */
  duplicatePageEmpty(pageId: string): string;
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
}

/**
 * The layer-editing contract, under its original name.
 *
 * Every existing call site imports `EditorAdapter` and means "the
 * Fabric editor's adapter", which is exactly `LayerEditingAdapter`.
 * Keeping the alias makes this split a no-op for all of them.
 */
export type EditorAdapter = LayerEditingAdapter;
