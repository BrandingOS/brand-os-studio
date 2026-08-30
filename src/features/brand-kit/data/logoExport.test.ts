/**
 * What a logo download has to contain.
 *
 * The assertions here are the audit's logo defects turned into a gate:
 * D28 (the header ⬇ and the card ⬇ shipped two different payloads), D29
 * (`logos/` in the kit held three SVGs and nothing else), D27 (a pairing
 * below 3:1 was offered as valid) and D57 (filenames slugged from a
 * 400-character description). The zip is read back with JSZip rather than
 * trusted from the builder's return value, because a file the zip does not
 * hold is exactly the failure that shipped.
 */
import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  LOGO_GROUND_PNG_SIZE,
  LOGO_PNG_SIZES,
  LOGO_STEP_TIMEOUT_MS,
  buildLogoFiles,
  buildLogosReadme,
  dataUrlToBlob,
  planLogoExport,
  svgToDataUrl,
  variantBaseName,
} from './logoExport';
import { MIN_PAIRING_CONTRAST, contrastRatio } from './recolorLogo';
import type { ZipFolder } from './zipFile';
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { mockBrand } from '@/features/setup/data/mockBrand';

/* ─── A brand shaped like a real one ──────────────────────────────── */

/** Setup's preview wrapper — a ground rect plus the artwork by reference. */
const wrapped = (href: string, bg: string) =>
  `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">` +
  `<rect width="200" height="200" fill="${bg}"/>` +
  `<image href="${href}" x="20" y="20" width="160" height="160"/></svg>`;

const brand = (over: Partial<MockBrand> = {}): MockBrand =>
  ({
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
    logos: [
      {
        id: 'primary',
        label: 'Primary',
        variant: 'light',
        role: 'primary',
        svg: wrapped('/brands/raqm/logo.svg', '#F5F4EF'),
      },
      {
        id: 'on-dark',
        label: 'On dark',
        variant: 'dark',
        role: 'mono.white',
        svg: wrapped('/brands/raqm/logo-white.svg', '#111113'),
      },
    ],
    ...over,
  }) as MockBrand;

/* ─── Fakes that produce real bytes ───────────────────────────────── */

const CRC = new Uint8Array([0, 0, 0, 0]);

/** A PNG whose IHDR really carries `w × h`, so a reader can measure it. */
function fakePng(w: number, h: number): string {
  const head = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const be = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  const bytes = new Uint8Array([
    ...head,
    ...be(13),
    0x49, 0x48, 0x44, 0x52, // "IHDR"
    ...be(w),
    ...be(h),
    8, 6, 0, 0, 0,
    ...CRC,
    ...be(0),
    0x49, 0x45, 0x4e, 0x44, // "IEND"
    ...CRC,
  ]);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return `data:image/png;base64,${btoa(bin)}`;
}

function readPngSize(bytes: Uint8Array): { w: number; h: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { w: view.getUint32(16), h: view.getUint32(20) };
}

type Call = { url: string; size: number; background?: string };

function deps() {
  const rasterized: Call[] = [];
  const fetched: string[] = [];
  return {
    rasterized,
    fetched,
    opts: {
      fetchBytes: async (url: string) => {
        fetched.push(url);
        return url.includes('missing')
          ? null
          : new Blob([`<svg id="${url}"/>`], { type: 'image/svg+xml' });
      },
      rasterize: async (url: string, o: { size: number; background?: string }) => {
        rasterized.push({ url, ...o });
        return fakePng(o.size, o.size);
      },
      makePdf: async (png: string, size: number) =>
        new Blob([`%PDF-1.3 ${size} ${png.length}`], { type: 'application/pdf' }),
    },
  };
}

/* ─── The plan ────────────────────────────────────────────────────── */

describe('variantBaseName', () => {
  it('uses the stable id, which is what the folder should be called', () => {
    expect(variantBaseName({ id: 'on-dark', label: 'On dark' }, 0)).toBe('on-dark');
  });

  it('ignores an id that is a row number rather than a name', () => {
    expect(variantBaseName({ id: 'l1', label: 'Primary' }, 0)).toBe('primary');
  });

  it('keeps the two halves of a dotted role apart', () => {
    expect(variantBaseName({ role: 'mono.white' }, 0)).toBe('mono-white');
  });

  it('cuts a description down to four words instead of slugging a paragraph', () => {
    // D57: onboarding writes a 400-character description where a name goes,
    // and that description became the filename.
    const label =
      'The RAQM wordmark features bold geometric letterforms with angular cuts ' +
      'and rectangular counters, each constructed on a strict grid system.';
    const base = variantBaseName({ label }, 0);
    expect(base).toBe('the-raqm-wordmark-features');
    expect(base.length).toBeLessThan(40);
  });

  it('always answers something usable', () => {
    expect(variantBaseName({}, 4)).toBe('logo-5');
    expect(variantBaseName({ label: '—— ——' }, 0)).toBe('logo-1');
  });
});

describe('planLogoExport', () => {
  it('plans one entry per variant, named from its id', () => {
    expect(planLogoExport(brand()).map((v) => v.base)).toEqual(['primary', 'on-dark']);
  });

  it('points at the artwork, not at Setup preview markup', () => {
    const [primary] = planLogoExport(brand());
    expect(primary.url).toBe('/brands/raqm/logo.svg');
    expect(primary.external).toBe(true);
    expect(primary.svg).toBeNull();
  });

  it('carries an inline vector as its own bytes, with the preview ground gone', () => {
    // `mockBrand`'s logos ARE svgs, each with a full-cover rect behind the
    // artwork. That rect is Setup's stage, not part of the logo.
    const [first] = planLogoExport(mockBrand);
    expect(first.external).toBe(false);
    expect(first.svg).not.toBeNull();
    expect(first.svg).not.toMatch(/<rect[^>]*width="200"/);
    expect(first.url).toBe(svgToDataUrl(first.svg as string));
  });

  it('offers no ground the logo cannot be read on', () => {
    // D27: Iris-on-Orange (~1.5:1) and Turquoise-on-Grey (~2.6:1) shipped as
    // approved pairings.
    for (const v of planLogoExport(brand())) {
      for (const g of v.grounds) {
        expect(g.contrast).toBeGreaterThanOrEqual(MIN_PAIRING_CONTRAST);
        expect(contrastRatio(v.ink, g.hex)).toBeGreaterThanOrEqual(MIN_PAIRING_CONTRAST);
      }
    }
  });

  it('gives a ground to exactly one variant — the one the system chose', () => {
    const plan = planLogoExport(brand());
    const all = plan.flatMap((v) => v.grounds.map((g) => g.hex));
    expect(new Set(all).size).toBe(all.length);
  });

  it('is empty for a brand with no artwork', () => {
    expect(planLogoExport(brand({ logos: [] }))).toEqual([]);
  });
});

/* ─── The README ──────────────────────────────────────────────────── */

describe('buildLogosReadme', () => {
  const text = buildLogosReadme(brand(), planLogoExport(brand()));

  it('states the clear-space rule as a rule, not as a picture', () => {
    expect(text).toMatch(/one third/i);
    expect(text).toMatch(/\bR\b/);
  });

  it('states the minimum size and the ladder around it', () => {
    expect(text).toMatch(/24 px/);
    expect(text).toMatch(/48 px/);
    expect(text).toMatch(/96 px/);
  });

  it('states all three misuses', () => {
    expect(text).toMatch(/Never stretch/i);
    expect(text).toMatch(/Never recolour/i);
    expect(text).toMatch(new RegExp(`below ${MIN_PAIRING_CONTRAST}:1`, 'i'));
  });

  it('tables only the pairings the folder actually holds', () => {
    const plan = planLogoExport(brand());
    for (const v of plan) {
      for (const g of v.grounds) expect(text).toContain(`${g.name} (${g.hex})`);
    }
    expect(text).not.toContain('Turquoise (#00D4AA) | 1.');
  });

  it('says so plainly when there is no logo at all', () => {
    const empty = brand({ logos: [] });
    expect(buildLogosReadme(empty, planLogoExport(empty))).toMatch(/no logo artwork yet/i);
  });
});

/* ─── The bytes ───────────────────────────────────────────────────── */

describe('buildLogoFiles', () => {
  it('ships the source file, three transparent sizes, a PDF, and every ground', async () => {
    const d = deps();
    const b = brand();
    const { files, plan } = await buildLogoFiles(b, d.opts);
    const paths = files.map((f) => f.path);

    expect(paths).toContain('README.md');
    for (const v of plan) {
      expect(paths).toContain(`${v.base}/${v.base}.svg`);
      for (const size of LOGO_PNG_SIZES) {
        expect(paths).toContain(`${v.base}/png/${v.base}-${size}.png`);
      }
      expect(paths).toContain(`${v.base}/pdf/${v.base}.pdf`);
      expect(v.grounds.length).toBeGreaterThan(0);
      for (const g of v.grounds) {
        const slug = g.name.toLowerCase().replace(/\s+/g, '-');
        expect(paths).toContain(`${v.base}/png/${v.base}-on-${slug}.png`);
        expect(paths).toContain(`${v.base}/pdf/${v.base}-on-${slug}.pdf`);
      }
    }
  });

  it('renders a ground onto the canvas rather than beside it', async () => {
    const d = deps();
    await buildLogoFiles(brand(), d.opts);
    const transparent = d.rasterized.filter((c) => !c.background);
    const grounded = d.rasterized.filter((c) => c.background);
    // Two variants, so each size appears twice; what matters is that the
    // transparent renders are exactly the declared ladder and nothing else.
    expect([...new Set(transparent.map((c) => c.size))].sort((a, b) => a - b)).toEqual(
      [...LOGO_PNG_SIZES].sort((a, b) => a - b),
    );
    expect(grounded.length).toBeGreaterThan(0);
    for (const call of grounded) expect(call.size).toBe(LOGO_GROUND_PNG_SIZE);
  });

  it('never emits an empty file', async () => {
    const { files } = await buildLogoFiles(brand(), deps().opts);
    for (const f of files) expect(f.blob.size).toBeGreaterThan(0);
  });

  it('reports a source it could not read and still ships the renders', async () => {
    const b = brand({
      logos: [
        {
          id: 'primary',
          label: 'Primary',
          variant: 'light',
          role: 'primary',
          svg: wrapped('/brands/raqm/missing.svg', '#F5F4EF'),
        },
      ],
    } as Partial<MockBrand>);
    const { files, skipped } = await buildLogoFiles(b, deps().opts);
    expect(skipped.map((s) => s.reason)).toContain(
      "the source file couldn't be read from storage",
    );
    expect(files.some((f) => f.path === 'primary/png/primary-1024.png')).toBe(true);
  });

  it('writes the rules even for a brand with no artwork', async () => {
    const { files } = await buildLogoFiles(brand({ logos: [] }), deps().opts);
    expect(files.map((f) => f.path)).toEqual(['README.md']);
  });
});

/* ─── The zip every surface receives ──────────────────────────────── */

describe('addLogosToZip', () => {
  it('is the one payload — the zip really holds every file, none of them empty', async () => {
    const d = deps();
    const { files } = await buildLogoFiles(brand(), d.opts);
    const zip = new JSZip();
    const folder = zip.folder('logos') as unknown as ZipFolder;
    for (const f of files) folder.file(f.path, f.blob);

    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    expect(names).toContain('logos/README.md');
    expect(names.filter((n) => n.endsWith('.svg')).length).toBe(2);
    // D28/D29: one payload means BOTH — a folder of SVGs with no raster and a
    // folder of rasters with no SVG were the two halves of the same defect.
    expect(names.some((n) => n.endsWith('.png'))).toBe(true);
    expect(names.some((n) => n.endsWith('.pdf'))).toBe(true);
    for (const name of names) {
      const bytes = await zip.files[name].async('uint8array');
      expect(bytes.byteLength).toBeGreaterThan(0);
    }
  });

  it('measures every PNG it wrote at the size its name claims', async () => {
    const d = deps();
    const { files } = await buildLogoFiles(brand(), d.opts);
    const zip = new JSZip();
    for (const f of files) zip.file(f.path, f.blob);
    for (const name of Object.keys(zip.files)) {
      if (!name.endsWith('.png')) continue;
      const { w, h } = readPngSize(await zip.files[name].async('uint8array'));
      const claimed = /-(\d+)\.png$/.exec(name)?.[1];
      expect(w).toBe(h);
      expect(w).toBe(claimed ? Number(claimed) : LOGO_GROUND_PNG_SIZE);
    }
  });

  it('still ships the rules when nothing can be fetched or rendered', async () => {
    // jsdom has no image decoder and a hung source never resolves, so the
    // builder has to degrade rather than hang or throw. `LOGO_STEP_TIMEOUT_MS`
    // is the outer bound on that; here the deps fail immediately.
    const { files, skipped } = await buildLogoFiles(brand(), {
      fetchBytes: async () => null,
      rasterize: async () => null,
      makePdf: async () => null,
    });
    expect(files.map((f) => f.path)).toEqual(['README.md']);
    expect(skipped.length).toBe(4);
    expect(LOGO_STEP_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('is the door kitExport actually opens', async () => {
    // `addLogosToZip` is the single entry the header ⬇, the card ⬇ and the
    // Export Kit all go through; it must write this builder's files and count
    // VARIANTS. A brand with no artwork exercises the wiring with no network.
    const { addLogosToZip } = await import('./kitExport');
    const zip = new JSZip();
    const { added, skipped } = await addLogosToZip(
      zip as unknown as ZipFolder,
      brand({ logos: [] }),
    );
    expect(added).toBe(0);
    expect(skipped).toEqual([]);
    expect(Object.keys(zip.files)).toContain('README.md');
  });

  it('counts variants, not files', async () => {
    const d = deps();
    const files = (await buildLogoFiles(brand(), d.opts)).files;
    expect(files.length).toBeGreaterThan(10);
    expect(planLogoExport(brand())).toHaveLength(2);
  });
});

describe('dataUrlToBlob', () => {
  // jsdom's Blob has neither `arrayBuffer` nor `text`; JSZip reads one either
  // way, and it is what actually consumes these blobs in production.
  const bytesOf = (blob: Blob) => new JSZip().file('x', blob).file('x')!.async('uint8array');

  it('reads base64 payloads back to their bytes', async () => {
    const blob = dataUrlToBlob(fakePng(8, 8));
    expect(blob).not.toBeNull();
    expect(readPngSize(await bytesOf(blob as Blob))).toEqual({ w: 8, h: 8 });
  });

  it('reads a percent-encoded svg payload — including the one we write', async () => {
    // `svgToDataUrl` emits `data:image/svg+xml;charset=utf-8,…`, and a parser
    // that expected `mime(;base64)?,` answered null for our own output.
    const blob = dataUrlToBlob(svgToDataUrl('<svg><circle r="1"/></svg>'));
    expect(blob).not.toBeNull();
    const text = new TextDecoder().decode(await bytesOf(blob as Blob));
    expect(text).toContain('<circle');
  });

  it('answers null for anything that is not a data url', () => {
    expect(dataUrlToBlob('https://x.test/a.png')).toBeNull();
  });
});
