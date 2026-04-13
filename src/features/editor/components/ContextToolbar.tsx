/**
 * Context Toolbar — Canva-style floating format bar.
 *
 * Appears between EditorChrome and canvas when an object is selected.
 * Shows different controls based on object type (text vs shape vs image).
 */
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Plus, Palette, Type as TypeIcon,
  ChevronDown, Pipette, FlipHorizontal, FlipVertical,
  Sun, Contrast, Droplets, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextToolbarProps {
  selectedObject: any;
  fabricCanvas: any;
  brand?: { primaryColor?: string; secondaryColor?: string; fonts?: { primary?: string; secondary?: string } };
}

const FONT_OPTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Lora', 'PT Sans', 'Raleway',
  'Oswald', 'Nunito', 'Source Sans Pro', 'Ubuntu', 'Cabin',
];

const SHAPE_TYPES = ['rect', 'circle', 'path', 'polygon', 'triangle', 'line', 'ellipse', 'polyline'];

export function ContextToolbar({ selectedObject, fabricCanvas, brand }: ContextToolbarProps) {
  if (!selectedObject || !fabricCanvas) return null;

  const objType = selectedObject.type || '';
  const isText = objType === 'textbox' || objType === 'i-text' || objType === 'text';
  const isShape = SHAPE_TYPES.includes(objType);
  const isImage = objType === 'image';
  const isMultiSelect = objType === 'activeselection' || objType === 'activeSelection';

  const update = useCallback((prop: string, value: unknown) => {
    selectedObject.set(prop, value);
    fabricCanvas.renderAll();
    fabricCanvas.fire('object:modified', { target: selectedObject });
  }, [selectedObject, fabricCanvas]);

  const toggleTextStyle = useCallback((prop: string, onVal: string, offVal: string) => {
    const current = selectedObject.get(prop);
    update(prop, current === onVal ? offVal : onVal);
  }, [selectedObject, update]);

  return (
    <div className="flex items-center gap-1 h-11 px-3 border-b border-border bg-background/95 backdrop-blur overflow-x-auto">
      {isText && (
        <>
          {/* Font Family */}
          <div className="relative">
            <select
              value={selectedObject.fontFamily || 'Inter'}
              onChange={(e) => update('fontFamily', e.target.value)}
              className="h-8 w-[140px] rounded-md border border-border bg-background px-2 text-xs font-medium appearance-none cursor-pointer hover:bg-muted/50"
            >
              {brand?.fonts?.primary && !FONT_OPTIONS.includes(brand.fonts.primary) && (
                <option value={brand.fonts.primary}>{brand.fonts.primary}</option>
              )}
              {brand?.fonts?.secondary && !FONT_OPTIONS.includes(brand.fonts.secondary) && (
                <option value={brand.fonts.secondary}>{brand.fonts.secondary}</option>
              )}
              {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 h-3 w-3 text-muted-foreground pointer-events-none" />
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Font Size */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => update('fontSize', Math.max(8, (selectedObject.fontSize || 16) - 2))}>
            <Minus className="h-3 w-3" />
          </Button>
          <input
            type="number"
            value={Math.round(selectedObject.fontSize || 16)}
            onChange={(e) => update('fontSize', Number(e.target.value))}
            className="h-8 w-12 rounded-md border border-border bg-background text-center text-xs font-medium"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => update('fontSize', Math.min(200, (selectedObject.fontSize || 16) + 2))}>
            <Plus className="h-3 w-3" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Color */}
          <div className="relative flex items-center">
            <input
              type="color"
              value={typeof selectedObject.fill === 'string' && selectedObject.fill.startsWith('#') ? selectedObject.fill : '#333333'}
              onChange={(e) => update('fill', e.target.value)}
              className="h-7 w-7 rounded border border-border cursor-pointer"
            />
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Bold / Italic / Underline / Strikethrough */}
          <Button
            variant="ghost" size="icon" className={cn('h-8 w-8', selectedObject.fontWeight === 'bold' && 'bg-muted')}
            onClick={() => toggleTextStyle('fontWeight', 'bold', 'normal')}
          >
            <Bold className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className={cn('h-8 w-8', selectedObject.fontStyle === 'italic' && 'bg-muted')}
            onClick={() => toggleTextStyle('fontStyle', 'italic', 'normal')}
          >
            <Italic className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className={cn('h-8 w-8', selectedObject.underline && 'bg-muted')}
            onClick={() => update('underline', !selectedObject.underline)}
          >
            <Underline className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="icon" className={cn('h-8 w-8', selectedObject.linethrough && 'bg-muted')}
            onClick={() => update('linethrough', !selectedObject.linethrough)}
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Alignment */}
          {['left', 'center', 'right', 'justify'].map((align) => {
            const icons = { left: AlignLeft, center: AlignCenter, right: AlignRight, justify: AlignJustify };
            const Icon = icons[align as keyof typeof icons];
            return (
              <Button
                key={align}
                variant="ghost" size="icon"
                className={cn('h-8 w-8', selectedObject.textAlign === align && 'bg-muted')}
                onClick={() => update('textAlign', align)}
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}

          <div className="w-px h-5 bg-border mx-1" />

          {/* Line Height */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-[10px]">LH</span>
            <input
              type="number"
              step={0.1}
              min={0.8}
              max={3}
              value={selectedObject.lineHeight || 1.3}
              onChange={(e) => update('lineHeight', Number(e.target.value))}
              className="h-7 w-12 rounded border border-border bg-background text-center text-xs"
            />
          </div>

          {/* Letter Spacing */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-[10px]">LS</span>
            <input
              type="number"
              step={10}
              min={-100}
              max={1000}
              value={selectedObject.charSpacing || 0}
              onChange={(e) => update('charSpacing', Number(e.target.value))}
              className="h-7 w-14 rounded border border-border bg-background text-center text-xs"
            />
          </div>
        </>
      )}

      {isShape && (
        <>
          {/* Fill Color */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium">Fill</span>
            <input
              type="color"
              value={typeof selectedObject.fill === 'string' && selectedObject.fill.startsWith('#') ? selectedObject.fill : '#000000'}
              onChange={(e) => update('fill', e.target.value)}
              className="h-7 w-7 rounded border border-border cursor-pointer"
            />
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Stroke */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium">Stroke</span>
            <input
              type="color"
              value={selectedObject.stroke || '#000000'}
              onChange={(e) => update('stroke', e.target.value)}
              className="h-7 w-7 rounded border border-border cursor-pointer"
            />
            <input
              type="number"
              value={selectedObject.strokeWidth || 0}
              onChange={(e) => update('strokeWidth', Number(e.target.value))}
              className="h-7 w-12 rounded border border-border bg-background text-center text-xs"
              min={0}
              max={20}
            />
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Border Radius (rect only) */}
          {selectedObject.type === 'rect' && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground font-medium">Radius</span>
              <input
                type="number"
                value={selectedObject.rx || 0}
                onChange={(e) => { update('rx', Number(e.target.value)); update('ry', Number(e.target.value)); }}
                className="h-7 w-12 rounded border border-border bg-background text-center text-xs"
                min={0}
              />
            </div>
          )}

          <div className="w-px h-5 bg-border mx-1" />

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground font-medium">Opacity</span>
            <input
              type="range"
              value={Math.round((selectedObject.opacity ?? 1) * 100)}
              onChange={(e) => update('opacity', Number(e.target.value) / 100)}
              className="w-20 h-1.5 accent-primary"
              min={0}
              max={100}
            />
            <span className="text-xs text-muted-foreground w-8">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
          </div>
        </>
      )}

      {/* Multi-select alignment */}
      {isMultiSelect && (
        <AlignmentControls selectedObject={selectedObject} fabricCanvas={fabricCanvas} />
      )}

      {/* Image Controls */}
      {isImage && (
        <ImageToolbarControls selectedObject={selectedObject} fabricCanvas={fabricCanvas} />
      )}

      {/* Opacity (all objects) */}
      {!isText && !isShape && !isImage && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-medium">Opacity</span>
          <input
            type="range"
            value={Math.round((selectedObject.opacity ?? 1) * 100)}
            onChange={(e) => update('opacity', Number(e.target.value) / 100)}
            className="w-20 h-1.5 accent-primary"
            min={0}
            max={100}
          />
          <span className="text-xs text-muted-foreground w-8">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
        </div>
      )}

      {/* Brand quick-apply (always visible when brand is available) */}
      {brand && (isText || isShape) && (
        <div className="ml-auto flex items-center gap-1">
          {brand.primaryColor && (
            <button
              onClick={() => update('fill', brand.primaryColor)}
              className="h-6 w-6 rounded-full border-2 border-border hover:border-primary transition-colors"
              style={{ backgroundColor: brand.primaryColor }}
              title="Apply primary color"
            />
          )}
          {brand.secondaryColor && (
            <button
              onClick={() => update('fill', brand.secondaryColor)}
              className="h-6 w-6 rounded-full border-2 border-border hover:border-primary transition-colors"
              style={{ backgroundColor: brand.secondaryColor }}
              title="Apply secondary color"
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Image toolbar controls ──────────────────────────────────────
function ImageToolbarControls({ selectedObject, fabricCanvas }: { selectedObject: any; fabricCanvas: any }) {
  const [showFilters, setShowFilters] = useState(false);

  const flipH = () => {
    selectedObject.set('flipX', !selectedObject.flipX);
    fabricCanvas.renderAll();
    fabricCanvas.fire('object:modified', { target: selectedObject });
  };

  const flipV = () => {
    selectedObject.set('flipY', !selectedObject.flipY);
    fabricCanvas.renderAll();
    fabricCanvas.fire('object:modified', { target: selectedObject });
  };

  const setOpacity = (val: number) => {
    selectedObject.set('opacity', val / 100);
    fabricCanvas.renderAll();
    fabricCanvas.fire('object:modified', { target: selectedObject });
  };

  const applyFilter = async (filterType: string) => {
    try {
      const fabric = await import('fabric');
      const filters = (fabric as any).Image?.filters || (fabric as any).filters;
      if (!filters) return;

      // Clear existing filters
      selectedObject.filters = [];

      if (filterType !== 'none') {
        let filter: any;
        switch (filterType) {
          case 'grayscale':
            filter = new filters.Grayscale();
            break;
          case 'sepia':
            filter = new filters.Sepia();
            break;
          case 'brightness':
            filter = new filters.Brightness({ brightness: 0.15 });
            break;
          case 'contrast':
            filter = new filters.Contrast({ contrast: 0.2 });
            break;
          case 'blur':
            filter = new filters.Blur({ blur: 0.3 });
            break;
          case 'invert':
            filter = new filters.Invert();
            break;
          case 'noise':
            filter = new filters.Noise({ noise: 100 });
            break;
          case 'pixelate':
            filter = new filters.Pixelate({ blocksize: 6 });
            break;
        }
        if (filter) selectedObject.filters.push(filter);
      }

      selectedObject.applyFilters();
      fabricCanvas.renderAll();
      fabricCanvas.fire('object:modified', { target: selectedObject });
    } catch (err) {
      console.error('Filter error:', err);
    }
  };

  return (
    <>
      {/* Flip */}
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={flipH} title="Flip horizontal">
        <FlipHorizontal className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={flipV} title="Flip vertical">
        <FlipVertical className="h-3.5 w-3.5" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Opacity */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground font-medium">Opacity</span>
        <input
          type="range"
          value={Math.round((selectedObject.opacity ?? 1) * 100)}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-16 h-1.5 accent-primary"
          min={0}
          max={100}
        />
        <span className="text-xs text-muted-foreground w-8">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Filters dropdown */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-8 gap-1 text-xs', showFilters && 'bg-muted')}
          onClick={() => setShowFilters(!showFilters)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
          <ChevronDown className="h-3 w-3" />
        </Button>
        {showFilters && (
          <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-1 z-50 min-w-[140px]">
            {['none', 'grayscale', 'sepia', 'brightness', 'contrast', 'blur', 'invert', 'noise', 'pixelate'].map((f) => (
              <button
                key={f}
                onClick={() => { applyFilter(f); setShowFilters(false); }}
                className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-muted/50 capitalize"
              >
                {f === 'none' ? 'No Filter' : f}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Alignment controls for multi-selection ─────────────────────
function AlignmentControls({ selectedObject, fabricCanvas }: { selectedObject: any; fabricCanvas: any }) {
  const align = (direction: string) => {
    const objects = selectedObject.getObjects?.() || [];
    if (objects.length < 2) return;

    const bounds = selectedObject.getBoundingRect();

    objects.forEach((obj: any) => {
      const objBounds = obj.getBoundingRect();
      switch (direction) {
        case 'left':
          obj.set('left', obj.left - objBounds.left + bounds.left);
          break;
        case 'center-h':
          obj.set('left', obj.left - objBounds.left + bounds.left + (bounds.width - objBounds.width) / 2);
          break;
        case 'right':
          obj.set('left', obj.left - objBounds.left + bounds.left + bounds.width - objBounds.width);
          break;
        case 'top':
          obj.set('top', obj.top - objBounds.top + bounds.top);
          break;
        case 'center-v':
          obj.set('top', obj.top - objBounds.top + bounds.top + (bounds.height - objBounds.height) / 2);
          break;
        case 'bottom':
          obj.set('top', obj.top - objBounds.top + bounds.top + bounds.height - objBounds.height);
          break;
      }
      obj.setCoords();
    });

    fabricCanvas.renderAll();
    fabricCanvas.fire('object:modified', { target: selectedObject });
  };

  return (
    <>
      <span className="text-[10px] text-muted-foreground font-medium">Align</span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => align('left')} title="Align left">
        <AlignLeft className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => align('center-h')} title="Align center">
        <AlignCenter className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => align('right')} title="Align right">
        <AlignRight className="h-3.5 w-3.5" />
      </Button>
      <div className="w-px h-5 bg-border mx-1" />
      <span className="text-[10px] text-muted-foreground font-medium">
        {selectedObject.getObjects?.()?.length || 0} objects
      </span>
    </>
  );
}
