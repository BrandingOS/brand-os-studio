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

  // Filter INSIDE each group, not just at the group level. A rule group is an
  // object, so spreading it raw lets `{ logo: { minSizePx: undefined } }` erase
  // a stored constraint while the metadata records only that `rules.logo` was
  // touched — a silent loss, and one that JSON persistence makes permanent by
  // dropping the key entirely.
  //
  // A group whose patch has nothing defined left is not a change at all, so it
  // is dropped from `groups` too and stamps no metadata.
  const merged: BrandRules = { ...current };
  const groups: (keyof BrandRules)[] = [];

  for (const g of Object.keys(change) as (keyof BrandRules)[]) {
    const groupPatch = change[g];
    if (groupPatch === undefined) continue;

    const defined = Object.fromEntries(
      Object.entries(groupPatch).filter(([, value]) => value !== undefined),
    );
    if (!Object.keys(defined).length) continue;

    merged[g] = { ...(current[g] ?? {}), ...defined } as never;
    groups.push(g);
  }

  const next = withCoreWrites(
    { ...brand, identity: { ...brand.identity, rules: merged } },
    groups.map((g) => `rules.${g}` as CoreFieldPath),
    opts,
  );
  assertCanonicalBrand(next);
  return repo.save(next);
}
