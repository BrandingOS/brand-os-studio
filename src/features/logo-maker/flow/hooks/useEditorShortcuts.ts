import { useEffect } from 'react';
import type { Canvas } from 'fabric';
import { bringForward, deleteSelected, duplicateSelected, sendBackward } from '../utils/fabric-setup';
import type { HistoryAPI } from './useEditorHistory';

export type ToolId = 'select' | 'text' | 'rect' | 'circle' | 'line';

interface Options {
  canvas: Canvas | null;
  history: HistoryAPI;
  setTool: (tool: ToolId) => void;
  addText: () => void;
  onSave: () => void;
  onFit: () => void;
  onHundred: () => void;
}

// Ignore shortcuts while editing text or typing into an input.
function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) return true;
  return false;
}

export function useEditorShortcuts({
  canvas,
  history,
  setTool,
  addText,
  onSave,
  onFit,
  onHundred,
}: Options) {
  useEffect(() => {
    if (!canvas) return;

    const onKey = (e: KeyboardEvent) => {
      // Fabric sets an internal flag when a Textbox is being edited; bail out in that case.
      const active = canvas.getActiveObject();
      const editingText =
        active && 'isEditing' in active && (active as unknown as { isEditing: boolean }).isEditing;
      if (editingText || isTypingTarget(e.target)) return;

      const meta = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl combos
      if (meta) {
        const key = e.key.toLowerCase();
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          history.undo();
          return;
        }
        if ((key === 'z' && e.shiftKey) || key === 'y') {
          e.preventDefault();
          history.redo();
          return;
        }
        if (key === 'd') {
          e.preventDefault();
          duplicateSelected(canvas);
          return;
        }
        if (key === 's') {
          e.preventDefault();
          onSave();
          return;
        }
        if (key === ']') {
          e.preventDefault();
          bringForward(canvas);
          return;
        }
        if (key === '[') {
          e.preventDefault();
          sendBackward(canvas);
          return;
        }
        if (key === '0') {
          e.preventDefault();
          onFit();
          return;
        }
        if (key === '1') {
          e.preventDefault();
          onHundred();
          return;
        }
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (canvas.getActiveObjects().length > 0) {
          e.preventDefault();
          deleteSelected(canvas);
        }
        return;
      }

      // Tool selection — single keys when nothing else is pressed
      if (!meta && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setTool('select');
            break;
          case 't':
            e.preventDefault();
            setTool('text');
            addText();
            break;
          case 'r':
            setTool('rect');
            break;
          case 'o':
            setTool('circle');
            break;
          case 'l':
            setTool('line');
            break;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canvas, history, setTool, addText, onSave, onFit, onHundred]);
}
