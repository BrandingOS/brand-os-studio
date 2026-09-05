import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * A STATEFUL stand-in for next-themes.
 *
 * The old mock returned only `setTheme`, so `useTheme().theme` was always
 * undefined and every assertion here was really testing the hook's own private
 * copy of the theme. That is exactly the bug this file now guards against —
 * a mock that cannot disagree with the hook cannot catch two consumers
 * disagreeing with each other. This one holds a value and notifies, like the
 * real provider.
 */
let current: string | undefined;
const listeners = new Set<() => void>();
const setNextTheme = vi.fn((next: string) => {
  current = next;
  listeners.forEach((l) => l());
});

vi.mock('next-themes', () => ({
  useTheme: () => {
    const [, bump] = React.useReducer((n: number) => n + 1, 0);
    React.useEffect(() => {
      const l = () => bump();
      listeners.add(l);
      return () => { listeners.delete(l); };
    }, []);
    return { theme: current, setTheme: setNextTheme };
  },
}));

import React from 'react';

import {
  THEME_STORAGE_KEY,
  readStoredTheme,
  useWorkspaceTheme,
} from '../useWorkspaceTheme';

describe('readStoredTheme', () => {
  beforeEach(() => window.localStorage.clear());

  it('defaults to light when nothing is stored', () => {
    expect(readStoredTheme()).toBe('light');
  });

  it('reads a stored value', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    expect(readStoredTheme()).toBe('dark');
  });

  it('ignores a value that is neither light nor dark', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'system');
    expect(readStoredTheme()).toBe('light');
  });
});

describe('useWorkspaceTheme', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setNextTheme.mockClear();
    current = undefined;
    listeners.clear();
  });

  it('starts from the stored value synchronously, so dark never flashes light', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useWorkspaceTheme());
    // The value is right on the FIRST render — not after an effect.
    expect(result.current.theme).toBe('dark');
  });

  it('pushes every change through next-themes so the <html> class follows', () => {
    const { result } = renderHook(() => useWorkspaceTheme());
    // Nothing is asserted on mount any more: next-themes already owns the
    // value, and re-asserting a local copy over it was the defect.
    expect(setNextTheme).not.toHaveBeenCalled();

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(setNextTheme).toHaveBeenLastCalledWith('dark');
  });

  it('does NOT write localStorage itself — next-themes owns the key', () => {
    // Two writers to one key is exactly how the shells and next-themes drifted
    // apart. The hook holds state; next-themes persists it.
    const spy = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => useWorkspaceTheme());
    act(() => result.current.toggleTheme());
    expect(spy.mock.calls.filter(([key]) => key === THEME_STORAGE_KEY)).toEqual([]);
    spy.mockRestore();
  });

  it('follows a change made in another tab', () => {
    const { result } = renderHook(() => useWorkspaceTheme());
    expect(result.current.theme).toBe('light');

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'dark' }),
      );
    });
    expect(result.current.theme).toBe('dark');
  });

  it('ignores storage events for other keys', () => {
    const { result } = renderHook(() => useWorkspaceTheme());
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'brandos:something-else', newValue: 'dark' }),
      );
    });
    expect(result.current.theme).toBe('light');
  });

  it('every consumer sees the same theme — one owner, no local copies', () => {
    // Two mounted surfaces (a shell and Settings → Preferences, say). When one
    // changes the theme the other MUST follow. When each kept its own useState
    // the second went on rendering — and re-asserting — the old value, which
    // is how the page ended up flickering between two answers.
    const a = renderHook(() => useWorkspaceTheme());
    const b = renderHook(() => useWorkspaceTheme());
    expect(a.result.current.theme).toBe('light');
    expect(b.result.current.theme).toBe('light');

    act(() => a.result.current.toggleTheme());

    expect(a.result.current.theme).toBe('dark');
    expect(b.result.current.theme).toBe('dark');
  });
});
