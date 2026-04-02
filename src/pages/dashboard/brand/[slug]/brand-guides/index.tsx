import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/features/guidelines/editor';
import { buildEditorSlides } from '@/features/guidelines/editor/buildSlides';

export default function BrandGuidesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="fixed inset-0 bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">Brand Not Found</h3>
          <p className="text-white/50">{error || 'Could not load brand.'}</p>
          <button onClick={() => navigate(`/dashboard/brand/${slug}`)} className="mt-4 text-sm text-white/40 hover:text-white">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const slides = buildEditorSlides(brand);

  return (
    <EditorWorkspace
      brand={brand}
      slides={slides}
      onClose={() => navigate(`/dashboard/brand/${slug}`)}
    />
  );
}
