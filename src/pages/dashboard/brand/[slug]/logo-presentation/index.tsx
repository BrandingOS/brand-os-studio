import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { LogoPresentationSetup } from '@/features/logo-presentation/components/LogoPresentationSetup';
import { buildLogoSlides } from '@/features/logo-presentation/buildLogoSlides';
import { useLogoPresentationStore, LOGO_PRESENTATION_TEMPLATES } from '@/features/logo-presentation/store';
import type { LogoPresentationData } from '@/features/logo-presentation/types';

export default function LogoPresentationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const [presentationData, setPresentationData] = useState<LogoPresentationData | null>(null);

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

  // Setup first, then editor
  if (!presentationData) {
    return (
      <LogoPresentationSetup
        brand={brand}
        onStart={(data) => setPresentationData(data)}
      />
    );
  }

  const slides = buildLogoSlides(presentationData);

  return (
    <EditorWorkspace
      brand={brand}
      slides={slides}
      onClose={() => setPresentationData(null)}
      useSettingsStore={useLogoPresentationStore}
      templates={LOGO_PRESENTATION_TEMPLATES}
      customizerTitle="Logo Presentation"
    />
  );
}
