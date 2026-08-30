/**
 * Application use-case: change a brand's typography families (Batch A2).
 *
 * The canonical typography mutation. Families, weights, uploaded files AND the
 * type scale are all persisted authority — the scale stopped being
 * "preview-only" the moment a panel offered to save one (QA Q5). This operation
 * updates the canonical TypographySystem; `toLegacyBrandPatch` projects the
 * family back to the legacy `fonts.*` scalars one-way for un-migrated readers.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { withCoreWrites, type CoreWriteOptions } from './coreWrite';
import { assertCanonicalBrand, type CanonicalBrand, type FontToken } from '@/domain/brand';
import type { FontScaleTokens } from '@/shared/types/brandAssets';

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
  /**
   * The eleven sizes the brand sets its type at.
   *
   * `typography.scale` has been a declared Core field since the registry was
   * written, and `TypographySystem` has always had somewhere to keep it — but
   * this operation had no parameter for it, so the one caller that sends a
   * scale (the Brand Kit's Typography editor) watched its patch reach the
   * router, get filtered down to two families, and vanish. The confirmation
   * still appeared, because nothing failed: a value with nowhere to live is
   * dropped silently (QA Q5, the same shape as the Colors bug in c6008578).
   */
  scale?: FontScaleTokens;
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
  opts?: CoreWriteOptions,
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

  const touched: CoreFieldPath[] = [];
  if (changes.primary) touched.push('typography.primary');
  if (changes.secondary !== undefined) touched.push('typography.secondary');
  if (changes.scale) touched.push('typography.scale');

  const next: CanonicalBrand = withCoreWrites({
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
        // MERGED, never assigned: a caller that sends only the sizes it
        // changed must not silently drop the roles it did not name.
        ...(changes.scale ? { scale: { ...t.scale, ...changes.scale } } : {}),
      },
    },
  }, touched, opts);
  assertCanonicalBrand(next);
  return repo.save(next);
}

export async function changeBrandTypographyFamilies(
  repo: BrandRepository,
  brandId: string,
  fams: TypographyFamilyChanges,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  return changeBrandTypography(
    repo,
    brandId,
    {
      ...(fams.primary ? { primary: { family: fams.primary } } : {}),
      ...(fams.secondary !== undefined
        ? { secondary: fams.secondary ? { family: fams.secondary } : null }
        : {}),
    },
    opts,
  );
}
