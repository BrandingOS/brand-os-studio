import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { BrandKitHub } from '@/features/brandkit';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { ArrowLeft } from 'lucide-react';

export default function BrandKitHubPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <BrandLayout brandName={brand?.name}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading brand kit...</p>
          </div>
        </div>
      </BrandLayout>
    );
  }

  if (error || !brand) {
    return (
      <BrandLayout brandName={brand?.name}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'Could not load brand.'}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:underline mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout brandName={brand?.name}>
      <BrandKitHub brand={brand} slug={slug!} />
    </BrandLayout>
  );
}
