// Phase 7.2 — EditorPresenceAvatars unit tests.
//
// Mocks useBrandPresence and asserts the component's render contract:
// - returns nothing when no other users are connected (clean solo UX)
// - renders one avatar per user up to max
// - collapses overflow into a "+N" pill
// - prefers avatar image over initials when present
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { EditorPresenceAvatars } from './EditorPresenceAvatars';

const useBrandPresenceMock = vi.fn();
vi.mock('@/shared/hooks/useBrandPresence', () => ({
  useBrandPresence: (...args: unknown[]) => useBrandPresenceMock(...args),
}));

afterEach(() => {
  useBrandPresenceMock.mockReset();
  cleanup();
});

describe('EditorPresenceAvatars', () => {
  it('renders nothing when no other users', () => {
    useBrandPresenceMock.mockReturnValue([]);
    const { container } = render(
      <EditorPresenceAvatars brandId="b1" designId="d1" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('passes brandId and design pageKey to useBrandPresence', () => {
    useBrandPresenceMock.mockReturnValue([]);
    render(<EditorPresenceAvatars brandId="b1" designId="d1" />);
    expect(useBrandPresenceMock).toHaveBeenCalledWith('b1', 'design:d1');
  });

  it('renders initials avatar when no avatarUrl', () => {
    useBrandPresenceMock.mockReturnValue([
      { userId: 'u1', name: 'Hamza Ezzat' },
    ]);
    const { container, getByTitle } = render(
      <EditorPresenceAvatars brandId="b1" designId="d1" />,
    );
    expect(container.querySelector('[data-editor-presence]')).not.toBeNull();
    const avatar = getByTitle('Hamza Ezzat');
    expect(avatar.textContent).toBe('HE');
  });

  it('renders <img> when avatarUrl is provided', () => {
    useBrandPresenceMock.mockReturnValue([
      { userId: 'u1', name: 'Alice', avatarUrl: 'https://x.test/a.png' },
    ]);
    const { container } = render(
      <EditorPresenceAvatars brandId="b1" designId="d1" />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img!.getAttribute('src')).toBe('https://x.test/a.png');
    expect(img!.getAttribute('alt')).toBe('Alice');
  });

  it('caps visible avatars at max and shows overflow pill', () => {
    useBrandPresenceMock.mockReturnValue([
      { userId: 'a', name: 'A' },
      { userId: 'b', name: 'B' },
      { userId: 'c', name: 'C' },
      { userId: 'd', name: 'D' },
      { userId: 'e', name: 'E' },
      { userId: 'f', name: 'F' },
    ]);
    const { container } = render(
      <EditorPresenceAvatars brandId="b1" designId="d1" max={3} />,
    );
    expect(container.querySelector('[data-presence-count]')?.getAttribute('data-presence-count')).toBe('6');
    // 3 visible + 1 overflow pill = 4 children inside the wrapper.
    const wrapper = container.querySelector('[data-editor-presence]')!;
    expect(wrapper.children.length).toBe(4);
    expect(wrapper.textContent ?? '').toContain('+3');
  });

  it('uses ? when name is missing', () => {
    useBrandPresenceMock.mockReturnValue([{ userId: 'u1', name: '' }]);
    const { container } = render(
      <EditorPresenceAvatars brandId="b1" designId="d1" />,
    );
    expect(container.textContent ?? '').toContain('?');
  });

  it('aria-label is plural when more than one user', () => {
    useBrandPresenceMock.mockReturnValue([
      { userId: 'a', name: 'A' },
      { userId: 'b', name: 'B' },
    ]);
    const { container } = render(
      <EditorPresenceAvatars brandId="b1" designId="d1" />,
    );
    expect(
      container.querySelector('[data-editor-presence]')?.getAttribute('aria-label'),
    ).toContain('2 other people are viewing');
  });
});
