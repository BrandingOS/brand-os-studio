/**
 * The Core paths a human has already decided.
 *
 * A system write over a confirmed value is not refused by the write path — it
 * overwrites the value and drops it to provisional. So the guard lives BEFORE
 * the merge: `interpret` takes these as `decided` and never proposes for them.
 * Re-running understanding (a website rescan, say) is safe by construction
 * because of this list, not by luck of ordering.
 */
import type { CanonicalBrand } from '@/domain/brand';
import { CORE_FIELD_PATHS, type CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { coreValueMeta, isAtLeast } from '@/domain/brand/coreMeta';

export function confirmedPaths(brand: Pick<CanonicalBrand, 'identityMeta'> | null | undefined): CoreFieldPath[] {
  if (!brand?.identityMeta) return [];
  return CORE_FIELD_PATHS.filter((path) => isAtLeast(coreValueMeta(brand.identityMeta, path).authority, 'confirmed'));
}
