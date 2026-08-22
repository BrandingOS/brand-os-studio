import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { BrandSetupNudge } from './BrandSetupNudge';
import { EMPTY_STRATEGY, type MockBrand } from '@/features/setup/data/mockBrand';

const blank: MockBrand = {
  name: 'B',
  logos: [],
  colors: { core: [], accent: [], grey: [] },
  fonts: [],
  icons: [],
  photos: [],
  websites: [],
  voice: { essay: '', pillars: [] },
  about: [],
  strategy: { ...EMPTY_STRATEGY },
  links: [],
};

const wrap = (brand: MockBrand, brandId = 'b1', onPick = vi.fn()) => ({
  onPick,
  ...render(<BrandSetupNudge brand={brand} brandId={brandId} onPick={onPick} />),
});

/** The nudge waits for the board to paint before it appears. */
const settle = () => act(() => { vi.advanceTimersByTime(1000); });

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('BrandSetupNudge', () => {
  it('does not render before the appear delay', () => {
    const { container } = wrap(blank);
    expect(container.querySelector('[data-brand-setup-nudge]')).toBeNull();
  });

  it('lists every missing section once it appears', () => {
    const { container } = wrap(blank);
    settle();
    const ids = [...container.querySelectorAll('[data-step-id]')].map((el) =>
      el.getAttribute('data-step-id'),
    );
    expect(ids).toEqual(['logos', 'colors', 'typography', 'strategy']);
  });

  it('lists only what is missing', () => {
    const { container } = wrap({
      ...blank,
      fonts: [{ family: 'Inter' } as MockBrand['fonts'][number]],
    });
    settle();
    const ids = [...container.querySelectorAll('[data-step-id]')].map((el) =>
      el.getAttribute('data-step-id'),
    );
    expect(ids).not.toContain('typography');
    expect(ids).toHaveLength(3);
  });

  it('renders nothing when the brand has all four', () => {
    const { container } = wrap({
      ...blank,
      logos: [{ id: 'l', label: 'P', variant: 'light', svg: '<svg/>' } as never],
      colors: { core: [{ hex: '#f00', name: 'Red' } as never], accent: [], grey: [] },
      fonts: [{ family: 'Inter' } as MockBrand['fonts'][number]],
      strategy: { ...EMPTY_STRATEGY, mission: 'Ship.' },
    });
    settle();
    expect(container.querySelector('[data-brand-setup-nudge]')).toBeNull();
  });

  // A row is a shortcut into the section, using Setup's OWN key for it —
  // otherwise the nudge would name a board the page cannot jump to.
  it('a row hands Setup the section key for that board', () => {
    const { container, onPick } = wrap(blank);
    settle();
    fireEvent.click(container.querySelector('[data-step-id="logos"]') as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('logo');

    fireEvent.click(container.querySelector('[data-step-id="typography"]') as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('fonts');

    fireEvent.click(container.querySelector('[data-step-id="strategy"]') as HTMLElement);
    expect(onPick).toHaveBeenCalledWith('voice');
  });

  it('dismissing hides it and remembers the brand', () => {
    const { container, unmount } = wrap(blank);
    settle();
    fireEvent.click(container.querySelector('.bsn-close') as HTMLElement);
    expect(container.querySelector('[data-brand-setup-nudge]')).toBeNull();
    unmount();

    const again = wrap(blank);
    settle();
    expect(again.container.querySelector('[data-brand-setup-nudge]')).toBeNull();
  });

  it('a dismissal on one brand does not silence another', () => {
    const first = wrap(blank, 'b1');
    settle();
    fireEvent.click(first.container.querySelector('.bsn-close') as HTMLElement);
    first.unmount();

    const second = wrap(blank, 'b2');
    settle();
    expect(second.container.querySelector('[data-brand-setup-nudge]')).not.toBeNull();
  });
});
