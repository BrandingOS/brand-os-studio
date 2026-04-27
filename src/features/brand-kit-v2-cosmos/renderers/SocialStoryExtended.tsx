import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/** Instagram-story (9:16) extensions — 22 vertical designs joining 8 legacy = 30. */
interface Props { brand: Brand; templateIndex: number }

function StoryFrame({ children, bg = '#FBF8EE' }: { children: React.ReactNode; bg?: string }) {
  // Vertical phone-screen ratio centered in landscape tile.
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#1F2429' }}>
      <div className="aspect-[9/16] h-[92%] relative overflow-hidden rounded-md shadow-md" style={{ backgroundColor: bg }}>
        {children}
      </div>
    </div>
  );
}

export function SocialStoryExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();

  const designs = [
    // 0 — Solid Brand Quote (vertical).
    (<StoryFrame bg={p}><div className="absolute inset-[8%] flex flex-col justify-between text-white"><BrandLogo brand={brand} size="xs" color="#ffffff" /><div className="text-[12px] font-serif italic font-bold leading-tight">"a small studio doing work that lasts."</div><div className="text-[5px] uppercase tracking-[0.32em] opacity-80">— {brand.name}</div></div></StoryFrame>),
    // 1 — Big Vertical Initial.
    (<StoryFrame><div className="absolute inset-0 flex items-center justify-center"><div className="text-[100px] font-serif font-black leading-none" style={{ color: p }}>{init}</div></div><div className="absolute inset-x-0 bottom-[6%] text-center text-[5px] uppercase tracking-[0.32em] text-gray-600">— {brand.name} —</div></StoryFrame>),
    // 2 — Vertical Bands.
    (<StoryFrame><div className="absolute inset-x-0 top-0 h-[40%]" style={{backgroundColor:p}} /><div className="absolute inset-x-0 top-[40%] h-[20%] bg-[#0F1216]" /><div className="absolute inset-0 flex flex-col justify-between p-[8%] text-white"><BrandLogo brand={brand} size="xs" color="#ffffff" /><div className="text-center mt-[120%]"><div className="text-[16px] font-serif font-black text-gray-900">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500 mt-2">spring · 2026</div></div></div></StoryFrame>),
    // 3 — Halftone Tall.
    (<StoryFrame><div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p}EE 0%, ${p}66 100%)` }} /><div className="absolute inset-0 mix-blend-multiply opacity-50" style={{ backgroundImage: `radial-gradient(circle, #111 0.6px, transparent 0.7px)`, backgroundSize: '5px 5px' }} /><div className="absolute inset-[8%] flex flex-col justify-between text-white"><BrandLogo brand={brand} size="xs" color="#ffffff" /><div><div className="text-[14px] font-serif italic font-bold">a brand,</div><div className="text-[16px] font-serif font-bold mt-0.5">{brand.name}</div></div></div></StoryFrame>),
    // 4 — Brute Force Vertical.
    (<StoryFrame bg="#0F1216"><div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '12px 12px' }} /><div className="absolute inset-[8%] flex flex-col justify-between text-white font-mono"><div><div className="text-[5px] uppercase tracking-[0.32em] opacity-70">{brand.name.toUpperCase()} / SYS</div><div className="text-[5px] uppercase tracking-[0.32em] mt-0.5" style={{color:p}}>● ONLINE</div></div><div><div className="text-[26px] font-extrabold leading-[0.92]">RUN.</div><div className="text-[26px] font-extrabold leading-[0.92]">{brand.name.toUpperCase()}</div></div><div className="text-[5px] uppercase tracking-[0.32em] opacity-70">{brand.name.toLowerCase()}.com</div></div></StoryFrame>),
    // 5 — Number Card.
    (<StoryFrame><div className="absolute inset-x-[10%] top-[10%] font-serif font-black leading-none tabular-nums" style={{ color: p, fontSize: '110px' }}>14</div><div className="absolute right-[10%] bottom-[10%] text-right"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">issue</div><div className="text-[14px] font-serif font-bold text-gray-900">{brand.name}</div></div></StoryFrame>),
    // 6 — Frosted Tall.
    (<StoryFrame><div className="absolute inset-0" style={{ background: `radial-gradient(140% 60% at 30% 30%, ${p} 0%, ${p}AA 35%, transparent 80%)` }} /><div className="absolute inset-[8%] rounded-md backdrop-blur-[3px] bg-white/55 border border-white/70 flex flex-col justify-between p-[8%]"><BrandLogo brand={brand} size="xs" /><div><div className="text-[14px] font-serif font-bold text-gray-900">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1" style={{ color: p }}>spring · 2026</div></div></div></StoryFrame>),
    // 7 — Sunset Gradient.
    (<StoryFrame><div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p}88 50%, #FBF8EE 100%)` }} /><div className="absolute right-[12%] top-[12%] w-[24%] aspect-square rounded-full bg-white/80" /><div className="absolute inset-x-[8%] bottom-[14%]"><div className="text-[12px] font-serif italic font-bold text-gray-900">good morning,</div><div className="text-[18px] font-serif font-black mt-1" style={{color:p,filter:'brightness(0.65)'}}>{brand.name}</div></div></StoryFrame>),
    // 8 — Mountain Stack Tall.
    (<StoryFrame><div className="absolute left-0 right-0 bottom-0 h-[55%]" style={{backgroundColor:p}} /><div className="absolute left-0 right-0 bottom-[55%] h-[12%]" style={{backgroundColor:`${p}77`}} /><div className="absolute inset-0 flex flex-col justify-between p-[8%]"><BrandLogo brand={brand} size="xs" /><div className="text-white"><div className="text-[14px] font-serif font-bold">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1 opacity-90">a brand</div></div></div></StoryFrame>),
    // 9 — Editorial Quote Vertical.
    (<StoryFrame bg="#FAF6EE"><div className="absolute left-[8%] top-[6%] text-[60px] font-serif leading-none" style={{ color: p }}>"</div><div className="absolute inset-x-[10%] top-[24%] text-[14px] font-serif italic font-bold leading-tight text-gray-900">small things,<br/>made well,<br/>for the people<br/>who notice.</div><div className="absolute inset-x-[10%] bottom-[10%] text-[5px] uppercase tracking-[0.32em]" style={{color:p}}>— {brand.name}</div></StoryFrame>),
    // 10 — Sticker Pile.
    (<StoryFrame><div className="absolute -top-[4%] left-[6%] w-[60%] aspect-square rounded-full -rotate-12" style={{backgroundColor:p}} /><div className="absolute top-[36%] right-[4%] w-[40%] aspect-square rounded-full bg-[#0F1216] rotate-6" /><div className="absolute bottom-[6%] left-[10%] w-[30%] aspect-square rounded-full bg-white border-2 border-[#0F1216] flex items-center justify-center"><BrandLogo brand={brand} size="sm" /></div></StoryFrame>),
    // 11 — Centered Bold.
    (<StoryFrame bg={p}><div className="absolute inset-0 flex items-center justify-center"><div className="text-center text-white"><div className="text-[5px] uppercase tracking-[0.4em] opacity-80">— studio —</div><div className="text-[20px] font-serif font-black tracking-tight mt-2">{brand.name}</div><div className="h-[1px] mx-auto w-[50%] mt-3 bg-white/40" /><div className="text-[5px] uppercase tracking-[0.32em] mt-3 opacity-80">since 2026</div></div></div></StoryFrame>),
    // 12 — Hashtag Tall.
    (<StoryFrame><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-[40px] font-bold tracking-tight" style={{color:p}}>#{brand.name.toLowerCase()}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-3 text-gray-500">join the studio</div></div></div></StoryFrame>),
    // 13 — Calendar Tall.
    (<StoryFrame><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-4 shadow-md p-3 text-center" style={{ borderColor: p }}><div className="text-[6px] uppercase tracking-[0.32em]" style={{color:p}}>April</div><div className="text-[40px] font-serif font-black leading-none my-1">27</div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">{brand.name}</div></div></StoryFrame>),
    // 14 — Hand-Drawn Note.
    (<StoryFrame bg="#FAF6EE"><div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-[36px] italic" style={{ fontFamily:'Caveat, cursive', color:p }}>hello,</div><div className="text-[20px] italic mt-2" style={{ fontFamily:'Caveat, cursive', color:'#0F1216' }}>{brand.name}.</div><div className="text-[14px] italic mt-2" style={{ fontFamily:'Caveat, cursive', color:'#888' }}>— a story</div></div></div></StoryFrame>),
    // 15 — Bar Reveal.
    (<StoryFrame><div className="absolute left-0 top-1/2 -translate-y-1/2 right-0 h-[24%]" style={{backgroundColor:p}} /><div className="absolute inset-0 flex items-center justify-center text-white"><div className="text-center"><div className="text-[5px] uppercase tracking-[0.32em] opacity-80">— announcing —</div><div className="text-[16px] font-serif font-black mt-1">SS 2026</div></div></div><div className="absolute left-[8%] top-[10%]"><BrandLogo brand={brand} size="xs" /></div><div className="absolute right-[8%] bottom-[10%] text-[5px] uppercase tracking-[0.32em] text-gray-500">{brand.name.toLowerCase()}.com</div></StoryFrame>),
    // 16 — Brand Spotlight.
    (<StoryFrame bg="#0F1216"><div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 40%, ${p}AA 0%, transparent 70%)` }} /><div className="absolute inset-0 flex flex-col items-center justify-center"><BrandLogo brand={brand} size="lg" color="#ffffff" /><div className="text-white text-[14px] font-serif font-bold mt-4">{brand.name}</div><div className="text-white text-[5px] uppercase tracking-[0.32em] mt-1 opacity-80">a studio · 2026</div></div></StoryFrame>),
    // 17 — List Story.
    (<StoryFrame><div className="absolute inset-[8%] flex flex-col justify-between"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">{brand.name} · daily</div><div className="space-y-3">{['◇ Brand identity', '◇ Studio updates', '◇ New work', '◇ Behind scenes'].map((s,i)=>(<div key={i} className="text-[12px] font-serif font-bold" style={{ color: i%2===0?p:'#0F1216'}}>{s}</div>))}</div><div className="text-[5px] uppercase tracking-[0.32em] text-right" style={{color:p}}>— follow along</div></div></StoryFrame>),
    // 18 — Phone Mockup Lite.
    (<StoryFrame bg="#FBF8EE"><div className="absolute inset-[8%] bg-white rounded-md shadow-sm flex flex-col"><div className="h-[16%] flex items-center px-2" style={{backgroundColor:p}}><BrandLogo brand={brand} size="xs" color="#ffffff" /></div><div className="flex-1 p-2 flex flex-col justify-between"><div className="space-y-1">{Array.from({length:5}).map((_,i)=>(<div key={i} className="h-[3px] rounded bg-gray-100" style={{width:`${85-i*8}%`}} />))}</div><div className="grid grid-cols-3 gap-1">{Array.from({length:6}).map((_,i)=>(<div key={i} className="aspect-square rounded" style={{backgroundColor: i%3===0?p:'#FBF8EE'}} />))}</div></div></div></StoryFrame>),
    // 19 — Pattern Wash.
    (<StoryFrame><div className="absolute inset-0 grid grid-cols-4 grid-rows-8">{Array.from({length:32}).map((_,i)=>(<div key={i} style={{background: (i*3)%4===0?p:i%2===0?'#FBF8EE':`${p}33`}} />))}</div><div className="absolute inset-[20%] rounded-md bg-white flex flex-col items-center justify-center"><BrandLogo brand={brand} size="md" /><div className="text-[6px] uppercase tracking-[0.32em] mt-2" style={{color:p}}>{brand.name}</div></div></StoryFrame>),
    // 20 — Type Stack.
    (<StoryFrame bg="#FAF6EE"><div className="absolute inset-0 flex flex-col justify-center px-[6%]" style={{ lineHeight: 0.85 }}>{Array.from({length:8}).map((_,i)=>(<div key={i} className="text-[18px] font-serif font-black uppercase tracking-tight" style={{ color: i===3 ? p : `${p}33`, transform: `translateX(${(i%2)*-3}%)` }}>{brand.name}</div>))}</div></StoryFrame>),
    // 21 — Sun & Mountain.
    (<StoryFrame bg="#FBF8EE"><div className="absolute inset-x-0 bottom-0 h-[45%]" style={{backgroundColor:p, clipPath:'polygon(0 50%, 25% 20%, 50% 40%, 75% 10%, 100% 35%, 100% 100%, 0 100%)'}} /><div className="absolute right-[18%] top-[14%] w-[24%] aspect-square rounded-full" style={{background:`${p}77`}} /><div className="absolute inset-x-0 bottom-[10%] text-center text-white"><div className="text-[14px] font-serif font-bold">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-1 opacity-90">est. 2026</div></div></StoryFrame>),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const SOCIAL_STORY_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Solid Quote', category: 'Bold' },
  { idSuffix: 'ext-2', name: 'Big Initial', category: 'Editorial' },
  { idSuffix: 'ext-3', name: 'Vertical Bands', category: 'Bold' },
  { idSuffix: 'ext-4', name: 'Halftone', category: 'Modern' },
  { idSuffix: 'ext-5', name: 'Brute Force', category: 'Bold' },
  { idSuffix: 'ext-6', name: 'Number Card', category: 'Editorial' },
  { idSuffix: 'ext-7', name: 'Frosted', category: 'Modern' },
  { idSuffix: 'ext-8', name: 'Sunset', category: 'Modern' },
  { idSuffix: 'ext-9', name: 'Mountain Stack', category: 'Modern' },
  { idSuffix: 'ext-10', name: 'Editorial Quote', category: 'Editorial' },
  { idSuffix: 'ext-11', name: 'Sticker Pile', category: 'Bold' },
  { idSuffix: 'ext-12', name: 'Centered Bold', category: 'Bold' },
  { idSuffix: 'ext-13', name: 'Hashtag', category: 'Bold' },
  { idSuffix: 'ext-14', name: 'Calendar', category: 'Modern' },
  { idSuffix: 'ext-15', name: 'Hand-Drawn', category: 'Vintage' },
  { idSuffix: 'ext-16', name: 'Bar Reveal', category: 'Bold' },
  { idSuffix: 'ext-17', name: 'Spotlight', category: 'Bold' },
  { idSuffix: 'ext-18', name: 'List Story', category: 'Editorial' },
  { idSuffix: 'ext-19', name: 'Phone Mockup', category: 'Modern' },
  { idSuffix: 'ext-20', name: 'Pattern Wash', category: 'Modern' },
  { idSuffix: 'ext-21', name: 'Type Stack', category: 'Editorial' },
  { idSuffix: 'ext-22', name: 'Sun & Mountain', category: 'Modern' },
] as const;
