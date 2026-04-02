import { X, FileText, Image, Linkedin, Instagram } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from '../pages/templates/layout-config';
import type { SlideData } from './EditorWorkspace';
import { toast } from 'sonner';

interface ExportModalProps {
  brand: Brand;
  slides: SlideData[];
  layout: TemplateLayout;
  onClose: () => void;
}

export function ExportModal({ brand, slides, layout, onClose }: ExportModalProps) {
  const handleExportPDF = async () => {
    toast.success('Exporting PDF...');
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [1920, 1080] });
      // TODO: render each slide to canvas and add to PDF
      const slug = brand.slug || brand.name.toLowerCase().replace(/\s+/g, '-');
      pdf.save(`${slug}-brand-guidelines.pdf`);
      toast.success('PDF exported');
    } catch {
      toast.error('Export failed');
    }
  };

  const formats = [
    { id: 'pdf', label: 'PDF document', size: '1920 × 1080', icon: FileText, action: handleExportPDF },
    { id: 'image', label: 'Image', size: '3840 × 2160px', icon: Image, action: () => toast.success('Image export coming soon') },
    { id: 'linkedin', label: 'LinkedIn post', size: '1080 × 1080px', icon: Linkedin, action: () => toast.success('LinkedIn export coming soon') },
    { id: 'instagram', label: 'Instagram post', size: '1080 × 1350px', icon: Instagram, action: () => toast.success('Instagram export coming soon') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Export</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>

        {/* Basic */}
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Basic</p>
        <div className="grid grid-cols-3 gap-3 mb-6">
          {formats.slice(0, 3).map(f => (
            <button key={f.id} onClick={f.action} className="border border-gray-200 rounded-xl p-4 hover:border-gray-400 hover:shadow-sm transition-all text-center group">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2 group-hover:bg-gray-200 transition-colors">
                <f.icon className="h-5 w-5 text-gray-500" />
              </div>
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-[10px] text-gray-400">{f.size}</p>
            </button>
          ))}
        </div>

        {/* Social */}
        <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Social</p>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'LinkedIn post', size: '1080 × 1080px', icon: Linkedin },
            { label: 'Instagram post', size: '1080 × 1350px', icon: Instagram },
            { label: 'X post', size: '1200 × 675px', icon: () => <span className="text-lg font-bold">𝕏</span> },
            { label: 'Animated GIF', size: '1024 × 1024px', icon: () => <span className="text-xs font-bold text-gray-400">GIF</span> },
          ].map((f, i) => (
            <button key={i} className="border border-gray-200 rounded-xl p-3 hover:border-gray-400 hover:shadow-sm transition-all text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                {typeof f.icon === 'function' ? <f.icon /> : <f.icon className="h-4 w-4 text-gray-500" />}
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
