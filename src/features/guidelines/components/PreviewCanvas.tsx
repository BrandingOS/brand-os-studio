import React, { useRef, useEffect, useState } from 'react';
import { useGuidelinesStore } from '../store/guidelinesStore';
import { getTemplateComponent } from '../templates/template-registry';
import type { GuidelineSlide } from '../types/guidelines';
import type { Brand } from '@/shared/types/brand';
import { Button } from '@/shared/ui/Button';
import { Download, Eye } from 'lucide-react';

interface PreviewCanvasProps {
  brand: Brand;
  currentSlide?: GuidelineSlide;
}

export const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  brand,
  currentSlide,
}) => {
  const { settings } = useGuidelinesStore();
  const [previewMode, setPreviewMode] = useState(false);
  const [editorScale, setEditorScale] = useState(1);
  const stageContainerRef = useRef<HTMLDivElement>(null);

  const TemplateComponent = getTemplateComponent(settings.template);
  const baseWidth = settings.size.width;
  const baseHeight = settings.size.height;

  // Calculate editor scale based on available width
  const calculateScale = () => {
    if (!stageContainerRef.current) return 1;
    
    const stagePadding = 32; // 2rem padding on each side
    const availableWidth = stageContainerRef.current.clientWidth - (stagePadding * 2);
    const scale = availableWidth / baseWidth;
    
    return Math.max(scale, 0.1); // Prevent extreme scaling
  };

  // Update scale on resize
  useEffect(() => {
    const updateScale = () => {
      const newScale = calculateScale();
      setEditorScale(newScale);
    };

    updateScale();

    const resizeObserver = new ResizeObserver(updateScale);
    if (stageContainerRef.current) {
      resizeObserver.observe(stageContainerRef.current);
    }

    return () => {
      if (stageContainerRef.current) {
        resizeObserver.unobserve(stageContainerRef.current);
      }
    };
  }, [baseWidth]);

  const scaledWidth = baseWidth * editorScale;
  const scaledHeight = baseHeight * editorScale;

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
          <span className="text-sm min-w-16 text-center">
            {Math.round(editorScale * 100)}%
          </span>
          
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
          <div 
            style={{ 
              width: `${scaledWidth}px`, 
              height: `${scaledHeight}px`,
              contain: 'layout paint size'
            }}
          >
            <div 
              className="bg-white shadow-lg border border-border/20 overflow-hidden"
              style={{
                width: `${baseWidth}px`,
                height: `${baseHeight}px`,
                transform: `scale(${editorScale})`,
                transformOrigin: 'top left',
                willChange: 'transform'
              }}
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