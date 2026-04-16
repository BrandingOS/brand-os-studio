import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Undo2 as Undo,
  Redo2 as Redo,
  Shuffle,
  Save,
  Monitor,
  Tablet,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useBrandStore } from '@/shared/store/brandStore';
import { useBrandBoardStore } from './store/useBrandBoardStore';
import { shuffleEverything } from './engine/shuffle';
import { ColorsPanel } from './panels/ColorsPanel';
import { TypographyPanel } from './panels/TypographyPanel';
import { UIStylingPanel } from './panels/UIStylingPanel';
import { ConceptSwitcher } from './panels/ConceptSwitcher';
import { BrandPreview } from './preview/BrandPreview';
import type { ShadowIntensity, Spacing, DeviceMode } from './store/useBrandBoardStore';

export default function BrandBoardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const brand = useBrandStore((s) => s.current);
  const loadBySlug = useBrandStore((s) => s.loadBySlug);
  const updateBrand = useBrandStore((s) => s.update);

  const draft = useBrandBoardStore((s) => s.draft);
  const device = useBrandBoardStore((s) => s.device);
  const setDevice = useBrandBoardStore((s) => s.setDevice);
  const setColors = useBrandBoardStore((s) => s.setColors);
  const setTypography = useBrandBoardStore((s) => s.setTypography);
  const setUIStyle = useBrandBoardStore((s) => s.setUIStyle);
  const setBrandName = useBrandBoardStore((s) => s.setBrandName);

  // Load brand on mount
  useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  // Init draft from brand
  useEffect(() => {
    if (brand) {
      setBrandName(brand.name);
      setColors({
        primary: brand.primaryColor || '#6366f1',
        secondary: brand.secondaryColor || '#8b5cf6',
      });
      if (brand.fonts) {
        setTypography({
          heading: brand.fonts.primary || 'Inter',
          body: brand.fonts.secondary || 'Inter',
        });
      }
    }
  }, [brand?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Shuffle all
  const handleShuffleAll = () => {
    const result = shuffleEverything(draft.colors.primary);
    setColors({
      primary: result.colors.primary,
      secondary: result.colors.secondary,
      accent: result.colors.accent,
      neutrals: result.colors.neutrals,
    });
    setTypography({
      heading: result.typography.heading,
      body: result.typography.body,
    });
    setUIStyle({
      borderRadius: result.uiStyle.borderRadius,
      shadowIntensity: result.uiStyle.shadowIntensity as ShadowIntensity,
      spacing: result.uiStyle.spacing as Spacing,
    });
  };

  // Keyboard: SPACE to shuffle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        e.preventDefault();
        handleShuffleAll();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }); // intentionally no deps — always uses latest handleShuffleAll

  // Save back to brand store
  const handleSave = async () => {
    if (!brand) return;
    await updateBrand(brand.id, {
      primaryColor: draft.colors.primary,
      secondaryColor: draft.colors.secondary,
      fonts: {
        primary: draft.typography.heading,
        secondary: draft.typography.body,
      },
    });
    toast.success('Brand updated');
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="h-14 border-b flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="font-semibold">{brand?.name ?? 'Brand Board'}</span>
          <ConceptSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShuffleAll}
          >
            <Shuffle className="h-4 w-4 mr-1" /> Shuffle All
          </Button>
          <Button size="sm" onClick={handleSave}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </header>

      {/* Split panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel — controls */}
        <div className="w-[420px] border-r overflow-y-auto p-5 space-y-8 shrink-0">
          <ColorsPanel />
          <TypographyPanel />
          <UIStylingPanel />
        </div>

        {/* Right panel — preview */}
        <div className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
          <BrandPreview />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="h-12 border-t flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-0.5 text-xs bg-muted rounded font-mono">
            SPACE
          </kbd>
          <span className="text-sm text-muted-foreground">
            Shuffle everything
          </span>
        </div>
        {/* Device toggle */}
        <div className="flex items-center gap-1">
          {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map((d) => (
            <Button
              key={d}
              variant={device === d ? 'default' : 'ghost'}
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setDevice(d)}
            >
              {d === 'desktop' ? (
                <Monitor className="h-4 w-4" />
              ) : d === 'tablet' ? (
                <Tablet className="h-4 w-4" />
              ) : (
                <Smartphone className="h-4 w-4" />
              )}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
