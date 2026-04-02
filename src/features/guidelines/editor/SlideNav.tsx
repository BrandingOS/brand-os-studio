import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from '../pages/templates/layout-config';
import type { SlideData } from './EditorWorkspace';

interface SlideNavProps {
  slides: SlideData[];
  currentSlide: number;
  onSelect: (idx: number) => void;
  brand: Brand;
  layout: TemplateLayout;
}

export function SlideNav({ slides, currentSlide, onSelect }: SlideNavProps) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-20">
        <button onClick={() => setExpanded(true)} className="flex flex-col items-center gap-[3px] py-4 px-1.5 rounded-xl hover:bg-white/5 transition-colors group">
          {slides.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-200 ${i === currentSlide ? 'w-1.5 h-3.5 bg-white/70' : 'w-1 h-1 bg-white/15 group-hover:bg-white/25'}`} />
          ))}
        </button>
      </div>
    );
  }

  return (
    <div className="absolute left-0 top-0 bottom-0 z-20 w-48 bg-[#1e1e1e] border-r border-white/[0.06] flex flex-col animate-in slide-in-from-left duration-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Slides</span>
        <button onClick={() => setExpanded(false)} className="p-1 rounded hover:bg-white/10 text-white/30 hover:text-white transition-colors">
          <ChevronLeft className="h-3 w-3" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1.5 px-1.5 space-y-0.5">
        {slides.map((slide, i) => (
          <button key={slide.id} onClick={() => { onSelect(i); setExpanded(false); }}
            className={`w-full text-left rounded-lg px-2.5 py-1.5 transition-all ${i === currentSlide ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white/60 hover:bg-white/5'}`}>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-white/20 w-4 shrink-0 text-right">{i + 1}</span>
              <span className="text-[11px] truncate">{slide.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
