import { useParams } from 'react-router-dom';
import SetupPage from '@/features/setup/SetupPage';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';

/**
 * Brand-scoped Setup tab at /b/:slug/setup.
 *
 * Loads the brand by slug (sync for seed brands, async for user
 * brands) and passes a MockBrand-shaped projection to SetupPage.
 *
 * CRITICAL: we never render SetupPage with `initialBrand=undefined`.
 * SetupPage's `useState` captures its initial value on first mount
 * only — if we passed undefined, it would fall back to the Nuworld
 * mock and stay there even after the real brand resolves. The seed
 * fallback in useBrandFromSlug covers /b/skam, /b/raqm, /b/vector
 * synchronously; user-authored brands briefly render null while the
 * store's async loadBySlug completes.
 *
 * `key={brand.id}` forces a clean remount when switching brands so
 * local edit state (unpersisted, for now) doesn't leak across.
 */
export default function BrandSetupPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandFromSlug(slug);

  if (!brand) return null;

  return <SetupPage key={brand.id} initialBrand={brandToMockBrand(brand)} />;
}
