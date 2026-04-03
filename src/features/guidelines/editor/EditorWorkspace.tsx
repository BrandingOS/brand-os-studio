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
  const [canvasMode, setCanvasMode] = useState<'freeform' | 'scroll'>('freeform');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const layout = getLayoutById(layoutId);
  const totalPages = slides.length;
  const slide = slides[currentSlide];
  const bgOverride = slide ? perSlideBg[slide.id] : undefined;

  const goTo = useCallback((idx: number) => {
    if (idx >= 0 && idx < totalPages) {
      setCurrentSlide(idx);
      setActivePanel('none');
      setPan({ x: 0, y: 0 });
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
      // Zoom shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(prev => Math.min(2, prev + 0.1)); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(prev => Math.max(0.3, prev - 0.1)); }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(calculateFitZoom()); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentSlide, goTo, presentMode, activePanel]);

  // Auto-focus container
  useEffect(() => { containerRef.current?.focus(); }, []);

  // Auto-fit: calculate zoom so slide fills canvas with edge gap
  const calculateFitZoom = useCallback(() => {
    // Use window dimensions minus top bar (48px) and bottom bar (48px)
    const viewW = window.innerWidth - 60 - 80; // 60 for left nav, 80 for right padding
    const viewH = window.innerHeight - 48 - 48 - 80; // top bar, bottom bar, 80 for gap
    const slideW = 1200;
    const slideH = 675; // 16:9
    const fitZoom = Math.min(viewW / slideW, viewH / slideH);
    return Math.max(0.4, Math.min(fitZoom, 1)); // clamp 40%-100%
  }, []);

  // Set initial zoom to fit on mount and resize
  useEffect(() => {
    // Delay slightly to ensure layout is ready
    const timer = setTimeout(() => setZoom(calculateFitZoom()), 50);
    const handleResize = () => setZoom(calculateFitZoom());
    window.addEventListener('resize', handleResize);
    return () => { clearTimeout(timer); window.removeEventListener('resize', handleResize); };
  }, [calculateFitZoom]);

  // Block ALL browser swipe navigation (back AND forward) on macOS
  useEffect(() => {
    // CSS: prevent overscroll navigation in both directions
    const styles = [
      ['overscrollBehavior', 'none'],
      ['overscrollBehaviorX', 'none'],
      ['overscrollBehaviorY', 'none'],
      ['touchAction', 'pan-y pinch-zoom'],
    ] as const;
    for (const [prop, val] of styles) {
      (document.documentElement.style as any)[prop] = val;
      (document.body.style as any)[prop] = val;
    }

    // Block horizontal wheel events on the entire window to prevent forward/back
    const blockHorizontalScroll = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 5) {
        e.preventDefault();
      }
    };
    window.addEventListener('wheel', blockHorizontalScroll, { passive: false });

    // History state trap — catches both back AND forward
    const dummyState = { editorOpen: true };
    window.history.pushState(dummyState, '');
    window.history.pushState(dummyState, ''); // Push twice so forward is also trapped

    const handlePopState = () => {
      window.history.pushState(dummyState, '');
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      for (const [prop] of styles) {
        (document.documentElement.style as any)[prop] = '';
        (document.body.style as any)[prop] = '';
      }
      window.removeEventListener('wheel', blockHorizontalScroll);
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Canvas zoom + pan via scroll/trackpad
  // Prevents browser back/forward swipe gestures
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Always prevent default to stop browser navigation
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Zoom with snap-to-fit magnet
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(prev => {
          const next = Math.min(2, Math.max(0.3, prev + delta));
          // Magnet: snap to fit-zoom when within 5% of it
          const fitZoom = calculateFitZoom();
          if (Math.abs(next - fitZoom) < 0.05) return fitZoom;
          // Also snap to 100%
          if (Math.abs(next - 1) < 0.04) return 1;
          // Also snap to 50%
          if (Math.abs(next - 0.5) < 0.04) return 0.5;
          return next;
        });
      } else {
        // Pan (normal scroll/swipe) — clamped so slide stays visible
        const maxPan = 300;
        setPan(prev => ({
          x: Math.max(-maxPan, Math.min(maxPan, prev.x - e.deltaX)),
          y: Math.max(-maxPan, Math.min(maxPan, prev.y - e.deltaY)),
        }));
      }
    };

    // Prevent overscroll/back-forward navigation
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  const zoomIn = () => setZoom(prev => Math.min(2, prev + 0.1));
  const zoomOut = () => setZoom(prev => Math.max(0.3, prev - 0.1));
  const zoomReset = () => { setZoom(calculateFitZoom()); setPan({ x: 0, y: 0 }); };
  const zoomFit = () => { setZoom(calculateFitZoom()); setPan({ x: 0, y: 0 }); };

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
        {canvasMode === 'freeform' ? (
          /* ─── FREEFORM CANVAS: single slide, zoom, pan ─── */
          <div ref={canvasRef} className="flex-1 flex flex-col items-center justify-center overflow-auto relative">
            <button onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0}
              className="absolute left-14 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-0 flex items-center justify-center transition-all">
              <ChevronLeft className="h-4 w-4 text-white/60" />
            </button>
            <button onClick={() => goTo(currentSlide + 1)} disabled={currentSlide >= totalPages - 1}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-0 flex items-center justify-center transition-all">
              <ChevronRight className="h-4 w-4 text-white/60" />
            </button>

            {/* Zoom controls */}
            <div className="absolute bottom-4 right-4 z-10 flex items-center gap-1 bg-[#222] rounded-xl px-1 py-0.5 border border-white/[0.06]">
              <button onClick={zoomOut} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm">−</button>
              <button onClick={zoomReset} className="px-2 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-[11px] font-mono min-w-[45px]">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={zoomIn} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors text-sm">+</button>
              <div className="w-px h-4 bg-white/10 mx-0.5" />
              <button onClick={zoomFit} className="px-2 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-[10px]">Fit</button>
            </div>

            {/* Canvas mode toggle */}
            <div className="absolute bottom-4 left-14 z-10 flex items-center gap-0.5 bg-[#222] rounded-lg px-0.5 py-0.5 border border-white/[0.06]">
              <button onClick={() => setCanvasMode('freeform')} className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/15 text-white">Slide</button>
              <button onClick={() => setCanvasMode('scroll')} className="px-2 py-1 rounded-md text-[10px] font-medium text-white/30 hover:text-white/60 transition-colors">Scroll</button>
            </div>

            <div className="origin-center" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: 'transform 0.05s ease-out' }}>
              <div className="w-[1200px]">
                <div data-slide-canvas className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/[0.08]" style={bgOverride ? { backgroundColor: bgOverride } : undefined}>
                  <EditableSlide>{slide?.render({ brand, layout, pageNumber: currentSlide + 1, totalPages })}</EditableSlide>
                </div>
              </div>
            </div>
            <div className="mt-3 text-white/15 text-xs">{slide?.name}</div>
          </div>
        ) : (
          /* ─── SCROLL CANVAS: all slides vertically, no zoom/pan ─── */
          <div className="flex-1 overflow-y-auto relative">
            {/* Canvas mode toggle */}
            <div className="sticky top-4 left-14 z-10 inline-flex items-center gap-0.5 bg-[#222] rounded-lg px-0.5 py-0.5 border border-white/[0.06] ml-14">
              <button onClick={() => setCanvasMode('freeform')} className="px-2 py-1 rounded-md text-[10px] font-medium text-white/30 hover:text-white/60 transition-colors">Slide</button>
              <button onClick={() => setCanvasMode('scroll')} className="px-2 py-1 rounded-md text-[10px] font-medium bg-white/15 text-white">Scroll</button>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-6 space-y-6">
              {slides.map((s, i) => {
                const slideBg = perSlideBg[s.id];
                return (
                  <div
                    key={s.id}
                    data-slide-canvas={i === currentSlide ? '' : undefined}
                    className={`rounded-xl overflow-hidden shadow-xl ring-1 transition-all cursor-pointer ${
                      i === currentSlide ? 'ring-white/20' : 'ring-white/[0.06] hover:ring-white/15'
                    }`}
                    style={slideBg ? { backgroundColor: slideBg } : undefined}
                    onClick={() => setCurrentSlide(i)}
                  >
                    <EditableSlide>
                      {s.render({ brand, layout, pageNumber: i + 1, totalPages })}
                    </EditableSlide>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
