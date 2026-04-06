/**
 * useHistory — persisted, per-slide undo/redo for the slide editor.
 *
 * Backed by useEditorHistoryStore (Zustand + localStorage). Uses
 * getState() inside callbacks/effects to avoid re-render loops that
 * would otherwise cause the canvas HTML to be repeatedly overwritten.
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
    setTimeout(() => { paused.current = false; }, 100);
  }, []);

  /** Capture current state into the store (uses getState — no re-render loop) */
  const saveState = useCallback(() => {
    if (paused.current) return;
    const id = currentIdRef.current;
    if (!id) return;
    const html = getCleanHtml();
    if (!html) return;
    useEditorHistoryStore.getState().pushSnapshot(editorKey, id, html);
  }, [editorKey]);

  /** Undo */
  const undo = useCallback(() => {
    const id = currentIdRef.current;
    if (!id) return;
    const snap = useEditorHistoryStore.getState().undo(editorKey, id);
    if (!snap) {
      toast.info('Nothing to undo on this slide', { duration: 1500 });
      return;
    }
    applySnapshot(snap);
    toast.success('Undone', { duration: 1200 });
  }, [editorKey, applySnapshot]);

  /** Redo */
  const redo = useCallback(() => {
    const id = currentIdRef.current;
    if (!id) return;
    const snap = useEditorHistoryStore.getState().redo(editorKey, id);
    if (!snap) {
      toast.info('Nothing to redo on this slide', { duration: 1500 });
      return;
    }
    applySnapshot(snap);
    toast.success('Redone', { duration: 1200 });
  }, [editorKey, applySnapshot]);

  /** Jump to a specific snapshot index */
  const jumpTo = useCallback((index: number) => {
    const id = currentIdRef.current;
    if (!id) return;
    const snap = useEditorHistoryStore.getState().jumpTo(editorKey, id, index);
    if (snap) {
      applySnapshot(snap);
      toast.success('Restored from history', { duration: 1200 });
    }
  }, [editorKey, applySnapshot]);

  /**
   * On slide change: re-bind the MutationObserver. We DO NOT auto-restore
   * persisted HTML because React owns the slide tree — restoring stale HTML
   * over a new React render would break the editor when styles or content
   * change. History snapshots are only used for undo/redo and the History
   * panel within the same session.
   */
  useEffect(() => {
    if (!currentSlideId) return;

    paused.current = true;
    let observer: MutationObserver | null = null;

    const setup = setTimeout(() => {
      const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
      if (!canvas) return;

      // Capture the React-rendered baseline as the first snapshot
      // (only if no snapshots exist yet for this slide in this session)
      const existing = useEditorHistoryStore.getState().getHistory(editorKey, currentSlideId);
      if (!existing || existing.snapshots.length === 0) {
        const html = getCleanHtml();
        if (html) {
          useEditorHistoryStore.getState().pushSnapshot(editorKey, currentSlideId, html, 'Initial');
        }
      }

      // Re-bind observer
      observer = new MutationObserver(() => {
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
    }, 200);

    return () => {
      clearTimeout(setup);
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    };
    // Only re-run when slide id or editor key changes — not on every store update
  }, [currentSlideId, editorKey, saveState]);

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
