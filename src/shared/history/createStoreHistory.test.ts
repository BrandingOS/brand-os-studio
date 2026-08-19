import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStoreHistory } from './createStoreHistory';

interface Doc { pages: string[]; title: string }

function harness(initial: Doc = { pages: ['a'], title: 'One' }) {
  let state: Doc = initial;
  const history = createStoreHistory<Doc>({
    read: () => state,
    write: (next) => { state = next; },
  });
  return { history, get: () => state, set: (next: Doc) => { state = next; } };
}

describe('transactions', () => {
  it('records one entry for everything inside one transaction', () => {
    const h = harness();
    h.history.transaction('Add page', () => {
      h.set({ pages: ['a', 'b'], title: 'One' });
      h.set({ pages: ['a', 'b'], title: 'Two' });
    });
    expect(h.get()).toEqual({ pages: ['a', 'b'], title: 'Two' });

    expect(h.history.undo()).toBe(true);
    // Both changes go back together — a compound edit is one step for a user.
    expect(h.get()).toEqual({ pages: ['a'], title: 'One' });
  });

  it('absorbs nesting, so a transactional action may call another', () => {
    const h = harness();
    h.history.transaction('Outer', () => {
      h.set({ pages: ['a', 'b'], title: 'One' });
      h.history.transaction('Inner', () => { h.set({ pages: ['a', 'b', 'c'], title: 'One' }); });
    });
    expect(h.history.undoLabel()).toBe('Outer');
    h.history.undo();
    expect(h.get().pages).toEqual(['a']);
  });

  it('returns whatever the body returned', () => {
    const h = harness();
    expect(h.history.transaction('x', () => 42)).toBe(42);
  });

  it('still closes the transaction when the body throws', () => {
    const h = harness();
    expect(() => h.history.transaction('boom', () => { throw new Error('boom'); })).toThrow('boom');
    // Depth is back to zero, so the next transaction records normally.
    h.history.transaction('after', () => h.set({ pages: ['a', 'b'], title: 'One' }));
    expect(h.history.canUndo()).toBe(true);
  });
});

describe('undo and redo', () => {
  it('walks back and forward through steps', () => {
    const h = harness();
    h.history.transaction('1', () => h.set({ pages: ['a', 'b'], title: 'One' }));
    h.history.transaction('2', () => h.set({ pages: ['a', 'b', 'c'], title: 'One' }));

    h.history.undo();
    expect(h.get().pages).toEqual(['a', 'b']);
    h.history.undo();
    expect(h.get().pages).toEqual(['a']);
    expect(h.history.canUndo()).toBe(false);

    h.history.redo();
    expect(h.get().pages).toEqual(['a', 'b']);
    h.history.redo();
    expect(h.get().pages).toEqual(['a', 'b', 'c']);
    expect(h.history.canRedo()).toBe(false);
  });

  it('reports false rather than throwing at either end', () => {
    const h = harness();
    expect(h.history.undo()).toBe(false);
    expect(h.history.redo()).toBe(false);
  });

  it('drops the redo stack once a new edit branches off the past', () => {
    const h = harness();
    h.history.transaction('1', () => h.set({ pages: ['a', 'b'], title: 'One' }));
    h.history.undo();
    expect(h.history.canRedo()).toBe(true);

    h.history.transaction('2', () => h.set({ pages: ['a', 'z'], title: 'One' }));
    expect(h.history.canRedo()).toBe(false);
  });

  it('does not record the state it restores', () => {
    // The write path may run through a store whose own subscribers record
    // history; without the guard, undo would push what it just restored and
    // the stack would never move.
    let state: Doc = { pages: ['a'], title: 'One' };
    const history = createStoreHistory<Doc>({
      read: () => state,
      write: (next) => {
        state = next;
        history.commit('echo from a subscriber');
      },
    });
    history.transaction('1', () => { state = { pages: ['a', 'b'], title: 'One' }; });
    history.undo();
    expect(state.pages).toEqual(['a']);
    expect(history.canRedo()).toBe(true);
  });

  it('hands back a copy, so mutating the restored state cannot corrupt the stack', () => {
    const h = harness();
    h.history.transaction('1', () => h.set({ pages: ['a', 'b'], title: 'One' }));
    h.history.undo();
    h.get().pages.push('poison');
    h.history.redo();
    h.history.undo();
    expect(h.get().pages).toEqual(['a']);
  });

  it('labels the step undo would reverse, and the one redo would re-apply', () => {
    const h = harness();
    h.history.transaction('Add page', () => h.set({ pages: ['a', 'b'], title: 'One' }));
    expect(h.history.undoLabel()).toBe('Add page');
    h.history.undo();
    expect(h.history.redoLabel()).toBe('Add page');
  });
});

describe('the debounced tier', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('coalesces a burst of edits into a single step', () => {
    const h = harness();
    for (const title of ['O', 'On', 'One', 'Ones']) {
      h.set({ pages: ['a'], title });
      h.history.snapshot('Rename');
    }
    vi.advanceTimersByTime(500);

    h.history.undo();
    expect(h.get().title).toBe('One');
    expect(h.history.canUndo()).toBe(false);
  });

  it('flushes a pending burst before undoing, so nothing is lost mid-type', () => {
    const h = harness();
    h.set({ pages: ['a'], title: 'Typed' });
    h.history.snapshot('Rename');
    // No timer advance — the snapshot is still pending.
    h.history.undo();
    expect(h.get().title).toBe('One');
  });
});
