/**
 * Social Media Page — direct entry into the editor for a chosen format.
 *
 * Format selection happens in-page at /b/:slug/content?tab=posts (Canva-style
 * grid). This route is the editor itself — it expects `?platform=` and
 * `?format=` query params identifying which size to open. Without them it
 * redirects back to the Content hub so users never land on a bare picker.
 */
import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { buildSocialSlides } from '@/features/social-media/buildSocialSlides';
import { SOCIAL_MEDIA_SIZES } from '@/features/social-media/data/sizes';
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
  const [searchParams] = useSearchParams();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const platform = searchParams.get('platform');
  const format = searchParams.get('format');

  const selectedSize = useMemo<SocialMediaSize | undefined>(
    () =>
      platform && format
        ? SOCIAL_MEDIA_SIZES.find((s) => s.platform === platform && s.format === format)
        : undefined,
    [platform, format],
  );

  const [slides, setSlides] = useState<SlideData[] | null>(null);

  // Build slides once the brand loads and a valid size is present.
  useEffect(() => {
    if (!brand || !selectedSize) return;
    const store = useSocialSettingsStore.getState();
    store.setCustomSize(selectedSize.width, selectedSize.height);
    const style = getStyleById(store.settings.template);
    store.updateSpacing(getStyleSpacingDefaults(style));
    setSlides(buildSocialSlides(brand, selectedSize, store.settings.template));
  }, [brand, selectedSize]);

  // No valid size → bounce back to the in-shell picker (Content > Posts).
  useEffect(() => {
    if (isLoading) return;
    if (!selectedSize) {
      navigate(`/b/${slug}/content?tab=posts`, { replace: true });
    }
  }, [isLoading, selectedSize, navigate, slug]);

  if (isLoading || !brand || !selectedSize || !slides) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-foreground">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Brand not found</h3>
          <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground">
            Go back
          </button>
        </div>
      </div>
    );
  }

  const styleTemplates = PRESENTATION_STYLES.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));

  return (
    <EditorWorkspace
      brand={brand}
      slides={slides}
      onClose={() => navigate(`/b/${slug}/content?tab=posts`)}
      useSettingsStore={useSocialSettingsStore}
      templates={styleTemplates}
      customizerTitle={`Social — ${selectedSize.label}`}
      editorKey={`social-${brand.id}-${selectedSize.platform}-${selectedSize.format}`}
      onTemplateChange={(styleId) => {
        setSlides(buildSocialSlides(brand, selectedSize, styleId));
      }}
    />
  );
}
