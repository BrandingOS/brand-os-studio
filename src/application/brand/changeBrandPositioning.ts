/**
 * Application use-case: change a brand's positioning / audience essentials.
 *
 * `strategy.positioning` and `strategy.targetAudience` are sentences and stay
 * where they are; this is their structured counterpart, so an audience can be
 * addressed as data (label, descriptor, priority) rather than parsed out of
 * prose. Competitors are labels only — no CRM, no entity system.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';
import type { Positioning } from '@/domain/brand/identity';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { withCoreWrites, type CoreWriteOptions } from './coreWrite';

export async function changeBrandPositioning(
  repo: BrandRepository,
  brandId: string,
  change: Partial<Positioning>,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandPositioning: brand not found: ${brandId}`);

  const touched = (Object.keys(change) as (keyof Positioning)[])
    .filter((k) => change[k] !== undefined)
    .map((k) => `positioning.${k}` as CoreFieldPath);

  const next = withCoreWrites(
    {
      ...brand,
      identity: {
        ...brand.identity,
        positioning: { ...brand.identity.positioning, ...change },
      },
    },
    touched,
    opts,
  );
  assertCanonicalBrand(next);
  return repo.save(next);
}
