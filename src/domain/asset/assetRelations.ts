/**
 * Asset ↔ identity relationships (Stage 2C).
 *
 * The canonical LogoSystem and Typography reference assets by id. These pure
 * helpers resolve those references against an asset lookup, and mint real Asset
 * records — including from the transitional `legacy-url:<url>` refs that Stage 2A
 * emits for brands whose logos were still stored as raw URLs.
 *
 * Pure and deterministic (no Date.now/random): callers pass ids/timestamps.
 */
import type { AssetFormat, AssetKind, Asset, LogoRef } from './asset';
import type { FontToken } from '@/shared/types/brandAssets';

const LEGACY_URL_PREFIX = 'legacy-url:';

/** True if a ref still points at a raw URL rather than a real Asset (from 2A). */
export function isLegacyUrlRef(assetId: string | undefined): boolean {
  return typeof assetId === 'string' && assetId.startsWith(LEGACY_URL_PREFIX);
}

/** Extract the URL from a `legacy-url:` ref, or null if it is a real asset id. */
export function legacyUrlFromRef(assetId: string | undefined): string | null {
  return isLegacyUrlRef(assetId) ? assetId!.slice(LEGACY_URL_PREFIX.length) : null;
}

/** Infer the stored format from a URL or data: URI. */
export function formatFromUrl(url: string): AssetFormat {
  if (/^data:image\/svg/i.test(url) || /\.svg(\?|#|$)/i.test(url)) return 'svg';
  if (/^data:image\/png/i.test(url) || /\.png(\?|#|$)/i.test(url)) return 'png';
  if (/^data:application\/pdf/i.test(url) || /\.pdf(\?|#|$)/i.test(url)) return 'pdf';
  if (/^data:image\/webp/i.test(url) || /\.webp(\?|#|$)/i.test(url)) return 'webp';
  if (/^data:image\/jpe?g/i.test(url) || /\.jpe?g(\?|#|$)/i.test(url)) return 'jpg';
  return 'svg';
}

export interface MintAssetInput {
  id: string;
  brandId: string;
  url: string;
  name: string;
  kind?: AssetKind;
  role?: string;
  /** ISO timestamp — caller supplies for determinism. */
  createdAt?: string;
  contentHash?: string;
}

/** Create a canonical Asset from a single stored URL (upload or legacy migration). */
export function mintAssetFromUrl(input: MintAssetInput): Asset {
  const format = formatFromUrl(input.url);
  return {
    id: input.id,
    brandId: input.brandId,
    status: 'active',
    kind: input.kind ?? 'logo',
    role: input.role,
    name: input.name,
    formats: { [format]: { url: input.url, size: 0 } },
    tags: undefined,
    metadata: {
      createdAt: input.createdAt ?? '',
      version: 1,
      contentHash: input.contentHash,
    },
  };
}

/**
 * Turn a transitional `legacy-url:` LogoRef into a real Asset. Returns null if the
 * ref is already a real asset id (nothing to mint).
 */
export function mintAssetFromLegacyLogoRef(
  ref: LogoRef,
  opts: { id: string; brandId: string; name: string; role?: string; createdAt?: string },
): Asset | null {
  const url = legacyUrlFromRef(ref.assetId);
  if (url === null) return null;
  return mintAssetFromUrl({
    id: opts.id,
    brandId: opts.brandId,
    url,
    name: opts.name,
    kind: 'logo',
    role: opts.role,
    createdAt: opts.createdAt,
  });
}

/** Resolve a LogoRef to its Asset via a lookup (undefined if missing/unresolved). */
export function resolveLogoAsset(
  ref: LogoRef | undefined,
  lookup: (assetId: string) => Asset | undefined,
): Asset | undefined {
  if (!ref) return undefined;
  return lookup(ref.assetId);
}

/** Resolve an uploaded font's Asset from a FontToken's `fontAssetId`. */
export function resolveFontAsset(
  token: Pick<FontToken, 'fontAssetId'> | undefined,
  lookup: (assetId: string) => Asset | undefined,
): Asset | undefined {
  if (!token?.fontAssetId) return undefined;
  return lookup(token.fontAssetId);
}
