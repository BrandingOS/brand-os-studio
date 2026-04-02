import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, Rect, Circle, Textbox, Image as FabricImage, type FabricObject } from 'fabric';
import type { Brand } from '@/shared/types/brand';
import type { BrandKitTemplate } from '../../types';
import { EditorToolbar } from './EditorToolbar';
import { EditorPropertiesPanel } from './EditorPropertiesPanel';
import { toast } from 'sonner';

interface CanvasEditorProps {
  brand: Brand;
  template: BrandKitTemplate;
  onClose: () => void;
}

// ─── Template Content Definitions ──────────────────────────────

interface TemplateContent {
  bgColor: string;
  elements: Array<{
    type: 'text' | 'rect' | 'circle' | 'logo';
    x: number; y: number; w?: number; h?: number;
    text?: string; fontSize?: number; fontWeight?: string; fill?: string;
    fontFamily?: string; textAlign?: string; radius?: number;
    rx?: number; ry?: number; opacity?: number; name?: string;
  }>;
}

function getTemplateContent(template: BrandKitTemplate, brand: Brand, w: number, h: number): TemplateContent {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';
  const font = brand.fonts?.primary || 'Inter';
  const displayFont = brand.fonts?.secondary || font;
  const name = brand.name;
  const domain = `${name.toLowerCase().replace(/\s+/g, '')}.com`;

  switch (template.type) {
    case 'business-cards':
      return {
        bgColor: '#ffffff',
        elements: [
          { type: 'logo', x: w * 0.06, y: h * 0.08, w: w * 0.25, h: h * 0.15, name: 'logo' },
          { type: 'text', x: w * 0.06, y: h * 0.35, w: w * 0.88, text: 'Jane Smith', fontSize: h * 0.08, fontWeight: '600', fill: '#1a1a1a', fontFamily: displayFont, name: 'name' },
          { type: 'text', x: w * 0.06, y: h * 0.46, w: w * 0.88, text: 'Brand Manager', fontSize: h * 0.05, fill: p, fontFamily: font, name: 'title' },
          { type: 'text', x: w * 0.06, y: h * 0.62, w: w * 0.88, text: `+1 234 56789`, fontSize: h * 0.04, fill: '#666666', fontFamily: font, name: 'phone' },
          { type: 'text', x: w * 0.06, y: h * 0.70, w: w * 0.88, text: `jane@${domain}`, fontSize: h * 0.04, fill: '#666666', fontFamily: font, name: 'email' },
          { type: 'text', x: w * 0.06, y: h * 0.78, w: w * 0.88, text: domain, fontSize: h * 0.04, fill: '#666666', fontFamily: font, name: 'website' },
          { type: 'rect', x: 0, y: h * 0.92, w: w, h: h * 0.08, fill: p, name: 'accent' },
        ],
      };

    case 'facebook-covers':
      return {
        bgColor: p,
        elements: [
          { type: 'logo', x: w * 0.05, y: h * 0.15, w: w * 0.2, h: h * 0.2, name: 'logo' },
          { type: 'text', x: w * 0.05, y: h * 0.45, w: w * 0.55, text: brand.guidelines?.strategy?.positioning || `${name} — Financial Intelligence`, fontSize: h * 0.1, fontWeight: '700', fill: '#ffffff', fontFamily: displayFont, name: 'headline' },
          { type: 'text', x: w * 0.05, y: h * 0.75, w: w * 0.4, text: domain, fontSize: h * 0.05, fill: 'rgba(255,255,255,0.6)', fontFamily: font, name: 'url' },
          { type: 'circle', x: w * 0.82, y: h * 0.3, radius: h * 0.25, fill: s, opacity: 0.15, name: 'accent-circle' },
        ],
      };

    case 'instagram-posts':
      return {
        bgColor: p,
        elements: [
          { type: 'logo', x: w * 0.06, y: w * 0.06, w: w * 0.15, h: w * 0.08, name: 'logo' },
          { type: 'text', x: w * 0.06, y: w * 0.35, w: w * 0.88, text: '"The future belongs to those who build with clarity."', fontSize: w * 0.055, fontWeight: '600', fill: '#ffffff', fontFamily: displayFont, name: 'quote' },
          { type: 'rect', x: w * 0.06, y: w * 0.65, w: w * 0.15, h: 3, fill: s, name: 'divider' },
          { type: 'text', x: w * 0.06, y: w * 0.72, w: w * 0.5, text: domain, fontSize: w * 0.03, fill: 'rgba(255,255,255,0.5)', fontFamily: font, name: 'url' },
        ],
      };

    case 'instagram-stories':
      return {
        bgColor: p,
        elements: [
          { type: 'logo', x: w * 0.08, y: h * 0.05, w: w * 0.25, h: h * 0.04, name: 'logo' },
          { type: 'text', x: w * 0.08, y: h * 0.35, w: w * 0.84, text: 'Your money.\nYour rules.\nYour clarity.', fontSize: h * 0.045, fontWeight: '700', fill: '#ffffff', fontFamily: displayFont, name: 'headline' },
          { type: 'rect', x: w * 0.08, y: h * 0.62, w: w * 0.3, h: h * 0.04, fill: s, rx: 6, ry: 6, name: 'cta-bg' },
          { type: 'text', x: w * 0.12, y: h * 0.625, w: w * 0.22, text: 'Get Started', fontSize: h * 0.018, fontWeight: '600', fill: '#ffffff', fontFamily: font, textAlign: 'center', name: 'cta' },
          { type: 'text', x: w * 0.08, y: h * 0.9, w: w * 0.4, text: domain, fontSize: h * 0.015, fill: 'rgba(255,255,255,0.4)', fontFamily: font, name: 'url' },
        ],
      };

    case 'presentations':
      return {
        bgColor: '#0A0A0F',
        elements: [
          { type: 'logo', x: w * 0.05, y: h * 0.06, w: w * 0.12, h: h * 0.06, name: 'logo' },
          { type: 'text', x: w * 0.05, y: h * 0.35, w: w * 0.6, text: 'Quarterly\nBusiness Review', fontSize: h * 0.09, fontWeight: '700', fill: '#ffffff', fontFamily: displayFont, name: 'title' },
          { type: 'text', x: w * 0.05, y: h * 0.7, w: w * 0.4, text: 'Q1 2025 — Confidential', fontSize: h * 0.035, fill: '#666666', fontFamily: font, name: 'subtitle' },
          { type: 'rect', x: w * 0.05, y: h * 0.85, w: w * 0.12, h: 4, fill: s, name: 'accent-line' },
        ],
      };

    case 'invoices':
      return {
        bgColor: '#ffffff',
        elements: [
          { type: 'logo', x: w * 0.06, y: h * 0.04, w: w * 0.2, h: h * 0.04, name: 'logo' },
          { type: 'text', x: w * 0.7, y: h * 0.04, w: w * 0.24, text: 'INVOICE', fontSize: h * 0.03, fontWeight: '700', fill: p, fontFamily: displayFont, textAlign: 'right', name: 'label' },
          { type: 'text', x: w * 0.06, y: h * 0.14, w: w * 0.4, text: 'Bill To:', fontSize: h * 0.015, fontWeight: '600', fill: '#333', fontFamily: font, name: 'bill-label' },
          { type: 'text', x: w * 0.06, y: h * 0.17, w: w * 0.4, text: 'Acme Corporation', fontSize: h * 0.018, fill: '#666', fontFamily: font, name: 'client' },
          { type: 'text', x: w * 0.7, y: h * 0.14, w: w * 0.24, text: '#INV-0042', fontSize: h * 0.015, fontWeight: '600', fill: '#333', fontFamily: font, textAlign: 'right', name: 'invoice-num' },
          { type: 'text', x: w * 0.7, y: h * 0.17, w: w * 0.24, text: 'Dec 15, 2025', fontSize: h * 0.013, fill: '#999', fontFamily: font, textAlign: 'right', name: 'date' },
          { type: 'rect', x: w * 0.06, y: h * 0.24, w: w * 0.88, h: 1, fill: '#e5e5e5', name: 'divider-top' },
          { type: 'text', x: w * 0.06, y: h * 0.27, w: w * 0.5, text: 'Strategy Consultation', fontSize: h * 0.014, fill: '#333', fontFamily: font, name: 'item1' },
          { type: 'text', x: w * 0.7, y: h * 0.27, w: w * 0.24, text: '$2,400.00', fontSize: h * 0.014, fontWeight: '500', fill: '#333', fontFamily: font, textAlign: 'right', name: 'price1' },
          { type: 'text', x: w * 0.06, y: h * 0.30, w: w * 0.5, text: 'Brand Identity Package', fontSize: h * 0.014, fill: '#333', fontFamily: font, name: 'item2' },
          { type: 'text', x: w * 0.7, y: h * 0.30, w: w * 0.24, text: '$4,800.00', fontSize: h * 0.014, fontWeight: '500', fill: '#333', fontFamily: font, textAlign: 'right', name: 'price2' },
          { type: 'rect', x: w * 0.06, y: h * 0.35, w: w * 0.88, h: 1, fill: '#e5e5e5', name: 'divider-bottom' },
          { type: 'text', x: w * 0.55, y: h * 0.38, w: w * 0.15, text: 'Total', fontSize: h * 0.018, fontWeight: '700', fill: '#1a1a1a', fontFamily: font, name: 'total-label' },
          { type: 'text', x: w * 0.7, y: h * 0.38, w: w * 0.24, text: '$7,200.00', fontSize: h * 0.018, fontWeight: '700', fill: '#1a1a1a', fontFamily: font, textAlign: 'right', name: 'total' },
        ],
      };

    case 'brand-guides':
      return {
        bgColor: '#ffffff',
        elements: [
          { type: 'logo', x: w * 0.06, y: h * 0.06, w: w * 0.2, h: h * 0.08, name: 'logo' },
          { type: 'text', x: w * 0.06, y: h * 0.4, w: w * 0.6, text: 'Brand\nGuidelines', fontSize: h * 0.1, fontWeight: '700', fill: '#1a1a1a', fontFamily: displayFont, name: 'title' },
          { type: 'text', x: w * 0.06, y: h * 0.72, w: w * 0.4, text: 'Version 2.0 — 2025', fontSize: h * 0.03, fill: '#999999', fontFamily: font, name: 'version' },
          { type: 'rect', x: w * 0.65, y: h * 0.7, w: w * 0.35, h: h * 0.3, fill: `${p}12`, name: 'accent-bg' },
          { type: 'rect', x: w * 0.72, y: h * 0.78, w: w * 0.28, h: h * 0.22, fill: `${p}20`, name: 'accent-bg-2' },
        ],
      };

    case 'profile-icons':
      return {
        bgColor: p,
        elements: [
          { type: 'logo', x: w * 0.2, y: h * 0.2, w: w * 0.6, h: h * 0.6, name: 'logo' },
        ],
      };

    case 'mockups':
      return {
        bgColor: '#f0f0f0',
        elements: [
          { type: 'rect', x: w * 0.2, y: h * 0.1, w: w * 0.6, h: h * 0.7, fill: '#ffffff', rx: 12, ry: 12, name: 'device' },
          { type: 'rect', x: w * 0.22, y: h * 0.12, w: w * 0.56, h: h * 0.08, fill: p, name: 'header' },
          { type: 'logo', x: w * 0.25, y: h * 0.13, w: w * 0.15, h: h * 0.06, name: 'logo' },
          { type: 'text', x: w * 0.25, y: h * 0.28, w: w * 0.5, text: name, fontSize: h * 0.05, fontWeight: '700', fill: '#1a1a1a', fontFamily: displayFont, name: 'title' },
          { type: 'rect', x: w * 0.25, y: h * 0.4, w: w * 0.45, h: h * 0.02, fill: '#e0e0e0', rx: 4, ry: 4, name: 'line1' },
          { type: 'rect', x: w * 0.25, y: h * 0.45, w: w * 0.35, h: h * 0.02, fill: '#e0e0e0', rx: 4, ry: 4, name: 'line2' },
        ],
      };

    default:
      return {
        bgColor: '#ffffff',
        elements: [
          { type: 'logo', x: w * 0.06, y: h * 0.06, w: w * 0.2, h: h * 0.08, name: 'logo' },
          { type: 'text', x: w * 0.06, y: h * 0.4, w: w * 0.88, text: name, fontSize: h * 0.08, fontWeight: '700', fill: p, fontFamily: displayFont, name: 'title' },
          { type: 'text', x: w * 0.06, y: h * 0.55, w: w * 0.88, text: brand.tone || 'Your tagline here', fontSize: h * 0.035, fill: '#666', fontFamily: font, name: 'tagline' },
        ],
      };
  }
}

// ─── Canvas Editor Component ───────────────────────────────────

export function CanvasEditor({ brand, template, onClose }: CanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [canvasZoom, setCanvasZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const width = template.orientation === 'portrait' ? 1080 : template.orientation === 'square' ? 1080 : 1920;
  const height = template.orientation === 'portrait' ? 1920 : template.orientation === 'square' ? 1080 : 1080;

  useEffect(() => {
    if (!canvasRef.current) return;

    const content = getTemplateContent(template, brand, width, height);

    const canvas = new Canvas(canvasRef.current, {
      width,
      height,
      backgroundColor: content.bgColor,
      selection: true,
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    // Render all elements
    const renderElements = async () => {
      for (const el of content.elements) {
        if (el.type === 'text') {
          const textbox = new Textbox(el.text || '', {
            left: el.x,
            top: el.y,
            width: el.w,
            fontSize: el.fontSize || 24,
            fontFamily: el.fontFamily || 'Inter',
            fontWeight: el.fontWeight || 'normal',
            fill: el.fill || '#000000',
            textAlign: (el.textAlign || 'left') as any,
            name: el.name,
          });
          canvas.add(textbox);
        } else if (el.type === 'rect') {
          const rect = new Rect({
            left: el.x,
            top: el.y,
            width: el.w || 100,
            height: el.h || 100,
            fill: el.fill || '#cccccc',
            rx: el.rx || 0,
            ry: el.ry || 0,
            opacity: el.opacity ?? 1,
            name: el.name,
          });
          canvas.add(rect);
        } else if (el.type === 'circle') {
          const circle = new Circle({
            left: el.x,
            top: el.y,
            radius: el.radius || 50,
            fill: el.fill || '#cccccc',
            opacity: el.opacity ?? 1,
            name: el.name,
          });
          canvas.add(circle);
        } else if (el.type === 'logo' && brand.logo) {
          try {
            const img = await FabricImage.fromURL(brand.logo, { crossOrigin: 'anonymous' });
            const scaleX = (el.w || 200) / (img.width || 200);
            const scaleY = (el.h || 100) / (img.height || 100);
            const scale = Math.min(scaleX, scaleY);
            // Invert logo if on dark background
            const bgLum = content.bgColor === '#0A0A0F' || content.bgColor === brand.primaryColor;
            img.set({
              left: el.x,
              top: el.y,
              scaleX: scale,
              scaleY: scale,
              name: el.name,
            });
            if (bgLum) {
              img.filters = [new (await import('fabric')).filters.Invert()];
              img.applyFilters();
            }
            canvas.add(img);
          } catch {}
        }
      }
      canvas.renderAll();
    };

    renderElements();

    canvas.on('selection:created', (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on('selection:updated', (e) => setSelectedObject(e.selected?.[0] || null));
    canvas.on('selection:cleared', () => setSelectedObject(null));

    // Fit to container
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth - 48;
      const ch = containerRef.current.clientHeight - 48;
      setCanvasZoom(Math.min(cw / width, ch / height, 1));
    }

    return () => { canvas.dispose(); fabricRef.current = null; };
  }, [brand, template, width, height]);

  const addText = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const text = new Textbox('Edit this text', {
      left: width * 0.1, top: height * 0.5, width: width * 0.8,
      fontSize: Math.round(height * 0.04), fontFamily: brand.fonts?.primary || 'Inter', fill: '#333333',
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, [brand, width, height]);

  const addShape = useCallback((type: 'rect' | 'circle') => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const size = Math.min(width, height) * 0.15;
    const shape = type === 'circle'
      ? new Circle({ left: width * 0.4, top: height * 0.4, radius: size / 2, fill: brand.secondaryColor || brand.primaryColor })
      : new Rect({ left: width * 0.4, top: height * 0.4, width: size, height: size, fill: brand.secondaryColor || brand.primaryColor, rx: 8, ry: 8 });
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
          img.set({ left: width * 0.3, top: height * 0.3, scaleX: scale, scaleY: scale });
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
    if (active) { canvas.remove(active); setSelectedObject(null); canvas.renderAll(); }
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

  const handleExport = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
    link.download = `${slug}-${template.name.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${width * 2}×${height * 2}px PNG`);
  }, [brand, template, width, height]);

  const updateSelectedProperty = useCallback((prop: string, value: unknown) => {
    const canvas = fabricRef.current;
    if (!canvas || !selectedObject) return;
    selectedObject.set(prop as keyof FabricObject, value as never);
    canvas.renderAll();
    setSelectedObject({ ...selectedObject } as FabricObject);
  }, [selectedObject]);

  const typeLabel = template.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div className="fixed inset-0 z-50 bg-[#1e1e2e] flex flex-col">
      {/* Top Bar */}
      <div className="h-12 bg-[#2a2a3e] border-b border-[#3a3a4e] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-medium px-3 py-1 rounded hover:bg-white/10 transition-colors">
            ← Back
          </button>
          <div className="w-px h-5 bg-gray-600" />
          <span className="text-white text-sm font-medium">{template.name}</span>
          <span className="text-gray-500 text-xs">{typeLabel} — {width}×{height}</span>
        </div>
        <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
          Export PNG
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
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

        <div ref={containerRef} className="flex-1 flex items-center justify-center overflow-auto bg-[#1e1e2e] p-6">
          <div className="shadow-2xl" style={{ transform: `scale(${canvasZoom})`, transformOrigin: 'center center' }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        <EditorPropertiesPanel selectedObject={selectedObject} onUpdate={updateSelectedProperty} brand={brand} />
      </div>
    </div>
  );
}
