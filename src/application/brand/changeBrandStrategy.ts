/**
 * Application use-case: change a brand's strategy (Brand System finalization).
 *
 * `Strategy` (mission/vision/values/positioning/personality/targetAudience) is
 * modeled canonically. The AUTHORITATIVE read-home today is `guidelines.strategy`
 * — read by `fromLegacyBrand` (`resolveStrategy`) and written by both the caller
 * and the still-legacy Setup surface, so the two surfaces never diverge. This
 * use-case owns the canonical merge + validation and persists strategy into the
 * `identity` blob as a FORWARD store (nothing reads it as strategy yet); the
 * blob becomes the read authority only once Setup is migrated and `resolveStrategy`
 * flips to prefer it (backlog B16). Because the blob is not the read-home, callers
 * MUST also write `guidelines.strategy` (they hold `brand.guidelines` for a
 * loss-free sibling-key merge) and should treat this call as best-effort.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { CORE_FIELD_PATHS, type CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { withCoreWrites, type CoreWriteOptions } from './coreWrite';
import { assertCanonicalBrand, type CanonicalBrand, type Strategy } from '@/domain/brand';

export type StrategyChange = Partial<
  Pick<
    Strategy,
    | 'summary'
    | 'mission'
    | 'vision'
    | 'values'
    | 'positioning'
    | 'personality'
    | 'targetAudience'
    | 'aboutSections'
  >
>;

export async function changeBrandStrategy(
  repo: BrandRepository,
  brandId: string,
  change: StrategyChange,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandStrategy: brand not found: ${brandId}`);

  // Only the keys actually present in the change are stamped, so touching
  // `mission` never claims that `values` was re-decided at the same moment.
  const touched = (Object.keys(change) as (keyof StrategyChange)[])
    .filter((k) => change[k] !== undefined)
    .map((k) => `strategy.${k}` as CoreFieldPath)
    .filter((p) => CORE_FIELD_PATHS.includes(p as never));

  const next: CanonicalBrand = withCoreWrites(
    {
      ...brand,
      identity: {
        ...brand.identity,
        strategy: { ...brand.identity.strategy, ...change },
      },
    },
    touched,
    opts,
  );
  assertCanonicalBrand(next);
  return repo.save(next);
}
