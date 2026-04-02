import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';

interface BrandGuideRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function BrandGuideRenderer({ brand, templateIndex }: BrandGuideRendererProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';

  const guides = [
    // 0: Cover slide — clean
    (
      <div className="w-full h-full bg-white flex flex-col justify-between p-[8%] relative overflow-hidden">
        <BrandLogo brand={brand} size="sm" />
        <div>
          <div className="text-[8px] font-bold text-gray-900 leading-tight">Brand<br/>Guidelines</div>
          <div className="text-[4px] text-gray-400 mt-1">Version 2.0 — 2025</div>
        </div>
        <div className="absolute bottom-0 right-0 w-[40%] h-[35%]" style={{ backgroundColor: `${p}08` }} />
        <div className="absolute bottom-0 right-0 w-[30%] h-[25%]" style={{ backgroundColor: `${p}12` }} />
      </div>
    ),
    // 1: Color palette slide
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>Color System</div>
        <div className="text-[6px] font-bold text-gray-900 mb-2">Brand Palette</div>
        <div className="flex-1 flex gap-1">
          <div className="flex-1 rounded-sm flex flex-col justify-end p-1" style={{ backgroundColor: p }}>
            <div className="text-[3px] text-white/70 font-mono">{p}</div>
            <div className="text-[3px] text-white font-semibold">Primary</div>
          </div>
          <div className="flex-1 rounded-sm flex flex-col justify-end p-1" style={{ backgroundColor: s }}>
            <div className="text-[3px] text-white/70 font-mono">{s}</div>
            <div className="text-[3px] text-white font-semibold">Secondary</div>
          </div>
          <div className="flex-1 rounded-sm flex flex-col justify-end p-1 bg-[#0F172A]">
            <div className="text-[3px] text-white/70 font-mono">#0F172A</div>
            <div className="text-[3px] text-white font-semibold">Dark</div>
          </div>
          <div className="flex-1 rounded-sm flex flex-col justify-end p-1 bg-gray-100 border border-gray-200">
            <div className="text-[3px] text-gray-400 font-mono">#F8FAFC</div>
            <div className="text-[3px] text-gray-600 font-semibold">Light</div>
          </div>
        </div>
      </div>
    ),
    // 2: Typography slide
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>Typography</div>
        <div className="text-[6px] font-bold text-gray-900 mb-2">Type Scale</div>
        <div className="flex-1 flex flex-col justify-center space-y-1">
          <div className="text-[10px] font-bold text-gray-900" style={{ fontFamily: brand.fonts.secondary || brand.fonts.primary }}>Heading 1</div>
          <div className="text-[7px] font-semibold text-gray-700">Heading 2</div>
          <div className="text-[5px] text-gray-600">Body text — {brand.fonts.primary}</div>
          <div className="text-[3.5px] text-gray-400">Caption text</div>
        </div>
      </div>
    ),
    // 3: Logo usage slide
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>Logo System</div>
        <div className="text-[6px] font-bold text-gray-900 mb-2">Usage Guidelines</div>
        <div className="flex-1 grid grid-cols-2 gap-1">
          <div className="rounded-sm bg-white border border-gray-100 flex items-center justify-center p-2">
            <BrandLogo brand={brand} size="sm" />
          </div>
          <div className="rounded-sm flex items-center justify-center p-2" style={{ backgroundColor: p }}>
            <BrandLogo brand={brand} size="sm" color="#ffffff" />
          </div>
          <div className="rounded-sm bg-[#0F172A] flex items-center justify-center p-2">
            <BrandLogo brand={brand} size="sm" color="#ffffff" />
          </div>
          <div className="rounded-sm bg-gray-50 flex items-center justify-center p-2">
            <BrandLogo brand={brand} variant="monogram" size="md" />
          </div>
        </div>
      </div>
    ),
    // 4: Dark cover
    (
      <div className="w-full h-full flex flex-col justify-between p-[8%]" style={{ backgroundColor: '#0F172A' }}>
        <BrandLogo brand={brand} size="xs" color="#ffffff" />
        <div>
          <div className="text-[8px] text-white font-bold leading-tight">Visual<br/>Identity<br/>System</div>
          <div className="mt-1 w-6 h-[2px] rounded-full" style={{ backgroundColor: s }} />
        </div>
        <div className="text-[3.5px] text-gray-500">{brand.name} — Confidential</div>
      </div>
    ),
    // 5: Gradient cover
    (
      <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
        <BrandLogo brand={brand} size="lg" color="#ffffff" />
        <div className="mt-2 text-[5px] text-white/60">Brand Guidelines 2025</div>
        <div className="absolute -bottom-8 -right-8 w-20 h-20 rounded-full bg-white/5" />
        <div className="absolute -top-4 -left-4 w-12 h-12 rounded-full bg-white/5" />
      </div>
    ),
    // 6: Voice & tone slide
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>Voice & Tone</div>
        <div className="text-[6px] font-bold text-gray-900 mb-1.5">How We Speak</div>
        <div className="flex-1 grid grid-cols-2 gap-1">
          {['Confident', 'Clear', 'Human', 'Sharp'].map((attr) => (
            <div key={attr} className="rounded-sm p-1.5 flex items-center gap-1" style={{ backgroundColor: `${p}06` }}>
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: s }} />
              <span className="text-[4px] font-medium text-gray-700">{attr}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    // 7: Applications slide
    (
      <div className="w-full h-full bg-gray-50 flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>Applications</div>
        <div className="text-[6px] font-bold text-gray-900 mb-2">In Context</div>
        <div className="flex-1 flex gap-1">
          <div className="flex-1 bg-white rounded-sm border border-gray-100 p-1.5 flex flex-col justify-between">
            <BrandLogo brand={brand} size="xs" />
            <div className="space-y-0.5">
              <div className="h-0.5 rounded-full bg-gray-200 w-full" />
              <div className="h-0.5 rounded-full bg-gray-200 w-3/4" />
            </div>
          </div>
          <div className="flex-1 rounded-sm p-1.5 flex flex-col items-center justify-center" style={{ backgroundColor: p }}>
            <BrandLogo brand={brand} variant="monogram" size="sm" color="#ffffff" />
            <div className="text-[3px] text-white/50 mt-1">Mobile App</div>
          </div>
        </div>
      </div>
    ),
  ];

  return guides[templateIndex % guides.length];
}
