// Two things a document needs doing to it around load and save, both of
// which were simply absent.
//
// THUMBNAILS. Nothing in the product has ever produced one. `designs`
// has had a `thumbnail_url` column since migration 015 and
// `DesignSummary.thumbnailUrl` has been part of the storage contract
// just as long, but the only value ever written was copied from the
// template a design was seeded from — so every design anyone actually
// made showed a grey placeholder in the grid for ever.
//
// EXPIRING IMAGES. A generated image's `src` is a SIGNED URL with a
// seven-day life. The durable `storagePath` is recorded beside it in
// `metadata.ai.generations` — explicitly "re-signable when the URL
// expires" — and nothing ever re-signed it. Every AI design silently
// turned into broken images a week after it was made, in the editor, in
// exports, and in the saved document itself.

import type { BrandOSDocument, ImageLayer, Layer } from '@/features/editor/schema';
import type { DocumentAdapter } from '@/features/editor/adapter/DocumentAdapter';
import { generationForPage } from '@/features/editor/shell/v2/panels/generate/aiMetadata';

/** Long edge of a stored thumbnail, in pixels. */
export const THUMBNAIL_EDGE = 320;

/**
 * A small JPEG of the active page, as a data URL.
 *
 * Returns null rather than throwing on ANY failure. A thumbnail is a
 * convenience; a design that cannot produce one must still save. The
 * realistic failure is a tainted canvas — one cross-origin image
 * without CORS headers makes `toDataURL` throw `SecurityError` for the
 * whole surface.
 */
export async function makeThumbnail(
  adapter: DocumentAdapter,
  doc: BrandOSDocument,
): Promise<string | null> {
  const page = doc.pages[0];
  if (!page) return null;
  const longEdge = Math.max(page.width, page.height);
  if (!longEdge) return null;
  try {
    const blob = await adapter.exportAs({
      format: 'jpg',
      scale: Math.min(1, THUMBNAIL_EDGE / longEdge),
      quality: 0.72,
    });
    if (!blob || blob.size === 0) return null;
    return await blobToDataUrl(blob);
  } catch {
    return null;
  }
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Replace expired generated-image URLs with fresh ones.
 *
 * Returns the same document object when there is nothing to do, so a
 * caller can use identity to decide whether to write anything back —
 * refreshing a URL must not, by itself, mark a document dirty and start
 * an autosave on a design nobody edited.
 *
 * `resign` is injected so this stays testable and so the module does not
 * drag Supabase into every importer.
 */
export async function refreshExpiringImages(
  doc: BrandOSDocument,
  resign: (storagePath: string) => Promise<string | null>,
): Promise<BrandOSDocument> {
  const work: Array<{ pageIndex: number; layerIndex: number; storagePath: string }> = [];

  doc.pages.forEach((page, pageIndex) => {
    const generation = generationForPage(doc, page.id);
    const storagePath = generation?.storagePath;
    if (!storagePath) return;
    page.layers.forEach((layer, layerIndex) => {
      if (!isRemoteImage(layer)) return;
      if (!isExpiringUrl(layer.src)) return;
      work.push({ pageIndex, layerIndex, storagePath });
    });
  });

  if (work.length === 0) return doc;

  // One network call per distinct path, not per layer.
  const byPath = new Map<string, Promise<string | null>>();
  for (const { storagePath } of work) {
    if (!byPath.has(storagePath)) byPath.set(storagePath, resign(storagePath).catch(() => null));
  }
  const resolved = new Map<string, string | null>();
  await Promise.all(
    [...byPath.entries()].map(async ([path, promise]) => {
      resolved.set(path, await promise);
    }),
  );

  let changed = false;
  const pages = doc.pages.map((page, pageIndex) => {
    const edits = work.filter((w) => w.pageIndex === pageIndex);
    if (edits.length === 0) return page;
    const layers = page.layers.map((layer, layerIndex) => {
      const edit = edits.find((e) => e.layerIndex === layerIndex);
      if (!edit) return layer;
      const url = resolved.get(edit.storagePath);
      // A failed re-sign leaves the old URL in place. It may still have
      // hours left, and replacing a stale link with nothing is worse
      // than leaving a stale link.
      if (!url) return layer;
      changed = true;
      return { ...layer, src: url } as Layer;
    });
    return { ...page, layers };
  });

  return changed ? { ...doc, pages } : doc;
}

function isRemoteImage(layer: Layer): layer is ImageLayer & { src: string } {
  return layer.kind === 'image' && typeof (layer as ImageLayer).src === 'string';
}

/**
 * A URL that carries an expiry.
 *
 * Supabase signed URLs go through `/storage/v1/object/sign/` and carry a
 * `token` query parameter. A data URL, a public object URL or a
 * third-party CDN link has no expiry and must be left alone.
 */
export function isExpiringUrl(src: string): boolean {
  if (!src.startsWith('http')) return false;
  return src.includes('/object/sign/') || /[?&]token=/.test(src);
}

/**
 * Is this document a MASTER template?
 *
 * The editor autosaves whatever it loaded, with no `isTemplate` branch,
 * so opening a master's URL and typing rewrites the master for the whole
 * brand. That is intended when you arrived via "Edit template" and
 * alarming when you arrived from a bookmark or the back button — so the
 * editor says which one you are in rather than silently guarding or
 * silently not.
 */
export function isMasterTemplate(doc: BrandOSDocument): boolean {
  return doc.metadata?.isTemplate === true;
}
