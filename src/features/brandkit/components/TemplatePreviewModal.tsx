import { useState } from 'react';
import { X, Download, Bookmark, ExternalLink } from 'lucide-react';
import type { BrandKitTemplate } from '../types';
import type { Brand } from '@/shared/types/brand';
import { TemplateCard } from './TemplateCard';
import { toast } from 'sonner';

interface TemplatePreviewModalProps {
  template: BrandKitTemplate;
  brand: Brand;
  onClose: () => void;
  onSave: (template: BrandKitTemplate) => void;
  onNavigate?: () => void;
  renderPreview: React.ReactNode;
}

export function TemplatePreviewModal({ template, brand, onClose, onSave, onNavigate, renderPreview }: TemplatePreviewModalProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      // Find the preview element and export it
      const previewEl = document.querySelector('[data-template-preview]');
      if (previewEl) {
        const { default: html2canvas } = await import('html2canvas');
        const canvas = await html2canvas(previewEl as HTMLElement, {
          scale: 3,
          backgroundColor: null,
          useCORS: true,
        });
        const link = document.createElement('a');
        const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
        link.download = `${slug}-${template.type}-${template.id}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Template exported as PNG');
      } else {
        toast.error('Preview element not found');
      }
    } catch (err) {
      toast.error('Export failed — try again');
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const aspectClass = template.orientation === 'portrait' ? 'max-w-sm'
    : template.orientation === 'square' ? 'max-w-md'
    : 'max-w-2xl';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-card rounded-2xl shadow-2xl max-h-[90vh] overflow-auto w-full max-w-3xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="font-semibold text-lg">{template.name}</h3>
            <p className="text-sm text-muted-foreground">{template.category} — {template.type.replace(/-/g, ' ')}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-6 flex justify-center bg-muted/20">
          <div className={`${aspectClass} w-full`} data-template-preview>
            <div className={`w-full ${
              template.orientation === 'portrait' ? 'aspect-[9/16]' :
              template.orientation === 'square' ? 'aspect-square' :
              'aspect-video'
            } rounded-xl overflow-hidden border border-border shadow-sm`}>
              {renderPreview}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-3">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
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
          {onNavigate && (
            <button
              onClick={onNavigate}
              className="flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-xl font-medium text-sm hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Editor
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
