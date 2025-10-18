import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ColorPaletteEditorProps {
  colorPalette: any;
  onColorPaletteChange: (colorPalette: any) => void;
}

export function ColorPaletteEditor({ colorPalette, onColorPaletteChange }: ColorPaletteEditorProps) {
  const { toast } = useToast();

  const updateColor = (type: 'primary' | 'secondary' | 'accent', field: 'hex' | 'name', value: string) => {
    onColorPaletteChange({
      ...colorPalette,
      [type]: {
        ...(colorPalette[type] || {}),
        [field]: value,
        rgb: field === 'hex' ? '' : colorPalette[type]?.rgb || '',
        cmyk: field === 'hex' ? '' : colorPalette[type]?.cmyk || '',
        usage: colorPalette[type]?.usage || 'General use'
      }
    });
  };

  return (
    <Card className="p-8 bg-card">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-semibold">Colors</h3>
      </div>

      <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Primary Color */}
        <div className="flex-shrink-0 w-[160px] space-y-2 snap-start">
          <div 
            className="w-full h-[160px] rounded-xl border-2 border-border cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
            style={{ backgroundColor: colorPalette.primary?.hex || '#000000' }}
            onClick={() => document.getElementById('primary-color-input')?.click()}
          />
          <input
            id="primary-color-input"
            type="color"
            value={colorPalette.primary?.hex || '#000000'}
            onChange={(e) => updateColor('primary', 'hex', e.target.value)}
            className="hidden"
          />
          <div className="space-y-1">
            <Input
              value={colorPalette.primary?.name || ''}
              onChange={(e) => updateColor('primary', 'name', e.target.value)}
              placeholder="Primary"
              className="text-sm font-medium border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
            />
            <Input
              value={colorPalette.primary?.hex || ''}
              onChange={(e) => updateColor('primary', 'hex', e.target.value)}
              placeholder="#000000"
              className="font-mono text-xs text-muted-foreground border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div className="flex-shrink-0 w-[160px] space-y-2 snap-start">
          <div 
            className="w-full h-[160px] rounded-xl border-2 border-border cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
            style={{ backgroundColor: colorPalette.secondary?.hex || '#000000' }}
            onClick={() => document.getElementById('secondary-color-input')?.click()}
          />
          <input
            id="secondary-color-input"
            type="color"
            value={colorPalette.secondary?.hex || '#000000'}
            onChange={(e) => updateColor('secondary', 'hex', e.target.value)}
            className="hidden"
          />
          <div className="space-y-1">
            <Input
              value={colorPalette.secondary?.name || ''}
              onChange={(e) => updateColor('secondary', 'name', e.target.value)}
              placeholder="Secondary"
              className="text-sm font-medium border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
            />
            <Input
              value={colorPalette.secondary?.hex || ''}
              onChange={(e) => updateColor('secondary', 'hex', e.target.value)}
              placeholder="#000000"
              className="font-mono text-xs text-muted-foreground border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div className="flex-shrink-0 w-[160px] space-y-2 snap-start">
          <div 
            className="w-full h-[160px] rounded-xl border-2 border-border cursor-pointer transition-all hover:scale-105 hover:shadow-lg"
            style={{ backgroundColor: colorPalette.accent?.hex || '#000000' }}
            onClick={() => document.getElementById('accent-color-input')?.click()}
          />
          <input
            id="accent-color-input"
            type="color"
            value={colorPalette.accent?.hex || '#000000'}
            onChange={(e) => updateColor('accent', 'hex', e.target.value)}
            className="hidden"
          />
          <div className="space-y-1">
            <Input
              value={colorPalette.accent?.name || ''}
              onChange={(e) => updateColor('accent', 'name', e.target.value)}
              placeholder="Accent"
              className="text-sm font-medium border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
            />
            <Input
              value={colorPalette.accent?.hex || ''}
              onChange={(e) => updateColor('accent', 'hex', e.target.value)}
              placeholder="#000000"
              className="font-mono text-xs text-muted-foreground border-0 bg-transparent px-0 h-auto focus-visible:ring-0"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
