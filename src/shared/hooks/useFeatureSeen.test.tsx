// Phase 11.1 — useFeatureSeen tests.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { useFeatureSeen, _resetAllFeatureSeen } from './useFeatureSeen';

const STORAGE_KEY = 'brandos:features-seen';

let seenSnapshot: { isSeen: boolean } = { isSeen: false };
let markFn: () => void = () => undefined;
let clearFn: () => void = () => undefined;

function Probe({ id }: { id: string }) {
  const result = useFeatureSeen(id);
  seenSnapshot = { isSeen: result.isSeen };
  markFn = result.markSeen;
  clearFn = result.clearSeen;
  return null;
}

beforeEach(() => {
  _resetAllFeatureSeen();
});

afterEach(() => {
  cleanup();
});

describe('useFeatureSeen', () => {
  it('returns isSeen=false on first visit', () => {
    render(<Probe id="x" />);
    expect(seenSnapshot.isSeen).toBe(false);
  });

  it('persists markSeen across remounts', () => {
    const { unmount } = render(<Probe id="x" />);
    act(() => markFn());
    expect(seenSnapshot.isSeen).toBe(true);
    unmount();

    render(<Probe id="x" />);
    expect(seenSnapshot.isSeen).toBe(true);
  });

  it('writes a JSON object with ISO date under the storage key', () => {
    render(<Probe id="welcome" />);
    act(() => markFn());
    const raw = window.localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(typeof parsed.welcome).toBe('string');
    expect(parsed.welcome).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('clearSeen flips back to false and removes only that key', () => {
    // Seed two features as seen.
    render(<Probe id="a" />);
    act(() => markFn());
    cleanup();
    render(<Probe id="b" />);
    act(() => markFn());

    // Clear only 'b'.
    act(() => clearFn());
    expect(seenSnapshot.isSeen).toBe(false);

    // 'a' should still be seen.
    cleanup();
    render(<Probe id="a" />);
    expect(seenSnapshot.isSeen).toBe(true);
  });

  it('different feature ids are independent', () => {
    const { rerender } = render(<Probe id="a" />);
    act(() => markFn());
    expect(seenSnapshot.isSeen).toBe(true);

    rerender(<Probe id="b" />);
    expect(seenSnapshot.isSeen).toBe(false);
  });

  it('survives malformed localStorage gracefully', () => {
    window.localStorage.setItem(STORAGE_KEY, 'not-json{');
    render(<Probe id="x" />);
    expect(seenSnapshot.isSeen).toBe(false);
  });
});
