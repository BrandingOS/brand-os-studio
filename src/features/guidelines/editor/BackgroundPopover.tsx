import { useState } from 'react';
import type { Brand } from '@/shared/types/brand';

interface BackgroundPopoverProps {
  brand: Brand;
  currentBg?: string;
  onChangeBg: (color: string) => void;
  onClose: () => void;
}

export function BackgroundPopover({ brand, currentBg, onChangeBg }: BackgroundPopoverProps) {
  const [tab, setTab] = useState<'bg' | 'overlays' | 'upload' | 'generate'>('bg');
  const [blurBg, setBlurBg] = useState(false);

  const colors = [
    '#0A0A0F', '#1a1a2e', '#2d2d3f', '#ffffff', '#f5f5f5',
    brand.primaryColor, brand.secondaryColor || '#00D4AA',
    '#FF6B35', '#4CAF50', '#2196F3', '#9C27B0', '#FF1744',
  ].filter(Boolean) as string[];

  const gradients = [
    { name: 'Warm', css: `linear-gradient(135deg, #1a1a2e, ${brand.primaryColor}40)` },
    { name: 'Cool', css: `linear-gradient(135deg, #1a1a2e, #2196F340)` },
    { name: 'Deep', css: `linear-gradient(135deg, ${brand.primaryColor}30, #0A0A0F)` },
    { name: 'Sunset', css: `linear-gradient(135deg, #FF6B3520, #9C27B020)` },
    { name: 'Forest', css: `linear-gradient(135deg, #1a1a2e, #4CAF5020)` },
    { name: 'Brand', css: `linear-gradient(135deg, ${brand.primaryColor}20, ${brand.secondaryColor || '#00D4AA'}20)` },
  ];

  const tabs = [
    { id: 'bg' as const, label: 'Backgrounds' },
    { id: 'overlays' as const, label: 'Overlays' },
    { id: 'upload' as const, label: 'Upload' },
    { id: 'generate' as const, label: 'Generate' },
  ];

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 w-80 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Tabs */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex gap-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`text-[11px] font-medium transition-colors ${tab === t.id ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => onChangeBg('#0A0A0F')} className="text-[10px] text-white/20 hover:text-white/40">Reset</button>
      </div>

      {tab === 'bg' && (
        <div className="px-3 pb-3 space-y-3">
          {/* Color dots */}
          <div>
            <p className="text-[10px] text-white/20 mb-1.5">Color</p>
            <div className="flex flex-wrap gap-1.5">
              {colors.map(c => (
                <button key={c} onClick={() => onChangeBg(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${currentBg === c ? 'border-white scale-110' : 'border-white/10 hover:border-white/30'}`}
                  style={{ backgroundColor: c }} />
              ))}
              <button className="w-7 h-7 rounded-full border-2 border-white/10" style={{ background: 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' }} />
            </div>
          </div>

          {/* Gradients */}
          <div>
            <p className="text-[10px] text-white/20 mb-1.5">Gradients</p>
            <div className="grid grid-cols-3 gap-1.5">
              {gradients.map(g => (
                <button key={g.name} onClick={() => onChangeBg(g.css)} className="aspect-[4/3] rounded-lg border border-white/5 hover:border-white/20 transition-colors" style={{ background: g.css }} />
              ))}
            </div>
          </div>

          {/* Blur toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/40">Blur background</span>
            <button onClick={() => setBlurBg(!blurBg)} className={`w-8 h-4.5 rounded-full transition-colors relative ${blurBg ? 'bg-white/30' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${blurBg ? 'left-[14px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Background style */}
          <div>
            <p className="text-[10px] text-white/20 mb-1.5">Background style</p>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map(i => (
                <button key={i} className="aspect-video bg-white/5 rounded-lg border border-white/5 hover:border-white/15 transition-colors" />
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'overlays' && (
        <div className="px-3 pb-3">
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <button key={i} className="aspect-square bg-white/3 rounded-lg border border-white/5 hover:border-white/15 transition-colors" />
            ))}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="px-3 pb-3">
          <label className="flex flex-col items-center justify-center h-32 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
            <span className="text-white/20 text-sm mb-1">Upload image</span>
            <span className="text-white/10 text-[10px]">PNG, JPG, SVG</span>
            <input type="file" className="hidden" accept="image/*" />
          </label>
        </div>
      )}

      {tab === 'generate' && (
        <div className="px-3 pb-3 text-center py-8">
          <span className="text-white/15 text-sm">AI background generation</span>
          <p className="text-white/10 text-[10px] mt-1">Coming soon</p>
        </div>
      )}
    </div>
  );
}
