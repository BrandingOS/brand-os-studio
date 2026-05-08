// FabricAdapter — Phase 1 implementation.
//
// Wraps Fabric.js v6 behind the EditorAdapter interface. The adapter
// owns the Canvas and a mirror `BrandOSDocument` that's kept in sync
// with on-canvas mutations. The mirror is the source of truth at
// runtime; Fabric's internal state is implementation detail. External
// callers observe via `on('change', ...)` and read via `getDocument()`.
//
// Single-page scope for Phase 1. Multi-page + master pages land in Phase 2.

import {
  Canvas,
  Line,
  Textbox,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric';

import type {
  BrandOSDocument,
  Layer,
  Page,
  TextLayer,
} from '@/features/editor/schema';

// node-side crypto.randomUUID is enough for our test/dev uses; in browsers
// crypto.randomUUID is a standard global. Wrapped here so the adapter can
// be used in either environment without a polyfill import.
const newUuid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
        .toString(36)
        .slice(2)}`;
import type {
  ApplyLayerPatchAcrossPagesResult,
  EditorAdapter,
  EditorEvent,
  EditorEventHandler,
  ExportOptions,
  SelectionState,
  Unsubscribe,
} from './EditorAdapter';
import type { GroupLayer, SlotRef } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import { HistoryRing } from './historyRing';
import {
  applyLayerToFabric,
  fabricToTransform,
  findLayer,
  getLayerId,
  layerToFabric,
  renderPage,
  SELECTION_BORDER_COLOR,
  SELECTION_MARQUEE_FILL,
} from './layerMapping';
import { transformLayersForVariant } from './duplicatePageVariant';
import { computeSnap, SNAP_THRESHOLD_PX, type BBox } from './snapGuides';

const DEFAULT_PAGE_WIDTH = 1080;
const DEFAULT_PAGE_HEIGHT = 1080;

type ChangeHandler = (doc: BrandOSDocument) => void;
type SelectionHandler = (sel: SelectionState) => void;

export class FabricAdapter implements EditorAdapter {
  private canvas: Canvas | null = null;
  private container: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  /** Mirror of the document — runtime source of truth. */
  private doc: BrandOSDocument | null = null;
  private activePageId: string | null = null;
  /** Master id when "Edit Master" mode is active. Null otherwise. */
  private editingMasterId: string | null = null;

  /** Map from layer id to its current Fabric representation on the canvas. */
  private fabricByLayerId = new Map<string, FabricObject>();

  /**
   * Active brand — passed to `layerToFabric` for asset resolution
   * (currently logo variants). Set via `setBrand`; updates re-render
   * the active page so existing logo placeholders swap to real
   * brand assets immediately.
   */
  private brand: Brand | undefined = undefined;

  /** Snapshot ring for undo/redo. */
  private history = new HistoryRing<BrandOSDocument>();

  /** Snap-guide overlay objects — created on drag, removed on drag end. */
  private guideLines: FabricObject[] = [];

  /** Subscribers. */
  private changeHandlers = new Set<ChangeHandler>();
  private selectionHandlers = new Set<SelectionHandler>();

  /** When true, internal updates skip emitting `change` (avoids infinite loops). */
  private suppressChange = false;

  /**
   * Monotonic counter that invalidates in-flight async canvas work
   * (image / svg / logo loads). Bumped at the start of every
   * `renderActivePage` and every `updateLayer` recreate. The async
   * work captures the value at start and bails on apply if the
   * counter advanced — so a race between a full re-render and a
   * partial recreate can't end up with two layers stacked.
   */
  private renderToken = 0;

  /**
   * Batch depth and pending label for `batch()`. While `batchDepth > 0`,
   * mutation methods skip both `history.commit` and `emitChange`; the
   * outer-most batch fires one of each at the end with `batchLabel`.
   */
  private batchDepth = 0;
  private batchLabel: string | null = null;

  // ─── Lifecycle ────────────────────────────────────────────────────────

  async mount(container: HTMLElement): Promise<void> {
    if (this.canvas) throw new Error('FabricAdapter already mounted');
    this.container = container;

    const canvasEl = document.createElement('canvas');
    container.appendChild(canvasEl);
    this.canvasEl = canvasEl;

    this.canvas = new Canvas(canvasEl, {
      width: DEFAULT_PAGE_WIDTH,
      height: DEFAULT_PAGE_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      // Override Fabric's heavy royal-blue defaults — the marquee fill,
      // selection border, and per-object selection styling all read as a
      // softer brand-purple outline (no overlay over content). Per-object
      // overrides also live in `baseProps` (layerMapping.ts).
      selectionColor: SELECTION_MARQUEE_FILL,
      selectionBorderColor: SELECTION_BORDER_COLOR,
      selectionLineWidth: 1,
    });

    this.attachCanvasListeners();
  }

  unmount(): void {
    this.canvas?.dispose();
    this.canvas = null;
    if (this.canvasEl && this.container?.contains(this.canvasEl)) {
      this.container.removeChild(this.canvasEl);
    }
    this.canvasEl = null;
    this.container = null;
    this.fabricByLayerId.clear();
    this.guideLines = [];
    this.changeHandlers.clear();
    this.selectionHandlers.clear();
  }

  // ─── Document ─────────────────────────────────────────────────────────

  async loadDocument(doc: BrandOSDocument): Promise<void> {
    if (!this.canvas) throw new Error('FabricAdapter not mounted');
    this.doc = clone(doc);
    this.activePageId = doc.pages[0]?.id ?? null;
    // Clone so the history's first entry is an immutable snapshot. Without
    // this, subsequent mutations to `this.doc` would also mutate past[0].
    this.history.reset(clone(this.doc));
    await this.renderActivePage();
    this.emitChange();
  }

  /**
   * Bulk-replace the document while preserving undo history. Used by
   * "Re-apply brand kit" and any other op that produces a new doc
   * via a pure transform but should still be a single undo step.
   *
   * MUST be called from inside `batch(label, () => replaceDocument(next))`.
   * The method itself does NOT commit history or emit a change event —
   * the surrounding batch handles both. This is intentional: because
   * `renderActivePage` is async but `batch.fn` is synchronous, an
   * internal commit-after-await would race with batch's end-of-batch
   * commit and produce a phantom second history entry that breaks
   * single-step undo.
   */
  async replaceDocument(doc: BrandOSDocument): Promise<void> {
    if (!this.canvas) throw new Error('FabricAdapter not mounted');
    this.doc = clone(doc);
    // Preserve active page id when possible — saves the user from
    // jumping to page 1 every time the brand kit re-applies.
    const stillHasActive = this.activePageId
      ? doc.pages.some((p) => p.id === this.activePageId)
      : false;
    if (!stillHasActive) {
      this.activePageId = doc.pages[0]?.id ?? null;
    }
    await this.renderActivePage();
  }

  getDocument(): BrandOSDocument {
    if (!this.doc) throw new Error('No document loaded');
    return clone(this.doc);
  }

  // ─── Page navigation ──────────────────────────────────────────────────

  setActivePage(pageId: string): void {
    if (!this.doc) throw new Error('No document loaded');
    if (!this.doc.pages.find((p) => p.id === pageId)) {
      throw new Error(`Page ${pageId} not found`);
    }
    // Setting the active page exits master mode if we were in it.
    this.editingMasterId = null;
    if (this.activePageId === pageId) return;
    this.activePageId = pageId;
    void this.renderActivePage();
    this.emitChange();
  }

  getActivePageId(): string {
    if (!this.activePageId) throw new Error('No active page');
    return this.activePageId;
  }

  // ─── Page CRUD (Phase 2) ──────────────────────────────────────────────

  addPage(page: Page, index?: number): void {
    if (!this.doc) throw new Error('No document loaded');
    const insertAt = index ?? this.doc.pages.length;
    this.doc.pages.splice(insertAt, 0, clone(page));
    this.commitToHistory();
    this.emitChange();
  }

  removePage(pageId: string): void {
    if (!this.doc) throw new Error('No document loaded');
    if (this.doc.pages.length <= 1) {
      throw new Error('Cannot remove the last page; document must have at least one.');
    }
    const idx = this.doc.pages.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    this.doc.pages.splice(idx, 1);
    // If the active page was removed, fall through to the previous one
    // (or the first if we deleted the leftmost).
    if (this.activePageId === pageId) {
      this.activePageId = this.doc.pages[Math.max(0, idx - 1)].id;
      void this.renderActivePage();
    }
    this.commitToHistory();
    this.emitChange();
  }

  duplicatePage(pageId: string): string {
    if (!this.doc) throw new Error('No document loaded');
    const idx = this.doc.pages.findIndex((p) => p.id === pageId);
    if (idx < 0) throw new Error(`Page ${pageId} not found`);
    const original = this.doc.pages[idx];
    const copy: Page = {
      ...clone(original),
      id: newUuid(),
      name: `${original.name} copy`,
      // Recursively re-id every layer (and group children) so the duplicate
      // doesn't share ids with the original.
      layers: original.layers.map(reIdLayer),
    };
    this.doc.pages.splice(idx + 1, 0, copy);
    this.commitToHistory();
    this.emitChange();
    return copy.id;
  }

  /**
   * Step 7 — "Duplicate → As variant". Layer rules live in
   * `transformLayersForVariant`. Inserts immediately after the
   * source. Single history commit.
   */
  duplicatePageAsVariant(pageId: string): string {
    if (!this.doc) throw new Error('No document loaded');
    const idx = this.doc.pages.findIndex((p) => p.id === pageId);
    if (idx < 0) throw new Error(`Page ${pageId} not found`);
    const original = this.doc.pages[idx];
    const cloned = clone(original);
    const copy: Page = {
      ...cloned,
      id: newUuid(),
      name: `${original.name} variant`,
      layers: transformLayersForVariant(cloned.layers),
    };
    this.doc.pages.splice(idx + 1, 0, copy);
    this.commitToHistory();
    this.emitChange();
    return copy.id;
  }

  /**
   * Step 7 — "Duplicate → Empty". Same dimensions + master-page
   * binding as the source, no layers. Inserts immediately after the
   * source. Single history commit.
   */
  duplicatePageEmpty(pageId: string): string {
    if (!this.doc) throw new Error('No document loaded');
    const idx = this.doc.pages.findIndex((p) => p.id === pageId);
    if (idx < 0) throw new Error(`Page ${pageId} not found`);
    const original = this.doc.pages[idx];
    const copy: Page = {
      id: newUuid(),
      name: `${original.name} (blank)`,
      width: original.width,
      height: original.height,
      background: clone(original.background),
      masterPageId: original.masterPageId,
      layers: [],
    };
    this.doc.pages.splice(idx + 1, 0, copy);
    this.commitToHistory();
    this.emitChange();
    return copy.id;
  }

  reorderPage(pageId: string, newIndex: number): void {
    if (!this.doc) throw new Error('No document loaded');
    const idx = this.doc.pages.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    const [page] = this.doc.pages.splice(idx, 1);
    const clamped = Math.max(0, Math.min(newIndex, this.doc.pages.length));
    this.doc.pages.splice(clamped, 0, page);
    this.commitToHistory();
    this.emitChange();
  }

  updatePageDimensions(pageId: string, width: number, height: number): void {
    if (!this.doc) throw new Error('No document loaded');
    const page = this.requirePage(pageId);
    page.width = width;
    page.height = height;
    if (pageId === this.activePageId || this.editingMasterId === pageId) {
      this.canvas?.setDimensions({ width, height });
      this.canvas?.requestRenderAll();
    }
    this.commitToHistory();
    this.emitChange();
  }

  // ─── Master pages (Phase 2) ───────────────────────────────────────────

  addMasterPage(master: Page): void {
    if (!this.doc) throw new Error('No document loaded');
    this.doc.masterPages.push(clone(master));
    this.commitToHistory();
    this.emitChange();
  }

  removeMasterPage(masterId: string): void {
    if (!this.doc) throw new Error('No document loaded');
    const idx = this.doc.masterPages.findIndex((m) => m.id === masterId);
    if (idx < 0) return;
    this.doc.masterPages.splice(idx, 1);
    // Detach the deleted master from any pages that reference it.
    for (const page of this.doc.pages) {
      if (page.masterPageId === masterId) page.masterPageId = null;
    }
    if (this.editingMasterId === masterId) {
      this.editingMasterId = null;
      void this.renderActivePage();
    }
    this.commitToHistory();
    this.emitChange();
  }

  applyMasterToPage(pageId: string, masterId: string | null): void {
    if (!this.doc) throw new Error('No document loaded');
    const page = this.requirePage(pageId);
    if (masterId !== null && !this.doc.masterPages.find((m) => m.id === masterId)) {
      throw new Error(`Master page ${masterId} not found`);
    }
    page.masterPageId = masterId;
    if (this.isActiveSurface(pageId)) {
      void this.renderActivePage();
    }
    this.commitToHistory();
    this.emitChange();
  }

  enterMasterMode(masterId: string): void {
    if (!this.doc) throw new Error('No document loaded');
    if (!this.doc.masterPages.find((m) => m.id === masterId)) {
      throw new Error(`Master page ${masterId} not found`);
    }
    this.editingMasterId = masterId;
    void this.renderActivePage();
    this.emitChange();
  }

  exitMasterMode(): void {
    if (this.editingMasterId == null) return;
    this.editingMasterId = null;
    void this.renderActivePage();
    this.emitChange();
  }

  getEditingMasterId(): string | null {
    return this.editingMasterId;
  }

  // ─── Brand context ────────────────────────────────────────────────────

  setBrand(brand: Brand | undefined): void {
    // No-op when the same Brand reference comes through twice. The
    // Editor effect that calls this fires on every doc change, so
    // skipping unchanged brands avoids gratuitous re-renders.
    if (this.brand === brand) return;
    const prev = this.brand;
    this.brand = brand;
    if (!this.canvas || !this.doc) return;
    // Re-render only when the active surface has at least one logo
    // layer — otherwise the brand swap has no visible effect.
    if (this.activePageHasLogo() || prev !== brand) {
      void this.renderActivePage();
    }
  }

  private activePageHasLogo(): boolean {
    if (!this.doc) return false;
    const page = this.editingMasterId
      ? this.doc.masterPages.find((m) => m.id === this.editingMasterId)
      : this.doc.pages.find((p) => p.id === this.activePageId);
    if (!page) return false;
    return page.layers.some((l) => layerTreeHasLogo(l));
  }

  // ─── Layer operations ─────────────────────────────────────────────────

  addLayer(pageId: string, layer: Layer): void {
    const page = this.requirePage(pageId);
    page.layers.push(clone(layer));
    if (this.isActiveSurface(pageId)) {
      void layerToFabric(layer, this.brand).then((obj) => {
        this.canvas?.add(obj);
        this.fabricByLayerId.set(layer.id, obj);
        this.canvas?.requestRenderAll();
      });
    }
    this.commitToHistory();
    this.emitChange();
  }

  updateLayer(pageId: string, layerId: string, patch: Partial<Layer>): void {
    const page = this.requirePage(pageId);
    const idx = page.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    const prevLayer = page.layers[idx];
    // Phase 3 step 4c.2 — record locked-binding recovery state BEFORE
    // the patch lands. If a brand-managed property is being literalized
    // on a brandLocked layer, capture the original SlotRef so
    // applyBrandToDocument can restore it on re-apply (4c.3).
    const recoveryAdditions = computeLockedBindingAdditions(prevLayer, patch);
    const nextLayer = mergeLockedBindings(
      { ...prevLayer, ...patch } as Layer,
      recoveryAdditions,
    );
    page.layers[idx] = nextLayer;
    // Reflect onto the canvas if active page.
    if (this.isActiveSurface(pageId)) {
      const obj = this.fabricByLayerId.get(layerId);
      if (obj) {
        const { needsRecreate } = applyLayerToFabric(obj, prevLayer, nextLayer);
        if (needsRecreate) {
          this.canvas?.remove(obj);
          this.fabricByLayerId.delete(layerId);
          const token = ++this.renderToken;
          void layerToFabric(nextLayer, this.brand).then((newObj) => {
            // Bail if our async work is stale — a newer recreate
            // started, or a renderActivePage replaced the canvas
            // while we were loading. Without this guard a fast
            // variant click sequence stacked two FabricImages
            // because both .then's added.
            if (!this.canvas) return;
            if (token !== this.renderToken) return;
            if (this.fabricByLayerId.has(layerId)) return;
            this.canvas.add(newObj);
            this.canvas.moveObjectTo(newObj, idx);
            this.fabricByLayerId.set(layerId, newObj);
            this.canvas.requestRenderAll();
          });
        } else {
          this.canvas?.requestRenderAll();
        }
      } else if (this.brand) {
        // No existing Fabric object for this layer (a previous
        // recreate's async load may not have applied because of
        // a token bump). Schedule a fresh load against the latest
        // doc state so the canvas eventually converges with the
        // doc — without this, rapid variant clicks would leave
        // the logo invisible.
        const token = ++this.renderToken;
        void layerToFabric(nextLayer, this.brand).then((newObj) => {
          if (!this.canvas) return;
          if (token !== this.renderToken) return;
          if (this.fabricByLayerId.has(layerId)) return;
          this.canvas.add(newObj);
          this.canvas.moveObjectTo(newObj, idx);
          this.fabricByLayerId.set(layerId, newObj);
          this.canvas.requestRenderAll();
        });
      }
    }
    this.commitToHistory();
    this.emitChange();
  }

  removeLayer(pageId: string, layerId: string): void {
    const page = this.requirePage(pageId);
    page.layers = page.layers.filter((l) => l.id !== layerId);
    if (this.isActiveSurface(pageId)) {
      const obj = this.fabricByLayerId.get(layerId);
      if (obj) this.canvas?.remove(obj);
      this.fabricByLayerId.delete(layerId);
      this.canvas?.requestRenderAll();
    }
    this.commitToHistory();
    this.emitChange();
  }

  reorderLayer(pageId: string, layerId: string, newIndex: number): void {
    const page = this.requirePage(pageId);
    const idx = page.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    const [layer] = page.layers.splice(idx, 1);
    page.layers.splice(newIndex, 0, layer);
    if (this.isActiveSurface(pageId)) {
      const obj = this.fabricByLayerId.get(layerId);
      if (obj && this.canvas) {
        this.canvas.moveObjectTo(obj, newIndex);
      }
    }
    this.commitToHistory();
    this.emitChange();
  }

  // ─── Cross-page bulk mutation (Phase 3 step 4b) ───────────────────────

  applyLayerPatchAcrossPages(
    predicate: (layer: Layer, pageId: string) => boolean,
    patch: Partial<Layer>,
    batchLabel: string,
  ): ApplyLayerPatchAcrossPagesResult {
    if (!this.doc) throw new Error('No document loaded');

    // Phase 1 — collect matches via the predicate. NO mutation yet, so
    // we can early-out cleanly when nothing matches (no batch, no
    // change event, no undo entry — the no-op contract).
    //
    // Master pages are intentionally NOT walked. Master-layer
    // propagation goes through the master overlay rendering, which is
    // a separate model from cross-page propagation. The predicate is
    // never even called for master layers — the caller cannot
    // accidentally include them.
    const matches: Array<{ pageId: string; layer: Layer }> = [];
    for (const page of this.doc.pages) {
      walkLayersForPredicate(page.layers, page.id, predicate, matches);
    }

    if (matches.length === 0) {
      return { mutatedLayerIds: [], affectedPageIds: [] };
    }

    // Phase 2 — mutate atomically inside batch. The batch wrapper
    // suppresses per-mutation history.commit and emitChange; one
    // labeled commit + one change event fire when the batch closes.
    const mutatedLayerIds: string[] = [];
    const affectedPageIds = new Set<string>();
    let activePageAffected = false;

    this.batch(batchLabel, () => {
      for (const { pageId, layer } of matches) {
        // Phase 3 step 4c.2 — record locked-binding recovery state
        // BEFORE the patch lands, same contract as updateLayer.
        const recoveryAdditions = computeLockedBindingAdditions(layer, patch);
        // Mutate the mirror layer in place. The mirror IS this.doc;
        // mutating here is what the change event will reflect.
        // `Object.assign(layer, patch)` is the same shape updateLayer
        // produces with `{ ...layer, ...patch }`, but in place — which
        // is correct here because we're inside the batch's snapshot
        // boundary (the snapshot is taken AFTER fn returns).
        Object.assign(layer as object, patch);
        if (recoveryAdditions) {
          (layer as { _lockedBindings?: Record<string, SlotRef> })._lockedBindings = {
            ...((layer as { _lockedBindings?: Record<string, SlotRef> })._lockedBindings ?? {}),
            ...recoveryAdditions,
          };
        }
        mutatedLayerIds.push(layer.id);
        affectedPageIds.add(pageId);
        if (pageId === this.activePageId) activePageAffected = true;
      }
    });

    // Re-render the active page once if any of its layers changed.
    // applyLayerToFabric per-layer would be a smaller delta but
    // requires the prevLayer state that we just mutated away; full
    // re-render is correct and simple. Future polish can optimize.
    if (activePageAffected) void this.renderActivePage();

    return {
      mutatedLayerIds,
      affectedPageIds: Array.from(affectedPageIds),
    };
  }

  // ─── Selection ────────────────────────────────────────────────────────

  getSelection(): SelectionState {
    if (!this.canvas) return { layerIds: [], pageId: this.activePageId ?? '' };
    const active = this.canvas.getActiveObjects();
    const layerIds = active
      .map((obj) => getLayerId(obj))
      .filter((id): id is string => id != null);
    return { layerIds, pageId: this.activePageId ?? '' };
  }

  setSelection(layerIds: string[]): void {
    if (!this.canvas) return;
    if (layerIds.length === 0) {
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
      return;
    }
    const objs = layerIds
      .map((id) => this.fabricByLayerId.get(id))
      .filter((o): o is FabricObject => o != null);
    if (objs.length === 1) {
      this.canvas.setActiveObject(objs[0]);
    } else if (objs.length > 1) {
      // Multi-select via ActiveSelection requires more setup; defer to Phase 2.
      this.canvas.setActiveObject(objs[0]);
    }
    this.canvas.requestRenderAll();
  }

  // ─── History ──────────────────────────────────────────────────────────

  undo(): void {
    const prev = this.history.undo();
    if (!prev) return;
    this.doc = clone(prev);
    this.activePageId = this.doc.pages[0]?.id ?? null;
    void this.renderActivePage().then(() => this.emitChange());
  }

  redo(): void {
    const next = this.history.redo();
    if (!next) return;
    this.doc = clone(next);
    this.activePageId = this.doc.pages[0]?.id ?? null;
    void this.renderActivePage().then(() => this.emitChange());
  }

  canUndo(): boolean {
    return this.history.canUndo();
  }

  canRedo(): boolean {
    return this.history.canRedo();
  }

  // ─── Export ───────────────────────────────────────────────────────────

  async exportAs(options: ExportOptions): Promise<Blob> {
    if (!this.canvas) throw new Error('Not mounted');
    const scale = options.scale ?? 1;

    if (options.format === 'png' || options.format === 'jpg') {
      const dataUrl = this.canvas.toDataURL({
        format: options.format === 'jpg' ? 'jpeg' : 'png',
        quality: options.quality ?? 0.92,
        multiplier: scale,
      });
      const res = await fetch(dataUrl);
      return res.blob();
    }
    if (options.format === 'svg') {
      const svg = this.canvas.toSVG();
      return new Blob([svg], { type: 'image/svg+xml' });
    }
    if (options.format === 'pdf') {
      // PDF via jsPDF — single-page in Phase 1; multi-page lands at Phase 2.
      const { default: jsPDF } = await import('jspdf');
      const dataUrl = this.canvas.toDataURL({ format: 'png', multiplier: scale });
      const pdf = new jsPDF({
        orientation: this.canvas.getWidth() > this.canvas.getHeight() ? 'l' : 'p',
        unit: 'px',
        format: [this.canvas.getWidth(), this.canvas.getHeight()],
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, this.canvas.getWidth(), this.canvas.getHeight());
      return pdf.output('blob');
    }
    throw new Error(`Unsupported export format: ${options.format}`);
  }

  // ─── Events ───────────────────────────────────────────────────────────

  on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe {
    if (event === 'change') {
      this.changeHandlers.add(handler as ChangeHandler);
      return () => this.changeHandlers.delete(handler as ChangeHandler);
    }
    this.selectionHandlers.add(handler as SelectionHandler);
    return () => this.selectionHandlers.delete(handler as SelectionHandler);
  }

  // ─── Internal: rendering & event wiring ───────────────────────────────

  private async renderActivePage(): Promise<void> {
    if (!this.canvas || !this.doc) return;
    // Bump the render token first so any in-flight partial-recreate
    // `.then` callbacks (from updateLayer's needsRecreate path) bail
    // before they double-add to the canvas. The same token is also
    // passed into renderPage as `isCancelled` so a stale renderPage
    // bails before mutating the canvas.
    const token = ++this.renderToken;
    const isCancelled = () => token !== this.renderToken;
    // In master-edit mode the canvas mirrors the master itself — its
    // layers become the editable surface. Otherwise render the active
    // page (with master overlay if it has one).
    if (this.editingMasterId) {
      const master = this.doc.masterPages.find((m) => m.id === this.editingMasterId);
      if (!master) return;
      const result = await renderPage(this.canvas, master, this.doc, {
        editingMaster: true,
        brand: this.brand,
        isCancelled,
      });
      if (isCancelled()) return;
      this.fabricByLayerId = result;
      return;
    }
    if (!this.activePageId) return;
    const page = this.doc.pages.find((p) => p.id === this.activePageId);
    if (!page) return;
    const result = await renderPage(this.canvas, page, this.doc, {
      editingMaster: false,
      brand: this.brand,
      isCancelled,
    });
    if (isCancelled()) return;
    this.fabricByLayerId = result;
  }

  /**
   * Returns true when the given pageId IS the surface currently
   * mirrored on the canvas — the active page in normal mode, or the
   * edited master in master mode. Used to decide whether layer CRUD
   * needs to update the canvas in addition to the document mirror.
   */
  private isActiveSurface(pageId: string): boolean {
    if (this.editingMasterId) return pageId === this.editingMasterId;
    return pageId === this.activePageId;
  }

  /**
   * Resolve a page id to either a regular page or the currently edited
   * master. `addLayer`/`updateLayer`/`removeLayer` accept either —
   * during master mode, the "page" being edited is the master.
   */
  private requirePage(pageId: string): Page {
    if (!this.doc) throw new Error('No document loaded');
    const page = this.doc.pages.find((p) => p.id === pageId);
    if (page) return page;
    const master = this.doc.masterPages.find((m) => m.id === pageId);
    if (master) return master;
    throw new Error(`Page ${pageId} not found (neither in pages nor masterPages)`);
  }

  private attachCanvasListeners(): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

    canvas.on('object:moving', (e) => this.onObjectMoving(e));
    canvas.on('object:scaling', (e) => this.onObjectModified(e));
    canvas.on('object:rotating', (e) => this.onObjectModified(e));
    canvas.on('object:modified', (e) => this.onObjectModifiedDiscrete(e));
    canvas.on('text:changed', (e) => this.onTextChanged(e));
    canvas.on('selection:created', () => this.emitSelection());
    canvas.on('selection:updated', () => this.emitSelection());
    canvas.on('selection:cleared', () => this.emitSelection());
    canvas.on('mouse:up', () => this.clearGuides());
  }

  private onObjectMoving(e: TPointerEventInfo): void {
    const target = e.target as FabricObject | undefined;
    if (!target || !this.canvas) return;
    this.applySnap(target);
    this.syncLayerFromFabric(target, /* discrete */ false);
  }

  private onObjectModified(e: TPointerEventInfo): void {
    const target = e.target as FabricObject | undefined;
    if (!target) return;
    this.syncLayerFromFabric(target, /* discrete */ false);
  }

  private onObjectModifiedDiscrete(e: TPointerEventInfo): void {
    const target = e.target as FabricObject | undefined;
    if (!target) return;
    this.clearGuides();
    this.syncLayerFromFabric(target, /* discrete */ true);
  }

  private onTextChanged(e: { target: FabricObject }): void {
    const target = e.target;
    if (!(target instanceof Textbox)) return;
    const id = getLayerId(target);
    if (!id || !this.doc || !this.activePageId) return;
    const found = findLayer(this.doc, id);
    if (!found || found.layer.kind !== 'text') return;
    (found.layer as TextLayer).text = target.text ?? '';
    this.snapshotToHistory();
    this.emitChange();
  }

  private syncLayerFromFabric(obj: FabricObject, discrete: boolean): void {
    const id = getLayerId(obj);
    if (!id || !this.doc) return;
    const found = findLayer(this.doc, id);
    if (!found) return;
    found.layer.transform = fabricToTransform(obj);
    if (discrete) this.commitToHistory();
    else this.snapshotToHistory();
    this.emitChange();
  }

  private emitChange(): void {
    if (this.suppressChange || !this.doc) return;
    if (this.batchDepth > 0) return; // batch fires one emit at the end
    const snapshot = clone(this.doc);
    for (const h of this.changeHandlers) h(snapshot);
  }

  /**
   * Commit current state to history, skipping when a batch is in
   * progress. The outer-most `batch(...)` does a single commit at the
   * end with the batch label.
   */
  private commitToHistory(): void {
    if (this.batchDepth > 0) return;
    if (this.doc) this.history.commit(clone(this.doc));
  }

  /**
   * Snapshot current state to the debounced history slot, skipping
   * when a batch is in progress.
   */
  private snapshotToHistory(): void {
    if (this.batchDepth > 0) return;
    if (this.doc) this.history.snapshot(clone(this.doc));
  }

  // ─── Public: batch ─────────────────────────────────────────────────────

  batch(label: string, fn: () => void): void {
    if (!this.doc) throw new Error('No document loaded');
    if (this.batchDepth === 0) {
      this.batchLabel = label;
    }
    this.batchDepth++;
    try {
      fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0) {
        // Outer-most batch: single commit + single emit, both labeled.
        this.history.commit(clone(this.doc!), this.batchLabel ?? undefined);
        this.batchLabel = null;
        const snapshot = clone(this.doc);
        for (const h of this.changeHandlers) h(snapshot);
      }
    }
  }

  private emitSelection(): void {
    const sel = this.getSelection();
    for (const h of this.selectionHandlers) h(sel);
  }

  // ─── Snap guides ──────────────────────────────────────────────────────

  private applySnap(moving: FabricObject): void {
    if (!this.canvas) return;
    const movingBox: BBox = {
      x: moving.left ?? 0,
      y: moving.top ?? 0,
      width: (moving.width ?? 0) * (moving.scaleX ?? 1),
      height: (moving.height ?? 0) * (moving.scaleY ?? 1),
    };
    const others: BBox[] = this.canvas
      .getObjects()
      .filter((o) => o !== moving && !this.guideLines.includes(o))
      .map((o) => ({
        x: o.left ?? 0,
        y: o.top ?? 0,
        width: (o.width ?? 0) * (o.scaleX ?? 1),
        height: (o.height ?? 0) * (o.scaleY ?? 1),
      }));

    const result = computeSnap(movingBox, others, SNAP_THRESHOLD_PX);
    if (result.snappedX != null) moving.set('left', result.snappedX);
    if (result.snappedY != null) moving.set('top', result.snappedY);

    this.clearGuides();
    for (const guide of result.guides) {
      const line =
        guide.axis === 'x'
          ? new Line([guide.position, 0, guide.position, this.canvas.getHeight()], {
              stroke: '#ec4899',
              strokeWidth: 1,
              selectable: false,
              evented: false,
              excludeFromExport: true,
            })
          : new Line([0, guide.position, this.canvas.getWidth(), guide.position], {
              stroke: '#ec4899',
              strokeWidth: 1,
              selectable: false,
              evented: false,
              excludeFromExport: true,
            });
      this.canvas.add(line);
      this.guideLines.push(line);
    }
    this.canvas.requestRenderAll();
  }

  private clearGuides(): void {
    if (!this.canvas) return;
    for (const g of this.guideLines) this.canvas.remove(g);
    this.guideLines = [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Recursively re-id a layer (and any group children) so a duplicate
 * doesn't share ids with the original. Used by `duplicatePage`.
 */
function reIdLayer(layer: Layer): Layer {
  const copy: Layer = { ...layer, id: newUuid() };
  if (copy.kind === 'group') {
    return { ...copy, children: copy.children.map(reIdLayer) };
  }
  return copy;
}

// applyPatchToFabric (Phase 1 stub) was replaced by applyLayerToFabric in
// layerMapping.ts. The patch-only version only forwarded transform/opacity/
// visible/locked and silently dropped fontSize/color/fill/etc — that was
// the data-flow bug surfaced in Phase 1 review.

/**
 * Phase 3 step 4c.2 — compute the recovery additions for a layer
 * about to be patched. Returns a partial `_lockedBindings` map
 * containing entries for properties where:
 *
 *   1. The layer is `brandLocked: true`
 *   2. The patch contains a value for the property (it's about to
 *      be overwritten)
 *   3. The CURRENT value at that property is a SlotRef
 *   4. The PATCH value at that property is a literal (or any
 *      non-SlotRef value)
 *
 * Returns null when the layer is not brandLocked OR when no
 * eligible bindings exist. The caller merges the additions onto
 * the layer's `_lockedBindings` AFTER the patch has been applied,
 * so the recorded SlotRefs survive the patch overwrite.
 *
 * Property paths supported:
 *   • Top-level fields ('color', 'fontFamily', 'fill', 'stroke')
 *   • SvgLayer fillOverrides via dotted notation
 *     ('fillOverrides.<svg-path-id>')
 *
 * 4c.3 (next commit) reads these recordings on
 * applyBrandToDocument({ respectLocks: true }) and restores the
 * SlotRefs.
 */
function computeLockedBindingAdditions(
  layer: Layer,
  patch: Partial<Layer>,
): Record<string, SlotRef> | null {
  if (!layer.brandLocked) return null;
  const additions: Record<string, SlotRef> = {};

  for (const key of Object.keys(patch)) {
    const currentValue = (layer as unknown as Record<string, unknown>)[key];
    const patchValue = (patch as unknown as Record<string, unknown>)[key];

    // Special case — SvgLayer.fillOverrides is a Record; walk into it
    // and check each sub-key independently.
    if (
      key === 'fillOverrides' &&
      isObjectRecord(currentValue) &&
      isObjectRecord(patchValue)
    ) {
      for (const subKey of Object.keys(patchValue)) {
        const currentSub = currentValue[subKey];
        const patchSub = patchValue[subKey];
        if (isSlotRefValue(currentSub) && !isSlotRefValue(patchSub) && patchSub !== undefined) {
          additions[`fillOverrides.${subKey}`] = JSON.parse(JSON.stringify(currentSub));
        }
      }
      continue;
    }

    // Top-level property paths.
    if (isSlotRefValue(currentValue) && !isSlotRefValue(patchValue) && patchValue !== undefined) {
      additions[key] = JSON.parse(JSON.stringify(currentValue));
    }
  }

  return Object.keys(additions).length > 0 ? additions : null;
}

/**
 * Merge recovery additions into a layer's `_lockedBindings`. Used by
 * updateLayer's spread-then-merge flow. Existing bindings are
 * preserved; new ones override on collision (the most recent
 * override wins).
 */
function mergeLockedBindings(
  layer: Layer,
  additions: Record<string, SlotRef> | null,
): Layer {
  if (!additions) return layer;
  return {
    ...layer,
    _lockedBindings: {
      ...((layer as { _lockedBindings?: Record<string, SlotRef> })._lockedBindings ?? {}),
      ...additions,
    },
  } as Layer;
}

function isSlotRefValue(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  );
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Walk every layer in a tree (including group children) and collect
 * those for which the predicate returns true. Used by
 * `applyLayerPatchAcrossPages` to find candidates across all pages
 * (the caller iterates pages; this function handles each page's
 * layer tree).
 */
function walkLayersForPredicate(
  layers: Layer[],
  pageId: string,
  predicate: (layer: Layer, pageId: string) => boolean,
  out: Array<{ pageId: string; layer: Layer }>,
): void {
  for (const layer of layers) {
    if (predicate(layer, pageId)) out.push({ pageId, layer });
    if (layer.kind === 'group') {
      walkLayersForPredicate(
        (layer as GroupLayer).children,
        pageId,
        predicate,
        out,
      );
    }
  }
}

function layerTreeHasLogo(layer: Layer): boolean {
  if (layer.kind === 'logo') return true;
  if (layer.kind === 'group') {
    return layer.children.some((c) => layerTreeHasLogo(c));
  }
  return false;
}
