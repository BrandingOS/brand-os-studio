import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { brandsService } from '@/features/brand/services/brands.local';
import { BrandGuidelinePage } from '@/features/guidelines/components/BrandGuidelinePage';

export default function BrandShowcasePage() {
  const { slug } = useParams<{ slug: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    brandsService.getBySlug(slug).then((b) => {
      setBrand(b);
      setLoading(false);
    });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Brand not found</h1>
          <p className="text-gray-500">This brand showcase is not available.</p>
        </div>
      </div>
    );
  }

  if (!brand.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Private Brand</h1>
          <p className="text-gray-500">This brand showcase is not publicly available.</p>
        </div>
      </div>
    );
  }

  return <BrandGuidelinePage brand={brand} isPublic />;
}
