/**
 * Builds slide data for the EditorWorkspace from existing template pages.
 * This bridges the old TemplateDocument system to the new editor.
 */
import type { Brand } from '@/shared/types/brand';
import type { SlideData } from './EditorWorkspace';
// Re-export the slide builder from TemplateDocument
// We import the raw page components and compose them as slides

export function buildEditorSlides(brand: Brand): SlideData[] {
  // Import lazily to avoid circular deps
  const {
    CoverHyperHyve, CoverIdentity, CoverNoteform, CoverSignal,
    SectionDivider, ContentPage, ContentPageDark, ClosingTemplatePage,
  } = require('../pages/templates/TemplatePages');
  const {
    BrandPurposePage, LogoConstructionPage, ColorRatioPage,
    GradientSystemPage, DarkModePage, BrandArchetypePage,
    PatternSystemPage, StationeryMockupPage, DigitalProductPage,
    TouchpointMapPage, MotionPrinciplesPage,
  } = require('../pages/templates/FancyPages');
  const {
    BrandUniversePage, TypographySpecimenPage, VoiceDNAPage,
    IconGridPage, BrandManifestoPage, PhotographyMoodPage, ColophonPage,
  } = require('../pages/templates/FancyPages2');

  const p = brand.primaryColor;
  const strategy = brand.guidelines?.strategy;
  const voice = brand.guidelines?.voiceAndTone;
  const palette = brand.guidelines?.colorPalette;

  const slides: SlideData[] = [
    { id: 'cover', name: 'Cover', render: ({ brand: b, layout: l, pageNumber: pn, totalPages: tp }) => <CoverHyperHyve brand={b} layout={l} pageNumber={pn} totalPages={tp} /> },
    { id: 'overview', name: 'Brand Overview', render: (p) => <SectionDivider {...p} sectionNumber="1" sectionTitle="Brand Overview" sectionSubtitle="Mission & Vision" /> },
    { id: 'intro', name: 'Introduction', render: (p) => <ContentPage {...p} sectionName="Brand Overview" title="Introduction"><div className="grid grid-cols-2 gap-6 h-full"><div><h4 className="text-[9px] font-semibold uppercase tracking-wider opacity-30 mb-1">Mission</h4><p className="text-[clamp(10px,1vw,13px)] leading-relaxed opacity-70">{strategy?.mission || `${brand.name} exists to deliver value.`}</p></div><div><h4 className="text-[9px] font-semibold uppercase tracking-wider opacity-30 mb-1">Vision</h4><p className="text-[clamp(10px,1vw,13px)] leading-relaxed opacity-70">{strategy?.vision || 'Leading our industry.'}</p></div></div></ContentPage> },
    { id: 'values', name: 'Core Values', render: (p) => <ContentPageDark {...p} sectionName="Brand Overview" title="Core Values"><div className="grid grid-cols-3 gap-3 mt-2">{(strategy?.values || ['Quality','Innovation','Trust']).map((v: string, i: number) => <div key={v} className="rounded-lg p-3" style={{ backgroundColor: `${brand.primaryColor}15` }}><span className="text-[18px] font-bold opacity-10">{i+1}.</span><p className="text-[11px] font-semibold text-white mt-1">{v}</p></div>)}</div></ContentPageDark> },
    { id: 'purpose', name: 'Brand Purpose', render: (p) => <BrandPurposePage {...p} /> },
    { id: 'archetype', name: 'Brand Archetype', render: (p) => <BrandArchetypePage {...p} /> },
    { id: 'logo-section', name: 'Logo System', render: (p) => <SectionDivider {...p} sectionNumber="2" sectionTitle="Logo System" sectionSubtitle="Primary · Variations" /> },
    { id: 'logo-grid', name: 'Logo Construction', render: (p) => <LogoConstructionPage {...p} /> },
    { id: 'color-section', name: 'Color System', render: (p) => <SectionDivider {...p} sectionNumber="3" sectionTitle="Color System" sectionSubtitle="Primary · Secondary · Usage" /> },
    { id: 'color-ratio', name: 'Color Ratio', render: (p) => <ColorRatioPage {...p} /> },
    { id: 'gradients', name: 'Gradient System', render: (p) => <GradientSystemPage {...p} /> },
    { id: 'dark-mode', name: 'Dark Mode', render: (p) => <DarkModePage {...p} /> },
    { id: 'patterns', name: 'Pattern System', render: (p) => <PatternSystemPage {...p} /> },
    { id: 'typo-section', name: 'Typography', render: (p) => <SectionDivider {...p} sectionNumber="4" sectionTitle="Typography" sectionSubtitle="Typeface · Hierarchy" /> },
    { id: 'type-specimen', name: 'Type Specimen', render: (p) => <TypographySpecimenPage {...p} /> },
    { id: 'voice-section', name: 'Voice & Tone', render: (p) => <SectionDivider {...p} sectionNumber="5" sectionTitle="Voice & Tone" sectionSubtitle="Personality · Writing" /> },
    { id: 'voice-dna', name: 'Voice DNA', render: (p) => <VoiceDNAPage {...p} /> },
    { id: 'manifesto', name: 'Brand Manifesto', render: (p) => <BrandManifestoPage {...p} /> },
    { id: 'icon-grid', name: 'Icon System', render: (p) => <IconGridPage {...p} /> },
    { id: 'photo-mood', name: 'Visual Direction', render: (p) => <PhotographyMoodPage {...p} /> },
    { id: 'universe', name: 'Brand Universe', render: (p) => <BrandUniversePage {...p} /> },
    { id: 'motion', name: 'Motion Principles', render: (p) => <MotionPrinciplesPage {...p} /> },
    { id: 'touchpoints', name: 'Touchpoints', render: (p) => <TouchpointMapPage {...p} /> },
    { id: 'stationery', name: 'Stationery', render: (p) => <StationeryMockupPage {...p} /> },
    { id: 'digital', name: 'Digital Product', render: (p) => <DigitalProductPage {...p} /> },
    { id: 'colophon', name: 'Colophon', render: (p) => <ColophonPage {...p} /> },
    { id: 'closing', name: 'Thank You', render: (p) => <ClosingTemplatePage {...p} /> },
  ];

  return slides;
}
