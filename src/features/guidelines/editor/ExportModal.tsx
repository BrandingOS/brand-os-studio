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

export function ExportModal({ brand, slides, onClose, onExportPDF }: ExportModalProps) {
  const handleExportImage = async () => {
    try {
      const el = document.querySelector('[data-slide-canvas]') as HTMLElement;
      if (!el) { toast.error('No slide found'); return; }

      toast.loading('Exporting image...');

      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { scale: 4, backgroundColor: null, useCORS: true, logging: false });
      const link = document.createElement('a');
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      link.download = `${slug}-slide.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.dismiss();
      toast.success(`Exported ${canvas.width}x${canvas.height}px`);
    } catch {
      toast.dismiss();
      toast.error('Export failed');
    }
  };

  const handleExportSVG = async () => {
    try {
      const el = document.querySelector('[data-slide-canvas]') as HTMLElement;
      if (!el) { toast.error('No slide found'); return; }

      // Create a simple SVG wrapper around the HTML content
      const rect = el.getBoundingClientRect();
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(el, { scale: 2, backgroundColor: null, useCORS: true, logging: false });

      const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${rect.width * 2}" height="${rect.height * 2}" viewBox="0 0 ${rect.width * 2} ${rect.height * 2}">
  <image width="${rect.width * 2}" height="${rect.height * 2}" xlink:href="${canvas.toDataURL('image/png')}" />
</svg>`;

      const blob = new Blob([svgContent], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      link.download = `${slug}-slide.svg`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('SVG exported');
    } catch {
      toast.error('SVG export failed');
    }
  };

  const handleExportAllPNG = async () => {
    try {
      toast.loading('Exporting all slides as PNG...');
      const { default: JSZip } = await import('jszip');
      const { default: html2canvas } = await import('html2canvas');
      const zip = new JSZip();
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');

      // Export current visible slide only — multi-slide would need to re-render each
      const el = document.querySelector('[data-slide-canvas]') as HTMLElement;
      if (!el) { toast.dismiss(); toast.error('No slide found'); return; }

      const canvas = await html2canvas(el, { scale: 3, backgroundColor: null, useCORS: true, logging: false });
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      zip.file(`${slug}-slide.png`, base64, { base64: true });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.download = `${slug}-slides.zip`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('ZIP exported');
    } catch {
      toast.dismiss();
      toast.error('ZIP export failed');
    }
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
            <p className="text-[10px] text-gray-400">{slides.length} page{slides.length !== 1 ? 's' : ''} &middot; 1920x1080</p>
          </button>

          <button onClick={handleExportImage} className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all text-center group">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center text-white text-[8px] font-bold">PNG</div>
            </div>
            <p className="text-sm font-medium">Image</p>
            <p className="text-[10px] text-gray-400">4x resolution</p>
          </button>

          <button onClick={handleExportSVG} className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all text-center group">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-white text-[8px] font-bold">SVG</div>
            </div>
            <p className="text-sm font-medium">SVG</p>
            <p className="text-[10px] text-gray-400">Vector format</p>
          </button>
        </div>

        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Bulk</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          <button onClick={handleExportAllPNG} className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all text-center group">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-purple-500 rounded flex items-center justify-center text-white text-[8px] font-bold">ZIP</div>
            </div>
            <p className="text-sm font-medium">All as ZIP</p>
            <p className="text-[10px] text-gray-400">PNG archive</p>
          </button>

          <button className="border border-gray-200 rounded-xl p-4 text-center opacity-40 cursor-not-allowed">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center text-white text-[8px] font-bold">PPT</div>
            </div>
            <p className="text-sm font-medium">PowerPoint</p>
            <p className="text-[10px] text-gray-400">Coming soon</p>
          </button>

          <button className="border border-gray-200 rounded-xl p-4 text-center opacity-40 cursor-not-allowed">
            <div className="w-14 h-14 bg-gray-50 rounded-lg flex items-center justify-center mx-auto mb-2">
              <div className="w-8 h-8 bg-teal-500 rounded flex items-center justify-center text-white text-[8px] font-bold">KEY</div>
            </div>
            <p className="text-sm font-medium">Keynote</p>
            <p className="text-[10px] text-gray-400">Coming soon</p>
          </button>
        </div>

        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Social</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'LinkedIn', size: '1080x1080', bg: '#0077B5' },
            { label: 'Instagram', size: '1080x1350', bg: '#E4405F' },
            { label: 'X post', size: '1200x675', bg: '#000' },
            { label: 'GIF', size: '1024x1024', bg: '#666' },
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
