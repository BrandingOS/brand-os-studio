/**
 * Can you get to the Brand Kit at all?
 *
 * Five defects from the final QA sweep, and they are all the same defect
 * wearing different clothes: the kit was full of work the user could not
 * reach.
 *
 *   • **Q7 — at 1024×768 there were no cards.** The shell dropped to one
 *     column at 1080px, which put a 39-row sidebar above the board; the whole
 *     viewport was navigation and the first card sat at y=2303.
 *   • **Q8 — at 390×844 the top nav was clipped and unreachable.** Only
 *     "Setup" fitted, `.segmented-nav` is `overflow: hidden`, and the
 *     document does not scroll sideways, so four of the five tabs simply did
 *     not exist on a phone.
 *   • **Q17 — the first card was 48 Tabs from the top**, with no skip link.
 *   • **Q18 — an open drilldown did not take the keyboard with it.** Tab
 *     walked the Overview BEHIND it; no tile and none of its ⬇ / ✎ / ⋯ was
 *     ever reachable.
 *   • **Q20 — the card's focus ring was Chrome's default blue.**
 *
 * All five need real layout and real CSS, so all five live here.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, fireEvent, act, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

function renderKit(brand: MockBrand = mockBrand) {
  return render(
    <MemoryRouter>
      <BrandKitCosmosPage brand={brand} />
    </MemoryRouter>,
  );
}

async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  });
}

async function until(fn: () => boolean, ms = 3000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (fn()) return;
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25));
    });
  }
  throw new Error('Timed out waiting for the page to settle');
}

function cards(): HTMLElement[] {
  return Array.from(document.querySelectorAll('.bk-stage-layer--page1 .bk-card'));
}

async function openFromSidebar(label: string) {
  const nav = document.querySelector('.panel-list') as HTMLElement;
  fireEvent.click(within(nav).getByText(label));
  await settle();
  await until(() => document.querySelector('.bk-stage')?.getAttribute('data-active') === 'drilldown');
}

afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

/* ── Q7 + Q8 — the board is on screen at a laptop and at a phone ───────── */

describe('the grid is visible on load at every size', () => {
  it('keeps two columns on a 1024×768 laptop, with cards in the first screen', async () => {
    await page.viewport(1024, 768);
    renderKit();
    await settle();

    const shell = document.querySelector('.shell') as HTMLElement;
    const panel = document.querySelector('.panel') as HTMLElement;
    const first = cards()[0]!;

    // Two columns: the board starts to the RIGHT of the sidebar, not below it.
    expect(getComputedStyle(shell).gridTemplateColumns.split(' ').length).toBe(2);
    expect(first.getBoundingClientRect().left).toBeGreaterThan(
      panel.getBoundingClientRect().right - 1,
    );
    // …and the first card is inside the first screenful, which is the whole
    // claim: 2303px down the page is not "visible".
    expect(first.getBoundingClientRect().top).toBeLessThan(window.innerHeight);
  });

  it('caps the sidebar into a rail on a phone so the cards are still reachable', async () => {
    await page.viewport(390, 844);
    renderKit();
    await settle();

    const panel = document.querySelector('.panel') as HTMLElement;
    const list = panel.querySelector('.panel-list') as HTMLElement;

    // One column — and the sidebar is a compact scroller, not the page.
    expect(getComputedStyle(document.querySelector('.shell')!).gridTemplateColumns.split(' ').length)
      .toBe(1);
    expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight * 0.45);
    expect(list.scrollHeight).toBeGreaterThan(list.clientHeight);

    // The board begins within the first screen rather than below a screenful
    // of navigation.
    const board = document.querySelector('.board-wrap') as HTMLElement;
    expect(board.getBoundingClientRect().top).toBeLessThan(window.innerHeight);
  });

  it('shows every primary tab on a 390px phone', async () => {
    await page.viewport(390, 844);
    renderKit();
    await settle();

    const strip = document.querySelector('.segmented-nav') as HTMLElement;
    const items = Array.from(document.querySelectorAll<HTMLElement>('.segmented-nav-item'));
    expect(items.map((i) => i.textContent?.trim())).toEqual([
      'Setup',
      'Brand Kit',
      'Guideline',
      'Design',
      'Tools',
    ]);

    // Not clipped by the strip — the old failure was items laid out at x=452
    // inside a box that ends far earlier, invisible and unscrollable.
    const box = strip.getBoundingClientRect();
    for (const item of items) {
      const r = item.getBoundingClientRect();
      expect(r.left).toBeGreaterThanOrEqual(box.left - 1);
      expect(r.right).toBeLessThanOrEqual(box.right + 1);
    }
    // And every tab is inside the viewport, so it can actually be tapped.
    for (const item of items) {
      expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth + 1);
    }
  });
});

/* ── Q17 — the keyboard's way in ───────────────────────────────────────── */

describe('skip to content', () => {
  beforeEach(async () => { await page.viewport(1440, 900); });

  it('is the first focusable thing in the shell and lands on the board', async () => {
    renderKit();
    await settle();

    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-workspace] a[href], [data-workspace] button, [data-workspace] input, [data-workspace] [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => !el.closest('[inert]'));
    expect(focusables[0]?.className).toContain('skip-to-content');

    const skip = focusables[0]!;
    fireEvent.click(skip);
    const board = document.querySelector('.board-wrap') as HTMLElement;
    expect(document.activeElement).toBe(board);
    // -1, so the skip target is focusable but never itself a Tab stop.
    expect(board.getAttribute('tabindex')).toBe('-1');
  });
});

/* ── Q18 — an open drilldown owns the keyboard ─────────────────────────── */

describe('the drilldown takes the keyboard with it', () => {
  beforeEach(async () => { await page.viewport(1440, 900); });

  it('makes the Overview inert and moves focus into the open item', async () => {
    renderKit();
    await openFromSidebar('Logos');

    const page1 = document.querySelector('.bk-stage-layer--page1') as HTMLElement;
    const page2 = document.querySelector('.bk-stage-layer--page2') as HTMLElement;

    expect(page1.hasAttribute('inert')).toBe(true);
    expect(page2.hasAttribute('inert')).toBe(false);
    expect(document.activeElement).toBe(page2.querySelector('.bk-drilldown-back'));

    // The controls the user came for are inside the layer that has the
    // keyboard — a tile, and the tile's own actions.
    const tile = page2.querySelector('.bk-variant-card')!;
    expect(tile.querySelectorAll('button').length).toBeGreaterThan(0);
    // Nothing in the Overview may answer a Tab while it is behind.
    expect(page1.closest('[inert]') ?? page1).toBe(page1);
    expect(
      Array.from(page1.querySelectorAll('button')).every((b) => !!b.closest('[inert]')),
    ).toBe(true);
  });

  it('gives the Overview the keyboard back when the item closes', async () => {
    renderKit();
    await openFromSidebar('Logos');

    fireEvent.click(document.querySelector('.bk-drilldown-back')!);
    await until(
      () => document.querySelector('.bk-stage')?.getAttribute('data-active') === 'sections',
    );

    const page1 = document.querySelector('.bk-stage-layer--page1') as HTMLElement;
    const page2 = document.querySelector('.bk-stage-layer--page2') as HTMLElement;
    expect(page1.hasAttribute('inert')).toBe(false);
    expect(page2.hasAttribute('inert')).toBe(true);
  });

  it('returns focus to the sidebar row when the item was opened from there', async () => {
    renderKit();
    await settle();

    const nav = document.querySelector('.panel-list') as HTMLElement;
    const row = within(nav).getByText('Logos').closest('button') as HTMLElement;
    row.focus();
    fireEvent.click(row);
    await until(
      () => document.querySelector('.bk-stage')?.getAttribute('data-active') === 'drilldown',
    );

    fireEvent.click(document.querySelector('.bk-drilldown-back')!);
    await until(
      () => document.querySelector('.bk-stage')?.getAttribute('data-active') === 'sections',
    );
    // Not left on a control that has just been made inert.
    expect(document.activeElement).toBe(row);
  });

  it('returns focus to the card that opened it', async () => {
    renderKit();
    await settle();

    const card = cards()[0]!;
    card.focus();
    fireEvent.click(card);
    await until(
      () => document.querySelector('.bk-stage')?.getAttribute('data-active') === 'drilldown',
    );

    fireEvent.click(document.querySelector('.bk-drilldown-back')!);
    await until(
      () => document.querySelector('.bk-stage')?.getAttribute('data-active') === 'sections',
    );
    expect(document.activeElement).toBe(card);
  });
});

/* ── Q20 — the ring ────────────────────────────────────────────────────── */

describe('the card focus ring', () => {
  beforeEach(async () => { await page.viewport(1440, 900); });

  it('is a 3px charcoal ring, never the browser default blue', async () => {
    renderKit();
    await settle();

    const card = cards()[0]!;
    card.focus();
    const s = getComputedStyle(card);
    expect(s.outlineStyle).toBe('none');
    expect(s.boxShadow).toContain('3px');
    // rgb(0, 95, 204) is Chrome's default focus ring; the DS says never blue.
    expect(s.boxShadow).not.toContain('0, 95, 204');
  });
});

/* ── Q4 — the export dialog's own button ───────────────────────────────── */

describe('the export dialog keeps its primary action on screen', () => {
  beforeEach(async () => { await page.viewport(1280, 900); });

  it('pins the action row inside the panel and locks the page behind it', async () => {
    renderKit();
    await settle();

    fireEvent.click(document.querySelector('.pill-btn--primary')!);
    await until(() => !!document.querySelector('.ds-modal'));

    const modal = document.querySelector('.ds-modal') as HTMLElement;
    const foot = modal.querySelector('.ds-modal-foot') as HTMLElement;
    const body = modal.querySelector('.ds-modal-body') as HTMLElement;
    const primary = within(foot).getByText(/^Export /);

    const modalBox = modal.getBoundingClientRect();
    const footBox = foot.getBoundingClientRect();
    const btnBox = primary.getBoundingClientRect();

    // Inside the box…
    expect(footBox.bottom).toBeLessThanOrEqual(modalBox.bottom + 1);
    expect(btnBox.bottom).toBeLessThanOrEqual(modalBox.bottom + 1);
    // …and inside the viewport, which is the thing the user actually needs.
    expect(btnBox.bottom).toBeLessThanOrEqual(window.innerHeight);
    // The body is the scroller, so the dialog has more content than fits and
    // the assertion above is not passing for the trivial reason.
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('keeps every action inside the panel on a phone, where the row has to stack', async () => {
    await page.viewport(390, 844);
    renderKit();
    await settle();

    fireEvent.click(document.querySelector('.pill-btn--primary')!);
    await until(() => !!document.querySelector('.ds-modal'));

    const modal = document.querySelector('.ds-modal') as HTMLElement;
    const box = modal.getBoundingClientRect();
    const buttons = Array.from(
      (modal.querySelector('.ds-modal-foot') as HTMLElement).querySelectorAll('button'),
    );
    expect(buttons.length).toBeGreaterThan(2);
    for (const b of buttons) {
      const r = b.getBoundingClientRect();
      expect(r.right).toBeLessThanOrEqual(box.right + 1);
      expect(r.left).toBeGreaterThanOrEqual(box.left - 1);
      expect(r.bottom).toBeLessThanOrEqual(box.bottom + 1);
    }
  });
});
