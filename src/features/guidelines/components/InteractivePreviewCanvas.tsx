import React, { useState, useRef, useCallback } from 'react';
import { useGuidelinesStore } from '../store/guidelinesStore';
import { getTemplateComponent } from '../templates/template-registry';
import type { GuidelineSlide } from '../types/guidelines';
import type { Brand } from '@/shared/types/brand';
import { Button } from '@/components/ui/button';
import { InlineEditableText } from './InlineEditableText';
import { ColorPickerPopover } from './ColorPickerPopover';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, Edit3, Palette, Type } from 'lucide-react';
import { toast } from 'sonner';

interface InteractivePreviewCanvasProps {
  brand: Brand;
  currentSlide?: GuidelineSlide;
  previewMode: boolean;
  onPreviewModeChange: (mode: boolean) => void;
  editingElement: string | null;
  onEditingElementChange: (element: string | null) => void;
  onContentUpdate: (slideId: string, field: string, value: any) => void;
}

export const InteractivePreviewCanvas: React.FC<InteractivePreviewCanvasProps> = ({
  brand,
  currentSlide,
  previewMode,
  onPreviewModeChange,
  editingElement,
  onEditingElementChange,
  onContentUpdate,
}) => {
  const { settings } = useGuidelinesStore();
  const [userZoom, setUserZoom] = useState(1);
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  // Measure available space
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerWidth(width);
      setContainerHeight(height);
    });
    
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    setContainerHeight(el.clientHeight);
    
    return () => ro.disconnect();
  }, []);

  const baseW = settings.size.width;
  const baseH = settings.size.height;
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // Calculate scale
  const fitScale = React.useMemo(() => {
    if (!containerWidth || !containerHeight) return 1;
    const scaleW = (containerWidth - 100) / 1200; // Account for padding
    const scaleH = (containerHeight - 100) / 1000;
    return clamp(Math.min(scaleW, scaleH), 0.1, 3);
  }, [containerWidth, containerHeight]);

  const scale = fitScale * userZoom;

  const handleTextEdit = useCallback((field: string, value: string) => {
    if (!currentSlide) return;
    onContentUpdate(currentSlide.id, field, value);
    toast.success('Content updated');
  }, [currentSlide, onContentUpdate]);

  const handleColorChange = useCallback((field: string, color: string) => {
    if (!currentSlide) return;
    onContentUpdate(currentSlide.id, field, color);
    toast.success('Color updated');
  }, [currentSlide, onContentUpdate]);

  const renderEditableContent = () => {
    if (!currentSlide) return null;

    const isEditable = !previewMode;
    const content = currentSlide.content || {};

    switch (currentSlide.type) {
      case 'cover':
        return (
          <div className="relative w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex flex-col justify-center items-center p-16">
            {/* Brand Logo */}
            {brand.logo && (
              <div 
                className={`mb-8 transition-all duration-200 ${hoveredElement === 'logo' ? 'ring-2 ring-primary/50 ring-offset-2' : ''}`}
                onMouseEnter={() => setHoveredElement('logo')}
                onMouseLeave={() => setHoveredElement(null)}
              >
                <img src={brand.logo} alt="Brand Logo" className="h-20 w-auto" />
              </div>
            )}

            {/* Title */}
            <InlineEditableText
              value={content.title || brand.name || 'Your Brand'}
              onChange={(value) => handleTextEdit('title', value)}
              className="text-6xl font-bold text-center mb-6 text-foreground"
              placeholder="Brand Name"
              editable={isEditable}
              elementId="title"
              hoveredElement={hoveredElement}
              setHoveredElement={setHoveredElement}
            />

            {/* Subtitle */}
            <InlineEditableText
              value={content.subtitle || 'Brand Guidelines'}
              onChange={(value) => handleTextEdit('subtitle', value)}
              className="text-2xl text-center mb-8 text-muted-foreground"
              placeholder="Subtitle"
              editable={isEditable}
              elementId="subtitle"
              hoveredElement={hoveredElement}
              setHoveredElement={setHoveredElement}
            />

            {/* Description */}
            <InlineEditableText
              value={content.description || 'Professional brand guidelines'}
              onChange={(value) => handleTextEdit('description', value)}
              className="text-lg text-center max-w-2xl leading-relaxed text-muted-foreground"
              placeholder="Brand description"
              editable={isEditable}
              elementId="description"
              hoveredElement={hoveredElement}
              setHoveredElement={setHoveredElement}
              multiline
            />
          </div>
        );

      case 'colors':
        return (
          <div className="w-full h-full p-16">
            <h2 className="text-4xl font-bold mb-12 text-center">Color Palette</h2>
            <div className="grid grid-cols-3 gap-8 max-w-4xl mx-auto">
              {/* Primary Color */}
              <div className="text-center">
                <div 
                  className={`relative group cursor-pointer transition-all duration-200 ${hoveredElement === 'primary-color' ? 'scale-105 shadow-lg' : ''}`}
                  onMouseEnter={() => setHoveredElement('primary-color')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <div
                    className="w-full h-32 rounded-lg border-4 border-white shadow-lg mb-4"
                    style={{ backgroundColor: content.primary || brand.primaryColor || '#000000' }}
                  />
                  {isEditable && hoveredElement === 'primary-color' && (
                    <ColorPickerPopover
                      color={content.primary || brand.primaryColor || '#000000'}
                      onChange={(color) => handleColorChange('primary', color)}
                      className="absolute top-2 right-2"
                    />
                  )}
                </div>
                <h3 className="font-semibold text-lg">Primary</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {content.primary || brand.primaryColor || '#000000'}
                </p>
              </div>

              {/* Secondary Color */}
              <div className="text-center">
                <div 
                  className={`relative group cursor-pointer transition-all duration-200 ${hoveredElement === 'secondary-color' ? 'scale-105 shadow-lg' : ''}`}
                  onMouseEnter={() => setHoveredElement('secondary-color')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <div
                    className="w-full h-32 rounded-lg border-4 border-white shadow-lg mb-4"
                    style={{ backgroundColor: content.secondary || brand.secondaryColor || '#666666' }}
                  />
                  {isEditable && hoveredElement === 'secondary-color' && (
                    <ColorPickerPopover
                      color={content.secondary || brand.secondaryColor || '#666666'}
                      onChange={(color) => handleColorChange('secondary', color)}
                      className="absolute top-2 right-2"
                    />
                  )}
                </div>
                <h3 className="font-semibold text-lg">Secondary</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {content.secondary || brand.secondaryColor || '#666666'}
                </p>
              </div>

              {/* Accent Color */}
              <div className="text-center">
                <div 
                  className={`relative group cursor-pointer transition-all duration-200 ${hoveredElement === 'accent-color' ? 'scale-105 shadow-lg' : ''}`}
                  onMouseEnter={() => setHoveredElement('accent-color')}
                  onMouseLeave={() => setHoveredElement(null)}
                >
                  <div
                    className="w-full h-32 rounded-lg border-4 border-white shadow-lg mb-4"
                    style={{ backgroundColor: content.accent || brand.secondaryColor || '#007bff' }}
                  />
                  {isEditable && hoveredElement === 'accent-color' && (
                    <ColorPickerPopover
                      color={content.accent || brand.secondaryColor || '#007bff'}
                      onChange={(color) => handleColorChange('accent', color)}
                      className="absolute top-2 right-2"
                    />
                  )}
                </div>
                <h3 className="font-semibold text-lg">Accent</h3>
                <p className="text-sm text-muted-foreground font-mono">
                  {content.accent || brand.secondaryColor || '#007bff'}
                </p>
              </div>
            </div>
          </div>
        );

      case 'typography':
        return (
          <div className="w-full h-full p-16">
            <h2 className="text-4xl font-bold mb-12 text-center">Typography</h2>
            <div className="space-y-12 max-w-4xl mx-auto">
              {/* Primary Font */}
              <div className="border-b border-border pb-8">
                <div className="flex items-center justify-between mb-6">
                  <InlineEditableText
                    value={content.primaryFont || brand.fonts?.primary || 'Inter'}
                    onChange={(value) => handleTextEdit('primaryFont', value)}
                    className="text-2xl font-semibold"
                    placeholder="Primary Font"
                    editable={isEditable}
                    elementId="primary-font"
                    hoveredElement={hoveredElement}
                    setHoveredElement={setHoveredElement}
                  />
                  <span className="text-sm text-muted-foreground">Headings</span>
                </div>
                <div className="space-y-2">
                  <div className="text-4xl font-bold" style={{ fontFamily: content.primaryFont || 'Inter' }}>
                    The quick brown fox
                  </div>
                  <div className="text-2xl font-semibold" style={{ fontFamily: content.primaryFont || 'Inter' }}>
                    jumps over the lazy dog
                  </div>
                </div>
              </div>

              {/* Body Font */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <InlineEditableText
                    value={content.bodyFont || brand.fonts?.secondary || brand.fonts?.primary || 'Inter'}
                    onChange={(value) => handleTextEdit('bodyFont', value)}
                    className="text-2xl font-semibold"
                    placeholder="Body Font"
                    editable={isEditable}
                    elementId="body-font"
                    hoveredElement={hoveredElement}
                    setHoveredElement={setHoveredElement}
                  />
                  <span className="text-sm text-muted-foreground">Body Text</span>
                </div>
                <div className="space-y-4">
                  <p className="text-lg" style={{ fontFamily: content.bodyFont || 'Inter' }}>
                    This is how body text appears in regular weight. It should be readable and comfortable for extended reading.
                  </p>
                  <p className="text-base font-medium" style={{ fontFamily: content.bodyFont || 'Inter' }}>
                    This is medium weight body text for emphasis and subheadings.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        const TemplateComponent = getTemplateComponent(settings.template);
        return (
          <TemplateComponent
            brand={brand}
            settings={settings}
            slideContent={currentSlide.content}
            slideType={currentSlide.type}
          />
        );
    }
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
        <div className="flex items-center gap-4">
          <div>
            <span className="text-sm font-medium">{currentSlide.title}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {settings.size.format} • {baseW}×{baseH}
            </span>
          </div>
          
          {!previewMode && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Edit3 className="w-3 h-3" />
              Click elements to edit
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setUserZoom(prev => clamp(prev - 0.1, 0.1, 3))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <span className="text-sm min-w-16 text-center">{Math.round(scale * 100)}%</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setUserZoom(prev => clamp(prev + 0.1, 0.1, 3))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setUserZoom(1)}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Preview Mode Toggle */}
          <Button
            variant={previewMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onPreviewModeChange(!previewMode)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative bg-muted/10 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center p-8">
          <div
            className="bg-white shadow-2xl border border-border/20 overflow-hidden"
            style={{
              width: '1200px',
              height: '1000px',
              transform: `scale(${scale})`,
              transformOrigin: 'center',
            }}
          >
            {renderEditableContent()}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-muted/30 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Template: {settings.template}</span>
          <span>Mode: {previewMode ? 'Preview' : 'Edit'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Slide {currentSlide.content?.pageNumber || 1}</span>
          <span>Auto-saved</span>
        </div>
      </div>
    </div>
  );
};