// Centralized keyboard shortcuts for the editor shell.
// Cmd/Ctrl+S → flush save. Cmd/Ctrl+Z → undo. Cmd/Ctrl+Shift+Z → redo.

import { useEffect } from 'react';
import type { EditorAdapter } from '@/features/editor/adapter/EditorAdapter';

interface Options {
  adapter: EditorAdapter | null;
  onFlushSave: () => void | Promise<void>;
  /** Disable shortcuts when an element with this `data-editor-typing` attr is focused. */
  enabled?: boolean;
}

export function useEditorKeyboardShortcuts({ adapter, onFlushSave, enabled = true }: Options): void {
  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      // Ignore shortcuts while text is being edited inline (Fabric Textbox
      // editing or any input/textarea).
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;

      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        void onFlushSave();
        return;
      }
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        adapter?.undo();
        return;
      }
      if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        adapter?.redo();
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adapter, onFlushSave, enabled]);
}
