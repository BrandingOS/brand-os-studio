import { useState, useRef } from 'react';
import { X, Download, Bookmark, Edit3, RotateCcw, Palette, Type, Image as ImageIcon } from 'lucide-react';
import type { BrandKitTemplate } from '../types';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface TemplatePreviewModalProps {
  template: BrandKitTemplate;
  brand: Brand;
  onClose: () => void;
  onSave: (template: BrandKitTemplate) => void;
  renderPreview: (overrides: TemplateOverrides) => React.ReactNode;
}

export interface TemplateOverrides {
  name?: string;
  title?: string;
  subtitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  showLogo?: boolean;
}

export function TemplatePreviewModal({ template, brand, onClose, onSave, renderPreview }: TemplatePreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [overrides, setOverrides] = useState<TemplateOverrides>({
    name: brand.name,
    title: 'Jane Smith',
    subtitle: 'Brand Manager',
    primaryColor: brand.primaryColor,
    secondaryColor: brand.secondaryColor || '#00D4AA',
    showLogo: true,
  });
  const previewRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const el = previewRef.current?.querySelector('[data-export-target]') as HTMLElement | null;
      if (!el) { toast.error('Preview not found'); setDownloading(false); return; }

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, {
        scale: 4,
        backgroundColor: null,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      link.download = `${slug}-${template.type}-${template.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Downloaded — ${canvas.width}×${canvas.height}px PNG`);
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Export failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleReset = () => {
    setOverrides({
      name: brand.name,
      title: 'Jane Smith',
      subtitle: 'Brand Manager',
      primaryColor: brand.primaryColor,
      secondaryColor: brand.secondaryColor || '#00D4AA',
      showLogo: true,
    });
  };

  const aspectClass = template.orientation === 'portrait' ? 'max-w-xs'
    : template.orientation === 'square' ? 'max-w-sm'
    : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-card rounded-2xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col w-full max-w-5xl mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold">{template.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{template.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isEditing ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'
              }`}
            >
              <Edit3 className="h-3.5 w-3.5" />
              {isEditing ? 'Editing' : 'Edit'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto flex">
          {/* Preview Area */}
          <div className={`flex-1 flex items-center justify-center p-6 bg-[#f0f0f0] dark:bg-[#1a1a1a] ${isEditing ? '' : ''}`} ref={previewRef}>
            <div className={`${aspectClass} w-full`}>
              <div
                data-export-target
                className={`w-full ${
                  template.orientation === 'portrait' ? 'aspect-[9/16]' :
                  template.orientation === 'square' ? 'aspect-square' :
                  'aspect-video'
                } rounded-lg overflow-hidden shadow-lg`}
              >
                {renderPreview(overrides)}
              </div>
            </div>
          </div>

          {/* Editor Panel */}
          {isEditing && (
            <div className="w-72 shrink-0 border-l border-border bg-card overflow-auto p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Customize</h4>
                <button onClick={handleReset} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>

              {/* Text Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1">
                    <Type className="h-3 w-3" /> Name
                  </label>
                  <input
                    type="text"
                    value={overrides.title || ''}
                    onChange={e => setOverrides(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Title / Role</label>
                  <input
                    type="text"
                    value={overrides.subtitle || ''}
                    onChange={e => setOverrides(p => ({ ...p, subtitle: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-3">
                <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Palette className="h-3 w-3" /> Colors
                </h5>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overrides.primaryColor}
                    onChange={e => setOverrides(p => ({ ...p, primaryColor: e.target.value }))}
                    className="w-8 h-8 rounded border cursor-pointer p-0"
                  />
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Primary</span>
                    <p className="text-xs font-mono">{overrides.primaryColor}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={overrides.secondaryColor}
                    onChange={e => setOverrides(p => ({ ...p, secondaryColor: e.target.value }))}
                    className="w-8 h-8 rounded border cursor-pointer p-0"
                  />
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Secondary</span>
                    <p className="text-xs font-mono">{overrides.secondaryColor}</p>
                  </div>
                </div>
              </div>

              {/* Logo Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Show Logo
                </label>
                <button
                  onClick={() => setOverrides(p => ({ ...p, showLogo: !p.showLogo }))}
                  className={`w-9 h-5 rounded-full transition-colors relative ${overrides.showLogo ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${overrides.showLogo ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="shrink-0 border-t border-border px-5 py-3 flex items-center gap-3 bg-card">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {downloading ? 'Exporting...' : 'Download PNG'}
          </button>
          <button
            onClick={() => { onSave(template); toast.success('Saved to collection'); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors"
          >
            <Bookmark className="h-4 w-4" />
            Save
          </button>
          <div className="ml-auto text-xs text-muted-foreground">
            {template.type.replace(/-/g, ' ')} — {template.orientation}
          </div>
        </div>
      </div>
    </div>
  );
}
