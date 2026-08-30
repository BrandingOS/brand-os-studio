/**
 * One payload, four doors.
 *
 * `.audit/OURS.md` D28 measured the same word meaning two different things —
 * the drilldown's header ⬇ gave twenty PNGs and no SVG, the card ⬇ gave three
 * SVGs and no PNG — and D29 measured a third: the Export Kit's `logos/` held
 * the three originals and nothing else. Three surfaces, three answers, one
 * noun.
 *
 * `data/logoExport.ts` decides the bytes and `addLogosToZip` is the only door
 * to them. That is easy to write down and easy to lose, because each surface
 * has its own reason to reach for a shortcut. So this file does not assert
 * that the code is wired that way — it RUNS all four surfaces and compares
 * the archives they produce, file for file.
 *
 * The renderer and the PDF writer are stubbed because jsdom has no image
 * decoder: an `<img>` there never loads and never errors, so a real rasterize
 * would sit on `LOGO_STEP_TIMEOUT_MS` per size per variant. Everything the
 * test is about — which files, under which names, from which builder — is
 * upstream of the stubs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { mockBrand } from '@/features/setup/data/mockBrand';
import type { ZipFolder } from './zipFile';

/* ─── Bytes without a decoder ─────────────────────────────────────── */

const CRC = new Uint8Array([0, 0, 0, 0]);

/** A PNG whose IHDR really carries `w × h`. */
function fakePng(w: number, h: number): string {
  const be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const bytes = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ...be(13),
    0x49, 0x48, 0x44, 0x52,
    ...be(w), ...be(h),
    8, 6, 0, 0, 0,
    ...CRC,
    ...be(0),
    0x49, 0x45, 0x4e, 0x44,
    ...CRC,
  ]);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/png;base64,${btoa(bin)}`;
}

vi.mock('@/shared/brand/rasterizeLogo', () => ({
  rasterizeLogo: async (_url: string, opts: { size: number }) => fakePng(opts.size, opts.size),
}));

vi.mock('jspdf', () => ({
  jsPDF: class {
    addImage() {}
    output() {
      return new Blob(['%PDF-1.4 stub'], { type: 'application/pdf' });
    }
  },
}));

/** The download itself is a DOM side effect. Captured, not performed. */
const downloads: Array<{ blob: Blob; name: string }> = [];
vi.mock('./colorPaletteExport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./colorPaletteExport')>()),
  triggerBlobDownload: (blob: Blob, name: string) => {
    downloads.push({ blob, name });
  },
  // The whole-kit zip builds `colors/` on the way past. It rasterises through
  // an `<img>` and an object URL, neither of which jsdom has; the swatches
  // are another family's subject and are stubbed rather than skipped, so the
  // kit bundle here is the real one minus its pictures.
  rasterizeSvg: async () => ({ png: null, jpg: null }),
  buildAiBlob: async () => null,
}));

/* ─── A brand shaped like a real one ──────────────────────────────── */

const wrapped = (href: string, bg: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">` +
  `<rect width="200" height="200" fill="${bg}"/>` +
  `<image href="${href}" x="20" y="20" width="160" height="160"/></svg>`;

/** Inline vectors, so the source file needs no fetch — the point here is the
 *  FILE LIST each surface writes, not the network. */
const inlineSvg = (fill: string) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">` +
  `<rect width="100" height="100" fill="#F5F4EF"/><circle cx="50" cy="50" r="40" fill="${fill}"/></svg>`;

function brand(over: Partial<MockBrand> = {}): MockBrand {
  return {
    ...mockBrand,
    name: 'Raqm',
    colors: {
      core: [
        { hex: '#7231FF', name: 'Violet' },
        { hex: '#0A0A0F', name: 'Ink' },
      ],
      accent: [{ hex: '#00D4AA', name: 'Turquoise' }],
      grey: [],
    },
    fonts: [],
    icons: [],
    photos: [],
    logos: [
      { id: 'primary', label: 'Primary', variant: 'light', role: 'primary', svg: inlineSvg('#7231FF') },
      { id: 'on-dark', label: 'On dark', variant: 'dark', role: 'mono.white', svg: inlineSvg('#FFFFFF') },
    ],
    ...over,
  } as MockBrand;
}

/** Every non-directory entry, sorted — an archive compared as a set of paths. */
async function namesIn(zip: JSZip, prefix = ''): Promise<string[]> {
  return Object.keys(zip.files)
    .filter((n) => !zip.files[n].dir && n.startsWith(prefix))
    .map((n) => n.slice(prefix.length))
    .sort();
}

async function readZip(blob: Blob): Promise<JSZip> {
  return new JSZip().loadAsync(await blobBytes(blob));
}

/** jsdom's Blob has neither `arrayBuffer` nor `text`; JSZip reads one either
 *  way, and it is what consumes these blobs in production. */
function blobBytes(blob: Blob): Promise<Uint8Array> {
  return new JSZip().file('x', blob).file('x')!.async('uint8array');
}

beforeEach(() => {
  downloads.length = 0;
});

describe('the logo payload is the same through every door', () => {
  it('the builder, the card ⬇, the Export Kit and the catalog walk all write one file list', async () => {
    const b = brand();
    const { buildLogoFiles } = await import('./logoExport');
    const { addLogosToZip, downloadLogosZip, downloadKitZip } = await import('./kitExport');
    const { writeUnit } = await import('./exportEverything');

    // 0 — what the builder decided.
    const expected = (await buildLogoFiles(b)).files.map((f) => f.path).sort();
    expect(expected.length).toBeGreaterThan(6);
    // Both halves of D28 in one list: the source vectors AND the rasters.
    expect(expected).toContain('README.md');
    expect(expected.some((p) => p.endsWith('.svg'))).toBe(true);
    expect(expected.some((p) => p.endsWith('.png'))).toBe(true);
    expect(expected.some((p) => p.endsWith('.pdf'))).toBe(true);

    // 1 — the one door.
    const direct = new JSZip();
    await addLogosToZip(direct as unknown as ZipFolder, b);
    expect(await namesIn(direct)).toEqual(expected);

    // 2 — the card ⬇ / the drilldown header ⬇ (both call this by name).
    const count = await downloadLogosZip(b);
    expect(count).toBe(2);
    expect(downloads).toHaveLength(1);
    expect(downloads[0].name).toBe('raqm-logos.zip');
    expect(await namesIn(await readZip(downloads[0].blob))).toEqual(expected);

    // 3 — the Export Kit's assets bundle.
    downloads.length = 0;
    await downloadKitZip(b);
    const kit = await readZip(downloads[0].blob);
    expect(await namesIn(kit, 'logos/')).toEqual(expected);

    // 4 — the catalog-wide walk, which reaches the same folder builder.
    const wide = new JSZip();
    const skipped: Array<{ label: string; reason: string }> = [];
    const wrote = await writeUnit(
      {
        kind: 'logos',
        label: 'Logos',
        path: 'logos',
        entry: { sectionKey: 'brand-assets', storageLabel: 'Logos', label: 'Logos' },
      } as never,
      wide as unknown as ZipFolder,
      { brand: b, sourceBrand: null, entries: [], saved: {} } as never,
      skipped,
    );
    expect(wrote).toBe(true);
    expect(await namesIn(wide, 'logos/')).toEqual(expected);
  });

  it('the folder is named from stable ids, never from a description', async () => {
    // D57: a 400-character onboarding description used to become the path.
    const prose =
      'The RAQM wordmark features bold geometric letterforms in a custom grotesque, ' +
      'set tight and locked to a 4-unit baseline grid so the counters stay open at small sizes.';
    const { buildLogoFiles } = await import('./logoExport');
    const b = brand({
      logos: [
        { id: 'primary', label: prose, variant: 'light', role: 'primary', svg: inlineSvg('#7231FF') },
      ],
    } as Partial<MockBrand>);
    const paths = (await buildLogoFiles(b)).files.map((f) => f.path);
    expect(paths).toContain('primary/primary.svg');
    for (const p of paths) expect(p.length).toBeLessThan(60);
  });

  it('a wrapped preview ships the artwork it points at, never the wrapper', async () => {
    // Setup hands the kit `<svg><rect/><image href="…"/></svg>`. Zipped
    // verbatim that is an `.svg` pointing at a URL the recipient cannot
    // resolve — and a PNG of it is blank.
    const fetched: string[] = [];
    const { buildLogoFiles } = await import('./logoExport');
    const b = brand({
      logos: [
        {
          id: 'primary',
          label: 'Primary',
          variant: 'light',
          role: 'primary',
          svg: wrapped('/brands/raqm/logo.png', '#F5F4EF'),
        },
      ],
    } as Partial<MockBrand>);
    const { files } = await buildLogoFiles(b, {
      fetchBytes: async (url) => {
        fetched.push(url);
        return new Blob(['PNGBYTES'], { type: 'image/png' });
      },
    });
    expect(fetched).toEqual(['/brands/raqm/logo.png']);
    expect(files.map((f) => f.path)).toContain('primary/primary.png');
    expect(files.some((f) => f.path.endsWith('primary.svg'))).toBe(false);
  });

  it('a ground the brand ruled out is absent from the files as well as the tiles', async () => {
    // The policy and the payload read the same list, so a pairing a guideline
    // has withdrawn cannot survive in the zip.
    const { buildLogoFiles } = await import('./logoExport');
    const all = (await buildLogoFiles(brand())).files.map((f) => f.path);
    expect(all.some((p) => p.includes('-on-violet'))).toBe(true);

    const narrowed = (
      await buildLogoFiles(brand({ logoGrounds: ['#FFFFFF', '#111113'] } as Partial<MockBrand>))
    ).files.map((f) => f.path);
    expect(narrowed.some((p) => p.includes('-on-violet'))).toBe(false);
    // The variant itself is untouched — a policy narrows where the logo goes,
    // it never deletes the logo.
    expect(narrowed).toContain('primary/primary.svg');
  });
});
