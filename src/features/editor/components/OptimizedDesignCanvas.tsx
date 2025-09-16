import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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

// Performance monitoring
const PerformanceMonitor = {
  fpsCounter: 0,
  lastTime: performance.now(),
  
  trackFPS() {
    const now = performance.now();
    this.fpsCounter++;
    
    if (now - this.lastTime >= 1000) {
      const fps = Math.round((this.fpsCounter * 1000) / (now - this.lastTime));
      console.log(`Canvas FPS: ${fps}`);
      this.fpsCounter = 0;
      this.lastTime = now;
    }
  }
};

export function OptimizedDesignCanvas({ 
  brand, 
  selectedTool, 
  onSelectionChange, 
  onCanvasReady,
  onActionsReady,
  width = 1080,
  height = 1080 
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);
  
  // Optimized history management with compression and limits
  const historyRef = useRef<{
    states: string[];
    currentIndex: number;
    maxHistory: number;
    debounceTimer: NodeJS.Timeout | null;
  }>({
    states: [],
    currentIndex: -1,
    maxHistory: 50, // Limit history to prevent memory bloat
    debounceTimer: null
  });

  // Debounced state saving (300ms delay)
  const saveState = useCallback((canvas?: FabricCanvas) => {
    const currentCanvas = canvas || fabricCanvasRef.current;
    if (!currentCanvas) return;

    // Clear existing debounce timer
    if (historyRef.current.debounceTimer) {
      clearTimeout(historyRef.current.debounceTimer);
    }

    // Debounce state saving
    historyRef.current.debounceTimer = setTimeout(() => {
      try {
        const state = JSON.stringify(currentCanvas.toJSON());
        const history = historyRef.current;
        
        // Remove states after current index
        history.states = history.states.slice(0, history.currentIndex + 1);
        
        // Add new state
        history.states.push(state);
        history.currentIndex = history.states.length - 1;
        
        // Limit history size
        if (history.states.length > history.maxHistory) {
          history.states = history.states.slice(-history.maxHistory);
          history.currentIndex = history.states.length - 1;
        }

        // Update actions if callback provided
        if (onActionsReady) {
          onActionsReady({
            undo,
            redo,
            canUndo: history.currentIndex > 0,
            canRedo: history.currentIndex < history.states.length - 1,
          });
        }
      } catch (error) {
        console.error('Error saving canvas state:', error);
      }
    }, 300);
  }, [onActionsReady]);

  // Optimized undo function
  const undo = useCallback(() => {
    const history = historyRef.current;
    const canvas = fabricCanvasRef.current;
    
    if (history.currentIndex > 0 && canvas) {
      const previousState = history.states[history.currentIndex - 1];
      
      canvas.loadFromJSON(previousState, () => {
        canvas.renderAll();
        history.currentIndex--;
        
        if (onActionsReady) {
          onActionsReady({
            undo,
            redo,
            canUndo: history.currentIndex > 0,
            canRedo: history.currentIndex < history.states.length - 1,
          });
        }
      });
    }
  }, [onActionsReady]);

  // Optimized redo function
  const redo = useCallback(() => {
    const history = historyRef.current;
    const canvas = fabricCanvasRef.current;
    
    if (history.currentIndex < history.states.length - 1 && canvas) {
      const nextState = history.states[history.currentIndex + 1];
      
      canvas.loadFromJSON(nextState, () => {
        canvas.renderAll();
        history.currentIndex++;
        
        if (onActionsReady) {
          onActionsReady({
            undo,
            redo,
            canUndo: history.currentIndex > 0,
            canRedo: history.currentIndex < history.states.length - 1,
          });
        }
      });
    }
  }, [onActionsReady]);

  // Debounced clipboard operations
  const copy = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      try {
        const cloned = activeObject.toObject();
        navigator.clipboard.writeText(JSON.stringify(cloned));
        toast.success('Copied');
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  }, []);

  // Optimized paste with async handling
  const paste = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    try {
      const text = await navigator.clipboard.readText();
      const objectData = JSON.parse(text);
      
      // Use requestAnimationFrame for smooth pasting
      requestAnimationFrame(() => {
        let object;
        
        switch (objectData.type) {
          case 'textbox':
            object = new Textbox(objectData.text, {
              ...objectData,
              left: objectData.left + 20,
              top: objectData.top + 20,
            });
            break;
          case 'rect':
            object = new Rect({
              ...objectData,
              left: objectData.left + 20,
              top: objectData.top + 20,
            });
            break;
          case 'circle':
            object = new Circle({
              ...objectData,
              left: objectData.left + 20,
              top: objectData.top + 20,
            });
            break;
          default:
            return;
        }
        
        if (object) {
          canvas.add(object);
          canvas.setActiveObject(object);
          canvas.renderAll();
          saveState();
          toast.success('Pasted');
        }
      });
    } catch (error) {
      toast.error('Nothing to paste');
    }
  }, [saveState]);

  // Optimized delete function
  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      // Use requestAnimationFrame for smooth deletion
      requestAnimationFrame(() => {
        canvas.remove(activeObject);
        canvas.renderAll();
        saveState();
        toast.success('Deleted');
      });
    }
  }, [saveState]);

  // Optimized keyboard shortcuts with event delegation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            e.shiftKey ? redo() : undo();
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
            canvas.discardActiveObject();
            const allObjects = canvas.getObjects();
            if (allObjects.length > 0) {
              const selection = new ActiveSelection(allObjects, { canvas });
              canvas.setActiveObject(selection);
              canvas.renderAll();
            }
            break;
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, copy, paste, deleteSelected]);

  // Canvas initialization with performance optimizations
  useEffect(() => {
    if (!canvasRef.current || fabricCanvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      // Performance optimizations
      preserveObjectStacking: true,
      renderOnAddRemove: false,
      skipTargetFind: false,
      perPixelTargetFind: true,
      enableRetinaScaling: true,
      imageSmoothingEnabled: true,
    });

    // Enable object caching for better performance
    canvas.set('objectCaching', true);
    canvas.set('statefullCache', true);

    // Optimized event listeners with proper cleanup
    const selectionHandler = (e: any) => {
      const selected = e.selected?.[0] || e.target || null;
      onSelectionChange(selected);
    };

    const modificationHandler = () => {
      // Use requestAnimationFrame to batch render calls
      requestAnimationFrame(() => {
        canvas.renderAll();
        saveState(canvas);
      });
    };

    // Add event listeners
    canvas.on('selection:created', selectionHandler);
    canvas.on('selection:updated', selectionHandler);
    canvas.on('selection:cleared', () => onSelectionChange(null));
    canvas.on('object:modified', modificationHandler);
    canvas.on('object:added', modificationHandler);
    canvas.on('object:removed', modificationHandler);

    // Performance monitoring
    canvas.on('after:render', () => {
      PerformanceMonitor.trackFPS();
    });

    // Initialize history with empty state
    const initialState = JSON.stringify(canvas.toJSON());
    historyRef.current.states = [initialState];
    historyRef.current.currentIndex = 0;

    fabricCanvasRef.current = canvas;
    onCanvasReady(canvas);

    // Initialize actions
    if (onActionsReady) {
      onActionsReady({
        undo,
        redo,
        canUndo: false,
        canRedo: false,
      });
    }

    return () => {
      // Cleanup
      canvas.off('selection:created', selectionHandler);
      canvas.off('selection:updated', selectionHandler);
      canvas.off('selection:cleared');
      canvas.off('object:modified', modificationHandler);
      canvas.off('object:added', modificationHandler);
      canvas.off('object:removed', modificationHandler);
      canvas.off('after:render');
      
      if (historyRef.current.debounceTimer) {
        clearTimeout(historyRef.current.debounceTimer);
      }
      
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [width, height, onSelectionChange, onCanvasReady, onActionsReady, saveState, undo, redo]);

  // Optimized object creation functions with memoization
  const addText = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const text = new Textbox('Add your text here', {
      left: 100,
      top: 100,
      fontFamily: brand.fonts?.primary || 'Arial',
      fill: brand.primaryColor || '#000000',
      fontSize: 24,
      width: 300,
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
    saveState();
    toast.success('Text added');
  }, [brand, saveState]);

  const addShape = useCallback((shape: 'rectangle' | 'circle') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

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

    canvas.add(object);
    canvas.setActiveObject(object);
    canvas.renderAll();
    saveState();
    toast.success(`${shape} added`);
  }, [brand, saveState]);

  // Async image loading with progress indication
  const addImage = useCallback(async (imageUrl: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    try {
      toast.loading('Loading image...');
      
      const img = await FabricImage.fromURL(imageUrl, {
        crossOrigin: 'anonymous'
      });
      
      img.scale(0.5);
      img.set({ left: 100, top: 100 });
      
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();
      saveState();
      
      toast.dismiss();
      toast.success('Image added');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to load image');
      console.error('Image loading error:', error);
    }
  }, [saveState]);

  // Handle tool selection with optimization
  useEffect(() => {
    if (!selectedTool) return;

    // Use requestAnimationFrame for smooth tool activation
    requestAnimationFrame(() => {
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
    });
  }, [selectedTool, addText, addShape]);

  // Optimized zoom with smooth transitions
  const handleZoom = useCallback((newZoom: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    
    setZoom(newZoom);
    
    // Use requestAnimationFrame for smooth zoom
    requestAnimationFrame(() => {
      canvas.setZoom(newZoom);
      canvas.renderAll();
    });
  }, []);

  // Memoized canvas container style
  const canvasContainerStyle = useMemo(() => ({
    transform: `scale(${zoom})`,
    transformOrigin: 'center',
    transition: 'transform 0.2s ease-out'
  }), [zoom]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Canvas Container */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div 
          className="relative bg-white shadow-lg"
          style={canvasContainerStyle}
        >
          {/* Canvas dimensions guide */}
          <div className="absolute -top-6 left-0 text-xs text-gray-500">
            {width} × {height}px
          </div>
          
          <canvas 
            ref={canvasRef}
            className="border border-gray-200"
          />
          
          {/* Performance optimized grid pattern */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0,0,0,.05) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,.05) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              backgroundPosition: '-1px -1px'
            }}
          />
        </div>
      </div>

      {/* Optimized Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
        <button
          onClick={() => handleZoom(Math.max(0.1, zoom - 0.1))}
          className="px-3 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
        >
          −
        </button>
        <span className="text-sm px-2 min-w-12 text-center">{Math.round(zoom * 100)}%</span>
        <button
          onClick={() => handleZoom(Math.min(3, zoom + 0.1))}
          className="px-3 py-1 text-sm hover:bg-gray-100 rounded transition-colors"
        >
          +
        </button>
        <button
          onClick={() => handleZoom(1)}
          className="px-3 py-1 text-sm hover:bg-gray-100 rounded border-l ml-1 pl-2 transition-colors"
        >
          Fit
        </button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3 text-xs text-gray-600 max-w-48">
        <div className="font-medium mb-1">⌨️ Shortcuts:</div>
        <div>Ctrl+Z: Undo • Ctrl+Y: Redo</div>
        <div>Ctrl+C: Copy • Ctrl+V: Paste</div>
        <div>Delete: Remove • Ctrl+A: Select All</div>
      </div>
    </div>
  );
}