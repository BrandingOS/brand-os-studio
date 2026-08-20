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

  it('the document contract carries no layer vocabulary', () => {
    expectTypeOf<DocumentAdapter>().not.toHaveProperty('addLayer');
    expectTypeOf<DocumentAdapter>().not.toHaveProperty('addPage');
    expectTypeOf<DocumentAdapter>().not.toHaveProperty('getSelection');
  });
});
