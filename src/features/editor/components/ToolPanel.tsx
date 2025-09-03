import { useState } from 'react';
import { Type, Image, Square, Circle, Shapes, Palette, Upload } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import type { Brand } from '@/shared/types/brand';

interface ToolPanelProps {
  brand: Brand;
  onToolSelect: (tool: string) => void;
  selectedTool: string | null;
  onAddImage: (imageUrl: string) => void;
}

export function ToolPanel({ brand, onToolSelect, selectedTool, onAddImage }: ToolPanelProps) {
  const [activeTab, setActiveTab] = useState('elements');

  const tabs = [
    { id: 'elements', name: 'Elements', icon: Shapes },
    { id: 'text', name: 'Text', icon: Type },
    { id: 'images', name: 'Images', icon: Image },
    { id: 'brand', name: 'Brand', icon: Palette },
  ];

  const textStyles = [
    { name: 'Heading', size: 32, weight: 'bold' },
    { name: 'Subheading', size: 24, weight: 'semibold' },
    { name: 'Body', size: 16, weight: 'normal' },
    { name: 'Caption', size: 12, weight: 'normal' },
  ];

  const shapes = [
    { id: 'rectangle', name: 'Rectangle', icon: Square },
    { id: 'circle', name: 'Circle', icon: Circle },
  ];

  const stockImages = [
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    'https://images.unsplash.com/photo-1557838923-2985c318be48?w=400',
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
  ];

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        onAddImage(imageUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Card className="w-80 h-full rounded-none border-r flex flex-col">
      {/* Tabs */}
      <div className="border-b">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 p-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'elements' && (
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Basic Shapes</h3>
            <div className="grid grid-cols-2 gap-2">
              {shapes.map((shape) => (
                <Button
                  key={shape.id}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2"
                  onClick={() => onToolSelect(shape.id)}
                >
                  <shape.icon className="h-6 w-6" />
                  <span className="text-xs">{shape.name}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-4">
            <h3 className="font-medium text-sm">Text Styles</h3>
            <div className="space-y-2">
              {textStyles.map((style) => (
                <Button
                  key={style.name}
                  variant="outline"
                  className="w-full justify-start p-4 h-auto"
                  onClick={() => onToolSelect('text')}
                >
                  <div className="text-left">
                    <div 
                      className={`text-${style.size === 32 ? 'lg' : style.size === 24 ? 'base' : 'sm'} font-${style.weight}`}
                      style={{ 
                        fontFamily: brand.fonts.primary || 'Arial',
                        color: brand.primaryColor 
                      }}
                    >
                      {style.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {style.size}px • {style.weight}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'images' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">Upload Image</h3>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="text-xs text-gray-500">Click to upload</p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </label>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">Stock Images</h3>
              <div className="grid grid-cols-2 gap-2">
                {stockImages.map((imageUrl, index) => (
                  <button
                    key={index}
                    onClick={() => onAddImage(imageUrl)}
                    className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={imageUrl}
                      alt={`Stock image ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'brand' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-sm mb-2">Brand Colors</h3>
              <div className="grid grid-cols-4 gap-2">
                {[brand.primaryColor, brand.secondaryColor, '#000000', '#ffffff'].map((color, index) => (
                  <button
                    key={index}
                    className="w-full aspect-square rounded-lg border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color || '#cccccc' }}
                    onClick={() => {
                      // Apply color to selected object
                    }}
                  />
                ))}
              </div>
            </div>

            {brand.logo && (
              <div>
                <h3 className="font-medium text-sm mb-2">Brand Logo</h3>
                <button
                  onClick={() => onAddImage(brand.logo!)}
                  className="w-full p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <img
                    src={brand.logo}
                    alt="Brand Logo"
                    className="max-w-full max-h-16 object-contain mx-auto"
                  />
                </button>
              </div>
            )}

            <div>
              <h3 className="font-medium text-sm mb-2">Brand Fonts</h3>
              <div className="space-y-2">
                {[brand.fonts.primary, brand.fonts.secondary, 'Arial', 'Helvetica'].filter(Boolean).map((font, index) => (
                  <button
                    key={index}
                    className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    style={{ fontFamily: font }}
                  >
                    {font} - Sample Text
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}