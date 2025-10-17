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

      <div className="space-y-6">
        {/* Primary Color */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Primary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorPalette.primary?.hex || '#000000'}
              onChange={(e) => updateColor('primary', 'hex', e.target.value)}
              className="w-12 h-12 rounded border-2 border-border cursor-pointer"
            />
            <Input
              value={colorPalette.primary?.hex || ''}
              onChange={(e) => updateColor('primary', 'hex', e.target.value)}
              placeholder="#000000"
              className="w-28 font-mono text-sm"
            />
            <Input
              value={colorPalette.primary?.name || ''}
              onChange={(e) => updateColor('primary', 'name', e.target.value)}
              placeholder="Color name"
              className="flex-1"
            />
          </div>
        </div>

        {/* Secondary Color */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Secondary Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorPalette.secondary?.hex || '#000000'}
              onChange={(e) => updateColor('secondary', 'hex', e.target.value)}
              className="w-12 h-12 rounded border-2 border-border cursor-pointer"
            />
            <Input
              value={colorPalette.secondary?.hex || ''}
              onChange={(e) => updateColor('secondary', 'hex', e.target.value)}
              placeholder="#000000"
              className="w-28 font-mono text-sm"
            />
            <Input
              value={colorPalette.secondary?.name || ''}
              onChange={(e) => updateColor('secondary', 'name', e.target.value)}
              placeholder="Color name"
              className="flex-1"
            />
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Accent Color</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={colorPalette.accent?.hex || '#000000'}
              onChange={(e) => updateColor('accent', 'hex', e.target.value)}
              className="w-12 h-12 rounded border-2 border-border cursor-pointer"
            />
            <Input
              value={colorPalette.accent?.hex || ''}
              onChange={(e) => updateColor('accent', 'hex', e.target.value)}
              placeholder="#000000"
              className="w-28 font-mono text-sm"
            />
            <Input
              value={colorPalette.accent?.name || ''}
              onChange={(e) => updateColor('accent', 'name', e.target.value)}
              placeholder="Color name"
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
