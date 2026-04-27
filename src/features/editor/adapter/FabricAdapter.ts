// FabricAdapter — Phase 1 will implement this against Fabric.js v6.
// Phase 0 ships only this stub so the interface is real and the lint
// guard (no `from 'fabric'` outside this folder) has a real file to
// guard. Every method throws `NotImplementedError` to make
// premature wiring loud and obvious.
//
// When Phase 1 lands, replace these throws with the real Fabric calls.
// Do NOT add `import { Canvas, ... } from 'fabric'` anywhere outside
// this file — see `eslint.config.js` `no-restricted-imports`.

import type {
  EditorAdapter,
  EditorEvent,
  EditorEventHandler,
  ExportOptions,
  SelectionState,
  Unsubscribe,
} from './EditorAdapter';
import type { BrandOSDocument, Layer } from '@/features/editor/schema';

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`FabricAdapter.${method} not implemented — Phase 1 ships the implementation.`);
    this.name = 'NotImplementedError';
  }
}

export class FabricAdapter implements EditorAdapter {
  mount(_container: HTMLElement): Promise<void> {
    throw new NotImplementedError('mount');
  }
  unmount(): void {
    throw new NotImplementedError('unmount');
  }
  loadDocument(_doc: BrandOSDocument): Promise<void> {
    throw new NotImplementedError('loadDocument');
  }
  getDocument(): BrandOSDocument {
    throw new NotImplementedError('getDocument');
  }
  setActivePage(_pageId: string): void {
    throw new NotImplementedError('setActivePage');
  }
  getActivePageId(): string {
    throw new NotImplementedError('getActivePageId');
  }
  addLayer(_pageId: string, _layer: Layer): void {
    throw new NotImplementedError('addLayer');
  }
  updateLayer(_pageId: string, _layerId: string, _patch: Partial<Layer>): void {
    throw new NotImplementedError('updateLayer');
  }
  removeLayer(_pageId: string, _layerId: string): void {
    throw new NotImplementedError('removeLayer');
  }
  reorderLayer(_pageId: string, _layerId: string, _newIndex: number): void {
    throw new NotImplementedError('reorderLayer');
  }
  getSelection(): SelectionState {
    throw new NotImplementedError('getSelection');
  }
  setSelection(_layerIds: string[]): void {
    throw new NotImplementedError('setSelection');
  }
  undo(): void {
    throw new NotImplementedError('undo');
  }
  redo(): void {
    throw new NotImplementedError('redo');
  }
  canUndo(): boolean {
    throw new NotImplementedError('canUndo');
  }
  canRedo(): boolean {
    throw new NotImplementedError('canRedo');
  }
  exportAs(_options: ExportOptions): Promise<Blob> {
    throw new NotImplementedError('exportAs');
  }
  on<E extends EditorEvent>(_event: E, _handler: EditorEventHandler<E>): Unsubscribe {
    throw new NotImplementedError('on');
  }
}
