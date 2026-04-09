/**
 * variantStudioMaterializer — claim a public-mode session as a real
 * brand. Registered with the platform so `claimSession` can call it
 * by slug after signup.
 *
 * The contract: turn the saved `VariantSessionPayload` into a
 * `CreateBrandInput` plus a follow-up `Brand` patch. The patch is
 * what carries `logoAssets` and any rich data the create-input
 * doesn't accept directly.
 */
import type { Brand, BrandLogoAssets } from '@/shared/types/brand';
import type { Materializer } from '../core';
import { registerMaterializer } from '../core';
import { renderSvg } from './render/renderSvg';
import type { VariantSessionPayload, VariantSpec } from './engine/types';

export const variantStudioMaterializer: Materializer<VariantSessionPayload> = (session) => {
  const payload = session.payload;
  const sources = payload.sources ?? [];
  const palette = payload.palette;
  // The first source is the canonical "brand logo" used by the brand
  // record. Additional sources still have all their variants saved
  // into logoAssets, just without dedicated identity slots.
  const primarySource = sources[0] ?? null;
  const sourceById = new Map(sources.map((s) => [s.id, s]));

  const brandName = primarySource?.wordmark?.text || 'My First Brand';
  const primaryColor = palette.brandColors[0]?.hex ?? '#0EA5E9';
  const secondaryColor = palette.brandColors[1]?.hex;

  // Bake the pinned variants (or all variants, falling back) into
  // logoAssets slots so they appear immediately in LogoFilesModule.
  const variantsToSave: VariantSpec[] =
    payload.pinned.length > 0
      ? payload.variants.filter((v) => payload.pinned.includes(v.id))
      : payload.variants;

  const logoAssets: BrandLogoAssets = {};
  // Heuristic mapping: most-recent matches win each slot.
  for (const v of variantsToSave) {
    const src = sourceById.get(v.sourceId);
    if (!src) continue;
    const svg = renderSvg({ source: src, spec: v, palette, width: 1024, height: 1024 });
    const dataUrl = svgToDataUrl(svg);
    if (v.composition === 'icon-only' && !logoAssets.icon) logoAssets.icon = dataUrl;
    else if (v.composition === 'wordmark-only' && !logoAssets.wordmark) logoAssets.wordmark = dataUrl;
    else if (v.colorMode === 'mono-black' && !logoAssets.dark) logoAssets.dark = dataUrl;
    else if (v.colorMode === 'mono-white' && !logoAssets.light) logoAssets.light = dataUrl;
    else if (v.layout === 'stacked' && !logoAssets.alternate) logoAssets.alternate = dataUrl;
    else if (!logoAssets.full) logoAssets.full = dataUrl;
  }

  const fullLogo =
    logoAssets.full ??
    (primarySource?.original.svg
      ? svgToDataUrl(primarySource.original.svg)
      : primarySource?.original.raster);

  const patch: Partial<Brand> = {
    logo: fullLogo,
    logoAssets,
  };

  return {
    create: {
      name: brandName,
      logo: fullLogo,
      primaryColor,
      secondaryColor,
      fonts: { primary: primarySource?.wordmark?.fontFamily ?? 'Inter, sans-serif' },
      tone: 'Professional',
      audience: 'General',
    },
    patch,
  };
};

// Side effect: register on import. Tools register themselves so the
// platform doesn't need to know about specific slugs.
registerMaterializer<VariantSessionPayload>(
  'logo-variant-generator',
  variantStudioMaterializer,
);

function svgToDataUrl(svg: string): string {
  const encoded = typeof window === 'undefined' ? '' : window.btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}
