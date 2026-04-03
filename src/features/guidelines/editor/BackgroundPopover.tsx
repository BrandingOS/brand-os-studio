import { useState } from 'react';
import type { Brand } from '@/shared/types/brand';
import { toast } from 'sonner';

interface BackgroundPopoverProps {
  brand: Brand;
  currentBg?: string;
  onChangeBg: (color: string) => void;
  onClose: () => void;
}

const BG_STYLES = [
  { id: 'solid', label: 'Solid' },
  { id: 'noise', label: 'Noise' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
];

export function BackgroundPopover({ brand, currentBg, onChangeBg }: BackgroundPopoverProps) {
  const [tab, setTab] = useState<'bg' | 'overlays' | 'upload' | 'generate'>('bg');
  const [blurBg, setBlurBg] = useState(false);
  const [activeBgStyle, setActiveBgStyle] = useState('solid');

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

  const overlayPatterns = [
    { name: 'Dots', css: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)', size: '20px 20px' },
    { name: 'Grid', css: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', size: '40px 40px' },
    { name: 'Diagonal', css: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.02) 10px, rgba(255,255,255,0.02) 20px)', size: '' },
    { name: 'Cross', css: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px), radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)', size: '20px 20px' },
    { name: 'Noise light', css: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`, size: '200px 200px' },
    { name: 'Circles', css: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 50%)', size: '80px 80px' },
    { name: 'Waves', css: 'repeating-linear-gradient(0deg, transparent, transparent 15px, rgba(255,255,255,0.015) 15px, rgba(255,255,255,0.015) 16px)', size: '' },
    { name: 'Fine dots', css: 'radial-gradient(circle, rgba(255,255,255,0.08) 0.5px, transparent 0.5px)', size: '10px 10px' },
    { name: 'Hex', css: 'linear-gradient(30deg, rgba(255,255,255,0.02) 12%, transparent 12.5%, transparent 87%, rgba(255,255,255,0.02) 87.5%)', size: '40px 70px' },
    { name: 'Stripe', css: 'repeating-linear-gradient(90deg, transparent, transparent 4px, rgba(255,255,255,0.02) 4px, rgba(255,255,255,0.02) 5px)', size: '' },
    { name: 'Bokeh', css: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.06), transparent 50%), radial-gradient(circle at 70% 70%, rgba(255,255,255,0.04), transparent 50%)', size: '120px 120px' },
    { name: 'Clear', css: 'none', size: '' },
  ];

  const applyOverlay = (pattern: typeof overlayPatterns[0]) => {
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return;
    if (pattern.css === 'none') {
      canvas.style.backgroundImage = '';
      canvas.style.backgroundSize = '';
      toast.success('Overlay cleared');
    } else {
      // Preserve existing background color, add pattern on top
      canvas.style.backgroundImage = pattern.css;
      if (pattern.size) canvas.style.backgroundSize = pattern.size;
      toast.success(`Applied ${pattern.name} overlay`);
    }
  };

  const applyBgStyle = (styleId: string) => {
    setActiveBgStyle(styleId);
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return;
    // Clear any previous pattern
    canvas.style.backgroundImage = '';
    canvas.style.backgroundSize = '';

    switch (styleId) {
      case 'noise':
        canvas.style.backgroundImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E")`;
        canvas.style.backgroundSize = '200px 200px';
        toast.success('Applied noise texture');
        break;
      case 'dots':
        canvas.style.backgroundImage = 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)';
        canvas.style.backgroundSize = '20px 20px';
        toast.success('Applied dot pattern');
        break;
      case 'grid':
        canvas.style.backgroundImage = 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)';
        canvas.style.backgroundSize = '40px 40px';
        toast.success('Applied grid pattern');
        break;
      default:
        toast.success('Solid background');
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return;
    canvas.style.backgroundImage = `url(${url})`;
    canvas.style.backgroundSize = 'cover';
    canvas.style.backgroundPosition = 'center';
    toast.success('Background image applied');
  };

  const applyBlur = (enabled: boolean) => {
    setBlurBg(enabled);
    const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
    if (!canvas) return;
    if (enabled) {
      canvas.style.backdropFilter = 'blur(20px)';
      // Also add a subtle inner blur layer
      canvas.style.filter = 'blur(0px)'; // reset
      toast.success('Blur enabled');
    } else {
      canvas.style.backdropFilter = '';
      canvas.style.filter = '';
      toast.success('Blur disabled');
    }
  };

  const tabs = [
    { id: 'bg' as const, label: 'Backgrounds' },
    { id: 'overlays' as const, label: 'Overlays' },
    { id: 'upload' as const, label: 'Upload' },
    { id: 'generate' as const, label: 'Generate' },
  ];

  return (
    <div className="w-80 bg-[#222] rounded-2xl shadow-2xl border border-white/[0.06] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Tabs */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <div className="flex gap-3">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`text-[11px] font-medium transition-colors ${tab === t.id ? 'text-white' : 'text-white/30 hover:text-white/50'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={() => {
          onChangeBg('#0A0A0F');
          // Also clear any overlays/patterns
          const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
          if (canvas) {
            canvas.style.backgroundImage = '';
            canvas.style.backgroundSize = '';
            canvas.style.backdropFilter = '';
            canvas.style.filter = '';
          }
          setBlurBg(false);
          setActiveBgStyle('solid');
          toast.success('Background reset');
        }} className="text-[10px] text-white/20 hover:text-white/40">Reset</button>
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
              {/* Custom color picker */}
              <label className="w-7 h-7 rounded-full border-2 border-white/10 hover:border-white/30 cursor-pointer overflow-hidden relative" style={{ background: 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)' }}>
                <input
                  type="color"
                  value={currentBg || '#0A0A0F'}
                  onChange={e => onChangeBg(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </label>
            </div>
          </div>

          {/* Gradients */}
          <div>
            <p className="text-[10px] text-white/20 mb-1.5">Gradients</p>
            <div className="grid grid-cols-3 gap-1.5">
              {gradients.map(g => (
                <button key={g.name} onClick={() => {
                  onChangeBg(g.css);
                  // Also apply gradient directly to the canvas for proper rendering
                  const canvas = document.querySelector('[data-slide-canvas]') as HTMLElement;
                  if (canvas) {
                    canvas.style.background = g.css;
                  }
                }} className="aspect-[4/3] rounded-lg border border-white/5 hover:border-white/20 transition-colors" style={{ background: g.css }}>
                  <span className="text-[8px] text-white/30">{g.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Blur toggle */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/40">Blur background</span>
            <button onClick={() => applyBlur(!blurBg)} className={`w-8 h-5 rounded-full transition-colors relative ${blurBg ? 'bg-white/30' : 'bg-white/10'}`}>
              <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${blurBg ? 'left-[14px]' : 'left-0.5'}`} />
            </button>
          </div>

          {/* Background style */}
          <div>
            <p className="text-[10px] text-white/20 mb-1.5">Background style</p>
            <div className="grid grid-cols-4 gap-1.5">
              {BG_STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => applyBgStyle(s.id)}
                  className={`aspect-video rounded-lg border transition-colors flex items-center justify-center ${
                    activeBgStyle === s.id ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:border-white/15'
                  }`}
                >
                  <span className="text-[9px] text-white/40">{s.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'overlays' && (
        <div className="px-3 pb-3">
          <p className="text-[10px] text-white/20 mb-1.5">Pattern overlays</p>
          <div className="grid grid-cols-4 gap-1.5">
            {overlayPatterns.map((p, i) => (
              <button
                key={i}
                onClick={() => applyOverlay(p)}
                className="aspect-square bg-[#1a1a2e] rounded-lg border border-white/5 hover:border-white/15 transition-colors flex items-center justify-center overflow-hidden relative"
                style={p.css !== 'none' ? { backgroundImage: p.css, backgroundSize: p.size || 'auto' } : undefined}
              >
                <span className="text-[8px] text-white/30 relative z-10">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'upload' && (
        <div className="px-3 pb-3">
          <label className="flex flex-col items-center justify-center h-32 border border-dashed border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
            <span className="text-white/20 text-sm mb-1">Upload image</span>
            <span className="text-white/10 text-[10px]">PNG, JPG, SVG</span>
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
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
