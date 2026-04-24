import { useParams } from 'react-router-dom';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitCosmosPage } from '@/features/brand-kit-v2-cosmos/BrandKitCosmosPage';

/**
 * Brand-scoped Brand Kit tab at /b/:slug/brand-kit.
 *
 * Loads the brand by slug and projects it to the same MockBrand shape
 * Setup renders from — so the Kit page always reflects the data you
 * just edited on the Setup tab. `key={brand.id}` forces a clean
 * remount on brand switch so scroll + active-section state reset.
 */
export default function BrandBrandKitPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandFromSlug(slug);

  if (!brand) return null;

  return <BrandKitCosmosPage key={brand.id} brand={brandToMockBrand(brand)} />;
}
