import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitCosmosPage } from '@/features/brand-kit/BrandKitCosmosPage';
import { BrandSetupNudge } from '@/features/brand-setup/BrandSetupNudge';
import { BrandNotFoundPanel } from '@/shared/components/BrandNotFoundPanel';

/**
 * Brand-scoped Brand Kit tab at /b/:slug/brand-kit.
 *
 * Loads the brand by slug and projects it to the same MockBrand shape
 * Setup renders from — so the Kit page always reflects the data you
 * just edited on the Setup tab. `key={brand.id}` forces a clean
 * remount on brand switch so scroll + active-section state reset.
 *
 * The incomplete-setup prompt is a FLOATING card (BrandSetupNudge), not a
 * band above the page. The card it replaced sat in the flex column ahead of
 * BrandKitCosmosPage, so an unfinished brand pushed the whole Kit — the
 * shell's sticky navbar with it — down by the height of the prompt.
 */
export default function BrandBrandKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandFromSlug(slug);

  const mock = useMemo(() => (brand ? brandToMockBrand(brand) : null), [brand]);

  if (!brand || !mock) return <BrandNotFoundPanel slug={slug} isLoading={isLoading} />;

  return (
    <>
      <BrandKitCosmosPage key={brand.id} brand={mock} sourceBrand={brand} />
      <BrandSetupNudge brand={mock} brandId={brand.id} brandSlug={brand.slug} />
    </>
  );
}
