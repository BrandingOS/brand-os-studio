/**
 * useHistory — persisted, per-slide undo/redo for the slide editor.
 *
 * Backed by useEditorHistoryStore (Zustand + localStorage), so:
 * - Edits survive reloads
 * - Each slide has its own snapshot timeline
 * - Users can jump to any historical snapshot via the History panel
 */
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useEditorHistoryStore, type Snapshot } from './historyStore';

interface UseHistoryOptions {
  /** Unique editor instance key — e.g. `logo-pres-{brandId}` */
  editorKey: string;
  /** ID of the currently visible slide */
  currentSlideId?: string;
}

/** Strip transient editing styles from cloned HTML */
function getCleanHtml(): string {
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
}

export function useHistory({ editorKey, currentSlideId }: UseHistoryOptions) {
  const store = useEditorHistoryStore();
  const paused = useRef(false);
  const currentIdRef = useRef<string | undefined>(currentSlideId);

  useEffect(() => { currentIdRef.current = currentSlideId; }, [currentSlideId]);

  /** Apply a snapshot's HTML to the current canvas */
  const applySnapshot = useCallback((snap: Snapshot | null) => {
    if (!snap) return;
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
    if (!canvas) return;
    paused.current = true;
    canvas.innerHTML = snap.html;
    setTimeout(() => { paused.current = false; }, 80);
  }, []);

  /** Capture current state into the store */
  const saveState = useCallback(() => {
    if (paused.current) return;
    const id = currentIdRef.current;
    if (!id) return;
    const html = getCleanHtml();
    if (!html) return;
    store.pushSnapshot(editorKey, id, html);
  }, [editorKey, store]);

  /** Undo */
  const undo = useCallback(() => {
    const id = currentIdRef.current;
    if (!id) return;
    const snap = store.undo(editorKey, id);
    if (!snap) {
      toast.info('Nothing to undo on this slide', { duration: 1500 });
      return;
    }
    applySnapshot(snap);
    toast.success('Undone', { duration: 1200 });
  }, [editorKey, store, applySnapshot]);

  /** Redo */
  const redo = useCallback(() => {
    const id = currentIdRef.current;
    if (!id) return;
    const snap = store.redo(editorKey, id);
    if (!snap) {
      toast.info('Nothing to redo on this slide', { duration: 1500 });
      return;
    }
    applySnapshot(snap);
    toast.success('Redone', { duration: 1200 });
  }, [editorKey, store, applySnapshot]);

  /** Jump to a specific snapshot index */
  const jumpTo = useCallback((index: number) => {
    const id = currentIdRef.current;
    if (!id) return;
    const snap = store.jumpTo(editorKey, id, index);
    if (snap) {
      applySnapshot(snap);
      toast.success('Restored from history', { duration: 1200 });
    }
  }, [editorKey, store, applySnapshot]);

  /**
   * On slide change: restore the latest persisted snapshot for that slide
   * (if any), then re-bind the MutationObserver to the new canvas.
   */
  useEffect(() => {
    if (!currentSlideId) return;

    paused.current = true;

    const setup = setTimeout(() => {
      const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
      if (!canvas) return;

      // Restore latest snapshot if one exists
      const latest = store.getCurrentSnapshot(editorKey, currentSlideId);
      if (latest) {
        canvas.innerHTML = latest.html;
      } else {
        // First time on this slide — capture the initial state as the baseline
        const html = getCleanHtml();
        if (html) {
          store.pushSnapshot(editorKey, currentSlideId, html, 'Initial');
        }
      }

      // Re-bind observer
      const observer = new MutationObserver(() => {
        if (paused.current) return;
        clearTimeout((observer as any).__timer);
        (observer as any).__timer = setTimeout(saveState, 700);
      });

      observer.observe(canvas, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style', 'src', 'href'],
      });

      paused.current = false;
      (canvas as any).__historyObserver = observer;
    }, 200);

    return () => {
      clearTimeout(setup);
      const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
      const observer = canvas ? (canvas as any).__historyObserver : null;
      if (observer) {
        observer.disconnect();
        delete (canvas as any).__historyObserver;
      }
    };
  }, [currentSlideId, editorKey, saveState, store]);

  /** Keyboard shortcuts */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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

  return { undo, redo, jumpTo, saveState };
}
