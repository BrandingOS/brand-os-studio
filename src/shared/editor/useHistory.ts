/**
 * useHistory — per-slide undo/redo for the slide editor.
 *
 * Each slide has its own undo and redo stack so undo/redo never jumps
 * across slides. The MutationObserver re-binds whenever the active
 * slide changes, and slide-change navigation itself is ignored
 * (we only record edits made by the user inside the active slide).
 */
import { useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface Snapshot {
  html: string;
}

interface SlideHistory {
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  lastHtml: string;
}

const MAX_HISTORY = 50;

interface UseHistoryOptions {
  /** ID of the currently visible slide — used to scope history */
  currentSlideId?: string;
}

export function useHistory(options: UseHistoryOptions = {}) {
  const { currentSlideId } = options;
  // Per-slide history map keyed by slide id
  const histories = useRef<Map<string, SlideHistory>>(new Map());
  const paused = useRef(false);
  const currentIdRef = useRef<string | undefined>(currentSlideId);

  // Keep currentIdRef in sync
  useEffect(() => {
    currentIdRef.current = currentSlideId;
  }, [currentSlideId]);

  /** Get clean HTML of the current slide canvas (strip selection styles) */
  const getCleanHtml = useCallback((): string => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
    if (!canvas) return '';
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

  /** Get or create the history entry for the current slide */
  const getCurrentHistory = useCallback((): SlideHistory | null => {
    const id = currentIdRef.current;
    if (!id) return null;
    let entry = histories.current.get(id);
    if (!entry) {
      entry = { undoStack: [], redoStack: [], lastHtml: '' };
      histories.current.set(id, entry);
    }
    return entry;
  }, []);

  /** Capture current state into the active slide's history */
  const saveState = useCallback(() => {
    if (paused.current) return;
    const entry = getCurrentHistory();
    if (!entry) return;
    const html = getCleanHtml();
    if (!html || html === entry.lastHtml) return;
    if (entry.lastHtml) {
      entry.undoStack.push({ html: entry.lastHtml });
      if (entry.undoStack.length > MAX_HISTORY) entry.undoStack.shift();
    }
    entry.redoStack = [];
    entry.lastHtml = html;
  }, [getCleanHtml, getCurrentHistory]);

  /** Undo — restore previous snapshot for the current slide */
  const undo = useCallback(() => {
    const entry = getCurrentHistory();
    if (!entry || entry.undoStack.length === 0) {
      toast.info('Nothing to undo on this slide', { duration: 1500 });
      return;
    }
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
    if (!canvas) return;

    const current = getCleanHtml();
    entry.redoStack.push({ html: current });
    const prev = entry.undoStack.pop()!;

    paused.current = true;
    canvas.innerHTML = prev.html;
    entry.lastHtml = prev.html;
    // Re-enable history capture after the DOM settles
    setTimeout(() => { paused.current = false; }, 50);

    toast.success('Undone', { duration: 1200 });
  }, [getCleanHtml, getCurrentHistory]);

  /** Redo — restore next snapshot for the current slide */
  const redo = useCallback(() => {
    const entry = getCurrentHistory();
    if (!entry || entry.redoStack.length === 0) {
      toast.info('Nothing to redo on this slide', { duration: 1500 });
      return;
    }
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
    if (!canvas) return;

    const current = getCleanHtml();
    entry.undoStack.push({ html: current });
    const next = entry.redoStack.pop()!;

    paused.current = true;
    canvas.innerHTML = next.html;
    entry.lastHtml = next.html;
    setTimeout(() => { paused.current = false; }, 50);

    toast.success('Redone', { duration: 1200 });
  }, [getCleanHtml, getCurrentHistory]);

  /**
   * When the active slide changes, re-bind the MutationObserver to the
   * new slide canvas and capture its initial state. Slide changes
   * themselves never produce a history entry.
   */
  useEffect(() => {
    if (!currentSlideId) return;

    // Pause observation while React re-renders the new slide
    paused.current = true;

    const setup = setTimeout(() => {
      const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
      if (!canvas) return;

      // Initialize this slide's history baseline
      const entry = histories.current.get(currentSlideId) || { undoStack: [], redoStack: [], lastHtml: '' };
      if (!entry.lastHtml) {
        entry.lastHtml = getCleanHtml();
      }
      histories.current.set(currentSlideId, entry);

      // Re-bind observer to the new canvas
      const observer = new MutationObserver(() => {
        if (paused.current) return;
        // Debounce rapid edits
        clearTimeout((observer as any).__timer);
        (observer as any).__timer = setTimeout(saveState, 600);
      });

      observer.observe(canvas, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'src', 'href'] });

      // Resume capture after the new slide has settled
      paused.current = false;

      // Cleanup
      (canvas as any).__historyObserver = observer;
    }, 150);

    return () => {
      clearTimeout(setup);
      const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
      const observer = canvas ? (canvas as any).__historyObserver : null;
      if (observer) {
        observer.disconnect();
        delete (canvas as any).__historyObserver;
      }
    };
  }, [currentSlideId, saveState, getCleanHtml]);

  /** Keyboard shortcuts: Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z / Cmd/Ctrl+Y */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Allow undo inside text fields too — but only if no input/textarea is currently focused
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmd = isMac ? e.metaKey : e.ctrlKey;
      if (!cmd) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [undo, redo]);

  return { undo, redo, saveState };
}
