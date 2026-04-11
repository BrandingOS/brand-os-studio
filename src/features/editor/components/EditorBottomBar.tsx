/**
 * Editor Bottom Bar — Canva-style status bar with zoom slider.
 */
import { Grid3X3, Maximize, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Brand } from '@/shared/types/brand';

interface EditorBottomBarProps {
  brand: Brand;
  selectedObject: any;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
}

export function EditorBottomBar({
  brand,
  selectedObject,
  zoom = 1,
  onZoomChange,
  showGrid,
  onToggleGrid,
}: EditorBottomBarProps) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="h-10 border-t border-border bg-background flex items-center justify-between px-3 text-xs text-muted-foreground">
      {/* Left — Selection info */}
      <div className="flex items-center gap-3 min-w-0">
        {selectedObject ? (
          <span>
            {selectedObject.type} · {Math.round(selectedObject.left || 0)}, {Math.round(selectedObject.top || 0)}
          </span>
        ) : (
          <span>{brand.name}</span>
        )}
      </div>

      {/* Center — Zoom controls */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onZoomChange?.(Math.max(0.1, zoom - 0.1))}>
          <Minus className="h-3 w-3" />
        </Button>
        <input
          type="range"
          min={10}
          max={300}
          value={zoomPercent}
          onChange={(e) => onZoomChange?.(Number(e.target.value) / 100)}
          className="w-24 h-1 accent-primary cursor-pointer"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onZoomChange?.(Math.min(3, zoom + 0.1))}>
          <Plus className="h-3 w-3" />
        </Button>
        <span className="w-10 text-center font-mono tabular-nums">{zoomPercent}%</span>
      </div>

      {/* Right — Grid + Fullscreen */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon" className={`h-7 w-7 ${showGrid ? 'text-primary' : ''}`}
          onClick={() => onToggleGrid?.()}
          title="Toggle grid"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon" className="h-7 w-7"
          onClick={() => document.documentElement.requestFullscreen?.()}
          title="Fullscreen"
        >
          <Maximize className="h-3.5 w-3.5" />
        </Button>
        <span className="ml-2">1080 × 1080</span>
      </div>
    </div>
  );
}
