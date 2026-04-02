import { useParams } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { TemplateDocument } from '@/features/guidelines/pages/templates/TemplateDocument';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';

export default function BrandGuidesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <BrandLayout brandName="Loading...">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      </BrandLayout>
    );
  }

  if (error || !brand) {
    return (
      <BrandLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
            <p className="text-muted-foreground">{error || 'Could not load brand.'}</p>
          </div>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout brandName={brand.name}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <TemplateDocument brand={brand} />
      </div>
    </BrandLayout>
  );
}
