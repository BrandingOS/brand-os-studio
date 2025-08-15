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
  const [userZoom, setUserZoom] = React.useState(1);
  const [previewMode, setPreviewMode] = React.useState(false);

  const baseW = settings.size.width;
  const baseH = settings.size.height;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // measure available space
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [containerHeight, setContainerHeight] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });
    ro.observe(el);
    // initial
    setContainerWidth(el.clientWidth);
    setContainerHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  // scale to fit both dimensions, then apply userZoom
  const fitScale = React.useMemo(() => {
    if (!containerWidth || !containerHeight) return 1;
    const scaleW = containerWidth / baseW;
    const scaleH = containerHeight / baseH;
    return clamp(Math.min(scaleW, scaleH), 0.05, 10);
  }, [containerWidth, containerHeight, baseW, baseH]);

  const scale = fitScale * userZoom;

  const canvasStyle: React.CSSProperties = {
    width: `${baseW}px`,
    height: `${baseH}px`,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
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

  const TemplateComponent = getTemplateComponent(settings.template);

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
          <Button variant="ghost" size="sm" onClick={() => setUserZoom(prev => clamp(prev - 0.1, 0.05, 10))}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button variant="ghost" size="sm" onClick={() => setUserZoom(prev => clamp(prev + 0.1, 0.05, 10))}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setUserZoom(1)}>
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

      {/* Canvas container: fill and center */}
      <div ref={containerRef} className="flex-1 relative bg-muted/10">
        <div className="absolute inset-0 overflow-auto p-6">
          <div style={canvasStyle} className="bg-white shadow-lg border border-border/20">
            <TemplateComponent
              brand={brand}
              settings={settings}
              slideContent={currentSlide.content}
              slideType={currentSlide.type}
            />
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
          <span>Slide {currentSlide.content?.pageNumber || 1} of {brand.guidelines ? 10 : 1}</span>
          <span>Last saved: Just now</span>
        </div>
      </div>
    </div>
  );
};
