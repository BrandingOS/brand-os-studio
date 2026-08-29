/**
 * The Photos editor — every control changes something, and what it changes is real.
 *
 * The audit's D10 is the reason this file is long: the old Photos editor offered
 * a headline field, three colour swatches and three "Select image" buttons, and
 * NOT ONE of them changed the preview. So the assertions here are deliberately
 * about EFFECT — the thumbnail's own computed filter, the photos the page behind
 * the panel is handed, the ids written to the direction store — rather than
 * about a control existing.
 *
 * A browser test rather than jsdom because the treatments are a cascade: a
 * duotone is `grayscale(1)` plus two blended overlays, and with no stylesheet
 * every one of them measures as nothing.
 *
 * The two shared surfaces this panel composes — `AssetSourcePopover` and
 * `useAssetUpload` — reach for the DI container, which no test boots. They are
 * stubbed at their module boundary: what is under test is what this panel does
 * with a file, not how the canonical picker collects one.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import '@/index.css';
import '@/shared/ds/tokens.css';
import { SEED_BRANDS } from '@/data/brands';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import type { Brand } from '@/shared/types/brand';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  markPhotoSourceBroken,
  readPhotoDirection,
  resetPhotoSourceCache,
} from '../../../data/photoExport';

/* ─── The two shared surfaces, stubbed at their boundary ──────────── */

const uploaded = vi.fn();

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({
    uploading: false,
    upload: (file: File) => {
      uploaded(file.name);
      // The Library mints the id. That is the whole reason the panel defers a
      // pending row's identity until Save.
      return Promise.resolve({ id: 'asset-from-library', name: file.name });
    },
  }),
}));

vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({
    trigger,
    onPick,
  }: {
    trigger: React.ReactNode;
    onPick: (s: { kind: 'file'; file: File }) => void;
  }) => (
    <>
      {trigger}
      <input
        data-testid="stub-file"
        type="file"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) onPick({ kind: 'file', file });
        }}
      />
    </>
  ),
}));

// Imported after the mocks so the panel picks them up.
const { PhotosEditor } = await import('../PhotosEditor');

/* ─── A brand that owns photographs ───────────────────────────────── */

const PHOTOS = [
  { id: 'photo-studio', name: 'Studio portrait', url: 'data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' },
  { id: 'photo-street', name: 'Street at dusk', url: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAA/wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' },
  { id: 'photo-desk', name: 'Desk detail', url: 'data:image/gif;base64,R0lGODlhAQABAIAAAADwAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' },
];

function brandWithPhotos(): Brand {
  const base = SEED_BRANDS[0]!;
  return {
    ...base,
    id: 'brand-photos-test',
    brandAssets: PHOTOS.map((p) => ({
      id: p.id,
      kind: 'image' as const,
      name: p.name,
      formats: { png: { url: p.url, size: 12 } },
      metadata: { createdAt: '2026-01-01', updatedAt: '2026-01-01', version: 1 },
    })),
  } as unknown as Brand;
}

const BRAND = brandWithPhotos();

/** The MockBrand the kit renders — `mapPhotos`'s own projection of the above. */
function mock(): MockBrand {
  const m = brandToMockBrand(BRAND);
  return {
    ...m,
    photos: PHOTOS.map((p, i) => ({ id: p.id, src: p.url, slot: 'ABCDEF'[i] })),
  } as MockBrand;
}

beforeEach(() => {
  resetPhotoSourceCache();
  localStorage.removeItem('brandos:brand-kit:photos');
  uploaded.mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.removeItem('brandos:brand-kit:photos');
});

function mount(overrides: Partial<React.ComponentProps<typeof PhotosEditor>> = {}) {
  const onBrandChange = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <PhotosEditor
      open
      onClose={onClose}
      brand={mock()}
      sourceBrand={BRAND}
      onBrandChange={onBrandChange}
      {...overrides}
    />,
  );
  return { ...view, onBrandChange, onClose };
}

/** Walk the confirmation open and press through it. */
function confirm() {
  fireEvent.click(screen.getByRole('button', { name: 'Save photography' }));
  const dialog = screen.getByRole('alertdialog');
  return {
    dialog,
    go: () => fireEvent.click(within(dialog).getByRole('button', { name: 'Change the photography' })),
  };
}

const rowThumb = (index: number) =>
  screen.getAllByRole('listitem')[index]!.querySelector('img') as HTMLImageElement;

describe('PhotosEditor', () => {
  it('lists the brand\'s own Library images — never a slot, never stock (D14)', () => {
    mount();
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(PHOTOS.length);
    for (const p of PHOTOS) expect(screen.getByDisplayValue(p.name)).toBeTruthy();
    // The defect's vocabulary is gone: no slots to fill.
    expect(document.body.textContent).not.toMatch(/Slot [A-F]/);
  });

  it('says plainly when the brand has no photographs at all', () => {
    mount({ brand: { ...mock(), photos: [] }, sourceBrand: { ...BRAND, brandAssets: [] } as Brand });
    expect(screen.getByTestId('photos-editor-empty').textContent).toContain('no photographs yet');
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('the default treatment repaints every thumbnail — the ramp, not a label (D10)', async () => {
    mount();
    expect(getComputedStyle(rowThumb(0)).filter).toBe('none');

    fireEvent.click(screen.getByRole('radio', { name: 'Greyscale' }));

    await waitFor(() => {
      expect(getComputedStyle(rowThumb(0)).filter).toContain('grayscale');
      expect(getComputedStyle(rowThumb(2)).filter).toContain('grayscale');
    });
  });

  it('a per-photo treatment overrides the default, and only for that photo', async () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Duotone for Street at dusk' }));

    await waitFor(() => {
      // Two blended overlays are what a duotone IS — the shadow floor and the
      // highlight ceiling — and they are on the second row only.
      const rows = screen.getAllByRole('listitem');
      expect(rows[1]!.querySelectorAll('.bka-photos-thumb-overlay')).toHaveLength(2);
      expect(rows[0]!.querySelectorAll('.bka-photos-thumb-overlay')).toHaveLength(0);
    });
  });

  it('the overlays are the brand\'s own colours, not a chrome grey', async () => {
    mount();
    fireEvent.click(screen.getByRole('radio', { name: 'Duotone' }));
    await waitFor(() => {
      const overlays = screen
        .getAllByRole('listitem')[0]!
        .querySelectorAll('.bka-photos-thumb-overlay');
      expect(overlays).toHaveLength(2);
      const shadow = getComputedStyle(overlays[0] as HTMLElement).backgroundColor;
      const highlight = getComputedStyle(overlays[1] as HTMLElement).backgroundColor;
      expect(shadow).not.toBe(highlight);
      expect(shadow).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  it('reordering reaches the page behind the panel', async () => {
    const { onBrandChange } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Move Desk detail up' }));
    await waitFor(() => {
      const last = onBrandChange.mock.calls.at(-1)?.[0] as MockBrand;
      expect(last.photos.map((p) => p.id)).toEqual(['photo-studio', 'photo-desk', 'photo-street']);
    });
  });

  it('removing a photo takes it off the card and leaves the file alone', async () => {
    const { onBrandChange } = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Studio portrait from the card' }));

    await waitFor(() => {
      const last = onBrandChange.mock.calls.at(-1)?.[0] as MockBrand;
      expect(last.photos.map((p) => p.id)).toEqual(['photo-street', 'photo-desk']);
    });
    // Still a row, still in the Library — set aside, not deleted.
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Show Studio portrait on the card' })).toBeTruthy();

    const { dialog } = confirm();
    expect(dialog.textContent).toContain('the file stays in your Library');
  });

  it('Save is dead until something has actually changed', () => {
    mount();
    const save = screen.getByRole('button', { name: 'Save photography' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'Greyscale' }));
    expect((screen.getByRole('button', { name: 'Save photography' }) as HTMLButtonElement).disabled).toBe(
      false,
    );
  });

  it('the confirmation names every change before any of it happens', () => {
    mount();
    fireEvent.change(screen.getByLabelText('Art direction'), {
      target: { value: 'Daylight only. No stock.' },
    });
    fireEvent.click(screen.getByRole('radio', { name: 'Brand tint' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Desk detail from the card' }));

    const { dialog } = confirm();
    const items = within(dialog).getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(items.some((t) => t.includes('Write the art direction'))).toBe(true);
    expect(items.some((t) => t.includes('Brand tint'))).toBe(true);
    expect(items.some((t) => t.includes('Remove Desk detail'))).toBe(true);
    // Nothing is written while the question is still open.
    expect(readPhotoDirection(BRAND.id).note).toBe('');
  });

  it('confirming writes the arrangement, and the kit reads back exactly that', async () => {
    const { onClose } = mount();
    fireEvent.change(screen.getByLabelText('Art direction'), { target: { value: 'Daylight only.' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Greyscale' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Duotone for Street at dusk' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Desk detail from the card' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Street at dusk up' }));

    confirm().go();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(readPhotoDirection(BRAND.id)).toEqual({
      note: 'Daylight only.',
      defaultTreatment: 'mono',
      treatments: { 'photo-street': 'duotone' },
      order: ['photo-street', 'photo-studio', 'photo-desk'],
      hidden: ['photo-desk'],
    });
  });

  it('an upload becomes a Library asset, and the order names the id the Library returned', async () => {
    mount();
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], 'rooftop.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('stub-file'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(4));
    expect(screen.getByDisplayValue('rooftop')).toBeTruthy();
    expect(document.body.textContent).toContain('Not in the Library yet');

    const { dialog } = confirm();
    expect(dialog.textContent).toContain("Add rooftop to this brand's Library");
    fireEvent.click(within(dialog).getByRole('button', { name: 'Change the photography' }));

    await waitFor(() => expect(uploaded).toHaveBeenCalledWith('rooftop.jpg'));
    await waitFor(() => {
      // Never the provisional `pending:` id — the Library owns identity.
      expect(readPhotoDirection(BRAND.id).order).toContain('asset-from-library');
      expect(readPhotoDirection(BRAND.id).order.some((id) => id.startsWith('pending:'))).toBe(false);
    });
  });

  it('a source already measured as broken is shown as missing, not as a photograph (D1)', () => {
    markPhotoSourceBroken(PHOTOS[0]!.url);
    mount();
    const first = screen.getAllByRole('listitem')[0]!;
    expect(first.querySelector('img')).toBeNull();
    expect(first.textContent).toContain('This file is missing');
  });

  it('warns when the card would end up showing nothing', async () => {
    mount();
    for (const p of PHOTOS) {
      fireEvent.click(screen.getByRole('button', { name: `Remove ${p.name} from the card` }));
    }
    await waitFor(() => {
      expect(document.body.textContent).toContain('the Photos section will read as empty');
    });
  });
});
