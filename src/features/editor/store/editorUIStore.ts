// Editor UI state — Zustand store.
//
// This is the UI-only sibling of the adapter's mirror document. The
// document state lives INSIDE the FabricAdapter and is observed via
// `adapter.on('change', ...)`. This store carries everything that's
// purely about how the editor presents itself: which tool is selected,
// zoom level, which side panels are open, etc.

import { create } from 'zustand';

export type EditorTool = 'select' | 'text' | 'rectangle' | 'ellipse' | 'image';

interface EditorUIState {
  tool: EditorTool;
  zoom: number;
  showLayersPanel: boolean;
  showPropertiesPanel: boolean;

  setTool: (tool: EditorTool) => void;
  setZoom: (zoom: number) => void;
  toggleLayersPanel: () => void;
  togglePropertiesPanel: () => void;
}

export const useEditorUIStore = create<EditorUIState>((set) => ({
  tool: 'select',
  zoom: 1,
  showLayersPanel: true,
  showPropertiesPanel: true,
  setTool: (tool) => set({ tool }),
  setZoom: (zoom) => set({ zoom }),
  toggleLayersPanel: () => set((s) => ({ showLayersPanel: !s.showLayersPanel })),
  togglePropertiesPanel: () => set((s) => ({ showPropertiesPanel: !s.showPropertiesPanel })),
}));
