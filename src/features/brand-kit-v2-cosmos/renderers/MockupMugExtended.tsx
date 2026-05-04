import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/** Mug mockups — 30 ceramic-mug compositions with brand-aware artwork. */
interface Props { brand: Brand; templateIndex: number }

function MugFrame({ children, bg = '#E5E0D2' }: { children: React.ReactNode; bg?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bg }}>
      <div className="relative" style={{ width: '40%', aspectRatio: '5/4' }}>
        {/* mug body */}
        <div className="absolute left-0 top-0 bottom-0 right-[18%] bg-white rounded-md shadow-lg overflow-hidden">{children}</div>
        {/* handle */}
        <div className="absolute right-0 top-[24%] bottom-[24%] w-[28%] rounded-r-full border-[6px] border-white shadow" style={{ backgroundColor: bg, borderColor: '#fff' }} />
      </div>
    </div>
  );
}

export function MockupMugExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();

  const arts = [
    (<div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: p }}><span className="text-white font-serif font-black text-[28px]">{init}</span></div>),
    (<div className="w-full h-full flex items-center justify-center bg-white"><BrandLogo brand={brand} size="md" color={p} /></div>),
    (<div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${p} 0%, ${p}66 100%)` }}><div className="absolute inset-0 flex items-center justify-center text-white font-serif italic font-bold text-[10px]">good morning</div></div>),
    (<div className="w-full h-full bg-white p-2 flex flex-col items-center justify-center"><div className="text-[5px] uppercase tracking-[0.3em]" style={{color:p}}>{brand.name}</div><div className="text-[14px] font-serif font-bold text-gray-900 mt-1">coffee.</div></div>),
    (<div className="w-full h-full" style={{ background: `repeating-linear-gradient(45deg, ${p} 0 8px, #fff 8px 16px)` }}><div className="w-full h-full flex items-center justify-center"><div className="bg-white rounded px-2 py-0.5 text-[6px] font-bold" style={{color:p}}>{brand.name}</div></div></div>),
    (<div className="w-full h-full bg-[#0F1216] flex items-center justify-center"><span className="font-mono text-[8px]" style={{color:p}}>{`${init}.coffee()`}</span></div>),
    (<div className="w-full h-full bg-white p-2 grid grid-cols-3 grid-rows-3 gap-[1px]">{Array.from({length:9}).map((_,i)=><div key={i} style={{backgroundColor:i===4?p:'#FBF8EE'}} />)}</div>),
    (<div className="w-full h-full flex" style={{backgroundColor:p}}><div className="m-auto text-white text-[6px] uppercase tracking-[0.32em] -rotate-90 whitespace-nowrap">{brand.name} · est 2026</div></div>),
    (<div className="w-full h-full bg-white flex flex-col items-center justify-center"><div className="text-[7px] italic" style={{ fontFamily:'Caveat, cursive', color:p }}>hello,</div><div className="text-[10px] italic mt-0.5" style={{ fontFamily:'Caveat, cursive' }}>friend.</div></div>),
    (<div className="w-full h-full" style={{ background: `radial-gradient(circle at 30% 30%, ${p} 0%, transparent 60%)` }}><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="md" color={p} /></div></div>),
    (<div className="w-full h-full flex items-center justify-center bg-[#FAF6EE]"><div className="border-2 px-2 py-1 -rotate-6 text-[6px] uppercase tracking-[0.22em]" style={{ borderColor:p, color:p }}>property of {brand.name}</div></div>),
    (<div className="w-full h-full grid grid-cols-2"><div style={{backgroundColor:p}} /><div className="bg-white" /></div>),
    (<div className="w-full h-full bg-white"><div className="absolute inset-0" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} /><div className="absolute right-2 bottom-2 text-[7px] font-bold">{brand.name}</div></div>),
    (<div className="w-full h-full bg-[#FAF6EE] flex flex-col items-center justify-center"><div className="text-[5px] uppercase tracking-[0.3em] text-gray-500">N°</div><div className="text-[18px] font-bold tabular-nums" style={{color:p}}>014</div></div>),
    (<div className="w-full h-full" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p}33 100%)` }}><div className="absolute inset-0 flex items-end p-2"><div className="text-white text-[8px] font-bold">make better.</div></div></div>),
    (<div className="w-full h-full bg-white p-2"><div className="text-[5px] uppercase tracking-[0.3em] text-gray-500">— quote 014 —</div><div className="text-[7px] font-serif italic mt-1" style={{color:p}}>"a small joy daily."</div><div className="text-[4px] uppercase tracking-[0.22em] mt-1 text-gray-500">— {brand.name}</div></div>),
    (<div className="w-full h-full bg-[#0F1216]"><div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 30% 50%, ${p}AA 0%, transparent 70%)` }} /><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="md" color="#fff" /></div></div>),
    (<div className="w-full h-full bg-white">{Array.from({length:6}).map((_,i)=><div key={i} className="absolute left-0 right-0 h-[10%]" style={{top:`${i*16+5}%`,background:i%2===0?p:'transparent'}} />)}</div>),
    (<div className="w-full h-full flex items-center justify-center bg-[#FAF6EE]"><div className="text-[7px] font-bold uppercase tracking-[0.32em] -rotate-6" style={{color:p}}>{brand.name} co.</div></div>),
    (<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-0 flex items-center justify-center text-center text-white"><div><div className="text-[4px] uppercase tracking-[0.32em] opacity-80">— since —</div><div className="text-[18px] font-serif font-black mt-0.5">2026</div></div></div></div>),
    (<div className="w-full h-full bg-white flex items-center justify-center"><div className="rounded-full w-[60%] aspect-square flex items-center justify-center" style={{backgroundColor:p}}><span className="text-white font-serif font-black text-[16px]">{init}</span></div></div>),
    (<div className="w-full h-full bg-[#FBF8EE] p-2"><div className="text-[10px] font-serif italic font-bold" style={{color:p}}>"</div><div className="text-[6px] font-serif italic">a daily ritual.</div></div>),
    (<div className="w-full h-full grid grid-cols-3"><div style={{backgroundColor:p}} /><div className="bg-white flex items-center justify-center"><span className="text-[8px] font-bold" style={{color:p}}>{init}</span></div><div className="bg-[#0F1216]" /></div>),
    (<div className="w-full h-full bg-white"><div className="absolute inset-0 flex items-center justify-center text-center"><div><div className="text-[6px]">☕</div><div className="text-[5px] uppercase tracking-[0.32em]" style={{color:p}}>{brand.name} coffee co.</div></div></div></div>),
    (<div className="w-full h-full" style={{ background: `conic-gradient(from 0deg, ${p} 0deg, ${p}99 60deg, ${p} 120deg, ${p}99 180deg, ${p} 240deg, ${p}99 300deg, ${p} 360deg)` }}><div className="absolute inset-[15%] rounded-full bg-white flex items-center justify-center"><span className="text-[14px] font-bold" style={{color:p}}>{init}</span></div></div>),
    (<div className="w-full h-full bg-[#FAF6EE] flex flex-col items-center justify-center"><div className="w-[40%] h-[2px]" style={{backgroundColor:p}} /><div className="text-[12px] font-serif font-black my-1">{brand.name}</div><div className="w-[40%] h-[2px]" style={{backgroundColor:p}} /></div>),
    (<div className="w-full h-full bg-white p-2 font-mono text-[5px]"><div style={{color:p}}>{`> ${brand.name.toLowerCase()}`}</div><div className="text-gray-600">{`> coffee --hot`}</div><div className="text-gray-400">{`> ready in 30s`}</div></div>),
    (<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[30%] bg-white flex items-center justify-center"><span className="text-[10px] font-bold" style={{color:p}}>{brand.name}</span></div></div>),
    (<div className="w-full h-full bg-white p-2 flex flex-col justify-between"><div className="text-[4px] uppercase tracking-[0.32em] text-gray-500">— made by —</div><div className="text-[14px] font-serif font-bold" style={{color:p}}>{brand.name}</div><div className="text-[4px] uppercase tracking-[0.32em] text-gray-500">— for daily —</div></div>),
    (<div className="w-full h-full bg-[#0F1216] flex items-center justify-center"><div className="text-center text-white"><div className="text-[5px] uppercase tracking-[0.32em] opacity-80" style={{color:p}}>— good vibes —</div><div className="text-[10px] font-serif italic font-bold mt-1">stay small.</div></div></div>),
  ];

  return <MugFrame>{arts[templateIndex] ?? arts[0]}</MugFrame>;
}

export const MOCKUP_MUG_EXTENDED = Array.from({length:30},(_,i)=>({idSuffix:`ext-${i+1}`,name:['Solid','Logo','Gradient','Coffee Type','Stripes','Mono Code','Grid','Vertical','Hand-Lettered','Glow','Stamp','Half','Diagonal','Number','Wash','Quote','Spotlight','Bands','Tilted','Since','Circle','Quote Mark','Triplet','Coffee Cup','Conic','Brand Bar','Mono Term','Half White','Made By','Stay Small'][i],category:'Print'}));
