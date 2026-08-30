/**
 * Photos — what the kit says about a brand that has none.
 *
 * Three defects, one cause: a photo SOURCE was never measured, so every
 * surface believed a broken one.
 *
 *   • **Q13.** raqm's Photos offered its ⬇ and its format menu and produced
 *     no file at all. No error, no toast, no disabled state.
 *   • **Q14.** skam's produced `skam-grain-texture-overlay.png` — a white
 *     card reading "No photos yet". The kit shipped a picture of an error
 *     message, under the missing photograph's own name.
 *   • **Q15.** The sidebar read **37 / 37 with Photos ticked** while the
 *     card beside it said "No photography yet", because `hasRealPhotos` is
 *     optimistic and nothing had yet tried to load the picture.
 *
 * It has to be a browser test: the measurement is an `<img>` failing to
 * decode a real response, and jsdom loads nothing.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, cleanup, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';
import { resetPhotoSourceCache } from '../data/photoExport';

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

/**
 * skam's own case: one "photo" pointing at a path that does not exist.
 *
 * A single-page app answers a missing path with its own document at status
 * 200, which is exactly why a status check was never enough.
 */
const brandWithBrokenPhoto: MockBrand = {
  ...mockBrand,
  name: 'SKAM',
  photos: [{ id: 'grain', src: '/images/there-is-no-such-picture.png', slot: 'A' }],
} as MockBrand;

function renderKit(which: MockBrand) {
  return render(
    <MemoryRouter>
      <BrandKitCosmosPage brand={which} />
    </MemoryRouter>,
  );
}

function card(label: string): HTMLElement {
  const found = Array.from(document.querySelectorAll('figure.bk-card')).find(
    (f) => f.querySelector('figcaption')?.textContent?.trim() === label,
  );
  if (!found) throw new Error(`No card labelled ${label}`);
  return found as HTMLElement;
}

async function settle(frames = 2) {
  await act(async () => {
    for (let i = 0; i < frames; i += 1) {
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    }
  });
}

/** The sidebar row for one entry. */
function sidebarRow(label: string): HTMLElement | undefined {
  return Array.from(document.querySelectorAll<HTMLElement>('.panel-item')).find(
    (r) => r.querySelector('.panel-item-name')?.textContent?.trim() === label,
  );
}

/**
 * Wait for the source probe to come back.
 *
 * Keyed on the PHOTOS row rather than on "any missing row": a brand can
 * legitimately be missing something else, and waiting on that returns
 * before the measurement has landed — which is a race, and it failed
 * exactly once while this test was being written.
 */
async function measured() {
  for (let i = 0; i < 60; i += 1) {
    await settle(1);
    if (sidebarRow('Photos')?.className.includes('is-missing')) return;
  }
  throw new Error('the photo source was never measured');
}

/*
 * The cache is reset ONCE, not per test.
 *
 * It is process-wide by design — a source measured anywhere is measured
 * everywhere — and `probePhotoSources` deliberately measures each source a
 * single time. Clearing it between cases asks the browser to re-request a
 * URL it has just cached, and the second request does not always report
 * back; keeping it mirrors how the page really behaves within one session.
 */
resetPhotoSourceCache();

beforeEach(async () => {
  await page.viewport(1440, 900);
});
afterEach(async () => {
  cleanup();
  await page.viewport(414, 896);
});

describe('a brand whose only photograph is broken', () => {
  it('does not count Photos towards completion once the source is measured', async () => {
    renderKit(brandWithBrokenPhoto);
    await settle();
    await measured();

    const photos = sidebarRow('Photos');
    expect(photos, 'the sidebar has no Photos row').toBeTruthy();
    // The tick is what said "done"; it must be the outline ring instead.
    expect(photos!.className, 'Photos is still ticked complete').toContain('is-missing');
    expect(photos!.querySelector('.status-chip')!.className).toContain('is-missing');

    // …and the counter agrees with the row, which is the whole of Q15.
    const meta = document.querySelector('.ds-progress-meta, .panel-top')!.textContent ?? '';
    const [done, total] = (meta.match(/(\d+)\s*\/\s*(\d+)/) ?? []).slice(1).map(Number);
    expect(done).toBeLessThan(total);
  });

  it('offers a Download menu that says why it cannot run, instead of running silently', async () => {
    renderKit(brandWithBrokenPhoto);
    await settle();
    await measured();

    const photos = card('Photos');
    photos.classList.add('is-ctx-active');
    fireEvent.click(photos.querySelector('button[aria-label^="Download"]') as HTMLElement);
    await settle();

    const menu = document.querySelector('.bk-dl-menu');
    expect(menu, 'the ⬇ opened no menu').toBeTruthy();
    const rows = Array.from(menu!.querySelectorAll<HTMLElement>('.ds-menu-item'));
    // The menu keeps its shape — one vocabulary everywhere — and every row
    // is disabled with a reason a user can act on.
    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const row of rows) {
      expect(row.getAttribute('aria-disabled') ?? String(row.hasAttribute('disabled'))).toMatch(
        /true/,
      );
      expect(row.getAttribute('title') ?? '').toMatch(/no photography yet/i);
    }
  });
});

describe('a brand with a real photograph', () => {
  it('keeps the menu live', async () => {
    renderKit({
      ...mockBrand,
      photos: [{ id: 'ok', src: '/favicon.ico', slot: 'A' }],
    } as MockBrand);
    await settle();

    const photos = card('Photos');
    photos.classList.add('is-ctx-active');
    fireEvent.click(photos.querySelector('button[aria-label^="Download"]') as HTMLElement);
    await settle();

    const rows = Array.from(
      document.querySelectorAll<HTMLElement>('.bk-dl-menu .ds-menu-item'),
    );
    expect(rows.length).toBeGreaterThanOrEqual(5);
    // "For web" is live for a brand that has something to export.
    expect(rows[0].getAttribute('aria-disabled')).not.toBe('true');
  });
});
