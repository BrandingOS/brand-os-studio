import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Circle, Textbox, Image as FabricImage, type FabricObject } from 'fabric';
import type { Brand } from '@/shared/types/brand';
import { EditorToolbar } from './EditorToolbar';
import { EditorPropertiesPanel } from './EditorPropertiesPanel';
import { toast } from 'sonner';

interface CanvasEditorProps {
  brand: Brand;
  width: number;
  height: number;
  templateName: string;
  onClose: () => void;
}

export function CanvasEditor({ brand, width, height, templateName, onClose }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: '#ffffff',
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;

    // Add brand-colored background
    const bg = new Rect({
      left: 0,
      top: 0,
      width,
      height,
      fill: '#ffffff',
      selectable: false,
      evented: false,
      name: 'background',
    });
    canvas.add(bg);
    canvas.sendObjectToBack(bg);

    // Add brand logo if available
    if (brand.logo) {
      FabricImage.fromURL(brand.logo, { crossOrigin: 'anonymous' }).then(img => {
        const scale = Math.min((width * 0.3) / (img.width || 200), (height * 0.2) / (img.height || 100));
        img.set({
          left: width * 0.05,
          top: height * 0.05,
          scaleX: scale,
          scaleY: scale,
          name: 'logo',
        });
        canvas.add(img);
        canvas.renderAll();
      }).catch(() => {});
    }

    // Add brand name text
    const brandTitle = new Textbox(brand.name, {
      left: width * 0.05,
      top: height * 0.35,
      width: width * 0.9,
      fontSize: Math.round(height * 0.08),
      fontFamily: brand.fonts?.primary || 'Inter',
      fontWeight: 'bold',
      fill: brand.primaryColor,
      name: 'brandName',
    });
    canvas.add(brandTitle);

    // Add tagline/tone text
    if (brand.tone) {
      const tagline = new Textbox(brand.tone, {
        left: width * 0.05,
        top: height * 0.48,
        width: width * 0.9,
        fontSize: Math.round(height * 0.035),
        fontFamily: brand.fonts?.primary || 'Inter',
        fill: '#666666',
        name: 'tagline',
      });
      canvas.add(tagline);
    }

    // Add a brand-colored accent shape
    const accent = new Rect({
      left: 0,
      top: height * 0.85,
      width: width,
      height: height * 0.15,
      fill: brand.primaryColor,
      name: 'accentBar',
    });
    canvas.add(accent);

    // Selection events
    canvas.on('selection:created', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });
    canvas.on('selection:updated', (e) => {
      setSelectedObject(e.selected?.[0] || null);
    });
    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    // Fit canvas to container
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth - 48;
      const containerH = containerRef.current.clientHeight - 48;
      const zoom = Math.min(containerW / width, containerH / height, 1);
      setCanvasZoom(zoom);
    }

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [brand, width, height]);

  const addText = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new Textbox('Edit this text', {
      left: width * 0.1,
      top: height * 0.6,
      width: width * 0.8,
      fontSize: Math.round(height * 0.04),
      fontFamily: brand.fonts?.primary || 'Inter',
      fill: '#333333',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [brand, width, height]);

  const addShape = useCallback((type: 'rect' | 'circle') => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const size = Math.min(width, height) * 0.15;
    let shape: FabricObject;
    if (type === 'circle') {
      shape = new Circle({
        left: width * 0.4,
        top: height * 0.4,
        radius: size / 2,
        fill: brand.secondaryColor || brand.primaryColor,
      });
    } else {
      shape = new Rect({
        left: width * 0.4,
        top: height * 0.4,
        width: size,
        height: size,
        fill: brand.secondaryColor || brand.primaryColor,
        rx: 8,
        ry: 8,
      });
    }
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  }, [brand, width, height]);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        FabricImage.fromURL(reader.result as string).then(img => {
          const scale = Math.min((width * 0.4) / (img.width || 200), (height * 0.4) / (img.height || 200));
          img.set({
            left: width * 0.3,
            top: height * 0.3,
            scaleX: scale,
            scaleY: scale,
          });
          canvas.add(img);
          canvas.setActiveObject(img);
          canvas.renderAll();
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [width, height]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active && active.name !== 'background') {
      canvas.remove(active);
      setSelectedObject(null);
      canvas.renderAll();
    }
  }, []);

  const duplicateSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (!active) return;
    active.clone().then((cloned: FabricObject) => {
      cloned.set({ left: (active.left || 0) + 20, top: (active.top || 0) + 20 });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  }, []);

  const bringForward = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) { canvas.bringObjectForward(active); canvas.renderAll(); }
  }, []);

  const sendBackward = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) { canvas.sendObjectBackwards(active); canvas.renderAll(); }
  }, []);

  const handleExport = useCallback(async () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();

    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 3 });
    const link = document.createElement('a');
    const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
    link.download = `${slug}-${templateName.toLowerCase().replace(/\s+/g, '-')}-edited.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Design exported (3x resolution)');
  }, [brand, templateName]);

  const updateSelectedProperty = useCallback((prop: string, value: unknown) => {
    const canvas = fabricRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set(prop as keyof FabricObject, value as never);
    canvas.renderAll();
    setSelectedObject({ ...selectedObject } as FabricObject);
  }, [selectedObject]);

  return (
    <div className="fixed inset-0 z-50 bg-[#1e1e2e] flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-[#2a2a3e] border-b border-[#3a3a4e] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-medium px-3 py-1 rounded hover:bg-white/10 transition-colors">
            ← Back
          </button>
          <div className="w-px h-5 bg-gray-600" />
          <span className="text-white text-sm font-medium">{templateName}</span>
          <span className="text-gray-500 text-xs">{width}×{height}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
            Export PNG
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <EditorToolbar
          onAddText={addText}
          onAddRect={() => addShape('rect')}
          onAddCircle={() => addShape('circle')}
          onAddImage={addImage}
          onDelete={deleteSelected}
          onDuplicate={duplicateSelected}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          brand={brand}
        />

        {/* Canvas Area */}
        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto bg-[#1e1e2e] p-6">
          <div
            className="shadow-2xl"
            style={{
              transform: `scale(${canvasZoom})`,
              transformOrigin: 'center center',
            }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Right Properties Panel */}
        <EditorPropertiesPanel
          selectedObject={selectedObject}
          onUpdate={updateSelectedProperty}
          brand={brand}
        />
      </div>
    </div>
  );
}
