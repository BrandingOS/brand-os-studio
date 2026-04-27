// Snapshot ring buffer for editor undo/redo.
//
// Holds up to `maxSize` past states + a redo stack. Continuous mutations
// (drag, resize) snapshot via `snapshot()` which debounces; discrete
// actions (add layer, delete layer) call `commit()` to record
// immediately. New mutations after an undo clear the redo stack — the
// "branch off the past" semantic.

export const MAX_HISTORY_DEFAULT = 50;
export const HISTORY_DEBOUNCE_MS_DEFAULT = 300;

export class HistoryRing<T> {
  private past: T[] = [];
  private future: T[] = [];
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
  reset(initial: T): void {
    this.cancelTimer();
    this.past = [initial];
    this.future = [];
    this.pendingSnapshot = null;
  }

  /**
   * Record a state, debounced. Use for continuous mutations like drag
   * and resize where many calls fire in quick succession.
   */
  snapshot(state: T): void {
    this.pendingSnapshot = state;
    this.cancelTimer();
    this.debounceTimer = setTimeout(() => this.flush(), this.debounceMs);
  }

  /**
   * Record a state immediately. Use for discrete actions (add, delete,
   * reorder). Cancels any pending debounced snapshot and replaces it
   * with this state.
   */
  commit(state: T): void {
    this.cancelTimer();
    this.pendingSnapshot = null;
    this.push(state);
  }

  /** Force any pending debounced snapshot to commit now. */
  flush(): void {
    this.cancelTimer();
    if (this.pendingSnapshot != null) {
      this.push(this.pendingSnapshot);
      this.pendingSnapshot = null;
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
    return this.past[this.past.length - 1];
  }

  /**
   * Move one step forward. Returns the redone state, or null if there
   * is nothing to redo.
   */
  redo(): T | null {
    if (this.future.length === 0) return null;
    const next = this.future.pop()!;
    this.past.push(next);
    return next;
  }

  canUndo(): boolean {
    return this.past.length > 1;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Visible for testing. */
  getStateForTesting(): { past: T[]; future: T[]; pending: T | null } {
    return {
      past: [...this.past],
      future: [...this.future],
      pending: this.pendingSnapshot,
    };
  }

  private cancelTimer(): void {
    if (this.debounceTimer != null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private push(state: T): void {
    this.past.push(state);
    if (this.past.length > this.maxSize) this.past.shift();
    this.future = []; // any new commit branches off the past, killing the redo stack
  }
}
