import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HistoryRing } from './historyRing';

describe('HistoryRing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('reset establishes a single baseline', () => {
    const h = new HistoryRing<number>();
    h.reset(0);
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
  });

  it('commit records immediately and enables undo', () => {
    const h = new HistoryRing<number>();
    h.reset(0);
    h.commit(1);
    expect(h.canUndo()).toBe(true);
    expect(h.undo()).toBe(0);
    expect(h.canRedo()).toBe(true);
  });

  it('snapshot debounces continuous mutations', () => {
    const h = new HistoryRing<number>(50, 300);
    h.reset(0);
    h.snapshot(1);
    h.snapshot(2);
    h.snapshot(3);
    // Before debounce expires: only the baseline is recorded.
    expect(h.getStateForTesting().past).toEqual([0]);
    vi.advanceTimersByTime(300);
    // After debounce: only the LAST pending state lands.
    expect(h.getStateForTesting().past).toEqual([0, 3]);
  });

  it('undo flushes pending snapshot first so mid-drag undo captures the drag', () => {
    const h = new HistoryRing<number>(50, 300);
    h.reset(0);
    h.snapshot(1);
    expect(h.undo()).toBe(0);
    expect(h.getStateForTesting().future).toEqual([1]);
  });

  it('new commit after undo clears redo stack (branch off the past)', () => {
    const h = new HistoryRing<number>();
    h.reset(0);
    h.commit(1);
    h.commit(2);
    h.undo(); // back to 1
    h.commit(3); // branch
    expect(h.canRedo()).toBe(false);
    expect(h.getStateForTesting().future).toEqual([]);
  });

  it('caps history at maxSize, dropping oldest', () => {
    const h = new HistoryRing<number>(3);
    h.reset(0);
    h.commit(1);
    h.commit(2);
    h.commit(3);
    h.commit(4);
    expect(h.getStateForTesting().past).toEqual([2, 3, 4]);
  });

  it('redo replays the most recent undone state', () => {
    const h = new HistoryRing<number>();
    h.reset(0);
    h.commit(1);
    h.commit(2);
    h.undo();
    expect(h.redo()).toBe(2);
    expect(h.canRedo()).toBe(false);
  });

  it('flush forces pending snapshot to commit synchronously', () => {
    const h = new HistoryRing<number>(50, 300);
    h.reset(0);
    h.snapshot(1);
    h.flush();
    expect(h.getStateForTesting().past).toEqual([0, 1]);
    expect(h.getStateForTesting().pending).toBe(null);
  });
});
