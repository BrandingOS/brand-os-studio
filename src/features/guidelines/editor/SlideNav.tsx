import { useState } from 'react';
import { Layers, Search, Copy, Plus, BookOpen } from 'lucide-react';
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

const ADD_PAGE_CATEGORIES = [
  'COVER', 'TABLE OF CONTENT', 'BRAND STRATEGY', 'LOGO & WORDMARK',
  'COLOR SYSTEM', 'TYPOGRAPHY', 'BRAND IN USE', 'ICONOGRAPHY',
  'SOCIAL MEDIA', 'STATIONERY', 'BRAND APPLICATIONS', 'COMPOSITION',
  'DATA VISUALIZATION', 'GALLERY',
];

export function SlideNav({ slides, currentSlide, onSelect, brand, layout }: SlideNavProps) {
  const [panel, setPanel] = useState<'none' | 'slides' | 'add'>('none');
  const togglePanel = (p: 'slides' | 'add') => setPanel(prev => prev === p ? 'none' : p);

  return (
    <>
      <div className="absolute left-0 top-0 bottom-0 z-20 w-10 flex flex-col items-center py-3 gap-1">
        <button onClick={() => togglePanel('slides')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${panel === 'slides' ? 'bg-white/15 text-white' : 'text-white/25 hover:text-white/50 hover:bg-white/5'}`}><BookOpen className="h-4 w-4" /></button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/5 transition-colors"><Layers className="h-4 w-4" /></button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/5 transition-colors"><Search className="h-4 w-4" /></button>
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/5 transition-colors"><Copy className="h-4 w-4" /></button>
        <button onClick={() => togglePanel('add')} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${panel === 'add' ? 'bg-white/15 text-white' : 'text-white/25 hover:text-white/50 hover:bg-white/5'}`}><Plus className="h-4 w-4" /></button>
      </div>

      {panel === 'slides' && (
        <div className="absolute left-10 top-0 bottom-0 z-20 w-48 bg-[#1a1a1a] border-r border-white/[0.06] flex flex-col animate-in slide-in-from-left duration-200">
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-2">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => { onSelect(i); setPanel('none'); }}
                className={`w-full rounded-lg overflow-hidden transition-all ${
                  i === currentSlide ? 'ring-2 ring-blue-500/60 shadow-lg' : 'ring-1 ring-white/[0.06] hover:ring-white/15'
                }`}
              >
                {/* Miniature slide render */}
                <div className="aspect-video relative overflow-hidden bg-[#111]">
                  <div
                    className="absolute inset-0 pointer-events-none origin-top-left"
                    style={{
                      width: '1200px',
                      transform: 'scale(0.148)',
                      transformOrigin: 'top left',
                    }}
                  >
                    {slide.render({ brand, layout, pageNumber: i + 1, totalPages: slides.length })}
                  </div>
                  {/* Slide number overlay */}
                  <div className="absolute top-1 left-1.5 text-[7px] font-mono text-white/40 bg-black/30 px-1 rounded">
                    {i + 1}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {panel === 'add' && (
        <div className="absolute left-10 top-0 bottom-0 z-20 w-48 bg-[#1a1a1a] border-r border-white/[0.06] flex flex-col animate-in slide-in-from-left duration-200">
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
            {ADD_PAGE_CATEGORIES.map(cat => (
              <button key={cat} className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                <span>{cat}</span><span className="text-white/15 text-[10px]">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
