/**
 * In-app entry for the Variant Studio tool.
 *
 * Mounted as a flat sibling under the brand prefix so it gets the
 * full editor scope (`h-12` chrome) instead of the brand shell.
 *
 * Reads the brand by slug, hands the studio its source logo, and lets
 * the studio handle everything from there.
 */
import { useParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { VariantStudio } from '@/features/tools/variant-studio';

export default function VariantStudioPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }
  if (error || !brand) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-muted-foreground">
        {error || 'Brand not found'}
      </div>
    );
  }

  return (
    <VariantStudio
      mode="in-app"
      brand={brand}
      backTo={`/dashboard/brand/${brand.slug}/identity?tab=logo`}
    />
  );
}
