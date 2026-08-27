import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { brandsService } from '@/features/brand/services/brands.local';
import { BrandGuidelinePage } from '@/features/guidelines/components/BrandGuidelinePage';
import { ShieldOff, ArrowRight } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Brand not found</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">This brand showcase is not available.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Go to BrandingOS
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!brand.isPublic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ShieldOff className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Private Brand</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            This brand's showcase is private. The owner can make it public from their brand settings.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Go to BrandingOS
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return <BrandGuidelinePage brand={brand} isPublic />;
}
