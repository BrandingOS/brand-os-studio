/**
 * Folders — pure helpers for the Studio asset library.
 *
 * Everything here is a function of its arguments so the library's behaviour
 * (what a filter matches, which glyph a file gets, how a size reads) is
 * testable without mounting the page.
 */
import type { Asset } from '@/shared/types/brand';

/* ── Categories ─────────────────────────────────────────────────────── */

export const LIBRARY_CATEGORIES = [
  'all',
  'logo',
  'photo',
  'icon',
  'social',
  'mockup',
  'reference',
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export function isLibraryCategory(value: string | null): value is LibraryCategory {
  return value !== null && (LIBRARY_CATEGORIES as readonly string[]).includes(value);
}

const CATEGORY_LABEL: Record<LibraryCategory, string> = {
  all: 'All',
  logo: 'Logos',
  photo: 'Photos',
  icon: 'Icons',
  social: 'Social',
  mockup: 'Mockups',
  reference: 'References',
};

export function categoryLabel(category: LibraryCategory): string {
  return CATEGORY_LABEL[category];
}

/** Categories an asset can be moved to — every real one, "all" excluded. */
export const ASSIGNABLE_CATEGORIES = LIBRARY_CATEGORIES.filter(
  (c): c is Exclude<LibraryCategory, 'all'> => c !== 'all',
);

/* ── Preview ────────────────────────────────────────────────────────── */

/**
 * How a card should draw an asset.
 *
 * `raster` and `vector` both render an <img>; they are separated because a
 * vector needs a ground behind it (a white-on-transparent logo is invisible
 * on a light surface) and a raster does not. Everything else gets a glyph —
 * a PDF or a font file has no browser-renderable thumbnail, and pointing an
 * <img> at one produces the broken-image icon this page is meant to be rid of.
 */
export type PreviewKind = 'raster' | 'vector' | 'pdf' | 'font' | 'video' | 'file';

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot >= name.length - 1) return '';
  const ext = name.slice(dot + 1).toLowerCase();
  // A dot inside a human-written name ("Logo v1.2 final") is not a format.
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : '';
}

/**
 * The file's extension, from whichever source knows it.
 *
 * Names in this product are frequently WRITTEN, not uploaded — the seed
 * brands carry names like "Vector Logo — Primary (PNG @2x)" whose only real
 * extension is in the URL. Reading the name alone left every one of those
 * classified as an opaque raster, which is why the white-on-transparent
 * logos disappeared into the card.
 */
function fileExtension(asset: Pick<Asset, 'name' | 'url' | 'metadata'>): string {
  const fromName = extensionOf(asset.name);
  if (fromName) return fromName;
  const url = asset.url ?? '';
  if (!url || url.startsWith('data:')) return '';
  const path = url.split(/[?#]/)[0];
  return extensionOf(path.slice(path.lastIndexOf('/') + 1));
}

/** Uppercase file extension for the corner badge — '' when there isn't one. */
export function assetExtension(asset: Pick<Asset, 'name' | 'url' | 'metadata'>): string {
  const ext = fileExtension(asset);
  if (ext) return ext.toUpperCase();
  const format = asset.metadata?.format ?? '';
  const slash = format.lastIndexOf('/');
  return slash >= 0 ? format.slice(slash + 1).replace('+xml', '').toUpperCase() : '';
}

/** Formats that can carry an alpha channel — i.e. artwork that may vanish
 *  into the surface behind it. A white logo on a white card is invisible,
 *  which is the single most common way an asset library looks broken. */
const ALPHA_FORMATS = ['png', 'svg', 'webp', 'gif', 'avif'];

/**
 * Should this preview sit on a chequered ground rather than a flat surface?
 *
 * We cannot read the pixels cheaply, so the test is the format: anything that
 * CAN be transparent gets the ground. It is neutral chrome — it never tints
 * the artwork, it only proves where the transparency is, and it is the
 * difference between "this brand has no white logo" and "there it is".
 */
export function previewNeedsGround(
  asset: Pick<Asset, 'type' | 'url' | 'name' | 'metadata'>,
): boolean {
  const kind = previewKindFor(asset);
  if (kind === 'vector') return true;
  if (kind !== 'raster') return false;
  const ext = fileExtension(asset);
  if (ext) return ALPHA_FORMATS.includes(ext);
  const format = asset.metadata?.format ?? '';
  return ALPHA_FORMATS.some((f) => format.endsWith(`/${f}`) || format.endsWith(`/${f}+xml`));
}

export function previewKindFor(
  asset: Pick<Asset, 'type' | 'url' | 'name' | 'metadata'>,
): PreviewKind {
  const format = asset.metadata?.format ?? '';
  const ext = fileExtension(asset);

  if (format === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (format.startsWith('font/') || format.includes('font') || ['woff', 'woff2', 'ttf', 'otf'].includes(ext))
    return 'font';
  if (asset.type === 'video' || format.startsWith('video/')) return 'video';
  if (!asset.url) return 'file';
  if (format === 'image/svg+xml' || ext === 'svg') return 'vector';
  if (format.startsWith('image/') || ['image', 'logo', 'icon'].includes(asset.type)) return 'raster';
  return 'file';
}

/* ── Query ──────────────────────────────────────────────────────────── */

export type SortKey = 'recent' | 'name' | 'size';

export interface LibraryQueryInput {
  category: LibraryCategory;
  search: string;
  sort: SortKey;
}

function timeOf(asset: Asset): number {
  const raw = asset.createdAt as unknown as string | Date | undefined;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Category filter → text search → sort. Search matches the name and the
 * tags, because a tag is the only handle a user has on an asset whose
 * filename is `IMG_4417.jpg`.
 */
export function queryAssets(assets: Asset[], { category, search, sort }: LibraryQueryInput): Asset[] {
  let arr = assets;

  if (category !== 'all') arr = arr.filter((a) => a.category === category);

  const q = search.trim().toLowerCase();
  if (q) {
    arr = arr.filter(
      (a) => a.name.toLowerCase().includes(q) || a.tags?.some((t) => t.toLowerCase().includes(q)),
    );
  }

  const sorted = [...arr];
  if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'size') sorted.sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  else sorted.sort((a, b) => timeOf(b) - timeOf(a));
  return sorted;
}

/** How many assets sit in each category, for the filter chip counts. */
export function categoryCounts(assets: Asset[]): Record<LibraryCategory, number> {
  const counts = Object.fromEntries(LIBRARY_CATEGORIES.map((c) => [c, 0])) as Record<
    LibraryCategory,
    number
  >;
  counts.all = assets.length;
  for (const a of assets) {
    if (isLibraryCategory(a.category)) counts[a.category] += 1;
  }
  return counts;
}

/* ── Drag & drop ────────────────────────────────────────────────────── */

/**
 * Is this drag carrying files?
 *
 * A drag of selected TEXT fires the same events as a drag of files, and
 * flashing a full-page "drop to upload" veil at someone who is highlighting
 * an asset name is the kind of jumpiness that makes a tool feel cheap. The
 * only reliable signal is the `Files` entry in `dataTransfer.types`.
 *
 * Note for tests: outside a genuine user drag the browser puts DataTransfer
 * in protected mode and `types` reads as empty, which is why this is a pure
 * function over the list rather than something only an E2E can exercise.
 */
export function dragCarriesFiles(types: readonly string[] | undefined): boolean {
  return Array.from(types ?? []).includes('Files');
}

/* ── Formatting ─────────────────────────────────────────────────────── */

export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** The metadata line under an asset name — dimensions when we have them. */
export function assetMetaLine(asset: Asset): string {
  const parts: string[] = [];
  const ext = assetExtension(asset);
  if (ext) parts.push(ext);
  const d = asset.metadata?.dimensions;
  if (d) parts.push(`${d.width}×${d.height}`);
  if (asset.size) parts.push(formatBytes(asset.size));
  return parts.join(' · ');
}
