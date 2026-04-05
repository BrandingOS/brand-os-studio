import { ArrowLeft, Share2, Download, Maximize2, MoreHorizontal } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface EditorTopBarProps {
  brand: Brand;
  currentSlide: number;
  totalPages: number;
  slideName: string;
  onPresent: () => void;
  onExport: () => void;
  onClose?: () => void;
}

export function EditorTopBar({ brand, currentSlide, totalPages, slideName, onPresent, onExport, onClose }: EditorTopBarProps) {
  return (
    <div className="h-11 bg-[#141414] border-b border-white/[0.04] flex items-center justify-between px-3 shrink-0 z-10">
      {/* Left: breadcrumb */}
      <div className="flex items-center gap-2">
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-center gap-2 bg-white/[0.05] rounded-lg px-3 py-1.5">
          {brand.logo && <img src={brand.logo} alt="" className="h-3.5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} />}
          <span className="text-white/70 text-[13px] font-medium">{brand.name}</span>
          <span className="text-white/15 text-[13px]">/</span>
          <span className="text-white/40 text-[13px]">Chapter {currentSlide + 1} of {totalPages}</span>
        </div>
      </div>

      {/* Center: document name */}
      <span className="text-white/30 text-xs">{slideName}</span>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied to clipboard'); }} className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          Share
        </button>
        <button onClick={onExport} className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          Export
        </button>
        <button onClick={onPresent} className="px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          Present
        </button>
        <button className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
