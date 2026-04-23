import { useParams } from 'react-router-dom';
import SetupPage from '@/features/setup/SetupPage';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';

/**
 * Brand-scoped Setup tab at /b/:slug/setup.
 *
 * Loads the brand by slug from the store and passes a MockBrand-shaped
 * projection to SetupPage. The `key={slug}` on SetupPage forces a
 * remount when switching brands so local edit state is reset cleanly.
 *
 * If the slug doesn't resolve to a real brand yet (still loading, or
 * not found), SetupPage falls back to the built-in mock so the page
 * never blanks out.
 */
export default function BrandSetupPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandFromSlug(slug);
  const projected = brand ? brandToMockBrand(brand) : undefined;

  return <SetupPage key={slug} initialBrand={projected} />;
}
