/**
 * Application use-case: change a brand's Business Info.
 *
 * Business Info is a DISTINCT concept from Brand Core DNA — facts about the
 * business, not the brand's look and voice — so it carries no
 * authority/provenance metadata: there is nothing to "adopt" about a company's
 * phone number. It still writes through the one canonical brand authority so
 * there is a single write path per datum.
 *
 * Consumers (business card / letterhead / email signature / invoice renderers)
 * are wired in the Business Info phase; this op exists now so the canonical
 * write path is complete.
 */
import type { BrandRepository } from '@/domain/brand/repository';
import { assertCanonicalBrand, type CanonicalBrand } from '@/domain/brand';
import type { BusinessInfo } from '@/domain/brand/identity';

export async function changeBusinessInfo(
  repo: BrandRepository,
  brandId: string,
  change: Partial<BusinessInfo>,
): Promise<CanonicalBrand> {
  const brand = await repo.getById(brandId);
  if (!brand) throw new Error(`changeBusinessInfo: brand not found: ${brandId}`);

  const current = brand.businessInfo ?? {};
  const next: CanonicalBrand = {
    ...brand,
    businessInfo: {
      ...current,
      ...change,
      // `contact` is merged one level down so setting a phone number cannot
      // wipe the address.
      ...(change.contact
        ? { contact: { ...(current.contact ?? {}), ...change.contact } }
        : {}),
    },
  };
  assertCanonicalBrand(next);
  return repo.save(next);
}
