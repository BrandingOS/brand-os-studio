/**
 * Writing files into a zip, at the right cost.
 *
 * Separate from `kitExport.ts` because `fontExport.ts` needs the same
 * folder type and `kitExport` imports `fontExport` — one shared leaf
 * instead of a cycle.
 */
/* ─── Compression policy ──────────────────────────────────────────── */

/**
 * Extensions whose bytes are ALREADY a compressed stream.
 *
 * DEFLATE over these is pure main-thread cost: a PNG typically shrinks by
 * a fraction of a percent, a WOFF2 by none at all, and a kit full of
 * rasterized deliverables is nearly all of them.
 */
const STORED_EXTENSIONS: ReadonlySet<string> = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'zip', 'pdf', 'ai', 'mp4', 'webm', 'mov', 'mp3',
]);

export type ZipCompression = 'STORE' | 'DEFLATE';

/** STORE for bytes that are already compressed, DEFLATE for text. */
export function compressionFor(filename: string): ZipCompression {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return STORED_EXTENSIONS.has(ext) ? 'STORE' : 'DEFLATE';
}

export type ZipFolder = {
  file: (
    name: string,
    data: Blob | string | Uint8Array,
    options?: { compression?: ZipCompression },
  ) => unknown;
  folder: (name: string) => ZipFolder | null;
};

/** Add a file under the right compression for its type. */
export function zipAdd(
  folder: ZipFolder,
  name: string,
  data: Blob | string | Uint8Array,
): void {
  folder.file(name, data, { compression: compressionFor(name) });
}

/** Something an export could not include, and why — surfaced, never silent. */
export type ExportSkip = { label: string; reason: string };

/**
 * A folder that only exists once something is put in it.
 *
 * `zip.folder(name)` writes the directory entry immediately, so a brand
 * with no icons shipped `icons/SVG/`, `icons/PNG/` and `icons/JPG/`, all
 * empty. Three empty folders read as "the export lost my icons", which is
 * a worse message than their simply not being there.
 */
export function lazyFolder(parent: ZipFolder, name: string): ZipFolder {
  let real: ZipFolder | null = null;
  const open = (): ZipFolder | null => (real ??= parent.folder(name));
  return {
    file: (...args) => open()?.file(...args),
    folder: (child) => {
      const dir = open();
      return dir ? lazyFolder(dir, child) : null;
    },
  };
}
