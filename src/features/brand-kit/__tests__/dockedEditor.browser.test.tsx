/**
 * The editor is DOCKED. It is not a popup.
 *
 * The owner's words: *"make the editor customization in sidebar not above
 * the screen with popup! because I need to see what happen in background!"*
 *
 * Every assertion here is about the page BEHIND the panel, which is why
 * none of it can live in jsdom: "is the kit still visible" and "can I still
 * click a card" are questions only real layout and real hit-testing can
 * answer. `fireEvent` dispatches AT an element and never asks the browser
 * what is on top of it — a full-screen scrim would have passed every one of
 * these tests in jsdom.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SEED_BRANDS } from '@/data/brands';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

// See kitChrome's note: PhotosEditor builds an uploader from the DI
// container the moment it renders, and no test boots the container.
vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

// A REAL brand, with its canonical twin: without `sourceBrand` every card
// cover falls back to the identity mark, and "the card repaints as you
// type" cannot be asserted against a letter.
const SOURCE = migrateBrandToCurrent(SEED_BRANDS[0]!);
const KIT_BRAND = brandToMockBrand(SOURCE);

function renderKit() {
  return render(
    <MemoryRouter>
      <BrandKitCosmosPage brand={KIT_BRAND} sourceBrand={SOURCE} />
    </MemoryRouter>,
  );
}

async function settle() {
  await act(async () => {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
  });
}

function card(label: string): HTMLElement {
  const found = Array.from(document.querySelectorAll('figure.bk-card')).find(
    (f) => f.querySelector('figcaption')?.textContent?.trim() === label,
  );
  if (!found) throw new Error(`No card labelled ${label}`);
  return found as HTMLElement;
}

function panel(): HTMLElement {
  const el = document.querySelector('.bk-dock-panel') as HTMLElement | null;
  if (!el) throw new Error('no docked panel');
  return el;
}

/** Every painted element that covers (nearly) the whole viewport. */
function fullViewportLayers(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('body *'))
    .filter((el) => {
      const s = getComputedStyle(el);
      if (s.position !== 'fixed' && s.position !== 'absolute') return false;
      if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width >= window.innerWidth * 0.95 && r.height >= window.innerHeight * 0.95;
    })
    .map((el) => el.className || el.tagName);
}

async function openEditor(label: string) {
  fireEvent.click(card(label).querySelector(`button[aria-label="Edit ${label}"]`)!);
  await settle();
}

beforeEach(async () => {
  await page.viewport(1440, 900);
  localStorage.clear();
});
afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

describe('the editor is a column of the page, not a layer over it', () => {
  it('lays nothing over the viewport — no scrim, no full-screen shell', async () => {
    renderKit();
    await settle();
    const before = fullViewportLayers();

    await openEditor('Colors');
    expect(document.querySelector('.bk-dock-panel')).toBeTruthy();

    // Nothing NEW covers the page. (`before` is not asserted empty: the
    // workspace shell has its own always-present backdrop elements, and
    // what matters is that opening an editor adds none.)
    expect(fullViewportLayers()).toEqual(before);

    // The panel itself is in flow — it is not what covers the page either.
    const s = getComputedStyle(panel());
    expect(s.position).not.toBe('fixed');
    const r = panel().getBoundingClientRect();
    expect(r.width).toBeLessThan(window.innerWidth * 0.5);
    expect(r.left).toBeGreaterThan(window.innerWidth * 0.5);
  });

  it('leaves the page scrollable — a docked panel never locks the body', async () => {
    renderKit();
    await settle();
    await openEditor('Colors');

    expect(document.body.style.overflow).not.toBe('hidden');
    expect(getComputedStyle(document.body).overflow).not.toBe('hidden');
  });

  it('reflows the board instead of covering it', async () => {
    renderKit();
    await settle();
    const board = document.querySelector('.bk-cosmos-board') as HTMLElement;
    const wide = board.getBoundingClientRect().width;

    await openEditor('Colors');
    const narrow = board.getBoundingClientRect().width;

    // The board gave the panel room; it did not simply get painted over.
    expect(narrow).toBeLessThan(wide);
    // And the panel is BESIDE it, not on top of it.
    const b = board.getBoundingClientRect();
    const p = panel().getBoundingClientRect();
    expect(p.left).toBeGreaterThanOrEqual(b.right - 1);
  });

  it('keeps the kit visible AND hit-testable while the panel is open', async () => {
    renderKit();
    await settle();
    await openEditor('Colors');

    const logos = card('Logos');
    const r = logos.getBoundingClientRect();
    expect(r.width).toBeGreaterThan(0);
    expect(r.right).toBeLessThanOrEqual(window.innerWidth);

    // The browser's own answer to "what would a click here hit?"
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + 24);
    expect(hit).toBeTruthy();
    expect(hit!.closest('figure.bk-card')).toBe(logos);
    expect(hit!.closest('.bk-dock-panel')).toBeNull();
  });

  it('opens the next editor IN the panel — it never stacks a second one', async () => {
    renderKit();
    await settle();

    await openEditor('Colors');
    expect(panel().textContent).toContain('Colors');

    await openEditor('Typography');
    expect(document.querySelectorAll('.bk-dock-panel').length).toBe(1);
    expect(panel().textContent).toContain('Typography');
  });

  it('closes on Escape and gives focus back to what opened it', async () => {
    renderKit();
    await settle();

    const opener = card('Colors').querySelector(
      'button[aria-label="Edit Colors"]',
    ) as HTMLElement;
    opener.focus();
    fireEvent.click(opener);
    await settle();
    expect(document.querySelector('.bk-dock-panel')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    await settle();
    expect(document.querySelector('.bk-dock-panel')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('does not trap focus — the page behind stays reachable', async () => {
    renderKit();
    await settle();
    await openEditor('Colors');

    // A non-modal dialog: it announces itself, but it does not claim the
    // page. `aria-modal` would tell a screen reader the opposite of what
    // docking is for.
    expect(panel().getAttribute('role')).toBe('dialog');
    expect(panel().getAttribute('aria-modal')).toBeNull();

    // Nothing has been made inert or hidden behind it.
    const board = document.querySelector('.bk-cosmos-board') as HTMLElement;
    expect(board.closest('[inert]')).toBeNull();
    expect(board.closest('[aria-hidden="true"]')).toBeNull();
  });
});

describe('the card behind the panel repaints as you type', () => {
  it('shows the template editor’s unsaved draft on the card itself', async () => {
    renderKit();
    await settle();

    // Every cover mounts on approach, so the card has to be approached.
    card('Business Card').scrollIntoView();
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400));
    });

    await openEditor('Business Card');
    const cover = () => card('Business Card').querySelector('.bk-card-cover')!.textContent ?? '';
    const before = cover();
    // The cover is the artifact, not a fallback letter — otherwise the
    // assertion below would be passing for the wrong reason.
    expect(before.length).toBeGreaterThan(10);

    const input = panel().querySelector('input') as HTMLInputElement;
    expect(input).toBeTruthy();
    fireEvent.change(input, { target: { value: 'Amina El-Sayed' } });
    await settle();

    expect(cover()).not.toBe(before);
    expect(cover()).toContain('Amina El-Sayed');
    // Nothing was written — a draft is a preview, not a save.
    expect(localStorage.getItem('brandos:brand-kit:customizations')).toBeNull();
  });
});
