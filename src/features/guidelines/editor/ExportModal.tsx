import { X } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from '../pages/templates/layout-config';
import type { SlideData } from './EditorWorkspace';
import { toast } from 'sonner';

interface ExportModalProps {
  brand: Brand;
  slides: SlideData[];
  layout: TemplateLayout;
  onClose: () => void;
  onExportPDF: () => void;
}

export function ExportModal({ brand, onClose, onExportPDF }: ExportModalProps) {
  const handleExportImage = async () => {
    try {
      const el = document.querySelector('[data-slide-canvas]') as HTMLElement;
      if (!el) { toast.error('No slide found'); return; }
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { scale: 4, backgroundColor: null, useCORS: true, logging: false });
      const link = document.createElement('a');
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      link.download = `${slug}-slide.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`Exported ${canvas.width}×${canvas.height}px`);
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Export</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Basic</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={() => { onClose(); setTimeout(onExportPDF, 100); }} className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all text-center group">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center text-white text-[8px] font-bold">PDF</div>
            </div>
            <p className="text-sm font-medium">PDF document</p>
            <p className="text-[10px] text-gray-400">1920 × 1080</p>
          </button>

          <button onClick={handleExportImage} className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all text-center group">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-[8px] font-bold">PNG</div>
            </div>
            <p className="text-sm font-medium">Image</p>
            <p className="text-[10px] text-gray-400">High resolution</p>
          </button>

          <button className="border border-gray-200 rounded-xl p-4 text-center opacity-40 cursor-not-allowed">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white text-[8px] font-bold">PPT</div>
            </div>
            <p className="text-sm font-medium">PowerPoint</p>
            <p className="text-[10px] text-gray-400">Coming soon</p>
          </button>
        </div>

        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Social</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'LinkedIn', size: '1080×1080', bg: '#0077B5' },
            { label: 'Instagram', size: '1080×1350', bg: '#E4405F' },
            { label: 'X post', size: '1200×675', bg: '#000' },
            { label: 'GIF', size: '1024×1024', bg: '#666' },
          ].map(f => (
            <button key={f.label} className="border border-gray-200 rounded-xl p-3 text-center opacity-50 cursor-not-allowed">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: f.bg }}>
                <span className="text-white text-[9px] font-bold">{f.label.slice(0, 2)}</span>
              </div>
              <p className="text-xs font-medium">{f.label}</p>
              <p className="text-[9px] text-gray-400">{f.size}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
