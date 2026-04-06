/**
 * Presentations Page — Template picker → Editor workspace.
 * Supports live style switching without leaving the editor.
 */
import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { TemplatePicker } from '@/shared/presentation/TemplatePicker';
import { buildTemplateSlides, type ContentType } from '@/shared/presentation/templates';
import { PRESENTATION_STYLES, getStyleById, getStyleSpacingDefaults } from '@/shared/presentation/styles';
import { createPresentationStore } from '@/shared/presentation/store';
import type { SlideData } from '@/shared/editor';

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
  const [activeStyleId, setActiveStyleId] = useState<string>('minimal');
  const [activeContentType, setActiveContentType] = useState<ContentType>('brand-guide');
  const [showPicker, setShowPicker] = useState(false);

  // Rebuild slides when style changes
  const switchStyle = useCallback((styleId: string) => {
    if (!brand) return;
    setActiveStyleId(styleId);
    setSlides(buildTemplateSlides(brand, styleId, activeContentType));
  }, [brand, activeContentType]);

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

  // Initial picker or re-open picker
  if (!slides || showPicker) {
    return (
      <TemplatePicker
        onSelect={(styleId, contentType) => {
          setActiveStyleId(styleId);
          setActiveContentType(contentType);
          // Sync the editor settings store to this style's spacing defaults
          const style = getStyleById(styleId);
          const defaults = getStyleSpacingDefaults(style);
          const store = usePresentationSettingsStore.getState();
          store.setTemplate(styleId);
          store.updateSpacing(defaults);
          setSlides(buildTemplateSlides(brand, styleId, contentType));
          setShowPicker(false);
        }}
        onClose={() => slides ? setShowPicker(false) : navigate(`/dashboard/brand/${slug}`)}
        brandName={brand.name}
        brandColor={brand.primaryColor}
      />
    );
  }

  // Build style list as templates for the customizer —
  // switching template in the customizer triggers a style switch
  const styleTemplates = PRESENTATION_STYLES.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  return (
    <EditorWorkspace
      brand={brand}
      slides={slides}
      onClose={() => {
        setSlides(null);
        setShowPicker(false);
      }}
      useSettingsStore={usePresentationSettingsStore}
      templates={styleTemplates}
      customizerTitle="Presentation"
      onTemplateChange={switchStyle}
      onOpenTemplatePicker={() => setShowPicker(true)}
    />
  );
}
