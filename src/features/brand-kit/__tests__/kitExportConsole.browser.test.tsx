/**
 * THE WHOLE KIT, EXPORTED, WITH THE CONSOLE READ.
 *
 * QA D48: every "Export everything" logged 4 × "Maximum update depth exceeded"
 * on raqm and 6 on skam. A React update loop is not cosmetic — it burns the
 * main thread for the whole 33-second render and any one of those components
 * could have been the one that stopped producing artwork.
 *
 * `presentations.export.browser.test.tsx` already reads the console over five
 * entries; the loop is not in those five, which is exactly why this suite
 * exists over the WHOLE catalog. The pattern is deliberately identical: turn
 * the act environment off (an offscreen mount is production code driving its
 * own root, and React's act warning would drown the signal), spy on `error`
 * and `warn`, and assert emptiness — with a byte check so a silent export of
 * nothing cannot pass.
 */
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { page } from '@vitest/browser/context';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
// The real stylesheets: an offscreen mount that misses `.bk-snapshot-host`
// lays every renderer out at 0×0 and exports a zip of empty pictures.
import '@/index.css';
import '../brand-kit.css';
import { SEED_BRANDS } from '@/data/brands';
import { migrateBrandToCurrent } from '@/shared/brand/migrateSchema';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { visibleEntries } from '../catalog/catalog';
import { buildKitZipBlob } from '../data/exportEverything';
import { resetRenderEnvironment } from '../data/templateSnapshot';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';

vi.mock('@/shared/assets/useAssetUpload', () => ({
  useAssetUpload: () => ({ uploading: false, upload: () => Promise.resolve(null) }),
}));
vi.mock('@/shared/upload/AssetSourcePopover', () => ({
  AssetSourcePopover: ({ trigger }: { trigger: React.ReactNode }) => <>{trigger}</>,
}));

const SOURCE = migrateBrandToCurrent(SEED_BRANDS[0]!);
const KIT_BRAND = brandToMockBrand(SOURCE);

type Recorder = { errors: string[]; warnings: string[]; restore: () => void };
type ActFlagHost = { IS_REACT_ACT_ENVIRONMENT?: boolean };

function recordConsole(): Recorder {
  const errors: string[] = [];
  const warnings: string[] = [];
  const host = globalThis as ActFlagHost;
  const wasActEnvironment = host.IS_REACT_ACT_ENVIRONMENT;
  host.IS_REACT_ACT_ENVIRONMENT = false;
  const error = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  });
  const warn = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
  });
  return {
    errors,
    warnings,
    restore: () => {
      error.mockRestore();
      warn.mockRestore();
      host.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
    },
  };
}

beforeEach(() => resetRenderEnvironment());
afterEach(cleanup);

describe('exporting the whole kit', () => {
  it('says nothing to the console — no update loop, no key warning', async () => {
    // Everything an admin can see, which is what "Export everything" walks.
    const entries = visibleEntries({ isDev: true, isAdmin: true });
    expect(entries.length).toBeGreaterThan(30);

    const recorder = recordConsole();
    let result: Awaited<ReturnType<typeof buildKitZipBlob>>;
    try {
      result = await buildKitZipBlob({ brand: KIT_BRAND, sourceBrand: SOURCE, entries });
    } finally {
      recorder.restore();
    }

    // A real archive came out — a silent export of nothing would pass a
    // console assertion perfectly.
    expect(result.added).toBeGreaterThan(25);
    expect(result.blob.size).toBeGreaterThan(200_000);

    const noise = [...recorder.errors, ...recorder.warnings];
    expect(noise.filter((m) => /Maximum update depth/i.test(m))).toEqual([]);
    expect(noise.filter((m) => /unique "key"|Each child in a list/i.test(m))).toEqual([]);
    expect(noise.join('\n')).toBe('');
  }, 240000);
});

/**
 * THE SAME EXPORT, FROM THE PAGE THE USER IS LOOKING AT.
 *
 * `buildKitZipBlob` on its own is quiet, which is exactly why the loop was
 * never caught: the noise comes from the LIVE page, which stays mounted and
 * keeps measuring itself for the whole 33 seconds while the export mounts
 * dozens of offscreen roots and injects web fonts under it.
 *
 * This is also D47's claim — after the wait, the user is TOLD.
 */
describe('exporting from the Brand Kit page', () => {
  afterEach(() => {
    cleanup();
    toast.dismiss();
  });

  it('runs to completion with a clean console, and says so when it is done', async () => {
    await page.viewport(1440, 900);
    render(
      <MemoryRouter>
        <Toaster />
        <BrandKitCosmosPage brand={KIT_BRAND} sourceBrand={SOURCE} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /export kit/i }));
    await screen.findByText('Choose what to export');
    // Essentials, not the whole catalog: the claim is about the page under
    // the export, not about how long the export is, and six units exercise
    // every mechanism (offscreen roots, font injection, progress toasts).
    fireEvent.click(screen.getByRole('button', { name: /essentials only/i }));

    const recorder = recordConsole();
    try {
      fireEvent.click(await screen.findByRole('button', { name: /^Export 6 items$/ }));
      // The completion the user reads — in the picker they were looking at,
      // not only in a corner toast that has already faded. D47: the dialog
      // closed on the click and the file arrived with nothing said at all.
      await waitFor(
        () => expect(document.body.textContent).toMatch(/Saved .*\.zip/),
        { timeout: 120_000 },
      );
      // …and the picker offers the one thing there is left to do.
      expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy();
    } finally {
      recorder.restore();
    }

    const noise = [...recorder.errors, ...recorder.warnings];
    expect(noise.filter((m) => /Maximum update depth/i.test(m))).toEqual([]);
    expect(noise.filter((m) => /unique "key"|Each child in a list/i.test(m))).toEqual([]);
    expect(noise.join('\n')).toBe('');
  }, 180_000);
});
