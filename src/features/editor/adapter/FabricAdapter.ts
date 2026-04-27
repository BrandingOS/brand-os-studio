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
  Ellipse,
  FabricImage,
  Line,
  Polygon,
  Rect,
  Textbox,
  type FabricObject,
  type TPointerEventInfo,
} from 'fabric';

import type {
  BrandOSDocument,
  ImageLayer,
  Layer,
  LogoLayer,
  Page,
  ShapeLayer,
  SvgLayer,
  TextLayer,
} from '@/features/editor/schema';
import type {
  EditorAdapter,
  EditorEvent,
  EditorEventHandler,
  ExportOptions,
  SelectionState,
  Unsubscribe,
} from './EditorAdapter';
import { HistoryRing } from './historyRing';
import {
  fabricToTransform,
  findLayer,
  getLayerId,
  layerToFabric,
  renderPage,
  setLayerId,
} from './layerMapping';
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

  /** Map from layer id to its current Fabric representation on the canvas. */
  private fabricByLayerId = new Map<string, FabricObject>();

  /** Snapshot ring for undo/redo. */
  private history = new HistoryRing<BrandOSDocument>();

  /** Snap-guide overlay objects — created on drag, removed on drag end. */
  private guideLines: FabricObject[] = [];

  /** Subscribers. */
  private changeHandlers = new Set<ChangeHandler>();
  private selectionHandlers = new Set<SelectionHandler>();

  /** When true, internal updates skip emitting `change` (avoids infinite loops). */
  private suppressChange = false;

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
    this.history.reset(this.doc);
    await this.renderActivePage();
    this.emitChange();
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
    if (this.activePageId === pageId) return;
    this.activePageId = pageId;
    void this.renderActivePage();
  }

  getActivePageId(): string {
    if (!this.activePageId) throw new Error('No active page');
    return this.activePageId;
  }

  // ─── Layer operations ─────────────────────────────────────────────────

  addLayer(pageId: string, layer: Layer): void {
    const page = this.requirePage(pageId);
    page.layers.push(clone(layer));
    if (pageId === this.activePageId) {
      void layerToFabric(layer).then((obj) => {
        this.canvas?.add(obj);
        this.fabricByLayerId.set(layer.id, obj);
        this.canvas?.requestRenderAll();
      });
    }
    this.history.commit(this.doc!);
    this.emitChange();
  }

  updateLayer(pageId: string, layerId: string, patch: Partial<Layer>): void {
    const page = this.requirePage(pageId);
    const idx = page.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    page.layers[idx] = { ...page.layers[idx], ...patch } as Layer;
    // Reflect onto the canvas if active page
    if (pageId === this.activePageId) {
      const obj = this.fabricByLayerId.get(layerId);
      if (obj) {
        applyPatchToFabric(obj, patch);
        this.canvas?.requestRenderAll();
      }
    }
    this.history.commit(this.doc!);
    this.emitChange();
  }

  removeLayer(pageId: string, layerId: string): void {
    const page = this.requirePage(pageId);
    page.layers = page.layers.filter((l) => l.id !== layerId);
    if (pageId === this.activePageId) {
      const obj = this.fabricByLayerId.get(layerId);
      if (obj) this.canvas?.remove(obj);
      this.fabricByLayerId.delete(layerId);
      this.canvas?.requestRenderAll();
    }
    this.history.commit(this.doc!);
    this.emitChange();
  }

  reorderLayer(pageId: string, layerId: string, newIndex: number): void {
    const page = this.requirePage(pageId);
    const idx = page.layers.findIndex((l) => l.id === layerId);
    if (idx < 0) return;
    const [layer] = page.layers.splice(idx, 1);
    page.layers.splice(newIndex, 0, layer);
    if (pageId === this.activePageId) {
      const obj = this.fabricByLayerId.get(layerId);
      if (obj && this.canvas) {
        this.canvas.moveObjectTo(obj, newIndex);
      }
    }
    this.history.commit(this.doc!);
    this.emitChange();
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
    if (!this.canvas || !this.doc || !this.activePageId) return;
    const page = this.doc.pages.find((p) => p.id === this.activePageId);
    if (!page) return;
    this.fabricByLayerId = await renderPage(this.canvas, page);
  }

  private requirePage(pageId: string): Page {
    if (!this.doc) throw new Error('No document loaded');
    const page = this.doc.pages.find((p) => p.id === pageId);
    if (!page) throw new Error(`Page ${pageId} not found`);
    return page;
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
    this.history.snapshot(this.doc);
    this.emitChange();
  }

  private syncLayerFromFabric(obj: FabricObject, discrete: boolean): void {
    const id = getLayerId(obj);
    if (!id || !this.doc) return;
    const found = findLayer(this.doc, id);
    if (!found) return;
    found.layer.transform = fabricToTransform(obj);
    if (discrete) this.history.commit(this.doc);
    else this.history.snapshot(this.doc);
    this.emitChange();
  }

  private emitChange(): void {
    if (this.suppressChange || !this.doc) return;
    const snapshot = clone(this.doc);
    for (const h of this.changeHandlers) h(snapshot);
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
 * Apply a layer patch to a Fabric object's properties. Phase 1 handles
 * the common geometry + visibility + lock fields; deeper per-kind props
 * (text content, shape fill) round-trip via `loadDocument` after the
 * mirror is updated.
 */
function applyPatchToFabric(obj: FabricObject, patch: Partial<Layer>): void {
  if (patch.transform) {
    obj.set({
      left: patch.transform.x,
      top: patch.transform.y,
      width: patch.transform.width,
      height: patch.transform.height,
      angle: patch.transform.rotation,
      scaleX: patch.transform.scaleX,
      scaleY: patch.transform.scaleY,
    });
  }
  if (patch.opacity != null) obj.set({ opacity: patch.opacity });
  if (patch.visible != null) obj.set({ visible: patch.visible });
  if (patch.locked != null) {
    obj.set({
      selectable: !patch.locked,
      evented: !patch.locked,
      lockMovementX: patch.locked,
      lockMovementY: patch.locked,
      lockScalingX: patch.locked,
      lockScalingY: patch.locked,
      lockRotation: patch.locked,
    });
  }
  if (patch.kind === 'text' && patch.text != null && obj instanceof Textbox) {
    obj.set({ text: patch.text });
  }
}
