import { useState } from 'react';
import {
  Undo2,
  Redo2,
  Save,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Settings,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Input } from '@/shared/ui/Input';
import { NavLink } from 'react-router-dom';
import { toast } from 'sonner';
import { ExportDialog } from '@/shared/components/ExportDialog';
import type { ExportFormat } from '@/shared/services/export/types';

interface EditorTopBarProps {
  fabricCanvas: any;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  brandSlug: string;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export function EditorTopBar({ 
  fabricCanvas, 
  zoom, 
  onZoomChange, 
  brandSlug,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
}: EditorTopBarProps) {
  const [fileName, setFileName] = useState('Untitled Design');
  const [showExport, setShowExport] = useState(false);

  const handleUndo = () => {
    if (onUndo) {
      onUndo();
    } else {
      toast.info('Undo functionality not available');
    }
  };

  const handleRedo = () => {
    if (onRedo) {
      onRedo();
    } else {
      toast.info('Redo functionality not available');
    }
  };

  const handleSave = () => {
    if (fabricCanvas) {
      // Save design to local storage or backend
      const designData = JSON.stringify(fabricCanvas.toJSON());
      localStorage.setItem(`design_${brandSlug}`, designData);
      toast.success('Design saved successfully');
    }
  };

  const handleExport = () => {
    if (fabricCanvas) {
      setShowExport(true);
    }
  };

  const handlePreview = () => {
    toast.info('Preview mode coming soon');
  };

  return (
    <div className="h-14 border-b bg-background flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <NavLink 
          to={`/dashboard/brand/${brandSlug}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Brand</span>
        </NavLink>
        
        <div className="h-6 w-px bg-border" />
        
        <Input
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
          className="w-64 h-8 text-sm font-medium bg-transparent border-none shadow-none px-2 focus:bg-background"
          placeholder="Design name"
        />
      </div>

      {/* Center Section - Actions */}
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleUndo}
          disabled={!canUndo}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRedo}
          disabled={!canRedo}
        >
          <Redo2 className="h-4 w-4" />
        </Button>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <Button variant="ghost" size="sm" onClick={() => onZoomChange(Math.max(0.1, zoom - 0.1))}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm px-2 font-mono w-16 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={() => onZoomChange(Math.min(3, zoom + 0.1))}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <div className="h-6 w-px bg-border mx-2" />
        
        <Button variant="ghost" size="sm" onClick={() => onZoomChange(1)}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handlePreview}>
          <Play className="h-4 w-4" />
        </Button>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm">
          <Settings className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={handleSave}>
          <Save className="h-4 w-4 mr-1" />
          Save
        </Button>
        <Button size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1" />
          Export
        </Button>
      </div>

      {/* Export Dialog with true vector SVG support */}
      {fabricCanvas && (
        <ExportDialog
          open={showExport}
          onClose={() => setShowExport(false)}
          source={{
            type: 'fabric-canvas',
            fabricCanvas,
          }}
          availableFormats={['png', 'jpg', 'svg', 'pdf-flat']}
          defaultFilename={fileName.toLowerCase().replace(/\s+/g, '-') || 'design'}
          title="Export Design"
        />
      )}
    </div>
  );
}