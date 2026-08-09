/**
 * Application use-case: change a brand's typography families (Batch A2).
 *
 * The canonical typography mutation. Font FAMILIES are the persisted authority
 * today (weights are not written by any current surface; type-scale is
 * preview-only — see docs/phase-2 discovery). This operation updates the
 * canonical TypographySystem; `toLegacyBrandPatch` projects the family back to
 * the legacy `fonts.*` scalars one-way for un-migrated readers.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand, type FontToken } from '@/domain/brand';

export interface TypographyFamilyChanges {
  primary?: string;
  secondary?: string | undefined;
}

/** Per-slot typography change: family and/or uploaded font files/weights. */
export interface TypographySlotChange {
  family?: string;
  files?: FontToken['files'];
  weights?: FontToken['weights'];
}
export interface TypographyChanges {
  primary?: TypographySlotChange;
  /** `null` clears the secondary slot. */
  secondary?: TypographySlotChange | null;
}

/**
 * The canonical typography mutation — families AND durable uploaded font files.
 * Files matter for the authority flip: once identity is canonical, reads hydrate
 * `brand.typography` from the identity blob, so a file that only lived on the
 * legacy `typography` field (not the blob) would be dropped on the next read.
 * Routing files here keeps them in the blob.
 */
export async function changeBrandTypography(
  repo: BrandRepository,
  brandId: string,
  changes: TypographyChanges,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandTypography: brand not found: ${brandId}`);

  const t = brand.identity.typography;
  const applySlot = (base: FontToken | undefined, c: TypographySlotChange): FontToken => ({
    ...base,
    family: c.family ?? base?.family ?? '',
    ...(c.files !== undefined ? { files: c.files } : {}),
    ...(c.weights !== undefined ? { weights: c.weights } : {}),
  });

  const next: CanonicalBrand = {
    ...brand,
    identity: {
      ...brand.identity,
      typography: {
        ...t,
        ...(changes.primary ? { primary: applySlot(t.primary, changes.primary) } : {}),
        ...(changes.secondary !== undefined
          ? {
              secondary:
                changes.secondary === null
                  ? undefined
                  : applySlot(t.secondary, changes.secondary),
            }
          : {}),
      },
    },
  };
  assertCanonicalBrand(next);
  return repo.save(next);
}

export async function changeBrandTypographyFamilies(
  repo: BrandRepository,
  brandId: string,
  fams: TypographyFamilyChanges,
): Promise<CanonicalBrand> {
  return changeBrandTypography(repo, brandId, {
    ...(fams.primary ? { primary: { family: fams.primary } } : {}),
    ...(fams.secondary !== undefined
      ? { secondary: fams.secondary ? { family: fams.secondary } : null }
      : {}),
  });
}
