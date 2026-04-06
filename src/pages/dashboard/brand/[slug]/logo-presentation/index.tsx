import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { EditorWorkspace } from '@/shared/editor';
import { LogoPresentationSetup } from '@/features/logo-presentation/components/LogoPresentationSetup';
import { buildLogoSlides } from '@/features/logo-presentation/buildLogoSlides';
import { buildSimpleLogoSlides } from '@/features/logo-presentation/buildSimpleLogoSlides';
import { useLogoPresentationStore, LOGO_PRESENTATION_TEMPLATES } from '@/features/logo-presentation/store';
import { useLogoPresentationDataStore } from '@/features/logo-presentation/dataStore';
import { LogoConceptInspector } from '@/features/logo-presentation/components/LogoConceptInspector';
import type { LogoPresentationData, LogoConcept } from '@/features/logo-presentation/types';
import type { Brand } from '@/shared/types/brand';

/**
 * Build a fully-resolved LogoPresentationData object from the persisted draft
 * + brand context. Same logic as the setup screen's "Generate" button so that
 * reload-into-editor produces an identical presentation.
 */
function buildPresentationData(brand: Brand, draft: NonNullable<ReturnType<typeof useLogoPresentationDataStore.getState>['drafts'][string]>): LogoPresentationData {
  const filledConcepts: LogoConcept[] = draft.concepts.map(c => ({
    ...c,
    logoUrl: c.logoUrl || brand.logo || '',
    rationale: c.rationale || `A distinctive mark that captures ${brand.name}'s identity.`,
    whyItWorks: c.whyItWorks.filter(Boolean).length > 0
      ? c.whyItWorks.filter(Boolean)
      : ['Distinctive and memorable', 'Scalable across applications', 'Aligned with brand positioning'],
  }));

  return {
    brandName: brand.name,
    brandBrief: draft.brief || `${brand.name} - building something meaningful.`,
    brandPersonality: draft.personality.split(',').map(s => s.trim()).filter(Boolean),
    primaryColor: brand.primaryColor,
    clientName: draft.clientName || undefined,
    concepts: filledConcepts,
    template: draft.template,
    designGoals: brand.guidelines?.strategy?.values || ['Modern and distinctive', 'Clean and scalable', 'Unique but timeless'],
    keywords: brand.guidelines?.strategy?.personality || ['geometric', 'minimal', 'innovative'],
    version: 'v1',
  };
}

export default function LogoPresentationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  // Persisted view state — was the user inside the editor when they last visited?
  const dataStore = useLogoPresentationDataStore();
  const [presentationData, setPresentationData] = useState<LogoPresentationData | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // On first load with brand available, check if there's a saved draft + the user
  // was in the editor → re-enter the editor with rebuilt data
  useEffect(() => {
    if (!brand || hydrated) return;
    const draft = dataStore.drafts[brand.id];
    const wasInEditor = dataStore.inEditor[brand.id];
    if (draft && wasInEditor) {
      setPresentationData(buildPresentationData(brand, draft));
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, hydrated]);

  // When the user changes setup data while in the editor, rebuild presentationData
  // automatically from the latest draft. This keeps the editor in sync with the
  // persisted store across reloads and tab switches.
  useEffect(() => {
    if (!brand || !presentationData) return;
    const draft = dataStore.drafts[brand.id];
    if (!draft) return;
    // Cheap deep-equality via JSON for the slice we care about
    const rebuilt = buildPresentationData(brand, draft);
    if (JSON.stringify(rebuilt) !== JSON.stringify(presentationData)) {
      setPresentationData(rebuilt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand, dataStore.drafts]);

  if (isLoading || (brand && !hydrated)) {
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
        onStart={(data) => {
          setPresentationData(data);
          dataStore.setInEditor(brand.id, true);
        }}
      />
    );
  }

  // Dispatch slide builder based on template choice from setup
  const slides = presentationData.template === 'simple'
    ? buildSimpleLogoSlides(presentationData)
    : buildLogoSlides(presentationData);

  return (
    <EditorWorkspace
      brand={brand}
      slides={slides}
      onClose={() => {
        setPresentationData(null);
        dataStore.setInEditor(brand.id, false);
      }}
      useSettingsStore={useLogoPresentationStore}
      templates={LOGO_PRESENTATION_TEMPLATES}
      customizerTitle={`Logo Presentation - ${presentationData.template === 'simple' ? 'Simple' : 'Premium'}`}
      editorKey={`logo-pres-${brand.id}-${presentationData.template}`}
      onTemplateChange={(templateId) => {
        // Persist template choice via the draft store too
        dataStore.updateDraft(brand.id, { template: templateId as 'premium' | 'simple' });
        setPresentationData(prev => prev ? { ...prev, template: templateId as 'premium' | 'simple' } : prev);
      }}
      inspectorLabel="Edit Concept"
      inspectorPanel={(slideId, close) => (
        <LogoConceptInspector
          brand={brand}
          currentSlideId={slideId}
          onClose={close}
        />
      )}
    />
  );
}
