import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/** Sticker-sheet mockups — 30 individual sticker designs displayed
 *  as a peeling sticker on craft-paper backing. */
interface Props { brand: Brand; templateIndex: number }

function StickerFrame({ children, shape = 'rounded-md' }: { children: React.ReactNode; shape?: string }) {
  return (
    <div className="w-full h-full bg-[#D9CFB8] flex items-center justify-center p-[6%]">
      <div className={`relative bg-white shadow-lg ${shape}`} style={{ width: '46%', aspectRatio: '1/1', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))' }}>
        <div className={`absolute inset-[8%] ${shape} overflow-hidden`}>{children}</div>
      </div>
    </div>
  );
}

export function MockupStickerExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();
  const N = brand.name.toUpperCase();

  const designs = [
    [(<div className="w-full h-full flex items-center justify-center" style={{backgroundColor:p}}><span className="text-white font-serif font-black text-[24px]">{init}</span></div>), 'rounded-full'],
    [(<div className="w-full h-full flex items-center justify-center bg-white"><BrandLogo brand={brand} size="md" color={p} /></div>), 'rounded-md'],
    [(<div className="w-full h-full flex items-center justify-center" style={{backgroundColor:p}}><div className="text-center text-white"><div className="text-[5px] uppercase tracking-[0.32em] opacity-90">— hello —</div><div className="text-[14px] font-serif font-black mt-0.5">{brand.name}</div></div></div>), 'rounded-full'],
    [(<div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${p} 0%, ${p}66 100%)` }}><div className="absolute inset-0 flex items-center justify-center text-white text-[10px] font-bold">RAD.</div></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-[#0F1216] flex items-center justify-center"><span className="font-mono text-[7px]" style={{color:p}}>{`{${brand.name.toLowerCase()}}`}</span></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-[#FAF6EE] flex items-center justify-center"><div className="-rotate-6 border-2 px-2 py-0.5" style={{borderColor:p,color:p}}><span className="text-[6px] uppercase tracking-[0.22em] font-bold">good vibes</span></div></div>), 'rounded-md'],
    [(<div className="w-full h-full grid grid-cols-3 grid-rows-3 gap-[1px]">{Array.from({length:9}).map((_,i)=><div key={i} style={{backgroundColor:i===4?p:i%2===0?'#FBF8EE':'#0F1216'}} />)}</div>), 'rounded-sm'],
    [(<div className="w-full h-full flex items-center justify-center" style={{backgroundColor:p}}><div className="text-white text-[10px]">★</div></div>), 'rounded-full'],
    [(<div className="w-full h-full flex items-center justify-center bg-white"><div className="text-[14px] italic font-bold" style={{ fontFamily:'Caveat, cursive', color:p }}>hi.</div></div>), 'rounded-full'],
    [(<div className="w-full h-full flex items-center justify-center bg-[#FBF8EE]"><div className="text-[12px] font-bold" style={{color:p}}>#{brand.name.toLowerCase()}</div></div>), 'rounded-md'],
    [(<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-0 flex items-center justify-center text-white text-center"><div><div className="text-[5px] uppercase tracking-[0.32em] opacity-80">est. 2026</div><div className="text-[10px] font-serif italic font-bold mt-0.5">{brand.name}</div></div></div></div>), 'rounded-full'],
    [(<div className="w-full h-full bg-white flex items-center justify-center"><div className="rounded-full w-[60%] aspect-square border-4 flex items-center justify-center" style={{borderColor:p}}><span className="text-[12px] font-serif font-black" style={{color:p}}>{init}</span></div></div>), 'rounded-full'],
    [(<div className="w-full h-full bg-[#FAF6EE] flex items-center justify-center"><div className="text-center"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">— member —</div><div className="text-[10px] font-bold" style={{color:p}}>{brand.name}</div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">— club —</div></div></div>), 'rounded-md'],
    [(<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color="#fff" /></div></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-[#FBF8EE] flex items-center justify-center"><div className="text-[44px] font-serif font-black leading-none" style={{color:p}}>{init}.</div></div>), 'rounded-full'],
    [(<div className="w-full h-full" style={{ background: `repeating-linear-gradient(45deg, ${p} 0 6px, #fff 6px 12px)` }}><div className="absolute inset-0 flex items-center justify-center"><div className="bg-white rounded-full w-[60%] aspect-square flex items-center justify-center"><span className="text-[10px] font-bold" style={{color:p}}>{brand.name}</span></div></div></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-white flex items-center justify-center"><div className="text-center"><div className="text-[5px] uppercase tracking-[0.32em]" style={{color:p}}>good news —</div><div className="text-[10px] font-serif italic font-bold mt-1">you're cool.</div></div></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-[#0F1216]"><div className="absolute inset-0" style={{ background: `radial-gradient(circle at 30% 30%, ${p}AA, transparent 70%)` }} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-[10px] font-mono font-bold text-white">{brand.name}.live</span></div></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-white"><div className="absolute inset-0" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} /><div className="absolute right-2 bottom-2 text-[8px] font-bold">{brand.name}</div></div>), 'rounded-md'],
    [(<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40%] bg-white flex items-center justify-center"><div className="text-[10px] font-bold" style={{color:p}}>{brand.name}</div></div></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-[#FAF6EE] flex items-center justify-center"><div className="text-center"><div className="text-[24px] leading-none font-serif" style={{color:p}}>"</div><div className="text-[7px] font-serif italic mt-1">cool kids</div></div></div>), 'rounded-md'],
    [(<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-0 flex items-center justify-center"><div className="text-[10px] font-bold text-white">RAD CO.</div></div></div>), 'rounded-full'],
    [(<div className="w-full h-full bg-white"><div className="absolute inset-0 grid grid-cols-3 grid-rows-3">{Array.from({length:9}).map((_,i)=><div key={i} style={{borderRight:'1px solid #00000010',borderBottom:'1px solid #00000010'}} />)}</div><div className="absolute inset-0 flex items-center justify-center"><span className="text-[16px] font-bold" style={{color:p}}>{init}</span></div></div>), 'rounded-md'],
    [(<div className="w-full h-full" style={{ background: `conic-gradient(from 180deg, ${p}, ${p}99, ${p}, ${p}99, ${p})` }}><div className="absolute inset-[20%] rounded-full bg-white flex items-center justify-center"><span className="text-[10px] font-bold" style={{color:p}}>{init}</span></div></div>), 'rounded-full'],
    [(<div className="w-full h-full bg-[#FBF8EE]"><div className="absolute inset-x-0 bottom-0 h-[55%]" style={{backgroundColor:p}} /><div className="absolute inset-x-0 top-[10%] flex justify-center"><BrandLogo brand={brand} size="sm" color={p} /></div><div className="absolute inset-x-0 bottom-[8%] text-center text-white text-[6px] uppercase tracking-[0.32em]">{brand.name}</div></div>), 'rounded-md'],
    [(<div className="w-full h-full bg-white flex items-center justify-center"><div className="text-center"><BrandLogo brand={brand} size="sm" color={p} /><div className="w-[20px] h-[1px] mx-auto my-1" style={{backgroundColor:p}} /><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">— since 2026 —</div></div></div>), 'rounded-full'],
    [(<div className="w-full h-full bg-[#FAF6EE] flex items-center justify-center"><div className="text-[10px] font-mono font-bold" style={{color:p}}>{`> ./run`}</div></div>), 'rounded-md'],
    [(<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-0 flex items-center justify-center text-white"><div className="text-center"><div className="text-[5px] uppercase tracking-[0.32em] opacity-80">— with —</div><div className="text-[14px] font-serif italic font-bold">love.</div></div></div></div>), 'rounded-full'],
    [(<div className="w-full h-full bg-white p-2 flex flex-col items-center justify-center"><div className="text-[44px] tabular-nums leading-none font-bold" style={{color:p}}>14</div><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500 mt-1">— issue 014 —</div></div>), 'rounded-md'],
    [(<div className="w-full h-full" style={{backgroundColor:p}}><div className="absolute inset-0 flex items-center justify-center"><div className="text-white text-[9px] font-bold uppercase tracking-tight rotate-[-6deg]">{N} CO.</div></div></div>), 'rounded-md'],
  ] as const;

  const [art, shape] = designs[templateIndex] ?? designs[0];
  return <StickerFrame shape={shape}>{art}</StickerFrame>;
}

export const MOCKUP_STICKER_EXTENDED = Array.from({length:30},(_,i)=>({idSuffix:`ext-${i+1}`,name:['Initial Round','Logo Square','Hello','Gradient Rad','Code Token','Good Vibes','Pixel','Star','Hi','Hashtag','Est','Outline Initial','Member Club','Logo Big','Initial Period','Stripes','Cool','Spotlight','Diagonal','Half','Quote Italic','Rad Co','Grid','Conic','Mountain','Crest','Term','Love','Number','Tilted'][i],category:'Print'}));
