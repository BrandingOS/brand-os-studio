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

interface CanvasGuidelinesEditorProps {
  onSlideEdit?: () => void;
}

export function CanvasGuidelinesEditor({ onSlideEdit }: CanvasGuidelinesEditorProps) {
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    // Build a purely client-side presentation from the brand's data.
    // Used for local brands (non-uuid ids the Supabase tables reject
    // with 22P02) and as the fallback when the server path fails —
    // before this, any failure left the spinner up forever (GDL-01).
    const buildLocalPresentation = (b: any) => {
      const now = new Date().toISOString();
      const presentation = {
        id: `local-${b.id}`,
        brand_id: b.id,
        user_id: 'local',
        title: `${b.name} Brand Guidelines`,
        version: '1',
        layout_type: 'canvas',
        theme_settings: {},
        slides: [],
        slide_order: [],
        export_settings: {},
        is_published: false,
        created_at: now,
        updated_at: now,
      };
      const localSlides = brandToSlides(b).map((s) => ({
        id: s.id,
        presentation_id: presentation.id,
        slide_type: s.type,
        title: s.title,
        order_index: s.order,
        content: s.content as Record<string, any>,
        is_enabled: s.enabled,
        is_locked: false,
        custom_styles: {},
        created_at: now,
        updated_at: now,
      }));
      return { presentation, localSlides };
    };

    const initializeEditor = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        // Load brands if not already loaded. Read the RESULT from the
        // store afterwards — the `brands` closure captured the pre-load
        // (possibly empty) array, which is what used to throw a spurious
        // "Brand not found" on first mount.
        if (brands.length === 0) {
          await loadAll();
        }
        const liveBrands = useBrandStore.getState().list;
        const foundBrand = liveBrands.find((b) => b.slug === slug);
        if (!foundBrand) {
          setLoadError(`No brand matches "${slug}".`);
          return;
        }
        setBrand(foundBrand);

        // Local brand ids (brand_<timestamp>) can never exist in the
        // Supabase uuid columns — go straight to the local presentation.
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          foundBrand.id,
        );
        if (!isUuid) {
          const { presentation, localSlides } = buildLocalPresentation(foundBrand);
          setCurrentPresentation(presentation as any);
          setSlides(localSlides as any);
          return;
        }

        try {
          // Load or create presentation for this brand
          const presentations = await presentationsService.getPresentationsByBrand(
            foundBrand.id,
          );
          let presentation = presentations?.[0];
          if (!presentation) {
            const newPres = await presentationsService.createPresentation({
              brand_id: foundBrand.id,
              title: `${foundBrand.name} Brand Guidelines`,
              layout_type: 'canvas',
            });
            presentation = newPres as any;
          }
          setCurrentPresentation(presentation as any);

          const loadedSlides = await presentationsService.getSlides(presentation.id);
          if (loadedSlides.length === 0) {
            const defaultSlides = brandToSlides(foundBrand);
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
            const newSlides = await presentationsService.getSlides(presentation.id);
            setSlides(newSlides);
          } else {
            setSlides(loadedSlides);
          }
        } catch (serverError) {
          // Server path failed (offline, RLS, missing table…) — degrade
          // to the local view instead of an endless spinner.
          console.warn(
            'Guidelines editor: server unavailable, using local view:',
            serverError,
          );
          const { presentation, localSlides } = buildLocalPresentation(foundBrand);
          setCurrentPresentation(presentation as any);
          setSlides(localSlides as any);
        }
      } catch (error) {
        console.error('Error initializing guidelines editor:', error);
        setLoadError(
          error instanceof Error ? error.message : 'Could not load brand guidelines.',
        );
      } finally {
        setLoading(false);
      }
    };

    initializeEditor();
  }, [slug, brands, loadAll, setCurrentPresentation, setSlides, setLoading]);

  const handleSlideChange = (index: number) => {
    setCurrentSlideIndex(index);
    onSlideEdit?.();
  };

  if (loadError) {
    return (
      <CanvasCard className="flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-2 text-center px-6">
          <p className="font-semibold">Couldn't load brand guidelines</p>
          <p className="text-muted-foreground text-sm">{loadError}</p>
        </div>
      </CanvasCard>
    );
  }

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
