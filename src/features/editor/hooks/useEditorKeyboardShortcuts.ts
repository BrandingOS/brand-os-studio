// Centralized keyboard shortcuts for the editor shell.
// Cmd/Ctrl+S → flush save. Cmd/Ctrl+Z → undo. Cmd/Ctrl+Shift+Z → redo.
// Cmd/Ctrl + (= or +) → zoom canvas in. Cmd/Ctrl + - → zoom canvas out.
// Cmd/Ctrl + 0 → fit canvas to view. All zoom shortcuts preventDefault
// so the browser's page-zoom doesn't fire instead.

import { useEffect } from 'react';
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';

interface Options {
  /** Undo/redo are DOCUMENT capabilities, not layer ones — every
   *  renderer has a history, so this is deliberately the narrower
   *  contract. A layerless renderer keeps its keyboard shortcuts. */
  adapter: DocumentAdapter | null;
  onFlushSave: () => void | Promise<void>;
  /** Disable shortcuts when an element with this `data-editor-typing` attr is focused. */
  enabled?: boolean;
  /** Zoom-in handler. When provided, Cmd/Ctrl + (=|+) calls it
   *  and preventDefaults so the browser's page-zoom doesn't fire. */
  onZoomIn?: () => void;
  /** Zoom-out handler. When provided, Cmd/Ctrl + - calls it. */
  onZoomOut?: () => void;
  /** Fit-to-view handler. When provided, Cmd/Ctrl + 0 calls it. */
  onZoomFit?: () => void;
}

export function useEditorKeyboardShortcuts({
  adapter,
  onFlushSave,
  enabled = true,
  onZoomIn,
  onZoomOut,
  onZoomFit,
}: Options): void {
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
      // Canvas zoom shortcuts. e.key for "+" arrives as "=" on most
      // layouts (the unshifted key); accept both so US + non-US
      // keyboards both work. Always preventDefault so the browser's
      // page-zoom doesn't kick in.
      if (onZoomIn && (key === '=' || key === '+')) {
        e.preventDefault();
        onZoomIn();
        return;
      }
      if (onZoomOut && key === '-') {
        e.preventDefault();
        onZoomOut();
        return;
      }
      if (onZoomFit && key === '0') {
        e.preventDefault();
        onZoomFit();
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adapter, onFlushSave, enabled, onZoomIn, onZoomOut, onZoomFit]);
}
