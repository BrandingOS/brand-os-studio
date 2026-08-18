import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setNextTheme = vi.fn();
vi.mock('next-themes', () => ({ useTheme: () => ({ setTheme: setNextTheme }) }));

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
  });

  it('starts from the stored value synchronously, so dark never flashes light', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useWorkspaceTheme());
    // The value is right on the FIRST render — not after an effect.
    expect(result.current.theme).toBe('dark');
  });

  it('pushes every change through next-themes so the <html> class follows', () => {
    const { result } = renderHook(() => useWorkspaceTheme());
    expect(setNextTheme).toHaveBeenCalledWith('light');

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
});
