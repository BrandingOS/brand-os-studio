// The Fabric renderer — the canvas surface every document opened
// before pluggable renderers existed, and still the only one that
// edits layers.
//
// This module names `FabricAdapter` (the class) but never `fabric`
// itself, which is what keeps the canvas library confined to
// `src/features/editor/adapter/` where the lint guard expects it.

import { FabricAdapter } from '@/features/editor/adapter/FabricAdapter';
import { EditorCanvasMount } from '@/features/editor/shell/EditorCanvasMount';
import type { DesignRenderer } from '../types';

export const fabricRenderer: DesignRenderer = {
  id: 'fabric',
  createAdapter: () => new FabricAdapter(),
  Canvas: EditorCanvasMount,
  // Fabric's properties live in the floating toolbar over the selected
  // layer, not in a panel — see EditorFloatingToolbar.
  Properties: null,
  supportsLayerEditing: true,
};
