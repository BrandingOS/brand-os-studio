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
    <div className="brand-card p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="brand-section-title">Colors</h3>
      </div>

      <div className="space-y-4">
        {/* Primary Color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Primary</label>
          <div className="flex items-center gap-3">
            <div 
              className="brand-color-swatch w-20 h-20 border-2 border-gray-200"
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
            <div className="flex-1 space-y-2">
              <Input
                value={colorPalette.primary?.name || ''}
                onChange={(e) => updateColor('primary', 'name', e.target.value)}
                placeholder="Primary"
                className="text-sm h-9 border-gray-200"
              />
              <Input
                value={colorPalette.primary?.hex || ''}
                onChange={(e) => updateColor('primary', 'hex', e.target.value)}
                placeholder="#000000"
                className="font-mono text-xs h-9 border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Secondary Color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Secondary</label>
          <div className="flex items-center gap-3">
            <div 
              className="brand-color-swatch w-20 h-20 border-2 border-gray-200"
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
            <div className="flex-1 space-y-2">
              <Input
                value={colorPalette.secondary?.name || ''}
                onChange={(e) => updateColor('secondary', 'name', e.target.value)}
                placeholder="Secondary"
                className="text-sm h-9 border-gray-200"
              />
              <Input
                value={colorPalette.secondary?.hex || ''}
                onChange={(e) => updateColor('secondary', 'hex', e.target.value)}
                placeholder="#000000"
                className="font-mono text-xs h-9 border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Accent Color */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-500">Accent</label>
          <div className="flex items-center gap-3">
            <div 
              className="brand-color-swatch w-20 h-20 border-2 border-gray-200"
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
            <div className="flex-1 space-y-2">
              <Input
                value={colorPalette.accent?.name || ''}
                onChange={(e) => updateColor('accent', 'name', e.target.value)}
                placeholder="Accent"
                className="text-sm h-9 border-gray-200"
              />
              <Input
                value={colorPalette.accent?.hex || ''}
                onChange={(e) => updateColor('accent', 'hex', e.target.value)}
                placeholder="#000000"
                className="font-mono text-xs h-9 border-gray-200"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
