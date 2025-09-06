import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, Textbox, FabricImage, ActiveSelection } from 'fabric';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';

interface DesignCanvasProps {
  brand: Brand;
  selectedTool: string | null;
  onSelectionChange: (object: any) => void;
  onCanvasReady: (canvas: FabricCanvas) => void;
  onActionsReady?: (actions: {
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
  }) => void;
  width?: number;
  height?: number;
}

export function DesignCanvas({ 
  brand, 
  selectedTool, 
  onSelectionChange, 
  onCanvasReady,
  onActionsReady,
  width = 1080,
  height = 1080 
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Save canvas state for undo/redo
  const saveState = useCallback((canvas?: FabricCanvas) => {
    if (!canvas && !fabricCanvas) return;
    const currentCanvas = canvas || fabricCanvas!;
    const state = JSON.stringify(currentCanvas.toJSON());
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(state);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  }, [fabricCanvas, history, historyStep]);

  // Undo function
  const undo = useCallback(() => {
    if (historyStep > 0 && fabricCanvas) {
      const previousState = history[historyStep - 1];
      fabricCanvas.loadFromJSON(previousState, () => {
        fabricCanvas.renderAll();
        setHistoryStep(historyStep - 1);
      });
    }
  }, [fabricCanvas, history, historyStep]);

  // Redo function
  const redo = useCallback(() => {
    if (historyStep < history.length - 1 && fabricCanvas) {
      const nextState = history[historyStep + 1];
      fabricCanvas.loadFromJSON(nextState, () => {
        fabricCanvas.renderAll();
        setHistoryStep(historyStep + 1);
      });
    }
  }, [fabricCanvas, history, historyStep]);

  // Copy selected object
  const copy = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      const cloned = activeObject.toObject();
      navigator.clipboard.writeText(JSON.stringify(cloned));
      toast.success('Object copied');
    }
  }, [fabricCanvas]);

  // Paste from clipboard
  const paste = useCallback(async () => {
    if (!fabricCanvas) return;
    try {
      const text = await navigator.clipboard.readText();
      const objectData = JSON.parse(text);
      
      // Create object from clipboard data
      if (objectData.type === 'textbox') {
        const textObj = new Textbox(objectData.text, {
          ...objectData,
          left: objectData.left + 20,
          top: objectData.top + 20,
        });
        fabricCanvas.add(textObj);
      } else if (objectData.type === 'rect') {
        const rectObj = new Rect({
          ...objectData,
          left: objectData.left + 20,
          top: objectData.top + 20,
        });
        fabricCanvas.add(rectObj);
      } else if (objectData.type === 'circle') {
        const circleObj = new Circle({
          ...objectData,
          left: objectData.left + 20,
          top: objectData.top + 20,
        });
        fabricCanvas.add(circleObj);
      }
      
      fabricCanvas.renderAll();
      saveState();
      toast.success('Object pasted');
    } catch (error) {
      toast.error('Nothing to paste');
    }
  }, [fabricCanvas, saveState]);

  // Delete selected object
  const deleteSelected = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject) {
      fabricCanvas.remove(activeObject);
      fabricCanvas.renderAll();
      saveState();
      toast.success('Object deleted');
    }
  }, [fabricCanvas, saveState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!fabricCanvas) return;
      
      // Prevent default browser shortcuts
      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'c':
            e.preventDefault();
            copy();
            break;
          case 'v':
            e.preventDefault();
            paste();
            break;
          case 'a':
            e.preventDefault();
            fabricCanvas.discardActiveObject();
            const allObjects = fabricCanvas.getObjects();
            const selection = new ActiveSelection(allObjects, {
              canvas: fabricCanvas,
            });
            fabricCanvas.setActiveObject(selection);
            fabricCanvas.renderAll();
            break;
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, undo, redo, copy, paste, deleteSelected]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
    });

    // Set up event listeners
    canvas.on('selection:created', (e) => {
      onSelectionChange(e.selected?.[0] || null);
    });

    canvas.on('selection:updated', (e) => {
      onSelectionChange(e.selected?.[0] || null);
    });

    canvas.on('selection:cleared', () => {
      onSelectionChange(null);
    });

    // Track canvas changes for undo/redo
    canvas.on('object:added', () => saveState(canvas));
    canvas.on('object:removed', () => saveState(canvas));
    canvas.on('object:modified', () => saveState(canvas));

    // Initialize with empty state
    saveState(canvas);

    setFabricCanvas(canvas);
    onCanvasReady(canvas);

    // Pass actions to parent if callback provided
    if (onActionsReady) {
      onActionsReady({
        undo,
        redo,
        canUndo: historyStep > 0,
        canRedo: historyStep < history.length - 1,
      });
    }

    return () => {
      canvas.dispose();
    };
  }, [width, height, onSelectionChange, onCanvasReady, onActionsReady, saveState, undo, redo, historyStep, history]);

  const addText = useCallback(() => {
    if (!fabricCanvas) return;

    const text = new Textbox('Add your text here', {
      left: 100,
      top: 100,
      fontFamily: brand.fonts.primary || 'Arial',
      fill: brand.primaryColor || '#000000',
      fontSize: 24,
      width: 300,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    toast.success('Text added to canvas');
  }, [fabricCanvas, brand]);

  const addShape = useCallback((shape: 'rectangle' | 'circle') => {
    if (!fabricCanvas) return;

    let object;
    
    if (shape === 'rectangle') {
      object = new Rect({
        left: 100,
        top: 100,
        fill: brand.primaryColor || '#000000',
        width: 150,
        height: 100,
      });
    } else {
      object = new Circle({
        left: 100,
        top: 100,
        fill: brand.primaryColor || '#000000',
        radius: 75,
      });
    }

    fabricCanvas.add(object);
    fabricCanvas.setActiveObject(object);
    toast.success(`${shape.charAt(0).toUpperCase() + shape.slice(1)} added to canvas`);
  }, [fabricCanvas, brand]);

  const addImage = useCallback((imageUrl: string) => {
    if (!fabricCanvas) return;

    FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous'
    }).then((img) => {
      img.scale(0.5);
      img.set({ left: 100, top: 100 });
      fabricCanvas.add(img);
      fabricCanvas.setActiveObject(img);
      toast.success('Image added to canvas');
    });
  }, [fabricCanvas]);

  // Handle tool selection effects
  useEffect(() => {
    if (!selectedTool) return;

    switch (selectedTool) {
      case 'text':
        addText();
        break;
      case 'rectangle':
        addShape('rectangle');
        break;
      case 'circle':
        addShape('circle');
        break;
    }
  }, [selectedTool, addText, addShape]);

  const handleZoom = (newZoom: number) => {
    if (!fabricCanvas) return;
    
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div 
          className="relative bg-white shadow-lg"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'center'
          }}
        >
          {/* Canvas dimensions guide */}
          <div className="absolute -top-6 left-0 text-xs text-gray-500">
            {width} × {height}px
          </div>
          
          <canvas 
            ref={canvasRef}
            className="border border-gray-200"
          />
          
          {/* Grid pattern outside canvas */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '-1px -1px'
            }}
          />
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={() => handleZoom(Math.max(0.1, zoom - 0.1))}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
        >
          −
        </button>
        <span className="text-sm px-2">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => handleZoom(Math.min(3, zoom + 0.1))}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(1)}
          className="px-2 py-1 text-sm hover:bg-gray-100 rounded border-l ml-1 pl-2"
        >
          Fit
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs text-gray-600">
        <div className="font-medium mb-1">Shortcuts:</div>
        <div>Ctrl+Z: Undo</div>
        <div>Ctrl+Shift+Z: Redo</div>
        <div>Ctrl+C: Copy</div>
        <div>Ctrl+V: Paste</div>
        <div>Delete: Remove</div>
        <div>Ctrl+A: Select All</div>
      </div>
    </div>
  );
}