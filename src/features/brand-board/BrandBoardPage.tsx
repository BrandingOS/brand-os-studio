import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shuffle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useBrandStore } from '@/shared/store/brandStore';
import { useBrandBoardStore } from './store/useBrandBoardStore';
import { ColorsPanel } from './panels/ColorsPanel';
import { TypographyPanel } from './panels/TypographyPanel';
import { UIStylingPanel } from './panels/UIStylingPanel';
import { ConceptSwitcher } from './panels/ConceptSwitcher';
import { BrandPreview } from './preview/BrandPreview';

export default function BrandBoardPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const brand = useBrandStore((s) => s.current);
  const loadBySlug = useBrandStore((s) => s.loadBySlug);
  const updateBrand = useBrandStore((s) => s.update);

  const draft = useBrandBoardStore((s) => s.draft);
  const initFromBrand = useBrandBoardStore((s) => s.initFromBrand);
  const shuffleAll = useBrandBoardStore((s) => s.shuffleAll);

  // Load brand on mount
  useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  // Init draft from brand
  useEffect(() => {
    if (brand) initFromBrand(brand);
  }, [brand?.id]);

  // Keyboard shortcuts: SPACE = shuffle all, C/T/U = shuffle colors/typography/UI.
  // Ignored while the user is typing in a form control.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const store = useBrandBoardStore.getState();
      if (e.code === 'Space') {
        e.preventDefault();
        store.shuffleAll();
      } else if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        store.shuffleColors();
      } else if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        store.shuffleTypography();
      } else if (e.key.toLowerCase() === 'u') {
        e.preventDefault();
        store.shuffleUI();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <span className="font-semibold">{draft.brandName}</span>
          <ConceptSwitcher />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={shuffleAll}>
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
          <kbd className="px-2 py-0.5 text-xs bg-muted rounded font-mono">SPACE</kbd>
          <span className="text-sm text-muted-foreground">Shuffle everything</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Live preview updates as you edit colors, fonts, and styling.
        </div>
      </div>
    </div>
  );
}
