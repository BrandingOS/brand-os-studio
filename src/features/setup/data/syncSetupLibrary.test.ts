/**
 * Setup → Library sync.
 *
 * The behaviour that matters is what it does NOT do: it must never re-create
 * something the user deleted. Setup slots keep rendering a url after the
 * Library item behind it is tombstoned, so every entry needs a key that still
 * matches once deletion has cleared the url.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAssetsService } from '@/core/adapters/database/LocalAssetsService';
import type { MockBrand } from './mockBrand';
import { syncSetupLibrary } from './syncSetupLibrary';

const BRAND = 'brand_a';

function mock(over: Partial<MockBrand> = {}): MockBrand {
  return { photos: [], icons: [], ...over } as MockBrand;
}

let svc: LocalAssetsService;
beforeEach(() => {
  localStorage.clear();
  svc = new LocalAssetsService();
});

describe('creation', () => {
  it('creates photos and icons that are not in the Library yet', async () => {
    const out = await syncSetupLibrary(
      BRAND,
      mock({
        photos: [{ id: 'p1', slot: 'A', src: 'https://cdn.test/hero.jpg' }],
        icons: ['https://cdn.test/icon.svg'],
      }),
      svc,
    );
    expect(out).toEqual({ createdPhotos: 1, createdIcons: 1 });
    expect(await svc.listLibrary(BRAND)).toHaveLength(2);
  });

  it('is idempotent — a second save creates nothing', async () => {
    const m = mock({
      photos: [{ id: 'p1', slot: 'A', src: 'https://cdn.test/hero.jpg' }],
      icons: ['https://cdn.test/icon.svg'],
    });
    await syncSetupLibrary(BRAND, m, svc);
    expect(await syncSetupLibrary(BRAND, m, svc)).toEqual({ createdPhotos: 0, createdIcons: 0 });
  });
});

describe('CodeRabbit Round 2 #12 — a deleted item stays deleted', () => {
  it('does not re-create a deleted PHOTO whose slot still holds the url', async () => {
    const m = mock({
      photos: [{ id: 'p1', slot: 'A', src: 'https://cdn.test/hero.jpg' }],
    });
    await syncSetupLibrary(BRAND, m, svc);

    const [item] = await svc.listLibrary(BRAND);
    await svc.softDelete(item.id);

    expect(await syncSetupLibrary(BRAND, m, svc)).toEqual({ createdPhotos: 0, createdIcons: 0 });
  });

  it('does not re-create a deleted ICON either', async () => {
    // The finding: icons were created with no `metadata.originalName`, so once
    // deletion cleared the url there was nothing left to match on and the next
    // Setup save silently resurrected the icon the user had removed.
    const m = mock({ icons: ['https://cdn.test/icon.svg'] });
    await syncSetupLibrary(BRAND, m, svc);

    const [item] = await svc.listLibrary(BRAND);
    expect(item.metadata?.originalName).toBeTruthy();
    await svc.softDelete(item.id);

    expect(await syncSetupLibrary(BRAND, m, svc)).toEqual({ createdPhotos: 0, createdIcons: 0 });
    // Nothing came back.
    expect(await svc.listLibrary(BRAND)).toHaveLength(0);
  });

  it('the icon key is position-independent, so reordering does not resurrect one', async () => {
    const a = 'https://cdn.test/a.svg';
    const b = 'https://cdn.test/b.svg';
    await syncSetupLibrary(BRAND, mock({ icons: [a, b] }), svc);

    const items = await svc.listLibrary(BRAND);
    const first = items.find((i) => i.url === a)!;
    await svc.softDelete(first.id);

    // Same icons, opposite order.
    const out = await syncSetupLibrary(BRAND, mock({ icons: [b, a] }), svc);
    expect(out.createdIcons).toBe(0);
  });
});

describe('CodeRabbit Round 4 #14 — the key identifies the image, not the slot', () => {
  it('a DIFFERENT image in a slot whose old photo was deleted is still created', () => {
    // The failure this locks out: keying on the slot meant the tombstone for
    // the old photo matched the new one, so the new photo was never created —
    // and the next hydration dropped it from Setup, because Setup reads photos
    // back out of the projection. The user's work disappeared.
    return (async () => {
      const slotA = (src: string) =>
        mock({ photos: [{ id: 'p1', slot: 'A', src }] });

      await syncSetupLibrary(BRAND, slotA('https://cdn.test/first.jpg'), svc);
      const [first] = await svc.listLibrary(BRAND);
      await svc.softDelete(first.id);

      const out = await syncSetupLibrary(BRAND, slotA('https://cdn.test/second.jpg'), svc);

      expect(out.createdPhotos).toBe(1);
      const live = await svc.listLibrary(BRAND);
      expect(live).toHaveLength(1);
      expect(live[0].url).toBe('https://cdn.test/second.jpg');
    })();
  });

  it('the SAME image returning to that slot is still recognised as deleted', async () => {
    const m = mock({ photos: [{ id: 'p1', slot: 'A', src: 'https://cdn.test/first.jpg' }] });
    await syncSetupLibrary(BRAND, m, svc);
    const [first] = await svc.listLibrary(BRAND);
    await svc.softDelete(first.id);

    expect(await syncSetupLibrary(BRAND, m, svc)).toEqual({ createdPhotos: 0, createdIcons: 0 });
  });

  it('moving a photo to another slot does not duplicate it', async () => {
    const src = 'https://cdn.test/one.jpg';
    await syncSetupLibrary(BRAND, mock({ photos: [{ id: 'p1', slot: 'A', src }] }), svc);
    const out = await syncSetupLibrary(BRAND, mock({ photos: [{ id: 'p1', slot: 'C', src }] }), svc);
    expect(out.createdPhotos).toBe(0);
    expect(await svc.listLibrary(BRAND)).toHaveLength(1);
  });
});
