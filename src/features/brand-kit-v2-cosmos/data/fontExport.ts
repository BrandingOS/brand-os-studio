import { fetchGoogleFontPackage } from '@/features/setup/utils/downloads';
import type { BrandFontFile } from '@/features/setup/data/mockBrand';
import { triggerBlobDownload } from './colorPaletteExport';

/** Lazy-loaded woff2 → TTF decoder. We use fonteditor-core's
 *  woff2tool, which wraps Google's wasm decoder. The wasm file
 *  itself lives in `/public/fonts/woff2.wasm` (copied from the
 *  fonteditor-core package so the exports-map restrictions don't
 *  block direct imports) and is fetched lazily on first use.
 *  Cached after init so repeated downloads in the same session
 *  reuse the same instance. */
type Woff2Tool = { decode: (buffer: ArrayBuffer | Uint8Array) => Uint8Array };
let woff2ToolPromise: Promise<Woff2Tool | null> | null = null;
async function getWoff2Tool(): Promise<Woff2Tool | null> {
  if (woff2ToolPromise) return woff2ToolPromise;
  woff2ToolPromise = (async () => {
    try {
      const { woff2 } = await import('fonteditor-core');
      // Static URL — the file is shipped from `public/fonts/woff2.wasm`.
      // fonteditor-core's `init` accepts either a URL string or an
      // ArrayBuffer; the URL path lets the browser cache it.
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

/**
 * Fonts drilldown export pipeline.
 *
 *   {brand}-fonts.zip
 *     {Family Name}/
 *       {Family-Weight}.ttf  (or .otf / .woff / .woff2 — whichever
 *                             format the source actually is)
 *       fonts.css            — drop-in @font-face block for web.
 *
 * Strategy: ship the bytes in whatever format we have, with the
 * correct extension. We DON'T try to convert woff2 → TTF in the
 * browser — emscripten-based decoders (wawoff2) are flaky to bundle
 * with Vite, and shipping a "broken" .ttf is worse than shipping a
 * working .woff2.
 *
 * Source priority:
 *   1. `BrandFont.files` — files the user uploaded in setup. Bytes
 *      and extension preserved exactly.
 *   2. `fetchGoogleFontPackage(family)` — Google-Fonts CSS API
 *      returns woff2 with proper CORS; we ship those as .woff2.
 *      gwfh's TTF path is included if it happened to work (CORS is
 *      the usual reason it doesn't).
 *
 * Commercial fonts (GT Super, foundry-only faces) end up in
 * `missing` so the caller can prompt the user to upload them.
 */

export type FontExportFamily = {
  /** Display name to show in toasts / READMEs. */
  name: string;
  /** Files the user uploaded for this family in setup, if any. When
   *  present these are the source of truth — the export emits the
   *  exact bytes the user uploaded with no remote fetch. */
  files?: BrandFontFile[];
};

export type FontExportResult = {
  ok: string[];
  missing: string[];
};

function familyToFolderName(family: string): string {
  return family.trim().replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 80) || 'Font';
}

/** Decode a `data:font/...;base64,…` URL into a Uint8Array. Returns
 *  null if the URL isn't well-formed. */
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
    // Rare non-base64 path (e.g. percent-encoded text) — unlikely for
    // fonts but handle gracefully.
    const decoded = decodeURIComponent(payload);
    const bytes = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}


export async function downloadFontsBundle(
  families: FontExportFamily[],
  zipName: string,
  options: { flatten?: boolean } = {},
): Promise<FontExportResult> {
  const ok: string[] = [];
  const missing: string[] = [];
  if (families.length === 0) return { ok, missing };

  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  // For single-font downloads (the editor footer button), the ZIP
  // is already named after the family so a wrapping folder is just
  // noise. The bulk download (drilldown header) keeps the per-family
  // folders so all fonts stay organized.
  const flatten = options.flatten === true && families.length === 1;

  for (const fam of families) {
    // Each entry tracks the original filename + the TTF-flavored
    // bytes (decompressed if the source was woff/woff2). The same
    // bytes go to the OTF folder under .otf — OpenType containers
    // accept both extensions, no conversion needed.
    const fileEntries: Array<{ baseName: string; ttfBytes: Uint8Array }> = [];
    let fontsCss = '';

    // Prefer the user-uploaded files when the family has any.
    if (fam.files && fam.files.length > 0) {
      for (const file of fam.files) {
        const bytes = dataUrlToBytes(file.dataUrl);
        if (!bytes) continue;
        let ttf = bytes;
        if (file.format === 'woff2' || file.format === 'woff') {
          const decoded = await decompressWoff2ToTtf(bytes);
          if (decoded) ttf = decoded;
          else continue; // skip files we couldn't decompress
        }
        const baseName = file.name.replace(/\.(woff2?|eot|ttf|otf)$/i, '');
        fileEntries.push({ baseName, ttfBytes: ttf });
      }
    } else {
      // No uploads — fall back to Google Fonts. CSS API returns
      // woff2; we decompress to TTF so the user gets the format
      // they asked for.
      try {
        const pkg = await fetchGoogleFontPackage(fam.name);
        if (pkg) {
          for (const f of pkg.ttfFiles) {
            const bytes = new Uint8Array(await f.blob.arrayBuffer());
            const baseName = f.name.replace(/\.(woff2?|eot|ttf|otf)$/i, '');
            fileEntries.push({ baseName, ttfBytes: bytes });
          }
          for (const f of pkg.woff2Files) {
            const bytes = new Uint8Array(await f.blob.arrayBuffer());
            const decoded = await decompressWoff2ToTtf(bytes);
            if (!decoded) continue;
            const baseName = f.name.replace(/\.(woff2?|eot|ttf|otf)$/i, '');
            fileEntries.push({ baseName, ttfBytes: decoded });
          }
          fontsCss = pkg.fontsCss ?? '';
        }
      } catch {
        // Fall through to "missing" — the family had no upload AND
        // the remote fetch failed (network / CORS / unknown family).
      }
    }

    // When flattening (single-font download) we don't have an
    // outer folder to put a README in, so empty downloads simply
    // bail. For the bulk path we still create the family folder so
    // the user sees every font they declared, with a README.txt
    // pointing at the upload step for the ones we couldn't fetch.
    if (fileEntries.length === 0) {
      missing.push(fam.name);
      if (!flatten) {
        const root = zip.folder(familyToFolderName(fam.name));
        root?.file(
          'README.txt',
          [
            `${fam.name} — couldn't be downloaded automatically.`,
            '',
            "This font isn't available on Google Fonts (it's likely a commercial / foundry-licensed family).",
            'To include it in this bundle, upload your licensed copy in Setup → Typography.',
            'Once uploaded, the next export will include the file you provided.',
          ].join('\n'),
        );
      }
      continue;
    }

    // When flattening, write TTF/ and OTF/ at the zip root; otherwise
    // wrap them in a family-named folder so multiple families don't
    // collide on filename.
    const root = flatten ? zip : zip.folder(familyToFolderName(fam.name));
    if (!root) {
      missing.push(fam.name);
      continue;
    }
    const ttfDir = root.folder('TTF');
    const otfDir = root.folder('OTF');
    // Drop duplicates that would collide on disk (e.g. when both
    // ttfFiles and woff2Files emit the same Family-Weight pair).
    const usedTtf = new Set<string>();
    for (const entry of fileEntries) {
      let name = `${entry.baseName}.ttf`;
      let n = 2;
      while (usedTtf.has(name)) {
        name = `${entry.baseName}-${n}.ttf`;
        n += 1;
      }
      usedTtf.add(name);
      ttfDir?.file(name, entry.ttfBytes);
      otfDir?.file(name.replace(/\.ttf$/i, '.otf'), entry.ttfBytes);
    }
    if (fontsCss) {
      root.file('fonts.css', fontsCss);
    }
    ok.push(fam.name);
  }

  if (ok.length === 0 && (flatten || missing.length === 0)) {
    // Single-font path or zero-input — nothing useful to ship,
    // skip the empty zip. The bulk path with `missing.length > 0`
    // still produces a ZIP whose folders carry README.txt's so the
    // user sees every family they declared.
    return { ok, missing };
  }

  triggerBlobDownload(await zip.generateAsync({ type: 'blob' }), `${zipName}.zip`);
  return { ok, missing };
}
