import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';
import { usePresentationsStore } from '@/shared/store/presentationsStore';
import { presentationsService } from '@/shared/services/presentations.supabase';
import { CanvasCard } from '@/features/brand/components/CanvasCard';
import { PreviewCanvas } from './PreviewCanvas';
import { SlideNavigator } from './SlideNavigator';
import { brandToSlides } from '@/shared/utils/brand-to-slides';
import { Loader2 } from 'lucide-react';

export function CanvasGuidelinesEditor() {
  const { slug } = useParams();
  const { list: brands, loadAll } = useBrandStore();
  const {
    currentPresentation,
    slides,
    currentSlideIndex,
    setCurrentPresentation,
    setSlides,
    setCurrentSlideIndex,
    isLoading,
    setLoading,
  } = usePresentationsStore();

  const [brand, setBrand] = useState<any>(null);

  useEffect(() => {
    const initializeEditor = async () => {
      setLoading(true);
      try {
        // Load brands if not already loaded
        if (brands.length === 0) {
          await loadAll();
        }

        // Find brand by slug
        const foundBrand = brands.find((b) => b.slug === slug);
        if (!foundBrand) {
          throw new Error('Brand not found');
        }
        setBrand(foundBrand);

        // Load or create presentation for this brand
        const presentations = await presentationsService.getPresentationsByBrand(foundBrand.id);
        
        let presentation = presentations?.[0];
        if (!presentation) {
          // Create new presentation
          const newPres = await presentationsService.createPresentation({
            brand_id: foundBrand.id,
            title: `${foundBrand.name} Brand Guidelines`,
            layout_type: 'canvas',
          });
          presentation = newPres as any;
        }

        setCurrentPresentation(presentation as any);

        // Load slides
        const loadedSlides = await presentationsService.getSlides(presentation.id);
        
        if (loadedSlides.length === 0) {
          // Generate default slides from brand data
          const defaultSlides = brandToSlides(foundBrand);
          
          // Create slides in database
          for (const slide of defaultSlides) {
            await presentationsService.createSlide({
              presentation_id: presentation.id,
              slide_type: slide.type,
              title: slide.title,
              order_index: slide.order,
              content: slide.content,
              is_enabled: slide.enabled,
            });
          }
          
          // Reload slides
          const newSlides = await presentationsService.getSlides(presentation.id);
          setSlides(newSlides);
        } else {
          setSlides(loadedSlides);
        }
      } catch (error) {
        console.error('Error initializing guidelines editor:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeEditor();
  }, [slug, brands, loadAll, setCurrentPresentation, setSlides, setLoading]);

  const handleSlideChange = (index: number) => {
    setCurrentSlideIndex(index);
  };

  if (isLoading || !brand || !currentPresentation) {
    return (
      <CanvasCard className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading brand guidelines...</p>
        </div>
      </CanvasCard>
    );
  }

  const currentSlide = slides[currentSlideIndex];

  return (
    <CanvasCard>
      <div className="space-y-6">
        {/* Slide Navigator */}
        <div className="pb-6 border-b">
          <SlideNavigator
            slides={slides.map((s, idx) => ({
              id: s.id,
              type: s.slide_type as any,
              title: s.title,
              order: idx,
              enabled: s.is_enabled,
              content: s.content as any,
            }))}
            currentSlide={currentSlideIndex}
            onSlideSelect={handleSlideChange}
            brand={brand}
          />
        </div>

        {/* Preview Canvas */}
        <div className="min-h-[600px]">
          <PreviewCanvas
            brand={brand}
            currentSlide={currentSlide ? {
              id: currentSlide.id,
              type: currentSlide.slide_type as any,
              title: currentSlide.title,
              order: currentSlide.order_index,
              enabled: currentSlide.is_enabled,
              content: currentSlide.content as any,
            } : undefined}
          />
        </div>
      </div>
    </CanvasCard>
  );
}
