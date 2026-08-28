/**
 * The brand switcher, in a real browser — because the claim is about LAYOUT.
 *
 * A workspace holds as many brands as someone cares to make, and this menu
 * lists all of them. With forty in it the panel drew taller than the screen,
 * with nothing to scroll and no way to reach its end: the brands past the fold
 * simply could not be picked.
 */
import '@/shared/styles/workspace.css';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { bootServices } from '@/core/boot';
import { useBrandStore } from '@/shared/store/brandStore';
import BrandSwitcher from './BrandSwitcher';
import type { Brand } from '@/shared/types/brand';

const many = (n: number): Brand[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `b${i}`,
    slug: `b${i}`,
    name: `Brand ${i + 1}`,
    schemaVersion: 3,
    primaryColor: '#7C3AED',
    fonts: { primary: 'Inter' },
    tone: '',
    audience: '',
    assets: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  })) as unknown as Brand[];

function open(count: number) {
  const list = many(count);
  useBrandStore.setState({
    list,
    current: list[0],
    isLoading: false,
    listReady: true,
  } as never);
  render(
    // The menu's rules are scoped to the workspace shell it lives in.
    <div data-workspace>
      <MemoryRouter initialEntries={['/b/b0/setup']}>
        <BrandSwitcher />
      </MemoryRouter>
    </div>,
  );
  fireEvent.click(document.querySelector('.brand-switcher-trigger') as HTMLElement);
  return {
    menu: document.querySelector('.brand-switcher-menu') as HTMLElement,
    list: document.querySelector('.brand-switcher-list') as HTMLElement,
  };
}

beforeEach(() => {
  localStorage.clear();
  bootServices();
});
afterEach(() => {
  cleanup();
  useBrandStore.setState({ list: [], current: null, isLoading: false });
});

describe('the brand switcher with more brands than fit', () => {
  it('never grows past the viewport', () => {
    const { menu } = open(40);
    expect(menu.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight);
  });

  it('scrolls the brands rather than the menu', () => {
    const { list } = open(40);
    // `min-height: 0` is what makes this true — a flex child refuses to shrink
    // below its content without it, and the menu would grow past its own
    // max-height instead of handing the overflow to this list.
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);
  });

  it('keeps Dashboard and Create new brand out of the scroll', () => {
    const { list } = open(40);
    // The two fixed points of the menu. A list of forty projects must not push
    // them off the screen.
    expect(list.contains(screen.getByText('Dashboard'))).toBe(false);
    expect(list.contains(screen.getByText('Create new brand'))).toBe(false);
  });

  it('and does not scroll at all when they all fit', () => {
    const { list } = open(3);
    expect(list.scrollHeight).toBe(list.clientHeight);
  });
});
