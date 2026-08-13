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
