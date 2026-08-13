/**
 * Application use-case: change a brand's color (Stage 2D — first feature slice).
 *
 * This is the ONE canonical command a UI (Brand Kit color editor) or any other
 * surface calls to change a brand color. It orchestrates the canonical domain +
 * the BrandRepository port — no component touches persistence directly, and the
 * write goes through exactly one authoritative path:
 *
 *   UI intent → changeBrandColor → canonical Brand → BrandRepository → DB
 *
 * Because the repository persists the canonical `identity` as the source of truth
 * and reads prefer it (never re-deriving from a legacy mirror), a saved color can
 * never be resurrected by a stale `guidelines`/scalar value on the next read.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import {
  assertCanonicalBrand,
  type CanonicalBrand,
  type ColorToken,
} from '@/domain/brand';
import type { CoreFieldPath } from '@/domain/brand/coreFieldPaths';
import { withCoreWrites, type CoreWriteOptions } from './coreWrite';

export type ColorRole = 'primary' | 'secondary' | 'accent';

function withColor(brand: CanonicalBrand, role: ColorRole, token: ColorToken): CanonicalBrand {
  // Merge onto the existing token so a hex-only change preserves the token's
  // metadata (name/rgb/cmyk/pantone/usage); a full token still replaces.
  const existing = brand.identity.colors[role];
  return {
    ...brand,
    identity: {
      ...brand.identity,
      colors: { ...brand.identity.colors, [role]: { ...existing, ...token } },
    },
  };
}

/**
 * Change one color role to an explicit token, validate the result, and persist it
 * as the canonical source of truth. Returns the persisted canonical brand.
 */
export async function changeBrandColor(
  repo: BrandRepository,
  brandId: string,
  role: ColorRole,
  token: ColorToken,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandColor: brand not found: ${brandId}`);

  const next = withCoreWrites(withColor(brand, role, token), [`colors.${role}`], opts);
  // Validate at the boundary — a bad hex is rejected before it can be persisted.
  assertCanonicalBrand(next);
  return repo.save(next);
}

/** Convenience: change just the primary color by hex. */
export function changeBrandPrimaryColor(
  repo: BrandRepository,
  brandId: string,
  hex: string,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  return changeBrandColor(repo, brandId, 'primary', { hex }, opts);
}

export interface BrandColorChanges {
  primary?: ColorToken;
  secondary?: ColorToken;
  accent?: ColorToken;
  neutrals?: ColorToken[];
}

/**
 * Change several color roles (and/or neutrals) atomically (one load, one save) —
 * the single canonical color mutation used by every migrated color surface.
 */
export async function changeBrandColors(
  repo: BrandRepository,
  brandId: string,
  changes: BrandColorChanges,
  opts?: CoreWriteOptions,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBrandColors: brand not found: ${brandId}`);

  let next = brand;
  const touched: CoreFieldPath[] = [];
  if (changes.primary) {
    next = withColor(next, 'primary', changes.primary);
    touched.push('colors.primary');
  }
  if (changes.secondary) {
    next = withColor(next, 'secondary', changes.secondary);
    touched.push('colors.secondary');
  }
  if (changes.accent) {
    next = withColor(next, 'accent', changes.accent);
    touched.push('colors.accent');
  }
  if (changes.neutrals) {
    next = {
      ...next,
      identity: {
        ...next.identity,
        colors: { ...next.identity.colors, neutrals: changes.neutrals },
      },
    };
    touched.push('colors.neutrals');
  }
  next = withCoreWrites(next, touched, opts);
  assertCanonicalBrand(next);
  return repo.save(next);
}
