// Phase 7.3 — EditorCursorOverlay unit tests.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { EditorCursorOverlay } from './EditorCursorOverlay';
import type { CursorState } from './useDesignCursors';

const PAGE_RECT = { left: 100, top: 200, width: 1080, height: 1080 };

const cursor = (over: Partial<CursorState> = {}): CursorState => ({
  userId: 'u1',
  name: 'Alice',
  color: '#ef4444',
  pageId: 'page-aaa',
  x: 0.5,
  y: 0.5,
  lastSeen: Date.now(),
  ...over,
});

afterEach(() => cleanup());

describe('EditorCursorOverlay', () => {
  it('renders nothing when pageRect is null', () => {
    const { container } = render(
      <EditorCursorOverlay others={[cursor()]} activePageId="page-aaa" pageRect={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when others is empty', () => {
    const { container } = render(
      <EditorCursorOverlay others={[]} activePageId="page-aaa" pageRect={PAGE_RECT} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no peer is on the active page', () => {
    const { container } = render(
      <EditorCursorOverlay
        others={[cursor({ pageId: 'page-bbb' })]}
        activePageId="page-aaa"
        pageRect={PAGE_RECT}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('positions a cursor at the right screen coords', () => {
    const { container } = render(
      <EditorCursorOverlay
        others={[cursor({ x: 0.5, y: 0.25 })]}
        activePageId="page-aaa"
        pageRect={PAGE_RECT}
      />,
    );
    const node = container.querySelector(
      '[data-cursor-user-id="u1"]',
    ) as HTMLElement;
    expect(node).not.toBeNull();
    // left = 100 + 1080 * 0.5 = 640
    expect(node.style.left).toBe('640px');
    // top = 200 + 1080 * 0.25 = 470
    expect(node.style.top).toBe('470px');
  });

  it('renders the peer name + color', () => {
    const { container } = render(
      <EditorCursorOverlay
        others={[cursor({ name: 'Hamza', color: '#10b981' })]}
        activePageId="page-aaa"
        pageRect={PAGE_RECT}
      />,
    );
    expect(container.textContent ?? '').toContain('Hamza');
    const label = container.querySelector(
      '[data-cursor-user-id="u1"] span',
    ) as HTMLElement;
    expect(label.style.background).toBe('rgb(16, 185, 129)');
  });

  it('filters peers to the active page', () => {
    const { container } = render(
      <EditorCursorOverlay
        others={[
          cursor({ userId: 'u1', pageId: 'page-aaa' }),
          cursor({ userId: 'u2', pageId: 'page-bbb', name: 'Bob' }),
          cursor({ userId: 'u3', pageId: 'page-aaa', name: 'Carol' }),
        ]}
        activePageId="page-aaa"
        pageRect={PAGE_RECT}
      />,
    );
    expect(container.querySelector('[data-cursor-user-id="u1"]')).not.toBeNull();
    expect(container.querySelector('[data-cursor-user-id="u2"]')).toBeNull();
    expect(container.querySelector('[data-cursor-user-id="u3"]')).not.toBeNull();
  });
});
