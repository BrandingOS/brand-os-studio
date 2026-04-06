import { useState } from 'react';
import { X, Image as ImageIcon, ChevronRight } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from './layout-config';
import type { SlideData } from './EditorWorkspace';
import { captureElementForExport } from './exportCapture';
import { toast } from 'sonner';
import { ExportDialog } from '@/shared/components/ExportDialog';
import type { ExportSource } from '@/shared/services/export/types';

interface ExportModalProps {
  brand: Brand;
  slides: SlideData[];
  layout: TemplateLayout;
  onClose: () => void;
  onExportPDF: () => void;
  /** Optional handler for the editable (vector) PDF path — needed because
   *  slides are virtualized and the engine can't see them all at once. */
  onExportEditablePDF?: () => Promise<void> | void;
}

export function ExportModal({ brand, slides, layout, onClose, onExportPDF, onExportEditablePDF }: ExportModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');

  const source: ExportSource = {
    type: 'html-element',
    selector: '[data-slide-canvas]',
  };

  const getPages = (): HTMLElement[] => {
    const elements = document.querySelectorAll('[data-slide-canvas]');
    return Array.from(elements) as HTMLElement[];
  };

  const handleQuickPNG = async () => {
    try {
      const el = document.querySelector('[data-slide-canvas]') as HTMLElement;
      if (!el) { toast.error('No slide found'); return; }

      toast.loading('Exporting image...');

      // Use shared capture utility (handles SVG sizing, CSS filters, container queries)
      const canvas = await captureElementForExport(el, { scale: 4, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `${slug}-slide.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss();
      toast.success(`Exported ${canvas.width}x${canvas.height}px`);
    } catch (err) {
      toast.dismiss();
      console.error('[PNG Export] failed:', err);
      toast.error('Export failed');
    }
  };

  // When advanced export dialog is shown, render it directly (it has its own Dialog overlay)
  if (showAdvanced) {
    return (
      <ExportDialog
        open={true}
        onClose={() => { setShowAdvanced(false); onClose(); }}
        source={source}
        availableFormats={['png', 'jpg', 'svg', 'svg-editable', 'pdf-flat', 'pdf-editable', 'pptx']}
        defaultFilename={`${slug}-slide`}
        pages={getPages}
        title="Export Slide"
        onCustomExport={onExportEditablePDF ? { 'pdf-editable': onExportEditablePDF } : undefined}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Export</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-3">
          {/* Quick PNG */}
          <button
            onClick={handleQuickPNG}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all text-left group"
          >
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <ImageIcon className="h-5 w-5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Quick PNG</p>
              <p className="text-xs text-gray-400">4x resolution, current slide</p>
            </div>
          </button>

          {/* PDF */}
          <button
            onClick={() => { onClose(); setTimeout(onExportPDF, 100); }}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-400 hover:shadow-sm transition-all text-left group"
          >
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
              <div className="w-6 h-6 bg-red-500 rounded flex items-center justify-center text-white text-[8px] font-bold">PDF</div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">PDF Document</p>
              <p className="text-xs text-gray-400">{slides.length} page{slides.length !== 1 ? 's' : ''} &middot; 1920&times;1080</p>
            </div>
          </button>

          {/* Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          </div>

          {/* More formats — opens ExportDialog */}
          <button
            onClick={() => setShowAdvanced(true)}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-sm transition-all text-left group"
          >
            <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
              <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">More Formats...</p>
              <p className="text-xs text-gray-400">JPG, SVG, PowerPoint, and more</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
