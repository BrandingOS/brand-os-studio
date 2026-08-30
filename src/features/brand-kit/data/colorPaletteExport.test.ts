import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PALETTE_ROLES,
  bestTextOn,
  buildAiBlob,
  buildAllColorsZip,
  buildBaseColorSvg,
  buildShadeRows,
  buildShadesSvg,
  buildSingleColorZip,
  contrast,
  contrastReport,
  formatCmyk,
  formatHsl,
  formatRgb,
  hexToHsl,
  hexToRgb,
  hslToHex,
  isGreyscale,
  isNearWhite,
  normalizeHex,
  paletteFromMockBrand,
  roleForColor,
  rolesForPalette,
  slugify,
  usageProportions,
  wcagLevel,
} from './colorPaletteExport';
import { addColorsToZip } from './kitExport';
import {
  loadFeaturedVariants,
  saveFeaturedVariants,
} from './cardCustomizations';

describe('buildAiBlob — vector output (607MB-bundle regression)', () => {
  it('draws the base color SVG as vectors: small blob with a PDF header', async () => {
    const svg = buildBaseColorSvg({ hex: '#7231FF', name: 'Iris', role: 'Primary' });
    const blob = await buildAiBlob(svg, 1200, 750);
    expect(blob).toBeTruthy();
    // The raster path produced ~10.8 MB per file; vectors land in KB.
    expect(blob!.size).toBeLessThan(50 * 1024);
    // jsdom's Blob has no arrayBuffer() — read the header via FileReader.
    const head = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(new TextDecoder().decode((reader.result as ArrayBuffer).slice(0, 5)));
      reader.readAsArrayBuffer(blob!.slice(0, 5));
    });
    expect(head).toBe('%PDF-');
  });

  it('draws the shades stack as vectors too', async () => {
    const rows = buildShadeRows('#7231FF');
    const svg = buildShadesSvg(rows);
    const blob = await buildAiBlob(svg, 720, 80 * rows.length);
    expect(blob).toBeTruthy();
    expect(blob!.size).toBeLessThan(50 * 1024);
  });
});

describe('featured-variant persistence', () => {
  const KEY = 'brandos:brand-kit:featured-variants';

  it('round-trips per brand + label and isolates labels', () => {
    localStorage.removeItem(KEY);
    saveFeaturedVariants('test-brand', 'Business Card', ['a', 'b', 'c', 'd']);
    saveFeaturedVariants('test-brand', 'Letterhead', ['x']);
    expect(loadFeaturedVariants('test-brand')).toEqual({
      'Business Card': ['a', 'b', 'c', 'd'],
      Letterhead: ['x'],
    });
    expect(loadFeaturedVariants('other-brand')).toEqual({});
    expect(loadFeaturedVariants(undefined)).toEqual({});
    localStorage.removeItem(KEY);
  });
});

/* ─── The palette: roles, colour spaces, contrast, proportion ───────── */

describe('roleForColor / paletteFromMockBrand — a role is what a colour DOES', () => {
  it('names the first two slots by position and everything after by evidence', () => {
    expect(roleForColor('#7231FF', 0, 'core')).toBe('Primary');
    expect(roleForColor('#00D4AA', 1, 'core')).toBe('Secondary');
    // Near-white past secondary is the ground a page is laid on…
    expect(roleForColor('#FAFAFA', 2, 'core')).toBe('Background');
    // …grey is type and rules…
    expect(roleForColor('#8A8A8A', 3, 'core')).toBe('Neutral');
    // …and real chroma is an accent. Never "Core 4" (D40).
    expect(roleForColor('#F59E0B', 4, 'core')).toBe('Accent');
    expect(roleForColor('#CCCCCC', 9, 'grey')).toBe('Neutral');
    expect(roleForColor('#F59E0B', 0, 'accent')).toBe('Accent');
  });

  it('never emits a positional label for any index', () => {
    for (let i = 0; i < 12; i += 1) {
      expect(PALETTE_ROLES).toContain(roleForColor('#123456', i, 'core'));
    }
  });

  it('lets the canonical brand override the evidence when it assigned a role', () => {
    const source = {
      colorSystem: { accent: { hex: '#101010' } },
    } as unknown as Parameters<typeof roleForColor>[3];
    // #101010 is greyscale, so evidence alone would say Neutral.
    expect(roleForColor('#101010', 4, 'core')).toBe('Neutral');
    expect(roleForColor('#101010', 4, 'core', source)).toBe('Accent');
  });

  it('reads core + accent and leaves the generated grey ladder out (D37)', () => {
    const brand = {
      colors: {
        core: [
          { hex: '#7231FF', name: 'Iris' },
          { hex: '#00D4AA', name: 'Turquoise' },
        ],
        accent: [{ hex: '#F59E0B', name: 'Orange' }],
        grey: [
          { hex: '#000000', name: 'Black' },
          { hex: '#FFFFFF', name: 'White' },
        ],
      },
    } as never;
    const lean = paletteFromMockBrand(brand);
    expect(lean.map((c) => c.name)).toEqual(['Iris', 'Turquoise', 'Orange']);
    expect(lean.map((c) => c.role)).toEqual(['Primary', 'Secondary', 'Accent']);
    const full = paletteFromMockBrand(brand, { includeNeutrals: true });
    expect(full).toHaveLength(5);
    expect(full.slice(3).every((c) => c.role === 'Neutral')).toBe(true);
  });
});

describe('rolesForPalette — the seats a palette has only one of', () => {
  const core = (...hexes: string[]) => hexes.map((hex) => ({ hex, bucket: 'core' as const }));

  it('never prints the same Background twice (Raqm, measured)', () => {
    // core[2] #FAFAFA and core[3] #E5E5E5 are BOTH near-white, so the
    // per-colour rule called both of them Background and the drilldown
    // showed two grounds.
    expect(
      rolesForPalette(core('#7231FF', '#00D4AA', '#FAFAFA', '#E5E5E5', '#8A8A8A', '#0A0A0F')),
    ).toEqual(['Primary', 'Secondary', 'Background', 'Neutral', 'Neutral', 'Neutral']);
  });

  it('never calls a pure white the Secondary (SKAM, measured)', () => {
    // #FFFFFF sat at core[1], so position alone named it Secondary —
    // the same defect as "Core 4", in a nicer word.
    expect(rolesForPalette(core('#EF4444', '#FFFFFF', '#000000', '#222222', '#94938E'))).toEqual([
      'Primary',
      'Background',
      'Neutral',
      'Neutral',
      'Neutral',
    ]);
  });

  it('keeps a real Secondary when the brand has one', () => {
    expect(rolesForPalette(core('#7231FF', '#00D4AA'))).toEqual(['Primary', 'Secondary']);
  });

  it('holds at most one Primary, Secondary and Background, and any number of the rest', () => {
    const roles = rolesForPalette([
      ...core('#7231FF', '#00D4AA', '#FAFAFA', '#F0F0F0', '#3A3A3A', '#111111'),
      { hex: '#F59E0B', bucket: 'accent' },
      { hex: '#EC4899', bucket: 'accent' },
      { hex: '#CCCCCC', bucket: 'grey' },
    ]);
    for (const seat of ['Primary', 'Secondary', 'Background'] as const) {
      expect(roles.filter((r) => r === seat).length).toBeLessThanOrEqual(1);
    }
    expect(roles.filter((r) => r === 'Accent').length).toBe(2);
    expect(roles.at(-1)).toBe('Neutral');
    for (const r of roles) expect(PALETTE_ROLES).toContain(r);
  });

  it('is what paletteFromMockBrand prints, so the tiles and the panel agree', () => {
    const brand = {
      colors: {
        core: [
          { hex: '#EF4444', name: 'Rose' },
          { hex: '#FFFFFF', name: 'White' },
          { hex: '#000000', name: 'Black' },
        ],
        accent: [],
        grey: [],
      },
    } as never;
    expect(paletteFromMockBrand(brand).map((c) => c.role)).toEqual([
      'Primary',
      'Background',
      'Neutral',
    ]);
  });
});

describe('colour spaces', () => {
  it('normalises anything hex-shaped and refuses anything else', () => {
    expect(normalizeHex('7231ff')).toBe('#7231FF');
    expect(normalizeHex('#7231ff')).toBe('#7231FF');
    expect(normalizeHex(' #abc ')).toBe('#AABBCC');
    expect(normalizeHex('not a colour')).toBe('#000000');
    expect(normalizeHex('')).toBe('#000000');
  });

  it('formats RGB, CMYK and HSL the way a print shop and a stylesheet read them', () => {
    expect(formatRgb('#7231FF')).toBe('114 49 255');
    expect(formatCmyk('#FFFFFF')).toBe('0 0 0 0');
    expect(formatCmyk('#000000')).toBe('0 0 0 100');
    expect(formatCmyk('#FF0000')).toBe('0 100 100 0');
    expect(formatHsl('#FF0000')).toBe('0° 100% 50%');
    expect(formatHsl('#FFFFFF')).toBe('0° 0% 100%');
  });

  it('round-trips hex → hsl → hex for the seed brands’ own colours', () => {
    for (const hex of ['#7231FF', '#00D4AA', '#EF4444', '#F59E0B', '#3A3A3A']) {
      const [h, s, l] = hexToHsl(hex);
      const back = hslToHex(h, s, l);
      const [r1, g1, b1] = hexToRgb(hex);
      const [r2, g2, b2] = hexToRgb(back);
      // Rounding through integer HSL costs at most a step per channel.
      expect(Math.abs(r1 - r2)).toBeLessThanOrEqual(3);
      expect(Math.abs(g1 - g2)).toBeLessThanOrEqual(3);
      expect(Math.abs(b1 - b2)).toBeLessThanOrEqual(3);
    }
  });
});

describe('contrast', () => {
  it('measures the two WCAG anchors exactly', () => {
    expect(contrast('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrast('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // Symmetric — the ratio does not know which one is the ground.
    expect(contrast('#7231FF', '#FFFFFF')).toBeCloseTo(contrast('#FFFFFF', '#7231FF'), 10);
  });

  it('names the level at each boundary', () => {
    expect(wcagLevel(21)).toBe('AAA');
    expect(wcagLevel(7)).toBe('AAA');
    expect(wcagLevel(6.99)).toBe('AA');
    expect(wcagLevel(4.5)).toBe('AA');
    expect(wcagLevel(4.49)).toBe('AA Large');
    expect(wcagLevel(3)).toBe('AA Large');
    expect(wcagLevel(2.99)).toBe('Fail');
    expect(wcagLevel(1)).toBe('Fail');
  });

  it('reports a colour against both grounds at once', () => {
    const white = contrastReport('#FFFFFF');
    expect(white.onWhite.ratio).toBeCloseTo(1, 5);
    expect(white.onWhite.level).toBe('Fail');
    expect(white.onBlack.ratio).toBeCloseTo(21, 5);
    expect(white.onBlack.level).toBe('AAA');
  });

  it('picks the ink that actually reads on a ground', () => {
    expect(bestTextOn('#FFFFFF')).toBe('#111113');
    expect(bestTextOn('#000000')).toBe('#FFFFFF');
    for (const hex of ['#7231FF', '#00D4AA', '#EF4444', '#F59E0B', '#8A8A8A', '#FAFAFA']) {
      const ink = bestTextOn(hex);
      const other = ink === '#FFFFFF' ? '#111113' : '#FFFFFF';
      expect(contrast(hex, ink)).toBeGreaterThanOrEqual(contrast(hex, other));
    }
  });
});

describe('usageProportions — the 60 / 30 / 10 split', () => {
  const c = (n: string) => ({ hex: '#123456', name: n, role: 'Accent' });

  it('always sums to 100 and never invents a colour', () => {
    for (let n = 1; n <= 5; n += 1) {
      const colors = Array.from({ length: n }, (_, i) => c(`C${i}`));
      const split = usageProportions(colors);
      expect(split).toHaveLength(n);
      expect(split.reduce((s, x) => s + x.pct, 0)).toBe(100);
      expect(split.map((x) => x.color.name)).toEqual(colors.map((x) => x.name));
    }
  });

  it('is 60 / 30 / 10 for three, and descends', () => {
    expect(usageProportions([c('a'), c('b'), c('c')]).map((x) => x.pct)).toEqual([60, 30, 10]);
    const five = usageProportions(Array.from({ length: 5 }, (_, i) => c(String(i)))).map(
      (x) => x.pct,
    );
    expect([...five].sort((a, b) => b - a)).toEqual(five);
  });

  it('shows the first five of a deeper palette rather than a sliver each', () => {
    const split = usageProportions(Array.from({ length: 9 }, (_, i) => c(String(i))));
    expect(split).toHaveLength(5);
  });
});

describe('isGreyscale / isNearWhite / slugify', () => {
  it('separates a grey from a colour and a ground from ink', () => {
    expect(isGreyscale('#8A8A8A')).toBe(true);
    expect(isGreyscale('#94938E')).toBe(true); // a warm grey is still a grey
    expect(isGreyscale('#7231FF')).toBe(false);
    expect(isNearWhite('#FAFAFA')).toBe(true);
    expect(isNearWhite('#7231FF')).toBe(false);
    expect(isNearWhite('#000000')).toBe(false);
  });

  it('makes a filesystem-safe stem and never an empty one', () => {
    expect(slugify('Deep Sea Blue')).toBe('deep-sea-blue');
    expect(slugify('A/B\\C')).toBe('a-b-c');
    expect(slugify('···')).toBe('color');
  });
});

/* ─── The zips, read back ──────────────────────────────────────────── */

/**
 * jsdom cannot rasterize: `new Image()` never fires `load`, so
 * `rasterizeSvg` would hang for ever. The stub returns REAL bytes — a
 * genuine 1×1 PNG and a genuine JPEG SOI — so the assertions below can
 * still prove that what goes into a zip comes out of it byte-identical
 * and non-empty. Real rasterization is exercised in the browser project.
 */
const PNG_1X1 = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);
const JPG_HEAD = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);

async function readZip(blob: Blob) {
  const { default: JSZip } = await import('jszip');
  const buf = await new Promise<ArrayBuffer>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });
  return JSZip.loadAsync(buf);
}

const RAQM_BRAND = {
  name: 'Raqm',
  colors: {
    core: [
      { hex: '#7231FF', name: 'Iris' },
      { hex: '#00D4AA', name: 'Turquoise' },
      { hex: '#FAFAFA', name: 'White' },
    ],
    accent: [{ hex: '#F59E0B', name: 'Orange' }],
    grey: Array.from({ length: 32 }, (_, i) => ({
      hex: `#${i.toString(16).padStart(2, '0').repeat(3)}`.toUpperCase(),
      name: `Grey ${i}`,
    })),
  },
} as never;

describe('the colour zips, read back', () => {
  // Stub the three DOM capabilities jsdom lacks, at their real seams, so
  // `rasterizeSvg` itself still runs: an <img> that never fires `load`
  // would hang the suite for ever.
  beforeEach(() => {
    (URL as unknown as { createObjectURL: unknown }).createObjectURL = vi.fn(() => 'blob:stub');
    (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL = vi.fn();
    Object.defineProperty(Image.prototype, 'src', {
      configurable: true,
      set(this: HTMLImageElement) {
        queueMicrotask(() => this.onload?.(new Event('load')));
      },
    });
    // `getContext` is overloaded (2d / webgl / webgpu), so it is replaced
    // rather than spied — a typed mock would have to satisfy whichever
    // overload TypeScript picks first, which is not the one in play.
    const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
    proto.getContext = () => ({ drawImage: () => {} });
    proto.toBlob = (cb: BlobCallback, type?: string) => {
      cb(
        type === 'image/jpeg'
          ? new Blob([JPG_HEAD], { type: 'image/jpeg' })
          : new Blob([PNG_1X1], { type: 'image/png' }),
      );
    };
  });
  afterEach(() => {
    vi.restoreAllMocks();
    const proto = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
    delete proto.getContext;
    delete proto.toBlob;
    delete (Image.prototype as unknown as Record<string, unknown>).src;
  });

  it('addColorsToZip ships the BRAND colours only — no 32 greys, no .ai', async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const folder = zip.folder('colors')!;
    const added = await addColorsToZip(folder as never, RAQM_BRAND);
    expect(added).toBe(4);
    const out = await readZip(await zip.generateAsync({ type: 'blob' }));
    const paths = Object.keys(out.files).filter((p) => !out.files[p].dir);

    // The four the brand owns, and nothing from the generated ladder.
    expect(paths.filter((p) => p.endsWith('.svg')).length).toBe(8); // swatch + shades each
    expect(paths.some((p) => /Grey \d+/.test(p))).toBe(false);
    expect(paths.some((p) => p.endsWith('.ai'))).toBe(false);
    expect(paths.some((p) => p.endsWith('.jpg'))).toBe(false);

    // The developer handoff travels with the artwork.
    for (const f of ['tokens.css', 'tokens.scss', 'tokens.json', 'tailwind.colors.js', 'figma.tokens.json', 'palette.ase', 'README.md']) {
      expect(paths).toContain(`colors/${f}`);
    }
    // Nothing empty.
    for (const p of paths) {
      const bytes = await out.files[p].async('uint8array');
      expect(bytes.byteLength).toBeGreaterThan(0);
    }
    // The PNG arrived byte-identical, IHDR intact.
    const png = await out.files['colors/Iris/iris.png'].async('uint8array');
    expect(Array.from(png.slice(0, 8))).toEqual(Array.from(PNG_1X1.slice(0, 8)));
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(String.fromCharCode(...png.slice(12, 16))).toBe('IHDR');
    expect(view.getUint32(16, false)).toBe(1); // width
    expect(view.getUint32(20, false)).toBe(1); // height

    // The tokens name the brand's own hexes.
    const css = await out.files['colors/tokens.css'].async('string');
    expect(css).toContain('--brand-iris: #7231FF;');
    const readme = await out.files['colors/README.md'].async('string');
    expect(readme).toContain('grey ladder is NOT part of this bundle');
    expect(readme).toContain('standard bundle');
  });

  it('addColorsToZip with depth "full" restores the print originals', async () => {
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const folder = zip.folder('colors')!;
    await addColorsToZip(folder as never, RAQM_BRAND, undefined, { depth: 'full' });
    const out = await readZip(await zip.generateAsync({ type: 'blob' }));
    const paths = Object.keys(out.files).filter((p) => !out.files[p].dir);
    expect(paths).toContain('colors/Iris/iris.jpg');
    expect(paths).toContain('colors/Iris/iris.ai');
    expect(paths).toContain('colors/Iris/iris-shades.ai');
    const ai = await out.files['colors/Iris/iris.ai'].async('string');
    expect(ai.startsWith('%PDF-')).toBe(true);
    expect(await out.files['colors/README.md'].async('string')).toContain('FULL bundle');
  });

  it('buildAllColorsZip gives every colour a folder, a ladder and one tokens set', async () => {
    const palette = paletteFromMockBrand(RAQM_BRAND);
    const seen: string[] = [];
    const out = await readZip(
      await buildAllColorsZip(palette, 'Raqm', (_d, _t, name) => seen.push(name)),
    );
    const paths = Object.keys(out.files).filter((p) => !out.files[p].dir);
    expect(seen).toEqual(['Iris', 'Turquoise', 'White', 'Orange']);
    for (const name of seen) {
      const stem = name.toLowerCase();
      expect(paths).toContain(`${name}/${stem}.svg`);
      expect(paths).toContain(`${name}/${stem}.png`);
      expect(paths).toContain(`${name}/Shades/${stem}-shades.svg`);
    }
    expect(paths).toContain('tokens/tokens.css');
    expect(paths).toContain('tokens/palette.ase');
    expect(paths).toContain('README.md');
    expect(paths.some((p) => p.endsWith('.ai'))).toBe(false);
  });

  it('buildSingleColorZip carries the colour, its ladder and its own tokens', async () => {
    const out = await readZip(
      await buildSingleColorZip({ hex: '#7231FF', name: 'Iris', role: 'Primary' }),
    );
    const paths = Object.keys(out.files).filter((p) => !out.files[p].dir);
    expect(paths).toEqual(
      expect.arrayContaining([
        'Iris/iris.svg',
        'Iris/iris.png',
        'Iris/Shades/iris-shades.svg',
        'Iris/tokens.css',
        'Iris/tokens.json',
      ]),
    );
    const json = JSON.parse(await out.files['Iris/tokens.json'].async('string'));
    expect(json.color.iris.$value).toBe('#7231FF');
  });

  it('two colours with the same name get two folders, not one', async () => {
    const out = await readZip(
      await buildAllColorsZip(
        [
          { hex: '#7231FF', name: 'Rose', role: 'Primary' },
          { hex: '#EF4444', name: 'Rose', role: 'Accent' },
        ],
        'Twin',
      ),
    );
    const paths = Object.keys(out.files).filter((p) => !out.files[p].dir);
    expect(paths.some((p) => p.startsWith('Rose/'))).toBe(true);
    expect(paths.some((p) => p.startsWith('Rose 2/'))).toBe(true);
  });
});
