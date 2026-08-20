// Tests the save-state machine + debounce semantics of useAutoSave.
// The hook is the save model every editor surface in BrandingOS adopts;
// regressions here would be felt across all of them.

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave — state machine', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle and stays idle until markDirty', () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave({ value: 'v0', save, debounceMs: 100 }));
    expect(result.current.saveState).toBe('idle');
    expect(save).not.toHaveBeenCalled();
  });

  it('transitions idle → saving → saved across the debounce window', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useAutoSave({ value, save, debounceMs: 100, savedFadeMs: 50 }),
      { initialProps: { value: 'v0' } },
    );

    rerender({ value: 'v1' });
    act(() => result.current.markDirty());

    // Before debounce expires we're still idle.
    expect(result.current.saveState).toBe('idle');

    // Advance past the debounce window.
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith('v1');
    await waitFor(() => expect(result.current.saveState).toBe('saved'));

    // After savedFadeMs the indicator returns to idle.
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    await waitFor(() => expect(result.current.saveState).toBe('idle'));
  });

  it('transitions to error when save rejects, and retry re-attempts', async () => {
    let attempt = 0;
    const save = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) throw new Error('boom');
    });
    const { result } = renderHook(() => useAutoSave({ value: 'v', save, debounceMs: 0 }));

    act(() => result.current.markDirty());
    await act(async () => {
      vi.advanceTimersByTime(0);
    });
    await waitFor(() => expect(result.current.saveState).toBe('error'));

    await act(async () => {
      await result.current.retry();
    });
    await waitFor(() => expect(result.current.saveState).toBe('saved'));
    expect(save).toHaveBeenCalledTimes(2);
  });

  it('flush runs the save immediately, bypassing the debounce', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useAutoSave({ value, save, debounceMs: 5000 }),
      { initialProps: { value: 'v0' } },
    );
    rerender({ value: 'v1' });
    act(() => result.current.markDirty());

    // Don't advance timers — flush should fire save anyway.
    await act(async () => {
      await result.current.flush();
    });
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith('v1');
  });

  it('skips save when enabled is false', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useAutoSave({ value: 'v', save, enabled: false, debounceMs: 0 }),
    );
    act(() => result.current.markDirty());
    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(save).not.toHaveBeenCalled();
  });
});
