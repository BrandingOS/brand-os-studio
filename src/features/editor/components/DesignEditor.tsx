import { useState, useCallback, useRef } from 'react';
import { Canvas as FabricCanvas } from 'fabric';
import { DesignCanvas } from './DesignCanvas';
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

export function DesignEditor({ brand, brandId }: DesignEditorProps) {
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasActionsRef = useRef<{
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  } | null>(null);

  const handleCanvasActionsReady = useCallback((actions: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  }) => {
    canvasActionsRef.current = actions;
  }, []);

  const handleCanvasReady = useCallback((canvas: FabricCanvas) => {
    setFabricCanvas(canvas);
    
    // Load saved design if exists
    const savedDesign = localStorage.getItem(`design_${brandId}`);
    if (savedDesign) {
      try {
        canvas.loadFromJSON(savedDesign, () => {
          canvas.renderAll();
          toast.success('Previous design loaded');
        });
      } catch (error) {
        console.error('Error loading saved design:', error);
      }
    }
  }, [brandId]);

  const handleSelectionChange = useCallback((object: any) => {
    setSelectedObject(object);
  }, []);

  const handleToolSelect = useCallback((tool: string) => {
    setSelectedTool(tool);
    // Reset tool after use
    setTimeout(() => setSelectedTool(null), 100);
  }, []);

  const handleAddImage = useCallback((imageUrl: string) => {
    if (!fabricCanvas) return;
    
    // This will be handled by the canvas component
    const event = new CustomEvent('addImage', { detail: { imageUrl } });
    window.dispatchEvent(event);
  }, [fabricCanvas]);

  const handleDeleteObject = useCallback(() => {
    if (selectedObject && fabricCanvas) {
      fabricCanvas.remove(selectedObject);
      setSelectedObject(null);
      toast.success('Object deleted');
    }
  }, [selectedObject, fabricCanvas]);

  const handleDuplicateObject = useCallback(() => {
    if (selectedObject && fabricCanvas) {
      selectedObject.clone((cloned: any) => {
        cloned.set({
          left: selectedObject.left + 20,
          top: selectedObject.top + 20,
        });
        fabricCanvas.add(cloned);
        fabricCanvas.setActiveObject(cloned);
        toast.success('Object duplicated');
      });
    }
  }, [selectedObject, fabricCanvas]);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    if (fabricCanvas) {
      fabricCanvas.setZoom(newZoom);
      fabricCanvas.renderAll();
    }
  }, [fabricCanvas]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <EditorTopBar
        fabricCanvas={fabricCanvas}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        brandSlug={brandId}
        onUndo={() => canvasActionsRef.current?.undo()}
        onRedo={() => canvasActionsRef.current?.redo()}
        canUndo={canvasActionsRef.current?.canUndo || false}
        canRedo={canvasActionsRef.current?.canRedo || false}
      />

      {/* Main Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tool Panel */}
        <ToolPanel
          brand={brand}
          onToolSelect={handleToolSelect}
          selectedTool={selectedTool}
          onAddImage={handleAddImage}
        />

        {/* Center Canvas */}
        <DesignCanvas
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
    </div>
  );
}