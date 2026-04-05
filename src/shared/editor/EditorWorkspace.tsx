/**
 * EditorWorkspace — Chronicle-inspired slide editor.
 * Full-screen dark workspace with centered editable slide.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from './layout-config';
import { getLayoutById } from './layout-config';
import { EditorBottomBar } from './EditorBottomBar';
import { EditorTopBar } from './EditorTopBar';
import { SlideNav } from './SlideNav';
import { ThemeDrawer } from './ThemeDrawer';
import { BackgroundPopover } from './BackgroundPopover';
import { InsertMenu } from './InsertMenu';
import { RemixPanel } from './RemixPanel';
import { ExportModal } from './ExportModal';
import { EditableSlide } from './blocks/EditableSlide';
import { useHistory } from './useHistory';
import { toast } from 'sonner';

interface EditorWorkspaceProps {
  brand: Brand;
  slides: SlideData[];
  onClose?: () => void;
}

export interface SlideRenderProps {
  brand: Brand;
  layout: TemplateLayout;
  pageNumber: number;
  totalPages: number;
}

export interface SlideData {
  id: string;
  name: string;
  bgColor?: string;
  render: (props: SlideRenderProps) => React.ReactNode;
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
  const { undo, redo } = useHistory();
  const scrollCooldown = useRef(false);
  const [slideOffset, setSlideOffset] = useState(0); // -1 to 1, for smooth transition
  const scrollAccum = useRef(0);

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

  // Block browser swipe navigation
  useEffect(() => {
    document.documentElement.style.overscrollBehaviorX = 'none';
    document.body.style.overscrollBehaviorX = 'none';

    const dummyState = { editorOpen: true };
    window.history.pushState(dummyState, '');
    window.history.pushState(dummyState, '');
    const handlePopState = () => window.history.pushState(dummyState, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.documentElement.style.overscrollBehaviorX = '';
      document.body.style.overscrollBehaviorX = '';
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Canvas zoom + slide navigation (freeform mode only)
  useEffect(() => {
    if (canvasMode !== 'freeform') return;
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
        // Smooth magnetic scroll between slides
        scrollAccum.current += e.deltaY;
        const threshold = 120; // pixels of scroll before committing to next slide

        // Live drag: show partial offset as user scrolls
        const dragAmount = Math.max(-1, Math.min(1, scrollAccum.current / threshold));
        setSlideOffset(dragAmount);

        // When threshold crossed, snap to next/prev slide
        if (Math.abs(scrollAccum.current) > threshold && !scrollCooldown.current) {
          scrollCooldown.current = true;
          const dir = scrollAccum.current > 0 ? 1 : -1;
          scrollAccum.current = 0;

          setCurrentSlide(prev => {
            const next = prev + dir;
            if (next >= 0 && next < slides.length) return next;
            return prev;
          });
          setActivePanel('none');

          // Animate snap: offset overshoots then returns to 0
          setSlideOffset(dir * 0.3);
          setTimeout(() => setSlideOffset(0), 150);
          setTimeout(() => { scrollCooldown.current = false; }, 500);
        }

        // Reset accumulator if user stops scrolling (decay)
        clearTimeout((scrollAccum as any)._resetTimer);
        (scrollAccum as any)._resetTimer = setTimeout(() => {
          scrollAccum.current = 0;
          setSlideOffset(0);
        }, 200);
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
  }, [canvasMode, calculateFitZoom, slides.length]);

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
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {/* Left Slide Navigator */}
        <SlideNav slides={slides} currentSlide={currentSlide} onSelect={goTo} brand={brand} layout={layout} />

        {canvasMode === 'freeform' ? (
          /* ─── SLIDE VIEW ─── */
          <div ref={canvasRef} className="flex-1 flex flex-col items-center overflow-hidden relative min-h-0">
            {/* Slide/Scroll toggle */}
            <div className="flex justify-center py-2 shrink-0 w-full">
              <div className="inline-flex items-center gap-0.5 bg-[#1e1e1e] rounded-full px-1 py-0.5 border border-white/[0.06]">
                <button onClick={() => setCanvasMode('freeform')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'freeform' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Slide</button>
                <button onClick={() => setCanvasMode('scroll')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'scroll' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Scroll</button>
              </div>
            </div>

            {/* Canvas with proper padding */}
            <div className="flex-1 w-full flex items-center justify-center min-h-0" style={{ padding: '8px 40px 8px 48px' }}>
            {/* Zoom controls — bottom right */}
            <div className="absolute bottom-5 right-12 z-10 flex items-center gap-0.5 bg-[#1e1e1e]/80 rounded-lg px-0.5 py-0.5 border border-white/[0.06]">
              <button onClick={zoomOut} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">−</button>
              <button onClick={zoomReset} className="px-1.5 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-mono">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={zoomIn} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">+</button>
            </div>

            {/* The Slide — fills available space with comfortable padding */}
            <div
              key={currentSlide}
              className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in-[0.97] duration-300"
            >
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}
              >
                <div style={{ width: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '16/9' }}>
                  <div data-slide-canvas className="w-full h-full rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/[0.08]" style={bgOverride ? { backgroundColor: bgOverride } : undefined}>
                    <EditableSlide>{slide?.render({ brand, layout, pageNumber: currentSlide + 1, totalPages })}</EditableSlide>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        ) : (
          /* ─── SCROLL VIEW ─── */
          <div ref={canvasRef} className="flex-1 flex flex-col overflow-hidden relative min-h-0">
            {/* Slide/Scroll toggle */}
            <div className="flex justify-center py-2 shrink-0 w-full">
              <div className="inline-flex items-center gap-0.5 bg-[#1e1e1e] rounded-full px-1 py-0.5 border border-white/[0.06]">
                <button onClick={() => setCanvasMode('freeform')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'freeform' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Slide</button>
                <button onClick={() => setCanvasMode('scroll')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'scroll' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Scroll</button>
              </div>
            </div>

            {/* Scrollable slides */}
            <div className="flex-1 min-h-0 snap-y snap-mandatory" style={{ overflowY: 'auto', overflowX: 'hidden', scrollBehavior: 'smooth' }}>
              {slides.map((s, i) => {
                const slideBg = perSlideBg[s.id];
                return (
                  <div key={s.id} className="snap-center flex items-center justify-center" style={{ minHeight: '100%', padding: '12px 40px 12px 48px' }}>
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}
                  >
                    <div style={{ width: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio: '16/9' }}>
                      <div
                        data-slide-canvas={i === currentSlide ? '' : undefined}
                        className={`w-full h-full rounded-xl overflow-hidden shadow-xl ring-1 transition-all ${
                          i === currentSlide ? 'ring-white/15' : 'ring-white/[0.04]'
                        }`}
                        style={slideBg ? { backgroundColor: slideBg } : undefined}
                        onClick={() => setCurrentSlide(i)}
                      >
                        <EditableSlide>
                          {s.render({ brand, layout, pageNumber: i + 1, totalPages })}
                        </EditableSlide>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>

            {/* Zoom controls */}
            <div className="absolute bottom-3 right-8 z-10 flex items-center gap-0.5 bg-[#1e1e1e]/80 rounded-lg px-0.5 py-0.5 border border-white/[0.06]">
              <button onClick={zoomOut} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">−</button>
              <button onClick={zoomReset} className="px-1.5 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-mono">{Math.round(zoom * 100)}%</button>
              <button onClick={zoomIn} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">+</button>
            </div>
          </div>
        )}
      </div>

      {/* Panels — positioned above the bottom bar, outside scroll area */}
      <div className="relative shrink-0">
        {activePanel === 'theme' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30">
            <ThemeDrawer layoutId={layoutId} onChangeLayout={setLayoutId} onClose={() => setActivePanel('none')} />
          </div>
        )}
        {activePanel === 'background' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30">
            <BackgroundPopover brand={brand} currentBg={bgOverride} onChangeBg={(c) => slide && setPerSlideBg(p => ({ ...p, [slide.id]: c }))} onClose={() => setActivePanel('none')} />
          </div>
        )}
        {activePanel === 'insert' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30">
            <InsertMenu
              onClose={() => setActivePanel('none')}
              brand={brand}
              onAddAsset={(name, url) => {
                const newAsset = { id: `asset_${Date.now()}`, name, type: 'image' as const, category: 'photo' as const, source: 'upload' as const, url, size: 0, tags: ['guideline'], createdAt: new Date() };
                import('@/shared/store/brandStore').then(({ useBrandStore }) => {
                  useBrandStore.getState().update(brand.id, { assets: [...(brand.assets || []), newAsset] });
                });
              }}
            />
          </div>
        )}
        {activePanel === 'remix' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30">
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
