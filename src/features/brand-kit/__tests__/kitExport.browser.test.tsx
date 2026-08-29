/**
 * A real kit export, in a real browser.
 *
 * jsdom cannot answer the question that matters here. The logo bug that
 * prompted this work — every `logos/*.png` a blank tile — was invisible to
 * every layer except a browser actually rasterizing an SVG, and the fix
 * (ship the referenced bytes instead of the wrapper) is only provably
 * right if something reads the zip back and looks at what is inside it.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { BrandKitCosmosPage } from '../BrandKitCosmosPage';
// The real stylesheet, because the snapshot host is STYLED. An offscreen
// mount that misses `.bk-snapshot-host` lays every renderer out at 0×0 and
// the export succeeds with a zip full of empty pictures — which is how the
// last round of this shipped.
import '../brand-kit.css';
import { mockBrand, type MockBrand } from '@/features/setup/data/mockBrand';
import { SEED_BRANDS } from '@/data/brands';
import { getEntryFor, visibleEntries } from '../catalog/catalog';
import { buildKitZipBlob, downloadEntry } from '../data/exportEverything';
import { isCancelled } from '../data/exportScheduler';

/** A tiny but genuine SVG, inlined so the export has real bytes to fetch. */
const REAL_LOGO_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
  '<title>acme-real-artwork</title><circle cx="20" cy="20" r="18" fill="#E8542F"/></svg>';
const REAL_LOGO_URL = `data:image/svg+xml;base64,${btoa(REAL_LOGO_SVG)}`;

/** What Setup hands the Brand Kit: a PREVIEW wrapping the artwork's URL. */
const previewWrapper = (href: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">` +
  `<rect width="200" height="200" fill="#F5F4EF"/>` +
  `<image href="${href}" x="20" y="20" width="160" height="160"/></svg>`;

const brand: MockBrand = {
  ...mockBrand,
  name: 'Acme Export',
  logos: [
    { id: 'primary', label: 'Primary', variant: 'light', role: 'primary', svg: previewWrapper(REAL_LOGO_URL) },
  ],
};

const sourceBrand = SEED_BRANDS[0];

const LOGOS = getEntryFor('brand-assets', 'Logos')!;
const COLORS = getEntryFor('brand-assets', 'Colors')!;
const BUSINESS_CARD = getEntryFor('stationery', 'Business Card')!;
const SOCIAL_SYSTEM = getEntryFor('social', 'Social Media System')!;

async function readZip(blob: Blob) {
  const { default: JSZip } = await import('jszip');
  return JSZip.loadAsync(await blob.arrayBuffer());
}

describe('the kit export, end to end', () => {
  it('ships the logo itself, not the preview that points at it', async () => {
    const { blob, added, skipped } = await buildKitZipBlob({ brand, sourceBrand, entries: [LOGOS] });
    expect(added).toBe(1);
    expect(skipped).toEqual([]);

    const zip = await readZip(blob);
    const file = zip.file('logos/primary.svg');
    expect(file, 'the logo lands under its own name and true extension').toBeTruthy();

    const text = await file!.async('string');
    // The whole point: what is in the zip is the ARTWORK.
    expect(text).toContain('acme-real-artwork');
    // And not the wrapper, which would resolve to nothing on the
    // recipient's machine and rasterize to a blank tile here.
    expect(text).not.toContain('<image');
  }, 30_000);

  it('rasterizes a deliverable into something a person could open', async () => {
    const { blob } = await buildKitZipBlob({ brand, sourceBrand, entries: [BUSINESS_CARD] });
    const zip = await readZip(blob);
    const card = zip.file('deliverables/business-card.png');
    expect(card, 'the business card is IN the brand kit').toBeTruthy();

    const bytes = await card!.async('uint8array');
    // A PNG signature, and enough of them that this is a picture rather
    // than an empty canvas that happened to encode.
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(bytes.byteLength).toBeGreaterThan(2000);
    // AND the card's own shape. A business card is 1.6:1; the export once
    // came out 1040×3600 because the snapshot host inherited the
    // workspace's `min-height: 100vh` — the artwork was a thin band in a
    // viewport-tall canvas and every deliverable in the kit shipped that way.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    expect(width).toBe(1040);
    expect(Math.abs(width / height - 1.6)).toBeLessThan(0.05);
  }, 60_000);

  it('STOREs the raster and DEFLATEs the text', async () => {
    // Re-compressing a PNG is where an export spends its main-thread
    // time for nothing, and that time is the freeze the user feels.
    //
    // Asserted on the RESULT rather than on the flag we passed: after a
    // round trip through the archive, a stored entry's compressed size
    // equals its uncompressed size and a deflated one's does not. That
    // is true of the bytes on disk however the option was spelled.
    const { blob } = await buildKitZipBlob({ brand, sourceBrand, entries: [BUSINESS_CARD] });
    const zip = await readZip(blob);
    const sizes = (path: string) => {
      const entry = zip.file(path) as unknown as {
        _data: { compressedSize: number; uncompressedSize: number };
      };
      expect(entry, `${path} is in the zip`).toBeTruthy();
      return entry._data;
    };
    const png = sizes('deliverables/business-card.png');
    expect(png.compressedSize).toBe(png.uncompressedSize);
    const json = sizes('brand.json');
    expect(json.compressedSize).toBeLessThan(json.uncompressedSize);
  }, 60_000);

  it('captures a composed system as a whole page, not cropped to a card', async () => {
    // The systems are documents: they size themselves to a column and end
    // where their content ends. Forcing them into a card's aspect crops
    // the bottom off, and forcing a `height: 100%` child into an
    // auto-height host collapses them to nothing.
    const { blob, added, skipped } = await buildKitZipBlob({
      brand,
      sourceBrand,
      entries: [SOCIAL_SYSTEM],
    });
    expect(skipped).toEqual([]);
    expect(added).toBe(1);
    const zip = await readZip(blob);
    const file = zip.file('deliverables/social-media-system.png');
    expect(file).toBeTruthy();
    const bytes = await file!.async('uint8array');
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    // A tall page, not a 260px tile — read straight out of the PNG's own
    // IHDR so this cannot pass on an image that merely encoded.
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    expect(width).toBeGreaterThan(1000);
    expect(height).toBeGreaterThan(width / 2);
    // An UPPER bound as well, and it is the load-bearing half.
    //
    // Nearly every rule these views depend on is `[data-workspace] .bk-…`,
    // so a host mounted outside that wrapper silently loses all of them,
    // reflows as a column of unstyled text, and captures at ~7× its width.
    // The first version of this test asserted only a lower bound and
    // passed happily on exactly that picture.
    expect(height).toBeLessThan(width * 3);
  }, 90_000);

  it('exports EVERYTHING the kit shows — the whole point of the button', async () => {
    // The claim the owner made: "export everything in Brand Kit". Before
    // this the button shipped colours, fonts, logos and a README, and not
    // one of the things the brand had been applied to.
    const entries = visibleEntries({ isDev: false, isAdmin: false });
    const { blob, added } = await buildKitZipBlob({ brand, sourceBrand, entries });
    const zip = await readZip(blob);
    const paths = Object.keys(zip.files).filter((p) => !zip.files[p].dir);

    expect(paths).toContain('brand.json');
    expect(paths).toContain('about.md');
    expect(paths.some((p) => p.startsWith('logos/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('colors/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('fonts/'))).toBe(true);

    // Every application, system and board this viewer can see.
    for (const name of [
      'business-card', 'letterhead', 'invoice', 'email-signature',
      'social-media-system', 'presentation-system', 'brand-board',
    ]) {
      expect(paths, `${name} is missing from the kit`).toContain(`deliverables/${name}.png`);
    }
    expect(added).toBeGreaterThan(8);
  }, 180_000);

  it('writes the strategy as a real document, not only as data', async () => {
    // "Export everything" that leaves out what the brand IS has exported
    // the packaging. Three files, because the strategy is read three
    // ways: as notes, as a document you send, and as data.
    const STRATEGY = getEntryFor('brand-assets', 'About')!;
    const { blob } = await buildKitZipBlob({ brand, sourceBrand, entries: [STRATEGY] });
    const zip = await readZip(blob);

    const md = await zip.file('strategy.md')!.async('string');
    expect(md).toContain(brand.name);

    const pdf = zip.file('strategy.pdf');
    expect(pdf, 'a designed PDF, not just markdown').toBeTruthy();
    const bytes = await pdf!.async('uint8array');
    const head = String.fromCharCode(...bytes.slice(0, 5));
    expect(head).toBe('%PDF-');
    // More than a cover: the answers, the palette and the specimen each
    // get their own page.
    const text = new TextDecoder('latin1').decode(bytes);
    const pages = (text.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pages).toBeGreaterThan(1);
  }, 90_000);

  it('downloads every card the kit shows — including the composed views', async () => {
    // Social Media System, Presentation System and Brand Board have no
    // template library, so the card's Download used to answer "Nothing to
    // export" for three things the Export Kit shipped happily. A card and
    // the kit now run the same writer, so they cannot disagree.
    const saved: Blob[] = [];
    const spy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {});
    const created = vi.spyOn(URL, 'createObjectURL');
    try {
      for (const entry of visibleEntries({ isDev: false, isAdmin: false })) {
        created.mockClear();
        const result = await downloadEntry(entry, {
          brand,
          sourceBrand,
          entries: [entry],
        });
        // Photos is the one honest empty: this brand has none.
        if (entry.storageLabel === 'Photos') continue;
        expect(result.added, `${entry.label} produced nothing to download`).toBe(true);
        expect(created, `${entry.label} never handed the browser a file`).toHaveBeenCalled();
        saved.push(new Blob());
      }
    } finally {
      spy.mockRestore();
      created.mockRestore();
    }
    expect(saved.length).toBeGreaterThan(8);
  }, 180_000);

  it('can ship EVERY variant a card shows, not one of them', async () => {
    const CARD = getEntryFor('stationery', 'Business Card')!;
    const one = await buildKitZipBlob({ brand, sourceBrand, entries: [CARD] });
    const all = await buildKitZipBlob({ brand, sourceBrand, entries: [CARD], allVariants: true });
    const paths = async (blob: Blob) => {
      const zip = await readZip(blob);
      return Object.keys(zip.files).filter((p) => !zip.files[p].dir && p.endsWith('.png'));
    };
    const onePaths = await paths(one.blob);
    const allPaths = await paths(all.blob);
    expect(onePaths).toEqual(['deliverables/business-card.png']);
    // Three featured designs, filed under the card rather than loose.
    expect(allPaths.length).toBeGreaterThan(1);
    expect(allPaths.every((p) => p.startsWith('deliverables/business-card/'))).toBe(true);
  }, 180_000);

  it('reports what it could not include instead of shipping a blank', async () => {
    const broken: MockBrand = {
      ...brand,
      logos: [
        { id: 'primary', label: 'Primary', variant: 'light', role: 'primary',
          svg: previewWrapper('https://127.0.0.1:9/does-not-exist.svg') },
      ],
    };
    const { skipped } = await buildKitZipBlob({ brand: broken, sourceBrand, entries: [LOGOS] });
    expect(skipped.length).toBeGreaterThan(0);
    expect(skipped[0].label).toContain('Primary');
    expect(skipped[0].reason).toBeTruthy();
  }, 30_000);

  it('names the unit it is working on, and counts the ones the user asked for', async () => {
    const seen: string[] = [];
    await buildKitZipBlob({
      brand,
      sourceBrand,
      entries: [LOGOS, COLORS],
      onProgress: (p) => {
        if (p.phase === 'collecting') seen.push(`${p.label} ${p.done + 1}/${p.total}`);
      },
    });
    expect(seen).toEqual(['Logos 1/2', 'Colors 2/2']);
  }, 60_000);

  it('stops when the user cancels', async () => {
    const controller = new AbortController();
    const running = buildKitZipBlob({
      brand,
      sourceBrand,
      entries: [LOGOS, COLORS, BUSINESS_CARD],
      signal: controller.signal,
      onProgress: () => controller.abort(),
    });
    await expect(running).rejects.toSatisfy(isCancelled);
  }, 60_000);
});

/**
 * The button, in the page.
 *
 * The walker being right is half the claim; the other half is that the
 * Brand Kit's own Export button reaches it, says what it is doing, and
 * can be stopped. A dead button that used to ship four folders is exactly
 * how this shipped last time.
 */
describe('Export kit, from the Brand Kit itself', () => {
  afterEach(() => {
    cleanup();
    toast.dismiss();
  });

  it('names the unit it is on and honours Cancel', async () => {
    render(
      <MemoryRouter>
        <Toaster />
        <BrandKitCosmosPage brand={brand} sourceBrand={sourceBrand} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /export kit/i }));

    // The button ASKS first. Everything is ticked, so the default is still
    // the whole kit — the sheet is there to take less, not to add a step
    // to taking it all.
    await screen.findByText('Choose what to export');
    expect(screen.getByRole('button', { name: /essentials only/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^Export everything$/ }));

    // The progress toast names the FIRST unit and the total — the count
    // of things this viewer can see, not a spinner with no end in sight.
    const progress = await screen.findByText(/Logos — 1 of \d+/, undefined, { timeout: 10_000 });
    expect(progress).toBeTruthy();
    expect(screen.getByRole('button', { name: /export kit|exporting/i })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await screen.findByText('Export cancelled', undefined, { timeout: 10_000 });

    // And the page is usable again.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /export kit/i })).not.toBeDisabled(),
    );
  }, 60_000);

  it('exports only what was ticked', async () => {
    render(
      <MemoryRouter>
        <Toaster />
        <BrandKitCosmosPage brand={brand} sourceBrand={sourceBrand} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /export kit/i }));
    await screen.findByText('Choose what to export');

    fireEvent.click(screen.getByRole('button', { name: /essentials only/i }));
    // The brand's own material: Logos · Colors · Typography · Icons ·
    // Photos · Strategy. The deliverables are left behind.
    const go = await screen.findByRole('button', { name: /^Export 6 items$/ });
    fireEvent.click(go);

    // It starts on Logos and never reaches a deliverable, because none
    // were asked for.
    await screen.findByText(/Logos — 1 of 6/, undefined, { timeout: 10_000 });
  }, 60_000);
});
