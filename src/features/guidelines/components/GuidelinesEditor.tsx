import React, { useEffect, useRef, useState } from 'react';
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

  // --- measure center column so the slide can width-fit responsively ---
  const centerRef = useRef<HTMLDivElement | null>(null);
  const [centerWidth, setCenterWidth] = useState(0);
  const [centerHeight, setCenterHeight] = useState(0);

  useEffect(() => {
    const el = centerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(([entry]) => {
      const w =
        (Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]?.inlineSize
          : (entry.contentBoxSize as any)?.inlineSize) ?? entry.contentRect.width;

      const h =
        (Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]?.blockSize
          : (entry.contentBoxSize as any)?.blockSize) ?? entry.contentRect.height;

      setCenterWidth(Math.max(0, Math.floor(w)));
      setCenterHeight(Math.max(0, Math.floor(h)));
    });

    ro.observe(el);
    // initial read
    setCenterWidth(el.clientWidth);
    setCenterHeight(el.clientHeight);

    return () => ro.disconnect();
  }, []);

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

  // The scroll area inside PreviewCanvas has p-8 (32px each side).
  // Subtract that so the slide truly fits within visible content.
  const AVAILABLE_WIDTH_FOR_SLIDE = Math.max(0, centerWidth - 64);

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

      {/* Center Panel - Preview Canvas */}
      <div ref={centerRef} className="flex-1 flex flex-col bg-muted/5">
        <PreviewCanvas
          brand={brand}
          currentSlide={slides[currentSlide]}
          availableWidth={AVAILABLE_WIDTH_FOR_SLIDE}
          availableHeight={centerHeight} // not used now, but handy if you later fit height too
        />
      </div>

      {/* Right Panel - Controls */}
      <div className="w-96 border-l border-border bg-background">
        {renderRightPanel()}
      </div>
    </div>
  );
};
