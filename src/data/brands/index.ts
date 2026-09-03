import type { Brand } from '@/shared/types/brand';
import { raqmBrand } from './raqm';
import { skamBrand } from './skam';
import { vectorBrand } from './vector';
import { uniexBrand } from './uniex';
import { brandingosFixture, BRANDINGOS_FIXTURE_SLUG } from './brandingos.fixture';

export { raqmBrand, RAQM_LOGO_URL, RAQM_LOGO_WHITE_URL, RAQM_LOGO_BLACK_URL } from './raqm';
export { skamBrand, SKAM_LOGO_URL, SKAM_LOGO_WHITE_URL, SKAM_LOGO_BLACK_URL } from './skam';
export { vectorBrand } from './vector';
export { uniexBrand } from './uniex';

/**
 * All seed brands that ship with the client bundle. Exposed as a
 * synchronous lookup so page wrappers can resolve /b/:slug/* on the
 * very first render, avoiding the mock-brand flash that happens when
 * the store's async loadBySlug is still in flight.
 *
 * The LocalBrandsService / SupabaseBrandsService already merge these
 * into the authoritative `useBrandStore.list` — this export is only
 * for first-paint synchronous access.
 */
export const SEED_BRANDS: readonly Brand[] = [raqmBrand, skamBrand, vectorBrand, uniexBrand];

export function getSeedBrandBySlug(slug: string): Brand | undefined {
  const seed = SEED_BRANDS.find((b) => b.slug === slug);
  if (seed) return seed;

  // The BrandingOS capture fixture — DEV ONLY. It is deliberately NOT in
  // SEED_BRANDS: that array is what the brands services merge into the
  // authoritative list and what SEED_BRAND_IDS is derived from, so a brand
  // absent from it cannot reach anyone's brand list, cannot be persisted, and
  // cannot be edited or deleted through any service path. This lookup is the
  // only way to it, and only while running the dev server.
  if (import.meta.env.DEV && slug === BRANDINGOS_FIXTURE_SLUG) return brandingosFixture;

  return undefined;
}
