import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/** Instagram-post (1:1) extensions — 20 designs joining 10 legacy = 30. */
interface Props { brand: Brand; templateIndex: number }

function PostFrame({ children, bg = '#FBF8EE' }: { children: React.ReactNode; bg?: string }) {
  // Square post centered inside the cosmos landscape tile.
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#E8E4D8' }}>
      <div className="aspect-square h-[92%] relative overflow-hidden shadow-md" style={{ backgroundColor: bg }}>
        {children}
      </div>
    </div>
  );
}

export function SocialPostExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();

  const designs = [
    // 0 — Solid Brand Quote.
    (<PostFrame bg={p}><div className="absolute inset-[10%] flex flex-col justify-between text-white"><BrandLogo brand={brand} size="xs" color="#ffffff" /><div className="text-[11px] font-serif italic font-bold leading-tight">"a small studio doing work that lasts."</div><div className="text-[5px] uppercase tracking-[0.32em] opacity-80">— {brand.name}</div></div></PostFrame>),
    // 1 — Big Initial Card.
    (<PostFrame><div className="absolute inset-0 flex items-center justify-center"><div className="text-[80px] font-serif font-black leading-none" style={{ color: p }}>{init}</div></div><div className="absolute inset-x-0 bottom-[8%] text-center text-[5px] uppercase tracking-[0.32em] text-gray-600">{brand.name} · est. 2026</div></PostFrame>),
    // 2 — Announcement Banner.
    (<PostFrame bg="#0F1216"><div className="absolute inset-x-0 top-[26%] h-[44%] flex items-center justify-center" style={{backgroundColor:p}}><div className="text-center text-white"><div className="text-[5px] uppercase tracking-[0.32em] opacity-90">— announcing —</div><div className="text-[16px] font-serif font-black leading-none mt-1">SS 2026</div></div></div><div className="absolute left-[8%] bottom-[8%]"><BrandLogo brand={brand} size="xs" color="#ffffff" /></div><div className="absolute right-[8%] bottom-[8%] text-right text-white text-[5px] uppercase tracking-[0.32em] opacity-80">{brand.name}</div></PostFrame>),
    // 3 — Halftone Portrait.
    (<PostFrame bg="#FBF8EE"><div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p}EE 0%, ${p}66 100%)` }} /><div className="absolute inset-0 mix-blend-multiply opacity-50" style={{ backgroundImage: `radial-gradient(circle, #111 0.6px, transparent 0.7px)`, backgroundSize: '5px 5px' }} /><div className="absolute inset-[10%] flex flex-col justify-end text-white"><div className="text-[11px] font-serif font-bold">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] opacity-90">— a brand</div></div></PostFrame>),
    // 4 — Brute Force Type.
    (<PostFrame bg="#0F1216"><div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '14px 14px' }} /><div className="absolute inset-[10%] flex flex-col justify-between text-white font-mono"><div className="text-[5px] uppercase tracking-[0.32em] opacity-70">{brand.name.toUpperCase()} / IDX</div><div><div className="text-[20px] font-extrabold leading-[0.92]">RUN.</div><div className="text-[20px] font-extrabold leading-[0.92]">BRAND</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1" style={{color:p}}>▉ NOW PLAYING</div></div><div className="text-[5px] uppercase tracking-[0.32em] opacity-70">{brand.name.toLowerCase()}.com</div></div></PostFrame>),
    // 5 — Frosted Layer.
    (<PostFrame><div className="absolute inset-0" style={{ background: `radial-gradient(140% 80% at 18% 30%, ${p} 0%, ${p}AA 35%, transparent 80%)` }} /><div className="absolute inset-[8%] rounded-md backdrop-blur-[3px] bg-white/55 border border-white/70 flex flex-col justify-between p-[8%]"><BrandLogo brand={brand} size="xs" /><div><div className="text-[14px] font-serif font-bold text-gray-900">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1" style={{ color: p }}>spring · 2026</div></div></div></PostFrame>),
    // 6 — Number Big.
    (<PostFrame bg="#FBF8EE"><div className="absolute left-[5%] top-[5%] font-serif font-black leading-none tabular-nums" style={{ color: p, fontSize: '110px' }}>14</div><div className="absolute right-[8%] bottom-[8%] text-right"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">issue</div><div className="text-[14px] font-serif font-bold text-gray-900">{brand.name}</div></div></PostFrame>),
    // 7 — Color Block Diptych.
    (<PostFrame><div className="flex w-full h-full"><div className="w-1/2 flex items-center justify-center" style={{backgroundColor:p}}><BrandLogo brand={brand} size="lg" color="#ffffff" /></div><div className="w-1/2 bg-white flex items-center justify-center"><div className="text-center"><div className="text-[6px] uppercase tracking-[0.32em] text-gray-500">brand · studio</div><div className="text-[16px] font-serif font-black mt-2" style={{color:p}}>{brand.name}</div></div></div></div></PostFrame>),
    // 8 — Editorial Quote.
    (<PostFrame bg="#FAF6EE"><div className="absolute left-[6%] top-[5%] text-[60px] font-serif leading-none" style={{ color: p }}>"</div><div className="absolute inset-x-[12%] top-[28%] text-[12px] font-serif italic font-bold leading-tight text-gray-900">small things, made well, for the people who notice.</div><div className="absolute right-[8%] bottom-[8%] text-right text-[5px] uppercase tracking-[0.32em]" style={{color:p}}>— {brand.name}</div></PostFrame>),
    // 9 — Sunburst.
    (<PostFrame><div className="absolute -left-[20%] -bottom-[40%] w-[140%] aspect-square rounded-full" style={{ background: `conic-gradient(from 180deg, ${p} 0deg, ${p}99 30deg, transparent 60deg, ${p} 90deg, ${p}99 120deg, transparent 150deg, ${p} 180deg)`, opacity:0.85 }} /><div className="absolute inset-0 flex flex-col items-center justify-start p-[8%]"><div className="text-[14px] font-serif font-black text-gray-900 mt-[4%]">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1" style={{color:p}}>spring · 2026</div></div></PostFrame>),
    // 10 — Mountain Stack.
    (<PostFrame><div className="absolute left-0 right-0 bottom-0 h-[55%]" style={{backgroundColor:p}} /><div className="absolute left-0 right-0 bottom-[55%] h-[15%]" style={{backgroundColor:`${p}77`}} /><div className="absolute right-[18%] top-[14%] w-[18%] aspect-square rounded-full bg-white/70" /><div className="absolute left-[8%] bottom-[8%] text-white"><BrandLogo brand={brand} size="xs" color="#ffffff" /><div className="text-[10px] font-serif font-bold mt-1">{brand.name}</div></div></PostFrame>),
    // 11 — Sticker Stack.
    (<PostFrame><div className="absolute -left-[5%] top-[10%] w-[36%] aspect-square rounded-full -rotate-12" style={{backgroundColor:p}} /><div className="absolute left-[20%] bottom-[10%] w-[28%] aspect-square rounded-full bg-[#0F1216] rotate-6" /><div className="absolute right-[8%] top-[8%] w-[20%] aspect-square rounded-full bg-white border-2 border-[#0F1216] flex items-center justify-center"><BrandLogo brand={brand} size="sm" /></div><div className="absolute right-[10%] bottom-[10%] text-right"><div className="text-[12px] font-serif font-bold text-white" style={{textShadow:'1px 1px 0 #000'}}>{brand.name}</div></div></PostFrame>),
    // 12 — Vinyl Cover.
    (<PostFrame bg="#0F1216"><div className="absolute inset-[14%] rounded-full" style={{background:`radial-gradient(circle, #2A2F32 0%, #0A0F12 70%)`}} /><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[24%] aspect-square rounded-full flex items-center justify-center" style={{backgroundColor:p}}><div className="text-white font-serif font-black text-[18px]">{init}</div></div><div className="absolute inset-x-0 bottom-[6%] text-center text-white text-[5px] uppercase tracking-[0.32em] opacity-80">{brand.name} · LP 014</div></PostFrame>),
    // 13 — Hand-Lettered.
    (<PostFrame bg="#FAF6EE"><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-[28px] italic" style={{ fontFamily:'Caveat, cursive', color:p }}>hello,</div><div className="text-[16px] italic mt-1" style={{ fontFamily:'Caveat, cursive', color:'#0F1216' }}>{brand.name}.</div></div></div><div className="absolute inset-x-0 bottom-[6%] text-center text-[5px] uppercase tracking-[0.32em] text-gray-500">est · 2026</div></PostFrame>),
    // 14 — Calendar Day.
    (<PostFrame><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-4 shadow-md p-3 text-center" style={{ borderColor: p }}><div className="text-[6px] uppercase tracking-[0.32em]" style={{color:p}}>April</div><div className="text-[36px] font-serif font-black leading-none my-1">27</div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">{brand.name}</div></div></PostFrame>),
    // 15 — Pattern Tile.
    (<PostFrame><div className="absolute inset-0 grid grid-cols-6 grid-rows-6">{Array.from({length:36}).map((_,i)=>(<div key={i} style={{background: (i+Math.floor(i/6))%2===0 ? p : '#FBF8EE'}} />))}</div><div className="absolute inset-[26%] rounded-md bg-white flex items-center justify-center"><BrandLogo brand={brand} size="md" color={p} /></div></PostFrame>),
    // 16 — Centered Type.
    (<PostFrame bg={p}><div className="absolute inset-0 flex items-center justify-center"><div className="text-center text-white"><div className="text-[5px] uppercase tracking-[0.4em] opacity-80">— studio —</div><div className="text-[18px] font-serif font-black tracking-tight mt-2">{brand.name}</div><div className="h-[1px] mx-auto w-[40%] mt-2 bg-white/40" /><div className="text-[5px] uppercase tracking-[0.32em] mt-2 opacity-80">since 2026</div></div></div></PostFrame>),
    // 17 — Hashtag.
    (<PostFrame><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-[36px] font-bold tracking-tight" style={{color:p}}>#{brand.name.toLowerCase()}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-2 text-gray-500">join the studio</div></div></div></PostFrame>),
    // 18 — Quote List.
    (<PostFrame><div className="absolute inset-[8%] flex flex-col justify-between"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">{brand.name} · 2026</div><div className="space-y-2">{['1. Make less.', '2. Make better.', '3. Make it last.'].map((s,i)=>(<div key={i} className="text-[10px] font-serif italic font-bold" style={{ color: i===1?p:'#0F1216'}}>{s}</div>))}</div><div className="text-[5px] uppercase tracking-[0.32em] text-right" style={{color:p}}>— manifesto</div></div></PostFrame>),
    // 19 — Spotlight.
    (<PostFrame bg="#0F1216"><div className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 40%, ${p}AA 0%, transparent 70%)` }} /><div className="absolute inset-0 flex flex-col items-center justify-center"><BrandLogo brand={brand} size="lg" color="#ffffff" /><div className="text-white text-[14px] font-serif font-bold mt-3">{brand.name}</div><div className="text-white text-[5px] uppercase tracking-[0.32em] mt-1 opacity-80">a studio · 2026</div></div></PostFrame>),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const SOCIAL_POST_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Solid Quote', category: 'Bold' },
  { idSuffix: 'ext-2', name: 'Big Initial', category: 'Editorial' },
  { idSuffix: 'ext-3', name: 'Announcement', category: 'Bold' },
  { idSuffix: 'ext-4', name: 'Halftone', category: 'Modern' },
  { idSuffix: 'ext-5', name: 'Brute Force', category: 'Bold' },
  { idSuffix: 'ext-6', name: 'Frosted Layer', category: 'Modern' },
  { idSuffix: 'ext-7', name: 'Number Big', category: 'Editorial' },
  { idSuffix: 'ext-8', name: 'Color Block', category: 'Bold' },
  { idSuffix: 'ext-9', name: 'Editorial Quote', category: 'Editorial' },
  { idSuffix: 'ext-10', name: 'Sunburst', category: 'Lux' },
  { idSuffix: 'ext-11', name: 'Mountain Stack', category: 'Modern' },
  { idSuffix: 'ext-12', name: 'Sticker Stack', category: 'Bold' },
  { idSuffix: 'ext-13', name: 'Vinyl Cover', category: 'Modern' },
  { idSuffix: 'ext-14', name: 'Hand-Lettered', category: 'Vintage' },
  { idSuffix: 'ext-15', name: 'Calendar Day', category: 'Modern' },
  { idSuffix: 'ext-16', name: 'Pattern Tile', category: 'Modern' },
  { idSuffix: 'ext-17', name: 'Centered Type', category: 'Minimalist' },
  { idSuffix: 'ext-18', name: 'Hashtag', category: 'Bold' },
  { idSuffix: 'ext-19', name: 'Manifesto', category: 'Editorial' },
  { idSuffix: 'ext-20', name: 'Spotlight', category: 'Bold' },
] as const;
