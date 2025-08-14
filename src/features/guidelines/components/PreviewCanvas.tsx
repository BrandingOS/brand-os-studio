import React from 'react';
import { useGuidelinesStore } from '../store/guidelinesStore';
import { getTemplateComponent } from '../templates/template-registry';
import type { GuidelineSlide } from '../types/guidelines';
import type { Brand } from '@/shared/types/brand';
import { Button } from '@/shared/ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye } from 'lucide-react';

interface PreviewCanvasProps {
  brand: Brand;
  currentSlide?: GuidelineSlide;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  brand,
  currentSlide,
}) => {
  const { settings } = useGuidelinesStore();

  // user-controlled zoom multiplier (1 = 100%)
  const [userZoom, setUserZoom] = React.useState(1);

  // auto scale computed from available center width
  const [autoScale, setAutoScale] = React.useState(1);

  // preview toggle (unchanged)
  const [previewMode, setPreviewMode] = React.useState(false);

  const TemplateComponent = getTemplateComponent(settings.template);

  // Refs
  const stageRef = React.useRef<HTMLDivElement | null>(null);

  // Helpers
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // --- Zoom handlers (user-controlled multiplier) ---
  const handleZoomIn = () => setUserZoom(prev => clamp(prev + 0.1, 0.25, 4));
  const handleZoomOut = () => setUserZoom(prev => clamp(prev - 0.1, 0.25, 4));
  const handleResetZoom = () => setUserZoom(1);

  // --- Auto width-fit scaling with ResizeObserver ---
  React.useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const compute = (width: number, height: number) => {
      // Fit by WIDTH only (your requirement)
      const baseW = settings.size.width;
      const baseH = settings.size.height;

      if (baseW <= 0 || baseH <= 0) {
        setAutoScale(1);
        return;
      }

      // keep some padding the same as your editor content padding (p-8 = 2rem)
      const horizontalPadding = 0; // container already has p-8; we measure inner wrapper width
      const availableW = Math.max(0, width - horizontalPadding * 2);

      const scaleW = availableW / baseW;

      // don't allow negative/NaN
      const next = Number.isFinite(scaleW) ? clamp(scaleW, 0.05, 10) : 1;
      setAutoScale(next);
    };

    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      const cw =
        // Safari has contentBoxSize as a single object, Chromium as an array
        (Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]?.inlineSize
          : (entry.contentBoxSize as any)?.inlineSize) ??
        entry.contentRect.width;

      const ch =
        (Array.isArray(entry.contentBoxSize)
          ? entry.contentBoxSize[0]?.blockSize
          : (entry.contentBoxSize as any)?.blockSize) ??
        entry.contentRect.height;

      compute(cw, ch);
    });

    ro.observe(el);

    // Initial compute in case observer batches
    compute(el.clientWidth, el.clientHeight);

    return () => ro.disconnect();
  }, [settings.size.width, settings.size.height]);

  // Final scale used in the editor view
  const editorScale = autoScale * userZoom;

  // Styles:
  // Keep the inner slide at native size; scale it via transform.
  const nativeCanvasStyle: React.CSSProperties = {
    width: `${settings.size.width}px`,
    height: `${settings.size.height}px`,
    transform: `scale(${editorScale})`,
    transformOrigin: 'top left', // stable pointer math
    willChange: 'transform',
    // helps isolate layout/paint and avoid jitter while scaling
    contain: 'layout paint size',
  };

  // The footprint wrapper reports the scaled size to layout so centering works.
  const footprintStyle: React.CSSProperties = {
    width: `${settings.size.width * editorScale}px`,
    height: `${settings.size.height * editorScale}px`,
  };

  if (!currentSlide) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">No slide selected</h3>
          <p className="text-muted-foreground">Select a slide from the navigator to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{currentSlide.title}</span>
          <span className="text-xs text-muted-foreground">
            {settings.size.format} • {settings.size.width}×{settings.size.height}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>

          <span className="text-sm min-w-16 text-center">
            {Math.round(editorScale * 100)}%
          </span>

          <Button variant="ghost" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleResetZoom}>
            <RotateCcw className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border mx-2" />

          <Button
            variant={previewMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas / Stage */}
      {/* The stage is the area between your left/right panels. We observe it for width changes. */}
      <div ref={stageRef} className="flex-1 overflow-auto bg-muted/10 p-8">
        <div className="flex justify-center">
          <div style={footprintStyle}>
            <div
              className="bg-white shadow-lg border border-border/20 overflow-hidden"
              style={nativeCanvasStyle}
            >
              {/* IMPORTANT: This child renders at native pixels; export should capture THIS node, not the footprint */}
              <TemplateComponent
                brand={brand}
                settings={settings}
                slideContent={currentSlide.content}
                slideType={currentSlide.type}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Template: {settings.template}</span>
          <span>Language: {settings.language.direction.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Slide {(currentSlide.content?.pageNumber || 1)} of {brand.guidelines ? 10 : 1}</span>
          <span>Last saved: Just now</span>
        </div>
      </div>
    </div>
  );
};
