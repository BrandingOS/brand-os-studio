import { useParams } from 'react-router-dom';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitCosmosPage } from '@/features/brand-kit/BrandKitCosmosPage';
import { BrandNotFoundPanel } from '@/shared/components/BrandNotFoundPanel';

/**
 * Brand-scoped Brand Kit tab at /b/:slug/brand-kit.
 *
 * Loads the brand by slug and projects it to the same MockBrand shape
 * Setup renders from — so the Kit page always reflects the data you
 * just edited on the Setup tab. `key={brand.id}` forces a clean
 * remount on brand switch so scroll + active-section state reset.
 *
 * There is no setup prompt here. A card naming what /setup is missing used to
 * render ahead of the Kit in this column, which pushed the whole page —
 * WorkspaceShell's sticky navbar included — down by its own height. It lives
 * on Setup now (`BrandSetupNudge`), floating, where the things it names are
 * actually fixed.
 */
export default function BrandBrandKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandFromSlug(slug);

  if (!brand) return <BrandNotFoundPanel slug={slug} isLoading={isLoading} />;

  return (
    <BrandKitCosmosPage
      key={brand.id}
      brand={brandToMockBrand(brand)}
      sourceBrand={brand}
    />
  );
}
