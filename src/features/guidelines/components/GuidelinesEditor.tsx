import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { useGuidelinesStore } from '../store/guidelinesStore';
import type { GuidelineSlide } from '../types/guidelines';
import { SlideNavigator } from './SlideNavigator';
import { PreviewCanvas } from './PreviewCanvas';
import { GuidelineCustomizer } from './GuidelineCustomizer';
import { Loader2 } from 'lucide-react';
import { demoBrandIdentity } from '@/data/demo';

export const GuidelinesEditor: React.FC = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { current: brand, isLoading, loadById } = useBrandStore();
  const { activePanel, setCurrentSlide, slides, currentSlide } = useGuidelinesStore();

  // Load brand data
  useEffect(() => {
    if (brandId && brandId !== brand?.id) {
      if (brandId === 'demo-brand-1') {
        useBrandStore.getState().setCurrent(demoBrandIdentity);
      } else {
        loadById(brandId);
      }
    }
  }, [brandId, brand?.id, loadById]);

  // Initialize slides when brand is loaded
  useEffect(() => {
    if (brand && slides.length === 0) {
      const initialSlides: GuidelineSlide[] = [
        { id: 'cover', type: 'cover', title: 'Cover', content: { pageNumber: 1 }, order: 0, enabled: true },
        { id: 'strategy', type: 'strategy', title: 'Brand Strategy', content: { pageNumber: 2 }, order: 1, enabled: true },
        { id: 'logos', type: 'logos', title: 'Logo System', content: { pageNumber: 3 }, order: 2, enabled: true },
        { id: 'colors', type: 'colors', title: 'Color Palette', content: { pageNumber: 4 }, order: 3, enabled: true },
        { id: 'typography', type: 'typography', title: 'Typography', content: { pageNumber: 5 }, order: 4, enabled: true },
        { id: 'voice', type: 'voice', title: 'Voice & Tone', content: { pageNumber: 6 }, order: 5, enabled: true },
        { id: 'iconography', type: 'iconography', title: 'Iconography', content: { pageNumber: 7 }, order: 6, enabled: true },
        { id: 'social', type: 'social', title: 'Social Media', content: { pageNumber: 8 }, order: 7, enabled: true },
        { id: 'stationery', type: 'stationery', title: 'Stationery', content: { pageNumber: 9 }, order: 8, enabled: true },
        { id: 'applications', type: 'applications', title: 'Applications', content: { pageNumber: 10 }, order: 9, enabled: true },
      ];
      initialSlides.forEach(slide => useGuidelinesStore.getState().addSlide(slide));
    }
  }, [brand, slides.length]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Brand not found</h2>
          <p className="text-muted-foreground">The requested brand could not be loaded.</p>
        </div>
      </div>
    );
  }

  const renderRightPanel = () => {
    switch (activePanel) {
      case 'customize':
        return <GuidelineCustomizer />;
      case 'edit':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Slide Data</h3>
            <p className="text-muted-foreground">Slide editing features coming soon...</p>
          </div>
        );
      case 'add':
        return (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Add Section</h3>
            <p className="text-muted-foreground">Add section features coming soon...</p>
          </div>
        );
      default:
        return <GuidelineCustomizer />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Left Panel - Slide Navigator */}
      <div className="w-80 border-r border-border bg-muted/20">
        <SlideNavigator 
          slides={slides}
          currentSlide={currentSlide}
          onSlideSelect={setCurrentSlide}
          brand={brand}
        />
      </div>

      {/* Center Panel - make it shrinkable */}
      <div className="flex-1 min-w-0 flex flex-col bg-muted/5">
        <PreviewCanvas 
          brand={brand}
          currentSlide={slides[currentSlide]}
        />
      </div>

      {/* Right Panel - Controls */}
      <div className="w-96 border-l border-border bg-background">
        {renderRightPanel()}
      </div>
    </div>
  );
};
