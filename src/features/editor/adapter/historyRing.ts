// Snapshot ring buffer for editor undo/redo.
//
// Holds up to `maxSize` past states + a redo stack. Continuous mutations
// (drag, resize) snapshot via `snapshot()` which debounces; discrete
// actions (add layer, delete layer) call `commit()` to record
// immediately. New mutations after an undo clear the redo stack — the
// "branch off the past" semantic.
//
// Entries optionally carry a `label` — surfaces in any future undo-history
// UI (e.g. "AI: convert to social posts" instead of "Step 47"). Phase 3
// step 3 introduces labels alongside the batch infrastructure: the
// adapter's `batch(label, fn)` wraps a sequence of mutations into one
// labeled snapshot.

export const MAX_HISTORY_DEFAULT = 50;
export const HISTORY_DEBOUNCE_MS_DEFAULT = 300;

interface Entry<T> {
  state: T;
  label?: string;
}

export class HistoryRing<T> {
  private past: Entry<T>[] = [];
  private future: Entry<T>[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSnapshot: T | null = null;

  constructor(
    private readonly maxSize: number = MAX_HISTORY_DEFAULT,
    private readonly debounceMs: number = HISTORY_DEBOUNCE_MS_DEFAULT,
  ) {}

  /**
   * Initialize history with a baseline state. Replaces any existing
   * history. Use when loading a fresh document.
   */
  reset(initial: T, label?: string): void {
    this.cancelTimer();
    this.past = [{ state: initial, label }];
    this.future = [];
    this.pendingSnapshot = null;
  }

  /**
   * Record a state, debounced. Use for continuous mutations like drag
   * and resize where many calls fire in quick succession.
   */
  snapshot(state: T, label?: string): void {
    this.pendingSnapshot = state;
    this.pendingLabel = label;
    this.cancelTimer();
    this.debounceTimer = setTimeout(() => this.flush(), this.debounceMs);
  }

  /**
   * Record a state immediately. Use for discrete actions (add, delete,
   * reorder). Cancels any pending debounced snapshot and replaces it
   * with this state.
   *
   * Optional `label` surfaces in any future undo-history UI. The
   * adapter's `batch()` always provides a label.
   */
  commit(state: T, label?: string): void {
    this.cancelTimer();
    this.pendingSnapshot = null;
    this.pendingLabel = undefined;
    this.push({ state, label });
  }

  /** Force any pending debounced snapshot to commit now. */
  flush(): void {
    this.cancelTimer();
    if (this.pendingSnapshot != null) {
      this.push({ state: this.pendingSnapshot, label: this.pendingLabel });
      this.pendingSnapshot = null;
      this.pendingLabel = undefined;
    }
  }

  /**
   * Move one step backward. Returns the prior state, or null if there
   * is nothing further to undo. Pending snapshots are flushed first so
   * an undo issued mid-drag captures the drag's final position.
   */
  undo(): T | null {
    this.flush();
    if (this.past.length < 2) return null;
    const current = this.past.pop()!;
    this.future.push(current);
    return this.past[this.past.length - 1].state;
  }

  /**
   * Move one step forward. Returns the redone state, or null if there
   * is nothing to redo.
   */
  redo(): T | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(next);
    return next.state;
  }

  canUndo(): boolean {
    return this.past.length > 1;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /**
   * Label of the most recent committed state, or undefined when the
   * current state has no label (typical for snapshot()-driven
   * continuous mutations). Used by tests to assert batch labeling.
   */
  currentLabel(): string | undefined {
    return this.past[this.past.length - 1]?.label;
  }

  /** Visible for testing. */
  getStateForTesting(): { past: T[]; future: T[]; pending: T | null; labels: (string | undefined)[] } {
    return {
      past: this.past.map((e) => e.state),
      future: this.future.map((e) => e.state),
      pending: this.pendingSnapshot,
      labels: this.past.map((e) => e.label),
    };
  }

  private pendingLabel: string | undefined = undefined;

  private cancelTimer(): void {
    if (this.debounceTimer != null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private push(entry: Entry<T>): void {
    this.past.push(entry);
    if (this.past.length > this.maxSize) this.past.shift();
    this.future = []; // any new commit branches off the past, killing the redo stack
  }
}
