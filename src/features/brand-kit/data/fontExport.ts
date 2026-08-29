import {
  canonicalGoogleFamily,
  isGoogleFontFamily,
} from '@/shared/design-system/fonts';
import type { BrandFontFile } from '@/features/setup/data/mockBrand';
import { triggerBlobDownload } from './colorPaletteExport';
import { zipAdd, type ZipFolder } from './zipFile';

/**
 * Typography export — the font FILES, and the paperwork that makes them
 * usable.
 *
 *   {brand}-fonts.zip
 *     README.md              — what is here, what is missing, how to fix it
 *     {Family Name}/
 *       {Family}-Regular.ttf … one file per DECLARED weight
 *       fonts.css            — @font-face block pointing at those files
 *       embed.html           — paste-into-a-page snippet
 *       LICENSE-NOTE.md      — where the licence lives; we never ship one
 *
 * Three rules this file exists to keep, each of them a defect that shipped:
 *
 * 1. **Every declared weight, or an honest reason.** The kit claimed
 *    "400 · 500 · 600 · 700" and the zip held Regular. The Google CSS API
 *    is asked for the whole set — and it is LENIENT about a weight a family
 *    does not have (verified: `Abel:wght@400;500;600;700` answers 200 with
 *    the one face Abel owns), so asking for four and getting one is a fact
 *    about the family, not a failure.
 * 2. **No renamed duplicates.** The old export wrote every file twice, once
 *    as `.ttf` and once as `.otf` with byte-identical contents. An OTF is
 *    not a renamed TTF; shipping one is a lie the user finds out about when
 *    they install it.
 * 3. **Never fetch a family Google has never heard of.** `GT Super` is a
 *    foundry face. Asking fonts.googleapis.com for it answers 400, and a
 *    400 is a red line in the user's console. `isGoogleFontFamily` decides
 *    BEFORE any request, so the Typography surface makes zero failing
 *    network calls — the family is reported as needing an upload instead.
 *
 * The third-party `gwfh.mranftl.com` TTF proxy is deliberately gone: it
 * sends no CORS headers, so every call failed anyway and the only thing it
 * produced was `net::ERR_FAILED` in the console.
 */

/* ─── Weights ──────────────────────────────────────────────────────── */

/** Numeric weight → the name font files are conventionally given. */
export const WEIGHT_LABELS: Readonly<Record<number, string>> = {
  100: 'Thin',
  200: 'ExtraLight',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'SemiBold',
  700: 'Bold',
  800: 'ExtraBold',
  900: 'Black',
};

/** What we ask a Google family for when the brand names no weights. */
export const DEFAULT_WEIGHTS: readonly number[] = [400, 500, 600, 700];

const LABEL_TO_WEIGHT: ReadonlyArray<[RegExp, number]> = [
  [/\b(thin|hairline)\b/, 100],
  [/\b(extra ?light|ultra ?light)\b/, 200],
  [/\b(semi ?bold|demi ?bold)\b/, 600],
  [/\b(extra ?bold|ultra ?bold)\b/, 800],
  [/\b(black|heavy)\b/, 900],
  [/\blight\b/, 300],
  [/\b(medium)\b/, 500],
  [/\b(bold)\b/, 700],
  [/\b(regular|normal|book)\b/, 400],
];

/**
 * The weights a brand DECLARED, as numbers.
 *
 * `BrandFont.weights` is free text — `"Regular · Medium · SemiBold"` from
 * one code path, `"400 · 500 · 600 · 700"` from another, `"Bold"` from a
 * filename. All three describe the same thing and all three have to reach
 * the exporter as a number, because that is what the CSS API speaks and
 * what `font-weight` speaks. Unparseable input falls back to the default
 * set rather than to nothing: shipping four weights nobody asked for is a
 * smaller failure than shipping one.
 */
export function parseWeights(spec: string | number[] | undefined | null): number[] {
  if (Array.isArray(spec)) {
    const nums = spec.filter((n) => Number.isFinite(n) && n >= 100 && n <= 900);
    return nums.length > 0 ? unique(nums).sort((a, b) => a - b) : [...DEFAULT_WEIGHTS];
  }
  if (!spec || typeof spec !== 'string') return [...DEFAULT_WEIGHTS];
  const out: number[] = [];
  for (const raw of spec.split(/[·,/|+&]|\s{2,}/)) {
    const token = raw.trim().toLowerCase();
    if (!token) continue;
    const numeric = token.match(/\b([1-9]00)\b/);
    if (numeric) {
      out.push(parseInt(numeric[1], 10));
      continue;
    }
    const named = LABEL_TO_WEIGHT.find(([re]) => re.test(token));
    if (named) out.push(named[1]);
  }
  return out.length > 0 ? unique(out).sort((a, b) => a - b) : [...DEFAULT_WEIGHTS];
}

/** The human name for a weight — "SemiBold", never "600" alone. */
export function weightLabel(weight: number): string {
  return WEIGHT_LABELS[weight] ?? String(weight);
}

function unique<T>(list: T[]): T[] {
  return Array.from(new Set(list));
}

/* ─── Where a family can come from ─────────────────────────────────── */

/**
 * Is this family on Google Fonts — decided offline, before any request.
 *
 * Re-exported from `@/shared/design-system/fonts`, which is where the
 * runtime `<link>` injector asks the SAME question. Two answers to "is
 * this family fetchable" is how a surface ends up drawing a notice that
 * says "not available" beside a network request for it.
 */
export { isGoogleFontFamily, canonicalGoogleFamily };

export type FontSource = 'uploaded' | 'google' | 'unavailable';

/**
 * Where this family's files come from — the ONE question every surface
 * asks. The tile draws a badge from it, the editor draws a notice, the
 * exporter decides whether to fetch, and all three agree because they read
 * the same function.
 */
export function fontSource(fam: {
  name?: string;
  family?: string;
  files?: BrandFontFile[] | undefined;
}): FontSource {
  if (fam.files && fam.files.length > 0) return 'uploaded';
  return isGoogleFontFamily(fam.name ?? fam.family) ? 'google' : 'unavailable';
}

/** The sentence a user is shown for a family we cannot obtain. */
export const UPLOAD_HINT = 'Upload your licensed copy in Setup → Typography.';

/* ─── woff2 → TTF ──────────────────────────────────────────────────── */

/** Lazy-loaded woff2 → TTF decoder. We use fonteditor-core's woff2tool,
 *  which wraps Google's wasm decoder. The wasm file itself lives in
 *  `/public/fonts/woff2.wasm` (copied from the fonteditor-core package so
 *  the exports-map restrictions don't block direct imports) and is fetched
 *  lazily on first use. Cached after init so repeated downloads in the
 *  same session reuse the same instance. */
type Woff2Tool = { decode: (buffer: ArrayBuffer | Uint8Array) => Uint8Array };
let woff2ToolPromise: Promise<Woff2Tool | null> | null = null;
async function getWoff2Tool(): Promise<Woff2Tool | null> {
  if (woff2ToolPromise) return woff2ToolPromise;
  woff2ToolPromise = (async () => {
    try {
      const { woff2 } = await import('fonteditor-core');
      await woff2.init('/fonts/woff2.wasm');
      return woff2 as unknown as Woff2Tool;
    } catch {
      return null;
    }
  })();
  return woff2ToolPromise;
}

async function decompressWoff2ToTtf(bytes: Uint8Array): Promise<Uint8Array | null> {
  const tool = await getWoff2Tool();
  if (!tool) return null;
  try {
    const out = tool.decode(bytes);
    return out instanceof Uint8Array ? out : new Uint8Array(out);
  } catch {
    return null;
  }
}

/* ─── Types ────────────────────────────────────────────────────────── */

export type FontExportFamily = {
  /** Display name to show in toasts / READMEs. */
  name: string;
  /** Files the user uploaded for this family in setup, if any. When
   *  present these are the source of truth — the export emits the exact
   *  bytes the user uploaded with no remote fetch. */
  files?: BrandFontFile[];
  /** The weights the brand declares. Free text or numbers; see
   *  `parseWeights`. Absent means "the usual four". */
  weights?: string | number[];
};

export type FontExportResult = {
  ok: string[];
  missing: string[];
};

export type GatheredFontFile = {
  baseName: string;
  ttfBytes: Uint8Array;
  /** The weight this cut is, when we know it (Google always tells us). */
  weight?: number;
  italic?: boolean;
};

function familyToFolderName(family: string): string {
  return family.trim().replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80) || 'Font';
}

/** "Plus Jakarta Sans" → "PlusJakartaSans", for filenames. */
function familyToFilePrefix(family: string): string {
  return (
    family
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join('') || 'Font'
  );
}

/** Decode a `data:font/...;base64,…` URL into a Uint8Array. Returns null
 *  if the URL isn't well-formed. */
function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  const meta = dataUrl.slice(5, comma); // strip "data:"
  const payload = dataUrl.slice(comma + 1);
  try {
    if (meta.includes(';base64')) {
      const binary = atob(payload);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    const decoded = decodeURIComponent(payload);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/* ─── The Google CSS API ───────────────────────────────────────────── */

export type GoogleFace = {
  weight: number;
  italic: boolean;
  /** The subset comment that preceded the block (`latin`, `greek`, …). */
  subset: string;
  url: string;
};

/**
 * Parse a `css2` payload into faces.
 *
 * Exported because it is the one piece worth testing without a network:
 * every filename, every `@font-face` rule and the latin choice are all
 * derived from what this returns.
 */
export function parseGoogleFontCss(css: string): GoogleFace[] {
  const blockRe = /(\/\*\s*([^*]*?)\s*\*\/\s*)?@font-face\s*\{([^}]*)\}/g;
  const faces: GoogleFace[] = [];
  let match: RegExpExecArray | null;
  while ((match = blockRe.exec(css)) !== null) {
    const subset = (match[2] ?? '').trim();
    const body = match[3];
    const urlMatch = body.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (!urlMatch) continue;
    const weightMatch = body.match(/font-weight:\s*(\d+)/);
    const italic = /font-style:\s*italic/i.test(body);
    faces.push({
      weight: weightMatch ? parseInt(weightMatch[1], 10) : 400,
      italic,
      subset,
      url: urlMatch[1],
    });
  }
  return faces;
}

/**
 * The Latin cut, one face per (weight, style).
 *
 * The CSS API answers with a face PER unicode range — `cyrillic-ext`,
 * `greek`, `vietnamese`, `latin`, `latin-ext`. Any of them is a valid font
 * file and all but one are useless for an English document: embedding
 * `cyrillic-ext` in the strategy PDF rendered every line as a lone `A`,
 * because that was the only glyph in it the text asked for. It also
 * multiplied the kit's `fonts/` folder by seven.
 *
 * `latin-ext` wins over bare `latin` — it is a superset. A payload with no
 * subset comments at all keeps whatever it has.
 */
export function pickLatinFaces(faces: GoogleFace[]): GoogleFace[] {
  const byCut = new Map<string, GoogleFace>();
  const rank = (subset: string): number => {
    const s = subset.toLowerCase();
    if (s === 'latin-ext') return 3;
    if (s === 'latin') return 2;
    if (!s) return 1;
    return 0;
  };
  for (const face of faces) {
    const key = `${face.weight}|${face.italic ? 'i' : 'n'}`;
    const incumbent = byCut.get(key);
    if (!incumbent || rank(face.subset) > rank(incumbent.subset)) byCut.set(key, face);
  }
  return Array.from(byCut.values()).sort(
    (a, b) => a.weight - b.weight || Number(a.italic) - Number(b.italic),
  );
}

function googleCssUrl(family: string, weights: number[]): string {
  const encoded = encodeURIComponent(family).replace(/%20/g, '+');
  // The discrete `wght@a;b;c` form is lenient about weights a family does
  // not own; the RANGE form (`100..900`) answers 400 for a static family,
  // which is exactly the console error this module refuses to produce.
  const axis = weights.length > 0 ? `:wght@${[...weights].sort((a, b) => a - b).join(';')}` : '';
  return `https://fonts.googleapis.com/css2?family=${encoded}${axis}&display=swap`;
}

/** The `<link>` a page uses to load this family from Google. */
export function googleEmbedHref(family: string, weights: number[]): string {
  return googleCssUrl(canonicalGoogleFamily(family) ?? family, weights);
}

/* ─── Gathering one family's files ─────────────────────────────────── */

export type GatheredFamily = {
  files: GatheredFontFile[];
  /** Kept for callers that pre-date the local builder. Always '' now: the
   *  CSS we ship is built from the files we actually wrote. */
  fontsCss: string;
  source: FontSource;
  /** Weights we asked for, and the ones we came back with. */
  requested: number[];
  delivered: number[];
};

/**
 * Every real file we can get for one family, as TTF-flavoured bytes.
 *
 * Uploaded files win — they are the licensed copy the user actually owns —
 * and Google is the fallback. Separated out because the bytes have a second
 * reader: the brand-strategy PDF embeds them so the document is set in the
 * brand's own typeface rather than in Helvetica.
 *
 * `latinOnly` defaults to TRUE. Seven subsets of the same face is not a
 * richer download, it is six files the recipient will never open.
 */
export async function gatherFamilyFiles(
  fam: FontExportFamily,
  options: { latinOnly?: boolean; signal?: AbortSignal } = {},
): Promise<GatheredFamily> {
  const latinOnly = options.latinOnly !== false;
  const requested = parseWeights(fam.weights);
  const strip = (n: string) => n.replace(/\.(woff2?|eot|ttf|otf)$/i, '');
  const source = fontSource(fam);

  if (source === 'uploaded') {
    const files: GatheredFontFile[] = [];
    for (const file of fam.files ?? []) {
      const bytes = dataUrlToBytes(file.dataUrl);
      if (!bytes) continue;
      let ttf = bytes;
      if (file.format === 'woff2' || file.format === 'woff') {
        const decoded = await decompressWoff2ToTtf(bytes);
        if (!decoded) continue; // skip files we couldn't decompress
        ttf = decoded;
      }
      const weight = parseWeights(file.weight)[0];
      files.push({ baseName: strip(file.name), ttfBytes: ttf, weight });
    }
    return {
      files,
      fontsCss: '',
      source,
      requested,
      delivered: unique(files.map((f) => f.weight ?? 400)).sort((a, b) => a - b),
    };
  }

  if (source === 'unavailable') {
    // Never asked for. A foundry family is not on Google, and a 400 in the
    // user's console is not a diagnosis — the UI notice is.
    return { files: [], fontsCss: '', source, requested, delivered: [] };
  }

  const family = canonicalGoogleFamily(fam.name) ?? fam.name;
  const prefix = familyToFilePrefix(family);
  const files: GatheredFontFile[] = [];
  try {
    const res = await fetch(googleCssUrl(family, requested), { signal: options.signal });
    if (!res.ok) return { files, fontsCss: '', source, requested, delivered: [] };
    const css = await res.text();
    const all = parseGoogleFontCss(css);
    const faces = latinOnly ? pickLatinFaces(all) : all;
    for (const face of faces) {
      if (options.signal?.aborted) break;
      try {
        const fileRes = await fetch(face.url, { signal: options.signal });
        if (!fileRes.ok) continue;
        const decoded = await decompressWoff2ToTtf(new Uint8Array(await fileRes.arrayBuffer()));
        if (!decoded) continue;
        const label = weightLabel(face.weight) + (face.italic ? 'Italic' : '');
        const subsetSuffix =
          latinOnly || !face.subset
            ? ''
            : `-${face.subset.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        files.push({
          baseName: `${prefix}-${label}${subsetSuffix}`,
          ttfBytes: decoded,
          weight: face.weight,
          italic: face.italic,
        });
      } catch {
        // One cut failing is not the family failing.
      }
    }
  } catch {
    // Offline, or the request was aborted. The family is reported missing.
  }
  return {
    files,
    fontsCss: '',
    source,
    requested,
    delivered: unique(files.map((f) => f.weight ?? 400)).sort((a, b) => a - b),
  };
}

/* ─── The paperwork ────────────────────────────────────────────────── */

/** A `@font-face` block per file, pointing at the files beside it. */
export function buildFontsCss(family: string, files: GatheredFontFile[]): string {
  const parts = [`/* ${family} — BrandingOS brand kit */`, ''];
  for (const file of files) {
    parts.push(
      [
        '@font-face {',
        `  font-family: '${family}';`,
        `  font-style: ${file.italic ? 'italic' : 'normal'};`,
        `  font-weight: ${file.weight ?? 400};`,
        '  font-display: swap;',
        `  src: url('./${file.baseName}.ttf') format('truetype');`,
        '}',
        '',
      ].join('\n'),
    );
  }
  return parts.join('\n');
}

/** A page that proves the files work, and can be pasted into a real one. */
export function buildEmbedHtml(
  family: string,
  files: GatheredFontFile[],
  source: FontSource,
): string {
  const head =
    source === 'google'
      ? `    <!-- Hosted: no files needed. -->\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link rel="stylesheet" href="${googleEmbedHref(
          family,
          unique(files.map((f) => f.weight ?? 400)),
        )}">\n    <!-- Self-hosted: use the files in this folder instead. -->\n    <!-- <link rel="stylesheet" href="./fonts.css"> -->`
      : `    <link rel="stylesheet" href="./fonts.css">`;
  const samples = files
    .map(
      (f) =>
        `      <p style="font-family: '${family}', sans-serif; font-weight: ${
          f.weight ?? 400
        }; font-style: ${f.italic ? 'italic' : 'normal'}; font-size: 28px; margin: 0 0 8px;">` +
        `${family} ${weightLabel(f.weight ?? 400)}${f.italic ? ' Italic' : ''}</p>`,
    )
    .join('\n');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8">',
    `    <title>${family} — specimen</title>`,
    head,
    '  </head>',
    '  <body style="margin: 40px; background: #fff; color: #111;">',
    samples || `      <p>No files were bundled for ${family}.</p>`,
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

/** Where the licence lives. We never ship one — we do not own it. */
export function buildLicenseNote(family: string, source: FontSource): string {
  if (source === 'google') {
    return [
      `# ${family} — licence`,
      '',
      `${family} is served by Google Fonts and is open source. The exact licence`,
      '(usually SIL Open Font License 1.1, occasionally Apache 2.0) ships with the',
      'family and is stated on its Google Fonts page:',
      '',
      `  https://fonts.google.com/specimen/${encodeURIComponent(
        (canonicalGoogleFamily(family) ?? family).replace(/\s+/g, '+'),
      )}`,
      '',
      'Open source does not mean unattributed. Keep the licence file with the font',
      'files if you redistribute them.',
      '',
    ].join('\n');
  }
  if (source === 'uploaded') {
    return [
      `# ${family} — licence`,
      '',
      'These are the files you uploaded. BrandingOS makes no claim about their',
      'licence and ships none: whatever you bought or were granted governs what',
      'you may do with them, including whether you may pass this folder on.',
      '',
      'Check your licence before sharing this bundle outside your organisation.',
      '',
    ].join('\n');
  }
  return [
    `# ${family} — licence`,
    '',
    `No files are bundled for ${family}. ${UPLOAD_HINT}`,
    '',
  ].join('\n');
}

/** The note left in a folder we could not fill. */
function buildMissingReadme(family: string): string {
  return [
    `${family} — no files bundled.`,
    '',
    `${family} is not on Google Fonts, so there is nothing we can legally or`,
    'technically fetch for you. It is almost certainly a commercial / foundry',
    'licensed family.',
    '',
    `To include it in this bundle: ${UPLOAD_HINT}`,
    'The next export will then ship the exact files you provided.',
    '',
  ].join('\n');
}

/** The zip's front page: what shipped, what did not, and why. */
export function buildFontsReadme(
  entries: Array<{
    name: string;
    source: FontSource;
    requested: number[];
    delivered: number[];
  }>,
): string {
  const lines = ['# Typefaces', ''];
  for (const entry of entries) {
    lines.push(`## ${entry.name}`);
    if (entry.delivered.length > 0) {
      lines.push(
        `- Files: ${entry.delivered
          .map((w) => `${weightLabel(w)} (${w})`)
          .join(', ')}`,
      );
      const short = entry.requested.filter((w) => !entry.delivered.includes(w));
      if (short.length > 0) {
        lines.push(
          `- Not available in this family: ${short
            .map((w) => `${weightLabel(w)} (${w})`)
            .join(', ')}`,
        );
      }
      lines.push(
        entry.source === 'google'
          ? '- Source: Google Fonts. `embed.html` shows both the hosted `<link>` and the self-hosted `fonts.css`.'
          : '- Source: the files you uploaded. `fonts.css` wires them up.',
      );
    } else {
      lines.push(`- **No files.** ${UPLOAD_HINT}`);
    }
    lines.push('');
  }
  lines.push('Every folder carries `fonts.css`, `embed.html` and `LICENSE-NOTE.md`.');
  lines.push('');
  return lines.join('\n');
}

/* ─── Writing the zip ──────────────────────────────────────────────── */

export async function downloadFontsBundle(
  families: FontExportFamily[],
  zipName: string,
  options: { flatten?: boolean } = {},
): Promise<FontExportResult> {
  if (families.length === 0) return { ok: [], missing: [] };
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const result = await addFontFamiliesToZip(zip, families, options);
  if (result.ok.length === 0 && (options.flatten === true || result.missing.length === 0)) {
    // Single-font path or zero-input — nothing useful to ship, skip the
    // empty zip. The bulk path with `missing.length > 0` still produces a
    // ZIP whose folders carry a README so the user sees every family they
    // declared, and what to do about the ones we could not fetch.
    return result;
  }
  triggerBlobDownload(await zip.generateAsync({ type: 'blob' }), `${zipName}.zip`);
  return result;
}

/**
 * Write font families into an EXISTING zip root.
 *
 * The whole-kit export needs the real font FILES, not a manifest naming
 * them: a brand kit whose `fonts/` folder is one line of text has not
 * exported the typography. Google-hosted families are fetched here for the
 * same reason the dedicated Fonts download fetches them — the user asked
 * for the font, and "it's on Google" is not a font.
 */
export async function addFontFamiliesToZip(
  zip: ZipFolder,
  families: FontExportFamily[],
  options: { flatten?: boolean; signal?: AbortSignal; lean?: boolean } = {},
): Promise<FontExportResult> {
  const ok: string[] = [];
  const missing: string[] = [];
  if (families.length === 0) return { ok, missing };
  // For single-font downloads (the editor footer button), the ZIP is
  // already named after the family so a wrapping folder is just noise. The
  // bulk download (drilldown header) keeps the per-family folders so all
  // fonts stay organized.
  const flatten = options.flatten === true && families.length === 1;
  const manifest: Array<{
    name: string;
    source: FontSource;
    requested: number[];
    delivered: number[];
  }> = [];

  for (const fam of families) {
    const gathered = await gatherFamilyFiles(fam, { signal: options.signal });
    const fileEntries = gathered.files;
    manifest.push({
      name: fam.name,
      source: gathered.source,
      requested: gathered.requested,
      delivered: gathered.delivered,
    });

    // When flattening (single-font download) we don't have an outer folder
    // to put a README in, so empty downloads simply bail. For the bulk path
    // we still create the family folder so the user sees every font they
    // declared, with a README pointing at the upload step.
    if (fileEntries.length === 0) {
      missing.push(fam.name);
      if (!flatten) {
        const root = zip.folder(familyToFolderName(fam.name));
        if (root) {
          zipAdd(root, 'README.txt', buildMissingReadme(fam.name));
          zipAdd(root, 'LICENSE-NOTE.md', buildLicenseNote(fam.name, gathered.source));
        }
      }
      continue;
    }

    const root = flatten ? zip : zip.folder(familyToFolderName(fam.name));
    if (!root) {
      missing.push(fam.name);
      continue;
    }
    // One file per cut, at the family's own root. There is deliberately no
    // second copy under a different extension: an `.otf` that is a renamed
    // `.ttf` is not an OpenType font, it is a file that fails to install.
    const used = new Set<string>();
    const written: GatheredFontFile[] = [];
    for (const entry of fileEntries) {
      let name = `${entry.baseName}.ttf`;
      let n = 2;
      while (used.has(name)) {
        name = `${entry.baseName}-${n}.ttf`;
        n += 1;
      }
      used.add(name);
      zipAdd(root, name, entry.ttfBytes);
      written.push({ ...entry, baseName: name.replace(/\.ttf$/i, '') });
    }
    zipAdd(root, 'fonts.css', buildFontsCss(fam.name, written));
    zipAdd(root, 'LICENSE-NOTE.md', buildLicenseNote(fam.name, gathered.source));
    // The specimen page is the one thing a whole-kit export can do without:
    // it is a per-family page, and the kit already carries every deliverable.
    if (!options.lean) {
      zipAdd(root, 'embed.html', buildEmbedHtml(fam.name, written, gathered.source));
    }
    ok.push(fam.name);
  }

  if (!flatten) zipAdd(zip, 'README.md', buildFontsReadme(manifest));

  return { ok, missing };
}
