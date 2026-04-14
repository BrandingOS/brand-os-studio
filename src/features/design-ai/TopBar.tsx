import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Undo2, Redo2, ZoomIn, ZoomOut, Maximize2, Download, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDesignAiStore } from './store';
import type { Brand } from '@/shared/types/brand';

interface Props {
  brand?: Brand;
  slug: string;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  onExport: () => void;
}

export function TopBar({
  brand,
  slug,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  onExport,
}: Props) {
  const navigate = useNavigate();
  const zoom = useDesignAiStore((s) => s.zoom);
  const canUndo = useDesignAiStore((s) => s.past.length > 1);
  const canRedo = useDesignAiStore((s) => s.future.length > 0);

  return (
    <header className="h-12 shrink-0 border-b flex items-center justify-between px-3 bg-white/90 backdrop-blur z-20">
      <div className="flex items-center gap-2 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(`/b/${slug}`)}
          title="Back to brand"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2 px-2 min-w-0">
          <Palette className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-semibold truncate">Design with AI</span>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            · {brand?.name ?? slug}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canUndo}
          onClick={onUndo}
          title="Undo (⌘Z)"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          disabled={!canRedo}
          onClick={onRedo}
          title="Redo (⇧⌘Z)"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomOut} title="Zoom out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <button
          onClick={onZoomFit}
          className="text-xs font-medium text-muted-foreground hover:text-foreground tabular-nums w-12 text-center"
          title="Zoom to fit"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onZoomIn} title="Zoom in">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onZoomFit}
          title="Fit to screen"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
        <div className="h-5 w-px bg-border mx-1" />
        <Button size="sm" className="h-8 gap-1.5" onClick={onExport}>
          <Download className="h-3.5 w-3.5" />
          <span className="text-xs">Export</span>
        </Button>
      </div>
    </header>
  );
}
