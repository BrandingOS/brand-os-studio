import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ColorPicker } from '@/components/ui/color-picker';
import { Palette, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColorPickerPopoverProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
}

const COLOR_PRESETS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#FF0000', '#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#4ECDC4',
  '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA', '#F1948A', '#AED6F1'
];

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  color,
  onChange,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempColor, setTempColor] = useState(color);

  const handleColorChange = (newColor: string) => {
    setTempColor(newColor);
    onChange(newColor);
  };

  const handleReset = () => {
    const resetColor = '#000000';
    setTempColor(resetColor);
    onChange(resetColor);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-8 p-0 bg-white/90 hover:bg-white shadow-lg border border-border',
            className
          )}
        >
          <Palette className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Choose Color</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-7 px-2"
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
          
          <ColorPicker
            value={tempColor}
            onChange={handleColorChange}
            presets={COLOR_PRESETS}
          />
          
          <div className="flex items-center gap-2 pt-2 border-t">
            <div
              className="w-6 h-6 rounded border border-border flex-shrink-0"
              style={{ backgroundColor: tempColor }}
            />
            <span className="text-xs font-mono text-muted-foreground">
              {tempColor.toUpperCase()}
            </span>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onChange(tempColor);
                setIsOpen(false);
              }}
              className="flex-1"
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};