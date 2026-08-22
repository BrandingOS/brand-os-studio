// The layout half of the nudge's contract, which only a real browser can
// answer: jsdom does not apply the imported stylesheet, so `position: fixed`
// reads as '' there.
//
// This is the regression that motivated the whole component. The card it
// replaced was an in-flow block above BrandKitCosmosPage, so an unfinished
// brand pushed the entire Kit — WorkspaceShell's sticky navbar included —
// down by the height of the prompt.
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('BrandSetupNudge — layout', () => {
  it('floats bottom-right and takes no space in the flow', async () => {
    const { container } = render(
      <MemoryRouter>
        <div data-probe style={{ height: '40px' }} />
        <BrandSetupNudge brand={blank} brandId="layout-1" brandSlug="raqm" />
      </MemoryRouter>,
    );

    const probe = container.querySelector('[data-probe]') as HTMLElement;
    const topBefore = probe.getBoundingClientRect().top;

    const el = await waitFor(
      () => {
        const found = document.querySelector('[data-brand-setup-nudge]');
        if (!found) throw new Error('nudge has not appeared yet');
        return found as HTMLElement;
      },
      { timeout: 3000 },
    );

    const style = getComputedStyle(el);
    expect(style.position).toBe('fixed');

    // Nothing above it moved when it arrived.
    expect(probe.getBoundingClientRect().top).toBe(topBefore);

    // And it really is in the bottom-right corner of the viewport.
    const box = el.getBoundingClientRect();
    expect(window.innerWidth - box.right).toBeLessThan(48);
    expect(window.innerHeight - box.bottom).toBeLessThan(48);
  });
});
