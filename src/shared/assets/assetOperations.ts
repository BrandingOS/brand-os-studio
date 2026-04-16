/**
 * Pure asset operations — produce Brand patches for the unified v3
 * brand asset system. No React, no store access. Callers apply the
 * returned patches via `useBrandStore.update(brandId, patch)`.
 *
 * Every brand asset mutation in the app should route through one of
 * these functions so behavior (dedup, version bumping, ref cleanup)
 * stays consistent.
 */
import type { Brand } from '@/shared/types/brand';
import type {
  AssetFile,
  AssetFormat,
  BrandAsset,
  BrandAssetKind,
  LogoRef,
  LogoRole,
  LogoSystemRefs,
} from '@/shared/types/brandAssets';

/** Same FNV-1a hash used by migrateSchema — keep ids stable. */
export function hashUrl(url: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function detectFormatFromUrl(url: string): AssetFormat {
  const lower = url.toLowerCase();
  if (lower.startsWith('data:image/svg') || lower.endsWith('.svg')) return 'svg';
  if (lower.startsWith('data:image/webp') || lower.endsWith('.webp')) return 'webp';
  if (lower.startsWith('data:image/jpeg') || lower.startsWith('data:image/jpg')) return 'jpg';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg';
  if (lower.startsWith('data:application/pdf') || lower.endsWith('.pdf')) return 'pdf';
  return 'png';
}

/** The LogoSystemRefs field name for a given logo role. */
function setLogoRef(
  ls: LogoSystemRefs | undefined,
  role: LogoRole,
  ref: LogoRef | undefined,
): LogoSystemRefs {
  const base: LogoSystemRefs = ls ? { ...ls } : {};
  switch (role) {
    case 'primary':
      base.primary = ref;
      break;
    case 'secondary':
      base.secondary = ref;
      break;
    case 'wordmark':
      base.wordmark = ref;
      break;
    case 'iconmark':
      base.iconmark = ref;
      break;
    case 'mono.black':
      base.mono = { ...(base.mono ?? {}), black: ref };
      break;
    case 'mono.white':
      base.mono = { ...(base.mono ?? {}), white: ref };
      break;
    case 'horizontal':
      base.orientations = { ...(base.orientations ?? {}), horizontal: ref };
      break;
    case 'stacked':
      base.orientations = { ...(base.orientations ?? {}), stacked: ref };
      break;
  }
  return base;
}

/** Input describing a new or replacement asset. */
export interface StageAssetInput {
  url: string;
  kind: BrandAssetKind;
  name: string;
  file?: Partial<AssetFile>;
  width?: number;
  height?: number;
  originalName?: string;
  tags?: string[];
  /** When replacing, use the same id and bump version. */
  replaceAssetId?: string;
}

/**
 * Stage a new asset (or a replacement) and return the updated
 * `brandAssets[]` list plus the final asset entry. De-duplicates by
 * URL hash — an identical URL yields the same id without a second copy.
 */
export function stageAsset(
  brand: Brand,
  input: StageAssetInput,
): { brandAssets: BrandAsset[]; asset: BrandAsset } {
  const now = new Date().toISOString();
  const format = detectFormatFromUrl(input.url);
  const existing = brand.brandAssets ?? [];
  const contentHash = hashUrl(input.url);

  const replaceId = input.replaceAssetId;
  const existingAsset = replaceId
    ? existing.find((a) => a.id === replaceId)
    : existing.find((a) => a.metadata?.contentHash === contentHash);

  const id = existingAsset?.id ?? `asset-${contentHash}`;
  const version = existingAsset ? (existingAsset.metadata.version ?? 1) + 1 : 1;

  const file: AssetFile = {
    url: input.url,
    size: input.file?.size ?? 0,
    mime: input.file?.mime,
    storagePath: input.file?.storagePath,
  };

  const asset: BrandAsset = {
    id,
    kind: input.kind,
    role: existingAsset?.role,
    name: input.name,
    formats: {
      ...(existingAsset?.formats ?? {}),
      [format]: file,
    },
    tags: input.tags ?? existingAsset?.tags,
    metadata: {
      createdAt: existingAsset?.metadata?.createdAt ?? now,
      updatedAt: now,
      version,
      width: input.width ?? existingAsset?.metadata?.width,
      height: input.height ?? existingAsset?.metadata?.height,
      originalName: input.originalName ?? existingAsset?.metadata?.originalName,
      contentHash,
    },
  };

  const brandAssets = existingAsset
    ? existing.map((a) => (a.id === id ? asset : a))
    : [...existing, asset];

  return { brandAssets, asset };
}

/**
 * Assign a logo asset to a LogoSystem slot. Produces a patch suitable
 * for `useBrandStore.update(brandId, patch)`. Also returns the asset
 * so callers can show a preview immediately.
 */
export function stageLogoAssignment(
  brand: Brand,
  input: StageAssetInput & { role: LogoRole; description?: string; usage?: string },
): { patch: Partial<Brand>; asset: BrandAsset } {
  const { brandAssets, asset } = stageAsset(brand, {
    ...input,
    kind: 'logo',
  });

  const ref: LogoRef = {
    assetId: asset.id,
    description: input.description,
    usage: input.usage,
  };

  const logoSystem = setLogoRef(brand.logoSystem, input.role, ref);

  // Tag the asset with its role for easier lookups downstream.
  const taggedAssets = brandAssets.map((a) =>
    a.id === asset.id ? { ...a, role: `logo.${input.role}` } : a,
  );

  const patch: Partial<Brand> = {
    brandAssets: taggedAssets,
    logoSystem,
  };

  // Back-compat: mirror the new URL into legacy fields so consumers
  // that haven't migrated yet still see the fresh logo.
  if (input.role === 'primary') {
    patch.logo = input.url;
    patch.logoAssets = { ...(brand.logoAssets ?? {}), full: input.url };
  } else if (input.role === 'iconmark') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), icon: input.url };
  } else if (input.role === 'wordmark') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), wordmark: input.url };
  } else if (input.role === 'mono.black') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), dark: input.url };
  } else if (input.role === 'mono.white') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), light: input.url };
  }

  return { patch, asset: taggedAssets.find((a) => a.id === asset.id)! };
}

/** Clear a logo ref without deleting the underlying asset. */
export function stageLogoRemoval(
  brand: Brand,
  role: LogoRole,
): Partial<Brand> {
  const logoSystem = setLogoRef(brand.logoSystem, role, undefined);
  const patch: Partial<Brand> = { logoSystem };

  if (role === 'primary') {
    patch.logo = undefined;
    patch.logoAssets = { ...(brand.logoAssets ?? {}), full: undefined };
  } else if (role === 'iconmark') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), icon: undefined };
  } else if (role === 'wordmark') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), wordmark: undefined };
  } else if (role === 'mono.black') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), dark: undefined };
  } else if (role === 'mono.white') {
    patch.logoAssets = { ...(brand.logoAssets ?? {}), light: undefined };
  }

  return patch;
}

/** Remove an asset entirely AND clear any refs that pointed at it. */
export function stageAssetDeletion(brand: Brand, assetId: string): Partial<Brand> {
  const brandAssets = (brand.brandAssets ?? []).filter((a) => a.id !== assetId);

  // Scrub any logoSystem ref pointing at the deleted asset.
  let logoSystem = brand.logoSystem ? { ...brand.logoSystem } : undefined;
  if (logoSystem) {
    const clean = (r?: LogoRef) => (r?.assetId === assetId ? undefined : r);
    logoSystem = {
      ...logoSystem,
      primary: clean(logoSystem.primary),
      secondary: clean(logoSystem.secondary),
      wordmark: clean(logoSystem.wordmark),
      iconmark: clean(logoSystem.iconmark),
      mono: logoSystem.mono
        ? { black: clean(logoSystem.mono.black), white: clean(logoSystem.mono.white) }
        : undefined,
      orientations: logoSystem.orientations
        ? {
            horizontal: clean(logoSystem.orientations.horizontal),
            stacked: clean(logoSystem.orientations.stacked),
          }
        : undefined,
    };
  }

  return { brandAssets, logoSystem };
}
