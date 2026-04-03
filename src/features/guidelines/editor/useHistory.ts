/**
 * useHistory — undo/redo system for the slide editor.
 *
 * Captures the innerHTML of the slide before each edit,
 * stores in a stack, and restores on undo/redo.
 */
import { useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface HistoryState {
  slideId: string;
  html: string;
}

const MAX_HISTORY = 50;

export function useHistory() {
  const undoStack = useRef<HistoryState[]>([]);
  const redoStack = useRef<HistoryState[]>([]);
  const lastSavedRef = useRef<string>('');

  /** Capture current state before making a change */
  const pushState = useCallback(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return;

    const html = canvas.innerHTML;
    // Don't push if nothing changed
    if (html === lastSavedRef.current) return;

    undoStack.current.push({
      slideId: canvas.getAttribute('data-slide-canvas') || '',
      html,
    });

    // Limit stack size
    if (undoStack.current.length > MAX_HISTORY) {
      undoStack.current.shift();
    }

    // Clear redo stack on new action
    redoStack.current = [];
    lastSavedRef.current = html;
  }, []);

  /** Undo last change */
  const undo = useCallback(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas || undoStack.current.length === 0) {
      toast.error('Nothing to undo');
      return;
    }

    // Save current state to redo
    redoStack.current.push({
      slideId: '',
      html: canvas.innerHTML,
    });

    // Restore previous state
    const prev = undoStack.current.pop()!;
    canvas.innerHTML = prev.html;
    lastSavedRef.current = prev.html;
    toast.success('Undone');
  }, []);

  /** Redo last undone change */
  const redo = useCallback(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas || redoStack.current.length === 0) {
      toast.error('Nothing to redo');
      return;
    }

    // Save current state to undo
    undoStack.current.push({
      slideId: '',
      html: canvas.innerHTML,
    });

    // Restore redo state
    const next = redoStack.current.pop()!;
    canvas.innerHTML = next.html;
    lastSavedRef.current = next.html;
    toast.success('Redone');
  }, []);

  /** Auto-capture state on mutations (MutationObserver) */
  useEffect(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return;

    let timeout: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      // Debounce — capture state 500ms after last mutation
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const html = canvas.innerHTML;
        if (html !== lastSavedRef.current) {
          undoStack.current.push({ slideId: '', html: lastSavedRef.current });
          if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
          redoStack.current = [];
          lastSavedRef.current = html;
        }
      }, 500);
    });

    // Capture initial state
    lastSavedRef.current = canvas.innerHTML;

    observer.observe(canvas, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });

    return () => {
      observer.disconnect();
      clearTimeout(timeout);
    };
  }, []);

  /** Keyboard shortcut handler */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  return { undo, redo, pushState, canUndo: undoStack.current.length > 0, canRedo: redoStack.current.length > 0 };
}
