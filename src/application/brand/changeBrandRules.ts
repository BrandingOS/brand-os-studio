/**
 * Application use-case: change a brand's core rules.
 *
 * Rules here are the MACHINE-CHECKABLE subset — minimum logo size, clear space,
 * prohibited logo treatments, colour pairs that must never meet, minimum body
 * size, allowed weights, terms to avoid or prefer. Narrative do/don'ts stay on
 * `Voice`. Merging is per-group rather than deep so replacing the logo rules
 * cannot silently drop the colour rules.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';
import type { BrandRules } from '@/domain/brand/identity';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { withCoreWrites, type CoreWriteOptions } from './coreWrite';

export async function changeBrandRules(
  repo: BrandRepository,
  brandId: string,
  change: Partial<BrandRules>,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandRules: brand not found: ${brandId}`);

  const current = brand.identity.rules ?? {};
  const groups = (Object.keys(change) as (keyof BrandRules)[]).filter(
    (k) => change[k] !== undefined,
  );

  const merged: BrandRules = { ...current };
  for (const g of groups) {
    merged[g] = { ...(current[g] ?? {}), ...(change[g] ?? {}) } as never;
  }

  const next = withCoreWrites(
    { ...brand, identity: { ...brand.identity, rules: merged } },
    groups.map((g) => `rules.${g}` as CoreFieldPath),
    opts,
  );
  assertCanonicalBrand(next);
  return repo.save(next);
}
