/**
 * Editor Bottom Bar — status bar with zoom, layers toggle, and canvas size presets.
 */
import { Grid3X3, Maximize, Minus, Plus, Layers, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Brand } from '@/shared/types/brand';

const SIZE_PRESETS = [
  { label: 'Instagram Post', width: 1080, height: 1080 },
  { label: 'Instagram Story', width: 1080, height: 1920 },
  { label: 'Facebook Cover', width: 1640, height: 856 },
  { label: 'Twitter Post', width: 1200, height: 675 },
  { label: 'Presentation 16:9', width: 1920, height: 1080 },
  { label: 'A4 Portrait', width: 2480, height: 3508 },
  { label: 'Logo Square', width: 500, height: 500 },
  { label: 'YouTube Thumbnail', width: 1280, height: 720 },
];

interface EditorBottomBarProps {
  brand: Brand;
  selectedObject: any;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  showGrid?: boolean;
  onToggleGrid?: () => void;
  showLayers?: boolean;
  onToggleLayers?: () => void;
  canvasWidth?: number;
  canvasHeight?: number;
  onCanvasSizeChange?: (width: number, height: number) => void;
  isDrawingMode?: boolean;
}

export function EditorBottomBar({
  brand,
  selectedObject,
  zoom = 1,
  onZoomChange,
  showGrid,
  onToggleGrid,
  showLayers,
  onToggleLayers,
  canvasWidth = 1080,
  canvasHeight = 1080,
  onCanvasSizeChange,
  isDrawingMode,
}: EditorBottomBarProps) {
  const zoomPercent = Math.round(zoom * 100);
  const currentSizeKey = `${canvasWidth}x${canvasHeight}`;
  const matchedPreset = SIZE_PRESETS.find((p) => p.width === canvasWidth && p.height === canvasHeight);

  return (
    <div className="h-10 border-t border-border bg-background flex items-center justify-between px-3 text-xs text-muted-foreground">
      {/* Left — Selection info + drawing indicator */}
      <div className="flex items-center gap-3 min-w-0">
        {isDrawingMode && (
          <span className="flex items-center gap-1 text-primary font-medium">
            <Pencil className="h-3 w-3" /> Drawing
          </span>
        )}
        {selectedObject ? (
          <span>
            {selectedObject.type} · {Math.round(selectedObject.left || 0)}, {Math.round(selectedObject.top || 0)}
          </span>
        ) : (
          !isDrawingMode && <span>{brand.name}</span>
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

      {/* Right — Layers, Grid, Size, Fullscreen */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost" size="icon"
          className={`h-7 w-7 ${showLayers ? 'text-primary bg-primary/10' : ''}`}
          onClick={() => onToggleLayers?.()}
          title="Toggle layers panel"
        >
          <Layers className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost" size="icon"
          className={`h-7 w-7 ${showGrid ? 'text-primary' : ''}`}
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
        <div className="ml-1 border-l border-border pl-2">
          <Select
            value={currentSizeKey}
            onValueChange={(v) => {
              const [w, h] = v.split('x').map(Number);
              onCanvasSizeChange?.(w, h);
            }}
          >
            <SelectTrigger className="h-6 w-auto min-w-[120px] border-0 bg-transparent text-xs px-1">
              <SelectValue>
                {matchedPreset ? matchedPreset.label : `${canvasWidth} × ${canvasHeight}`}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SIZE_PRESETS.map((preset) => (
                <SelectItem key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                  <span className="flex items-center justify-between gap-4 w-full">
                    <span>{preset.label}</span>
                    <span className="text-muted-foreground">{preset.width}×{preset.height}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
