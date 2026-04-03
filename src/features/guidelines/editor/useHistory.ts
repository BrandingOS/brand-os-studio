/**
 * useHistory — undo/redo for slide editor.
 * Only captures meaningful content changes (not selection styles).
 */
import { useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface Snapshot {
  html: string;
}

const MAX_HISTORY = 30;

export function useHistory() {
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const lastHtml = useRef('');
  const paused = useRef(false);

  /** Get clean HTML (strip selection styles before saving) */
  const getCleanHtml = useCallback(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return '';
    // Clone and strip selection artifacts
    const clone = canvas.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('[style*="outline: 2px solid"]').forEach(el => {
      (el as HTMLElement).style.outline = '';
      (el as HTMLElement).style.outlineOffset = '';
      (el as HTMLElement).style.boxShadow = '';
      (el as HTMLElement).style.borderRadius = '';
    });
    clone.querySelectorAll('.resize-handle').forEach(el => el.remove());
    return clone.innerHTML;
  }, []);

  /** Save current state (call before making changes) */
  const saveState = useCallback(() => {
    if (paused.current) return;
    const html = getCleanHtml();
    if (!html || html === lastHtml.current) return;
    undoStack.current.push({ html: lastHtml.current });
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
    redoStack.current = [];
    lastHtml.current = html;
  }, [getCleanHtml]);

  /** Undo */
  const undo = useCallback(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas || undoStack.current.length === 0) return;

    const current = getCleanHtml();
    redoStack.current.push({ html: current });

    const prev = undoStack.current.pop()!;
    paused.current = true;
    canvas.innerHTML = prev.html;
    lastHtml.current = prev.html;
    paused.current = false;

    toast.success('Undone', { duration: 1500 });
  }, [getCleanHtml]);

  /** Redo */
  const redo = useCallback(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas || redoStack.current.length === 0) return;

    const current = getCleanHtml();
    undoStack.current.push({ html: current });

    const next = redoStack.current.pop()!;
    paused.current = true;
    canvas.innerHTML = next.html;
    lastHtml.current = next.html;
    paused.current = false;

    toast.success('Redone', { duration: 1500 });
  }, [getCleanHtml]);

  /** Initialize: capture first state when slide loads */
  useEffect(() => {
    const timer = setTimeout(() => {
      lastHtml.current = getCleanHtml();
      undoStack.current = [];
      redoStack.current = [];
    }, 300);
    return () => clearTimeout(timer);
  }, [getCleanHtml]);

  /** Auto-save on content mutations (debounced) */
  useEffect(() => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return;

    let timeout: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      if (paused.current) return;
      clearTimeout(timeout);
      timeout = setTimeout(saveState, 800);
    });

    observer.observe(canvas, { childList: true, subtree: true, characterData: true });
    return () => { observer.disconnect(); clearTimeout(timeout); };
  }, [saveState]);

  /** Keyboard shortcuts */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  return { undo, redo, saveState };
}
