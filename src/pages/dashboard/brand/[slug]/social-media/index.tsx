/**
 * Social Media Page — pick a platform/format → open the editor.
 * Uses the same EditorWorkspace as presentations so the editing
 * experience is identical (zoom, customize, replace from brand assets, etc.)
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { SocialFormatPicker } from '@/features/social-media/SocialFormatPicker';
import { buildSocialSlides } from '@/features/social-media/buildSocialSlides';
import { createPresentationStore } from '@/shared/presentation/store';
import { PRESENTATION_STYLES, getStyleSpacingDefaults, getStyleById } from '@/shared/presentation/styles';
import type { SlideData } from '@/shared/editor';
import type { SocialMediaSize } from '@/features/social-media/types';

// Dedicated store for social media settings
const useSocialSettingsStore = createPresentationStore('social-media-settings', {
  template: 'rounded',
  spacing: { padding: 60, margins: 30, cornerRadius: 16 },
  header: { enabled: false, showDate: false, showProjectName: false },
  footer: { enabled: false, showPageNumbers: false },
});

export default function SocialMediaPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const [slides, setSlides] = useState<SlideData[] | null>(null);
  const [selectedSize, setSelectedSize] = useState<SocialMediaSize | null>(null);

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

  // Step 1: format picker
  if (!slides || !selectedSize) {
    return (
      <SocialFormatPicker
        brandColor={brand.primaryColor}
        onSelect={(size) => {
          // Sync the editor settings store with this format's exact dimensions
          const store = useSocialSettingsStore.getState();
          store.setCustomSize(size.width, size.height);
          // Apply spacing defaults for the active style
          const style = getStyleById(store.settings.template);
          store.updateSpacing(getStyleSpacingDefaults(style));
          setSelectedSize(size);
          setSlides(buildSocialSlides(brand, size, store.settings.template));
        }}
        onClose={() => navigate(`/b/${slug}`)}
      />
    );
  }

  // Step 2: full editor
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
        setSelectedSize(null);
      }}
      useSettingsStore={useSocialSettingsStore}
      templates={styleTemplates}
      customizerTitle={`Social — ${selectedSize.label}`}
      editorKey={`social-${brand.id}-${selectedSize.platform}-${selectedSize.format}`}
      onTemplateChange={(styleId) => {
        // Rebuild slides with the new style
        setSlides(buildSocialSlides(brand, selectedSize, styleId));
      }}
    />
  );
}
