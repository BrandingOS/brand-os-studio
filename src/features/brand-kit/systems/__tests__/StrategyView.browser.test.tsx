/**
 * Strategy's drilldown — the two actions the card advertises.
 *
 * `.audit/OURS.md` D45: the overview card offered "Edit Strategy" and
 * "Download Strategy", and the drilldown it opened had a Back button. The
 * shared drilldown head deliberately hides its Download for a COMPOSED
 * view, so a composed view carries its own — this is Strategy's.
 *
 * The other thing pinned here is what must NOT be in the export. Every
 * kit zip rasterizes this same component through an offscreen host; a
 * picture of the page with an Edit button in it is a picture of the app.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@/index.css';
import '@/shared/ds/tokens.css';
import '../../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { STRATEGY_CARDS, contentOf } from '@/features/setup/data/strategyCards';
import type { Brand } from '@/shared/types/brand';
import { StrategyView } from '../StrategyView';

const BRAND: Brand = SEED_BRANDS[0]!;

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mount = (props: Partial<React.ComponentProps<typeof StrategyView>> = {}) =>
  render(<StrategyView brand={brandToMockBrand(BRAND)} sourceBrand={BRAND} {...props} />);

describe('StrategyView', () => {
  it('offers Edit and Download, which is the whole of D45', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Edit strategy' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Download' })).toBeTruthy();
  });

  it('prints the answer a person reads, never the vocabulary id', () => {
    const mock = brandToMockBrand(BRAND);
    render(<StrategyView brand={mock} sourceBrand={BRAND} />);
    for (const card of STRATEGY_CARDS) {
      const value = contentOf(card, mock.strategy);
      if (!value) continue;
      expect(screen.getByText(card.name)).toBeTruthy();
      expect(screen.getAllByText(value).length).toBeGreaterThan(0);
    }
  });

  it('opens the same five-row menu every other card shows', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Download' }));
    const menu = await screen.findByRole('menu', { name: 'Download' });
    const items = within(menu).getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual([
      'For webMD',
      'For printPDF',
      'As dataJSON',
      'FlattenedPNG',
      'EverythingZIP',
    ]);
  });

  it('opens the strategy panel — Setup’s own questions, not a second set', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Edit strategy' }));
    await waitFor(() => expect(screen.getByText('Brand strategy')).toBeTruthy());
    const list = document.querySelector('.bka-strategy-list') as HTMLElement;
    expect(within(list).getAllByRole('button', { name: /^Edit / })).toHaveLength(
      STRATEGY_CARDS.length,
    );
  });

  it('keeps its chrome out of the picture an export takes of it', () => {
    // Two guards, because the export path passes neither: the prop, for a
    // caller that knows; and a CSS rule on `.bk-snapshot-host`, which is
    // the offscreen mount `withOffscreenMounts` rasterizes through.
    const { container } = render(
      <StrategyView brand={brandToMockBrand(BRAND)} sourceBrand={BRAND} chrome={false} />,
    );
    expect(container.querySelector('.bka-strategy-actions')).toBeNull();

    cleanup();
    const host = document.createElement('div');
    host.className = 'bk-snapshot-host';
    document.body.appendChild(host);
    render(<StrategyView brand={brandToMockBrand(BRAND)} sourceBrand={BRAND} />, {
      container: host,
    });
    const row = host.querySelector('.bka-strategy-actions') as HTMLElement;
    expect(row).toBeTruthy();
    expect(getComputedStyle(row).display).toBe('none');
    host.remove();
  });

  it('says so plainly when the brand has answered nothing', () => {
    const mock = brandToMockBrand(BRAND);
    render(
      <StrategyView
        brand={{
          ...mock,
          strategy: Object.fromEntries(
            STRATEGY_CARDS.map((c) => [c.key, Array.isArray(mock.strategy[c.key]) ? [] : '']),
          ) as typeof mock.strategy,
          about: [],
        }}
        sourceBrand={BRAND}
      />,
    );
    expect(screen.getByText('No strategy yet')).toBeTruthy();
    // The actions stay: a brand with nothing to show is exactly the brand
    // whose owner needs the Edit button.
    expect(screen.getByRole('button', { name: 'Edit strategy' })).toBeTruthy();
  });
});
