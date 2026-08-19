/**
 * Register an undo scope for as long as a component is mounted.
 *
 * The scope object is read through a ref, so a surface can pass a freshly
 * built object every render without re-registering — re-registering would
 * change the arbitration order on every keystroke and quietly steal ⌘Z from
 * whatever is actually on top.
 */
import { useEffect, useRef } from 'react';
import { useHistoryRegistry } from './historyRegistry';
import type { UndoScope } from './types';

export function useUndoScope(scope: UndoScope | null): void {
  const ref = useRef(scope);
  ref.current = scope;

  const id = scope?.id;
  const enabled = scope != null;

  useEffect(() => {
    if (!enabled || !id) return;
    return useHistoryRegistry.getState().register({
      id,
      get label() { return ref.current?.label ?? ''; },
      get ownsTextInput() { return ref.current?.ownsTextInput; },
      undo: () => ref.current?.undo(),
      redo: () => ref.current?.redo(),
      canUndo: () => ref.current?.canUndo() ?? false,
      canRedo: () => ref.current?.canRedo() ?? false,
      undoLabel: () => ref.current?.undoLabel?.(),
      redoLabel: () => ref.current?.redoLabel?.(),
    });
  }, [enabled, id]);
}

/** Re-renders when undo availability changes. For toolbar buttons. */
export function useUndoState(): {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  undo: () => void;
  redo: () => void;
} {
  // `version` is the subscription; the answers themselves are function calls,
  // so there is nothing else for a selector to compare.
  useHistoryRegistry((s) => s.version);
  const scope = useHistoryRegistry.getState().active();
  return {
    canUndo: scope?.canUndo() ?? false,
    canRedo: scope?.canRedo() ?? false,
    undoLabel: scope?.undoLabel?.(),
    redoLabel: scope?.redoLabel?.(),
    undo: () => useHistoryRegistry.getState().undo(),
    redo: () => useHistoryRegistry.getState().redo(),
  };
}
