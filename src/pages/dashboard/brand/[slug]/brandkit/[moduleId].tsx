import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BrandLayout } from '@/features/brand';
import { BrandKitModuleView } from '@/features/brandkit';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { useAutoSave } from '@/features/editor/core';
import { ArrowLeft } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

export default function BrandKitModulePage() {
  const { slug, moduleId } = useParams<{ slug: string; moduleId: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const updateBrand = useBrandStore((s) => s.update);

  // Buffer patches and debounce saves
  const [pendingPatch, setPendingPatch] = useState<Partial<Brand>>({});

  const { saveState, markDirty, flush, retry } = useAutoSave({
    value: pendingPatch,
    save: async (patch) => {
      if (!brand || Object.keys(patch).length === 0) return;
      await updateBrand(brand.id, patch);
      setPendingPatch({});
    },
    debounceMs: 1200,
    enabled: !!brand,
  });

  const handleBrandUpdate = useCallback((patch: Partial<Brand>) => {
    setPendingPatch((prev) => ({ ...prev, ...patch }));
    markDirty();
  }, [markDirty]);

  // Cmd+S → immediate flush
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush]);

  if (isLoading) {
    return (
      <BrandLayout brandName={brand?.name}>
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
      <BrandLayout brandName={brand?.name}>
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
    <BrandLayout brandName={brand?.name}>
      <BrandKitModuleView
        moduleId={moduleId}
        brand={brand}
        slug={slug!}
        onBrandUpdate={handleBrandUpdate}
        saveState={saveState}
        onRetry={retry}
      />
    </BrandLayout>
  );
}
