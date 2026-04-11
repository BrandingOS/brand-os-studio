/**
 * Context Toolbar — Canva-style floating format bar.
 *
 * Appears between EditorChrome and canvas when an object is selected.
 * Shows different controls based on object type (text vs shape vs image).
 */
import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Minus, Plus, Palette, Type as TypeIcon,
  ChevronDown, Pipette,
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

export function ContextToolbar({ selectedObject, fabricCanvas, brand }: ContextToolbarProps) {
  if (!selectedObject || !fabricCanvas) return null;

  const isText = selectedObject.type === 'textbox' || selectedObject.type === 'i-text' || selectedObject.type === 'text';
  const isShape = selectedObject.type === 'rect' || selectedObject.type === 'circle' || selectedObject.type === 'path';

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

      {/* Brand quick-apply (always visible when brand is available) */}
      {brand && (
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
