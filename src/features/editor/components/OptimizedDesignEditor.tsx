import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { OptimizedDesignCanvas } from './OptimizedDesignCanvas';
import { ToolPanel } from './ToolPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { EditorChrome, useAutoSave } from '@/features/editor/core';
import { EditorBottomBar } from './EditorBottomBar';
import { ExportDialog } from '@/shared/components/ExportDialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
} from 'lucide-react';
import type { Brand } from '@/shared/types/brand';

interface DesignEditorProps {
  brand: Brand;
  brandId: string;
}

// Performance utilities
const useThrottledCallback = (callback: Function, delay: number) => {
  const lastCall = useRef(0);

  return useCallback((...args: any[]) => {
    const now = Date.now();
    if (now - lastCall.current >= delay) {
      lastCall.current = now;
      callback(...args);
    }
  }, [callback, delay]);
};

export function OptimizedDesignEditor({ brand, brandId }: DesignEditorProps) {
  // Optimized state management
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState('Untitled Design');
  const [showExport, setShowExport] = useState(false);

  // Performance refs
  const canvasActionsRef = useRef<{
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  } | null>(null);

  // Dirty-tick approach: bump tick on canvas changes, save reads canvas at save time
  const [saveTick, setSaveTick] = useState(0);
  const fabricRef = useRef<FabricCanvas | null>(null);

  const { saveState, markDirty, flush, retry } = useAutoSave({
    value: saveTick,
    save: async () => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      try {
        const json = JSON.stringify(canvas.toJSON());
        localStorage.setItem(`design_${brandId}`, json);
      } catch (err) {
        console.error('Auto-save failed:', err);
        throw err;
      }
    },
    debounceMs: 2000,
    enabled: !!fabricCanvas,
  });

  // Cmd+S → immediate flush
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        void flush();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flush]);

  // Optimized canvas actions handler
  const handleCanvasActionsReady = useCallback((actions: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  }) => {
    canvasActionsRef.current = actions;
  }, []);

  const triggerAutoSave = useCallback(() => {
    setSaveTick((t) => t + 1);
    markDirty();
  }, [markDirty]);

  // Optimized canvas ready handler with async loading
  const handleCanvasReady = useCallback(async (canvas: FabricCanvas) => {
    setFabricCanvas(canvas);
    fabricRef.current = canvas;
    setIsLoading(true);

    try {
      // Load saved design asynchronously
      const savedDesign = localStorage.getItem(`design_${brandId}`);
      if (savedDesign) {
        await new Promise<void>((resolve, reject) => {
          try {
            canvas.loadFromJSON(savedDesign, () => {
              canvas.renderAll();
              toast.success('Previous design loaded');
              resolve();
            });
          } catch (error: any) {
            console.error('Error loading saved design:', error);
            reject(error);
          }
        });
      }
    } catch (error) {
      console.error('Failed to load design:', error);
      toast.error('Failed to load previous design');
    } finally {
      setIsLoading(false);
    }

    // Set up auto-save via unified hook
    canvas.on('path:created', triggerAutoSave);
    canvas.on('object:modified', triggerAutoSave);
    canvas.on('object:added', triggerAutoSave);
    canvas.on('object:removed', triggerAutoSave);
  }, [brandId, triggerAutoSave]);

  // Throttled selection change handler
  const handleSelectionChange = useThrottledCallback((object: any) => {
    setSelectedObject(object);
  }, 16); // ~60fps

  // Optimized tool selection with immediate feedback
  const handleToolSelect = useCallback((tool: string) => {
    setSelectedTool(tool);

    // Optimistic UI update
    requestAnimationFrame(() => {
      setSelectedTool(null);
    });
  }, []);

  // Async image handling with progress
  const handleAddImage = useCallback(async (imageUrl: string) => {
    if (!fabricCanvas) return;

    setIsLoading(true);
    try {
      // Dispatch custom event for canvas to handle
      const event = new CustomEvent('addImage', {
        detail: { imageUrl }
      });
      window.dispatchEvent(event);
    } catch (error) {
      toast.error('Failed to add image');
      console.error('Image add error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fabricCanvas]);

  // Optimized object operations
  const handleDeleteObject = useCallback(() => {
    if (!selectedObject || !fabricCanvas) return;

    // Use requestAnimationFrame for smooth deletion
    requestAnimationFrame(() => {
      fabricCanvas.remove(selectedObject);
      fabricCanvas.renderAll();
      setSelectedObject(null);
      toast.success('Deleted');
    });
  }, [selectedObject, fabricCanvas]);

  const handleDuplicateObject = useCallback(async () => {
    if (!selectedObject || !fabricCanvas) return;

    try {
      // Async clone operation
      const cloned = await new Promise((resolve, reject) => {
        selectedObject.clone((clonedObj: any) => {
          if (clonedObj) {
            resolve(clonedObj);
          } else {
            reject(new Error('Clone failed'));
          }
        });
      });

      // Use requestAnimationFrame for smooth addition
      requestAnimationFrame(() => {
        (cloned as any).set({
          left: selectedObject.left + 20,
          top: selectedObject.top + 20,
        });

        fabricCanvas.add(cloned as any);
        fabricCanvas.setActiveObject(cloned as any);
        fabricCanvas.renderAll();
        toast.success('Duplicated');
      });
    } catch (error) {
      toast.error('Failed to duplicate');
      console.error('Duplicate error:', error);
    }
  }, [selectedObject, fabricCanvas]);

  // Smooth zoom handler
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);

    if (fabricCanvas) {
      // Use requestAnimationFrame for smooth zoom
      requestAnimationFrame(() => {
        fabricCanvas.setZoom(newZoom);
        fabricCanvas.renderAll();
      });
    }
  }, [fabricCanvas]);

  // Memoized action handlers to prevent re-renders
  const actionHandlers = useMemo(() => ({
    onUndo: () => canvasActionsRef.current?.undo(),
    onRedo: () => canvasActionsRef.current?.redo(),
    canUndo: canvasActionsRef.current?.canUndo || false,
    canRedo: canvasActionsRef.current?.canRedo || false,
  }), [canvasActionsRef.current?.canUndo, canvasActionsRef.current?.canRedo]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fabricCanvas) {
        fabricCanvas.off('path:created');
        fabricCanvas.off('object:modified');
        fabricCanvas.off('object:added');
        fabricCanvas.off('object:removed');
      }
    };
  }, [fabricCanvas]);

  // Loading state UI
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Editor Chrome — unified top bar */}
      <EditorChrome
        backTo={`/b/${brand.slug || brandId}`}
        breadcrumb={[brand.name, 'Design']}
        title={
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="bg-transparent text-sm font-semibold outline-none w-48 truncate"
            placeholder="Design name"
          />
        }
        saveState={saveState}
        onRetry={retry}
        actions={
          <>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={actionHandlers.onUndo} disabled={!actionHandlers.canUndo}>
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={actionHandlers.onRedo} disabled={!actionHandlers.canRedo}>
              <Redo2 className="h-4 w-4" />
            </Button>
            <div className="h-5 w-px bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoomChange(Math.max(0.1, zoom - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs tabular-nums w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoomChange(Math.min(3, zoom + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleZoomChange(1)}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <div className="h-5 w-px bg-border mx-1" />
            <Button size="sm" onClick={() => setShowExport(true)}>
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </>
        }
      />

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tool Panel */}
        <ToolPanel
          brand={brand}
          onToolSelect={handleToolSelect}
          selectedTool={selectedTool}
          onAddImage={handleAddImage}
        />

        {/* Center Canvas - The main performance-critical component */}
        <OptimizedDesignCanvas
          brand={brand}
          selectedTool={selectedTool}
          onSelectionChange={handleSelectionChange}
          onCanvasReady={handleCanvasReady}
          onActionsReady={handleCanvasActionsReady}
        />

        {/* Right Properties Panel */}
        <PropertiesPanel
          selectedObject={selectedObject}
          brand={brand}
          fabricCanvas={fabricCanvas}
          onDeleteObject={handleDeleteObject}
          onDuplicateObject={handleDuplicateObject}
        />
      </div>

      {/* Bottom Bar */}
      <EditorBottomBar
        brand={brand}
        selectedObject={selectedObject}
      />

      {/* Export Dialog */}
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

      {/* Performance indicator (dev mode only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {Math.round(zoom * 100)}% | {fabricCanvas?.getObjects().length || 0} objects
        </div>
      )}
    </div>
  );
}
