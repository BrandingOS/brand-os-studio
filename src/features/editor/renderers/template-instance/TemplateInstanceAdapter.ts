/**
 * The adapter for documents that are a template plus its content.
 *
 * It is a plain state holder, and that is the point: there is no canvas
 * to command. React paints the artwork; this owns the document, the
 * history and the change events the shell's autosave already listens to.
 *
 * `mount` is a no-op. The shell calls it because a Fabric adapter needs a
 * DOM container to attach a canvas to; this renderer's surface is a React
 * component that subscribes to `on('change')` instead. Rather than making
 * the shell branch on renderer kind, the no-op keeps one lifecycle.
 */
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';
import type {
  EditorEvent,
  EditorEventHandler,
  ExportOptions,
  Unsubscribe,
} from '@/features/editor/adapter/EditorAdapter';
import type { BrandOSDocument, DesignBody } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';

/** Depth chosen to match FabricAdapter's ring buffer. */
const HISTORY_LIMIT = 50;

export class TemplateInstanceAdapter implements DocumentAdapter {
  private doc: BrandOSDocument | null = null;
  private past: BrandOSDocument[] = [];
  private future: BrandOSDocument[] = [];
  private brand: Brand | undefined;
  private changeHandlers = new Set<(doc: BrandOSDocument) => void>();
  /** Depth of nested `batch` calls; >0 suppresses per-update history. */
  private batchDepth = 0;
  private batchBaseline: BrandOSDocument | null = null;

  async mount(): Promise<void> {}
  unmount(): void {
    this.changeHandlers.clear();
    this.selectionHandlers.clear();
  }

  async loadDocument(doc: BrandOSDocument): Promise<void> {
    this.doc = doc;
    // loadDocument RESETS history, matching the Fabric adapter's contract.
    this.past = [];
    this.future = [];
  }

  getDocument(): BrandOSDocument {
    if (!this.doc) throw new Error('TemplateInstanceAdapter: no document loaded');
    return this.doc;
  }

  async replaceDocument(doc: BrandOSDocument): Promise<void> {
    this.commit(doc);
  }

  getBody(): DesignBody | undefined {
    return this.doc?.body;
  }

  updateBody(next: DesignBody, _label: string): void {
    this.commit({ ...this.getDocument(), body: next });
  }

  // A template instance has exactly one page. Page navigation is
  // satisfied rather than implemented.
  setActivePage(): void {}
  getActivePageId(): string {
    return this.getDocument().pages[0].id;
  }

  undo(): void {
    const previous = this.past.pop();
    if (!previous) return;
    if (this.doc) this.future.push(this.doc);
    this.doc = previous;
    this.emitChange();
  }

  redo(): void {
    const next = this.future.pop();
    if (!next) return;
    if (this.doc) this.past.push(this.doc);
    this.doc = next;
    this.emitChange();
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }
  canRedo(): boolean {
    return this.future.length > 0;
  }

  batch(_label: string, fn: () => void): void {
    if (this.batchDepth === 0) this.batchBaseline = this.doc;
    this.batchDepth += 1;
    try {
      fn();
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0) {
        // One entry for the whole batch: everything the callback did
        // collapses to a single step back to the baseline.
        if (this.batchBaseline && this.batchBaseline !== this.doc) {
          this.pushHistory(this.batchBaseline);
        }
        this.batchBaseline = null;
        this.emitChange();
      }
    }
  }

  setBrand(brand: Brand | undefined): void {
    this.brand = brand;
  }
  getBrand(): Brand | undefined {
    return this.brand;
  }

  async exportAs(_options: ExportOptions): Promise<Blob> {
    // Rasterisation happens against the LIVE DOM the canvas component
    // rendered — the artwork only exists once React has painted it — so
    // the canvas registers a snapshot function here. Wired in Task 7.
    if (!this.snapshot) {
      throw new Error('TemplateInstanceAdapter: no canvas is mounted to export');
    }
    return this.snapshot();
  }

  /** Set by TemplateInstanceCanvas while it is mounted. */
  snapshot: (() => Promise<Blob>) | null = null;

  /* ── Selection ──────────────────────────────────────────────────
   * Which bound content path is selected on the artwork. It lives here
   * because the canvas and the properties panel are siblings that only
   * share this object — and it is NOT part of the document, so it is
   * never saved and never recorded in history.
   */
  private selectedPath: string | null = null;
  private selectionHandlers = new Set<(path: string | null) => void>();

  getSelectedPath(): string | null {
    return this.selectedPath;
  }

  setSelectedPath(path: string | null): void {
    if (this.selectedPath === path) return;
    this.selectedPath = path;
    for (const handler of this.selectionHandlers) handler(path);
  }

  onSelectedPathChange(fn: (path: string | null) => void): Unsubscribe {
    this.selectionHandlers.add(fn);
    return () => this.selectionHandlers.delete(fn);
  }

  on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe {
    // 'selection' is part of the shared event union but a layerless
    // renderer has no layer to select, so it is accepted and never fired.
    if (event !== 'change') return () => {};
    const fn = handler as (doc: BrandOSDocument) => void;
    this.changeHandlers.add(fn);
    return () => this.changeHandlers.delete(fn);
  }

  private commit(next: BrandOSDocument): void {
    const previous = this.doc;
    this.doc = next;
    if (this.batchDepth === 0 && previous) this.pushHistory(previous);
    if (this.batchDepth === 0) this.emitChange();
  }

  private pushHistory(entry: BrandOSDocument): void {
    this.past.push(entry);
    if (this.past.length > HISTORY_LIMIT) this.past.shift();
    // Any new edit invalidates the redo branch.
    this.future = [];
  }

  private emitChange(): void {
    const doc = this.doc;
    if (!doc) return;
    for (const handler of this.changeHandlers) handler(doc);
  }
}
