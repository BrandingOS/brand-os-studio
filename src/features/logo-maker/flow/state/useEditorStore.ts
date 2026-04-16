import { create } from 'zustand';
import type * as fabric from 'fabric';

interface EditorState {
  fabricCanvas: fabric.Canvas | null;
  initialSVG: string | null;
  isDirty: boolean;
  setFabricCanvas: (canvas: fabric.Canvas | null) => void;
  setInitialSVG: (svg: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  fabricCanvas: null,
  initialSVG: null,
  isDirty: false,
  setFabricCanvas: (fabricCanvas) => set({ fabricCanvas }),
  setInitialSVG: (initialSVG) => set({ initialSVG }),
  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),
}));
