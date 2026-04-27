import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Profile-icon extensions — 18 designs to join the legacy 12 = 30
 * total for the Social::Profile drilldown. Each is a SQUARE
 * composition (the cosmos tile is landscape so we frame the
 * square centered in the tile). Brand initial + color is the
 * common anchor; layouts vary across simple flat, gradient, ringed,
 * geometric, and decorative directions.
 */
interface Props { brand: Brand; templateIndex: number }

function ProfileFrame({ children, bg = '#0F1216' }: { children: React.ReactNode; bg?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bg }}>
      <div className="aspect-square h-[88%] relative overflow-hidden rounded-full">
        {children}
      </div>
    </div>
  );
}

export function SocialProfileExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();

  const designs = [
    // 0 — Solid Brand. Pure brand color, big initial.
    (<ProfileFrame><div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: p }}><div className="text-white font-serif font-black" style={{ fontSize: '48%' }}>{init}</div></div></ProfileFrame>),
    // 1 — Ring + Mark. Brand-color ring around white core with mark.
    (<ProfileFrame bg="#fff"><div className="absolute inset-0 rounded-full" style={{ background: p }} /><div className="absolute inset-[12%] rounded-full bg-white flex items-center justify-center"><BrandLogo brand={brand} size="md" color={p} /></div></ProfileFrame>),
    // 2 — Diagonal Split. Brand on one side, dark on the other.
    (<ProfileFrame><div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p} 0%, ${p} 50%, #0F1216 50%, #0F1216 100%)` }} /><div className="absolute inset-0 flex items-center justify-center text-white font-serif font-black" style={{ fontSize: '40%' }}>{init}</div></ProfileFrame>),
    // 3 — Gradient Disc. Smooth gradient from brand to dark.
    (<ProfileFrame><div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 30%, ${p} 0%, ${p}88 50%, #0F1216 100%)` }} /><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color="#ffffff" /></div></ProfileFrame>),
    // 4 — Stripes. Bold horizontal brand stripes.
    (<ProfileFrame><div className="absolute inset-0" style={{ background: `repeating-linear-gradient(0deg, ${p} 0 12%, #0F1216 12% 24%)` }} /><div className="absolute inset-[20%] rounded-full bg-white flex items-center justify-center"><div className="text-[28px] font-serif font-bold" style={{ color: p }}>{init}</div></div></ProfileFrame>),
    // 5 — Dots Grid.
    (<ProfileFrame bg="#FBF8EE"><div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle, ${p} 1.5px, transparent 2px)`, backgroundSize: '8px 8px' }} /><div className="absolute inset-0 flex items-center justify-center"><div className="bg-white px-2 py-0.5 rounded text-[18px] font-serif font-bold" style={{ color: p }}>{init}</div></div></ProfileFrame>),
    // 6 — Concentric Rings.
    (<ProfileFrame><div className="absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, transparent 0%, transparent 24%, ${p} 24.5%, ${p} 28%, transparent 28.5%, transparent 50%, ${p} 50.5%, ${p} 54%, transparent 54.5%, transparent 100%)` }} /><div className="absolute inset-0 flex items-center justify-center text-white text-[26px] font-serif font-bold">{init}</div></ProfileFrame>),
    // 7 — Half Moon.
    (<ProfileFrame bg={p}><div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p} 50%, #FBF8EE 50%, #FBF8EE 100%)` }} /><div className="absolute inset-0 flex items-center justify-center"><div className="text-[36px] font-serif font-black leading-none" style={{ color: '#0F1216' }}>{init}</div></div></ProfileFrame>),
    // 8 — Mosaic Tiles.
    (<ProfileFrame><div className="absolute inset-0 grid grid-cols-4 grid-rows-4">{Array.from({length:16}).map((_,i)=> <div key={i} style={{background: (i*3 + i%5) % 3 === 0 ? p : i % 2 === 0 ? '#0F1216' : '#FBF8EE' }} />)}</div><div className="absolute inset-[26%] rounded-full bg-white flex items-center justify-center"><BrandLogo brand={brand} size="sm" color={p} /></div></ProfileFrame>),
    // 9 — Sun Rays.
    (<ProfileFrame bg={p}><div className="absolute inset-0" style={{ background: `conic-gradient(from 0deg, ${p} 0 30deg, ${p}DD 30 60deg, ${p} 60 90deg, ${p}DD 90 120deg, ${p} 120 150deg, ${p}DD 150 180deg, ${p} 180 210deg, ${p}DD 210 240deg, ${p} 240 270deg, ${p}DD 270 300deg, ${p} 300 330deg, ${p}DD 330 360deg)` }} /><div className="absolute inset-[18%] rounded-full bg-[#FBF8EE] flex items-center justify-center text-[26px] font-serif font-black" style={{color:p}}>{init}</div></ProfileFrame>),
    // 10 — Quarter Pie.
    (<ProfileFrame bg="#FBF8EE"><div className="absolute inset-0" style={{ background: `conic-gradient(${p} 0 25%, transparent 25% 100%)` }} /><div className="absolute inset-0 flex items-center justify-center"><div className="text-[32px] font-serif font-black text-gray-900">{init}</div></div></ProfileFrame>),
    // 11 — Halftone.
    (<ProfileFrame bg="#FBF8EE"><div className="absolute inset-0 rounded-full" style={{ background: `linear-gradient(135deg, ${p}EE 0%, ${p}66 100%)` }} /><div className="absolute inset-0 mix-blend-multiply opacity-60 rounded-full" style={{ backgroundImage: `radial-gradient(circle, #111 0.6px, transparent 0.7px)`, backgroundSize: '4px 4px' }} /><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color="#ffffff" /></div></ProfileFrame>),
    // 12 — Wordmark Outline.
    (<ProfileFrame bg="#0F1216"><div className="absolute inset-[8%] rounded-full border-2" style={{ borderColor: p }} /><div className="absolute inset-0 flex items-center justify-center"><div className="text-[8px] uppercase tracking-[0.32em] font-bold text-white">{brand.name}</div></div></ProfileFrame>),
    // 13 — Shadow Stack.
    (<ProfileFrame bg="#FBF8EE"><div className="absolute inset-[18%] rounded-full" style={{ background: `${p}33` }} /><div className="absolute inset-[14%] rounded-full" style={{ background: `${p}66` }} /><div className="absolute inset-[10%] rounded-full" style={{ background: p }} /><div className="absolute inset-0 flex items-center justify-center text-white text-[28px] font-serif font-bold">{init}</div></ProfileFrame>),
    // 14 — Bold Type Outline.
    (<ProfileFrame bg={p}><div className="absolute inset-0 flex items-center justify-center" style={{ color: 'transparent', WebkitTextStroke: `2px #fff`, fontSize: '48%', fontWeight: 900, fontFamily: 'serif' }}>{init}</div></ProfileFrame>),
    // 15 — Brand Wedge.
    (<ProfileFrame bg="#FBF8EE"><div className="absolute inset-0" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} /><div className="absolute inset-0 flex items-end justify-end p-2"><div className="text-[26px] font-serif font-black" style={{ color: p }}>{init}</div></div></ProfileFrame>),
    // 16 — Initial in Box.
    (<ProfileFrame bg={p}><div className="absolute inset-[20%] bg-white flex items-center justify-center"><div className="text-[28px] font-serif font-black" style={{ color: p }}>{init}</div></div></ProfileFrame>),
    // 17 — Avatar Mono. Subtle textured neutral with small mark.
    (<ProfileFrame bg="#0F1216"><div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 40% 40%, #2A2F32, #0F1216 70%)' }} /><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color={p} /></div></ProfileFrame>),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const SOCIAL_PROFILE_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Solid Brand', category: 'Bold' },
  { idSuffix: 'ext-2', name: 'Ring + Mark', category: 'Modern' },
  { idSuffix: 'ext-3', name: 'Diagonal Split', category: 'Bold' },
  { idSuffix: 'ext-4', name: 'Gradient Disc', category: 'Modern' },
  { idSuffix: 'ext-5', name: 'Stripes', category: 'Bold' },
  { idSuffix: 'ext-6', name: 'Dots Grid', category: 'Modern' },
  { idSuffix: 'ext-7', name: 'Concentric Rings', category: 'Modern' },
  { idSuffix: 'ext-8', name: 'Half Moon', category: 'Bold' },
  { idSuffix: 'ext-9', name: 'Mosaic Tiles', category: 'Modern' },
  { idSuffix: 'ext-10', name: 'Sun Rays', category: 'Bold' },
  { idSuffix: 'ext-11', name: 'Quarter Pie', category: 'Modern' },
  { idSuffix: 'ext-12', name: 'Halftone', category: 'Modern' },
  { idSuffix: 'ext-13', name: 'Wordmark Outline', category: 'Minimalist' },
  { idSuffix: 'ext-14', name: 'Shadow Stack', category: 'Modern' },
  { idSuffix: 'ext-15', name: 'Type Outline', category: 'Bold' },
  { idSuffix: 'ext-16', name: 'Brand Wedge', category: 'Bold' },
  { idSuffix: 'ext-17', name: 'Initial Box', category: 'Modern' },
  { idSuffix: 'ext-18', name: 'Avatar Mono', category: 'Minimalist' },
] as const;
