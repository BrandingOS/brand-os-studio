// DocumentAdapter — what the Design shell needs from ANY renderer.
//
// Split out of EditorAdapter when the editor gained a second renderer.
// The line it draws: a document has an identity, a body, history, a
// brand and an export; only SOME documents are pages of layers.
//
// Layer editing lives in `LayerEditingAdapter` (same file as before) so
// a layerless renderer does not have to publish two dozen no-op methods
// — which would be the smell that says the abstraction was forced.
//
// `on('selection')` is declared here because the event union is one
// type, but a layerless renderer never emits it.

import type { BrandOSDocument } from '@/features/editor/schema';
import type { Brand } from '@/shared/types/brand';
import type {
  EditorEvent,
  EditorEventHandler,
  ExportOptions,
  Unsubscribe,
} from './EditorAdapter';

export interface DocumentAdapter {
  // Lifecycle
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;

  // Document
  loadDocument(doc: BrandOSDocument): Promise<void>;
  getDocument(): BrandOSDocument;

  // Page navigation — every document has at least one page by schema.
  setActivePage(pageId: string): void;
  getActivePageId(): string;

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

  // Brand context
  /**
   * Sets the active brand for asset resolution. Currently used by
   * logo layers — `<LogoLayer variant>` resolves through
   * `resolveBrandLogo(brand, role)` to a real asset URL. When the
   * brand changes (or arrives late after mount), the adapter
   * re-renders all logo layers on the active page so the new
   * variants paint immediately. Pass `undefined` to clear.
   */
  setBrand(brand: Brand | undefined): void;

  // Export
  exportAs(options: ExportOptions): Promise<Blob>;

  // Events
  on<E extends EditorEvent>(event: E, handler: EditorEventHandler<E>): Unsubscribe;
}
