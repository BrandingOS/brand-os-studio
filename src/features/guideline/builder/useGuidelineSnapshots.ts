/**
 * Direct edits to a page, and where they persist.
 *
 * A page renders from the brand until the user types on it. From then on the
 * page's own HTML is the truth for that page, stored in IndexedDB under
 * `${editorKey}::${pageId}` — the same store, the same key shape and the same
 * module (`shared/editor/snapshotIDB`) the deck editor has always used, so
 * edits made before the builder existed load into it unchanged.
 *
 * Saving is automatic. The previous editor made the user press Save because it
 * showed one slide at a time and could capture "the current slide" at a known
 * moment; a scrolling document has no such moment, and a Save button the user
 * has scrolled past is a data-loss trap. Writes are debounced per page and
 * awaited, so the indicator reports the real state of the database rather than
 * an optimistic guess.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSnapshotsForEditor, saveSnapshot, deleteSnapshot } from '@/shared/editor/snapshotIDB';

/** Quiet period after the last keystroke before a page is written. */
const SAVE_DEBOUNCE_MS = 900;

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

/**
 * Strip the editing chrome the inline editor paints onto the live DOM.
 *
 * Without this, a page saved while an element is selected keeps a blue outline
 * and a drag flag forever — the selection styles are inline styles, so they
 * would be part of the snapshot.
 */
export function cleanPageHtml(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll<HTMLElement>('[style*="outline"]').forEach((node) => {
    node.style.outline = '';
    node.style.outlineOffset = '';
    node.style.boxShadow = '';
    node.style.borderRadius = '';
    node.style.userSelect = '';
    node.style.cursor = '';
    if (node.dataset.originalBg !== undefined) {
      node.style.backgroundColor = node.dataset.originalBg;
      delete node.dataset.originalBg;
    }
    delete node.dataset.draggable;
  });
  clone.querySelectorAll('.resize-handle').forEach((node) => node.remove());
  clone.querySelectorAll('[contenteditable]').forEach((node) => {
    node.setAttribute('contenteditable', 'false');
  });
  return clone.innerHTML;
}

export function useGuidelineSnapshots(editorKey: string) {
  const [snapshots, setSnapshots] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlight = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    loadSnapshotsForEditor(editorKey).then((map) => {
      if (cancelled) return;
      setSnapshots(map);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [editorKey]);

  // Timers hold a closure over the editor key; leaving one to fire after the
  // key changed would file an edit under the wrong brand.
  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); map.clear(); };
  }, [editorKey]);

  const flush = useCallback(async (pageId: string, html: string) => {
    inFlight.current += 1;
    setSaveState('saving');
    const ok = await saveSnapshot(editorKey, pageId, html);
    inFlight.current -= 1;
    if (ok) setSnapshots((prev) => ({ ...prev, [pageId]: html }));
    if (inFlight.current === 0) setSaveState(ok ? 'saved' : 'error');
  }, [editorKey]);

  /** Called on every edit to a page. Coalesces a burst of keystrokes. */
  const queue = useCallback((pageId: string, el: HTMLElement) => {
    setSaveState('pending');
    const existing = timers.current.get(pageId);
    if (existing) clearTimeout(existing);
    timers.current.set(pageId, setTimeout(() => {
      timers.current.delete(pageId);
      // Read the DOM at fire time, not at queue time: the user has kept typing.
      flush(pageId, cleanPageHtml(el));
    }, SAVE_DEBOUNCE_MS));
  }, [flush]);

  /**
   * Write one page right now, cancelling its debounce.
   *
   * Called when a page loses selection or unmounts. Without it, clicking from
   * page 3 to page 4 inside the debounce window would drop what was typed on
   * page 3 — the element is gone by the time the timer fires.
   */
  const saveNow = useCallback((pageId: string, el: HTMLElement) => {
    const timer = timers.current.get(pageId);
    if (timer) { clearTimeout(timer); timers.current.delete(pageId); }
    void flush(pageId, cleanPageHtml(el));
  }, [flush]);

  const reset = useCallback(async (pageId: string) => {
    const timer = timers.current.get(pageId);
    if (timer) { clearTimeout(timer); timers.current.delete(pageId); }
    await deleteSnapshot(editorKey, pageId);
    setSnapshots((prev) => {
      const next = { ...prev };
      delete next[pageId];
      return next;
    });
  }, [editorKey]);

  return { snapshots, loaded, saveState, queue, saveNow, reset };
}
