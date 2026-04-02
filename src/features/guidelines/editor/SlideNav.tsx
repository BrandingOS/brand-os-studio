import { useState } from 'react';
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

export function SlideNav({ slides, currentSlide, onSelect, brand, layout }: SlideNavProps) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    // Collapsed: show dots
    return (
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 py-3 px-1.5 cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        {slides.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all ${
              i === currentSlide
                ? 'w-1.5 h-4 bg-white/80'
                : 'w-1 h-1 bg-white/20 hover:bg-white/40'
            }`}
          />
        ))}
      </div>
    );
  }

  // Expanded: show thumbnails
  return (
    <div className="absolute left-0 top-0 bottom-12 z-20 w-44 bg-[#222] border-r border-white/[0.06] overflow-y-auto">
      <div className="p-2 space-y-1.5">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            onClick={() => { onSelect(i); setExpanded(false); }}
            className={`w-full rounded-lg overflow-hidden border transition-all ${
              i === currentSlide
                ? 'border-white/30 ring-1 ring-white/20'
                : 'border-white/[0.06] hover:border-white/15'
            }`}
          >
            <div className="aspect-video bg-[#1a1a1a] relative overflow-hidden" style={{ transform: 'scale(1)', transformOrigin: 'top left' }}>
              <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scale(0.18)', transformOrigin: 'top left', width: '555%', height: '555%' }}>
                {slide.render({ brand, layout, pageNumber: i + 1, totalPages: slides.length })}
              </div>
            </div>
            <div className="px-1.5 py-1 bg-[#222]">
              <span className="text-[8px] text-white/40 truncate block">{i + 1}. {slide.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
