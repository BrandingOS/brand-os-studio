import { useState, useEffect } from 'react';
import { Palette, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { services } from '@/shared/services/registry';
import type { Brand } from '@/shared/types/brand';

interface ColorPaletteToolProps {
  brandId: string;
}

export function ColorPaletteTool({ brandId }: ColorPaletteToolProps) {
  const [brand, setBrand] = useState<Brand | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [newColor, setNewColor] = useState('#000000');

  const isValidHex = (color: string) => /^#([0-9A-Fa-f]{3}){1,2}$/.test(color);

  useEffect(() => {
    loadBrand();
  }, [brandId]);

  const loadBrand = async () => {
    try {
      setIsLoading(true);
      const brandData = await services.brands.getById(brandId);
      setBrand(brandData);
    } catch (error) {
      console.error('Failed to load brand:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updatePrimaryColor = async (color: string) => {
    if (!brand || !isValidHex(color)) return;

    try {
      const updatedBrand = await services.brands.update(brandId, {
        primaryColor: color
      });
      setBrand(updatedBrand);
    } catch (error) {
      console.error('Failed to update primary color:', error);
    }
  };

  const updateSecondaryColor = async (color: string) => {
    if (!brand || !isValidHex(color)) return;

    try {
      const updatedBrand = await services.brands.update(brandId, {
        secondaryColor: color
      });
      setBrand(updatedBrand);
    } catch (error) {
      console.error('Failed to update secondary color:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Brand not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Color Palette</h2>
      </div>

      {/* Primary Color */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Primary Color</h3>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg border border-border"
            style={{ backgroundColor: brand.primaryColor }}
          />
          <div className="flex-1">
            <Input
              type="color"
              value={brand.primaryColor}
              onChange={(e) => updatePrimaryColor(e.target.value)}
              className="w-20"
            />
          </div>
          <Input
            type="text"
            value={brand.primaryColor}
            onChange={(e) => updatePrimaryColor(e.target.value)}
            className="w-24 font-mono text-sm"
            placeholder="#000000"
          />
        </div>
      </Card>

      {/* Secondary Color */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Secondary Color</h3>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-lg border border-border"
            style={{ backgroundColor: brand.secondaryColor || '#cccccc' }}
          />
          <div className="flex-1">
            <Input
              type="color"
              value={brand.secondaryColor || '#cccccc'}
              onChange={(e) => updateSecondaryColor(e.target.value)}
              className="w-20"
            />
          </div>
          <Input
            type="text"
            value={brand.secondaryColor || ''}
            onChange={(e) => updateSecondaryColor(e.target.value)}
            className="w-24 font-mono text-sm"
            placeholder="#cccccc"
          />
        </div>
      </Card>

      {/* Color Suggestions */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Suggested Palettes</h3>
        <div className="grid grid-cols-5 gap-2">
          {[
            ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
            ['#6C5CE7', '#A29BFE', '#FD79A8', '#FDCB6E', '#E17055'],
            ['#2D3436', '#636E72', '#DDD', '#74B9FF', '#00B894'],
          ].map((palette, paletteIndex) => (
            <div key={paletteIndex} className="space-y-1">
              {palette.map((color, colorIndex) => (
                <div
                  key={colorIndex}
                  className="w-8 h-8 rounded cursor-pointer border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => updatePrimaryColor(color)}
                />
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}