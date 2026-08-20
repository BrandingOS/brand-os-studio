/**
 * Browser E2E — the library as a user meets it.
 *
 * The load-bearing assertions are the first two groups: the page must NOT
 * open with a dropzone occupying it (that regression is the reason this
 * redesign exists), and the tile's actions must stay hidden until hover so a
 * full grid reads as artwork. The rest covers the flows that actually mutate
 * the brand's library — rename, recategorise, delete, bulk delete — because
 * those are shared with Classic and a break is silent.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Asset, Brand } from '@/shared/types/brand';

const brand = {
  id: 'brand-fl-1',
  slug: 'acme',
  name: 'Acme',
  primaryColor: '#123456',
  fonts: { primary: 'Inter' },
  assets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Brand;

// WorkspaceShell mounts BrandSwitcher, which reads the whole store — the mock
// has to be a believable store, not just the fields under test.
const store = vi.hoisted(() => ({
  list: [] as unknown[],
  current: undefined as unknown,
  isLoading: false,
  error: undefined as string | undefined,
  loadBySlug: vi.fn(async () => {}),
  update: vi.fn(async () => {}),
}));

vi.mock('@/shared/store/brandStore', () => ({
  useBrandStore: Object.assign((selector: (s: unknown) => unknown) => selector(store), {
    getState: () => store,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), message: vi.fn() },
}));

vi.mock('@/shared/services/activityService', () => ({ activityService: { log: vi.fn() } }));
vi.mock('@/shared/services/storage.supabase', () => ({
  storageService: { uploadAsset: vi.fn(async () => ({ url: 'https://cdn.test/uploaded.png' })) },
}));

/** An in-memory stand-in for the ASSETS service, with the calls the page makes. */
const svc = vi.hoisted(() => {
  const rows: Record<string, unknown>[] = [];
  return {
    rows,
    listForBrand: vi.fn(async () => rows.slice() as unknown as Asset[]),
    create: vi.fn(async (input: Record<string, unknown>) => {
      const row = { id: `a${rows.length + 1}`, createdAt: new Date(), tags: [], ...input };
      rows.push(row);
      return row as unknown as Asset;
    }),
    update: vi.fn(async (id: string, patch: Record<string, unknown>) => {
      const row = rows.find((r) => r.id === id)!;
      Object.assign(row, patch);
      return row as unknown as Asset;
    }),
    delete: vi.fn(async (id: string) => {
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows.splice(i, 1);
    }),
  };
});

const designStorage = vi.hoisted(() => ({ listDesigns: vi.fn(async () => []) }));

vi.mock('@/core', () => ({
  SERVICE_KEYS: { ASSETS: 'ASSETS', DESIGN_STORAGE: 'DESIGN_STORAGE' },
  useService: (key: string) => (key === 'DESIGN_STORAGE' ? designStorage : svc),
}));

import FoldersPage from '../FoldersPage';

function seed(...rows: Partial<Asset>[]) {
  svc.rows.length = 0;
  rows.forEach((r, i) =>
    svc.rows.push({
      id: `a${i + 1}`,
      name: `asset-${i + 1}.png`,
      type: 'image',
      category: 'photo',
      source: 'upload',
      url: `https://cdn.test/${i + 1}.png`,
      size: 2048,
      tags: [],
      createdAt: new Date(2026, 0, i + 1),
      ...r,
    } as Record<string, unknown>),
  );
}

function mount() {
  return render(
    <MemoryRouter initialEntries={['/b/acme/folders']}>
      <Routes>
        <Route path="/b/:slug/folders" element={<FoldersPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const tiles = () => Array.from(document.querySelectorAll<HTMLElement>('.fl-tile'));

/**
 * A drag event the page can actually read.
 *
 * Chromium puts DataTransfer in protected mode outside a genuine user drag —
 * a real `new DataTransfer()` passed to fireEvent arrives with `types` empty,
 * so the file/text distinction cannot be exercised that way. Defining the
 * property on the event gives the handler the shape the browser gives it
 * during a real drag. (`dragCarriesFiles` is unit-tested separately.)
 */
function drag(type: string, types: string[], files: File[] = []): DragEvent {
  const ev = new DragEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: { types, files } });
  return ev;
}
const FILE = new File(['x'], 'drop.png', { type: 'image/png' });
const tileByName = (name: string) =>
  tiles().find((t) => t.getAttribute('aria-label') === name)!;

beforeEach(() => {
  store.list = [brand];
  store.current = brand;
  vi.clearAllMocks();
});

afterEach(cleanup);

/* ───────────────────────────────────────────────────────────────── */

describe('the assets are the page', () => {
  it('opens straight into the collection — no permanent dropzone', async () => {
    seed({}, {}, {});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(3));

    // The old page rendered a persistent drop target above the grid.
    expect(document.querySelector('.ds-dropzone')).toBeNull();
    expect(screen.queryByText(/drag & drop assets/i)).toBeNull();
  });

  it('shows the count and the toolbar controls in one band', async () => {
    seed({}, {});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(2));

    const toolbar = document.querySelector('.fl-toolbar')!;
    expect(within(toolbar as HTMLElement).getByText('2 assets')).toBeTruthy();
    expect(within(toolbar as HTMLElement).getByRole('tablist', { name: 'Library' })).toBeTruthy();
    expect(within(toolbar as HTMLElement).getByLabelText('Search assets')).toBeTruthy();
    expect(within(toolbar as HTMLElement).getByRole('radiogroup', { name: 'View' })).toBeTruthy();
    expect(within(toolbar as HTMLElement).getByRole('button', { name: /upload assets/i })).toBeTruthy();
  });

  it('uses DS chips for the category filters, with counts', async () => {
    seed({ category: 'logo' }, { category: 'photo' }, { category: 'photo' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(3));

    const filters = document.querySelector('.fl-filters')!;
    // The DS chip, not a bespoke pill.
    expect(filters.querySelectorAll('.ds-chip').length).toBe(7);
    expect(within(filters as HTMLElement).getByRole('button', { name: /^Photos ?2$/ })).toBeTruthy();
  });
});

describe('the card is quiet until you touch it', () => {
  it('hides the action rail and the checkbox until hover or focus', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    const rail = tiles()[0].querySelector('.fl-tile-rail')!;
    expect(getComputedStyle(rail).opacity).toBe('0');
    expect(getComputedStyle(tiles()[0].querySelector('.fl-tile-check')!).opacity).toBe('0');

    // Keyboard users get the same reveal — :focus-within, not :hover only.
    // (CSS :hover cannot be driven by a synthetic event.)
    within(tiles()[0]).getByRole('button', { name: 'Preview' }).focus();
    await waitFor(() => expect(getComputedStyle(rail).opacity).toBe('1'));
  });

  it('offers preview, download and more on every card', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    const tile = within(tiles()[0]);
    expect(tile.getByRole('button', { name: 'Preview' })).toBeTruthy();
    expect(tile.getByRole('button', { name: 'Download' })).toBeTruthy();
    expect(tile.getByRole('button', { name: 'More actions' })).toBeTruthy();
  });
});

describe('previews degrade instead of breaking', () => {
  it('never mounts an <img> for a PDF', async () => {
    seed({ name: 'brief.pdf', type: 'document', category: 'reference' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    expect(tiles()[0].querySelector('img')).toBeNull();
    expect(within(tiles()[0]).getByText('PDF')).toBeTruthy();
  });

  it('swaps a failed image for its glyph rather than the browser default', async () => {
    seed({ name: 'gone.png', url: 'https://cdn.test/does-not-exist.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    const img = tiles()[0].querySelector('img')!;
    fireEvent.error(img);
    await waitFor(() => expect(tiles()[0].querySelector('img')).toBeNull());
    expect(tiles()[0].querySelector('.fl-preview--glyph')).toBeTruthy();
  });
});

describe('filtering and search', () => {
  it('narrows by category and reports the narrowed count', async () => {
    seed({ name: 'mark.svg', category: 'logo' }, { name: 'shot.jpg', category: 'photo' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(2));

    fireEvent.click(screen.getByRole('button', { name: /^Logos ?1$/ }));
    await waitFor(() => expect(tiles()).toHaveLength(1));
    expect(screen.getByText('1 of 2')).toBeTruthy();
  });

  it('offers a way out when a filter matches nothing', async () => {
    seed({ name: 'shot.jpg', category: 'photo' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    fireEvent.change(screen.getByLabelText('Search assets'), { target: { value: 'zzz' } });
    await screen.findByText(/no assets match this filter/i);

    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    await waitFor(() => expect(tiles()).toHaveLength(1));
  });
});

describe('per-asset actions write through', () => {
  it('renames from the card menu', async () => {
    seed({ name: 'old.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    fireEvent.click(within(tiles()[0]).getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));

    const input = within(tiles()[0]).getByLabelText('Asset name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'new.png' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => expect(svc.update).toHaveBeenCalledWith('a1', { name: 'new.png' }));
  });

  it('moves an asset to another category from the second menu pane', async () => {
    seed({ name: 'mark.svg', category: 'photo' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    fireEvent.click(within(tiles()[0]).getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /move to/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Logos' }));

    await waitFor(() => expect(svc.update).toHaveBeenCalledWith('a1', { category: 'logo' }));
  });

  it('confirms before deleting — a delete is never one click', async () => {
    seed({ name: 'doomed.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    fireEvent.click(within(tiles()[0]).getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }));

    expect(svc.delete).not.toHaveBeenCalled();
    await screen.findByText(/delete this asset\?/i);
    fireEvent.click(screen.getByRole('button', { name: /^Delete$/ }));

    await waitFor(() => expect(svc.delete).toHaveBeenCalledWith('a1'));
  });
});

describe('selection', () => {
  it('ticking a card enters selection mode and the bulk bar follows', async () => {
    seed({}, {});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(2));

    fireEvent.click(within(tiles()[0]).getByRole('button', { name: /^Select asset-/ }));
    await screen.findByText('1 selected');

    fireEvent.click(screen.getByRole('button', { name: /select all/i }));
    await screen.findByText('2 selected');
  });

  it('bulk delete confirms, then removes every selected asset', async () => {
    seed({}, {});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(2));

    fireEvent.click(within(tiles()[0]).getByRole('button', { name: /^Select asset-/ }));
    fireEvent.click(await screen.findByRole('button', { name: /^Delete$/ }));
    await screen.findByText(/delete 1 asset\?/i);
    fireEvent.click(screen.getAllByRole('button', { name: /^Delete$/ }).pop()!);

    await waitFor(() => expect(svc.delete).toHaveBeenCalledTimes(1));
  });
});

describe('uploading is on demand', () => {
  it('opens the upload modal from the toolbar and keeps drag & drop inside it', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: /upload assets/i }));
    const zone = document.querySelector('.fl-upload-zone') as HTMLElement;
    expect(zone).toBeTruthy();

    fireEvent(zone, drag('dragover', ['Files'], [FILE]));
    await waitFor(() => expect(zone.getAttribute('data-dragging')).toBe('true'));
  });

  it('shows a drop veil while files are dragged over the library', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    const board = document.querySelector('.fl-board') as HTMLElement;
    fireEvent(board, drag('dragenter', ['Files'], [FILE]));
    await waitFor(() => expect(document.querySelector('.fl-dropveil')).toBeTruthy());

    fireEvent(board, drag('dragleave', ['Files'], [FILE]));
    await waitFor(() => expect(document.querySelector('.fl-dropveil')).toBeNull());
  });

  it('a text drag is not a file drag — no veil', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    fireEvent(document.querySelector('.fl-board')!, drag('dragenter', ['text/plain']));
    expect(document.querySelector('.fl-dropveil')).toBeNull();
  });
});

describe('the empty brand', () => {
  it('invites the first upload, and that invitation is gone once an asset exists', async () => {
    seed();
    const { unmount } = mount();
    await screen.findByText(/library is empty/i);
    const blank = document.querySelector('.fl-blank') as HTMLElement;
    expect(within(blank).getByRole('button', { name: /upload assets/i })).toBeTruthy();
    unmount();
    cleanup();

    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));
    expect(screen.queryByText(/library is empty/i)).toBeNull();
  });
});

describe('the detail view', () => {
  it('opens on click and walks the filtered set with the arrow keys', async () => {
    seed({ name: 'one.png' }, { name: 'two.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(2));

    fireEvent.click(tileByName('two.png'));
    const dialog = await screen.findByRole('dialog');
    expect((within(dialog).getByLabelText('Asset name') as HTMLInputElement).value).toBe('two.png');

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    await waitFor(() =>
      expect(
        (within(screen.getByRole('dialog')).getByLabelText('Asset name') as HTMLInputElement).value,
      ).toBe('one.png'),
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
