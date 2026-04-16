/**
 * Unified logo read hook. Resolves a logo role against a brand's v3
 * `logoSystem` (preferred) with graceful fallback to v2 legacy fields.
 *
 * Usage:
 *   const logo = useBrandLogo(brand, 'primary');
 *   <img src={logo?.url} />
 *
 *   const iconDark = useBrandLogo(brand, 'mono.black', { format: 'svg' });
 *
 * This hook is pure (no state), so it's safe to use in any render path.
 */
import { useMemo } from 'react';
import type { Brand } from '@/shared/types/brand';
import type {
  AssetFile,
  AssetFormat,
  BrandAsset,
  LogoRef,
  LogoRole,
} from '@/shared/types/brandAssets';

export interface ResolvedLogo {
  assetId?: string;
  url: string;
  format: AssetFormat;
  file?: AssetFile;
  /** The underlying asset, if resolvable. */
  asset?: BrandAsset;
  /** LogoRef metadata from the logo system (description, usage). */
  ref?: LogoRef;
}

interface Options {
  /** Preferred format — falls back through svg → png → webp → anything available. */
  format?: AssetFormat;
}

/**
 * Pick the best available file from an asset. Respects preference order.
 */
function pickFile(
  asset: BrandAsset | undefined,
  preferred?: AssetFormat,
): { file: AssetFile; format: AssetFormat } | undefined {
  if (!asset) return undefined;
  const order: AssetFormat[] = preferred
    ? [preferred, 'svg', 'png', 'webp', 'jpg', 'pdf']
    : ['svg', 'png', 'webp', 'jpg', 'pdf'];
  for (const f of order) {
    const file = asset.formats?.[f];
    if (file?.url) return { file, format: f };
  }
  return undefined;
}

function getRef(brand: Brand | null | undefined, role: LogoRole): LogoRef | undefined {
  const ls = brand?.logoSystem;
  if (!ls) return undefined;
  switch (role) {
    case 'primary':
      return ls.primary;
    case 'secondary':
      return ls.secondary;
    case 'wordmark':
      return ls.wordmark;
    case 'iconmark':
      return ls.iconmark;
    case 'mono.black':
      return ls.mono?.black;
    case 'mono.white':
      return ls.mono?.white;
    case 'horizontal':
      return ls.orientations?.horizontal;
    case 'stacked':
      return ls.orientations?.stacked;
    default:
      return undefined;
  }
}

function legacyFallback(brand: Brand | null | undefined, role: LogoRole): string | undefined {
  if (!brand) return undefined;
  switch (role) {
    case 'primary':
      return (
        brand.guidelines?.logoSystem?.primary?.url ??
        brand.logoAssets?.full ??
        brand.logo
      );
    case 'secondary':
      return (
        brand.guidelines?.logoSystem?.secondary?.url ?? brand.logoAssets?.alternate
      );
    case 'wordmark':
      return (
        brand.guidelines?.logoSystem?.wordmark?.url ?? brand.logoAssets?.wordmark
      );
    case 'iconmark':
      return brand.guidelines?.logoSystem?.iconmark?.url ?? brand.logoAssets?.icon;
    case 'mono.black':
      return brand.guidelines?.logoSystem?.blackVersion?.url ?? brand.logoAssets?.dark;
    case 'mono.white':
      return brand.guidelines?.logoSystem?.whiteVersion?.url ?? brand.logoAssets?.light;
    default:
      return undefined;
  }
}

export function useBrandLogo(
  brand: Brand | null | undefined,
  role: LogoRole = 'primary',
  options: Options = {},
): ResolvedLogo | undefined {
  return useMemo(() => resolveBrandLogo(brand, role, options), [brand, role, options.format]);
}

/** Non-hook variant — safe to call outside React. */
export function resolveBrandLogo(
  brand: Brand | null | undefined,
  role: LogoRole = 'primary',
  options: Options = {},
): ResolvedLogo | undefined {
  if (!brand) return undefined;

  // v3 path: logoSystem ref → brandAssets[] lookup.
  const ref = getRef(brand, role);
  if (ref?.assetId) {
    const asset = brand.brandAssets?.find((a) => a.id === ref.assetId);
    const picked = pickFile(asset, options.format ?? ref.preferredFormat);
    if (picked) {
      return {
        assetId: ref.assetId,
        url: picked.file.url,
        format: picked.format,
        file: picked.file,
        asset,
        ref,
      };
    }
  }

  // v2 fallback: scan legacy fields. Yields a URL but no asset record.
  const url = legacyFallback(brand, role);
  if (!url) return undefined;
  return {
    url,
    format: detectFormatFromUrl(url),
  };
}

function detectFormatFromUrl(url: string): AssetFormat {
  const lower = url.toLowerCase();
  if (lower.startsWith('data:image/svg') || lower.endsWith('.svg')) return 'svg';
  if (lower.startsWith('data:image/webp') || lower.endsWith('.webp')) return 'webp';
  if (lower.startsWith('data:image/jpeg') || lower.startsWith('data:image/jpg')) return 'jpg';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
  if (lower.startsWith('data:application/pdf') || lower.endsWith('.pdf')) return 'pdf';
  return 'png';
}
