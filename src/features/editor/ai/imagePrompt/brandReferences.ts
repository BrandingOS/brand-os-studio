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

export interface BuildRefsInput {
  brand: Brand | null | undefined;
  caps: ImageModelCaps;
  plan: BrandRefPlan;
  paletteHexes: string[];
  /** Storage paths of user-attached references (from upload-ai-reference). */
  userReferencePaths?: string[];
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
  if (input.plan.previousPath) {
    references.push({ role: 'previous', path: input.plan.previousPath, label: 'This image' });
  } else if (input.plan.previousDataUrl?.startsWith('data:')) {
    references.push({ role: 'previous', dataUrl: input.plan.previousDataUrl, label: 'This image' });
  }
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
  for (const path of input.userReferencePaths ?? []) {
    references.push({ role: 'image', path });
  }
  const capped = references.slice(0, input.caps.maxReferenceImages);
  return { references: capped, roles: capped.map((r) => r.role) };
}
