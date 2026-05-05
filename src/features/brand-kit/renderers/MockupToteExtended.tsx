import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/** Tote-bag mockups — 30 canvas-tote print compositions. */
interface Props { brand: Brand; templateIndex: number }

function ToteFrame({ children, bg = '#E1D8C0' }: { children: React.ReactNode; bg?: string }) {
  return (
    <div className="w-full h-full bg-[#EFE9DA] flex items-center justify-center p-[5%]">
      <div className="relative" style={{ width: '40%', aspectRatio: '4/5' }}>
        <div className="absolute -top-[6%] left-[16%] right-[16%] h-[14%] border-2 border-[#9A8E72] rounded-t-full" />
        <div className="absolute top-[8%] left-0 right-0 bottom-0 rounded-sm shadow-md flex items-center justify-center p-[8%]" style={{ backgroundColor: bg }}>
          <div className="w-full text-center">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function MockupToteExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();
  const N = brand.name.toUpperCase();

  const arts = [
    (<div><BrandLogo brand={brand} size="md" color={p} /><div className="text-[5px] uppercase tracking-[0.32em] mt-1" style={{color:p}}>{brand.name}</div></div>),
    (<div className="text-[44px] font-serif font-black leading-none" style={{color:p}}>{init}</div>),
    (<div><div className="text-[10px] font-bold leading-tight" style={{color:p}}>CARRY</div><div className="text-[10px] font-bold leading-tight" style={{color:p}}>{N}</div></div>),
    (<div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-700">est · 2026</div><div className="text-[14px] font-serif font-bold mt-1" style={{color:p}}>{brand.name}</div></div>),
    (<div className="rotate-90 origin-center"><span className="text-[6px] uppercase tracking-[0.4em]" style={{color:p}}>— {N} —</span></div>),
    (<div><div className="border-2 inline-block px-2 py-0.5 -rotate-3 text-[5px] uppercase tracking-[0.22em]" style={{borderColor:p,color:p}}>not for sale</div><div className="text-[10px] font-bold mt-1" style={{color:p}}>{brand.name}</div></div>),
    (<div className="grid grid-cols-3 gap-[2px]">{Array.from({length:9}).map((_,i)=><div key={i} className="aspect-square" style={{backgroundColor:i===4?p:`${p}33`}} />)}</div>),
    (<div className="rounded-full mx-auto w-[40%] aspect-square flex items-center justify-center" style={{backgroundColor:p}}><span className="text-white font-serif font-black text-[16px]">{init}</span></div>),
    (<div className="text-[7px] italic font-serif" style={{color:p}}>"a small thing,<br/>made with care."</div>),
    (<div><div className="text-[18px] font-serif font-black leading-tight" style={{color:p,fontFamily:'Caveat, cursive'}}>made by hand,</div><div className="text-[12px] italic mt-1" style={{fontFamily:'Caveat, cursive'}}>at {brand.name}.</div></div>),
    (<div className="font-mono text-[6px]"><div style={{color:p}}>$ ./{brand.name.toLowerCase()}</div><div className="text-gray-700 mt-0.5">→ tote loaded.</div></div>),
    (<div><div className="text-[7px] uppercase tracking-[0.32em]" style={{color:p}}>volume 014</div><div className="text-[14px] font-serif font-bold">spring 2026</div></div>),
    (<div className="rounded-full px-3 py-1" style={{backgroundColor:p}}><span className="text-white text-[6px] uppercase tracking-[0.32em]">{brand.name} co.</span></div>),
    (<div><div className="text-[6px] uppercase tracking-[0.4em]" style={{color:p}}>NEW YORK</div><div className="text-[12px] font-serif font-bold mt-1">{brand.name}</div><div className="text-[6px] uppercase tracking-[0.4em]" style={{color:p}}>2026</div></div>),
    (<div className="border-y-2 py-1" style={{borderColor:p}}><span className="text-[8px] font-bold tracking-tight">{N} · CO.</span></div>),
    (<div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-700">— manifesto —</div><div className="text-[8px] font-serif italic font-bold mt-1" style={{color:p}}>"buy less."</div></div>),
    (<div className="text-[44px] font-bold tabular-nums" style={{color:p}}>14</div>),
    (<div className="grid grid-cols-2 gap-1"><div className="aspect-square" style={{backgroundColor:p}} /><div className="aspect-square bg-[#0F1216]" /></div>),
    (<div className="rounded-full inline-block w-[24px] h-[24px] flex items-center justify-center border-2" style={{borderColor:p}}><span className="text-[8px]" style={{color:p}}>★</span></div>),
    (<div><div className="text-[6px] uppercase tracking-[0.32em] text-gray-600">— slogan —</div><div className="text-[12px] font-serif italic font-bold mt-1" style={{color:p}}>be small.</div></div>),
    (<div className="text-center"><div className="text-[5px] uppercase tracking-[0.32em]" style={{color:p}}>— ● —</div><div className="text-[14px] font-serif font-bold mt-0.5">{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] mt-0.5" style={{color:p}}>— ● —</div></div>),
    (<div><div className="text-[6px] font-bold uppercase tracking-[0.4em]" style={{color:p}}>{brand.name.toLowerCase()}</div><div className="w-full h-[1.5px] mt-1" style={{backgroundColor:p}} /><div className="text-[6px] uppercase tracking-[0.4em] mt-1 text-gray-700">est · 2026</div></div>),
    (<div className="rotate-12"><span className="text-[14px] font-serif italic font-bold" style={{color:p}}>welcome.</span></div>),
    (<div><div className="text-[12px] font-bold tracking-tight" style={{color:p}}>{N}</div><div className="text-[12px] font-bold tracking-tight text-gray-900">CARRIES</div></div>),
    (<div className="border-2 rounded-full px-3 py-2 inline-block" style={{borderColor:p}}><span className="text-[8px] font-serif italic" style={{color:p}}>{brand.name}</span></div>),
    (<div className="font-mono text-[6px]"><div className="opacity-60">// brand.tote</div><div className="mt-0.5" style={{color:p}}>{`{ ${brand.name.toLowerCase()}: 'go' }`}</div></div>),
    (<div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-700">— for the —</div><div className="text-[14px] font-serif italic font-bold mt-1" style={{color:p}}>quiet ones.</div></div>),
    (<div className="grid grid-cols-1 gap-0.5"><div className="text-[8px] font-bold tracking-tight" style={{color:p}}>{N}</div><div className="text-[8px] font-bold tracking-tight">STUDIO</div><div className="text-[8px] font-bold tracking-tight" style={{color:p}}>SS · 2026</div></div>),
    (<div className="text-[36px] leading-none font-serif" style={{color:p}}>"</div>),
    (<div><BrandLogo brand={brand} size="sm" color={p} /><div className="w-full h-[1px] my-1" style={{backgroundColor:p}} /><div className="text-[5px] uppercase tracking-[0.32em] text-gray-700">{brand.name.toLowerCase()}.com</div></div>),
  ];

  // Mix tote canvas colors for variety.
  const togs = ['#E1D8C0', '#FAF6EE', '#1F1F1F', '#E1D8C0'];
  return <ToteFrame bg={togs[templateIndex % 4]}>{arts[templateIndex] ?? arts[0]}</ToteFrame>;
}

export const MOCKUP_TOTE_EXTENDED = Array.from({length:30},(_,i)=>({idSuffix:`ext-${i+1}`,name:['Logo Centered','Big Initial','Carry Brand','Est','Vertical','Stamp','Pixel Grid','Disc','Quote Italic','Hand-Made','Code Term','Issue','Pill','City','Bordered','Manifesto','Number','Quad','Outline Star','Slogan','Dot Border','Underline','Welcome','Carries','Pill Italic','Code Hash','Quiet','Stack','Quote Mark','Logo Strip'][i],category:'Apparel'}));
