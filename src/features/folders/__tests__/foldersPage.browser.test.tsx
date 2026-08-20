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
  const folders: Record<string, unknown>[] = [];
  let folderSeq = 0;
  return {
    rows,
    folders,
    /** Folder ids are asserted on, so the counter resets with the fixture. */
    resetFolders: () => {
      folders.length = 0;
      folderSeq = 0;
    },
    listFolders: vi.fn(async () => folders.slice() as never),
    createFolder: vi.fn(async (input: { brandId: string; name: string; parentId?: string | null }) => {
      folderSeq += 1;
      const folder = {
        id: `f${folderSeq}`,
        brandId: input.brandId,
        name: input.name,
        parentId: input.parentId ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      folders.push(folder);
      return folder as never;
    }),
    renameFolder: vi.fn(async (id: string, name: string) => {
      const f = folders.find((x) => x.id === id)!;
      f.name = name;
      return f as never;
    }),
    deleteFolder: vi.fn(async (id: string) => {
      const doomed = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const f of folders) {
          if (f.parentId && doomed.has(f.parentId as string) && !doomed.has(f.id as string)) {
            doomed.add(f.id as string);
            grew = true;
          }
        }
      }
      for (let i = folders.length - 1; i >= 0; i--) {
        if (doomed.has(folders[i].id as string)) folders.splice(i, 1);
      }
      for (const r of rows) if (doomed.has(r.folderId as string)) r.folderId = null;
    }),
    moveToFolder: vi.fn(async (id: string, folderId: string | null) => {
      const row = rows.find((r) => r.id === id)!;
      row.folderId = folderId;
      return row as never;
    }),
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

const designStorage = vi.hoisted(() => ({
  listDesigns: vi.fn(async () => [] as Array<Record<string, unknown>>),
  deleteDesign: vi.fn(async () => {}),
  moveDesignToFolder: vi.fn(async () => {}),
}));

vi.mock('@/core', () => ({
  SERVICE_KEYS: { ASSETS: 'ASSETS', DESIGN_STORAGE: 'DESIGN_STORAGE' },
  useService: (key: string) => (key === 'DESIGN_STORAGE' ? designStorage : svc),
}));

import FoldersPage from '../FoldersPage';

function seed(...rows: Partial<Asset>[]) {
  svc.rows.length = 0;
  svc.resetFolders();
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
      folderId: null,
      ...r,
    } as Record<string, unknown>),
  );
}

const folderTiles = () =>
  Array.from(document.querySelectorAll<HTMLElement>('.fl-tile--folder'));

/** Create a folder through the UI, the way a user would. */
async function makeFolder(name: string) {
  // The toolbar's button — the empty state offers one too.
  fireEvent.click(within(toolbar()).getByRole('button', { name: /new folder/i }));
  const input = await screen.findByLabelText('Name');
  fireEvent.change(input, { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: /^Create$/ }));
  await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
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

const tiles = () => Array.from(document.querySelectorAll<HTMLElement>('.fl-tile--asset'));
const toolbar = () => document.querySelector('.fl-toolbar') as HTMLElement;

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

describe('the library is the page', () => {
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
    expect(within(toolbar as HTMLElement).getByRole('button', { name: /^Upload$/ })).toBeTruthy();
    expect(within(toolbar as HTMLElement).getByRole('button', { name: /new folder/i })).toBeTruthy();
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
    await screen.findByText(/nothing here matches this filter/i);

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
    fireEvent.click(await screen.findByRole('menuitem', { name: /change category/i }));
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

    fireEvent.click(screen.getByRole('button', { name: /^Upload$/ }));
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
    await screen.findByText(/has nothing filed yet/i);
    const blank = document.querySelector('.fl-blank') as HTMLElement;
    expect(within(blank).getByRole('button', { name: /upload files/i })).toBeTruthy();
    unmount();
    cleanup();

    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));
    expect(screen.queryByText(/has nothing filed yet/i)).toBeNull();
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

/* ─── One tree, three views ──────────────────────────────────────── */

describe('folders belong to the brand, not to a tab', () => {
  it('creates a folder where you are standing, and opens into it', async () => {
    seed({ name: 'logo.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    await makeFolder('Campaigns');
    await waitFor(() => expect(folderTiles()).toHaveLength(1));

    fireEvent.click(folderTiles()[0]);
    // Inside, the breadcrumb names the path and the root's assets are gone.
    await screen.findByRole('heading', { name: 'Campaigns' });
    expect(screen.getByRole('button', { name: 'Folders' })).toBeTruthy();
    await waitFor(() => expect(tiles()).toHaveLength(0));
  });

  it('nests — Design / Social Media is a folder inside a folder', async () => {
    seed();
    mount();
    await screen.findByText(/has nothing filed yet/i);

    await makeFolder('Design');
    fireEvent.click(folderTiles()[0]);
    await screen.findByRole('heading', { name: 'Design' });

    await makeFolder('Social Media');
    await waitFor(() => expect(folderTiles()).toHaveLength(1));
    expect(svc.createFolder).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: 'Social Media', parentId: 'f1' }),
    );
  });

  it('keeps the folder when the tab changes — same place, different view', async () => {
    seed({ name: 'shot.jpg' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));
    await makeFolder('Summer Launch');
    fireEvent.click(folderTiles()[0]);
    await screen.findByRole('heading', { name: 'Summer Launch' });

    fireEvent.click(screen.getByRole('tab', { name: 'Designs' }));
    // Still in Summer Launch, now looking at designs.
    await screen.findByRole('heading', { name: 'Summer Launch' });
    fireEvent.click(screen.getByRole('tab', { name: 'Kit' }));
    await screen.findByRole('heading', { name: 'Summer Launch' });
  });

  it('shows the same subfolders in every tab', async () => {
    seed();
    mount();
    await screen.findByText(/has nothing filed yet/i);
    await makeFolder('Campaigns');
    await waitFor(() => expect(folderTiles()).toHaveLength(1));

    // A folder holding no designs must not vanish under Designs — losing the
    // path under your feet is the disorientation the shared tree prevents.
    fireEvent.click(screen.getByRole('tab', { name: 'Designs' }));
    await waitFor(() => expect(folderTiles()).toHaveLength(1));
    fireEvent.click(screen.getByRole('tab', { name: 'Kit' }));
    await waitFor(() => expect(folderTiles()).toHaveLength(1));
  });

  it('files an asset into a folder from the menu, and it leaves the root', async () => {
    seed({ name: 'card.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));
    await makeFolder('Print');

    fireEvent.click(within(tiles()[0]).getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /move to folder/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Print' }));

    await waitFor(() => expect(svc.moveToFolder).toHaveBeenCalledWith('a1', 'f1'));
    await waitFor(() => expect(tiles()).toHaveLength(0));
  });

  it('counts what the folder holds, descendants included', async () => {
    seed({ name: 'one.png' }, { name: 'two.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(2));
    await makeFolder('Print');

    for (const label of ['one.png', 'two.png']) {
      const tile = tiles().find((t) => t.getAttribute('aria-label') === label)!;
      fireEvent.click(within(tile).getByRole('button', { name: 'More actions' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /move to folder/i }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Print' }));
      await waitFor(() => expect(tiles()).toHaveLength(0), { timeout: 2000 }).catch(() => {});
    }

    await waitFor(() => expect(within(folderTiles()[0]).getByText('2 items')).toBeTruthy());
  });

  it('deleting a folder unfiles its contents rather than deleting them', async () => {
    seed({ name: 'kept.png' });
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));
    await makeFolder('Temp');

    fireEvent.click(within(tiles()[0]).getByRole('button', { name: 'More actions' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /move to folder/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Temp' }));
    await waitFor(() => expect(tiles()).toHaveLength(0));

    fireEvent.click(
      within(folderTiles()[0]).getByRole('button', { name: /more actions for temp/i }),
    );
    fireEvent.click(await screen.findByRole('menuitem', { name: /delete folder/i }));
    await screen.findByText(/nothing filed in them is deleted/i);
    fireEvent.click(screen.getByRole('button', { name: /^Delete folder$/ }));

    // The folder is gone; the asset is back at the root, not destroyed.
    await waitFor(() => expect(folderTiles()).toHaveLength(0));
    await waitFor(() => expect(tiles()).toHaveLength(1));
    expect(svc.delete).not.toHaveBeenCalled();
  });

  it('refuses a duplicate name among siblings before writing', async () => {
    seed();
    mount();
    await screen.findByText(/has nothing filed yet/i);
    await makeFolder('Print');

    fireEvent.click(within(toolbar()).getByRole('button', { name: /new folder/i }));
    fireEvent.change(await screen.findByLabelText('Name'), { target: { value: 'print' } });
    await screen.findByText(/already has that name/i);
    expect((screen.getByRole('button', { name: /^Create$/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(svc.createFolder).toHaveBeenCalledTimes(1);
  });
});

/* ─── Kit ────────────────────────────────────────────────────────── */

describe('the kit is deliverables, not storage', () => {
  it('offers a deliverable slot rather than a generic upload', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));

    fireEvent.click(screen.getByRole('tab', { name: 'Kit' }));
    await screen.findByText(/no brand deliverables in this folder yet/i);

    fireEvent.click(within(toolbar()).getByRole('button', { name: /add deliverable/i }));
    await screen.findByRole('dialog');
    // You choose WHAT the file is; a file with no slot is a Library asset.
    expect(screen.getByRole('radio', { name: /business card/i })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /letterhead/i })).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: /choose file/i }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('enables the file picker once a slot is chosen', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));
    fireEvent.click(screen.getByRole('tab', { name: 'Kit' }));
    fireEvent.click(within(toolbar()).getByRole('button', { name: /add deliverable/i }));

    fireEvent.click(await screen.findByRole('radio', { name: /business card/i }));
    await waitFor(() =>
      expect(
        (screen.getByRole('button', { name: /choose file/i }) as HTMLButtonElement).disabled,
      ).toBe(false),
    );
  });

  it('the kit tab does not offer the library upload button', async () => {
    seed({});
    mount();
    await waitFor(() => expect(tiles()).toHaveLength(1));
    fireEvent.click(screen.getByRole('tab', { name: 'Kit' }));

    await within(toolbar()).findByRole('button', { name: /add deliverable/i });
    expect(within(toolbar()).queryByRole('button', { name: /^Upload$/ })).toBeNull();
    expect(within(toolbar()).getByRole('button', { name: /download kit/i })).toBeTruthy();
  });
});
