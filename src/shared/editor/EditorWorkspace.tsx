/**
 * EditorWorkspace — Figma-style slide editor for all presentation types.
 * Full-screen dark workspace with centered editable slide,
 * zoom/pan, presentation mode, customization sidebar,
 * and optional proportional header/footer overlays.
 *
 * Slides render at their native full size — the editor never
 * compresses or re-pads content. Chrome (header/footer) floats
 * on top as pointer-events-none overlays.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Settings, LayoutGrid, Undo2, Redo2, History, Pencil, Plus } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from './layout-config';
import { getLayoutById } from './layout-config';
import { PresentationCustomizer } from '@/shared/presentation/PresentationCustomizer';
import { createPresentationStore } from '@/shared/presentation/store';
import type { PresentationSettings, PresentationTemplate, SizeFormat } from '@/shared/presentation/types';
import { getStyleById, getStyleSpacingDefaults } from '@/shared/presentation/styles';
import { EditorBottomBar } from './EditorBottomBar';
import { SlideNav } from './SlideNav';
import { ThemeDrawer } from './ThemeDrawer';
import { BackgroundPopover } from './BackgroundPopover';
import { InsertMenu } from './InsertMenu';
import { RemixPanel } from './RemixPanel';
import { ExportModal } from './ExportModal';
import { EditableSlide } from './blocks/EditableSlide';
import { EditorContext } from './EditorContext';
import { useHistory } from './useHistory';
import { HistoryPanel } from './HistoryPanel';
import { useSlideSnapshotStore } from './slideSnapshotStore';
import { captureElementForExport } from './exportCapture';
import { toast } from 'sonner';

// ── Default store (for brand guidelines) ────────────────────
const useDefaultSettingsStore = createPresentationStore('editor-settings-default');

// ── Default templates ───────────────────────────────────────
const DEFAULT_EDITOR_TEMPLATES: PresentationTemplate[] = [
  { id: 'hyperhyve', name: 'Studio', description: 'Structured grid with centered logo header' },
  { id: 'identity', name: 'Identity', description: 'Full-bleed color blocks with bold logos' },
  { id: 'noteform', name: 'Noteform', description: 'Dark cinematic with editorial metadata' },
  { id: 'signal', name: 'Signal', description: 'Bright accent hero blocks with oversized numbers' },
];

// ── Types ───────────────────────────────────────────────────

interface EditorWorkspaceProps {
  brand: Brand;
  slides: SlideData[];
  onClose?: () => void;
  /** Custom Zustand store hook — if not provided, uses the default store */
  useSettingsStore?: () => ReturnType<typeof useDefaultSettingsStore>;
  /** Custom template list for the customizer */
  templates?: PresentationTemplate[];
  /** Label shown in the customizer header */
  customizerTitle?: string;
  /** Called when the user switches template/style in the customizer — allows parent to rebuild slides */
  onTemplateChange?: (templateId: string) => void;
  /** Called when user wants to open the full template picker */
  onOpenTemplatePicker?: () => void;
  /** Unique key for this editor instance — used for persisted history per slide */
  editorKey?: string;
  /**
   * Optional context-aware inspector panel rendered as a right sidebar.
   * Receives the current slide id and a close callback.
   * When provided, an "Edit Content" button appears in the top bar.
   */
  inspectorPanel?: (currentSlideId: string | undefined, close: () => void) => React.ReactNode;
  /** Label for the inspector button (default "Content") */
  inspectorLabel?: string;
  /** Optional callback to open an "Add Slide" picker. When provided, a "+" button appears in the top bar. */
  onAddSlide?: () => void;
  /** Optional callback to delete a specific slide by id. When provided, slide thumbnails get a delete button on hover. */
  onDeleteSlide?: (slideId: string) => void;
  /**
   * Per-slide HTML snapshots from a persisted doc store. When provided,
   * the workspace re-injects the snapshot into the slide canvas after
   * React paint so user edits survive reload. Keyed by slide id.
   */
  slideSnapshots?: Record<string, string>;
  /**
   * Persistence callback. Fires whenever the user edits a slide (debounced
   * by useHistory). Hosts wire this to their doc-store mutation so the
   * snapshot survives reload.
   */
  onPersistSlideSnapshot?: (slideId: string, html: string) => void;
}

export interface SlideRenderProps {
  brand: Brand;
  layout: TemplateLayout;
  pageNumber: number;
  totalPages: number;
  /** Slide orientation derived from settings.size — pages adapt layouts */
  orientation: 'portrait' | 'landscape' | 'square';
  /** Aspect ratio number (width / height) — useful for fine-grained adaptation */
  aspectRatioValue: number;
  /** Full presentation settings — pages use spacing to override style defaults */
  settings: PresentationSettings;
}

export interface SlideData {
  id: string;
  name: string;
  bgColor?: string;
  render: (props: SlideRenderProps) => React.ReactNode;
}

// ── Proportional Header/Footer ──────────────────────────────
// Floats on top of the slide — never displaces or pads content.

function SlideChrome({
  settings,
  brandName,
  pageNumber,
  totalPages,
}: {
  settings: PresentationSettings;
  brandName: string;
  pageNumber: number;
  totalPages: number;
}) {
  // Use percentage-based inset so it scales with any size
  const inset = `${Math.max(settings.spacing.padding / 15, 2.5)}%`;

  return (
    <>
      {settings.header.enabled && (
        <div
          className="absolute z-20 flex items-center justify-between pointer-events-none"
          style={{ top: inset, left: inset, right: inset }}
        >
          <div className="flex items-center gap-[0.6em]">
            {settings.header.showProjectName && (
              <span className="text-[0.5em] font-medium tracking-[0.1em] uppercase opacity-30">{brandName}</span>
            )}
            {settings.header.customText && (
              <>
                <span className="opacity-10">·</span>
                <span className="text-[0.5em] opacity-20">{settings.header.customText}</span>
              </>
            )}
          </div>
          {settings.header.showDate && (
            <span className="text-[0.45em] opacity-15 font-mono">{new Date().toLocaleDateString()}</span>
          )}
        </div>
      )}

      {settings.footer.enabled && (
        <div
          className="absolute z-20 flex items-center justify-between pointer-events-none"
          style={{ bottom: inset, left: inset, right: inset }}
        >
          {settings.footer.customText ? (
            <span className="text-[0.45em] opacity-15">{settings.footer.customText}</span>
          ) : <span />}
          {settings.footer.showPageNumbers && (
            <span className="text-[0.45em] font-mono opacity-15">{pageNumber} / {totalPages}</span>
          )}
        </div>
      )}
    </>
  );
}

// ── Main Component ──────────────────────────────────────────

export function EditorWorkspace({
  brand,
  slides,
  onClose,
  useSettingsStore,
  templates = DEFAULT_EDITOR_TEMPLATES,
  customizerTitle = 'Presentation',
  onTemplateChange,
  onOpenTemplatePicker,
  editorKey = `editor-${brand.id}`,
  inspectorPanel,
  inspectorLabel = 'Content',
  onAddSlide,
  onDeleteSlide,
  slideSnapshots,
  onPersistSlideSnapshot,
}: EditorWorkspaceProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [layoutId, setLayoutId] = useState('hyperhyve');
  const [presentMode, setPresentMode] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'theme' | 'background' | 'insert' | 'export' | 'remix'>('none');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [perSlideBg, setPerSlideBg] = useState<Record<string, string>>({});
  const [canvasMode, setCanvasMode] = useState<'freeform' | 'scroll'>('freeform');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  // Per-slide undo/redo + persistence — keyed by current slide id and editor instance
  const currentSlideIdForHistory = slides[currentSlide]?.id;

  // Default snapshot persistence: writes through to a shared Zustand store
  // keyed by editorKey so EVERY consumer of EditorWorkspace gets reload
  // persistence automatically. Hosts that want their own store can pass
  // `slideSnapshots` + `onPersistSlideSnapshot` to override.
  const defaultSnapshots = useSlideSnapshotStore((s) => s.snapshots[editorKey]);
  const setDefaultSnapshot = useSlideSnapshotStore((s) => s.set);

  const effectiveSnapshots = slideSnapshots ?? defaultSnapshots;
  const effectivePersist = onPersistSlideSnapshot
    ?? ((slideId: string, html: string) => setDefaultSnapshot(editorKey, slideId, html));

  const { undo, redo, jumpTo } = useHistory({
    editorKey,
    currentSlideId: currentSlideIdForHistory,
    onPersistSnapshot: effectivePersist,
  });

  // Re-inject persisted HTML snapshot after React paints the slide. Keyed
  // by slide id ref so we only run once per slide visit; subsequent edits
  // are tracked through the same MutationObserver and persisted via the
  // effectivePersist callback above.
  const restoredSnapshotRef = useRef<string | null>(null);
  useEffect(() => {
    const slideId = currentSlideIdForHistory;
    if (!slideId || !effectiveSnapshots) return;
    const snapshot = effectiveSnapshots[slideId];
    if (!snapshot) {
      restoredSnapshotRef.current = null;
      return;
    }
    // Avoid re-restoring on every re-render of the same slide
    const restoreKey = `${slideId}::${snapshot.length}`;
    if (restoredSnapshotRef.current === restoreKey) return;

    // Wait for React to mount the slide DOM, then swap in the snapshot.
    const timer = setTimeout(() => {
      const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
      if (!canvas) return;
      canvas.innerHTML = snapshot;
      restoredSnapshotRef.current = restoreKey;
    }, 250);
    return () => clearTimeout(timer);
  }, [currentSlideIdForHistory, effectiveSnapshots]);
  const scrollCooldown = useRef(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const scrollAccum = useRef(0);

  // Use custom or default settings store
  const store = useSettingsStore ? useSettingsStore() : useDefaultSettingsStore();
  const {
    settings,
    setTemplate,
    setSizeFormat,
    setCustomSize,
    setLanguageDirection,
    updateSpacing,
    updateHeader,
    updateFooter,
    resetSettings,
  } = store;

  const layout = getLayoutById(layoutId);
  const totalPages = slides.length;
  const slide = slides[currentSlide];
  const bgOverride = slide ? perSlideBg[slide.id] : undefined;

  // Derive aspect ratio from settings
  const aspectRatio = `${settings.size.width} / ${settings.size.height}`;
  const aspectRatioValue = settings.size.width / settings.size.height;
  const orientation: 'portrait' | 'landscape' | 'square' =
    aspectRatioValue > 1.05 ? 'landscape' : aspectRatioValue < 0.95 ? 'portrait' : 'square';

  useEffect(() => { setLayoutId(settings.template); }, [settings.template]);

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
        else if (showCustomizer) setShowCustomizer(false);
        else if (activePanel !== 'none') setActivePanel('none');
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); setZoom(prev => Math.min(2, prev + 0.1)); }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(prev => Math.max(0.3, prev - 0.1)); }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(calculateFitZoom()); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentSlide, goTo, presentMode, activePanel, showCustomizer]);

  useEffect(() => { containerRef.current?.focus(); }, []);

  const calculateFitZoom = useCallback(() => {
    const customizerW = showCustomizer ? 288 : 0;
    const viewW = window.innerWidth - 60 - 80 - customizerW;
    const viewH = window.innerHeight - 48 - 48 - 80;
    const slideW = 1200;
    const slideH = slideW * (settings.size.height / settings.size.width);
    const fitZoom = Math.min(viewW / slideW, viewH / slideH);
    return Math.max(0.3, Math.min(fitZoom, 1));
  }, [showCustomizer, settings.size.width, settings.size.height]);

  useEffect(() => {
    const timer = setTimeout(() => setZoom(calculateFitZoom()), 50);
    const handleResize = () => setZoom(calculateFitZoom());
    window.addEventListener('resize', handleResize);
    return () => { clearTimeout(timer); window.removeEventListener('resize', handleResize); };
  }, [calculateFitZoom]);

  useEffect(() => {
    const timer = setTimeout(() => setZoom(calculateFitZoom()), 200);
    return () => clearTimeout(timer);
  }, [showCustomizer, calculateFitZoom]);

  // Block browser swipe
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

  // Canvas zoom + slide navigation
  useEffect(() => {
    if (canvasMode !== 'freeform') return;
    const el = canvasRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        setZoom(prev => {
          const next = Math.min(2, Math.max(0.3, prev + delta));
          const fitZoom = calculateFitZoom();
          if (Math.abs(next - fitZoom) < 0.05) return fitZoom;
          if (Math.abs(next - 1) < 0.04) return 1;
          if (Math.abs(next - 0.5) < 0.04) return 0.5;
          return next;
        });
      } else {
        scrollAccum.current += e.deltaY;
        const threshold = 120;
        const dragAmount = Math.max(-1, Math.min(1, scrollAccum.current / threshold));
        setSlideOffset(dragAmount);

        if (Math.abs(scrollAccum.current) > threshold && !scrollCooldown.current) {
          scrollCooldown.current = true;
          const dir = scrollAccum.current > 0 ? 1 : -1;
          scrollAccum.current = 0;
          setCurrentSlide(prev => {
            const next = prev + dir;
            return (next >= 0 && next < slides.length) ? next : prev;
          });
          setActivePanel('none');
          setSlideOffset(dir * 0.3);
          setTimeout(() => setSlideOffset(0), 150);
          setTimeout(() => { scrollCooldown.current = false; }, 500);
        }

        clearTimeout((scrollAccum as any)._resetTimer);
        (scrollAccum as any)._resetTimer = setTimeout(() => {
          scrollAccum.current = 0;
          setSlideOffset(0);
        }, 200);
      }
    };

    const handleTouchMove = (e: TouchEvent) => { if (e.touches.length === 1) e.preventDefault(); };
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => { el.removeEventListener('wheel', handleWheel); el.removeEventListener('touchmove', handleTouchMove); };
  }, [canvasMode, calculateFitZoom, slides.length]);

  const zoomIn = () => setZoom(prev => Math.min(2, prev + 0.1));
  const zoomOut = () => setZoom(prev => Math.max(0.3, prev - 0.1));
  const zoomReset = () => { setZoom(calculateFitZoom()); setPan({ x: 0, y: 0 }); };

  /**
   * Editable PDF export — iterates slides one at a time, runs the
   * DOM-to-vector walker on each, and stitches the IRs into a single
   * multi-page jsPDF document with real text and shape primitives.
   *
   * Mirrors the slide-stepping pattern used by the raster handleExportPDF
   * below: setCurrentSlide(i) → wait for React mount → query the live DOM
   * → walk to IR → next slide. Final stitch via irsToPdf.
   */
  const handleExportEditablePDF = useCallback(async () => {
    toast.loading(`Building editable PDF (${slides.length} slides)...`, { id: 'pdf-edit-export' });

    try {
      const { domToIR } = await import('@/shared/services/export/vectorize/domToIR');
      const { irsToPdf } = await import('@/shared/services/export/vectorize/irToPdf');

      const irs = [];
      const failures: Array<{ index: number; name: string; error: string }> = [];

      for (let i = 0; i < slides.length; i++) {
        const slideName = slides[i]?.name || `Slide ${i + 1}`;
        try {
          setCurrentSlide(i);
          await new Promise((r) => setTimeout(r, 350));

          const liveEl = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
          if (!liveEl) {
            failures.push({ index: i, name: slideName, error: 'slide canvas not found' });
            continue;
          }

          const ir = await domToIR(liveEl);
          irs.push(ir);
        } catch (slideErr) {
          const msg = slideErr instanceof Error ? slideErr.message : String(slideErr);
          console.warn(`[Editable PDF] Slide ${i} (${slideName}) failed:`, slideErr);
          failures.push({ index: i, name: slideName, error: msg });
        }
      }

      if (irs.length === 0) {
        toast.dismiss('pdf-edit-export');
        toast.error('Editable PDF export failed: no slides could be vectorized');
        return;
      }

      const blob = await irsToPdf(irs);
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${slug}-editable.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.dismiss('pdf-edit-export');
      if (failures.length > 0) {
        toast.success(`Exported ${irs.length}/${slides.length} editable slides — ${failures.length} skipped`, { duration: 6000 });
        console.warn('[Editable PDF] Some slides skipped:', failures);
      } else {
        toast.success(`Editable PDF exported (${irs.length} pages)`);
      }
    } catch (err) {
      toast.dismiss('pdf-edit-export');
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Editable PDF export failed: ${msg}`);
      console.error('[Editable PDF] Fatal error:', err);
    }
  }, [brand, slides]);

  const handleExportPDF = useCallback(async () => {
    // Target export dimensions — use settings size, capped to A4 long edge
    const rawW = settings.size.width;
    const rawH = settings.size.height;
    const MAX_DIM = 3508;
    const scaleDown = Math.min(1, MAX_DIM / Math.max(rawW, rawH));
    const exportW = Math.round(rawW * scaleDown);
    const exportH = Math.round(rawH * scaleDown);
    const orientation = exportW >= exportH ? 'landscape' : 'portrait';

    toast.loading(`Exporting ${slides.length} slides...`, { id: 'pdf-export' });

    const failures: Array<{ index: number; name: string; error: string }> = [];
    let pdf: any = null;
    let success = 0;

    try {
      const { default: jsPDF } = await import('jspdf');
      pdf = new jsPDF({ orientation, unit: 'px', format: [exportW, exportH], compress: true });

      for (let i = 0; i < slides.length; i++) {
        const slideName = slides[i]?.name || `Slide ${i + 1}`;
        try {
          // Navigate the live editor to this slide and let React mount it
          setCurrentSlide(i);
          await new Promise((r) => setTimeout(r, 350));

          const liveEl = document.querySelector('[data-slide-canvas]') as HTMLElement | null;
          if (!liveEl) {
            failures.push({ index: i, name: slideName, error: 'slide canvas not found' });
            continue;
          }

          // Use the shared capture utility (handles cloning + image pre-processing)
          const canvas = await captureElementForExport(liveEl, {
            width: exportW,
            height: exportH,
            scale: 2,
            backgroundColor: '#ffffff',
          });

          let dataUrl: string;
          try {
            dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          } catch (taintErr) {
            failures.push({ index: i, name: slideName, error: 'canvas tainted (CORS)' });
            continue;
          }

          if (success > 0) {
            pdf.addPage([exportW, exportH], orientation);
          }
          pdf.addImage(dataUrl, 'JPEG', 0, 0, exportW, exportH);
          success++;
        } catch (slideErr) {
          const msg = slideErr instanceof Error ? slideErr.message : String(slideErr);
          console.warn(`[PDF Export] Slide ${i} (${slideName}) failed:`, slideErr);
          failures.push({ index: i, name: slideName, error: msg });
        }
      }

      toast.dismiss('pdf-export');

      if (success === 0) {
        const detail = failures[0]?.error || 'unknown error';
        toast.error(`PDF export failed: ${detail}`);
        console.error('[PDF Export] All slides failed:', failures);
        return;
      }

      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      pdf.save(`${slug}-presentation.pdf`);

      if (failures.length > 0) {
        toast.success(`Exported ${success}/${slides.length} slides — ${failures.length} skipped`, {
          duration: 6000,
        });
        console.warn('[PDF Export] Some slides skipped:', failures);
      } else {
        toast.success(`PDF exported (${success} pages)`);
      }
    } catch (err) {
      toast.dismiss('pdf-export');
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`PDF export failed: ${msg}`);
      console.error('[PDF Export] Fatal error:', err);
    }
  }, [brand, slides, settings.size]);

  // ── Render a slide with optional chrome overlay (NO content padding) ──
  const renderSlide = useCallback((
    slideData: SlideData,
    pageNumber: number,
    opts?: { isExportTarget?: boolean; onClick?: () => void }
  ) => {
    const slideBg = perSlideBg[slideData.id];

    return (
      <div
        data-slide-canvas={opts?.isExportTarget ? '' : undefined}
        className="w-full h-full overflow-hidden shadow-2xl ring-1 ring-white/[0.08] relative"
        style={{
          // Frame is always a clean rectangle — corner radius applies INSIDE the design
          backgroundColor: slideBg || undefined,
          direction: settings.language.direction,
          // Container queries — slide is the size container so everything scales with it
          containerType: 'inline-size',
          // Base font-size: 1% of the smaller dimension so it adapts to portrait/landscape
          fontSize: 'min(1.2cqi, 1.2cqb)',
        }}
        onClick={opts?.onClick}
      >
        {/* Slide content — fills container, scales via cqi/cqb units */}
        <div className="absolute inset-0">
          <EditableSlide>
            {slideData.render({ brand, layout, pageNumber, totalPages, orientation, aspectRatioValue, settings })}
          </EditableSlide>
        </div>

        {/* Chrome overlays — float on top, never displace content */}
        <SlideChrome
          settings={settings}
          brandName={brand.name}
          pageNumber={pageNumber}
          totalPages={totalPages}
        />
      </div>
    );
  }, [settings, perSlideBg, brand, layout, totalPages]);

  // ─── Presentation Mode ─────────────────────────────────────
  if (presentMode) {
    return (
      <div ref={containerRef} className="fixed inset-0 z-50 bg-black flex flex-col outline-none" tabIndex={0}>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-[85vw]" style={{ maxHeight: '85vh' }}>
            <div style={{ aspectRatio, maxWidth: '100%', maxHeight: '100%', margin: '0 auto' }}>
              {renderSlide(slide, currentSlide + 1, { isExportTarget: true })}
            </div>
          </div>
        </div>
        <div className="h-11 flex items-center justify-center gap-6 bg-black/90 border-t border-white/5">
          <button onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0} className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-white/40 text-xs font-mono min-w-[60px] text-center">{currentSlide + 1} / {totalPages}</span>
          <button onClick={() => goTo(currentSlide + 1)} disabled={currentSlide >= totalPages - 1} className="text-white/40 hover:text-white disabled:opacity-20 transition-colors"><ChevronRight className="h-4 w-4" /></button>
          <button onClick={() => setPresentMode(false)} className="ml-6 text-white/20 text-xs hover:text-white/60 transition-colors">ESC to exit</button>
        </div>
      </div>
    );
  }

  // ─── Editor Mode ───────────────────────────────────────────
  return (
    <EditorContext.Provider value={{ brand }}>
    <div ref={containerRef} className="fixed inset-0 z-40 bg-[#141414] flex flex-col outline-none" tabIndex={0}>
      {/* Top Bar */}
      <div className="h-11 bg-[#141414] border-b border-white/[0.04] flex items-center justify-between px-3 shrink-0 z-10">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          <div className="flex items-center gap-2 bg-white/[0.05] rounded-lg px-3 py-1.5">
            {brand.logo && <img src={brand.logo} alt="" className="h-3.5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />}
            <span className="text-white/70 text-[13px] font-medium">{brand.name}</span>
            <span className="text-white/15 text-[13px]">/</span>
            <span className="text-white/40 text-[13px]">Slide {currentSlide + 1} of {totalPages}</span>
          </div>
          <span className="text-[9px] text-white/20 bg-white/[0.04] px-2 py-0.5 rounded-full hidden sm:inline">
            {settings.size.format}
          </span>
        </div>

        <span className="text-white/30 text-xs hidden md:block">{slide?.name || ''}</span>

        <div className="flex items-center gap-1">
          {/* Undo / Redo / History */}
          <button
            onClick={undo}
            title="Undo (⌘Z / Ctrl+Z)"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={redo}
            title="Redo (⌘⇧Z / Ctrl+Y)"
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowHistory(prev => !prev)}
            title="Version history"
            className={`p-1.5 rounded-lg transition-colors ${
              showHistory ? 'text-white bg-white/10' : 'text-white/40 hover:text-white hover:bg-white/10'
            }`}
          >
            <History className="h-4 w-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />

          {onAddSlide && (
            <button
              onClick={onAddSlide}
              title="Add a new slide"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Slide</span>
            </button>
          )}
          {onOpenTemplatePicker && (
            <button
              onClick={onOpenTemplatePicker}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Templates</span>
            </button>
          )}
          {inspectorPanel && (
            <button
              onClick={() => { setShowInspector(prev => !prev); if (!showInspector) setShowCustomizer(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showInspector ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{inspectorLabel}</span>
            </button>
          )}
          <button
            onClick={() => { setShowCustomizer(prev => !prev); if (!showCustomizer) setShowInspector(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              showCustomizer ? 'text-white bg-white/10' : 'text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Customize</span>
          </button>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }} className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors hidden sm:block">Share</button>
          <button onClick={() => togglePanel('export')} className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">Export</button>
          <button onClick={() => setPresentMode(true)} className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">Present</button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        <SlideNav slides={slides} currentSlide={currentSlide} onSelect={goTo} brand={brand} layout={layout} onDeleteSlide={onDeleteSlide} />

        {canvasMode === 'freeform' ? (
          <div ref={canvasRef} className="flex-1 flex flex-col items-center overflow-hidden relative min-h-0">
            <div className="flex justify-center py-2 shrink-0 w-full">
              <div className="inline-flex items-center gap-0.5 bg-[#1e1e1e] rounded-full px-1 py-0.5 border border-white/[0.06]">
                <button onClick={() => setCanvasMode('freeform')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'freeform' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Slide</button>
                <button onClick={() => setCanvasMode('scroll')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'scroll' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Scroll</button>
              </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center min-h-0" style={{ padding: '8px 40px 8px 48px' }}>
              <div className="absolute bottom-5 right-12 z-10 flex items-center gap-0.5 bg-[#1e1e1e]/80 rounded-lg px-0.5 py-0.5 border border-white/[0.06]">
                <button onClick={zoomOut} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">−</button>
                <button onClick={zoomReset} className="px-1.5 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-mono">{Math.round(zoom * 100)}%</button>
                <button onClick={zoomIn} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">+</button>
              </div>

              <div key={currentSlide} className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in-[0.97] duration-300">
                <div className="w-full h-full flex items-center justify-center" style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}>
                  <div style={{ width: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio }}>
                    {renderSlide(slide, currentSlide + 1, { isExportTarget: true })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div ref={canvasRef} className="flex-1 flex flex-col overflow-hidden relative min-h-0">
            <div className="flex justify-center py-2 shrink-0 w-full">
              <div className="inline-flex items-center gap-0.5 bg-[#1e1e1e] rounded-full px-1 py-0.5 border border-white/[0.06]">
                <button onClick={() => setCanvasMode('freeform')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'freeform' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Slide</button>
                <button onClick={() => setCanvasMode('scroll')} className={`px-4 py-1 rounded-full text-[11px] font-medium transition-colors ${canvasMode === 'scroll' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>Scroll</button>
              </div>
            </div>

            <div className="flex-1 min-h-0 snap-y snap-mandatory" style={{ overflowY: 'auto', overflowX: 'hidden', scrollBehavior: 'smooth' }}>
              {slides.map((s, i) => (
                <div key={s.id} className="snap-center flex items-center justify-center" style={{ minHeight: '100%', padding: '12px 40px 12px 48px' }}>
                  <div className="w-full h-full flex items-center justify-center" style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out' }}>
                    <div style={{ width: '100%', maxWidth: '100%', maxHeight: '100%', aspectRatio }}>
                      {renderSlide(s, i + 1, { isExportTarget: i === currentSlide, onClick: () => setCurrentSlide(i) })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="absolute bottom-3 right-8 z-10 flex items-center gap-0.5 bg-[#1e1e1e]/80 rounded-lg px-0.5 py-0.5 border border-white/[0.06]">
              <button onClick={zoomOut} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">−</button>
              <button onClick={zoomReset} className="px-1.5 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-[10px] font-mono">{Math.round(zoom * 100)}%</button>
              <button onClick={zoomIn} className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-colors text-xs">+</button>
            </div>
          </div>
        )}

        {/* Customizer Sidebar */}
        {showCustomizer && (
          <div className="w-72 border-l border-white/[0.06] bg-[#141414] shrink-0 animate-in slide-in-from-right duration-200">
            <PresentationCustomizer
              settings={settings}
              templates={templates}
              onSetTemplate={(id) => {
                setTemplate(id);
                setLayoutId(id);
                // Sync spacing settings to the new style's defaults if it's a presentation style
                const presStyle = getStyleById(id);
                if (presStyle && presStyle.id === id) {
                  updateSpacing(getStyleSpacingDefaults(presStyle));
                }
                onTemplateChange?.(id);
                setCurrentSlide(0);
              }}
              onSetSizeFormat={setSizeFormat}
              onSetCustomSize={setCustomSize}
              onSetLanguageDirection={setLanguageDirection}
              onUpdateSpacing={updateSpacing}
              onUpdateHeader={updateHeader}
              onUpdateFooter={updateFooter}
              onReset={resetSettings}
              title={customizerTitle}
            />
          </div>
        )}

        {/* History Panel */}
        {showHistory && currentSlideIdForHistory && (
          <HistoryPanel
            editorKey={editorKey}
            slideId={currentSlideIdForHistory}
            onJumpTo={jumpTo}
            onClose={() => setShowHistory(false)}
          />
        )}

        {/* Inspector Panel — context-aware content editor */}
        {showInspector && inspectorPanel && (
          <div className="w-80 border-l border-white/[0.06] bg-[#141414] shrink-0 animate-in slide-in-from-right duration-200 flex flex-col">
            {inspectorPanel(currentSlideIdForHistory, () => setShowInspector(false))}
          </div>
        )}
      </div>

      {/* Panels above bottom bar */}
      <div className="relative shrink-0">
        {activePanel === 'theme' && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-30">
            <ThemeDrawer layoutId={layoutId} onChangeLayout={(id) => { setLayoutId(id); setTemplate(id); }} onClose={() => setActivePanel('none')} />
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
        <EditorBottomBar activePanel={activePanel} onTogglePanel={togglePanel} />
      </div>

      {activePanel === 'export' && (
        <ExportModal brand={brand} slides={slides} layout={layout} onClose={() => setActivePanel('none')} onExportPDF={handleExportPDF} onExportEditablePDF={handleExportEditablePDF} />
      )}
    </div>
    </EditorContext.Provider>
  );
}
