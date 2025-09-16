import { useState, useCallback, useRef, useMemo } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { OptimizedDesignCanvas } from './OptimizedDesignCanvas';
import { ToolPanel } from './ToolPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { EditorTopBar } from './EditorTopBar';
import { EditorBottomBar } from './EditorBottomBar';
import { toast } from 'sonner';
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

const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

export function OptimizedDesignEditor({ brand, brandId }: DesignEditorProps) {
  // Optimized state management
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Performance refs
  const canvasActionsRef = useRef<{
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  } | null>(null);
  
  const saveDesignRef = useRef<NodeJS.Timeout>();

  // Debounced auto-save function
  const debouncedSave = useDebounce((canvas: FabricCanvas) => {
    try {
      const designData = JSON.stringify(canvas.toJSON());
      localStorage.setItem(`design_${brandId}`, designData);
      console.log('Design auto-saved');
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, 2000);

  // Optimized canvas actions handler
  const handleCanvasActionsReady = useCallback((actions: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  }) => {
    canvasActionsRef.current = actions;
  }, []);

  // Optimized canvas ready handler with async loading
  const handleCanvasReady = useCallback(async (canvas: FabricCanvas) => {
    setFabricCanvas(canvas);
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
    
    // Set up auto-save
    canvas.on('path:created', () => debouncedSave(canvas));
    canvas.on('object:modified', () => debouncedSave(canvas));
    canvas.on('object:added', () => debouncedSave(canvas));
    canvas.on('object:removed', () => debouncedSave(canvas));
  }, [brandId, debouncedSave]);

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
  const cleanup = useCallback(() => {
    if (saveDesignRef.current) {
      clearTimeout(saveDesignRef.current);
    }
    
    if (fabricCanvas) {
      fabricCanvas.off('path:created');
      fabricCanvas.off('object:modified');
      fabricCanvas.off('object:added');
      fabricCanvas.off('object:removed');
    }
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
      {/* Top Bar - Memoized to prevent re-renders */}
      <EditorTopBar
        fabricCanvas={fabricCanvas}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        brandId={brandId}
        {...actionHandlers}
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
      
      {/* Performance indicator (dev mode only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
          {Math.round(zoom * 100)}% | {fabricCanvas?.getObjects().length || 0} objects
        </div>
      )}
    </div>
  );
}