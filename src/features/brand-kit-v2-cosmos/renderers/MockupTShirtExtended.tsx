import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/** T-shirt mockups — 30 garment compositions with chest-print artwork. */
interface Props { brand: Brand; templateIndex: number }

function ShirtFrame({ children, garmentBg = '#1F1F1F' }: { children: React.ReactNode; garmentBg?: string }) {
  return (
    <div className="w-full h-full bg-[#0F1216] flex items-center justify-center p-[6%]">
      <div className="relative" style={{ width: '60%', aspectRatio: '5/4', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }}>
        <div className="absolute inset-0" style={{ backgroundColor: garmentBg, clipPath: 'polygon(30% 0%, 70% 0%, 80% 8%, 100% 18%, 100% 100%, 0% 100%, 0% 18%, 20% 8%)' }} />
        <div className="absolute top-0 left-[35%] right-[35%] h-[10%] rounded-b-full" style={{ backgroundColor: garmentBg, filter: 'brightness(0.85)' }} />
        <div className="absolute inset-x-[28%] top-[28%] h-[40%] flex items-center justify-center">{children}</div>
      </div>
    </div>
  );
}

export function MockupTShirtExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();
  const N = brand.name.toUpperCase();

  const designs = [
    (<div className="text-center"><BrandLogo brand={brand} size="md" color={p} /><div className="text-[5px] uppercase tracking-[0.32em] mt-1 text-white">{brand.name}</div></div>),
    (<div className="text-[24px] font-serif font-black" style={{color:p}}>{init}</div>),
    (<div className="text-center"><div className="text-[10px] font-bold uppercase tracking-tight" style={{color:p}}>RUN.</div><div className="text-[10px] font-bold uppercase tracking-tight text-white">{N}</div></div>),
    (<div className="rounded-full px-2 py-0.5" style={{backgroundColor:p}}><span className="text-white text-[6px] uppercase tracking-[0.22em]">{brand.name}</span></div>),
    (<div className="text-center"><div className="text-[12px] font-serif italic font-bold" style={{color:p}}>est.</div><div className="text-[10px] font-serif font-bold text-white">2026</div></div>),
    (<div className="text-[8px] font-mono uppercase tracking-tight" style={{color:p}}>{`> ${brand.name.toLowerCase()}`}</div>),
    (<div className="border-2 px-2 py-0.5 -rotate-6" style={{ borderColor: p }}><span className="text-white text-[6px] uppercase tracking-[0.22em]">staff</span></div>),
    (<div className="text-center text-white"><div className="text-[5px] opacity-70">No.</div><div className="text-[18px] font-bold tabular-nums" style={{color:p}}>014</div></div>),
    (<div className="grid grid-cols-3 grid-rows-3 gap-[1px]">{Array.from({length:9}).map((_,i)=><div key={i} className="w-[6px] h-[6px]" style={{backgroundColor:i===4?p:'#fff',opacity:i===4?1:0.4}} />)}</div>),
    (<div className="text-center"><div className="text-[7px] italic" style={{ fontFamily:'Caveat, cursive', color:p }}>made with</div><div className="text-[7px] italic" style={{ fontFamily:'Caveat, cursive', color:'#fff' }}>care.</div></div>),
    (<div className="text-[6px] uppercase tracking-[0.4em] text-white">{N}</div>),
    (<div className="rounded px-2 py-0.5 text-[6px] font-bold text-white" style={{backgroundColor:p}}>SS · 2026</div>),
    (<div className="text-center"><div className="text-[18px] font-black leading-none" style={{color:p}}>{N.slice(0,4)}</div></div>),
    (<div className="rotate-90 origin-center text-[5px] uppercase tracking-[0.4em] text-white">— {brand.name} —</div>),
    (<div className="w-[24px] h-[24px] rounded-full flex items-center justify-center" style={{backgroundColor:p}}><BrandLogo brand={brand} size="xs" color="#fff" /></div>),
    (<div className="grid grid-cols-2 gap-1"><div className="w-[10px] h-[10px]" style={{backgroundColor:p}} /><div className="w-[10px] h-[10px] bg-white" /><div className="w-[10px] h-[10px] bg-white" /><div className="w-[10px] h-[10px]" style={{backgroundColor:p}} /></div>),
    (<div className="text-center"><div className="text-[5px] uppercase tracking-[0.4em] text-white opacity-80">team</div><div className="text-[14px] font-serif font-bold" style={{color:p}}>{brand.name}</div></div>),
    (<div className="rounded-full p-2 border-2" style={{borderColor:p}}><span className="text-white text-[10px] font-serif italic font-bold">{init}</span></div>),
    (<div className="text-center text-[5px] font-mono uppercase" style={{color:p}}>{`#${brand.name.toLowerCase()}.code`}</div>),
    (<div className="text-center"><div className="w-[20px] h-[2px] mx-auto" style={{backgroundColor:p}} /><div className="text-[10px] font-serif font-bold text-white my-1">{brand.name}</div><div className="w-[20px] h-[2px] mx-auto" style={{backgroundColor:p}} /></div>),
    (<div style={{transform:'rotate(-12deg)'}}><span className="text-[8px] font-bold" style={{color:p,fontFamily:'Caveat, cursive'}}>only the cool kids</span></div>),
    (<div className="flex items-center gap-1 text-white"><div className="w-[6px] h-[6px] rounded-full" style={{backgroundColor:p}} /><span className="text-[6px] uppercase tracking-[0.32em]">{brand.name}.live</span></div>),
    (<div className="text-center"><div className="text-[3px] uppercase tracking-[0.4em] text-white opacity-70">— pocket print —</div><div className="text-[10px] font-bold" style={{color:p}}>{N}</div></div>),
    (<div className="rounded p-1.5" style={{backgroundColor:p}}><BrandLogo brand={brand} size="xs" color="#fff" /></div>),
    (<div className="grid grid-cols-1 gap-0.5">{[N,'STUDIO','2026'].map((s,i)=>(<div key={i} className="text-[7px] font-bold tracking-tight" style={{color:i===0?p:'#fff'}}>{s}</div>))}</div>),
    (<div className="rounded-full w-[26px] aspect-square flex items-center justify-center" style={{ background: `radial-gradient(${p} 0%, ${p}99 60%, ${p}33 100%)` }}><span className="text-white text-[14px] font-serif font-black">{init}</span></div>),
    (<div className="text-center"><div className="text-[5px] uppercase tracking-[0.4em] text-white opacity-80">a brand —</div><div className="italic font-serif text-[10px]" style={{color:p}}>worth wearing</div></div>),
    (<div className="border border-white/40 rounded p-1.5 text-center"><div className="text-[4px] uppercase tracking-[0.32em] text-white opacity-80">issue</div><div className="text-[10px] font-bold tabular-nums text-white">014</div></div>),
    (<div className="text-[6px] font-bold uppercase tracking-[0.4em]" style={{color:p}}>RAD · {N} · COMPANY</div>),
    (<div className="text-center"><BrandLogo brand={brand} size="xs" color="#fff" /><div className="w-[20px] h-[2px] mx-auto mt-1" style={{backgroundColor:p}} /><div className="text-[5px] uppercase tracking-[0.32em] mt-0.5 text-white">— since 2026 —</div></div>),
  ];

  // Alternate garment color through the array for variety: half black, half white shirts.
  const isWhite = templateIndex % 4 === 1 || templateIndex % 4 === 3;
  return <ShirtFrame garmentBg={isWhite ? '#FBF8EE' : '#1F1F1F'}>{designs[templateIndex] ?? designs[0]}</ShirtFrame>;
}

export const MOCKUP_TSHIRT_EXTENDED = Array.from({length:30},(_,i)=>({idSuffix:`ext-${i+1}`,name:['Logo Center','Big Initial','Run Brand','Pill Tag','Est.','Mono Code','Stamp','Number','Pixel','Hand-Drawn','Track Type','SS Tag','Mono Caps','Vertical','Disc Logo','Quad','Team','Outline Initial','Code Hash','Hairline','Diagonal','Live Tag','Pocket','Boxed Logo','Stack','Glow','Italic','Frame','Long Caps','Crest'][i],category:'Apparel'}));
