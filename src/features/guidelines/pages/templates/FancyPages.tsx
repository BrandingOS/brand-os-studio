/**
 * Premium guideline pages — visually stunning, agency-quality layouts.
 * Each page is a unique design composition, not a generic slide.
 */
import type { Brand } from '@/shared/types/brand';
import type { TemplateLayout } from './layout-config';
import { PageFrame } from './PageFrame';

interface FancyPageProps {
  brand: Brand;
  layout: TemplateLayout;
  pageNumber: number;
  totalPages: number;
}

// ─── BRAND PURPOSE — giant quote style ─────────────────────────

export function BrandPurposePage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Brand Purpose" pageNumber={pageNumber} totalPages={totalPages} dark>
      <div className="flex-1 flex flex-col justify-center relative">
        <span className="absolute top-0 left-0 text-[clamp(60px,12vw,180px)] font-black leading-none" style={{ color: p, opacity: 0.08 }}>"</span>
        <p className="text-[clamp(16px,2.5vw,32px)] font-bold text-white leading-[1.25] max-w-[75%] mt-8">
          {brand.guidelines?.strategy?.positioning || brand.strategy || `${brand.name} exists to transform the way people experience our industry.`}
        </p>
        <div className="mt-6 flex items-center gap-3">
          <div className="w-8 h-[2px] rounded-full" style={{ backgroundColor: p }} />
          <span className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Brand Purpose</span>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── LOGO CONSTRUCTION GRID ────────────────────────────────────

export function LogoConstructionPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Logo System" pageNumber={pageNumber} totalPages={totalPages}>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold mb-4">Logo Construction</h3>
      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-[60%] aspect-[3/1]">
          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-4">
            {Array.from({ length: 48 }).map((_, i) => (
              <div key={i} className="border border-dashed" style={{ borderColor: `${p}15` }} />
            ))}
          </div>
          {/* Logo centered */}
          <div className="absolute inset-0 flex items-center justify-center">
            {brand.logo ? (
              <img src={brand.logo} alt="" className="max-h-[60%] max-w-[80%] object-contain" />
            ) : (
              <span className="text-[clamp(24px,4vw,48px)] font-bold" style={{ color: p }}>{brand.name}</span>
            )}
          </div>
          {/* Measurement annotations */}
          <div className="absolute -top-4 left-[15%] right-[15%] flex items-center">
            <div className="flex-1 h-px" style={{ backgroundColor: `${p}40` }} />
            <span className="px-2 text-[7px] font-mono" style={{ color: `${p}60` }}>x</span>
            <div className="flex-1 h-px" style={{ backgroundColor: `${p}40` }} />
          </div>
          <div className="absolute -left-4 top-[20%] bottom-[20%] flex flex-col items-center">
            <div className="flex-1 w-px" style={{ backgroundColor: `${p}40` }} />
            <span className="py-1 text-[7px] font-mono" style={{ color: `${p}60` }}>y</span>
            <div className="flex-1 w-px" style={{ backgroundColor: `${p}40` }} />
          </div>
        </div>
      </div>
      <p className="text-[9px] opacity-30 text-center">Construction grid — all proportions based on the x-height unit</p>
    </PageFrame>
  );
}

// ─── COLOR RATIO / PERCENTAGE PAGE ─────────────────────────────

export function ColorRatioPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';
  const ratios = [
    { color: p, pct: 45, label: 'Primary' },
    { color: s, pct: 25, label: 'Secondary' },
    { color: '#0A0A0F', pct: 20, label: 'Dark' },
    { color: '#F5F5F5', pct: 10, label: 'Light' },
  ];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Color System" pageNumber={pageNumber} totalPages={totalPages} dark>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold text-white mb-2">Color Ratio</h3>
      <p className="text-[10px] text-white/40 mb-6">Recommended usage proportions across brand touchpoints</p>

      <div className="flex-1 flex flex-col gap-3">
        {/* Horizontal bar chart */}
        <div className="flex h-16 rounded-xl overflow-hidden">
          {ratios.map((r, i) => (
            <div key={i} className="relative flex items-end justify-center pb-1" style={{ width: `${r.pct}%`, backgroundColor: r.color }}>
              <span className="text-[clamp(16px,3vw,32px)] font-black" style={{ color: r.color === '#F5F5F5' ? '#333' : '#fff', opacity: 0.6 }}>{r.pct}%</span>
            </div>
          ))}
        </div>

        {/* Labels */}
        <div className="flex">
          {ratios.map((r, i) => (
            <div key={i} className="flex items-center gap-2" style={{ width: `${r.pct}%` }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color, border: r.color === '#F5F5F5' ? '1px solid #ccc' : 'none' }} />
              <div>
                <p className="text-[9px] font-semibold text-white">{r.label}</p>
                <p className="text-[7px] font-mono text-white/30">{r.color}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Usage tiles */}
        <div className="flex-1 grid grid-cols-4 gap-2 mt-2">
          {ratios.map((r, i) => (
            <div key={i} className="rounded-lg flex flex-col items-center justify-center" style={{ backgroundColor: `${r.color}20` }}>
              <span className="text-[clamp(20px,3vw,40px)] font-black" style={{ color: r.color }}>{r.pct}%</span>
              <span className="text-[8px] text-white/40 mt-1">{r.label}</span>
            </div>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}

// ─── GRADIENT SYSTEM ───────────────────────────────────────────

export function GradientSystemPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';

  const gradients = [
    { name: 'Primary Flow', css: `linear-gradient(135deg, ${p}, ${s})` },
    { name: 'Dark Fade', css: `linear-gradient(180deg, ${p}, #0A0A0F)` },
    { name: 'Warm Shift', css: `linear-gradient(135deg, ${p}dd, ${p}44)` },
    { name: 'Signal', css: `linear-gradient(90deg, ${s}, ${p})` },
    { name: 'Depth', css: `linear-gradient(180deg, #0A0A0F, ${p}88)` },
    { name: 'Aurora', css: `linear-gradient(135deg, ${s}88, ${p}, ${p}88)` },
  ];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Color System" pageNumber={pageNumber} totalPages={totalPages}>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold mb-2">Gradient System</h3>
      <p className="text-[10px] opacity-40 mb-4">Approved gradient combinations for backgrounds and accents</p>

      <div className="flex-1 grid grid-cols-3 gap-3">
        {gradients.map((g, i) => (
          <div key={i} className="rounded-xl overflow-hidden flex flex-col">
            <div className="flex-1 min-h-[60px]" style={{ background: g.css }} />
            <div className="py-2">
              <p className="text-[10px] font-semibold">{g.name}</p>
              <p className="text-[7px] font-mono opacity-30 mt-0.5 truncate">{g.css}</p>
            </div>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

// ─── DARK MODE SPECS ───────────────────────────────────────────

export function DarkModePage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Color System" pageNumber={pageNumber} totalPages={totalPages} dark>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold text-white mb-2">Dark Mode</h3>
      <p className="text-[10px] text-white/40 mb-4">Adapted palette for dark interfaces and environments</p>

      <div className="flex-1 grid grid-cols-2 gap-4">
        {/* Light vs Dark comparison */}
        <div className="rounded-xl overflow-hidden border border-white/10">
          <div className="bg-white p-4 h-[50%]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p }} />
              <span className="text-[9px] font-semibold text-gray-800">Light Mode</span>
            </div>
            <div className="space-y-1">
              <div className="h-2 w-3/4 rounded bg-gray-200" />
              <div className="h-2 w-1/2 rounded bg-gray-200" />
            </div>
            <div className="mt-2 px-2 py-1 rounded text-[8px] font-medium text-white inline-block" style={{ backgroundColor: p }}>Button</div>
          </div>
          <div className="bg-[#0A0A0F] p-4 h-[50%]">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p }} />
              <span className="text-[9px] font-semibold text-white">Dark Mode</span>
            </div>
            <div className="space-y-1">
              <div className="h-2 w-3/4 rounded bg-white/10" />
              <div className="h-2 w-1/2 rounded bg-white/10" />
            </div>
            <div className="mt-2 px-2 py-1 rounded text-[8px] font-medium text-white inline-block" style={{ backgroundColor: p }}>Button</div>
          </div>
        </div>

        {/* Dark palette */}
        <div className="space-y-2">
          {[
            { name: 'Surface', hex: '#0A0A0F' },
            { name: 'Surface Elevated', hex: '#1a1a2e' },
            { name: 'Border', hex: '#2a2a3e' },
            { name: 'Text Primary', hex: '#ffffff' },
            { name: 'Text Secondary', hex: '#a0a0b0' },
            { name: 'Text Muted', hex: '#606070' },
          ].map(c => (
            <div key={c.name} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded" style={{ backgroundColor: c.hex, border: c.hex === '#0A0A0F' ? '1px solid #333' : 'none' }} />
              <div>
                <p className="text-[9px] font-medium text-white">{c.name}</p>
                <p className="text-[7px] font-mono text-white/30">{c.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}

// ─── BRAND ARCHETYPE ───────────────────────────────────────────

export function BrandArchetypePage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const personality = brand.guidelines?.strategy?.personality || ['Expert', 'Trustworthy', 'Innovative'];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Brand Foundation" pageNumber={pageNumber} totalPages={totalPages} dark>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold text-white mb-2">Brand Archetype</h3>
      <p className="text-[10px] text-white/40 mb-6">Where {brand.name} sits on the personality spectrum</p>

      <div className="flex-1 flex flex-col gap-4">
        {[
          { label: 'Playful', opposite: 'Serious', pos: 75 },
          { label: 'Casual', opposite: 'Formal', pos: 65 },
          { label: 'Abstract', opposite: 'Concrete', pos: 45 },
          { label: 'Warm', opposite: 'Cool', pos: 55 },
          { label: 'Minimal', opposite: 'Expressive', pos: 35 },
        ].map(spec => (
          <div key={spec.label}>
            <div className="flex justify-between mb-1">
              <span className="text-[8px] text-white/40 uppercase tracking-wider">{spec.label}</span>
              <span className="text-[8px] text-white/40 uppercase tracking-wider">{spec.opposite}</span>
            </div>
            <div className="relative h-2 rounded-full bg-white/5">
              <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${spec.pos}%`, background: `linear-gradient(90deg, ${p}60, ${p})` }} />
              <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 shadow-lg" style={{ left: `${spec.pos}%`, transform: 'translate(-50%, -50%)', borderColor: p }} />
            </div>
          </div>
        ))}

        <div className="mt-auto flex gap-2">
          {personality.map(trait => (
            <span key={trait} className="px-3 py-1 rounded-full text-[9px] font-medium border" style={{ borderColor: `${p}40`, color: p }}>{trait}</span>
          ))}
        </div>
      </div>
    </PageFrame>
  );
}

// ─── PATTERN / TEXTURE SYSTEM ──────────────────────────────────

export function PatternSystemPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Graphic Elements" pageNumber={pageNumber} totalPages={totalPages}>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold mb-2">Pattern System</h3>
      <p className="text-[10px] opacity-40 mb-4">Ownable patterns derived from the brand's visual language</p>

      <div className="flex-1 grid grid-cols-3 gap-3">
        {/* Dot grid */}
        <div className="rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center p-4" style={{ background: `radial-gradient(circle, ${p}20 1px, transparent 1px)`, backgroundSize: '12px 12px' }}>
          <span className="text-[9px] font-medium bg-white/80 px-2 py-1 rounded">Dot Grid</span>
        </div>
        {/* Diagonal lines */}
        <div className="rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center p-4" style={{ background: `repeating-linear-gradient(45deg, transparent, transparent 8px, ${p}10 8px, ${p}10 9px)` }}>
          <span className="text-[9px] font-medium bg-white/80 px-2 py-1 rounded">Diagonal</span>
        </div>
        {/* Cross hatch */}
        <div className="rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center p-4" style={{ background: `repeating-linear-gradient(0deg, transparent, transparent 10px, ${p}08 10px, ${p}08 11px), repeating-linear-gradient(90deg, transparent, transparent 10px, ${p}08 10px, ${p}08 11px)` }}>
          <span className="text-[9px] font-medium bg-white/80 px-2 py-1 rounded">Cross</span>
        </div>
        {/* Solid blocks */}
        <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ backgroundColor: p }}>
          <span className="text-[9px] font-medium text-white px-2 py-1 rounded bg-black/20">Solid Brand</span>
        </div>
        {/* Gradient */}
        <div className="rounded-xl overflow-hidden flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${p}, ${brand.secondaryColor || '#000'})` }}>
          <span className="text-[9px] font-medium text-white px-2 py-1 rounded bg-black/20">Gradient</span>
        </div>
        {/* Noise texture */}
        <div className="rounded-xl overflow-hidden border border-gray-100 flex items-center justify-center bg-gray-50 relative">
          <div className="absolute inset-0" style={{ opacity: 0.15, backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")' }} />
          <span className="relative text-[9px] font-medium px-2 py-1 rounded bg-white/80">Noise</span>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── STATIONERY MOCKUP ─────────────────────────────────────────

export function StationeryMockupPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Applications" pageNumber={pageNumber} totalPages={totalPages} dark>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold text-white mb-2">Stationery</h3>
      <p className="text-[10px] text-white/40 mb-4">Cohesive identity across all printed materials</p>

      <div className="flex-1 flex items-center justify-center gap-4">
        {/* Letterhead */}
        <div className="w-[25%] bg-white rounded shadow-2xl p-3 aspect-[1/1.4]">
          <div className="flex items-center justify-between mb-4">
            {brand.logo ? <img src={brand.logo} alt="" className="h-3 object-contain" /> : <span className="text-[7px] font-bold" style={{ color: p }}>{brand.name}</span>}
            <div className="w-8 h-[1px]" style={{ backgroundColor: p }} />
          </div>
          <div className="space-y-1.5 mt-6">
            <div className="h-1 w-full rounded bg-gray-100" />
            <div className="h-1 w-full rounded bg-gray-100" />
            <div className="h-1 w-3/4 rounded bg-gray-100" />
            <div className="h-1 w-full rounded bg-gray-100 mt-3" />
            <div className="h-1 w-5/6 rounded bg-gray-100" />
          </div>
        </div>

        {/* Business card */}
        <div className="w-[30%] flex flex-col gap-2">
          <div className="bg-white rounded shadow-2xl p-3 aspect-[1.75/1]">
            {brand.logo ? <img src={brand.logo} alt="" className="h-2.5 object-contain" /> : <span className="text-[6px] font-bold" style={{ color: p }}>{brand.name}</span>}
            <div className="mt-auto pt-3">
              <p className="text-[6px] font-semibold text-gray-800">Jane Smith</p>
              <p className="text-[5px]" style={{ color: p }}>Brand Manager</p>
            </div>
          </div>
          <div className="rounded shadow-2xl p-3 aspect-[1.75/1] flex items-center justify-center" style={{ backgroundColor: p }}>
            {brand.logo ? <img src={brand.logo} alt="" className="h-4 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-sm font-bold text-white">{brand.name}</span>}
          </div>
        </div>

        {/* Envelope */}
        <div className="w-[30%] bg-white rounded shadow-2xl p-3 aspect-[2.2/1]">
          <div className="flex items-start gap-2">
            {brand.logo ? <img src={brand.logo} alt="" className="h-2 object-contain" /> : <span className="text-[5px] font-bold" style={{ color: p }}>{brand.name}</span>}
            <div className="text-[4px] text-gray-400 mt-0.5">
              <p>123 Brand Street</p>
              <p>City, ST 12345</p>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── DIGITAL PRODUCT UI ────────────────────────────────────────

export function DigitalProductPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Applications" pageNumber={pageNumber} totalPages={totalPages}>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold mb-2">Digital Product</h3>
      <p className="text-[10px] opacity-40 mb-4">Brand identity applied to web and mobile interfaces</p>

      <div className="flex-1 flex items-center justify-center gap-6">
        {/* Desktop */}
        <div className="w-[55%]">
          <div className="bg-gray-800 rounded-t-lg p-1 flex gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          </div>
          <div className="bg-white rounded-b-lg border border-gray-200 overflow-hidden">
            <div className="h-6 flex items-center px-3 border-b border-gray-100" style={{ backgroundColor: p }}>
              {brand.logo ? <img src={brand.logo} alt="" className="h-2.5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-[7px] font-bold text-white">{brand.name}</span>}
              <div className="ml-auto flex gap-2">
                {['Products', 'About', 'Contact'].map(item => <span key={item} className="text-[5px] text-white/60">{item}</span>)}
              </div>
            </div>
            <div className="p-4 space-y-2">
              <div className="h-1.5 w-2/3 rounded bg-gray-100" />
              <div className="h-1 w-1/2 rounded bg-gray-100" />
              <div className="mt-3 px-2 py-1 rounded text-[6px] text-white inline-block" style={{ backgroundColor: p }}>Get Started</div>
            </div>
          </div>
        </div>

        {/* Mobile */}
        <div className="w-[18%]">
          <div className="bg-gray-900 rounded-2xl p-1.5 shadow-2xl">
            <div className="bg-white rounded-xl overflow-hidden">
              <div className="h-4 flex items-center justify-center" style={{ backgroundColor: p }}>
                {brand.logo ? <img src={brand.logo} alt="" className="h-1.5 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-[5px] font-bold text-white">{brand.name}</span>}
              </div>
              <div className="p-2 space-y-1">
                <div className="h-1 w-full rounded bg-gray-100" />
                <div className="h-1 w-3/4 rounded bg-gray-100" />
                <div className="h-6 w-full rounded-lg bg-gray-50 mt-2" />
                <div className="h-6 w-full rounded-lg bg-gray-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

// ─── BRAND TOUCHPOINTS MAP ─────────────────────────────────────

export function TouchpointMapPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  const touchpoints = ['Website', 'Mobile App', 'Social Media', 'Email', 'Print', 'Packaging', 'Signage', 'Events'];

  return (
    <PageFrame brand={brand} layout={layout} sectionName="Brand System" pageNumber={pageNumber} totalPages={totalPages} dark>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold text-white mb-2">Touchpoints</h3>
      <p className="text-[10px] text-white/40 mb-6">Every surface where the brand meets the audience</p>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative">
          {/* Center circle */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ backgroundColor: `${p}20`, border: `2px solid ${p}` }}>
            {brand.logo ? <img src={brand.logo} alt="" className="w-8 h-8 object-contain" style={{ filter: 'brightness(0) invert(1)' }} /> : <span className="text-sm font-bold text-white">{brand.name.charAt(0)}</span>}
          </div>
          {/* Orbiting touchpoints */}
          {touchpoints.map((tp, i) => {
            const angle = (i / touchpoints.length) * 360;
            const rad = (angle * Math.PI) / 180;
            const radius = 80;
            const x = Math.cos(rad) * radius;
            const y = Math.sin(rad) * radius;
            return (
              <div key={tp} className="absolute flex items-center gap-1.5" style={{ left: `calc(50% + ${x}px - 30px)`, top: `calc(50% + ${y}px - 8px)` }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p }} />
                <span className="text-[8px] text-white/70 whitespace-nowrap">{tp}</span>
              </div>
            );
          })}
        </div>
      </div>
    </PageFrame>
  );
}

// ─── MOTION PRINCIPLES ─────────────────────────────────────────

export function MotionPrinciplesPage({ brand, layout, pageNumber, totalPages }: FancyPageProps) {
  const p = brand.primaryColor;
  return (
    <PageFrame brand={brand} layout={layout} sectionName="Motion" pageNumber={pageNumber} totalPages={totalPages}>
      <h3 className="text-[clamp(14px,2vw,24px)] font-bold mb-2">Motion Principles</h3>
      <p className="text-[10px] opacity-40 mb-4">How the brand moves and transitions</p>

      <div className="flex-1 grid grid-cols-3 gap-4">
        {[
          { name: 'Ease Out', curve: 'cubic-bezier(0, 0, 0.2, 1)', desc: 'For elements entering — fast start, gentle landing', path: 'M 0 100 C 0 0, 20 0, 100 0' },
          { name: 'Ease In-Out', curve: 'cubic-bezier(0.4, 0, 0.2, 1)', desc: 'For transitions — smooth start and finish', path: 'M 0 100 C 40 100, 20 0, 100 0' },
          { name: 'Spring', curve: 'cubic-bezier(0.34, 1.56, 0.64, 1)', desc: 'For interactive feedback — playful overshoot', path: 'M 0 100 C 34 -56, 64 0, 100 0' },
        ].map(m => (
          <div key={m.name} className="rounded-xl border border-gray-200 p-4 flex flex-col">
            <h4 className="text-[11px] font-semibold mb-1">{m.name}</h4>
            <p className="text-[8px] opacity-40 mb-3">{m.desc}</p>
            {/* Curve visualization */}
            <div className="flex-1 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-full h-16">
                <rect x="0" y="0" width="100" height="100" fill="none" stroke={`${p}10`} strokeWidth="0.5" />
                <path d={m.path} fill="none" stroke={p} strokeWidth="2" />
              </svg>
            </div>
            <p className="text-[7px] font-mono opacity-20 mt-2 text-center">{m.curve}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6 mt-4 pt-3 border-t border-gray-100">
        {[
          { label: 'Duration', value: '200-400ms' },
          { label: 'Stagger', value: '50ms between items' },
          { label: 'Distance', value: '8-24px max' },
        ].map(spec => (
          <div key={spec.label}>
            <p className="text-[8px] font-semibold uppercase tracking-wider opacity-30">{spec.label}</p>
            <p className="text-[10px] font-medium">{spec.value}</p>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
