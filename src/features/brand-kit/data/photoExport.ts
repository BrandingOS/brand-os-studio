/**
 * Photography — the model, the treatments, and the bytes that leave.
 *
 * Three defects live here, and all three are the same mistake made in three
 * places: nobody ever checked that a "photo" was a photograph.
 *
 *  • **D1 (blocker).** The card download zipped `photo-1.html` — the app's own
 *    `index.html`. The brand's only image pointed at `/images/grain.png`, which
 *    does not exist, and a dev server answers a missing path with the SPA
 *    document at **status 200**. `res.ok` was the whole test, so the zip
 *    shipped a web page named as a picture. Nothing that leaves here is trusted
 *    on its status line any more: the response must claim `image/*` AND the
 *    first bytes must be a real image signature (`verifyImageBytes`). Anything
 *    else is SKIPPED with a reason the user can act on — never zipped.
 *
 *  • **D14 / D46.** One brand showed twelve copies of a stock render as "Photos
 *    01–12" and the other counted an empty slot as a finished section. A photo
 *    is a real item in the brand's Library and nothing else; `realPhotos` and
 *    `hasRealPhotos` are the one answer to "does this brand have photography?",
 *    and they refuse a source already measured as broken.
 *
 *  • **D12.** The header download produced no file, because a brand with no
 *    photographs has nothing to export and said so silently. It still has
 *    nothing — but now the art direction is a document in its own right, so a
 *    kit that carries imagery RULES exports them even before it carries images.
 *
 * The treatments are the other half of the job. A brand's photography is not
 * the files: it is the files plus how they are always treated. Each treatment
 * is defined ONCE, as a shadow → highlight ramp, and realised twice — in CSS
 * for every preview, and in canvas pixels for the exported PNG. The raster is
 * the authoritative one; the CSS is a faithful preview of it (`lighten` then
 * `multiply` over a grayscale image is the browser's own way to spell a ramp).
 */
import type { MockBrand } from '@/features/setup/data/mockBrand';
import { useBrandStore } from '@/shared/store/brandStore';
import { brandColors } from '../renderers/brandStyle';
import { triggerBlobDownload } from './colorPaletteExport';
import { zipAdd, type ExportSkip, type ZipFolder } from './zipFile';

/* ─── What a photo IS ──────────────────────────────────────────────── */

/** One photograph, resolved from the brand's Library. */
export type KitPhoto = {
  /** The Library asset id — the same id `brandAssets` is indexed by. */
  id: string;
  src: string;
  /** Position label the Setup board gave it. A place, never an identity. */
  slot: string;
  /** The asset's own name, which is what a caption should read. */
  name: string;
};

/**
 * Sources measured as NOT an image, keyed by url.
 *
 * Filled by whoever actually tried — the renderer's `<img>` error, the export's
 * verification — and read by `realPhotos`, so a brand whose only "photo" is a
 * 404 stops counting as a brand with photography. Optimistic by construction:
 * an unmeasured source counts as real, because refusing to show a picture we
 * have not yet failed to load would be worse than showing it.
 */
const brokenSources = new Set<string>();

export function markPhotoSourceBroken(url: string): void {
  if (url) brokenSources.add(url);
}

export function isPhotoSourceBroken(url: string): boolean {
  return brokenSources.has(url);
}

/** Test seam — the cache is process-wide and must not leak between cases. */
export function resetPhotoSourceCache(): void {
  brokenSources.clear();
}

/**
 * A filename, or an id, read as a human would name the picture.
 *
 * Only ever a FALLBACK: the asset's own name is the caption whenever the
 * Library can be reached. `mockBrand.photos` does not carry it (see
 * `photoName`), so this reads the last path segment instead — which for an
 * uploaded file IS the name the user gave it.
 */
export function nameFromSource(src: string, index: number): string {
  const fallback = `Photo ${String(index + 1).padStart(2, '0')}`;
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return fallback;
  const path = src.split(/[?#]/)[0];
  const last = path.split('/').filter(Boolean).pop();
  if (!last) return fallback;
  const bare = last.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[-_]+/g, ' ').trim();
  if (!bare) return fallback;
  // A storage key is not a caption. A CDN path ends in a hash or an id far
  // more often than in a name, and "Photo 1503023345310 bd7c1de61c7d" printed
  // across a photograph is worse than no caption at all — so anything that
  // reads as machinery goes back to the index.
  const digits = (bare.match(/\d/g) ?? []).length;
  if (bare.length > 32 || digits / bare.length > 0.4) return fallback;
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

/**
 * The name the Library holds for this photo.
 *
 * `MockBrand.photos` carries `{ id, src, slot }` and no name — `mapPhotos` in
 * `brandToMockBrand` drops it — so the caption is resolved through the store's
 * projection of the Library, which is indexed by exactly that id. Guarded on
 * the brand's name so a MockBrand built for some other brand (a test fixture,
 * an offscreen mount of a different record) can never borrow this one's
 * captions; a mismatch falls back to the filename.
 */
export function photoName(brand: MockBrand, photo: { id: string; src: string }, index: number): string {
  const current = currentBrandFor(brand);
  const asset = current?.brandAssets?.find((a) => a.id === photo.id);
  const named = asset?.name?.trim();
  if (named) return named;
  return nameFromSource(photo.src, index);
}

/** The store's record for this MockBrand, or null when it is somebody else's. */
function currentBrandFor(brand: MockBrand) {
  try {
    const state = useBrandStore.getState();
    const current = state.current;
    if (current && current.name === brand.name) return current;
    return state.list?.find((b) => b.name === brand.name) ?? null;
  } catch {
    return null;
  }
}

/**
 * The photographs this brand actually has.
 *
 * Empty sources and sources already measured as broken are not photographs,
 * and an empty slot is not one either — that is the whole of D14/D46.
 */
export function realPhotos(
  brand: MockBrand | null | undefined,
  direction?: PhotoDirection,
): KitPhoto[] {
  const photos = brand?.photos ?? [];
  // Resolved here rather than demanded from the caller, so the tile, the
  // sidebar and the export cannot answer "does this brand have photography?"
  // three different ways — which is D46.
  const rules = direction ?? directionForMock(brand);
  const hidden = new Set(rules.hidden ?? []);
  return photos
    .filter((p) => Boolean(p?.src) && !isPhotoSourceBroken(p.src) && !hidden.has(p.id))
    .map((p, i) => ({
      id: p.id,
      src: p.src,
      slot: String(p.slot ?? ''),
      name: brand ? photoName(brand, p, i) : nameFromSource(p.src, i),
    }));
}

/**
 * Does this brand have photography?
 *
 * The predicate a completion counter should read. It is deliberately the same
 * function the drilldown uses to decide between tiles and the empty state, so
 * the sidebar and the page can never disagree about whether Photos is done.
 */
export function hasRealPhotos(
  brand: MockBrand | null | undefined,
  direction?: PhotoDirection,
): boolean {
  return realPhotos(brand, direction).length > 0;
}

/* ─── Art direction ────────────────────────────────────────────────── */

/**
 * The brand's imagery rules, and the treatment its photography is shown in.
 *
 * There is no home for this on the canonical brand: `identity.visualStyle`
 * holds `imageryStyle` as a CLOSED enum (photographic / illustrated / …) and
 * nothing free-form, and its write carrier (`Brand.visualStyle`) carries only
 * `descriptors`. So it lives where the Brand Kit already keeps per-brand
 * presentation state — beside `brandos:brand-kit:customizations` — until a
 * canonical imagery field exists. Moving it later is a read-migration, not a
 * loss: the note is text and the treatment is an id.
 */
export type PhotoDirection = {
  /** Free-form art-direction rules. Exported as `art-direction.md`. */
  note: string;
  /** The treatment every photo wears unless it names its own. */
  defaultTreatment: PhotoTreatmentId;
  /** Per-photo override, keyed by Library asset id. */
  treatments: Record<string, PhotoTreatmentId>;
  /** Library asset ids, in the order the kit shows them. */
  order: string[];
  /**
   * Library asset ids the kit does NOT show as brand photography.
   *
   * Removing a photograph from the kit must never remove it from the brand:
   * the Library is where the file lives and the kit is one arrangement of it,
   * exactly as a folder is an arrangement rather than a container (see the
   * Folders rule, "deleting a folder never deletes what is in it"). A photo
   * that is a texture, a screenshot or somebody's avatar belongs in the
   * Library and not on this card, and saying so must cost the user nothing.
   */
  hidden: string[];
};

export const EMPTY_DIRECTION: PhotoDirection = {
  note: '',
  defaultTreatment: 'original',
  treatments: {},
  order: [],
  hidden: [],
};

const DIRECTION_KEY = 'brandos:brand-kit:photos';

type DirectionStore = Record<string, PhotoDirection>;

function readStore(): DirectionStore {
  try {
    const raw = localStorage.getItem(DIRECTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DirectionStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readPhotoDirection(brandId: string | null | undefined): PhotoDirection {
  if (!brandId) return EMPTY_DIRECTION;
  const stored = readStore()[brandId];
  if (!stored) return EMPTY_DIRECTION;
  return {
    note: typeof stored.note === 'string' ? stored.note : '',
    defaultTreatment: isTreatmentId(stored.defaultTreatment) ? stored.defaultTreatment : 'original',
    treatments: stored.treatments && typeof stored.treatments === 'object' ? stored.treatments : {},
    order: Array.isArray(stored.order) ? stored.order.filter((id) => typeof id === 'string') : [],
    hidden: Array.isArray(stored.hidden) ? stored.hidden.filter((id) => typeof id === 'string') : [],
  };
}

export function writePhotoDirection(brandId: string, direction: PhotoDirection): void {
  try {
    const store = readStore();
    store[brandId] = direction;
    localStorage.setItem(DIRECTION_KEY, JSON.stringify(store));
  } catch {
    // A full or blocked localStorage must not cost the user their upload —
    // the photographs themselves live in the Library, which is the durable
    // half. Only the arrangement is lost.
  }
}

/**
 * The direction for a MockBrand, resolved without an id.
 *
 * A renderer is handed a `MockBrand`, which has a name and no id, so the store
 * is matched on the name — the same guard `photoName` uses, for the same
 * reason. No match means defaults, never another brand's rules.
 */
export function directionForMock(brand: MockBrand | null | undefined): PhotoDirection {
  if (!brand) return EMPTY_DIRECTION;
  const current = currentBrandFor(brand);
  return current ? readPhotoDirection(current.id) : EMPTY_DIRECTION;
}

/** The photos in the order the direction puts them, unknown ids last. */
export function orderedPhotos(photos: KitPhoto[], direction: PhotoDirection): KitPhoto[] {
  if (direction.order.length === 0) return photos;
  const rank = new Map(direction.order.map((id, i) => [id, i]));
  return [...photos].sort(
    (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}

/** Which treatment one photo wears. */
export function treatmentFor(photoId: string, direction: PhotoDirection): PhotoTreatmentId {
  const own = direction.treatments[photoId];
  return isTreatmentId(own) ? own : direction.defaultTreatment;
}

/* ─── Treatments ───────────────────────────────────────────────────── */

export type PhotoTreatmentId = 'original' | 'duotone' | 'tint' | 'mono';

export type PhotoTreatment = {
  id: PhotoTreatmentId;
  label: string;
  /** What it does, in one line — the editor shows this, nothing longer. */
  hint: string;
};

export const PHOTO_TREATMENTS: readonly PhotoTreatment[] = [
  { id: 'original', label: 'Original', hint: 'The photograph as shot.' },
  { id: 'duotone', label: 'Duotone', hint: 'Mapped between two brand colours.' },
  { id: 'tint', label: 'Brand tint', hint: 'One brand colour, dark to light.' },
  { id: 'mono', label: 'Greyscale', hint: 'No colour at all.' },
];

const TREATMENT_IDS = new Set<string>(PHOTO_TREATMENTS.map((t) => t.id));

export function isTreatmentId(value: unknown): value is PhotoTreatmentId {
  return typeof value === 'string' && TREATMENT_IDS.has(value);
}

/** The two ends of a treatment's ramp: what black becomes, what white becomes. */
export type TreatmentRamp = { shadow: string; highlight: string } | null;

/* Local colour maths. `brandStyle` answers "which colour", not "how dark". */

function toRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  return [
    parseInt(full.slice(0, 2), 16) || 0,
    parseInt(full.slice(2, 4), 16) || 0,
    parseInt(full.slice(4, 6), 16) || 0,
  ];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, '0')).join('')}`;
}

/** Perceived lightness, 0–1. Rec.601, which is what the ramp maps along. */
export function lightness(hex: string): number {
  const [r, g, b] = toRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function mixToward(hex: string, target: '#000000' | '#ffffff', amount: number): string {
  const [r, g, b] = toRgb(hex);
  const [tr, tg, tb] = toRgb(target);
  return toHex(r + (tr - r) * amount, g + (tg - g) * amount, b + (tb - b) * amount);
}

/**
 * The ramp a treatment maps a photograph along, in the brand's own colours.
 *
 * Duotone takes the brand's two strongest colours and puts the darker at the
 * shadow end — a ramp with the light colour underneath reads as a negative.
 * Brand tint is the same idea with ONE colour, deepened for the shadows and
 * lifted for the highlights, so a brand with a single colour still gets a
 * treatment rather than a flat wash.
 */
export function rampFor(treatment: PhotoTreatmentId, brand: MockBrand | null | undefined): TreatmentRamp {
  if (treatment === 'original') return null;
  if (treatment === 'mono') return { shadow: '#000000', highlight: '#ffffff' };
  const { primary, secondary } = brandColors(brand ?? null);
  if (treatment === 'tint') {
    return { shadow: mixToward(primary, '#000000', 0.62), highlight: mixToward(primary, '#ffffff', 0.82) };
  }
  const pair = [primary, secondary];
  const [dark, light] = pair[0] && lightness(pair[0]) <= lightness(pair[1]) ? pair : [pair[1], pair[0]];
  // Two colours of the same weight make a ramp with no range — push them apart
  // rather than returning a flat field.
  const spread = Math.abs(lightness(dark) - lightness(light));
  if (spread < 0.18) {
    return { shadow: mixToward(dark, '#000000', 0.55), highlight: mixToward(light, '#ffffff', 0.7) };
  }
  return { shadow: dark, highlight: light };
}

/** How a treatment is painted in CSS — a filter plus stacked blend layers. */
export type TreatmentCss = {
  filter: string;
  overlays: Array<{ background: string; mixBlendMode: 'lighten' | 'multiply' }>;
};

/**
 * The CSS realisation of a ramp.
 *
 * Grayscale first, then `lighten` with the shadow colour (blacks can go no
 * lower than it) and `multiply` with the highlight (whites can go no higher).
 * That pair IS a ramp, expressed in the two blend modes every browser has.
 */
export function treatmentCss(
  treatment: PhotoTreatmentId,
  brand: MockBrand | null | undefined,
): TreatmentCss {
  const ramp = rampFor(treatment, brand);
  if (!ramp) return { filter: 'none', overlays: [] };
  if (treatment === 'mono') return { filter: 'grayscale(1)', overlays: [] };
  return {
    filter: 'grayscale(1) contrast(1.06)',
    overlays: [
      { background: ramp.shadow, mixBlendMode: 'lighten' },
      { background: ramp.highlight, mixBlendMode: 'multiply' },
    ],
  };
}

/**
 * The raster realisation of the same ramp — the authoritative one.
 *
 * Pure, in place, and independent of any canvas, so it is unit-testable
 * without a browser. Alpha is untouched: a photograph with a transparent
 * corner keeps it.
 */
export function applyRamp(pixels: Uint8ClampedArray, ramp: TreatmentRamp): void {
  if (!ramp) return;
  const [sr, sg, sb] = toRgb(ramp.shadow);
  const [hr, hg, hb] = toRgb(ramp.highlight);
  for (let i = 0; i < pixels.length; i += 4) {
    const t = (0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]) / 255;
    pixels[i] = sr + (hr - sr) * t;
    pixels[i + 1] = sg + (hg - sg) * t;
    pixels[i + 2] = sb + (hb - sb) * t;
  }
}

/* ─── Is this actually an image? ───────────────────────────────────── */

export type ImageVerdict =
  | { ok: true; ext: 'png' | 'jpg' | 'gif' | 'webp' | 'svg' }
  | { ok: false; reason: string };

const MAGIC: Array<{ ext: 'png' | 'jpg' | 'gif' | 'webp'; bytes: number[]; at?: number }> = [
  { ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { ext: 'gif', bytes: [0x47, 0x49, 0x46, 0x38] },
];

function startsWith(bytes: Uint8Array, sig: number[], at = 0): boolean {
  if (bytes.length < at + sig.length) return false;
  return sig.every((b, i) => bytes[at + i] === b);
}

/** The image signature these bytes carry, or null when they carry none. */
export function sniffImageBytes(bytes: Uint8Array): 'png' | 'jpg' | 'gif' | 'webp' | 'svg' | null {
  for (const m of MAGIC) if (startsWith(bytes, m.bytes)) return m.ext;
  // RIFF....WEBP
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return 'webp';
  }
  // SVG is text. Read only the head — a whole megabyte decoded to look for
  // "<svg" is a megabyte of work to answer four characters.
  const head = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  return null;
}

/**
 * The gate D1 walked straight through.
 *
 * BOTH halves are required and both have failed alone: a 404 answered by a
 * single-page app is `200 text/html` (status passes, type fails), and a
 * mislabelled upload can claim `image/png` while holding something else (type
 * passes, bytes fail). The magic number is what a decoder will actually read,
 * so it is the one that decides the extension.
 */
export function verifyImageBytes(contentType: string | null, bytes: Uint8Array): ImageVerdict {
  const type = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (bytes.length === 0) return { ok: false, reason: 'the file came back empty' };
  if (type && !type.startsWith('image/')) {
    return { ok: false, reason: `the server answered with ${type}, not an image` };
  }
  const sniffed = sniffImageBytes(bytes);
  if (!sniffed) {
    return { ok: false, reason: 'the file is not a PNG, JPEG, GIF, WebP or SVG' };
  }
  if (type === 'image/svg+xml' && sniffed !== 'svg') {
    return { ok: false, reason: 'the file claims to be an SVG but is not one' };
  }
  return { ok: true, ext: sniffed };
}

export type FetchedImage =
  | { ok: true; ext: 'png' | 'jpg' | 'gif' | 'webp' | 'svg'; bytes: Uint8Array; blob: Blob }
  | { ok: false; reason: string };

/**
 * Fetch an image and prove it is one.
 *
 * `fetchImpl` is injectable so the rules above can be tested without a network
 * and without a browser.
 */
export async function fetchVerifiedImage(
  url: string,
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<FetchedImage> {
  if (!url) return { ok: false, reason: 'the photo has no file behind it' };
  let res: Response;
  try {
    res = await fetchImpl(url, { signal });
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') throw err;
    return { ok: false, reason: 'the file could not be reached' };
  }
  if (!res.ok) return { ok: false, reason: `the file could not be read (${res.status})` };
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  const verdict = verifyImageBytes(res.headers?.get?.('content-type') ?? null, bytes);
  // `strictNullChecks` is off in this repo, and without it TypeScript does
  // not narrow a union on a boolean-literal discriminant — hence Extract.
  if (!verdict.ok) return { ok: false, reason: (verdict as Extract<ImageVerdict, { ok: false }>).reason };
  const blob = new Blob([bytes], { type: mimeFor(verdict.ext) });
  return { ok: true, ext: verdict.ext, bytes, blob };
}

function mimeFor(ext: 'png' | 'jpg' | 'gif' | 'webp' | 'svg'): string {
  if (ext === 'jpg') return 'image/jpeg';
  if (ext === 'svg') return 'image/svg+xml';
  return `image/${ext}`;
}

/* ─── The files that leave ─────────────────────────────────────────── */

export function slugifyPhotoName(name: string, index: number): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || `photo-${String(index + 1).padStart(2, '0')}`;
}

/** Turn treated pixels into PNG bytes. Replaced in tests that have no canvas. */
export type PhotoRasterizer = (
  blob: Blob,
  ramp: TreatmentRamp,
) => Promise<{ blob: Blob; width: number; height: number } | null>;

/**
 * The canvas rasterizer.
 *
 * The bytes are drawn from a blob URL rather than the original address, so the
 * canvas is same-origin and `getImageData` is legal even when the photograph
 * came from remote storage with no CORS headers.
 */
export const canvasRasterizer: PhotoRasterizer = async (blob, ramp) => {
  const url = URL.createObjectURL(blob);
  try {
    const img = await loadImage(url);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return null;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, width, height);
    if (ramp) {
      const data = ctx.getImageData(0, 0, width, height);
      applyRamp(data.data, ramp);
      ctx.putImageData(data, 0, 0);
    }
    const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    return out ? { blob: out, width, height } : null;
  } finally {
    URL.revokeObjectURL(url);
  }
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode failed'));
    img.src = src;
  });
}

export type PhotoExportOptions = {
  direction?: PhotoDirection;
  /** Which treatments to render beside the originals. Defaults to the one in force. */
  treatments?: PhotoTreatmentId[];
  fetchImpl?: typeof fetch;
  rasterize?: PhotoRasterizer;
  signal?: AbortSignal;
};

export type PhotoExportFile = { path: string; blob: Blob };

export type PhotoExportResult = {
  files: PhotoExportFile[];
  skipped: ExportSkip[];
};

/**
 * The brand's photography as files: every original, every treated copy, and
 * the art direction that governs both.
 *
 * A photograph that cannot be proven to be one contributes NOTHING — not a
 * placeholder, not an html file wearing a `.png` name — and says why.
 */
export async function buildPhotoFiles(
  brand: MockBrand,
  options: PhotoExportOptions = {},
): Promise<PhotoExportResult> {
  const direction = options.direction ?? EMPTY_DIRECTION;
  const rasterize = options.rasterize ?? canvasRasterizer;
  const fetchImpl = options.fetchImpl ?? fetch;
  const files: PhotoExportFile[] = [];
  const skipped: ExportSkip[] = [];
  const photos = orderedPhotos(realPhotos(brand, direction), direction);
  /** The photographs that were PROVEN to be photographs. The document lists
   *  these, not the candidates — a picture that never made it into the zip
   *  must not be named in the zip's own index of what is inside it. */
  const exported: KitPhoto[] = [];

  for (let i = 0; i < photos.length; i += 1) {
    const photo = photos[i];
    const label = photo.name || `Photo ${i + 1}`;
    const stem = slugifyPhotoName(photo.name, i);
    const fetched = await fetchVerifiedImage(photo.src, fetchImpl, options.signal);
    if (!fetched.ok) {
      // The source is measured now, so nothing else in this session counts it
      // as photography either.
      markPhotoSourceBroken(photo.src);
      skipped.push({ label, reason: (fetched as Extract<FetchedImage, { ok: false }>).reason });
      continue;
    }
    files.push({ path: `originals/${stem}.${fetched.ext}`, blob: fetched.blob });
    exported.push(photo);

    const wanted = options.treatments ?? [treatmentFor(photo.id, direction)];
    for (const treatment of wanted) {
      if (treatment === 'original') continue;
      const ramp = rampFor(treatment, brand);
      let raster: Awaited<ReturnType<PhotoRasterizer>> = null;
      try {
        raster = await rasterize(fetched.blob, ramp);
      } catch {
        raster = null;
      }
      if (!raster || raster.blob.size === 0) {
        skipped.push({ label: `${label} — ${treatment}`, reason: 'the treated copy could not be rendered' });
        continue;
      }
      files.push({ path: `${treatment}/${stem}.png`, blob: raster.blob });
    }
  }

  const note = buildArtDirectionMarkdown(brand, direction, exported, skipped);
  files.push({ path: 'art-direction.md', blob: new Blob([note], { type: 'text/markdown' }) });
  return { files, skipped };
}

/**
 * The imagery rules, as a document.
 *
 * This is why a Photos download is never empty any more: a brand that has
 * written down how its photography must look has something to hand a
 * photographer before it has any photographs.
 */
export function buildArtDirectionMarkdown(
  brand: MockBrand,
  direction: PhotoDirection,
  photos: KitPhoto[] = [],
  /**
   * What could not be included, and why.
   *
   * The document is the one thing in the zip that can SPEAK, so it is where a
   * skip belongs: D1's failure was silent, and a download that quietly holds
   * one fewer picture than the card showed is the same silence with better
   * manners.
   */
  skipped: ExportSkip[] = [],
): string {
  const lines: string[] = [`# ${brand.name} — photography`, ''];
  lines.push('## Art direction', '');
  lines.push(direction.note.trim() || '_No art direction written yet._', '');
  const treatment = PHOTO_TREATMENTS.find((t) => t.id === direction.defaultTreatment);
  lines.push('## Treatment', '');
  lines.push(`Default: **${treatment?.label ?? 'Original'}** — ${treatment?.hint ?? ''}`.trim(), '');
  const ramp = rampFor(direction.defaultTreatment, brand);
  if (ramp) lines.push(`Ramp: \`${ramp.shadow}\` (shadows) → \`${ramp.highlight}\` (highlights)`, '');
  lines.push('## Images', '');
  if (photos.length === 0) {
    lines.push('_This brand has no photographs in its Library yet._', '');
  } else {
    for (const p of photos) {
      lines.push(`- ${p.name} — ${PHOTO_TREATMENTS.find((t) => t.id === treatmentFor(p.id, direction))?.label}`);
    }
    lines.push('');
  }
  if (skipped.length > 0) {
    lines.push('## Not included', '');
    for (const s of skipped) lines.push(`- ${s.label} — ${s.reason}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Write the brand's photography into an existing zip folder. */
export async function addPhotosToZip(
  folder: ZipFolder,
  brand: MockBrand,
  options: PhotoExportOptions = {},
): Promise<{ added: number; skipped: ExportSkip[] }> {
  const { files, skipped } = await buildPhotoFiles(brand, options);
  // The art-direction note alone is not "the brand's photography": a zip that
  // holds only a README should still tell the user no images went in.
  const images = files.filter((f) => f.path !== 'art-direction.md');
  for (const file of files) zipAdd(folder, file.path, file.blob);
  return { added: images.length, skipped };
}

/** The whole family as one zip — what the drilldown's Download builds. */
export async function buildPhotoZip(
  brand: MockBrand,
  options: PhotoExportOptions = {},
): Promise<{ blob: Blob; added: number; skipped: ExportSkip[] }> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const result = await addPhotosToZip(zip as unknown as ZipFolder, brand, options);
  const blob = await zip.generateAsync({ type: 'blob' });
  return { blob, ...result };
}

/** Download it, named after the brand. */
export async function downloadPhotos(
  brand: MockBrand,
  options: PhotoExportOptions = {},
): Promise<{ added: number; skipped: ExportSkip[] }> {
  const { blob, added, skipped } = await buildPhotoZip(brand, options);
  const slug = slugifyPhotoName(brand.name, 0);
  triggerBlobDownload(blob, `${slug}-photos.zip`);
  return { added, skipped };
}

/* ─── Reading a PNG back ───────────────────────────────────────────── */

/**
 * The width and height in a PNG's IHDR chunk.
 *
 * Tests read the zip back with this rather than trusting the encoder: a
 * 0×0 picture is a passing export and a failing deliverable.
 */
export function readPngSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (!startsWith(bytes, MAGIC[0].bytes)) return null;
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}
