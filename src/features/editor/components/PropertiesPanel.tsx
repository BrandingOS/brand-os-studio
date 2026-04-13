import { useState, useEffect } from 'react';
import { Trash2, Copy, Lock, Unlock } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Input } from '@/shared/ui/Input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { Brand } from '@/shared/types/brand';

interface PropertiesPanelProps {
  selectedObject: any;
  brand: Brand;
  fabricCanvas: any;
  onDeleteObject: () => void;
  onDuplicateObject: () => void;
}

export function PropertiesPanel({ 
  selectedObject, 
  brand, 
  fabricCanvas, 
  onDeleteObject, 
  onDuplicateObject 
}: PropertiesPanelProps) {
  const [properties, setProperties] = useState<any>({});

  useEffect(() => {
    if (selectedObject) {
      setProperties({
        left: Math.round(selectedObject.left || 0),
        top: Math.round(selectedObject.top || 0),
        width: Math.round(selectedObject.width * (selectedObject.scaleX || 1)),
        height: Math.round(selectedObject.height * (selectedObject.scaleY || 1)),
        angle: Math.round(selectedObject.angle || 0),
        opacity: (selectedObject.opacity || 1) * 100,
        fill: selectedObject.fill || '#000000',
        text: selectedObject.text || '',
        fontSize: selectedObject.fontSize || 16,
        fontFamily: selectedObject.fontFamily || 'Arial',
        locked: !selectedObject.selectable,
      });
    }
  }, [selectedObject]);

  const updateProperty = (key: string, value: any) => {
    if (!selectedObject || !fabricCanvas) return;

    const newProperties = { ...properties, [key]: value };
    setProperties(newProperties);

    if (key === 'left' || key === 'top') {
      selectedObject.set(key, parseFloat(value));
    } else if (key === 'width') {
      selectedObject.scaleToWidth(parseFloat(value));
    } else if (key === 'height') {
      selectedObject.scaleToHeight(parseFloat(value));
    } else if (key === 'angle') {
      selectedObject.set('angle', parseFloat(value));
    } else if (key === 'opacity') {
      selectedObject.set('opacity', parseFloat(value) / 100);
    } else if (key === 'fill') {
      selectedObject.set('fill', value);
    } else if (key === 'text') {
      selectedObject.set('text', value);
    } else if (key === 'fontSize') {
      selectedObject.set('fontSize', parseFloat(value));
    } else if (key === 'fontFamily') {
      selectedObject.set('fontFamily', value);
    } else if (key === 'locked') {
      selectedObject.set('selectable', !value);
      selectedObject.set('evented', !value);
    }

    fabricCanvas.renderAll();
  };

  const toggleLock = () => {
    updateProperty('locked', !properties.locked);
  };

  if (!selectedObject) {
    return (
      <Card className="w-80 h-full rounded-none border-l">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Properties</h2>
        </div>
        <div className="p-4">
          <div className="text-center text-muted-foreground">
            <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-dashed border-gray-300 rounded"></div>
            </div>
            <p className="text-sm">Select an object to edit properties</p>
          </div>
        </div>
      </Card>
    );
  }

  const isText = selectedObject.type === 'textbox' || selectedObject.type === 'text';
  const isImage = selectedObject.type === 'image';

  return (
    <Card className="w-80 h-full rounded-none border-l flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Properties</h2>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={toggleLock}>
              {properties.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={onDuplicateObject}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onDeleteObject}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {selectedObject.type || 'Object'}
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Position & Size */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Position & Size</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="left" className="text-xs">X</Label>
              <Input
                id="left"
                type="number"
                value={properties.left}
                onChange={(e) => updateProperty('left', e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="top" className="text-xs">Y</Label>
              <Input
                id="top"
                type="number"
                value={properties.top}
                onChange={(e) => updateProperty('top', e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="width" className="text-xs">Width</Label>
              <Input
                id="width"
                type="number"
                value={properties.width}
                onChange={(e) => updateProperty('width', e.target.value)}
                className="h-8"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-xs">Height</Label>
              <Input
                id="height"
                type="number"
                value={properties.height}
                onChange={(e) => updateProperty('height', e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* Transform */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Transform</h3>
          <div>
            <Label className="text-xs">Rotation: {properties.angle}°</Label>
            <Slider
              value={[properties.angle]}
              onValueChange={([value]) => updateProperty('angle', value)}
              max={360}
              min={-360}
              step={1}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-xs">Opacity: {properties.opacity}%</Label>
            <Slider
              value={[properties.opacity]}
              onValueChange={([value]) => updateProperty('opacity', value)}
              max={100}
              min={0}
              step={1}
              className="mt-2"
            />
          </div>
        </div>

        {/* Appearance */}
        {!isImage && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Appearance</h3>
            <div>
              <Label htmlFor="fill" className="text-xs">Color</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="fill"
                  type="color"
                  value={properties.fill}
                  onChange={(e) => updateProperty('fill', e.target.value)}
                  className="w-12 h-8 p-1"
                />
                <Input
                  type="text"
                  value={properties.fill}
                  onChange={(e) => updateProperty('fill', e.target.value)}
                  className="flex-1 h-8"
                />
              </div>
            </div>
            
            {/* Brand Colors */}
            <div>
              <Label className="text-xs">Brand Colors</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {[brand.primaryColor, brand.secondaryColor, '#000000', '#ffffff'].map((color, index) => (
                  <button
                    key={index}
                    className="w-full h-8 rounded border border-gray-200 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color || '#cccccc' }}
                    onClick={() => updateProperty('fill', color)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Text Properties */}
        {isText && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Text</h3>
            <div>
              <Label htmlFor="text" className="text-xs">Content</Label>
              <textarea
                id="text"
                value={properties.text}
                onChange={(e) => updateProperty('text', e.target.value)}
                className="w-full p-2 mt-1 border border-gray-200 rounded text-sm resize-none"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="fontSize" className="text-xs">Font Size</Label>
              <Input
                id="fontSize"
                type="number"
                value={properties.fontSize}
                onChange={(e) => updateProperty('fontSize', e.target.value)}
                className="h-8 mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fontFamily" className="text-xs">Font Family</Label>
              <select
                id="fontFamily"
                value={properties.fontFamily}
                onChange={(e) => updateProperty('fontFamily', e.target.value)}
                className="w-full p-2 mt-1 border border-gray-200 rounded text-sm bg-white"
              >
                {[brand.fonts.primary, brand.fonts.secondary, 'Arial', 'Helvetica', 'Times New Roman', 'Georgia'].filter(Boolean).map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Image Properties */}
        {isImage && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Image</h3>
            <label className="block">
              <Button variant="outline" className="w-full" asChild>
                <span>Replace Image</span>
              </Button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const url = reader.result as string;
                    window.dispatchEvent(new CustomEvent('addImage', { detail: { imageUrl: url } }));
                    if (fabricCanvas) {
                      fabricCanvas.remove(selectedObject);
                      fabricCanvas.renderAll();
                    }
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
            </label>
            <div>
              <Label className="text-xs">Flip</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    selectedObject.set('flipX', !selectedObject.flipX);
                    fabricCanvas?.renderAll();
                  }}
                >
                  Horizontal
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    selectedObject.set('flipY', !selectedObject.flipY);
                    fabricCanvas?.renderAll();
                  }}
                >
                  Vertical
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}