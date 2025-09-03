import { useState, useEffect } from 'react';
import { Lightbulb, Palette, Type } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface EditorBottomBarProps {
  brand: Brand;
  selectedObject: any;
}

export function EditorBottomBar({ brand, selectedObject }: EditorBottomBarProps) {
  const [currentTip, setCurrentTip] = useState(0);

  const tips = [
    "Use your brand colors from the palette to maintain consistency",
    "Hold Shift while dragging to constrain proportions",
    "Double-click text to edit it directly",
    "Use Ctrl+D (Cmd+D) to duplicate selected objects",
    "Right-click for context menu options",
    "Use the rulers and guides for precise alignment",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % tips.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [tips.length]);

  const getStatusInfo = () => {
    if (selectedObject) {
      const type = selectedObject.type;
      const x = Math.round(selectedObject.left || 0);
      const y = Math.round(selectedObject.top || 0);
      return `${type} selected at (${x}, ${y})`;
    }
    return 'No selection';
  };

  return (
    <div className="h-10 border-t bg-muted/30 flex items-center justify-between px-4 text-sm">
      {/* Left - Tips */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lightbulb className="h-4 w-4" />
        <span className="transition-opacity duration-300">
          Tip: {tips[currentTip]}
        </span>
      </div>

      {/* Center - Status */}
      <div className="flex items-center gap-4 text-muted-foreground">
        <span>{getStatusInfo()}</span>
        <span>•</span>
        <div className="flex items-center gap-1">
          <Palette className="h-3 w-3" />
          <span>{brand.name}</span>
        </div>
      </div>

      {/* Right - Design Info */}
      <div className="flex items-center gap-4 text-muted-foreground">
        <div className="flex items-center gap-1">
          <Type className="h-3 w-3" />
          <span>{brand.fonts.primary || 'Arial'}</span>
        </div>
        <span>1080 × 1080px</span>
        <span className="text-green-600">●</span>
        <span>Saved</span>
      </div>
    </div>
  );
}