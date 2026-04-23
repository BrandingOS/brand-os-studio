import type { Brand } from '@/shared/types/brand';
import { raqmBrand } from './raqm';
import { skamBrand } from './skam';
import { vectorBrand } from './vector';

export { raqmBrand, RAQM_LOGO_URL, RAQM_LOGO_WHITE_URL, RAQM_LOGO_BLACK_URL } from './raqm';
export { skamBrand, SKAM_LOGO_URL, SKAM_LOGO_WHITE_URL, SKAM_LOGO_BLACK_URL } from './skam';
export { vectorBrand } from './vector';

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
export const SEED_BRANDS: readonly Brand[] = [raqmBrand, skamBrand, vectorBrand];

export function getSeedBrandBySlug(slug: string): Brand | undefined {
  return SEED_BRANDS.find((b) => b.slug === slug);
}
