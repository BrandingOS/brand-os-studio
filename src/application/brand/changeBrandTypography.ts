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
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';

export interface TypographyFamilyChanges {
  primary?: string;
  secondary?: string | undefined;
}

export async function changeBrandTypographyFamilies(
  repo: BrandRepository,
  brandId: string,
  fams: TypographyFamilyChanges,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandTypographyFamilies: brand not found: ${brandId}`);

  const t = brand.identity.typography;
  const next: CanonicalBrand = {
    ...brand,
    identity: {
      ...brand.identity,
      typography: {
        ...t,
        ...(fams.primary ? { primary: { ...t.primary, family: fams.primary } } : {}),
        ...(fams.secondary !== undefined
          ? {
              secondary: fams.secondary
                ? { ...(t.secondary ?? { family: fams.secondary }), family: fams.secondary }
                : undefined,
            }
          : {}),
      },
    },
  };
  assertCanonicalBrand(next);
  return repo.save(next);
}
