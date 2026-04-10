import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { EditorChrome, useAutoSave } from '@/features/editor/core';
import { CanvaSidebar } from '@/features/brand/components/CanvaSidebar';
import { CanvasGuidelinesEditor } from '@/features/guidelines/components/CanvasGuidelinesEditor';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { usePresentationsStore } from '@/shared/store/presentationsStore';
import { presentationsService } from '@/shared/services/presentations.supabase';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import type { EditorSaveState } from '@/features/editor/core';

export default function CanvasGuidelinesPage() {
  const { slug } = useParams<{ slug: string }>();
  const { brand } = useBrandBySlug(slug);
  const { slides, currentSlideIndex } = usePresentationsStore();

  // Track slide content changes for auto-save
  const [slideTick, setSlideTick] = useState(0);
  const currentSlide = slides[currentSlideIndex];

  const { saveState, markDirty, flush, retry } = useAutoSave({
    value: slideTick,
    save: async () => {
      if (!currentSlide) return;
      await presentationsService.updateSlide(currentSlide.id, {
        content: currentSlide.content,
        title: currentSlide.title,
        is_enabled: currentSlide.is_enabled,
      });
    },
    debounceMs: 1500,
    enabled: !!currentSlide,
  });

  // Expose markDirty for the editor to call on slide edits
  const handleSlideEdit = useCallback(() => {
    setSlideTick((t) => t + 1);
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

  return (
    <div className="min-h-screen chrome-bg">
      <EditorChrome
        backTo={`/b/${slug}/guidelines`}
        breadcrumb={[brand?.name ?? 'Brand', 'Guidelines']}
        title="Slide Editor"
        saveState={saveState}
        onRetry={retry}
        actions={
          <Button variant="outline" size="sm" className="gap-1.5">
            <Eye className="h-4 w-4" />
            <span className="hidden md:inline">Preview</span>
          </Button>
        }
      />
      <div className="mx-auto max-w-[1440px] flex" style={{ padding: '0 16px' }}>
        <CanvaSidebar brandSlug={slug} />
        <section className="flex-1 min-w-0 pl-4 md:pl-6">
          <main className="mt-3">
            <CanvasGuidelinesEditor onSlideEdit={handleSlideEdit} />
          </main>
        </section>
      </div>
    </div>
  );
}
