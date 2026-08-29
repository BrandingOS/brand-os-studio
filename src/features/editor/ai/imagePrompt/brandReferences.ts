// brandReferences — the reference images that carry the brand INTO the
// image model (this is what makes a generation actually on-brand rather
// than prompt-flavoured):
//
//   logo     the brand's primary logo (iconmark / wordmark fallback),
//            rasterized to a 1024² PNG on transparent — attached ONLY
//            when the compiler said `useLogo` and the user kept the chip.
//   palette  a canvas-rendered swatch card of the compiler's chosen hexes
//            (blocks + hex labels) — models like Nano Banana / GPT Image
//            read it as "these are the colors".
//   previous the image being varied / refined.
//
// Nothing is built for a model whose caps say maxRefs === 0.
//
// ORDER IS A DECISION, and it was the wrong one. The user's own reference used
// to be appended LAST, so when a model's `maxReferenceImages` bit, the first
// thing dropped was the picture the user had personally chosen to attach —
// while our generated palette swatch survived. The order below drops OUR
// helpers first and the user's material last, because a reference the user
// attached is the strongest statement of intent in the whole request.

import type { Brand } from '@/shared/types/brand';
import type { LogoRole } from '@/shared/types/brandAssets';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import { rasterizeLogo } from '@/shared/brand/rasterizeLogo';
import { pickFgOnBackground } from '@/shared/brand/logoOnBackground';
import type { ImageReferenceInput } from '@/features/image-generation';
import type { ImageModelCaps } from '@/features/image-generation';

export interface BrandRefPlan {
  logo: boolean;
  palette: boolean;
  /** Storage path of the image being varied / refined (never a bare URL). */
  previousPath?: string;
  /** Inline bytes when the previous image isn't in storage yet. */
  previousDataUrl?: string;
}

const LOGO_ROLE_ORDER: LogoRole[] = ['primary', 'iconmark', 'wordmark', 'mono.black', 'mono.white'];

export function pickLogoUrlForReference(brand: Brand | null | undefined): string | undefined {
  if (!brand) return undefined;
  for (const role of LOGO_ROLE_ORDER) {
    const url = resolveBrandLogo(brand, role)?.url;
    if (url) return url;
  }
  return undefined;
}

export interface SwatchOptions {
  createCanvas?: () => HTMLCanvasElement;
  width?: number;
  height?: number;
}

/** Render a palette swatch card: equal color blocks with hex labels. */
export function renderPaletteSwatch(hexes: string[], opts: SwatchOptions = {}): string | null {
  const clean = hexes.filter((h) => /^#[0-9a-f]{6}$/i.test(h)).slice(0, 6);
  if (clean.length === 0) return null;
  const width = opts.width ?? 1024;
  const height = opts.height ?? 512;
  try {
    const canvas = (opts.createCanvas ?? (() => document.createElement('canvas')))();
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    const cell = width / clean.length;
    clean.forEach((hex, i) => {
      ctx.fillStyle = hex;
      ctx.fillRect(i * cell, 0, cell, height);
      ctx.fillStyle = pickFgOnBackground(hex, ['#111111', '#ffffff']);
      ctx.font = `600 ${Math.round(Math.min(cell, height) * 0.12)}px -apple-system, Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(hex.toUpperCase(), i * cell + cell / 2, height * 0.88);
    });
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

/** A reference the user attached, and what they attached it FOR. */
export interface UserReference {
  path: string;
  /**
   * `subject` — the actual thing: reproduce it faithfully.
   * `style`   — inspiration only: never copy its subject.
   */
  use: 'subject' | 'style';
}

export interface BuildRefsInput {
  brand: Brand | null | undefined;
  caps: ImageModelCaps;
  plan: BrandRefPlan;
  paletteHexes: string[];
  /** User-attached references, in send order, each with its purpose. */
  userReferences?: UserReference[];
}

export interface BuiltRefs {
  references: ImageReferenceInput[];
  /** Which roles actually made it (for the doc's generation record + UI). */
  roles: Array<ImageReferenceInput['role']>;
}

export async function buildBrandReferences(
  input: BuildRefsInput,
  hooks: { rasterize?: typeof rasterizeLogo; swatch?: typeof renderPaletteSwatch } = {},
): Promise<BuiltRefs> {
  const references: ImageReferenceInput[] = [];
  if (!input.caps.supportsReferenceImages || input.caps.maxReferenceImages <= 0) {
    return { references, roles: [] };
  }

  // A reference is a path in our own storage or inline bytes — never a URL the
  // server would have to fetch on our behalf (that was an SSRF).
  //
  // 1. The image being refined. It IS the subject of a refine, so it outranks
  //    everything: dropping it would answer a different request entirely.
  if (input.plan.previousPath) {
    references.push({ role: 'previous', path: input.plan.previousPath, label: 'This image' });
  } else if (input.plan.previousDataUrl?.startsWith('data:')) {
    references.push({ role: 'previous', dataUrl: input.plan.previousDataUrl, label: 'This image' });
  }

  // 2. The user's own material, subject before style — a subject reference
  //    carries identity that cannot be recovered from words, a style reference
  //    carries a quality that partly can.
  const mine = input.userReferences ?? [];
  for (const ref of mine.filter((r) => r.use === 'subject')) {
    references.push({ role: 'product', path: ref.path, label: 'Subject reference' });
  }
  for (const ref of mine.filter((r) => r.use === 'style')) {
    references.push({ role: 'style', path: ref.path, label: 'Style reference' });
  }

  // 3. Ours last, so the cap eats these first.
  if (input.plan.logo) {
    const url = pickLogoUrlForReference(input.brand);
    if (url) {
      const png = await (hooks.rasterize ?? rasterizeLogo)(url, { size: 1024, padding: 0.12 });
      if (png) references.push({ role: 'logo', dataUrl: png });
    }
  }
  if (input.plan.palette && input.paletteHexes.length) {
    const png = (hooks.swatch ?? renderPaletteSwatch)(input.paletteHexes);
    if (png) references.push({ role: 'palette', dataUrl: png });
  }

  const capped = references.slice(0, input.caps.maxReferenceImages);
  return { references: capped, roles: capped.map((r) => r.role) };
}
