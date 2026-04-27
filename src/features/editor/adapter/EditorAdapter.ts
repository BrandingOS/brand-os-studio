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

  // Layer operations
  addLayer(pageId: string, layer: Layer): void;
  updateLayer(pageId: string, layerId: string, patch: Partial<Layer>): void;
  removeLayer(pageId: string, layerId: string): void;
  reorderLayer(pageId: string, layerId: string, newIndex: number): void;

  // Selection
  getSelection(): SelectionState;
  setSelection(layerIds: string[]): void;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // Export
  exportAs(options: ExportOptions): Promise<Blob>;

  // Events
  on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe;
}
