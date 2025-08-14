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
  /** measured center-column content width (px) passed from GuidelinesEditor) */
  availableWidth?: number;
  /** optional: center column height (px) if you later want to constrain by height */
  availableHeight?: number;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  brand,
  currentSlide,
  availableWidth,
}) => {
  const { settings } = useGuidelinesStore();

  // user zoom MULTIPLIER (1 = 100%)
  const [userZoom, setUserZoom] = React.useState(1);
  const [previewMode, setPreviewMode] = React.useState(false);

  const TemplateComponent = getTemplateComponent(settings.template);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const handleZoomIn = () => setUserZoom(prev => clamp(prev + 0.1, 0.25, 4));
  const handleZoomOut = () => setUserZoom(prev => clamp(prev - 0.1, 0.25, 4));
  const handleResetZoom = () => setUserZoom(1);

  // --- Auto scale to AVAILABLE WIDTH (keep native pixels for export) ---
  const baseW = settings.size.width;
  const baseH = settings.size.height;

  const autoScale = React.useMemo(() => {
    if (!availableWidth || availableWidth <= 0 || !baseW) return 1;
    return clamp(availableWidth / baseW, 0.05, 10);
  }, [availableWidth, baseW]);

  const editorScale = autoScale * userZoom;

  // Native slide node stays at baseW x baseH; only transform is scaled.
  const nativeCanvasStyle: React.CSSProperties = {
    width: `${baseW}px`,
    height: `${baseH}px`,
    transform: `scale(${editorScale})`,
    transformOrigin: 'top left',
    willChange: 'transform',
    contain: 'layout paint size',
  };

  // The footprint accounts for scaled size so flex centering works.
  const footprintStyle: React.CSSProperties = {
    width: `${baseW * editorScale}px`,
    height: `${baseH * editorScale}px`,
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
            {settings.size.format} • {baseW}×{baseH}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="w-4 h-4" />
          </Button>

          <span className="text-sm min-w-16 text-center">{Math.round(editorScale * 100)}%</span>

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
      {/* p-8 gives 32px padding each side; GuidelinesEditor already subtracted it when passing availableWidth */}
      <div className="flex-1 overflow-auto bg-muted/10 p-8">
        <div className="flex justify-center">
          <div style={footprintStyle}>
            <div
              id="editor-slide-native" // <-- capture THIS for export to keep exact pixels
              className="bg-white shadow-lg border border-border/20 overflow-hidden"
              style={nativeCanvasStyle}
            >
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
