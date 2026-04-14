import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, Textbox, FabricImage, ActiveSelection, Line, Triangle, Polygon, Path, Ellipse, Group } from 'fabric';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';

// ─── Shape geometry helpers ─────────────────────────────────────────
function starPoints(cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / spikes) * i - Math.PI / 2;
    pts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return pts;
}

function regularPolygonPoints(cx: number, cy: number, sides: number, radius: number) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI / sides) * i - Math.PI / 2;
    pts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
  }
  return pts;
}

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

  // Store callbacks in refs so canvas init effect doesn't re-run
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onCanvasReadyRef = useRef(onCanvasReady);
  const onActionsReadyRef = useRef(onActionsReady);
  const saveStateRef = useRef<(canvas?: FabricCanvas) => void>(() => {});
  useEffect(() => { onSelectionChangeRef.current = onSelectionChange; }, [onSelectionChange]);
  useEffect(() => { onCanvasReadyRef.current = onCanvasReady; }, [onCanvasReady]);
  useEffect(() => { onActionsReadyRef.current = onActionsReady; }, [onActionsReady]);
  
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
  useEffect(() => { saveStateRef.current = saveState; }, [saveState]);

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
        const offset = { left: (objectData.left || 0) + 20, top: (objectData.top || 0) + 20 };

        switch (objectData.type) {
          case 'textbox':
          case 'i-text':
            object = new Textbox(objectData.text, { ...objectData, ...offset });
            break;
          case 'rect':
            object = new Rect({ ...objectData, ...offset });
            break;
          case 'circle':
            object = new Circle({ ...objectData, ...offset });
            break;
          case 'triangle':
            object = new Triangle({ ...objectData, ...offset });
            break;
          case 'polygon':
            object = new Polygon(objectData.points || [], { ...objectData, ...offset });
            break;
          case 'path':
            object = new Path(objectData.path, { ...objectData, ...offset });
            break;
          case 'line':
            object = new Line(objectData.points || [0,0,100,0], { ...objectData, ...offset });
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
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      skipTargetFind: false,
      perPixelTargetFind: true,
      enableRetinaScaling: true,
    });

    // Optimized event listeners with proper cleanup
    const selectionHandler = (e: any) => {
      const selected = e.selected?.[0] || e.target || null;
      onSelectionChangeRef.current(selected);
    };

    const modificationHandler = () => {
      requestAnimationFrame(() => {
        canvas.renderAll();
        saveStateRef.current(canvas);
      });
    };

    canvas.on('selection:created', selectionHandler);
    canvas.on('selection:updated', selectionHandler);
    canvas.on('selection:cleared', () => onSelectionChangeRef.current(null));
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
    onCanvasReadyRef.current(canvas);

    if (onActionsReadyRef.current) {
      onActionsReadyRef.current({
        undo,
        redo,
        canUndo: false,
        canRedo: false,
      });
    }

    return () => {
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
    // Only init canvas once — use refs for callbacks so deps don't cause re-init
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  // ─── Object creation ────────────────────────────────────────────
  const addToCanvas = useCallback((obj: any, label: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.add(obj);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    saveState();
    toast.success(`${label} added`);
  }, [saveState]);

  const addText = useCallback((preset?: { size: number; weight: string; text: string }) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const text = new Textbox(preset?.text || 'Add your text here', {
      left: 100,
      top: 100,
      fontFamily: brand.fonts?.primary || 'Inter',
      fill: brand.primaryColor || '#000000',
      fontSize: preset?.size || 24,
      fontWeight: preset?.weight || '400',
      width: 300,
    });
    addToCanvas(text, 'Text');
  }, [brand, addToCanvas]);

  const addShape = useCallback((shape: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const color = brand.primaryColor || '#6366f1';
    const cx = 75, cy = 75;

    switch (shape) {
      case 'rectangle': {
        addToCanvas(new Rect({ left: 100, top: 100, fill: color, width: 150, height: 100 }), 'Rectangle');
        break;
      }
      case 'circle': {
        addToCanvas(new Circle({ left: 100, top: 100, fill: color, radius: 75 }), 'Circle');
        break;
      }
      case 'line': {
        addToCanvas(new Line([50, 200, 350, 200], { stroke: color, strokeWidth: 3, left: 100, top: 100 }), 'Line');
        break;
      }
      case 'triangle': {
        addToCanvas(new Triangle({ left: 100, top: 100, fill: color, width: 150, height: 130 }), 'Triangle');
        break;
      }
      case 'star': {
        const pts = starPoints(cx, cy, 5, 75, 35);
        addToCanvas(new Polygon(pts, { left: 100, top: 100, fill: color }), 'Star');
        break;
      }
      case 'hexagon': {
        const pts = regularPolygonPoints(cx, cy, 6, 75);
        addToCanvas(new Polygon(pts, { left: 100, top: 100, fill: color }), 'Hexagon');
        break;
      }
      case 'diamond': {
        const pts = [{ x: cx, y: 0 }, { x: cx * 2, y: cy }, { x: cx, y: cy * 2 }, { x: 0, y: cy }];
        addToCanvas(new Polygon(pts, { left: 100, top: 100, fill: color }), 'Diamond');
        break;
      }
      case 'heart': {
        const heartPath = 'M 75 20 C 75 20 60 0 40 0 C 15 0 0 18 0 40 C 0 70 37 90 75 120 C 113 90 150 70 150 40 C 150 18 135 0 110 0 C 90 0 75 20 75 20 Z';
        addToCanvas(new Path(heartPath, { left: 100, top: 100, fill: color, scaleX: 1, scaleY: 1 }), 'Heart');
        break;
      }
      case 'arrow': {
        const arrowPath = 'M 0 50 L 120 50 L 120 30 L 170 60 L 120 90 L 120 70 L 0 70 Z';
        addToCanvas(new Path(arrowPath, { left: 100, top: 100, fill: color }), 'Arrow');
        break;
      }
      case 'rounded': {
        addToCanvas(new Rect({ left: 100, top: 100, fill: color, width: 180, height: 80, rx: 20, ry: 20 }), 'Rounded Rect');
        break;
      }
      case 'callout': {
        const calloutPath = 'M 10 0 L 190 0 Q 200 0 200 10 L 200 100 Q 200 110 190 110 L 80 110 L 50 140 L 60 110 L 10 110 Q 0 110 0 100 L 0 10 Q 0 0 10 0 Z';
        addToCanvas(new Path(calloutPath, { left: 100, top: 100, fill: color }), 'Callout');
        break;
      }
      default:
        addToCanvas(new Rect({ left: 100, top: 100, fill: color, width: 150, height: 100 }), 'Shape');
    }
  }, [brand, addToCanvas]);

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

  // Handle tool selection — add object when tool changes
  useEffect(() => {
    if (!selectedTool) return;

    // Text presets: "text:heading", "text:subheading", etc.
    if (selectedTool.startsWith('text:')) {
      const presets: Record<string, { size: number; weight: string; text: string }> = {
        'text:heading':    { size: 48, weight: '700', text: 'Add a heading' },
        'text:subheading': { size: 32, weight: '600', text: 'Add a subheading' },
        'text:body':       { size: 18, weight: '400', text: 'Add body text here. Edit this to write your own content.' },
        'text:caption':    { size: 13, weight: '400', text: 'Caption text' },
      };
      addText(presets[selectedTool]);
      return;
    }

    switch (selectedTool) {
      case 'text':
        addText();
        break;
      case 'rectangle':
      case 'circle':
      case 'line':
      case 'triangle':
      case 'star':
      case 'hexagon':
      case 'diamond':
      case 'heart':
      case 'arrow':
      case 'rounded':
      case 'callout':
        addShape(selectedTool);
        break;
    }
  }, [selectedTool, addText, addShape]);

  // Listen for addImage custom events from parent
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail?.imageUrl;
      if (url) addImage(url);
    };
    window.addEventListener('addImage', handler);
    return () => window.removeEventListener('addImage', handler);
  }, [addImage]);

  // Listen for template load events
  useEffect(() => {
    const handler = async (e: Event) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const { json } = (e as CustomEvent).detail || {};
      if (!json) return;
      try {
        // Clear canvas and load template
        canvas.clear();
        await canvas.loadFromJSON(json);
        canvas.renderAll();
        saveState();
        toast.success('Template loaded');
      } catch (err) {
        console.error('Template load error:', err);
        toast.error('Failed to load template');
      }
    };
    window.addEventListener('loadTemplate', handler);
    return () => window.removeEventListener('loadTemplate', handler);
  }, [saveState]);

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