/**
 * `logoUrl(brand, role)` — one-line replacement for the
 * `brand.logo ?? brand.logoAssets?.full ?? brand.guidelines?.logoSystem?...`
 * fallback chain that was sprinkled through the codebase.
 *
 * Uses `resolveBrandLogo` under the hood so it gets the v3 asset when
 * available and degrades to the v2/v1 legacy fields automatically.
 *
 * For components that also need format / width / height / asset id,
 * use `useBrandLogo` (or `resolveBrandLogo` outside React).
 */
import type { Brand } from '@/shared/types/brand';
import type { LogoRole } from '@/shared/types/brandAssets';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';

export function logoUrl(
  brand: Brand | null | undefined,
  role: LogoRole = 'primary',
): string | undefined {
  return resolveBrandLogo(brand, role)?.url;
}

/** True when the brand has ANY logo resolvable for the given role. */
export function hasLogo(
  brand: Brand | null | undefined,
  role: LogoRole = 'primary',
): boolean {
  return !!logoUrl(brand, role);
}
