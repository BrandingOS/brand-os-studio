/**
 * Application use-case: change a brand's visual style attributes.
 *
 * Visual style is the Core subsystem the product previously expressed only as
 * `brand.uiStyle` (a Brand Board concern: border radius, shadow, spacing,
 * weight). Canonically it is a closed set of enumerated attributes any renderer
 * or prompt can act on. `fromLegacyBrand` maps `uiStyle` in on read, so a brand
 * that has only ever been styled through Brand Board already has sensible
 * values here before anyone writes through this op.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';
import type { VisualStyle } from '@/domain/brand/identity';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { withCoreWrites, type CoreWriteOptions } from './coreWrite';

export async function changeBrandVisualStyle(
  repo: BrandRepository,
  brandId: string,
  change: Partial<VisualStyle>,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandVisualStyle: brand not found: ${brandId}`);

  // Filter ONCE and use the same patch for both the value and its metadata.
  // Spreading `change` directly would let an explicit `{ density: undefined }`
  // clear a stored attribute while `touched` skipped it — a silent erase with
  // no record of who did it.
  const patch = Object.fromEntries(
    Object.entries(change).filter(([, value]) => value !== undefined),
  ) as Partial<VisualStyle>;

  const touched = (Object.keys(patch) as (keyof VisualStyle)[])
    .map((k) => `visualStyle.${k}` as CoreFieldPath);

  const next = withCoreWrites(
    {
      ...brand,
      identity: {
        ...brand.identity,
        visualStyle: { ...brand.identity.visualStyle, ...patch },
      },
    },
    touched,
    opts,
  );
  assertCanonicalBrand(next);
  return repo.save(next);
}
