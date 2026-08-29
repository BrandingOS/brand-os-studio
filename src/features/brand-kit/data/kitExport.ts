/**
 * Brand Kit bundle exports (KIT-02 / KIT-03).
 *
 * The per-folder builders every kit export shares. `exportEverything.tsx`
 * walks the catalog and calls these for the Brand Assets half; the card
 * downloads call them one at a time; `downloadKitZip` is the assets-only
 * bundle three other surfaces still ask for by name.
 *
 * Two rules live here rather than in any one caller:
 *
 *  • **A logo file is the logo, not a wrapper around its URL.** Setup
 *    hands the Brand Kit each variant as `<svg><rect/><image href="…"/></svg>`
 *    so a tile can paint it on a ground. That wrapper is a PREVIEW. Zipped
 *    verbatim it produces an `.svg` that points at a URL the recipient
 *    cannot resolve, and a `.png` that is blank — Chromium does not paint
 *    an embedded `<image>` when the SVG is loaded through `<img>`, which
 *    is the only path `rasterizeSvg` has. So the export pulls the href out
 *    and ships the referenced bytes under their true extension.
 *
 *  • **Already-compressed bytes are STOREd, never DEFLATEd.** PNG, JPEG
 *    and the font containers are compressed streams; re-running DEFLATE
 *    over them costs the main thread real time for approximately zero
 *    bytes saved, and that time is the freeze the user feels.
 */
import type { MockBrand } from '@/features/setup/data/mockBrand';
import {
  buildBaseColorSvg,
  buildShadeRows,
  buildShadesSvg,
  paletteFromMockBrand,
  rasterizeSvg,
  triggerBlobDownload,
  type PaletteColor,
} from './colorPaletteExport';
import { buildAseBlob, buildColorsReadme, buildTokenFiles } from './tokensExport';
import { addFontFamiliesToZip } from './fontExport';
import { lazyFolder, zipAdd, type ExportSkip, type ZipFolder } from './zipFile';
import { yieldToBrowser, throwIfAborted } from './exportScheduler';

export function slugifyName(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  // A name made entirely of punctuation slugged to a run of dashes and
  // sailed past the `|| 'brand'` guard, so the download landed as
  // `--brand-kit.zip`. The guard means "nothing usable survived".
  return /[a-z0-9]/.test(slug) ? slug : 'brand';
}

/**
 * Flatten the mock brand's palette into the exporter's shape.
 *
 * Two things changed here and both were defects the audit measured:
 *
 *  • Roles came from the POSITION in `colors.core`, so a brand with
 *    seven colours exported "Core 4 … Core 7" into every tile and into
 *    `brand.json` (D40). `paletteFromMockBrand` names what a colour
 *    does instead.
 *  • The 32-step generated grey ladder was flattened in as first-class
 *    brand colours, which is most of why the Colors download was 320
 *    files and 13 MB (D37). It is opt-in now — a bundle that claims to
 *    be the brand's palette should contain the brand's palette.
 */
export function paletteOf(
  brand: MockBrand,
  opts?: { includeNeutrals?: boolean },
): PaletteColor[] {
  return paletteFromMockBrand(brand, { includeNeutrals: opts?.includeNeutrals ?? false });
}

export {
  compressionFor,
  lazyFolder,
  zipAdd,
  type ExportSkip,
  type ZipCompression,
  type ZipFolder,
} from './zipFile';

/* ─── Logos ───────────────────────────────────────────────────────── */

/**
 * The URL a Setup logo tile paints, pulled back out of its wrapper.
 *
 * Returns null for artwork that IS the SVG — the generated lettermark a
 * brand with no logo falls back to. That one rasterizes correctly and
 * ships as-is.
 */
export function extractLogoHref(svg: string): string | null {
  const match =
    /<image\b[^>]*?\sxlink:href\s*=\s*"([^"]*)"/i.exec(svg) ??
    /<image\b[^>]*?\shref\s*=\s*"([^"]*)"/i.exec(svg);
  const href = match?.[1]?.trim();
  return href ? href : null;
}

/** File extension for a logo URL — the path first, the mime type second. */
export function logoExtension(url: string, mime?: string): string {
  const fromMime: Record<string, string> = {
    'image/svg+xml': 'svg',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  if (!url.startsWith('data:')) {
    const path = url.split(/[?#]/)[0];
    const ext = path.split('.').pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{2,5}$/.test(ext) && ext !== 'com') return ext === 'jpeg' ? 'jpg' : ext;
  }
  const declared = mime?.split(';')[0]?.trim().toLowerCase();
  if (declared && fromMime[declared]) return fromMime[declared];
  if (url.startsWith('data:')) {
    const inline = url.slice(5).split(/[;,]/)[0].toLowerCase();
    if (fromMime[inline]) return fromMime[inline];
  }
  return 'png';
}

/**
 * Add every logo variant into a zip folder as its REAL file.
 *
 * One file per variant, under the variant's own name, with the extension
 * the source actually has. A variant whose bytes cannot be fetched is
 * reported rather than shipped as a blank tile.
 */
export async function addLogosToZip(
  folder: ZipFolder,
  brand: MockBrand,
  signal?: AbortSignal,
): Promise<{ added: number; skipped: ExportSkip[] }> {
  let added = 0;
  const skipped: ExportSkip[] = [];
  const used = new Set<string>();
  for (const logo of brand.logos) {
    throwIfAborted(signal);
    if (!logo.svg) continue;
    const label = logo.label || logo.id || `logo-${added + 1}`;
    let base = slugifyName(label);
    let n = 2;
    while (used.has(base)) {
      base = `${slugifyName(label)}-${n}`;
      n += 1;
    }
    used.add(base);

    const href = extractLogoHref(logo.svg);
    if (!href) {
      // A genuine SVG (the generated lettermark) — ship it, and a raster
      // beside it, because this one really does rasterize.
      zipAdd(folder, `${base}.svg`, logo.svg);
      try {
        const { png } = await rasterizeSvg(logo.svg, 600, 600);
        if (png) zipAdd(folder, `${base}.png`, png);
      } catch {
        // Exotic markup — the .svg still ships.
      }
      added += 1;
      continue;
    }

    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error(`${res.status}`);
      const blob = await res.blob();
      if (blob.size === 0) throw new Error('empty');
      zipAdd(folder, `${base}.${logoExtension(href, blob.type)}`, blob);
      added += 1;
    } catch {
      skipped.push({
        label: `Logo — ${label}`,
        reason: "the file couldn't be read from storage",
      });
    }
    await yieldToBrowser(signal);
  }
  return { added, skipped };
}

/* ─── Colors ──────────────────────────────────────────────────────── */

/**
 * The kit's `colors/` folder — the LEAN set plus the developer handoff.
 *
 * Per colour: the swatch as SVG + PNG and its shade ladder as SVG.
 * Alongside them: `tokens.css` / `tokens.scss` / `tokens.json`
 * (and the Tailwind, Figma and ASE forms, because a palette a designer
 * cannot load into Illustrator is a palette they re-type), plus a
 * README that names every colour's role, its RGB/CMYK/HSL and how it
 * behaves on white and on black.
 *
 * No JPG, no `.ai`, no generated greys — that combination is what made
 * this folder 12–13 MB across 300+ files (D37/D38).
 */
export async function addColorsToZip(
  folder: ZipFolder,
  brand: MockBrand,
  signal?: AbortSignal,
): Promise<number> {
  const kitColors: PaletteColor[] = paletteFromMockBrand(brand);
  if (kitColors.length === 0) return 0;
  const used = new Set<string>();
  let added = 0;
  for (const color of kitColors) {
    throwIfAborted(signal);
    let folderName = color.name;
    let n = 2;
    while (used.has(folderName)) {
      folderName = `${color.name} ${n}`;
      n += 1;
    }
    used.add(folderName);
    const dir = folder.folder(folderName);
    if (!dir) continue;
    const safe = slugifyName(folderName);
    const baseSvg = buildBaseColorSvg(color);
    zipAdd(dir, `${safe}.svg`, baseSvg);
    const { png } = await rasterizeSvg(baseSvg, 600, 400);
    if (png) zipAdd(dir, `${safe}.png`, png);
    zipAdd(dir, `${safe}-shades.svg`, buildShadesSvg(buildShadeRows(color.hex, color.name)));
    added += 1;
    await yieldToBrowser(signal);
  }
  for (const { path, text } of buildTokenFiles(kitColors, brand.name)) {
    zipAdd(folder, path, text);
  }
  const ase = buildAseBlob(kitColors);
  if (ase) zipAdd(folder, 'palette.ase', ase);
  zipAdd(folder, 'README.md', buildColorsReadme(kitColors, brand.name));
  return added;
}

/* ─── Fonts ───────────────────────────────────────────────────────── */

/**
 * The kit's font folder: one folder per family holding the real files —
 * uploaded bytes where the user gave us any, every declared weight fetched
 * from Google otherwise — each with a `fonts.css` and a licence note, and a
 * `README.md` naming what shipped and what did not.
 *
 * `lean: true` drops only the per-family `embed.html` specimen page; the
 * files, the CSS and the licence note are the point of the folder and a kit
 * export that thins them out has not exported the typography.
 */
export async function addFontsToZip(
  folder: ZipFolder,
  brand: MockBrand,
  signal?: AbortSignal,
): Promise<{ added: number; skipped: ExportSkip[] }> {
  const skipped: ExportSkip[] = [];
  if (brand.fonts.length === 0) return { added: 0, skipped };

  // The real files — uploaded bytes where the user gave us any, fetched
  // from Google otherwise. `addFontFamiliesToZip` is the same builder the
  // dedicated Fonts download uses, so the kit cannot ship a thinner
  // typography folder than the Typography card does.
  const result = await addFontFamiliesToZip(
    folder,
    // The DECLARED weights travel with the family. Without them the
    // exporter could only guess, and the guess is what made the kit's old
    // manifest claim four weights over a folder holding Regular.
    brand.fonts.map((f) => ({ name: f.family, files: f.files, weights: f.weights })),
    { signal, lean: true },
  );
  for (const name of result.missing) {
    skipped.push({
      label: `Typeface — ${name}`,
      reason: 'it is a licensed family; upload your copy in Setup → Typography',
    });
  }
  throwIfAborted(signal);

  // No `fonts.txt`. It restated the brand's weight string next to a folder
  // that did not contain those weights — a manifest that disagrees with the
  // files beside it is worse than no manifest. `addFontFamiliesToZip` writes
  // a README.md naming what actually shipped, per family, and why anything
  // is missing.
  return { added: result.ok.length, skipped };
}

/* ─── About + brand.json ──────────────────────────────────────────── */

/** Markdown document of the brand's About sections + voice. */
export function buildAboutMarkdown(brand: MockBrand): string {
  const lines: string[] = [`# ${brand.name}`, ''];
  for (const entry of brand.about) {
    if (!entry.content.trim()) continue;
    lines.push(`## ${entry.title}`, '', entry.content.trim(), '');
  }
  if (brand.voice?.essay?.trim()) {
    lines.push('## Voice', '', brand.voice.essay.trim(), '');
  }
  return lines.join('\n');
}

/** The machine-readable summary that sits at the root of every bundle. */
export function buildBrandJson(brand: MockBrand): string {
  return JSON.stringify(
    {
      name: brand.name,
      colors: paletteOf(brand),
      fonts: brand.fonts.map((f) => ({ family: f.family, weights: f.weights })),
      icons: brand.icons,
      about: brand.about,
      strategy: brand.strategy,
    },
    null,
    2,
  );
}

/* ─── Whole-bundle helpers ────────────────────────────────────────── */

/** Zip of logo variants only (the Logos card download). */
export async function downloadLogosZip(brand: MockBrand): Promise<number> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const { added } = await addLogosToZip(zip as unknown as ZipFolder, brand);
  if (added === 0) return 0;
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, `${slugifyName(brand.name)}-logos.zip`);
  return added;
}

/** The About card download — a .md file. */
export function downloadAboutDoc(brand: MockBrand): void {
  const md = buildAboutMarkdown(brand);
  triggerBlobDownload(
    new Blob([md], { type: 'text/markdown;charset=utf-8' }),
    `${slugifyName(brand.name)}-about.md`,
  );
}

/**
 * The brand-assets bundle: colors/, fonts/, logos/, about.md, brand.json.
 *
 * Still called by name from the Kit library and the lifecycle page, which
 * append their own approved deliverables through `extraFiles`. The
 * catalog-wide export lives in `exportEverything.tsx` and reuses the very
 * same folder builders, so the two cannot drift.
 */
export async function downloadKitZip(
  brand: MockBrand,
  opts?: {
    onProgress?: (step: string) => void;
    /** Pre-built files appended verbatim (e.g. `deliverables/…png`
     *  snapshots of the user's approved kit items). */
    extraFiles?: Array<{ path: string; blob: Blob }>;
  },
): Promise<void> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const root = zip as unknown as ZipFolder;

  opts?.onProgress?.('colors');
  const colorsDir = root.folder('colors');
  if (colorsDir) await addColorsToZip(colorsDir, brand);

  opts?.onProgress?.('fonts');
  const fontsDir = root.folder('fonts');
  if (fontsDir) await addFontsToZip(fontsDir, brand);

  opts?.onProgress?.('logos');
  const logosDir = root.folder('logos');
  if (logosDir) await addLogosToZip(logosDir, brand);

  opts?.onProgress?.('about');
  zipAdd(root, 'about.md', buildAboutMarkdown(brand));
  zipAdd(root, 'brand.json', buildBrandJson(brand));

  for (const extra of opts?.extraFiles ?? []) {
    zipAdd(root, extra.path, extra.blob);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  triggerBlobDownload(blob, `${slugifyName(brand.name)}-brand-kit.zip`);
}
