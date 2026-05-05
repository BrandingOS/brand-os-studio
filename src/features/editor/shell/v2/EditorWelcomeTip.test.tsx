// Phase 11.1 — EditorWelcomeTip tests.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { EditorWelcomeTip } from './EditorWelcomeTip';
import { _resetAllFeatureSeen } from '@/shared/hooks/useFeatureSeen';

beforeEach(() => {
  _resetAllFeatureSeen();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('EditorWelcomeTip', () => {
  it('renders nothing immediately on mount (delayMs gate)', () => {
    const { container } = render(<EditorWelcomeTip delayMs={500} />);
    expect(container.querySelector('[data-editor-welcome-tip]')).toBeNull();
  });

  it('renders after delayMs elapses', () => {
    const { container } = render(<EditorWelcomeTip delayMs={500} />);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(container.querySelector('[data-editor-welcome-tip]')).not.toBeNull();
  });

  it('clicking Got it dismisses + persists', () => {
    const { container } = render(<EditorWelcomeTip delayMs={0} featureId="t-1" />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const tip = container.querySelector('[data-editor-welcome-tip]') as HTMLElement;
    expect(tip).not.toBeNull();
    const got = tip.querySelector('button:not([aria-label])')!;
    fireEvent.click(got);
    expect(container.querySelector('[data-editor-welcome-tip]')).toBeNull();
  });

  it('clicking the X dismisses', () => {
    const { container } = render(<EditorWelcomeTip delayMs={0} featureId="t-2" />);
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const x = container.querySelector(
      'button[aria-label="Dismiss tip"]',
    ) as HTMLButtonElement;
    expect(x).not.toBeNull();
    fireEvent.click(x);
    expect(container.querySelector('[data-editor-welcome-tip]')).toBeNull();
  });

  it('does not re-show after dismissal across remounts', () => {
    const { container, unmount } = render(
      <EditorWelcomeTip delayMs={0} featureId="t-3" />,
    );
    act(() => {
      vi.advanceTimersByTime(0);
    });
    const got = container.querySelector(
      'button[aria-label="Dismiss tip"]',
    ) as HTMLButtonElement;
    fireEvent.click(got);
    unmount();

    const second = render(<EditorWelcomeTip delayMs={0} featureId="t-3" />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(
      second.container.querySelector('[data-editor-welcome-tip]'),
    ).toBeNull();
  });
});
