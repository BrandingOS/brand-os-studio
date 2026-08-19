/**
 * Undo/redo for a plain piece of state — the shape most of this app's
 * mutations actually have.
 *
 * Snapshot-based, on `HistoryRing`, because that is what every working undo in
 * this codebase already is and because the alternative — inverse operations —
 * would mean every mutation site starts capturing prior values. There are
 * roughly twenty such sites in `FabricAdapter` alone. Snapshots are the honest
 * trade for state that is kilobytes rather than megabytes; anything larger
 * should not be in an undo stack at all.
 *
 * The state must exist when the history is created — the baseline is taken
 * immediately, because taking it lazily records the state as it was AFTER the
 * first mutation and quietly costs the user their first undo.
 *
 * `transaction()` is the important entry point: a compound edit — insert a
 * page AND select it AND renumber the chapters — must be one step for the
 * user, not three. Nesting is absorbed, so a transaction may call helpers that
 * are themselves transactional.
 */
import { HistoryRing } from './HistoryRing';

export interface StoreHistoryOptions<T> {
  /** Read the current state. Called at commit time, never cached. */
  read: () => T;
  /** Apply a restored state. Must not itself record history. */
  write: (state: T) => void;
  max?: number;
  debounceMs?: number;
  /**
   * Deep copy. The default handles plain JSON-ish state; pass your own for
   * anything holding Dates, Maps or class instances.
   */
  clone?: (state: T) => T;
}

export interface StoreHistory<T> {
  /**
   * Re-baseline on the current state and drop the stack.
   *
   * The baseline is taken automatically at construction, so this is only for
   * a deliberate discontinuity — loading a different document, or rebuilding
   * one from scratch, where the steps before it are no longer meaningful.
   */
  reset(label?: string): void;
  /** Run `fn` and record exactly one undo entry for everything it changed. */
  transaction<R>(label: string, fn: () => R): R;
  commit(label?: string): void;
  /** Debounced — for continuous edits like dragging a slider. */
  snapshot(label?: string): void;
  undo(): boolean;
  redo(): boolean;
  canUndo(): boolean;
  canRedo(): boolean;
  undoLabel(): string | undefined;
  redoLabel(): string | undefined;
}

function defaultClone<T>(state: T): T {
  if (typeof structuredClone === 'function') return structuredClone(state);
  return JSON.parse(JSON.stringify(state)) as T;
}

export function createStoreHistory<T>(options: StoreHistoryOptions<T>): StoreHistory<T> {
  const { read, write, max, debounceMs } = options;
  const clone = options.clone ?? defaultClone;
  const ring = new HistoryRing<T>(max, debounceMs);

  let depth = 0;
  let pendingLabel: string | undefined;
  /**
   * True while a restored state is being written back. `write` may run through
   * a store whose subscribers also record history; without this guard an undo
   * would push the state it just restored and the stack would never move.
   */
  let restoring = false;

  const apply = (state: T | null): boolean => {
    if (state == null) return false;
    restoring = true;
    try {
      write(clone(state));
    } finally {
      restoring = false;
    }
    return true;
  };

  // The baseline is captured NOW, not on first use. A lazily-established
  // baseline records the state as it was after the first mutation, so the
  // first undo lands one step short — which is invisible until someone
  // presses undo once and nothing happens.
  ring.reset(clone(read()));

  return {
    reset(label) {
      ring.reset(clone(read()), label);
    },

    transaction(label, fn) {
      if (restoring) return fn();
      depth += 1;
      if (depth === 1) pendingLabel = label;
      try {
        return fn();
      } finally {
        depth -= 1;
        if (depth === 0) {
          ring.commit(clone(read()), pendingLabel);
          pendingLabel = undefined;
        }
      }
    },

    commit(label) {
      if (restoring || depth > 0) return;
      ring.commit(clone(read()), label);
    },

    snapshot(label) {
      if (restoring || depth > 0) return;
      ring.snapshot(clone(read()), label);
    },

    undo() { return apply(ring.undo()); },
    redo() { return apply(ring.redo()); },
    canUndo() { return ring.canUndo(); },
    canRedo() { return ring.canRedo(); },
    undoLabel() { return ring.currentLabel(); },
    redoLabel() { return ring.nextRedoLabel(); },
  };
}
