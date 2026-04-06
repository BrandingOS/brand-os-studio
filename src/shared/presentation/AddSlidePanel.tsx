/**
 * AddSlidePanel — modal for picking which slide layout to add to a presentation.
 */
import { X } from 'lucide-react';
import { SLIDE_LAYOUTS } from './buildExtraSlides';
import type { ExtraSlide } from './presentationDocsStore';

interface AddSlidePanelProps {
  onAdd: (layout: ExtraSlide['layout']) => void;
  onClose: () => void;
}

export function AddSlidePanel({ onAdd, onClose }: AddSlidePanelProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[85vh] mx-4 bg-[#111] rounded-2xl border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-white/90">Add a slide</h2>
            <p className="text-xs text-white/30 mt-0.5">Pick a layout — you can edit the content after adding</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-white/30 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Layout grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {SLIDE_LAYOUTS.map((layout) => (
              <button
                key={layout.id}
                onClick={() => { onAdd(layout.id); onClose(); }}
                className="group rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.05] p-3 transition-all text-left"
              >
                {/* Mini preview */}
                <div className="aspect-video w-full mb-3 rounded-md bg-white/[0.04] border border-white/[0.04] relative overflow-hidden flex items-center justify-center">
                  <LayoutPreview layoutId={layout.id} />
                </div>
                <p className="text-xs font-semibold text-white/80">{layout.name}</p>
                <p className="text-[10px] text-white/30 mt-0.5 line-clamp-2">{layout.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tiny SVG-style preview of each layout */
function LayoutPreview({ layoutId }: { layoutId: ExtraSlide['layout'] }) {
  switch (layoutId) {
    case 'cover':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-3">
          <div className="h-1.5 w-1/2 bg-white/30 rounded-full" />
          <div className="h-0.5 w-1/3 bg-white/15 rounded-full" />
        </div>
      );
    case 'section':
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-[20px] font-black text-white/15 leading-none">01</div>
        </div>
      );
    case 'two-col':
      return (
        <div className="w-full h-full flex gap-1 px-2 py-2">
          <div className="flex-[0_0_55%] flex flex-col gap-1 justify-center">
            <div className="h-1 w-3/4 bg-white/30 rounded-full" />
            <div className="h-0.5 w-2/3 bg-white/15 rounded-full" />
            <div className="h-0.5 w-1/2 bg-white/15 rounded-full" />
          </div>
          <div className="flex-1 bg-white/[0.06] rounded" />
        </div>
      );
    case 'two-col-reverse':
      return (
        <div className="w-full h-full flex gap-1 px-2 py-2">
          <div className="flex-1 bg-white/[0.06] rounded" />
          <div className="flex-[0_0_55%] flex flex-col gap-1 justify-center">
            <div className="h-1 w-3/4 bg-white/30 rounded-full" />
            <div className="h-0.5 w-2/3 bg-white/15 rounded-full" />
            <div className="h-0.5 w-1/2 bg-white/15 rounded-full" />
          </div>
        </div>
      );
    case 'full-bleed':
      return (
        <div className="w-full h-full bg-white/[0.05] flex items-end p-2">
          <div className="h-0.5 w-1/2 bg-white/30 rounded-full" />
        </div>
      );
    case 'three-col':
      return (
        <div className="w-full h-full grid grid-cols-3 gap-1 p-2">
          <div className="bg-white/[0.06] rounded" />
          <div className="bg-white/[0.06] rounded" />
          <div className="bg-white/[0.06] rounded" />
        </div>
      );
    case 'quote':
      return (
        <div className="w-full h-full flex items-center justify-center px-4">
          <div className="text-[24px] text-white/15 leading-none mr-1">&ldquo;</div>
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="h-0.5 w-full bg-white/20 rounded-full" />
            <div className="h-0.5 w-3/4 bg-white/15 rounded-full" />
          </div>
        </div>
      );
    case 'stats':
      return (
        <div className="w-full h-full grid grid-cols-2 gap-1 p-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white/[0.06] rounded flex items-center justify-center">
              <div className="h-1.5 w-1/3 bg-white/25 rounded-full" />
            </div>
          ))}
        </div>
      );
    case 'list':
      return (
        <div className="w-full h-full flex gap-2 p-2">
          <div className="flex-[0_0_30%]">
            <div className="h-1 w-3/4 bg-white/30 rounded-full" />
          </div>
          <div className="flex-1 flex flex-col gap-1 justify-center">
            <div className="h-0.5 w-full bg-white/20 rounded-full" />
            <div className="h-0.5 w-5/6 bg-white/15 rounded-full" />
            <div className="h-0.5 w-2/3 bg-white/15 rounded-full" />
          </div>
        </div>
      );
    case 'closing':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          <div className="h-1 w-1/2 bg-white/30 rounded-full" />
        </div>
      );
    default:
      return null;
  }
}
