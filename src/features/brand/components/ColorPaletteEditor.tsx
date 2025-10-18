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
    <Card className="p-6 bg-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Colors</h3>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {/* Primary Color */}
        <div className="flex-shrink-0 w-[240px] space-y-3 snap-start">
          <label className="text-sm font-medium">Primary Color</label>
          <div 
            className="w-full h-32 rounded-lg border-2 border-border cursor-pointer"
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
          <Input
            value={colorPalette.primary?.hex || ''}
            onChange={(e) => updateColor('primary', 'hex', e.target.value)}
            placeholder="#000000"
            className="font-mono text-sm"
          />
          <Input
            value={colorPalette.primary?.name || ''}
            onChange={(e) => updateColor('primary', 'name', e.target.value)}
            placeholder="Color name"
          />
        </div>

        {/* Secondary Color */}
        <div className="flex-shrink-0 w-[240px] space-y-3 snap-start">
          <label className="text-sm font-medium">Secondary Color</label>
          <div 
            className="w-full h-32 rounded-lg border-2 border-border cursor-pointer"
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
          <Input
            value={colorPalette.secondary?.hex || ''}
            onChange={(e) => updateColor('secondary', 'hex', e.target.value)}
            placeholder="#000000"
            className="font-mono text-sm"
          />
          <Input
            value={colorPalette.secondary?.name || ''}
            onChange={(e) => updateColor('secondary', 'name', e.target.value)}
            placeholder="Color name"
          />
        </div>

        {/* Accent Color */}
        <div className="flex-shrink-0 w-[240px] space-y-3 snap-start">
          <label className="text-sm font-medium">Accent Color</label>
          <div 
            className="w-full h-32 rounded-lg border-2 border-border cursor-pointer"
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
          <Input
            value={colorPalette.accent?.hex || ''}
            onChange={(e) => updateColor('accent', 'hex', e.target.value)}
            placeholder="#000000"
            className="font-mono text-sm"
          />
          <Input
            value={colorPalette.accent?.name || ''}
            onChange={(e) => updateColor('accent', 'name', e.target.value)}
            placeholder="Color name"
          />
        </div>
      </div>
    </Card>
  );
}
