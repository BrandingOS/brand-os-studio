// These are TYPE assertions. `expectTypeOf` compiles to nothing, so the
// gate that enforces this file is `npm run typecheck:ci`, not the vitest
// run — verified by widening `DocumentAdapter` and watching the ratchet
// report a new error while the suite still passed.
import { describe, it, expectTypeOf } from 'vitest';
import type { DocumentAdapter, LayerEditingAdapter, EditorAdapter } from './EditorAdapter';
import { FabricAdapter } from './FabricAdapter';

describe('adapter contracts', () => {
  it('FabricAdapter still satisfies the full layer-editing contract', () => {
    expectTypeOf<FabricAdapter>().toMatchTypeOf<LayerEditingAdapter>();
  });

  it('EditorAdapter stays an alias for the layer-editing contract', () => {
    expectTypeOf<EditorAdapter>().toEqualTypeOf<LayerEditingAdapter>();
  });

  it('a layer-editing adapter is usable wherever a document adapter is wanted', () => {
    expectTypeOf<LayerEditingAdapter>().toMatchTypeOf<DocumentAdapter>();
  });

  /**
   * The hardest constraint on this work was "never widen
   * `DocumentAdapter`" — a layerless renderer only exists because the
   * shell can drive a document without a layer vocabulary, and every
   * member added here is a member every future renderer must implement.
   *
   * Sampling three of the twenty excluded members proved almost nothing:
   * a twenty-first could be added and no test would notice. So the key
   * set is pinned EXACTLY. Adding a member fails this; so does removing
   * one, which is equally worth knowing.
   */
  it('the document contract is exactly these fifteen members', () => {
    expectTypeOf<keyof DocumentAdapter>().toEqualTypeOf<
      | 'mount'
      | 'unmount'
      | 'loadDocument'
      | 'getDocument'
      | 'setActivePage'
      | 'getActivePageId'
      | 'replaceDocument'
      | 'undo'
      | 'redo'
      | 'canUndo'
      | 'canRedo'
      | 'batch'
      | 'setBrand'
      | 'exportAs'
      | 'on'
    >();
  });

  it('carries no layer vocabulary — the members the split moved out', () => {
    type Excluded = Exclude<keyof LayerEditingAdapter, keyof DocumentAdapter>;
    expectTypeOf<Excluded>().toEqualTypeOf<
      | 'addPage'
      | 'removePage'
      | 'duplicatePage'
      | 'duplicatePageAsVariant'
      | 'duplicatePageEmpty'
      | 'reorderPage'
      | 'updatePageDimensions'
      | 'addMasterPage'
      | 'removeMasterPage'
      | 'applyMasterToPage'
      | 'enterMasterMode'
      | 'exitMasterMode'
      | 'getEditingMasterId'
      | 'addLayer'
      | 'updateLayer'
      | 'removeLayer'
      | 'reorderLayer'
      | 'applyLayerPatchAcrossPages'
      | 'getSelection'
      | 'setSelection'
    >();
  });
});
