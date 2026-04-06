/**
 * EditorContext — provides editor-wide state to nested components.
 * Used by EditableSlide and FloatingToolbar to access the brand
 * (for asset pickers, brand colors, etc.) without prop drilling.
 */
import { createContext, useContext } from 'react';
import type { Brand } from '@/shared/types/brand';

export interface EditorContextValue {
  brand: Brand;
}

export const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditorContext(): EditorContextValue | null {
  return useContext(EditorContext);
}
