import { useParams } from 'react-router-dom';
import { AppShellCanvaLayout } from '@/features/brand/components/AppShellCanvaLayout';
import { CanvasGuidelinesEditor } from '@/features/guidelines/components/CanvasGuidelinesEditor';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';

export default function CanvasGuidelinesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand, isLoading } = useBrandBySlug(slug);

  return (
    <AppShellCanvaLayout brandName={brand?.name} brandSlug={slug}>
      <CanvasGuidelinesEditor />
    </AppShellCanvaLayout>
  );
}
