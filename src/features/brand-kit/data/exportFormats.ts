/**
 * What "Download" offers, and in which words.
 *
 * One vocabulary for every card, tile, drilldown header and editor — the
 * reference kit's is the one people already understand: *For web* and *For
 * print* up front, the vector and the custom size behind the fold. Before
 * this every surface had its own verb and its own payload: the Logos header
 * gave twenty PNGs, the Logos card three SVGs, both called "Download".
 *
 * The formats a family can honour grow as its exporter lands (`exporters/`);
 * what it cannot honour yet is shown disabled with a reason, never hidden —
 * a menu that changes shape per card is a menu nobody learns.
 */
import type { KitEntry } from '../catalog/catalog';

/**
 * The formats a native exporter produces, named the way the file is.
 *
 * A separate union from `DownloadFormat` because these are the ones a
 * FAMILY owes rather than ones any raster can be turned into: a deck owes
 * a real deck, a favicon owes an icon container, a signature owes markup,
 * a social design owes the sizes each platform actually serves. Nothing
 * here can be derived from a PNG by resizing it.
 */
export type KitNativeFormat = 'pptx' | 'ico' | 'html' | 'sizes';

/**
 * The formats a DOCUMENT owes, as opposed to a design.
 *
 * Strategy is the one card in the kit whose deliverable is words rather
 * than artwork, and none of the raster vocabulary fits it: there is no
 * vector to hand over and nothing to resize. It still uses the same menu
 * — one menu everywhere is the whole point — but the third and fifth rows
 * say what a document can actually be. Kept out of `KitNativeFormat` on
 * purpose: that union is what `nativeFormatFor` may answer for a RENDERED
 * deliverable, and `NATIVE_FORMATS` must stay exhaustive over it.
 */
export type KitDocumentFormat = 'md' | 'json' | 'zip';

export type DownloadFormat =
  | 'png'
  | 'pdf'
  | 'svg'
  | 'jpg'
  | 'custom'
  | KitNativeFormat
  | KitDocumentFormat;

export type DownloadOption = {
  format: DownloadFormat;
  /** What the menu says. */
  label: string;
  /** The little format chip beside the label. */
  chip: string;
  /** Present when the option is offered but not yet available for this entry. */
  disabledReason?: string;
  /** Behind the "more" fold rather than in the primary pair. */
  secondary?: boolean;
};

/** A custom-size raster request — the reference's most-used affordance. */
export type CustomSize = {
  width: number;
  /** Absent = keep the deliverable's own aspect. */
  height?: number;
  /** Transparent padding around the artwork, in output pixels. */
  padding?: number;
  /** Hex, or 'transparent'. */
  background?: string;
  /** Crop away transparent margins before padding. */
  trim?: boolean;
};

/**
 * Families whose artwork is pure vector today (the brand's own assets).
 * Everything else is a DOM renderer, so its `svg` option stands for the
 * vector files already inside that family's folder.
 */
const VECTOR_NATIVE = new Set(['Logos', 'Colors', 'Icons']);

/**
 * The platform sizes a social slot is actually served at.
 *
 * Ids into `exporters/socialSizes.ts` `SOCIAL_SIZES`, which is where the
 * numbers and the safe areas live. Named explicitly rather than derived
 * from `PROFILE_SLOTS` — that set is "every square slot" and an Instagram
 * POST is square, so a Profile download would have quietly shipped one.
 */
export const SOCIAL_PACK_SLOTS: Readonly<Record<string, ReadonlyArray<string>>> = {
  Post: ['instagram-post'],
  Story: ['instagram-story'],
  Cover: [
    'facebook-cover',
    'facebook-cover-2x',
    'linkedin-banner',
    'linkedin-company',
    'x-header',
    'youtube-banner',
  ],
  Profile: ['instagram-profile', 'tiktok-profile', 'app-store-icon'],
};

/** What the menu calls a native format, and what the README says it is for. */
export const NATIVE_FORMATS: Readonly<
  Record<KitNativeFormat, { label: string; chip: string; what: string }>
> = {
  pptx: {
    label: 'Editable deck',
    chip: 'PPTX',
    what: 'a real PowerPoint file — editable slides, not pictures of slides',
  },
  ico: {
    label: 'Favicon set',
    chip: 'ICO',
    what: 'the icon container every browser asks for, with the PNG set and the manifest beside it',
  },
  html: {
    label: 'Signature',
    chip: 'HTML',
    what: 'markup to paste into a mail client, and a plain-text twin for the ones that refuse it',
  },
  sizes: {
    // Not `ZIP`: a slot with one size comes down as that one PNG, and a
    // chip that promised an archive would be wrong half the time. The chip
    // names what is INSIDE; the label says how many there are of it.
    label: 'Platform sizes',
    chip: 'PNG',
    what: 'the design at the exact pixel size each platform serves',
  },
};

/**
 * The one native format a catalog entry owes beyond the universal PNG.
 *
 * Decided from the ENTRY rather than from the template it happens to
 * render, because the menu has to be drawn before anything is rendered and
 * the zip walker has to plan before it rasterizes. Both read this.
 */
export function nativeFormatFor(entry: KitEntry): KitNativeFormat | null {
  if (entry.storageLabel === 'Favicon') return 'ico';
  if (entry.storageLabel === 'Email Signature') return 'html';
  if (entry.sectionKey === 'social' && SOCIAL_PACK_SLOTS[entry.storageLabel]) return 'sizes';
  // Every presentation is a deck except the Brand Board, which is a poster
  // and has no slides to carry.
  if (entry.sectionKey === 'presentations' && entry.view !== 'brand-board') return 'pptx';
  return null;
}

/**
 * The menu, which is the SAME FIVE ROWS everywhere.
 *
 * *For web* and *For print* up front; then one row that is the family's own
 * native format when it has one and the vector otherwise; then *Flattened*
 * and *Custom size…*. A family with neither a native exporter nor vector
 * artwork still shows the third row, disabled with the reason — a menu that
 * changes shape per card is a menu nobody learns.
 *
 * `unavailable` disables the WHOLE menu with one reason, for a card that
 * has no material to export at all. Same principle, one level up: the rows
 * stay, and each says why it cannot run.
 */
export function downloadOptionsFor(entry: KitEntry, unavailable?: string): DownloadOption[] {
  const native = nativeFormatFor(entry);
  const third: DownloadOption = native
    ? {
        format: native,
        label: NATIVE_FORMATS[native].label,
        chip: NATIVE_FORMATS[native].chip,
        secondary: true,
      }
    : {
        format: 'svg',
        label: 'Vector',
        chip: 'SVG',
        secondary: true,
        ...(VECTOR_NATIVE.has(entry.storageLabel)
          ? {}
          : { disabledReason: 'This design is drawn in the browser — it has no vector to export' }),
      };
  const options: DownloadOption[] = [
    { format: 'png', label: 'For web', chip: 'PNG' },
    { format: 'pdf', label: 'For print', chip: 'PDF' },
    third,
    { format: 'jpg', label: 'Flattened', chip: 'JPG', secondary: true },
    { format: 'custom', label: 'Custom size…', chip: 'PNG', secondary: true },
  ];
  /*
   * A CARD WITH NOTHING TO EXPORT SAYS SO IN THE MENU.
   *
   * raqm's Photos offered every row and produced no file at all — no
   * error, no toast, no disabled state (QA Q13); skam's produced a
   * picture of the empty state, under the missing photograph's own name
   * (QA Q14). Both are the same mistake: an affordance offered for
   * material that does not exist.
   *
   * The menu keeps its five rows — one shape everywhere is the whole
   * point — and every one of them carries the reason. `disabledReason` is
   * what the menu already renders for a format a family cannot honour.
   */
  if (unavailable) return options.map((option) => ({ ...option, disabledReason: unavailable }));
  return options;
}

/**
 * Several PNGs, side by side, as one PNG.
 *
 * Written for the animation storyboard (QA Q11): a motion deliverable's
 * still is a strip of moments, and each moment is captured on its own
 * offscreen mount, so something has to join them. Deliberately dumb — it
 * composites bitmaps and knows nothing about what is in them.
 *
 * The gutter is painted first and the cells are drawn over it, so the
 * separator is exactly the gaps and nothing else.
 */
export async function composePngStrip(
  pngs: ReadonlyArray<Blob>,
  options: { gutter?: number; gutterColor?: string } = {},
): Promise<Blob> {
  if (pngs.length === 0) throw new Error('A strip needs at least one frame');
  const gutter = Math.max(0, Math.round(options.gutter ?? 0));
  const bitmaps = await Promise.all(pngs.map((png) => createImageBitmap(png)));
  try {
    const height = Math.max(...bitmaps.map((b) => b.height));
    const width =
      bitmaps.reduce((sum, b) => sum + b.width, 0) + gutter * (bitmaps.length - 1);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    if (gutter > 0) {
      ctx.fillStyle = options.gutterColor ?? 'rgba(0, 0, 0, 0.14)';
      ctx.fillRect(0, 0, width, height);
    }
    let x = 0;
    for (const bitmap of bitmaps) {
      ctx.drawImage(bitmap, x, Math.round((height - bitmap.height) / 2));
      x += bitmap.width + gutter;
    }
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
    );
  } finally {
    for (const bitmap of bitmaps) bitmap.close();
  }
}

/** Turn a rendered PNG into a flattened JPG on a solid ground. */
export async function pngToJpg(png: Blob, background = '#ffffff', quality = 0.92): Promise<Blob> {
  const bitmap = await createImageBitmap(png);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))), 'image/jpeg', quality),
  );
}

/**
 * Resize a rendered PNG to a requested size, with trim / padding / ground.
 *
 * Trim reads the alpha channel for the artwork's bounding box; a design
 * with a painted background has no transparent margin and trims to itself,
 * which is the honest answer.
 */
export async function resizePng(png: Blob, size: CustomSize): Promise<Blob> {
  const bitmap = await createImageBitmap(png);
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (size.trim) {
    const probe = document.createElement('canvas');
    probe.width = bitmap.width;
    probe.height = bitmap.height;
    const pctx = probe.getContext('2d');
    if (pctx) {
      pctx.drawImage(bitmap, 0, 0);
      const { data, width, height } = pctx.getImageData(0, 0, probe.width, probe.height);
      let minX = width;
      let minY = height;
      let maxX = -1;
      let maxY = -1;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          if (data[(y * width + x) * 4 + 3] > 8) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        sx = minX;
        sy = minY;
        sw = maxX - minX + 1;
        sh = maxY - minY + 1;
      }
    }
  }
  const pad = Math.max(0, size.padding ?? 0);
  const innerW = Math.max(1, Math.round(size.width) - pad * 2);
  const innerH = size.height
    ? Math.max(1, Math.round(size.height) - pad * 2)
    : Math.max(1, Math.round((innerW * sh) / sw));
  const canvas = document.createElement('canvas');
  canvas.width = innerW + pad * 2;
  canvas.height = innerH + pad * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context');
  if (size.background && size.background !== 'transparent') {
    ctx.fillStyle = size.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Fit inside the inner box, centred — a custom size is a frame, not a stretch.
  const scale = Math.min(innerW / sw, innerH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, pad + (innerW - dw) / 2, pad + (innerH - dh) / 2, dw, dh);
  bitmap.close();
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))), 'image/png'),
  );
}

/**
 * Wrap a raster in a PDF page at the deliverable's physical size.
 *
 * Honest about what it is: a print-ready PAGE (correct paper size and
 * orientation, 300dpi-class raster) — not vector. The per-kind exporters
 * replace the raster with real text and shapes family by family; this is
 * what "For print" means until they do.
 */
export async function pngToPdf(
  png: Blob,
  page: { widthMm: number; heightMm: number } | 'fit',
): Promise<Blob> {
  const { default: jsPDF } = await import('jspdf');
  const bitmap = await createImageBitmap(png);
  const ratio = bitmap.width / bitmap.height;
  bitmap.close();
  const size =
    page === 'fit'
      ? { widthMm: 200, heightMm: 200 / ratio }
      : page;
  const pdf = new jsPDF({
    unit: 'mm',
    format: [size.widthMm, size.heightMm],
    orientation: size.widthMm >= size.heightMm ? 'landscape' : 'portrait',
  });
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(png);
  });
  // Fit the image on the page, centred, keeping its own ratio.
  const pageRatio = size.widthMm / size.heightMm;
  const w = ratio >= pageRatio ? size.widthMm : size.heightMm * ratio;
  const h = ratio >= pageRatio ? size.widthMm / ratio : size.heightMm;
  pdf.addImage(dataUrl, 'PNG', (size.widthMm - w) / 2, (size.heightMm - h) / 2, w, h, undefined, 'FAST');
  return pdf.output('blob') as Blob;
}

/** Physical page for "For print", by storage label. Absent = fit the image. */
export const PRINT_PAGE_MM: Record<string, { widthMm: number; heightMm: number }> = {
  'Business Card': { widthMm: 85, heightMm: 55 },
  Letterhead: { widthMm: 210, heightMm: 297 },
  Invoice: { widthMm: 210, heightMm: 297 },
  Envelope: { widthMm: 220, heightMm: 110 },
};
