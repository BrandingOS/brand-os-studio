/**
 * Brand font loader
 *
 * Single source of truth for loading brand fonts at runtime so any
 * surface (dashboard, brand editor, brand-kit, exports) renders the
 * same family. Two sources are supported:
 *
 *   1. **Uploaded files** on `brand.typography.{primary|secondary}.files`.
 *      The user-supplied bytes (data URLs from the Setup uploader)
 *      are registered via the FontFace API so the family is available
 *      to CSS as `font-family: "<family>"`. This branch wins when
 *      present — the user picked this exact cut, so it must render.
 *
 *   2. **Google Fonts** otherwise. We inject the standard
 *      `<link rel="stylesheet">` against fonts.googleapis.com.
 *
 * The browser's own font fallback chain handles the "neither source
 * worked" case — the consumer's CSS already specifies a generic
 * fallback (`serif`/`sans-serif`/system stack).
 *
 * Idempotent: every entry point caches by family name (and per-file
 * signature for uploads) so repeat calls are cheap.
 */

import type { Brand } from '@/shared/types/brand';
import type { FontTokenFile } from '@/shared/types/brandAssets';

/** Families we've already pushed to Google Fonts. */
const googleLoaded = new Set<string>();
/** Per-file signatures (family|weight|name|size) we've added to
 *  document.fonts. Lets us re-call after typography updates without
 *  duplicating FontFace registrations. */
const uploadedLoaded = new Set<string>();

const SYSTEM_FONTS = new Set([
  'arial', 'helvetica', 'helvetica neue', 'times', 'times new roman',
  'georgia', 'courier', 'courier new', 'monaco', 'menlo', 'consolas',
  'system-ui', '-apple-system', 'sans-serif', 'serif', 'monospace',
  'inherit', 'initial', 'unset',
]);

function normalizeFamily(family: string): string {
  return family.trim().toLowerCase().replace(/['"]/g, '');
}

function isSystemFont(family: string): boolean {
  return SYSTEM_FONTS.has(normalizeFamily(family));
}

function familyToGoogleParam(family: string): string {
  return family.trim().replace(/['"]/g, '').replace(/\s+/g, '+');
}

/** Map a free-form weight label ("Bold", "SemiBold", "300", "Light Italic")
 *  to a CSS `font-weight` value. Unknown labels fall back to 400. */
function weightLabelToCss(label: string): string {
  const lower = label.toLowerCase();
  // Numeric weights pass through.
  const num = lower.match(/\b([1-9]\d{2})\b/);
  if (num) return num[1];
  if (lower.includes('thin') || lower.includes('hairline')) return '100';
  if (lower.includes('extralight') || lower.includes('ultralight')) return '200';
  if (lower.includes('light')) return '300';
  if (lower.includes('medium')) return '500';
  if (lower.includes('semibold') || lower.includes('demibold')) return '600';
  if (lower.includes('extrabold') || lower.includes('ultrabold')) return '800';
  if (lower.includes('black') || lower.includes('heavy')) return '900';
  if (lower.includes('bold')) return '700';
  return '400';
}

function styleFromLabel(label: string): 'italic' | 'normal' {
  return /italic|oblique/i.test(label) ? 'italic' : 'normal';
}

/** Pick one file per (weight, style) combination, preferring woff2
 *  when multiple formats of the same cut were uploaded. The browser
 *  only needs one, and woff2 is smallest. */
function pickBestFiles(files: FontTokenFile[]): FontTokenFile[] {
  const formatRank: Record<FontTokenFile['format'], number> = {
    woff2: 4,
    woff: 3,
    ttf: 2,
    otf: 1,
    eot: 0,
  };
  const byCut = new Map<string, FontTokenFile>();
  for (const f of files) {
    const key = `${weightLabelToCss(f.weight)}|${styleFromLabel(f.weight)}`;
    const incumbent = byCut.get(key);
    if (!incumbent || formatRank[f.format] > formatRank[incumbent.format]) {
      byCut.set(key, f);
    }
  }
  return Array.from(byCut.values());
}

/** Register one family's uploaded files with the browser. Each cut
 *  becomes its own FontFace so weight/italic switches resolve to the
 *  right file. */
function registerUploadedFamily(family: string, files: FontTokenFile[]): void {
  if (typeof document === 'undefined') return;
  if (typeof FontFace === 'undefined') return;
  if (!family || files.length === 0) return;

  const best = pickBestFiles(files);
  for (const file of best) {
    const sig = `${normalizeFamily(family)}|${file.weight}|${file.name}|${file.size}`;
    if (uploadedLoaded.has(sig)) continue;
    uploadedLoaded.add(sig);

    try {
      const face = new FontFace(family, `url(${file.dataUrl})`, {
        weight: weightLabelToCss(file.weight),
        style: styleFromLabel(file.weight),
        display: 'swap',
      });
      face
        .load()
        .then((loaded) => {
          (document as Document & { fonts: FontFaceSet }).fonts.add(loaded);
        })
        .catch(() => {
          // If decode fails (corrupt file, unsupported format), drop
          // the cache entry so a retry can happen later.
          uploadedLoaded.delete(sig);
        });
    } catch {
      uploadedLoaded.delete(sig);
    }
  }
}

/** Fall back to Google Fonts: idempotent <link> injection. */
function loadFromGoogle(family: string, weights: number[] = [400, 500, 600, 700]): void {
  if (typeof document === 'undefined') return;
  if (!family || isSystemFont(family)) return;

  const key = normalizeFamily(family);
  if (googleLoaded.has(key)) return;
  googleLoaded.add(key);

  const param = familyToGoogleParam(family);
  const weightsParam = weights.join(';');
  const href = `https://fonts.googleapis.com/css2?family=${param}:wght@${weightsParam}&display=swap`;

  if (document.querySelector(`link[href="${href}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.brandFont = key;
  document.head.appendChild(link);
}

/** Public entry: register uploaded font files for one family. Used
 *  by the Setup page so the live typography preview swaps to the
 *  user's uploaded cut the moment they drop the file — no need to
 *  wait for the canonical Brand to round-trip through persist. */
export function registerUploadedFontFamily(
  family: string,
  files: FontTokenFile[],
): void {
  registerUploadedFamily(family, files);
}

/** Public entry: load a family without per-cut data. Used by
 *  free-form font pickers (typescale tool, brand-board panel) where
 *  the only context is a name. Always goes to Google Fonts — these
 *  flows have no upload context to consult. */
export function loadFontFamily(
  family: string,
  weights: number[] = [400, 500, 600, 700],
): void {
  loadFromGoogle(family, weights);
}

/** Public entry: load every font referenced by a brand. Prefers
 *  uploaded files when present, falls back to Google Fonts otherwise.
 *  Safe to call on every store update — both branches are cached. */
export function loadBrandFonts(brand: Pick<Brand, 'fonts' | 'typography'> | undefined | null): void {
  if (!brand) return;

  const slots: Array<{
    family: string | undefined;
    files: FontTokenFile[] | undefined;
  }> = [
    {
      family: brand.typography?.primary?.family ?? brand.fonts?.primary,
      files: brand.typography?.primary?.files,
    },
    {
      family: brand.typography?.secondary?.family ?? brand.fonts?.secondary,
      files: brand.typography?.secondary?.files,
    },
    {
      family: brand.typography?.accent?.family,
      files: brand.typography?.accent?.files,
    },
  ];

  for (const slot of slots) {
    if (!slot.family || isSystemFont(slot.family)) continue;
    if (slot.files && slot.files.length > 0) {
      registerUploadedFamily(slot.family, slot.files);
    } else {
      loadFromGoogle(slot.family);
    }
  }
}

/** For tests / debugging — clears the in-memory caches. Does NOT
 *  remove DOM links or FontFaces already added to document.fonts. */
export function _resetFontCache(): void {
  googleLoaded.clear();
  uploadedLoaded.clear();
}
