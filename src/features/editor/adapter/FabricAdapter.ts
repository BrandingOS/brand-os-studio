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
  ActiveSelection,
  Canvas,
  Line,
  Textbox,
  util,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric';

import type {
  BrandOSDocument,
  Layer,
  Page,
  TextLayer,
  Transform,
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
  findPageSheet,
  renderPage,
  SELECTION_BORDER_COLOR,
  SELECTION_HANDLE_COLOR,
  SELECTION_HANDLE_STROKE,
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
   * Viewport mode — see `renderPage`'s `viewport` option.
   *
   * Null means the pre-Studio behaviour: the canvas is sized to the
   * page and zoom is somebody else's problem (the old shell scaled a
   * DOM wrapper). Non-null means the canvas is sized to the visible
   * region and `viewportTransform` owns zoom + pan, which is what
   * gives constant-size selection handles and crisp text at any zoom.
   */
  /**
   * A selection asked for before its objects finished loading. Applied
   * by `flushPendingSelection` once they exist.
   */
  private pendingSelection: string[] | null = null;

  private viewport: { width: number; height: number } | null = null;
  /**
   * Has the canvas actually been PAINTED in viewport mode? Distinct from
   * `viewport !== null`, which only means a size has been recorded.
   */
  private viewportRendered = false;
  /** Overlapping `exportAs` calls — see `frameForExport`. */
  private exportDepth = 0;
  /** Pending coalesced publish for a continuous gesture. */
  private continuousFrame: number | null = null;
  private zoom = 1;
  private panX = 0;
  private panY = 0;

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

    // A viewport size recorded before the canvas existed.
    if (this.viewport) this.canvas.setDimensions(this.viewport);

    this.attachCanvasListeners();
  }

  unmount(): void {
    // Fabric v6's `dispose()` is ASYNCHRONOUS and internally calls `clear()`,
    // which reaches for the 2D context. Detaching the element synchronously
    // right after calling it meant dispose could land on a canvas whose
    // context was already gone:
    //
    //   TypeError: Cannot read properties of undefined (reading 'clearRect')
    //     at clearRect (fabric/src/canvas/StaticCanvas.ts)
    //     at clear     (fabric/src/canvas/Canvas.ts)
    //
    // It surfaced as an UNHANDLED REJECTION (nothing awaited the promise), so
    // it was invisible in fast local runs and only showed up on slower CI —
    // and an unhandled rejection can fail an unrelated test file, which is
    // exactly how it presented.
    //
    // Detach after disposal settles. React has usually removed the subtree by
    // then, so the `contains` guard makes the removal a no-op in that case.
    const canvas = this.canvas;
    const canvasEl = this.canvasEl;
    const container = this.container;

    // CANCEL ANY IN-FLIGHT RENDER FIRST.
    //
    // `renderActivePage` captures `this.canvas` before awaiting `renderPage`,
    // which loads images and only then calls `canvas.clear()`. Unmounting
    // during that await disposed the canvas out from under a render that was
    // still holding a reference to it, and `clear()` reached for a context that
    // no longer existed — the same `clearRect` of undefined as above, arriving
    // from the opposite direction and again as an unhandled rejection.
    //
    // `renderPage` already checks `isCancelled()` immediately before it touches
    // the canvas; it just needed the token to actually move. Bumping it here
    // makes every in-flight render bail at that guard.
    this.renderToken += 1;
    this.cancelContinuousSync();

    // Local state is cleared SYNCHRONOUSLY: `unmount()` must leave the adapter
    // unusable immediately, regardless of when disposal finishes.
    this.canvas = null;
    this.canvasEl = null;
    this.container = null;
    this.viewportRendered = false;
    this.fabricByLayerId.clear();
    this.guideLines = [];
    this.changeHandlers.clear();
    this.selectionHandlers.clear();

    void Promise.resolve()
      .then(() => canvas?.dispose())
      // A canvas already torn down by the host is a normal teardown race, not
      // an error worth surfacing — but it must be HANDLED, not left to reject.
      .catch(() => undefined)
      .finally(() => {
        if (canvasEl && container?.contains(canvasEl)) {
          container.removeChild(canvasEl);
        }
      });
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
      // Token-guarded like every other async canvas write. Without it
      // an insert racing a full re-render added its object to a canvas
      // that had just been cleared and rebuilt — the one async path in
      // the adapter that was missing the guard.
      const token = ++this.renderToken;
      void layerToFabric(layer, this.brand).then((obj) => {
        if (!this.canvas || token !== this.renderToken) return;
        if (this.fabricByLayerId.has(layer.id)) return;
        this.canvas.add(obj);
        this.fabricByLayerId.set(layer.id, obj);
        this.canvas.requestRenderAll();
        this.flushPendingSelection();
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
            this.fabricByLayerId.set(layerId, newObj);
            this.canvas.moveObjectTo(newObj, this.canvasIndexFor(idx));
            this.canvas.requestRenderAll();
            this.flushPendingSelection();
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
        this.canvas.moveObjectTo(obj, this.canvasIndexFor(newIndex));
      }
    }
    this.commitToHistory();
    this.emitChange();
  }

  /**
   * Translate a LAYER index into a CANVAS index.
   *
   * The canvas holds more than the page's layers: in viewport mode the
   * page sheet sits at the bottom, and a page with a master carries its
   * overlay objects below the editable ones. Passing a layer index
   * straight to `moveObjectTo` therefore put the layer N positions too
   * low, which reads as "send to front did nothing" on any page with a
   * master.
   */
  private canvasIndexFor(layerIndex: number): number {
    if (!this.canvas) return layerIndex;
    const objects = this.canvas.getObjects();
    const owned = new Set(this.fabricByLayerId.values());
    let base = 0;
    while (base < objects.length && !owned.has(objects[base])) base += 1;
    return base + layerIndex;
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
    if (objs.length < layerIds.length) {
      // Some of these layers have no Fabric object YET — `layerToFabric`
      // is async for images, SVGs and logos, so a selection issued
      // straight after `addLayer` finds nothing and silently does
      // nothing. That is why inserting an image left it unselected and
      // the contextual toolbar empty. Remember the intent and apply it
      // when the object lands.
      this.pendingSelection = [...layerIds];
    } else {
      this.pendingSelection = null;
    }
    if (objs.length === 1) {
      this.canvas.setActiveObject(objs[0]);
    } else if (objs.length > 1) {
      // A real multi-selection. Selecting only objs[0] (what this did
      // before) meant "Select all" and marquee-then-act silently
      // operated on one layer.
      const selection = new ActiveSelection(objs, { canvas: this.canvas });
      styleSelectionChrome(selection);
      this.canvas.setActiveObject(selection);
    }
    this.canvas.requestRenderAll();
  }

  // ─── History ──────────────────────────────────────────────────────────

  undo(): void {
    const prev = this.history.undo();
    if (!prev) return;
    this.restoreSnapshot(prev);
  }

  redo(): void {
    const next = this.history.redo();
    if (!next) return;
    this.restoreSnapshot(next);
  }

  /**
   * Adopt a history snapshot and repaint.
   *
   * Keeps the user where they are. This used to reset the active page
   * to `pages[0]`, so undoing an edit on page 7 of a deck teleported
   * you to page 1 — the correction arrived somewhere you could not see
   * it, which reads as "undo did something random". The page is only
   * re-homed when the snapshot genuinely no longer contains it (undoing
   * the creation of the page you are standing on).
   */
  private restoreSnapshot(snapshot: BrandOSDocument): void {
    this.doc = clone(snapshot);
    const stillThere = this.doc.pages.some((p) => p.id === this.activePageId);
    if (!stillThere) this.activePageId = this.doc.pages[0]?.id ?? null;
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
    // In viewport mode the canvas is the WORKSPACE, not the page — a
    // raster of it would be the artboard floating in grey with a drop
    // shadow, cropped to whatever the window happened to be. Frame the
    // page exactly for the duration of the export, then put the user's
    // view back.
    const restore = this.frameForExport();
    try {
      return await this.rasterize(options, scale);
    } finally {
      restore();
    }
  }

  /**
   * Temporarily give the canvas page-sized, page-coloured, untransformed
   * geometry. Returns the undo. A no-op outside viewport mode.
   */
  private frameForExport(): () => void {
    const canvas = this.canvas;
    if (!canvas || !this.viewport) return () => undefined;
    const page =
      this.doc?.pages.find((p) => p.id === this.activePageId) ?? this.doc?.pages[0];
    if (!page) return () => undefined;

    // REENTRANT. Two exports can overlap — a thumbnail is rasterized on
    // every save, and `toDataURL` is followed by an awaited fetch — and
    // the second would capture the FIRST one's temporary page-sized
    // geometry as "what to restore". The canvas then stayed page-sized
    // after both finished, leaving the artboard drawn at the wrong scale
    // and clipped by the workspace. Only the outermost frame saves and
    // restores; the inner ones are no-ops.
    this.exportDepth += 1;
    if (this.exportDepth > 1) {
      return () => {
        this.exportDepth -= 1;
      };
    }

    const prevWidth = canvas.getWidth();
    const prevHeight = canvas.getHeight();
    const prevBackground = canvas.backgroundColor;
    const prevClip = canvas.clipPath;
    const sheet = findPageSheet(canvas);
    const sheetWasVisible = sheet?.visible ?? false;

    // `excludeFromExport` is honoured by toObject/toSVG but NOT by
    // toDataURL, so the sheet has to be hidden by hand or its shadow
    // paints into the artwork.
    if (sheet) sheet.visible = false;
    canvas.clipPath = undefined;
    canvas.backgroundColor =
      typeof page.background === 'string' ? page.background : '#ffffff';
    canvas.setDimensions({ width: page.width, height: page.height });
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();

    return () => {
      this.exportDepth -= 1;
      if (sheet) sheet.visible = sheetWasVisible;
      canvas.clipPath = prevClip;
      canvas.backgroundColor = prevBackground;
      // Restore to the VIEWPORT, not to whatever the canvas happened to
      // measure when the export began. A thumbnail is rasterized on
      // every save, and one can start before the first viewport render
      // has landed — putting back the captured page-sized geometry left
      // the artboard drawn at the wrong scale with nothing to correct
      // it, because the workspace had not resized and the observer
      // stayed quiet. The viewport is the truth; `prevWidth` is only a
      // fallback for a canvas that was never in viewport mode.
      canvas.setDimensions(this.viewport ?? { width: prevWidth, height: prevHeight });
      this.applyViewportTransform();
    };
  }

  private async rasterize(options: ExportOptions, scale: number): Promise<Blob> {
    if (!this.canvas) throw new Error('Not mounted');

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

  // ─── Viewport (opt-in) ────────────────────────────────────────────────

  /**
   * Put the canvas into viewport mode at the given visible size, and
   * re-render so the page becomes a sheet inside it.
   *
   * Idempotent: calling it again with a new size only resizes.
   */
  async enableViewport(width: number, height: number): Promise<void> {
    this.viewport = {
      width: Math.max(1, Math.round(width)),
      height: Math.max(1, Math.round(height)),
    };
    // The shell measures its workspace as soon as it lays out, which can
    // be BEFORE `EditorCanvasMount`'s effect has awaited `mount()`. The
    // size is recorded either way and `mount` applies it — an early call
    // must not be the one that decides viewport mode is set up, or the
    // canvas keeps the page-sized geometry from `loadDocument` for ever
    // and the artboard is drawn at the wrong size, clipped. That raced
    // on window size: it looked right at some widths and not others.
    const canvas = this.canvas;
    if (!canvas) return;
    canvas.setDimensions(this.viewport);
    if (!this.viewportRendered) await this.renderActivePage();
    this.applyViewportTransform();
  }

  /** A viewport size has been recorded. */
  isViewportEnabled(): boolean {
    return this.viewport !== null;
  }

  /**
   * The canvas is actually PAINTED in viewport mode.
   *
   * Different from `isViewportEnabled`, and the difference is the whole
   * point: a size recorded before the document loaded leaves the canvas
   * still page-sized. The shell re-applies until this is true.
   */
  isViewportActive(): boolean {
    return this.viewportRendered;
  }

  /** Zoom + pan, in one write. Pan is in SCREEN pixels. */
  setViewportTransform(zoom: number, panX: number, panY: number): void {
    this.zoom = zoom;
    this.panX = panX;
    this.panY = panY;
    this.applyViewportTransform();
  }

  getViewportTransform(): { zoom: number; panX: number; panY: number } {
    return { zoom: this.zoom, panX: this.panX, panY: this.panY };
  }

  /** The active page's dimensions — what the viewport has to frame. */
  getPageSize(): { width: number; height: number } {
    const page = this.doc?.pages.find((p) => p.id === this.activePageId) ?? this.doc?.pages[0];
    return {
      width: page?.width ?? DEFAULT_PAGE_WIDTH,
      height: page?.height ?? DEFAULT_PAGE_HEIGHT,
    };
  }

  /** Screen (canvas-relative) point → document coordinates. */
  screenToDocument(x: number, y: number): { x: number; y: number } {
    return { x: (x - this.panX) / this.zoom, y: (y - this.panY) / this.zoom };
  }

  /**
   * Re-apply a selection that was asked for before its objects existed.
   * Called from every async canvas-add path.
   */
  private flushPendingSelection(): void {
    const wanted = this.pendingSelection;
    if (!wanted) return;
    if (!wanted.every((id) => this.fabricByLayerId.has(id))) return;
    this.pendingSelection = null;
    this.setSelection(wanted);
    this.emitSelection();
  }

  private styleActiveSelection(): void {
    const active = this.canvas?.getActiveObject();
    if (active && !getLayerId(active)) styleSelectionChrome(active);
  }

  private applyViewportTransform(): void {
    if (!this.canvas || !this.viewport) return;
    this.canvas.setViewportTransform([this.zoom, 0, 0, this.zoom, this.panX, this.panY]);
    this.canvas.requestRenderAll();
  }

  private async renderActivePage(): Promise<void> {
    if (!this.canvas || !this.doc) return;
    // Bump the render token first so any in-flight partial-recreate
    // `.then` callbacks (from updateLayer's needsRecreate path) bail
    // before they double-add to the canvas. The same token is also
    // passed into renderPage as `isCancelled` so a stale renderPage
    // bails before mutating the canvas.
    const token = ++this.renderToken;
    const isCancelled = () => token !== this.renderToken;
    // Captured NOW, because `renderPage` awaits every image load before
    // it touches the canvas: reading `this.viewport` again afterwards
    // would report whatever it had become in the meantime. A render that
    // began before viewport mode was requested would then mark itself as
    // having painted in viewport mode, the shell would stop re-applying,
    // and the artboard would keep page-sized geometry for ever.
    const viewport = this.viewport;
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
        viewport: viewport ?? undefined,
      });
      if (isCancelled()) return;
      this.fabricByLayerId = result;
      this.viewportRendered = viewport !== null;
      this.applyViewportTransform();
      if (this.needsViewportRepaint(viewport)) await this.renderActivePage();
      return;
    }
    if (!this.activePageId) return;
    const page = this.doc.pages.find((p) => p.id === this.activePageId);
    if (!page) return;
    const result = await renderPage(this.canvas, page, this.doc, {
      editingMaster: false,
      brand: this.brand,
      isCancelled,
      viewport: viewport ?? undefined,
    });
    if (isCancelled()) return;
    this.fabricByLayerId = result;
    this.viewportRendered = viewport !== null;
    this.applyViewportTransform();
    this.flushPendingSelection();
    if (this.needsViewportRepaint(viewport)) await this.renderActivePage();
  }

  /**
   * Was viewport mode turned on WHILE this render was in flight?
   *
   * `renderPage` awaits every image and logo before it touches the
   * canvas, so a render that began in page-sized mode can land long
   * after the shell asked for a viewport — and it lands with page-sized
   * geometry, leaving the artboard drawn at the wrong scale and clipped.
   * Nothing would ask again: the workspace has not resized, so the
   * observer stays quiet.
   *
   * Reconciling here makes the race unwinnable instead of unlikely. It
   * cannot loop: the second pass captures the viewport that is now set,
   * so the condition is false for it.
   */
  private needsViewportRepaint(
    renderedWith: { width: number; height: number } | null,
  ): boolean {
    return renderedWith === null && this.viewport !== null;
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
    // A marquee-drawn multi-selection is an ActiveSelection Fabric
    // builds itself, so it arrives wearing Fabric's default royal blue
    // while every individual object wears our purple. Restyle it as it
    // appears rather than leaving two selection languages on one canvas.
    canvas.on('selection:created', () => {
      this.styleActiveSelection();
      this.emitSelection();
    });
    canvas.on('selection:updated', () => {
      this.styleActiveSelection();
      this.emitSelection();
    });
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
    // Typing is continuous too — a keystroke must not cost two clones
    // of the document.
    this.scheduleContinuousSync();
  }

  private syncLayerFromFabric(obj: FabricObject, discrete: boolean): void {
    if (!this.doc) return;

    // A multi-selection is a Fabric ActiveSelection: a transient group
    // that owns the drag, carries no `brandosId`, and re-expresses its
    // members' coordinates RELATIVE to its own centre. Reading the id
    // off it finds nothing — which is why, before this, dragging two
    // or more layers moved them on screen and wrote NOTHING to the
    // document. The move survived until the next render and then
    // silently reverted.
    //
    // Fan out to the members instead, reading each one's ABSOLUTE
    // transform back out of the selection's matrix.
    const members = selectionMembers(obj);
    if (members) {
      let wrote = false;
      for (const child of members) {
        wrote = this.writeTransform(child, absoluteTransform(child)) || wrote;
      }
      if (!wrote) return;
      this.afterGeometryWrite(discrete);
      return;
    }

    if (!this.writeTransform(obj, fabricToTransform(obj))) return;
    this.afterGeometryWrite(discrete);
  }

  /**
   * Publish a geometry write.
   *
   * A DISCRETE write (the end of a gesture) is published immediately. A
   * CONTINUOUS one — every pointer frame of a drag, resize or rotate —
   * is coalesced to once per animation frame, because publishing means
   * two deep clones of the WHOLE document: one for the history snapshot
   * and one for the change event. At 40 layers that is invisible; on a
   * real deck it was the stall. Fabric paints the drag itself, so
   * nothing downstream needs to hear about it more often than the screen
   * refreshes.
   */
  private afterGeometryWrite(discrete: boolean): void {
    if (discrete) {
      this.cancelContinuousSync();
      this.commitToHistory();
      this.emitChange();
      return;
    }
    this.scheduleContinuousSync();
  }

  private scheduleContinuousSync(): void {
    if (this.continuousFrame !== null) return;
    const run = () => {
      this.continuousFrame = null;
      this.snapshotToHistory();
      this.emitChange();
    };
    this.continuousFrame =
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(run)
        : (setTimeout(run, 16) as unknown as number);
  }

  private cancelContinuousSync(): void {
    if (this.continuousFrame === null) return;
    if (typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(this.continuousFrame);
    } else {
      clearTimeout(this.continuousFrame as unknown as NodeJS.Timeout);
    }
    this.continuousFrame = null;
  }

  /** Write geometry onto the mirror layer. Returns false if unmatched. */
  private writeTransform(obj: FabricObject, transform: Transform): boolean {
    const id = getLayerId(obj);
    if (!id || !this.doc) return false;
    const found = findLayer(this.doc, id);
    if (!found) return false;
    found.layer.transform = transform;
    return true;
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
  // structuredClone is ~2-3x faster than a JSON round-trip and keeps
  // Date/Map/NaN intact. This is the hottest function in the adapter —
  // history and every change emit go through it — so the difference is
  // felt during a drag. JSON stays as the fallback for environments
  // without it (older jsdom).
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      /* non-cloneable payload — fall through */
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * The members of a Fabric ActiveSelection, or null when `obj` is an
 * ordinary object.
 *
 * Detected structurally rather than by `instanceof ActiveSelection` so
 * the adapter keeps working against the `vi.mock('fabric')` stand-in the
 * jsdom test project uses, which has no such class.
 */
/** The same selection chrome `baseProps` gives an individual layer. */
function styleSelectionChrome(obj: FabricObject): void {
  obj.set({
    borderColor: SELECTION_BORDER_COLOR,
    cornerColor: SELECTION_HANDLE_COLOR,
    cornerStrokeColor: SELECTION_HANDLE_STROKE,
    cornerStyle: 'circle',
    transparentCorners: false,
    cornerSize: 12,
    borderScaleFactor: 1.5,
  });
}

function selectionMembers(obj: FabricObject): FabricObject[] | null {
  if (getLayerId(obj)) return null;
  const maybe = obj as FabricObject & { _objects?: FabricObject[]; type?: string };
  if (maybe.type !== 'activeselection' && maybe.type !== 'activeSelection') return null;
  const objs = maybe._objects;
  return Array.isArray(objs) && objs.length > 0 ? objs : null;
}

/**
 * A child's transform in DOCUMENT space.
 *
 * Inside an ActiveSelection a child's own `left`/`top` are relative to
 * the selection's centre, so `fabricToTransform` would record wherever
 * it happens to sit within the marquee. `calcTransformMatrix()` folds in
 * every ancestor transform; decomposing it gives the absolute centre,
 * and Fabric rotates about the object's origin (top-left here), so the
 * corner is the centre minus the half-diagonal rotated by the angle.
 */
function absoluteTransform(child: FabricObject): Transform {
  const d = util.qrDecompose(child.calcTransformMatrix());
  const width = child.width ?? 0;
  const height = child.height ?? 0;
  const w = (width * d.scaleX) / 2;
  const h = (height * d.scaleY) / 2;
  const rad = (d.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: d.translateX - (w * cos - h * sin),
    y: d.translateY - (w * sin + h * cos),
    width,
    height,
    rotation: d.angle,
    scaleX: d.scaleX,
    scaleY: d.scaleY,
  };
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
