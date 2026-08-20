// What a renderer must supply for the Design shell to open a document.
//
// The shell owns the chrome — top bar, autosave, save/rename/export/
// duplicate, brand context, the app rail and panel frames, zoom. A
// renderer owns the canvas surface and the properties body, and says
// whether layer-editing affordances apply at all.
//
// Adding a renderer must never require a change to the shell. If it
// does, this type is missing something — extend it here rather than
// branching inside Editor.tsx.

import type { ComponentType } from 'react';
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';
import type { BrandOSDocument } from '@/features/editor/schema';
import type { DesignRendererId } from '@/features/editor/content-types';
import type { Brand } from '@/shared/types/brand';

export type DesignCanvasProps = {
  adapter: DocumentAdapter;
  initialDocument: BrandOSDocument;
};

export type DesignPropertiesProps = {
  adapter: DocumentAdapter;
  brand?: Brand;
};

export type DesignRenderer = {
  id: DesignRendererId;
  createAdapter(): DocumentAdapter;
  Canvas: ComponentType<DesignCanvasProps>;
  /** null when the renderer has no properties body of its own — Fabric
   *  uses the floating toolbar over the selected layer instead. */
  Properties: ComponentType<DesignPropertiesProps> | null;
  /** Drives the shell's layer affordances (Insert, floating toolbar,
   *  page navigator add/remove). False for layerless renderers. */
  supportsLayerEditing: boolean;
};
