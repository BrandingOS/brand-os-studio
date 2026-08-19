/**
 * Undo/redo for the guideline document.
 *
 * Every action goes through `transaction(label, …)`, so a compound edit is one
 * step for the user: adding a page also moves the insertion point and selects
 * the new page, and undo takes all of that back at once.
 *
 * What is deliberately NOT in this stack:
 *
 *   • **A confirmed global brand change.** It is an awaited write against
 *     Supabase that can fail, can fall back to a second code path in
 *     production, and repaints every other surface in the product. Silently
 *     reversing it from a keystroke would be worse than the problem undo
 *     solves. The confirmation IS the safeguard.
 *   • **Inline text edits on a page.** Those live in the DOM, are captured by
 *     `useGuidelineSnapshots` on a 900 ms debounce, and the browser's own undo
 *     is what a user typing in a contentEditable region expects. `⌘Z` inside a
 *     page therefore does the native thing — the scope does not claim
 *     `ownsTextInput`.
 *
 * Both exclusions are decisions, not gaps.
 */
import { useCallback, useMemo, useRef } from 'react';
import { createStoreHistory, useHistoryRegistry, type StoreHistory } from '@/shared/history';
import type { GuidelineDoc, GuidelineOverrides, GuidelinePage } from '../model/document';
import { useGuidelineDocStore } from '../model/guidelineDocStore';

export interface GuidelineActions {
  insertPage: (type: string, index: number) => GuidelinePage | undefined;
  duplicatePage: (pageId: string) => GuidelinePage | undefined;
  removePage: (pageId: string) => void;
  movePage: (pageId: string, delta: number) => void;
  updatePage: (pageId: string, patch: Partial<Omit<GuidelinePage, 'id' | 'type'>>) => void;
  setOverride: (key: keyof GuidelineOverrides, value: string | undefined) => void;
}

export function useGuidelineHistory(brandId: string, pageName: (id: string) => string) {
  const historyRef = useRef<StoreHistory<GuidelineDoc> | null>(null);
  if (historyRef.current === null) {
    historyRef.current = createStoreHistory<GuidelineDoc>({
      read: () => useGuidelineDocStore.getState().get(brandId)!,
      write: (doc) => useGuidelineDocStore.getState().replace(brandId, doc),
      // A guideline document is a page list and four optional strings. Fifty
      // clones of that is kilobytes, not the megabytes that once filled this
      // app's localStorage budget and stopped brands saving.
      max: 50,
    });
  }
  const history = historyRef.current;

  const run = useCallback(<R,>(label: string, fn: () => R): R => {
    const result = history.transaction(label, fn);
    // The registry stores no state of its own — canUndo is a call — so it has
    // to be told when the answer may have changed.
    useHistoryRegistry.getState().notify();
    return result;
  }, [history]);

  const actions = useMemo<GuidelineActions>(() => {
    const store = () => useGuidelineDocStore.getState();
    return {
      insertPage: (type, index) => run('Add page', () => store().insertPage(brandId, type, index)),
      duplicatePage: (pageId) =>
        run(`Duplicate ${pageName(pageId)}`, () => store().duplicatePage(brandId, pageId)),
      removePage: (pageId) =>
        run(`Remove ${pageName(pageId)}`, () => store().removePage(brandId, pageId)),
      movePage: (pageId, delta) =>
        run(`Move ${pageName(pageId)}`, () => store().movePage(brandId, pageId, delta)),
      updatePage: (pageId, patch) => {
        // Renaming is continuous. One undo entry per keystroke would make undo
        // useless, so this uses the debounced tier: mutate now, record the
        // resulting state once the typing stops.
        store().updatePage(brandId, pageId, patch);
        history.snapshot(`Rename ${pageName(pageId)}`);
        useHistoryRegistry.getState().notify();
      },
      setOverride: (key, value) =>
        run('Change brand value', () => store().setOverride(brandId, key, value)),
    };
  }, [brandId, run, pageName, history]);

  const scope = useMemo(() => ({
    id: `guideline:${brandId}`,
    label: 'Brand guidelines',
    undo: () => { history.undo(); },
    redo: () => { history.redo(); },
    canUndo: () => history.canUndo(),
    canRedo: () => history.canRedo(),
    undoLabel: () => history.undoLabel(),
    redoLabel: () => history.redoLabel(),
  }), [brandId, history]);

  return { actions, scope, history };
}
