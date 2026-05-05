// Phase 11.3 — EditorShortcutHelp tests.
import { afterEach, describe, expect, it } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { EditorShortcutHelp } from './EditorShortcutHelp';

afterEach(() => cleanup());

describe('EditorShortcutHelp', () => {
  it('does not render dialog content when closed', () => {
    render(<EditorShortcutHelp />);
    // Dialog content lives in a portal — query the document instead of
    // the local container.
    expect(
      document.querySelector('[data-editor-shortcut-help]'),
    ).toBeNull();
  });

  it('opens when ? is pressed', () => {
    render(<EditorShortcutHelp />);
    act(() => {
      fireEvent.keyDown(window, { key: '?' });
    });
    expect(
      document.querySelector('[data-editor-shortcut-help]'),
    ).not.toBeNull();
  });

  it('toggles closed when ? is pressed again', () => {
    render(<EditorShortcutHelp />);
    act(() => {
      fireEvent.keyDown(window, { key: '?' });
    });
    expect(
      document.querySelector('[data-editor-shortcut-help]'),
    ).not.toBeNull();
    act(() => {
      fireEvent.keyDown(window, { key: '?' });
    });
    // Radix may keep the node briefly during exit animation, but its
    // open data attribute flips off.
    const node = document.querySelector('[data-editor-shortcut-help]');
    if (node) {
      expect(node.getAttribute('data-state')).not.toBe('open');
    }
  });

  it('ignores ? when typed in an input', () => {
    const { container } = render(
      <>
        <input data-testid="probe" />
        <EditorShortcutHelp />
      </>,
    );
    const input = container.querySelector('input')!;
    input.focus();
    act(() => {
      fireEvent.keyDown(input, { key: '?' });
    });
    expect(
      document.querySelector('[data-editor-shortcut-help]'),
    ).toBeNull();
  });
});
