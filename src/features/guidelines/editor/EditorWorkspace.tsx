/**
 * EditorWorkspace — Chronicle-inspired slide editor.
 * Full-screen dark workspace with centered editable slide.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from '../pages/templates/layout-config';
import { getLayoutById } from '../pages/templates/layout-config';
import { EditorBottomBar } from './EditorBottomBar';
import { EditorTopBar } from './EditorTopBar';
import { SlideNav } from './SlideNav';
import { ThemeDrawer } from './ThemeDrawer';
import { BackgroundPopover } from './BackgroundPopover';
import { InsertMenu } from './InsertMenu';
import { RemixPanel } from './RemixPanel';
import { ExportModal } from './ExportModal';
import { EditableSlide } from './blocks/EditableSlide';
import { toast } from 'sonner';

interface EditorWorkspaceProps {
  brand: Brand;
  slides: SlideData[];
  onClose?: () => void;
}

export interface SlideData {
  id: string;
  name: string;
  bgColor?: string;
  render: (props: { brand: Brand; layout: TemplateLayout; pageNumber: number; totalPages: number }) => React.ReactNode;
}

export function EditorWorkspace({ brand, slides, onClose }: EditorWorkspaceProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [layoutId, setLayoutId] = useState('hyperhyve');
  const [presentMode, setPresentMode] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'theme' | 'background' | 'insert' | 'export' | 'remix'>('none');
  const [perSlideBg, setPerSlideBg] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = getLayoutById(layoutId);
  const totalPages = slides.length;
  const slide = slides[currentSlide];
  const bgOverride = slide ? perSlideBg[slide.id] : undefined;

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < totalPages) {
      setCurrentSlide(idx);
      setActivePanel('none');
    }
  }, [totalPages]);

  const togglePanel = useCallback((panel: 'insert' | 'theme' | 'background' | 'export' | 'remix') => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goTo(currentSlide + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goTo(currentSlide - 1); }
      if (e.key === 'Escape') {
        if (presentMode) setPresentMode(false);
        else if (activePanel !== 'none') setActivePanel('none');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentSlide, goTo, presentMode, activePanel]);

  // Auto-focus container
  useEffect(() => { containerRef.current?.focus(); }, []);

  const handleExportPDF = useCallback(async () => {
    toast.loading('Exporting PDF...');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });

      for (let i = 0; i < slides.length; i++) {
        setCurrentSlide(i);
        await new Promise(r => setTimeout(r, 200)); // Let it render

        const el = document.querySelector('[data-slide-canvas]') as HTMLElement;
        if (!el) continue;

        const canvas = await html2canvas(el, { scale: 3, backgroundColor: null, useCORS: true, logging: false });
        if (i > 0) pdf.addPage([1920, 1080], 'landscape');
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 1920, 1080);
      }

      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      pdf.save(`${slug}-brand-guidelines.pdf`);
      toast.dismiss();
      toast.success(`PDF exported (${slides.length} pages)`);
    } catch (err) {
      toast.dismiss();
      toast.error('PDF export failed');
      console.error(err);
    }
  }, [brand, slides]);

  // ─── Presentation Mode ─────────────────────────────────────
  if (presentMode) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col outline-none" tabIndex={0}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[85vw]">
            {slide?.render({ brand, layout, pageNumber: currentSlide + 1, totalPages })}
          </div>
        </div>
        <div className="h-11 flex items-center justify-center gap-6 bg-black/90 border-t border-white/5">
          <button onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0} className="text-white/40 hover:text-white disabled:opacity-20 transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-white/40 text-xs font-mono min-w-[60px] text-center">{currentSlide + 1} / {totalPages}</span>
          <button onClick={() => goTo(currentSlide + 1)} disabled={currentSlide >= totalPages - 1} className="text-white/40 hover:text-white disabled:opacity-20 transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button onClick={() => setPresentMode(false)} className="ml-6 text-white/20 text-xs hover:text-white/60 transition-colors">
            Press ESC to exit
          </button>
        </div>
      </div>
    );
  }

  // ─── Editor Mode ───────────────────────────────────────────
  return (
    <div ref={containerRef} className="fixed inset-0 z-40 bg-[#141414] flex flex-col outline-none" tabIndex={0}>
      {/* Top Bar */}
      <EditorTopBar
        brand={brand}
        currentSlide={currentSlide}
        totalPages={totalPages}
        slideName={slide?.name || ''}
        onPresent={() => setPresentMode(true)}
        onExport={() => togglePanel('export')}
        onClose={onClose}
      />

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Slide Navigator */}
        <SlideNav
          slides={slides}
          currentSlide={currentSlide}
          onSelect={goTo}
          brand={brand}
          layout={layout}
        />

        {/* Canvas Area */}
        <div className="flex-1 flex flex-col items-center justify-center overflow-auto relative">
          {/* Slide navigation arrows */}
          <button
            onClick={() => goTo(currentSlide - 1)}
            disabled={currentSlide === 0}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-0 flex items-center justify-center transition-all"
          >
            <ChevronLeft className="h-4 w-4 text-white/60" />
          </button>
          <button
            onClick={() => goTo(currentSlide + 1)}
            disabled={currentSlide >= totalPages - 1}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-0 flex items-center justify-center transition-all"
          >
            <ChevronRight className="h-4 w-4 text-white/60" />
          </button>

          {/* The Slide — wrapped in EditableSlide for inline editing */}
          <div className="w-full max-w-[min(90%,1100px)] px-12">
            <div
              data-slide-canvas
              className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/[0.08] transition-all duration-300"
              style={bgOverride ? { backgroundColor: bgOverride } : undefined}
            >
              <EditableSlide>
                {slide?.render({ brand, layout, pageNumber: currentSlide + 1, totalPages })}
              </EditableSlide>
            </div>
          </div>

          {/* Slide name label */}
          <div className="mt-4 text-white/15 text-xs">{slide?.name}</div>
        </div>

      </div>

      {/* Panels — positioned above the bottom bar, outside scroll area */}
      <div className="relative shrink-0">
        {activePanel === 'theme' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30">
            <ThemeDrawer layoutId={layoutId} onChangeLayout={setLayoutId} onClose={() => setActivePanel('none')} />
          </div>
        )}
        {activePanel === 'background' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30">
            <BackgroundPopover brand={brand} currentBg={bgOverride} onChangeBg={(c) => slide && setPerSlideBg(p => ({ ...p, [slide.id]: c }))} onClose={() => setActivePanel('none')} />
          </div>
        )}
        {activePanel === 'insert' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30">
            <InsertMenu onClose={() => setActivePanel('none')} />
          </div>
        )}
        {activePanel === 'remix' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-30">
            <RemixPanel onClose={() => setActivePanel('none')} />
          </div>
        )}

        {/* Bottom Bar */}
        <EditorBottomBar activePanel={activePanel} onTogglePanel={togglePanel} />
      </div>

      {/* Export Modal */}
      {activePanel === 'export' && (
        <ExportModal brand={brand} slides={slides} layout={layout} onClose={() => setActivePanel('none')} onExportPDF={handleExportPDF} />
      )}
    </div>
  );
}
