import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shuffle, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useBrandStore } from '@/shared/store/brandStore';
import { applyBrandTokens } from '@/shared/design-system/PresentationStyleAdapter';
import { AppRail } from '@/shared/layouts/AppRail';
import { useBrandBoardStore } from './store/useBrandBoardStore';
import { LogosPanel } from './panels/LogosPanel';
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

  // Save back to brand store — round-trip the ENTIRE draft so nothing
  // the user picked is lost on refresh. Previously we only persisted
  // primary/secondary/fonts and silently dropped accent, neutrals,
  // weight, borderRadius, shadow, and spacing.
  const handleSave = async () => {
    if (!brand) return;
    try {
      // ONE call. Colours and typography are Core, so the store routes them to
      // changeBrandColors / changeBrandTypography; uiStyle is not Core and keeps
      // the service path. Brand Board used to call both ops itself and merge the
      // result by hand — a second copy of the routing rules that could drift
      // from Setup's.
      await updateBrand(brand.id, {
        colorSystem: {
          primary: { hex: draft.colors.primary },
          ...(draft.colors.secondary ? { secondary: { hex: draft.colors.secondary } } : {}),
          ...(draft.colors.accent ? { accent: { hex: draft.colors.accent } } : {}),
          ...(draft.colors.neutrals?.length
            ? { neutrals: draft.colors.neutrals.map((hex) => ({ hex })) }
            : {}),
        },
        fonts: {
          primary: draft.typography.heading,
          ...(draft.typography.body ? { secondary: draft.typography.body } : {}),
        },
        uiStyle: {
          borderRadius: draft.uiStyle.borderRadius,
          shadowIntensity: draft.uiStyle.shadowIntensity,
          spacing: draft.uiStyle.spacing,
          weight: draft.typography.weight,
        },
      });
      const cur = useBrandStore.getState().current;
      if (cur?.id === brand.id) applyBrandTokens(cur);
      toast.success('Brand board saved');
    } catch (err) {
      toast.error('Could not save brand board', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  };

  return (
    <div
      className="h-screen flex overflow-hidden"
      style={{ background: 'var(--bb-shell-bg, #faf9f6)' }}
    >
      {/* Global app rail — lets the user switch brands / jump to workspace
          without leaving the Brand Board. Mirrors other in-shell pages. */}
      <AppRail brandSlug={slug} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar — borderless; separated from the canvas by whitespace only */}
        <header className="h-16 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="rounded-full text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Button>
            <Separator orientation="vertical" className="h-4 opacity-50" />
            <div className="flex items-baseline gap-2">
              <span className="font-semibold tracking-tight">{draft.brandName}</span>
              <span className="text-xs text-muted-foreground tracking-wide uppercase">
                · Brand Board
              </span>
            </div>
            <ConceptSwitcher />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shuffleAll}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_16px_-8px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_24px_-8px_rgba(0,0,0,0.12)] transition-shadow"
            >
              <Shuffle className="h-3.5 w-3.5" />
              Shuffle all
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </div>
        </header>

        {/* Split panels */}
        <div className="flex-1 flex overflow-hidden gap-0">
          {/* Left panel — controls, no hard border; just whitespace + subtle shadow */}
          <div className="w-[380px] overflow-y-auto px-5 pt-2 pb-10 space-y-6 shrink-0">
            <LogosPanel />
            <ColorsPanel />
            <TypographyPanel />
            <UIStylingPanel />
          </div>

          {/* Right panel — preview on a warm canvas background */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ background: 'var(--bb-canvas-bg, #f2f0eb)' }}
          >
            <BrandPreview />
          </div>
        </div>

        {/* Bottom bar — borderless, quiet */}
        <div className="h-12 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              Shuffle
            </span>
            <Hint hint="SPACE">All</Hint>
            <Hint hint="C">Colors</Hint>
            <Hint hint="T">Type</Hint>
            <Hint hint="U">UI</Hint>
          </div>
          <div className="text-[11px] text-muted-foreground/70">
            Lock a color to keep it through shuffles.
          </div>
        </div>
      </div>
    </div>
  );
}

function Hint({ hint, children }: { hint: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <kbd className="px-1.5 py-0.5 text-[10px] bg-white/70 rounded-md font-mono text-foreground/70 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]">
        {hint}
      </kbd>
      <span className="text-xs text-muted-foreground/80">{children}</span>
    </div>
  );
}
