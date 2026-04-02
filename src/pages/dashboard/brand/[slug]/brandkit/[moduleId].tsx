import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { BrandKitModuleView } from '@/features/brandkit';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { ArrowLeft } from 'lucide-react';
import { brandsService } from '@/features/brand/services/brands.local';
import type { Brand } from '@/shared/types/brand';

export default function BrandKitModulePage() {
  const { slug, moduleId } = useParams<{ slug: string; moduleId: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const handleBrandUpdate = async (patch: Partial<Brand>) => {
    if (!brand) return;
    await brandsService.update(brand.id, patch);
  };

  if (isLoading) {
    return (
      <BrandLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Loading module...</p>
          </div>
        </div>
      </BrandLayout>
    );
  }

  if (error || !brand || !moduleId) {
    return (
      <BrandLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Module Not Found</h3>
            <p className="text-muted-foreground mb-4">{error || 'Could not load module.'}</p>
            <button
              onClick={() => navigate(`/dashboard/brand/${slug}/brandkit`)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:underline mx-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Brand Kit
            </button>
          </div>
        </div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <BrandKitModuleView
          moduleId={moduleId}
          brand={brand}
          slug={slug!}
          onBrandUpdate={handleBrandUpdate}
        />
      </div>
    </BrandLayout>
  );
}
