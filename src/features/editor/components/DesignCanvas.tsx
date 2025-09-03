import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, Textbox, FabricImage } from 'fabric';
import { toast } from 'sonner';
import type { Brand } from '@/shared/types/brand';

interface DesignCanvasProps {
  brand: Brand;
  selectedTool: string | null;
  onSelectionChange: (object: any) => void;
  onCanvasReady: (canvas: FabricCanvas) => void;
  width?: number;
  height?: number;
}

export function DesignCanvas({ 
  brand, 
  selectedTool, 
  onSelectionChange, 
  onCanvasReady,
  width = 1080,
  height = 1080 
}: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [zoom, setZoom] = useState(1);

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

    setFabricCanvas(canvas);
    onCanvasReady(canvas);

    return () => {
      canvas.dispose();
    };
  }, [width, height, onSelectionChange, onCanvasReady]);

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
    </div>
  );
}