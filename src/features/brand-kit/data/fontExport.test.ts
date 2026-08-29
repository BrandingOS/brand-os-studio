/**
 * The typography download, read back out of the zip.
 *
 * Four defects shipped in this bundle and each of them has an assertion
 * here, because each of them is only visible from INSIDE the archive:
 *
 *  • D31a — the manifest claimed `400 · 500 · 600 · 700` and the folder
 *    held Regular. So the test asks for four weights and counts four
 *    files, and reads the README to check it names the ones that came.
 *  • D31b — every file was written twice, once as `.ttf` and once as a
 *    byte-identical `.otf`. So the test asserts there is no `.otf` in the
 *    archive at all, and that no two entries share bytes.
 *  • D32 — `GT Super` shipped as a folder containing a README and nothing
 *    else, with no word about it anywhere the user would look. So the
 *    test asserts the folder explains itself AND that `fontSource` calls
 *    it `unavailable`, which is the value the tile and the editor draw
 *    their notice from.
 *  • D33/D34 — a family Google has never heard of was still ASKED for,
 *    once per surface, and every ask was a red line in the console. So
 *    the test counts the fetches: a foundry family must cost zero.
 *
 * The woff2 decoder is mocked because it is a wasm binary fetched at
 * runtime; what is under test is the archive's shape, not Google's
 * compressor.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import JSZip from 'jszip';
import {
  DEFAULT_WEIGHTS,
  addFontFamiliesToZip,
  buildEmbedHtml,
  buildFontsCss,
  buildFontsReadme,
  buildLicenseNote,
  fontSource,
  googleEmbedHref,
  parseGoogleFontCss,
  parseWeights,
  pickLatinFaces,
  weightLabel,
  type GatheredFontFile,
} from './fontExport';

/* The decoder. A real woff2 payload is a compressed stream; the exporter
   only cares that it comes back as TTF-flavoured bytes. */
vi.mock('fonteditor-core', () => ({
  woff2: {
    init: vi.fn().mockResolvedValue(undefined),
    // A recognisable, NON-empty body so the zip can be checked for
    // zero-byte entries, and one that differs per input so two files
    // holding the same bytes is detectable.
    decode: (bytes: Uint8Array) =>
      new Uint8Array([0x00, 0x01, 0x00, 0x00, ...bytes.slice(0, 16)]),
  },
}));

/* ─── Weights ──────────────────────────────────────────────────────── */

describe('parseWeights', () => {
  it('reads the numeric form the kit prints', () => {
    expect(parseWeights('400 · 500 · 600 · 700')).toEqual([400, 500, 600, 700]);
  });

  it('reads the named form a filename carries', () => {
    expect(parseWeights('Regular · Medium · SemiBold · Bold')).toEqual([400, 500, 600, 700]);
  });

  it('reads a single weight, however it is written', () => {
    expect(parseWeights('Bold')).toEqual([700]);
    expect(parseWeights('700')).toEqual([700]);
    expect(parseWeights([700])).toEqual([700]);
  });

  it('sorts and de-duplicates, so the CSS request is stable', () => {
    expect(parseWeights('Bold · 400 · Bold · Regular')).toEqual([400, 700]);
  });

  it('falls back to the usual four rather than to nothing', () => {
    // Shipping four weights nobody named is a smaller failure than
    // shipping none — an empty request answers a single face.
    expect(parseWeights(undefined)).toEqual([...DEFAULT_WEIGHTS]);
    expect(parseWeights('')).toEqual([...DEFAULT_WEIGHTS]);
    expect(parseWeights('Display')).toEqual([...DEFAULT_WEIGHTS]);
  });

  it('names a weight the way a font file is named', () => {
    expect(weightLabel(400)).toBe('Regular');
    expect(weightLabel(600)).toBe('SemiBold');
    expect(weightLabel(950)).toBe('950');
  });
});

/* ─── Where a family comes from ────────────────────────────────────── */

describe('fontSource', () => {
  it('prefers the files the user uploaded — the cut they own', () => {
    expect(
      fontSource({
        name: 'Inter',
        files: [{ name: 'Inter.ttf', weight: 'Regular', format: 'ttf', dataUrl: 'data:,', size: 4 }],
      }),
    ).toBe('uploaded');
  });

  it('calls a catalogued family google', () => {
    expect(fontSource({ name: 'DM Sans' })).toBe('google');
    expect(fontSource({ name: 'dm sans' })).toBe('google');
  });

  it('calls a foundry family unavailable — this is what D32 draws (D32)', () => {
    expect(fontSource({ name: 'GT Super' })).toBe('unavailable');
    expect(fontSource({ name: '' })).toBe('unavailable');
  });
});

/* ─── The Google CSS payload ───────────────────────────────────────── */

const CSS = `
/* cyrillic */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/inter/v1/cyr-400.woff2) format('woff2');
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/inter/v1/lat-400.woff2) format('woff2');
}
/* latin-ext */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 400;
  src: url(https://fonts.gstatic.com/s/inter/v1/latext-400.woff2) format('woff2');
}
/* latin */
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 700;
  src: url(https://fonts.gstatic.com/s/inter/v1/lat-700.woff2) format('woff2');
}
`;

/** What Google really answers for a VARIABLE family: the SAME url under
 *  every weight asked for. Measured against
 *  `css2?family=Bricolage+Grotesque:wght@400;600;700;800`. */
const VARIABLE_CSS = [400, 600, 700, 800]
  .map(
    (w) => `/* latin */
@font-face {
  font-family: 'Bricolage Grotesque';
  font-style: normal;
  font-weight: ${w};
  src: url(https://fonts.gstatic.com/s/bricolage/v9/one-variable-file.woff2) format('woff2');
}`,
  )
  .join('\n');

describe('parseGoogleFontCss / pickLatinFaces', () => {
  it('reads every face, with its weight and its subset', () => {
    const faces = parseGoogleFontCss(CSS);
    expect(faces).toHaveLength(4);
    expect(faces.map((f) => f.subset)).toEqual(['cyrillic', 'latin', 'latin-ext', 'latin']);
    expect(faces.map((f) => f.weight)).toEqual([400, 400, 400, 700]);
  });

  it('keeps one file per cut, and prefers latin-ext over latin', () => {
    // Seven subsets of one face is not a richer download; and embedding
    // `cyrillic` in an English document renders every line as one glyph.
    const picked = pickLatinFaces(parseGoogleFontCss(CSS));
    expect(picked).toHaveLength(2);
    expect(picked[0]!.url).toContain('latext-400');
    expect(picked[1]!.url).toContain('lat-700');
  });

  it('asks for weights discretely, never as a range', () => {
    // The RANGE form (`100..900`) answers 400 for a static family.
    const href = googleEmbedHref('dm sans', [400, 700]);
    expect(href).toContain('family=DM+Sans');
    expect(href).toContain('wght@400;700');
    expect(href).not.toContain('..');
  });
});

/* ─── The paperwork ────────────────────────────────────────────────── */

const FILES: GatheredFontFile[] = [
  { baseName: 'Inter-Regular', ttfBytes: new Uint8Array([1]), weight: 400 },
  { baseName: 'Inter-Bold', ttfBytes: new Uint8Array([2]), weight: 700 },
];

describe('the files beside the fonts', () => {
  it('writes one @font-face per cut, pointing at the file next to it', () => {
    const css = buildFontsCss('Inter', FILES);
    expect(css.match(/@font-face/g)).toHaveLength(2);
    expect(css).toContain("src: url('./Inter-Regular.ttf') format('truetype')");
    expect(css).toContain('font-weight: 700;');
    expect(css).not.toContain('.otf');
  });

  it('gives a Google family both ways in: the link and the local css', () => {
    const html = buildEmbedHtml('Inter', FILES, 'google');
    expect(html).toContain('fonts.googleapis.com/css2?family=Inter');
    expect(html).toContain('./fonts.css');
    expect(html).toContain('Inter Regular');
    expect(html).toContain('Inter Bold');
  });

  it('gives an uploaded family only the local css — there is nothing to link', () => {
    const html = buildEmbedHtml('GT Super', FILES, 'uploaded');
    expect(html).toContain('./fonts.css');
    expect(html).not.toContain('fonts.googleapis.com');
  });

  it('never ships a licence it does not own, and says where the real one is', () => {
    expect(buildLicenseNote('Inter', 'google')).toContain('fonts.google.com/specimen/Inter');
    expect(buildLicenseNote('GT Super', 'uploaded')).toContain('ships none');
    expect(buildLicenseNote('GT Super', 'unavailable')).toContain('Setup → Typography');
  });

  it('names what shipped and what the family does not have', () => {
    const readme = buildFontsReadme([
      { name: 'Abel', source: 'google', requested: [400, 500, 600, 700], delivered: [400] },
      { name: 'GT Super', source: 'unavailable', requested: [400, 700], delivered: [] },
    ]);
    expect(readme).toContain('Regular (400)');
    // The claim and the folder agree — this is D31's whole content.
    expect(readme).toContain('Not available in this family: Medium (500), SemiBold (600), Bold (700)');
    expect(readme).toContain('**No files.**');
  });
});

/* ─── The archive ──────────────────────────────────────────────────── */

type Fetched = { url: string };
let fetched: Fetched[] = [];

beforeEach(() => {
  fetched = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      fetched.push({ url });
      if (url.includes('fonts.googleapis.com')) {
        return { ok: true, text: async () => CSS } as unknown as Response;
      }
      return {
        ok: true,
        arrayBuffer: async () => new Uint8Array([9, 9, 9, 9, ...url.slice(-16).split('').map((c) => c.charCodeAt(0))]).buffer,
      } as unknown as Response;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function readBack(
  families: Parameters<typeof addFontFamiliesToZip>[1],
  options: Parameters<typeof addFontFamiliesToZip>[2] = {},
) {
  const zip = new JSZip();
  const result = await addFontFamiliesToZip(zip, families, options);
  const blob = await zip.generateAsync({ type: 'uint8array' });
  const read = await JSZip.loadAsync(blob);
  const paths = Object.keys(read.files).filter((p) => !read.files[p]!.dir);
  return { result, read, paths };
}

describe('addFontFamiliesToZip', () => {
  it('ships every weight the brand declared, once (D31)', async () => {
    const { result, paths } = await readBack([{ name: 'Inter', weights: '400 · 700' }]);
    expect(result.ok).toEqual(['Inter']);
    expect(result.missing).toEqual([]);

    const fonts = paths.filter((p) => p.endsWith('.ttf'));
    expect(fonts.sort()).toEqual(['Inter/Inter-Bold.ttf', 'Inter/Inter-Regular.ttf']);
  });

  it('ships no .otf at all — a renamed TTF is not an OpenType font (D31)', async () => {
    const { paths } = await readBack([{ name: 'Inter', weights: '400 · 700' }]);
    expect(paths.filter((p) => /\.otf$/i.test(p))).toEqual([]);
  });

  it('writes no two files with the same bytes', async () => {
    const { read, paths } = await readBack([{ name: 'Inter', weights: '400 · 700' }]);
    const seen = new Set<string>();
    for (const path of paths.filter((p) => p.endsWith('.ttf'))) {
      const bytes = await read.file(path)!.async('uint8array');
      expect(bytes.byteLength).toBeGreaterThan(0);
      const key = Array.from(bytes).join(',');
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('carries fonts.css, embed.html and a licence note beside them', async () => {
    const { paths } = await readBack([{ name: 'Inter', weights: '400' }]);
    expect(paths).toContain('Inter/fonts.css');
    expect(paths).toContain('Inter/embed.html');
    expect(paths).toContain('Inter/LICENSE-NOTE.md');
    expect(paths).toContain('README.md');
  });

  it('leaves the specimen page out of the whole-kit bundle', async () => {
    // The kit already carries every deliverable; a per-family HTML page
    // in it is weight, not information.
    const { paths } = await readBack([{ name: 'Inter', weights: '400' }], { lean: true });
    expect(paths).toContain('Inter/fonts.css');
    expect(paths).not.toContain('Inter/embed.html');
  });

  it('takes the latin cut only — one file per weight, not one per subset', async () => {
    const { paths } = await readBack([{ name: 'Inter', weights: '400' }]);
    // The payload carries FOUR faces — cyrillic/latin/latin-ext at 400 and
    // latin at 700 — and two cuts come out of it. Seven files of the same
    // face is what the subset-blind version shipped.
    expect(paths.filter((p) => p.endsWith('.ttf')).sort()).toEqual([
      'Inter/Inter-Bold.ttf',
      'Inter/Inter-Regular.ttf',
    ]);
    expect(paths.some((p) => /cyrillic|latin/i.test(p))).toBe(false);
  });

  it('never asks Google for a family it has never heard of (D33/D34)', async () => {
    const { result, paths } = await readBack([{ name: 'GT Super', weights: '400 · 700' }]);
    expect(fetched).toEqual([]);
    expect(result.ok).toEqual([]);
    expect(result.missing).toEqual(['GT Super']);
    // And the folder says so, where the user will find it.
    expect(paths).toContain('GT Super/README.txt');
    expect(paths).toContain('GT Super/LICENSE-NOTE.md');
  });

  it('explains the missing family in the README too (D32)', async () => {
    const { read } = await readBack([
      { name: 'Inter', weights: '400' },
      { name: 'GT Super', weights: '400' },
    ]);
    const readme = await read.file('README.md')!.async('string');
    expect(readme).toContain('## GT Super');
    expect(readme).toContain('Upload your licensed copy');
    const note = await read.file('GT Super/README.txt')!.async('string');
    expect(note).toContain('not on Google Fonts');
  });

  it('uses the uploaded bytes verbatim, and makes no request for them', async () => {
    const bytes = 'AAECAwQFBgcICQoLDA0ODw=='; // 16 bytes
    const { result, read, paths } = await readBack([
      {
        name: 'Bricolage Grotesque',
        weights: '400 · 700',
        files: [
          { name: 'Bricolage-Regular.ttf', weight: 'Regular', format: 'ttf', dataUrl: `data:font/ttf;base64,${bytes}`, size: 16 },
          { name: 'Bricolage-Bold.otf', weight: 'Bold', format: 'otf', dataUrl: `data:font/otf;base64,${bytes}`, size: 16 },
        ],
      },
    ]);
    expect(fetched).toEqual([]);
    expect(result.ok).toEqual(['Bricolage Grotesque']);
    const fonts = paths.filter((p) => p.endsWith('.ttf'));
    expect(fonts).toHaveLength(2);
    const first = await read.file(fonts[0]!)!.async('uint8array');
    expect(first.byteLength).toBe(16);
    // The css names the weights the files actually are.
    const css = await read.file('Bricolage Grotesque/fonts.css')!.async('string');
    expect(css).toContain('font-weight: 400;');
    expect(css).toContain('font-weight: 700;');
  });

  it('ships a VARIABLE family once, not four copies of one file', async () => {
    // Measured on the real download: Bricolage Grotesque came out as four
    // files of 39,588 bytes with four names and one sha1. That is the
    // renamed-`.otf` lie wearing a different extension.
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        fetched.push({ url });
        if (url.includes('fonts.googleapis.com')) {
          return { ok: true, text: async () => VARIABLE_CSS } as unknown as Response;
        }
        return {
          ok: true,
          arrayBuffer: async () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer,
        } as unknown as Response;
      }),
    );

    const { result, read, paths } = await readBack([
      { name: 'Bricolage Grotesque', weights: '400 · 600 · 700 · 800' },
    ]);
    expect(result.ok).toEqual(['Bricolage Grotesque']);

    const fonts = paths.filter((p) => p.endsWith('.ttf'));
    expect(fonts).toEqual(['Bricolage Grotesque/BricolageGrotesque-Variable.ttf']);
    // The file was fetched once, too — four fetches of one url is four
    // times the wait for the same bytes.
    expect(fetched.filter((f) => f.url.includes('gstatic'))).toHaveLength(1);

    // And the css declares the RANGE, so the browser interpolates the
    // weights rather than synthesising them.
    const css = await read.file('Bricolage Grotesque/fonts.css')!.async('string');
    expect(css).toContain('font-weight: 400 800;');
    expect(css.match(/@font-face/g)).toHaveLength(1);

    // The manifest still says all four weights arrived, because they did.
    const readme = await read.file('README.md')!.async('string');
    expect(readme).toContain('Regular (400), SemiBold (600), Bold (700), ExtraBold (800)');
    expect(readme).not.toContain('Not available in this family');
    expect(readme).toContain('One VARIABLE file covers that whole range');

    // The specimen page still shows every weight — one file, four samples.
    const html = await read.file('Bricolage Grotesque/embed.html')!.async('string');
    expect(html).toContain('font-weight: 400;');
    expect(html).toContain('font-weight: 800;');
  });

  it('drops the wrapping folder for a single-family download', async () => {
    const { paths } = await readBack([{ name: 'Inter', weights: '400' }], { flatten: true });
    expect(paths).toContain('Inter-Regular.ttf');
    expect(paths).toContain('fonts.css');
    expect(paths.some((p) => p.startsWith('Inter/'))).toBe(false);
  });
});
