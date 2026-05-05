import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Facebook-cover extensions — 22 wide landscape designs join the
 * legacy 8 = 30 total for Social::Cover. Each fills the cosmos
 * tile edge-to-edge with a banner composition.
 */
interface Props { brand: Brand; templateIndex: number }

export function SocialCoverExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();

  const designs = [
    // 0 — Solid Brand banner with centered title.
    (<div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: p }}><div className="text-center text-white"><BrandLogo brand={brand} size="md" color="#ffffff" /><div className="text-[10px] uppercase tracking-[0.32em] mt-2 opacity-90">{brand.name}</div></div></div>),
    // 1 — Editorial Title — big serif name.
    (<div className="w-full h-full bg-[#FBF8EE] flex items-center justify-center"><div className="text-center"><div className="text-[3px] uppercase tracking-[0.32em] text-gray-500">studio</div><div className="text-[36px] font-serif font-black tracking-tight" style={{ color: p }}>{brand.name}</div></div></div>),
    // 2 — Diagonal Split.
    (<div className="w-full h-full relative overflow-hidden bg-white"><div className="absolute inset-0" style={{ background: `linear-gradient(105deg, ${p} 0%, ${p} 50%, transparent 50.5%, transparent 100%)` }} /><div className="absolute left-[6%] top-1/2 -translate-y-1/2 text-white"><BrandLogo brand={brand} size="sm" color="#ffffff" /><div className="text-[6px] uppercase tracking-[0.32em] mt-1 opacity-90">{brand.name}</div></div><div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right text-gray-700"><div className="text-[10px] font-serif italic">a brand · 2026</div></div></div>),
    // 3 — Halftone Wash.
    (<div className="w-full h-full relative overflow-hidden"><div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${p} 0%, ${p}66 100%)` }} /><div className="absolute inset-0 mix-blend-multiply opacity-50" style={{ backgroundImage: `radial-gradient(circle, #111 0.6px, transparent 0.7px)`, backgroundSize: '5px 5px' }} /><div className="absolute inset-0 flex items-center justify-center text-white"><div className="text-center"><div className="text-[18px] font-serif font-bold">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1 opacity-90">est · 2026</div></div></div></div>),
    // 4 — Brute Force Text.
    (<div className="w-full h-full bg-[#0F1216] text-white relative overflow-hidden font-mono"><div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '12px 12px' }} /><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-[5px] uppercase tracking-[0.32em] opacity-70">▉ {brand.name.toUpperCase()} / SYS</div><div className="text-[28px] font-extrabold leading-none mt-1" style={{ color: p }}>RUN.{brand.name.toUpperCase()}</div></div></div></div>),
    // 5 — Big Initial.
    (<div className="w-full h-full bg-[#FBF8EE] relative overflow-hidden"><div className="absolute -left-[2%] top-1/2 -translate-y-1/2 font-serif font-black leading-none" style={{ color: p, fontSize: '180%' }}>{init}</div><div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right"><div className="text-[14px] font-serif font-bold text-gray-900">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1 text-gray-600">a brand · est. 2026</div></div></div>),
    // 6 — Three Stripes.
    (<div className="w-full h-full relative overflow-hidden bg-white"><div className="absolute inset-y-0 left-0 w-[8%]" style={{backgroundColor:p}} /><div className="absolute inset-y-0 left-[12%] w-[6%]" style={{backgroundColor:`${p}77`}} /><div className="absolute inset-y-0 left-[20%] w-[4%]" style={{backgroundColor:`${p}33`}} /><div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right"><div className="text-[20px] font-serif font-black" style={{ color: p }}>{brand.name}</div><div className="text-[6px] uppercase tracking-[0.32em] mt-1 text-gray-500">brand · studio</div></div></div>),
    // 7 — Mountain Stack.
    (<div className="w-full h-full bg-[#FBF8EE] relative overflow-hidden"><div className="absolute left-0 right-0 bottom-0 h-[55%]" style={{backgroundColor:p}} /><div className="absolute left-0 right-0 bottom-[55%] h-[15%]" style={{backgroundColor:`${p}77`}} /><div className="absolute right-[14%] top-[14%] w-[14%] aspect-square rounded-full bg-white/70" /><div className="absolute left-[6%] bottom-[8%] text-white"><BrandLogo brand={brand} size="sm" color="#ffffff" /><div className="text-[8px] font-serif font-bold mt-1">{brand.name}</div></div></div>),
    // 8 — Frosted Layer.
    (<div className="w-full h-full bg-white relative overflow-hidden"><div className="absolute inset-0" style={{ background: `radial-gradient(140% 80% at 18% 30%, ${p} 0%, ${p}AA 35%, transparent 80%)` }} /><div className="absolute inset-[5%] rounded-md backdrop-blur-[3px] bg-white/55 border border-white/70 flex items-center justify-between px-[5%]"><BrandLogo brand={brand} size="sm" /><div className="text-right"><div className="text-[14px] font-serif font-bold text-gray-900">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">2026 collection</div></div></div></div>),
    // 9 — Color Block Diptych.
    (<div className="w-full h-full flex"><div className="w-1/2 h-full flex items-center justify-center" style={{ backgroundColor: p }}><BrandLogo brand={brand} size="lg" color="#ffffff" /></div><div className="w-1/2 h-full bg-white flex items-center px-[6%]"><div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">studio · brand</div><div className="text-[18px] font-serif font-black mt-1" style={{ color: p }}>{brand.name}</div></div></div></div>),
    // 10 — Numbered Index.
    (<div className="w-full h-full bg-[#FBF8EE] relative overflow-hidden flex items-center px-[6%]"><div className="text-[44px] leading-none font-bold tabular-nums" style={{ color: p }}>N°<br/>014</div><div className="ml-6"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">issue · spring</div><div className="text-[16px] font-serif font-bold text-gray-900 mt-1">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1" style={{ color: p }}>a brand</div></div></div>),
    // 11 — Underline Title.
    (<div className="w-full h-full bg-white relative overflow-hidden flex items-center justify-center"><div className="text-center"><div className="text-[24px] font-serif font-black tracking-tight text-gray-900">{brand.name}</div><div className="h-[2px] mx-auto w-[40%] mt-1" style={{ backgroundColor: p }} /><div className="text-[6px] uppercase tracking-[0.32em] mt-2 text-gray-500">a brand · est. 2026</div></div></div>),
    // 12 — Stamp Tilted.
    (<div className="w-full h-full bg-[#FBF8EE] relative overflow-hidden flex items-center justify-center"><div className="-rotate-6 border-2 px-3 py-1" style={{ borderColor: p, color: p }}><div className="text-[6px] uppercase tracking-[0.32em] text-center">approved</div><div className="text-[20px] font-serif font-black leading-none">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] text-center">est · 2026</div></div></div>),
    // 13 — Word Repeat.
    (<div className="w-full h-full bg-[#FBF8EE] relative overflow-hidden flex flex-col justify-center px-[3%]" style={{ lineHeight: 0.8 }}>{Array.from({length:5}).map((_,i)=>(<div key={i} className="text-[18px] font-serif font-black uppercase opacity-90 tracking-tight" style={{ color: i === 2 ? p : `${p}33`, transform: `translateX(${(i%2)*-4}%)` }}>{brand.name} {brand.name} {brand.name}</div>))}</div>),
    // 14 — Sticker Stack.
    (<div className="w-full h-full bg-[#FFFBF2] relative overflow-hidden"><div className="absolute -left-[2%] top-[10%] w-[20%] aspect-square rounded-full -rotate-12" style={{backgroundColor:p}} /><div className="absolute left-[18%] bottom-[10%] w-[16%] aspect-square rounded-full bg-[#0F1216] rotate-6" /><div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right"><div className="text-[18px] font-serif font-bold" style={{color:p}}>{brand.name}</div><div className="text-[6px] uppercase tracking-[0.32em] mt-1 text-gray-500">studio · 2026</div></div></div>),
    // 15 — Mono Grid.
    (<div className="w-full h-full bg-white relative overflow-hidden"><div className="absolute inset-0 grid grid-cols-12">{Array.from({length:12}).map((_,i)=>(<div key={i} style={{borderRight: '1px solid #00000010'}} />))}</div><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">grid · system</div><div className="text-[20px] font-serif font-black tracking-tight text-gray-900 mt-1">{brand.name}</div></div></div>),
    // 16 — Sunrise Gradient.
    (<div className="w-full h-full relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p}88 50%, #FBF8EE 100%)` }}><div className="absolute right-[18%] top-[20%] w-[12%] aspect-square rounded-full bg-white/80" /><div className="absolute left-[6%] bottom-[10%]"><div className="text-[10px] font-serif italic font-bold text-gray-900">good morning,</div><div className="text-[18px] font-serif font-black mt-0.5" style={{color:p,filter:'brightness(0.7)'}}>{brand.name}</div></div></div>),
    // 17 — Quote.
    (<div className="w-full h-full bg-white relative overflow-hidden flex items-center px-[6%]"><div className="text-[60px] font-serif leading-none" style={{ color: p }}>"</div><div className="ml-4"><div className="text-[8px] font-serif italic text-gray-800 leading-tight">a small studio doing work that lasts.</div><div className="text-[5px] uppercase tracking-[0.32em] mt-2" style={{ color: p }}>— {brand.name}</div></div></div>),
    // 18 — Wireframe.
    (<div className="w-full h-full bg-[#0A0F12] text-white relative overflow-hidden"><div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)' }} /><div className="absolute inset-0" style={{ background: `radial-gradient(80% 50% at 50% 50%, ${p}55 0%, transparent 70%)` }} /><div className="absolute inset-0 flex items-center justify-center font-mono"><div className="text-center"><div className="text-[5px] uppercase tracking-[0.32em] opacity-70" style={{color:p}}>● {brand.name.toUpperCase()}.SYS</div><div className="text-[20px] font-bold tracking-tight" style={{textShadow: `0 0 8px ${p}`}}>RUN_BRAND_2026</div></div></div></div>),
    // 19 — Sunburst Mark.
    (<div className="w-full h-full bg-white relative overflow-hidden"><div className="absolute -left-[10%] -top-[40%] w-[80%] aspect-square rounded-full" style={{ background: `conic-gradient(from 180deg, ${p} 0deg, ${p}99 30deg, transparent 60deg, ${p} 90deg, ${p}99 120deg, transparent 150deg, ${p} 180deg)`, opacity: 0.85 }} /><div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right"><div className="text-[24px] font-serif font-black tracking-tight text-gray-900">{brand.name}</div><div className="text-[6px] uppercase tracking-[0.32em] mt-1" style={{color:p}}>since 2026</div></div></div>),
    // 20 — Wave Bands.
    (<div className="w-full h-full bg-[#FBF8EE] relative overflow-hidden">{Array.from({length:6}).map((_,i)=>(<div key={i} className="absolute left-0 right-0" style={{ height:'12%', top: `${i*16+2}%`, background: i%2===0?p:'transparent', borderRadius: '50%' }} />))}<div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right"><div className="text-[14px] font-serif font-bold text-gray-900">{brand.name}</div></div></div>),
    // 21 — Spotlight.
    (<div className="w-full h-full bg-[#0F1216] relative overflow-hidden"><div className="absolute inset-0" style={{ background: `radial-gradient(60% 80% at 30% 50%, ${p}AA 0%, transparent 70%)` }} /><div className="absolute left-[8%] top-1/2 -translate-y-1/2 text-white"><BrandLogo brand={brand} size="md" color="#ffffff" /><div className="text-[16px] font-serif font-bold mt-2">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1 opacity-80">a studio · 2026</div></div></div>),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const SOCIAL_COVER_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Solid Brand', category: 'Bold' },
  { idSuffix: 'ext-2', name: 'Editorial Title', category: 'Editorial' },
  { idSuffix: 'ext-3', name: 'Diagonal Split', category: 'Bold' },
  { idSuffix: 'ext-4', name: 'Halftone Wash', category: 'Modern' },
  { idSuffix: 'ext-5', name: 'Brute Force', category: 'Bold' },
  { idSuffix: 'ext-6', name: 'Big Initial', category: 'Editorial' },
  { idSuffix: 'ext-7', name: 'Three Stripes', category: 'Modern' },
  { idSuffix: 'ext-8', name: 'Mountain Stack', category: 'Modern' },
  { idSuffix: 'ext-9', name: 'Frosted Layer', category: 'Modern' },
  { idSuffix: 'ext-10', name: 'Color Block', category: 'Bold' },
  { idSuffix: 'ext-11', name: 'Numbered Index', category: 'Editorial' },
  { idSuffix: 'ext-12', name: 'Underline Title', category: 'Minimalist' },
  { idSuffix: 'ext-13', name: 'Stamp Tilted', category: 'Vintage' },
  { idSuffix: 'ext-14', name: 'Word Repeat', category: 'Bold' },
  { idSuffix: 'ext-15', name: 'Sticker Stack', category: 'Bold' },
  { idSuffix: 'ext-16', name: 'Mono Grid', category: 'Minimalist' },
  { idSuffix: 'ext-17', name: 'Sunrise', category: 'Modern' },
  { idSuffix: 'ext-18', name: 'Quote', category: 'Editorial' },
  { idSuffix: 'ext-19', name: 'Wireframe', category: 'Modern' },
  { idSuffix: 'ext-20', name: 'Sunburst', category: 'Lux' },
  { idSuffix: 'ext-21', name: 'Wave Bands', category: 'Modern' },
  { idSuffix: 'ext-22', name: 'Spotlight', category: 'Bold' },
] as const;
