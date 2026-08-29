/**
 * Platform size intelligence — the thing the reference kit does NOT have.
 *
 * Their "profile icons" are squares; ours know that a LinkedIn banner is
 * 1584×396 but that everything outside the middle 1128×191 is covered by
 * the profile card on desktop, that a YouTube channel banner is uploaded
 * at 2560×1440 and only 1546×423 of it is visible on a phone, and that a
 * Facebook cover is served at 820×312 but should be UPLOADED at 1640×624
 * so it is not resampled on a retina screen.
 *
 * That knowledge is a TABLE, not a set of magic numbers scattered through
 * renderers: a slot is `{ width, height, safe }`, an overlay can draw the
 * safe area, an exporter can produce the file, and a test can assert both
 * agree. Adding a platform is one entry.
 *
 * ## Cover, not contain
 *
 * A social pack takes ONE rendered design and re-frames it for each slot.
 * Letterboxing is the failure the spec names by name, so the artwork is
 * scaled to COVER the frame and centre-cropped — a 1080² post cropped to a
 * 1500×500 header loses its edges, which is the honest trade and the one
 * every design tool makes. A LOGO is the opposite case and is never
 * cropped: `buildProfilePack` contains it inside the frame on a brand
 * ground, which is `resizePng`'s own behaviour.
 *
 * ## Why the raster step is injected
 *
 * Both rasterisers need a canvas. Passing one in lets a unit test read the
 * produced files back and assert the exact pixel size of every slot, which
 * is the assertion that matters, without a browser.
 */
import { resizePng, type CustomSize } from '../data/exportFormats';
import type { ExportFile } from './types';

export type SafeArea = { x: number; y: number; width: number; height: number };

export type SocialSlot = {
  /** Stable id — a file name, a filter value, a test key. */
  id: string;
  platform: string;
  /** What the platform calls it. */
  slot: string;
  width: number;
  height: number;
  /**
   * The rectangle that is reliably visible, in output pixels. Absent means
   * the whole frame is safe.
   */
  safe?: SafeArea;
  /** Why the numbers are what they are — shown beside the size in the UI. */
  note?: string;
};

/** Centre a `w × h` box inside `width × height`. */
function centred(width: number, height: number, w: number, h: number): SafeArea {
  return { x: Math.round((width - w) / 2), y: Math.round((height - h) / 2), width: w, height: h };
}

export const SOCIAL_SIZES: readonly SocialSlot[] = [
  {
    id: 'instagram-post',
    platform: 'Instagram',
    slot: 'Post',
    width: 1080,
    height: 1080,
    note: 'Square. Feed crops nothing, the grid thumbnail crops nothing.',
  },
  {
    id: 'instagram-story',
    platform: 'Instagram',
    slot: 'Story',
    width: 1080,
    height: 1920,
    // The top ~250px carries the avatar and name, the bottom ~250px the
    // reply bar — both sit ON the artwork.
    safe: { x: 0, y: 250, width: 1080, height: 1420 },
    note: 'Keep type clear of the header and the reply bar.',
  },
  {
    id: 'facebook-cover',
    platform: 'Facebook',
    slot: 'Cover',
    width: 820,
    height: 312,
    note: 'Served size. Upload the @2x below for a retina screen.',
  },
  {
    id: 'facebook-cover-2x',
    platform: 'Facebook',
    slot: 'Cover @2x',
    width: 1640,
    height: 624,
    note: 'What to actually upload — Facebook downsamples to 820×312.',
  },
  {
    id: 'linkedin-banner',
    platform: 'LinkedIn',
    slot: 'Profile banner',
    width: 1584,
    height: 396,
    // The profile photo and name card overlay the lower left on desktop.
    safe: { x: 396, y: 0, width: 1000, height: 260 },
    note: 'The avatar and name card cover the lower left on desktop.',
  },
  {
    id: 'linkedin-company',
    platform: 'LinkedIn',
    slot: 'Company banner',
    width: 1128,
    height: 191,
    note: 'Company pages use a shorter banner than personal profiles.',
  },
  {
    id: 'x-header',
    platform: 'X',
    slot: 'Header',
    width: 1500,
    height: 500,
    // The avatar overlaps the bottom left; the lower ~120px is unreliable.
    safe: { x: 0, y: 0, width: 1500, height: 380 },
    note: 'The avatar overlaps the bottom left.',
  },
  {
    id: 'youtube-banner',
    platform: 'YouTube',
    slot: 'Channel banner',
    width: 2560,
    height: 1440,
    // The one size everyone gets wrong: the phone crop is tiny and central.
    safe: centred(2560, 1440, 1546, 423),
    note: 'Only the central 1546×423 is visible on a phone. Everything vital goes there.',
  },
  {
    id: 'tiktok-profile',
    platform: 'TikTok',
    slot: 'Profile photo',
    width: 400,
    height: 400,
    note: 'Displayed as a circle — keep the mark inside the inscribed circle.',
  },
  {
    id: 'instagram-profile',
    platform: 'Instagram',
    slot: 'Profile photo',
    width: 400,
    height: 400,
    note: 'Displayed as a circle — keep the mark inside the inscribed circle.',
  },
  {
    id: 'app-store-icon',
    platform: 'App Store',
    slot: 'App icon',
    width: 1024,
    height: 1024,
    note: 'Must be fully opaque — no alpha channel, no rounded corners.',
  },
] as const;

/** Every slot a platform has, in table order. */
export function slotsForPlatform(platform: string): SocialSlot[] {
  return SOCIAL_SIZES.filter((s) => s.platform.toLowerCase() === platform.toLowerCase());
}

export function socialSlot(id: string): SocialSlot | undefined {
  return SOCIAL_SIZES.find((s) => s.id === id);
}

/** The square profile slots — what `buildProfilePack` renders by default. */
export const PROFILE_SLOTS: readonly SocialSlot[] = SOCIAL_SIZES.filter(
  (s) => s.width === s.height,
);

function resolveSlot(slot: SocialSlot | string): SocialSlot {
  const resolved = typeof slot === 'string' ? socialSlot(slot) : slot;
  if (!resolved) throw new Error(`Unknown social slot: ${String(slot)}`);
  return resolved;
}

/* ── Cover-fit rasteriser ─────────────────────────────────────────── */

export type SlotRenderer = (
  png: Blob,
  frame: { width: number; height: number; background?: string },
) => Promise<Blob>;

/**
 * Scale to COVER the frame and centre-crop. The default for a design.
 *
 * Not `resizePng`: that fits INSIDE the box, which letterboxes a square
 * post into a wide header.
 */
export const coverIntoFrame: SlotRenderer = async (png, frame) => {
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  if (frame.background && frame.background !== 'transparent') {
    ctx.fillStyle = frame.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const scale = Math.max(frame.width / bitmap.width, frame.height / bitmap.height);
  const dw = bitmap.width * scale;
  const dh = bitmap.height * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, (frame.width - dw) / 2, (frame.height - dh) / 2, dw, dh);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
      'image/png',
    ),
  );
};

/* ── The two packs ────────────────────────────────────────────────── */

export type SocialPackOptions = {
  /** Folder the files land in. Default: none (flat). */
  folder?: string;
  /** Ground behind a design with transparency. */
  background?: string;
  /** Test seam / alternative rasteriser. */
  render?: SlotRenderer;
};

/**
 * One rendered design → the exact file each named slot wants.
 *
 * Pass a single slot (or its id) for one file, an array for a pack.
 */
export async function buildSocialSizePack(
  png: Blob,
  slots: SocialSlot | string | ReadonlyArray<SocialSlot | string>,
  options: SocialPackOptions = {},
): Promise<ExportFile[]> {
  const render = options.render ?? coverIntoFrame;
  const list = (Array.isArray(slots) ? slots : [slots]) as ReadonlyArray<SocialSlot | string>;
  const files: ExportFile[] = [];
  for (const entry of list) {
    const slot = resolveSlot(entry);
    const blob = await render(png, {
      width: slot.width,
      height: slot.height,
      background: options.background,
    });
    files.push({ path: `${prefix(options.folder)}${fileName(slot)}`, blob });
  }
  return files;
}

export type ProfilePackOptions = {
  folder?: string;
  /** Which square slots to render. Defaults to every square slot. */
  slots?: ReadonlyArray<SocialSlot | string>;
  /** Fraction of the edge kept as padding. Default 0.14. */
  padding?: number;
  /**
   * Test seam. Defaults to `resizePng`, which CONTAINS — a profile mark is
   * never cropped.
   */
  resize?: (png: Blob, size: CustomSize) => Promise<Blob>;
};

/**
 * A logo × the grounds it should be offered on, at every profile size.
 *
 * The grounds are handed in rather than derived, because deciding which
 * ground a logo READS on is `logoOnBackground`'s job and belongs to the
 * caller that already holds the brand's variants.
 */
export async function buildProfilePack(
  logoPng: Blob,
  grounds: ReadonlyArray<string>,
  options: ProfilePackOptions = {},
): Promise<ExportFile[]> {
  const resize = options.resize ?? resizePng;
  const pad = Math.max(0, Math.min(0.4, options.padding ?? 0.14));
  const slots = (options.slots ?? PROFILE_SLOTS).map(resolveSlot);
  const list = grounds.length > 0 ? grounds : ['transparent'];
  const files: ExportFile[] = [];
  for (const ground of list) {
    for (const slot of slots) {
      const blob = await resize(logoPng, {
        width: slot.width,
        height: slot.height,
        padding: Math.round(slot.width * pad),
        background: ground,
      });
      files.push({
        path: `${prefix(options.folder)}${groundLabel(ground)}/${fileName(slot)}`,
        blob,
      });
    }
  }
  return files;
}

/* ── Naming ───────────────────────────────────────────────────────── */

function prefix(folder: string | undefined): string {
  const raw = (folder ?? '').replace(/^\/+|\/+$/g, '');
  return raw ? `${raw}/` : '';
}

/** `instagram-story-1080x1920.png` — the size is in the name on purpose. */
export function fileName(slot: SocialSlot): string {
  return `${slot.id}-${slot.width}x${slot.height}.png`;
}

function groundLabel(ground: string): string {
  if (!ground || ground === 'transparent') return 'transparent';
  return ground.replace(/^#/, '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'ground';
}
