import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';

interface PresentationRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function PresentationRenderer({ brand, templateIndex }: PresentationRendererProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';

  const slides = [
    // 0: Title slide — dark
    (
      <div className="w-full h-full flex flex-col justify-between p-[8%]" style={{ backgroundColor: '#0F172A' }}>
        <BrandLogo brand={brand} size="xs" color="#ffffff" />
        <div>
          <div className="text-[9px] text-white font-bold leading-tight">Quarterly<br/>Business Review</div>
          <div className="text-[4px] text-gray-400 mt-1">Q4 2025 — Confidential</div>
        </div>
        <div className="w-8 h-[2px] rounded-full" style={{ backgroundColor: s }} />
      </div>
    ),
    // 1: Content slide — metrics
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>Key Metrics</div>
        <div className="text-[7px] font-bold text-gray-900 mb-2">Performance Summary</div>
        <div className="flex-1 grid grid-cols-3 gap-1">
          {[
            { label: 'Revenue', value: '$4.2M', change: '+18%' },
            { label: 'Users', value: '52K', change: '+24%' },
            { label: 'NPS', value: '72', change: '+8' },
          ].map((m) => (
            <div key={m.label} className="rounded-sm p-1.5" style={{ backgroundColor: `${p}08` }}>
              <div className="text-[3.5px] text-gray-500">{m.label}</div>
              <div className="text-[8px] font-bold text-gray-900">{m.value}</div>
              <div className="text-[3.5px] font-semibold" style={{ color: s }}>{m.change}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    // 2: Section divider
    (
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: p }}>
        <div className="text-center">
          <div className="text-[4px] text-white/40 uppercase tracking-widest font-semibold">Section 02</div>
          <div className="text-[10px] text-white font-bold leading-tight mt-0.5">Product<br/>Strategy</div>
        </div>
        <div className="absolute -bottom-6 -right-6 w-16 h-16 rounded-full" style={{ backgroundColor: s, opacity: 0.1 }} />
      </div>
    ),
    // 3: Chart slide
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>Growth</div>
        <div className="text-[6px] font-bold text-gray-900 mb-2">Monthly Active Users</div>
        <div className="flex-1 flex items-end gap-[2px] pb-1">
          {[25, 30, 35, 32, 40, 45, 42, 50, 55, 60, 65, 72].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: i === 11 ? s : `${p}70` }} />
          ))}
        </div>
        <div className="flex justify-between text-[3px] text-gray-400 mt-0.5">
          <span>Jan</span><span>Mar</span><span>Jun</span><span>Sep</span><span>Dec</span>
        </div>
      </div>
    ),
    // 4: Team slide
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%]">
        <div className="text-[4px] uppercase tracking-wider font-semibold mb-1" style={{ color: p }}>The Team</div>
        <div className="text-[6px] font-bold text-gray-900 mb-2">Leadership</div>
        <div className="flex-1 grid grid-cols-3 gap-2">
          {['CEO', 'CTO', 'CFO'].map((role) => (
            <div key={role} className="flex flex-col items-center">
              <div className="w-5 h-5 rounded-full mb-0.5" style={{ backgroundColor: `${p}15` }} />
              <div className="text-[3.5px] font-semibold text-gray-800">{role}</div>
              <div className="text-[3px] text-gray-400">Full Name</div>
            </div>
          ))}
        </div>
      </div>
    ),
    // 5: Closing slide
    (
      <div className="w-full h-full flex flex-col items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${p}, #0F172A)` }}>
        <BrandLogo brand={brand} size="md" color="#ffffff" />
        <div className="mt-2 text-[5px] text-white/50">Thank you</div>
        <div className="mt-0.5 text-[3.5px] text-white/30">{brand.name.toLowerCase()}.com</div>
      </div>
    ),
    // 6: White title slide
    (
      <div className="w-full h-full bg-white flex flex-col justify-between p-[8%]">
        <BrandLogo brand={brand} size="sm" />
        <div>
          <div className="text-[9px] font-bold text-gray-900 leading-tight">Annual<br/>Report 2025</div>
          <div className="text-[4px] text-gray-400 mt-1">Building the future of financial intelligence</div>
        </div>
        <div className="w-full h-[2px] rounded-full" style={{ background: `linear-gradient(90deg, ${p}, ${s})` }} />
      </div>
    ),
    // 7: Bold quote
    (
      <div className="w-full h-full flex items-center justify-center p-[10%]" style={{ backgroundColor: `${p}08` }}>
        <div className="text-center">
          <div className="text-[8px] font-bold text-gray-900 leading-tight">"Complexity is the<br/>enemy of execution."</div>
          <div className="mt-1.5 w-5 h-[1.5px] mx-auto" style={{ backgroundColor: s }} />
          <div className="mt-1 text-[3.5px] text-gray-400">{brand.name} Philosophy</div>
        </div>
      </div>
    ),
  ];

  return slides[templateIndex % slides.length];
}
