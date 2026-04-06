/**
 * Presentations Page — Template picker → Editor workspace.
 * Users pick a style + content type, then enter the full editor.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { TemplatePicker } from '@/shared/presentation/TemplatePicker';
import { buildTemplateSlides, type ContentType } from '@/shared/presentation/templates';
import { PRESENTATION_STYLES } from '@/shared/presentation/styles';
import { createPresentationStore } from '@/shared/presentation/store';
import type { SlideData } from '@/shared/editor';

// Per-presentation store (persisted separately from brand guides)
const usePresentationSettingsStore = createPresentationStore('presentations-settings', {
  spacing: { padding: 0, margins: 0, cornerRadius: 0 },
  header: { enabled: false, showDate: false, showProjectName: false },
  footer: { enabled: false, showPageNumbers: false },
});

export default function PresentationsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const [slides, setSlides] = useState<SlideData[] | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#111] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <div className="fixed inset-0 bg-[#111] flex items-center justify-center text-white">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Brand Not Found</h3>
          <button onClick={() => navigate(-1)} className="text-sm text-white/40 hover:text-white">Go back</button>
        </div>
      </div>
    );
  }

  // Step 1: Template picker
  if (!slides) {
    return (
      <TemplatePicker
        onSelect={(styleId, contentType) => {
          setSelectedStyle(styleId);
          const built = buildTemplateSlides(brand, styleId, contentType);
          setSlides(built);
        }}
        onClose={() => navigate(`/dashboard/brand/${slug}`)}
      />
    );
  }

  // Step 2: Full editor with selected slides
  const styleTemplates = PRESENTATION_STYLES.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  return (
    <EditorWorkspace
      brand={brand}
      slides={slides}
      onClose={() => setSlides(null)}
      useSettingsStore={usePresentationSettingsStore}
      templates={styleTemplates}
      customizerTitle="Presentation"
    />
  );
}
