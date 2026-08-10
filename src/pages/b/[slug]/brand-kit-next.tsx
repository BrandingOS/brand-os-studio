import { useParams } from 'react-router-dom';
import { useBrandFromSlug } from '@/shared/hooks/useBrandFromSlug';
import { brandToMockBrand } from '@/features/setup/data/brandToMockBrand';
import { BrandKitNextPage } from '@/features/brand-kit/BrandKitNextPage';
import { BrandNotFoundPanel } from '@/shared/components/BrandNotFoundPanel';

/**
 * /b/:slug/brand-kit-next — the redesigned generate/review/approve
 * Brand Kit, kept on its own page while it's iterated on. The
 * canonical /b/:slug/brand-kit keeps the original showcase experience.
 */
export default function BrandBrandKitNextPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandFromSlug(slug);

  if (!brand) return <BrandNotFoundPanel slug={slug} isLoading={isLoading} />;

  return (
    <BrandKitNextPage
      key={brand.id}
      brand={brandToMockBrand(brand)}
      sourceBrand={brand}
    />
  );
}
