/**
 * EditorWorkspace — Chronicle-inspired slide editor.
 * Dark canvas workspace with centered slide, top bar, bottom bar,
 * and left-side slide navigator.
 */
import { useState, useCallback } from 'react';
import { Download, Maximize2, Minimize2, ChevronLeft, ChevronRight, Share2, MoreHorizontal } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from '../pages/templates/layout-config';
import { TEMPLATE_LAYOUTS, getLayoutById } from '../pages/templates/layout-config';
import { EditorBottomBar } from './EditorBottomBar';
import { EditorTopBar } from './EditorTopBar';
import { SlideNav } from './SlideNav';
import { ThemeDrawer } from './ThemeDrawer';
import { BackgroundPopover } from './BackgroundPopover';
import { InsertMenu } from './InsertMenu';
import { ExportModal } from './ExportModal';
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
  bgImage?: string;
  render: (props: { brand: Brand; layout: TemplateLayout; pageNumber: number; totalPages: number }) => React.ReactNode;
}

export function EditorWorkspace({ brand, slides, onClose }: EditorWorkspaceProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [layoutId, setLayoutId] = useState('hyperhyve');
  const [presentMode, setPresentMode] = useState(false);
  const [activePanel, setActivePanel] = useState<'none' | 'theme' | 'background' | 'insert' | 'export'>('none');
  const [perSlideBg, setPerSlideBg] = useState<Record<string, string>>({});

  const layout = getLayoutById(layoutId);
  const totalPages = slides.length;
  const slide = slides[currentSlide];

  const bgForCurrentSlide = perSlideBg[slide?.id] || slide?.bgColor;

  const goTo = (idx: number) => {
    if (idx >= 0 && idx < totalPages) setCurrentSlide(idx);
  };

  const togglePanel = (panel: typeof activePanel) => {
    setActivePanel(prev => prev === panel ? 'none' : panel);
  };

  const handleSetBackground = (color: string) => {
    if (slide) {
      setPerSlideBg(prev => ({ ...prev, [slide.id]: color }));
    }
  };

  // ─── Presentation Mode ─────────────────────────────────────
  if (presentMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col" onKeyDown={e => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goTo(currentSlide + 1);
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goTo(currentSlide - 1);
        if (e.key === 'Escape') setPresentMode(false);
      }} tabIndex={0}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-6xl">
            {slide?.render({ brand, layout, pageNumber: currentSlide + 1, totalPages })}
          </div>
        </div>
        <div className="h-12 flex items-center justify-center gap-6 bg-black/80">
          <button onClick={() => goTo(currentSlide - 1)} disabled={currentSlide === 0} className="text-white/40 hover:text-white disabled:opacity-20"><ChevronLeft className="h-5 w-5" /></button>
          <span className="text-white/50 text-sm font-mono">{currentSlide + 1} / {totalPages}</span>
          <button onClick={() => goTo(currentSlide + 1)} disabled={currentSlide >= totalPages - 1} className="text-white/40 hover:text-white disabled:opacity-20"><ChevronRight className="h-5 w-5" /></button>
          <button onClick={() => setPresentMode(false)} className="ml-8 text-white/30 text-xs hover:text-white">Exit</button>
        </div>
      </div>
    );
  }

  // ─── Editor Mode ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-40 bg-[#1a1a1a] flex flex-col">
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

        {/* Canvas Area — centered slide */}
        <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
          <div className="w-full max-w-5xl" style={bgForCurrentSlide ? { filter: 'none' } : undefined}>
            <div className="rounded-lg overflow-hidden shadow-2xl ring-1 ring-white/10">
              {slide?.render({ brand, layout, pageNumber: currentSlide + 1, totalPages })}
            </div>
          </div>
        </div>

        {/* Theme Drawer (left panel) */}
        {activePanel === 'theme' && (
          <ThemeDrawer
            layoutId={layoutId}
            onChangeLayout={setLayoutId}
            onClose={() => setActivePanel('none')}
          />
        )}

        {/* Background Popover */}
        {activePanel === 'background' && (
          <BackgroundPopover
            brand={brand}
            currentBg={bgForCurrentSlide}
            onChangeBg={handleSetBackground}
            onClose={() => setActivePanel('none')}
          />
        )}

        {/* Insert Menu */}
        {activePanel === 'insert' && (
          <InsertMenu onClose={() => setActivePanel('none')} />
        )}
      </div>

      {/* Bottom Bar */}
      <EditorBottomBar
        activePanel={activePanel}
        onTogglePanel={togglePanel}
      />

      {/* Export Modal */}
      {activePanel === 'export' && (
        <ExportModal
          brand={brand}
          slides={slides}
          layout={layout}
          onClose={() => setActivePanel('none')}
        />
      )}
    </div>
  );
}
