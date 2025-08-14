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
  const [zoom, setZoom] = React.useState(1);
  const [previewMode, setPreviewMode] = React.useState(false);

  const TemplateComponent = getTemplateComponent(settings.template);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const canvasStyle = {
    width: `${settings.size.width}px`,
    height: `${settings.size.height}px`,
    transform: `scale(${zoom})`,
    transformOrigin: 'center top',
  };

  const containerStyle = {
    width: `${settings.size.width * zoom}px`,
    height: `${settings.size.height * zoom}px`,
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
            {Math.round(zoom * 100)}%
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

      {/* Canvas */}
      <div className="flex-1 overflow-auto bg-muted/10 p-8">
        <div className="flex justify-center">
          <div style={containerStyle}>
            <div 
              className="bg-white shadow-lg border border-border/20 overflow-hidden"
              style={canvasStyle}
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