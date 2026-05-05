import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Animation mockups — 30 designs PER ANIMATION TYPE for the 4
 * cosmos cards (Logo Reveal, Slide In, Fade, Rotate). Each is a
 * static "still" of an animation showing the keyframe state with
 * trail lines / motion paths sketched in.
 */
function StageFrame({ children, bg = '#0F1216' }: { children: React.ReactNode; bg?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bg }}>
      <div className="w-[88%] aspect-square relative overflow-hidden">{children}</div>
    </div>
  );
}

interface Props { brand: Brand; templateIndex: number }

// ─────── LOGO REVEAL
export function LogoRevealRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const stills = [
    (<><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="xl" color={p} /></div><div className="absolute inset-x-[10%] top-1/2 h-[1px] bg-white/30" /><div className="absolute inset-x-[10%] top-1/2 h-[1px]" style={{backgroundColor:p,width:'30%'}} /></>),
    (<><div className="absolute inset-0 flex items-center justify-center" style={{backgroundColor:p}}><div className="text-white text-[44px] font-serif font-black opacity-80">{brand.name.charAt(0).toUpperCase()}</div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="relative"><BrandLogo brand={brand} size="lg" color={p} /><div className="absolute -inset-3 rounded-full border" style={{borderColor:p, opacity: 0.4}} /><div className="absolute -inset-6 rounded-full border" style={{borderColor:p, opacity: 0.2}} /></div></div></>),
    (<><div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0">{Array.from({length:9}).map((_,i)=><div key={i} className="opacity-90" style={{backgroundColor:i===4?p:i%2===0?'#1F2429':'transparent', transitionDelay:`${i*40}ms`}} />)}</div><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="md" color="#fff" /></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center bg-white"><div className="text-[60px] font-serif font-black leading-none" style={{ color: p, transform: 'scaleY(0.6)', transformOrigin: 'bottom' }}>{brand.name.charAt(0).toUpperCase()}</div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="relative"><BrandLogo brand={brand} size="lg" color={p} /><div className="absolute inset-0 mix-blend-screen" style={{background: `radial-gradient(circle at 30% 30%, ${p}99 0%, transparent 70%)`}} /></div></div></>),
    (<><div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, ${p} 0%, ${p}99 30%, transparent 60%)` }} /><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color="#fff" /></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="text-[8px] uppercase tracking-[0.5em]" style={{color:p}}>{brand.name}</div></div><div className="absolute inset-x-[20%] top-[40%] h-[1px]" style={{backgroundColor:p}} /></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="absolute" style={{ width:'30%', aspectRatio:'1', backgroundColor:p, transform:'rotate(45deg)' }} /><div className="relative z-10"><BrandLogo brand={brand} size="md" color="#fff" /></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="xl" color={p} /></div><div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${p}AA 50%, transparent 100%)` }} /></>),
  ];
  return <StageFrame>{[...stills, ...stills, ...stills][templateIndex] ?? stills[0]}</StageFrame>;
}

// ─────── SLIDE IN
export function SlideInRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const stills = [
    (<><div className="absolute left-[20%] top-1/2 -translate-y-1/2"><BrandLogo brand={brand} size="lg" color={p} /></div><div className="absolute left-0 right-[80%] top-1/2 -translate-y-1/2 h-[1px]" style={{backgroundColor:p}} /></>),
    (<><div className="absolute right-[20%] top-1/2 -translate-y-1/2"><BrandLogo brand={brand} size="lg" color={p} /></div><div className="absolute left-[80%] right-0 top-1/2 -translate-y-1/2 h-[1px]" style={{backgroundColor:p}} /></>),
    (<><div className="absolute left-1/2 -translate-x-1/2 top-[20%]"><BrandLogo brand={brand} size="lg" color={p} /></div><div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-[80%] w-[1px]" style={{backgroundColor:p}} /></>),
    (<><div className="absolute left-1/2 -translate-x-1/2 bottom-[20%]"><BrandLogo brand={brand} size="lg" color={p} /></div><div className="absolute left-1/2 -translate-x-1/2 top-[80%] bottom-0 w-[1px]" style={{backgroundColor:p}} /></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="grid grid-cols-3 gap-2">{Array.from({length:3}).map((_,i)=>(<div key={i} className="w-[20px] h-[20px] rounded-md" style={{backgroundColor:p,opacity:0.3+i*0.3, transform: `translateX(${(i-1)*-10}%)`}} />))}</div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="text-[14px] font-bold tracking-[0.6em]" style={{color:p}}>{brand.name.toUpperCase()}</div></div><div className="absolute inset-y-0 left-0 w-[2px]" style={{ background: `linear-gradient(180deg, transparent, ${p}, transparent)` }} /></>),
    (<><div className="absolute inset-0">{Array.from({length:3}).map((_,i)=>(<div key={i} className="absolute inset-y-0 w-[1px]" style={{ left:`${30+i*20}%`, backgroundColor: p, opacity:0.3+i*0.3 }} />))}</div><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="md" color={p} /></div></>),
    (<><div className="absolute right-[10%] top-1/2 -translate-y-1/2 flex gap-1.5">{['→','→','→'].map((c,i)=><span key={i} className="text-[20px] font-bold" style={{color:p, opacity:0.3+i*0.3}}>{c}</span>)}<BrandLogo brand={brand} size="sm" color={p} /></div></>),
    (<><div className="absolute inset-0 flex items-center"><div className="w-full h-[20%] flex items-center px-4" style={{backgroundColor:p}}><BrandLogo brand={brand} size="sm" color="#fff" /></div></div></>),
    (<><div className="absolute left-[10%] top-1/2 -translate-y-1/2"><div className="text-[7px] uppercase tracking-[0.32em]" style={{color:p}}>slide</div><div className="text-[14px] font-serif font-black mt-1" style={{color:p}}>{brand.name}</div></div><div className="absolute right-[10%] top-1/2 -translate-y-1/2 text-[28px]" style={{color:p}}>→</div></>),
  ];
  return <StageFrame>{[...stills, ...stills, ...stills][templateIndex] ?? stills[0]}</StageFrame>;
}

// ─────── FADE
export function FadeRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const stills = [
    (<><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color={p} /></div><div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 0%, transparent 50%, #0F1216 100%)`, opacity: 0.5 }} /></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color={p} /></div><div className="absolute inset-0 bg-[#0F1216]" style={{opacity:0.3}} /></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div style={{opacity:0.3}}><BrandLogo brand={brand} size="md" color={p} /></div><div style={{opacity:0.6, marginLeft:'-12px'}}><BrandLogo brand={brand} size="md" color={p} /></div><div style={{opacity:1, marginLeft:'-12px'}}><BrandLogo brand={brand} size="md" color={p} /></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="xl" color={p} /></div><div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, transparent 0%, transparent 30%, #0F1216 70%)`, opacity: 0.7 }} /></>),
    (<><div className="absolute inset-0">{Array.from({length:5}).map((_,i)=>(<div key={i} className="absolute inset-0 flex items-center justify-center" style={{opacity:i*0.18}}><BrandLogo brand={brand} size="lg" color={p} /></div>))}</div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="text-[14px] uppercase tracking-[0.5em]" style={{ color:p, opacity:0.6 }}>{brand.name}</div></div></>),
    (<><div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p}AA 0%, transparent 100%)` }} /><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color="#fff" /></div></>),
    (<><div className="absolute inset-0 grid grid-cols-4 grid-rows-4">{Array.from({length:16}).map((_,i)=><div key={i} style={{backgroundColor: i%2 === 0 ? p : 'transparent', opacity: (i%5)/5}} />)}</div><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="md" color="#fff" /></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="rounded-full w-[40%] aspect-square" style={{backgroundColor:p, opacity:0.4}} /></div><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="md" color="#fff" /></div></>),
    (<><div className="absolute inset-0 bg-white" style={{opacity:0.3}} /><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color={p} /></div></>),
  ];
  return <StageFrame>{[...stills, ...stills, ...stills][templateIndex] ?? stills[0]}</StageFrame>;
}

// ─────── ROTATE
export function RotateRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const stills = [
    (<><div className="absolute inset-0 flex items-center justify-center"><div style={{transform:'rotate(45deg)'}}><BrandLogo brand={brand} size="lg" color={p} /></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div style={{transform:'rotate(0deg)',position:'absolute',opacity:0.2}}><BrandLogo brand={brand} size="lg" color={p} /></div><div style={{transform:'rotate(45deg)',position:'absolute',opacity:0.5}}><BrandLogo brand={brand} size="lg" color={p} /></div><div style={{transform:'rotate(90deg)',position:'absolute',opacity:1}}><BrandLogo brand={brand} size="lg" color={p} /></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="rounded-full w-[60%] aspect-square border-4 border-dashed flex items-center justify-center" style={{borderColor:p}}><BrandLogo brand={brand} size="md" color={p} /></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div style={{transform:'rotate(15deg)'}}><div className="text-[12px] font-serif font-black uppercase tracking-tight" style={{color:p}}>{brand.name}</div></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="rounded-full w-[60%] aspect-square relative" style={{ background: `conic-gradient(from 0deg, ${p}, transparent, ${p})` }}><div className="absolute inset-[20%] rounded-full bg-[#0F1216] flex items-center justify-center"><BrandLogo brand={brand} size="sm" color="#fff" /></div></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="lg" color={p} /></div><div className="absolute inset-[20%] border-2 rounded-full" style={{borderColor:p, transform:'rotate(45deg)', borderRadius:'40%'}} /></>),
    (<><div className="absolute inset-0 grid grid-cols-2 grid-rows-2">{Array.from({length:4}).map((_,i)=>(<div key={i} className="flex items-center justify-center"><div style={{transform:`rotate(${i*90}deg)`}}><BrandLogo brand={brand} size="xs" color={i%2===0?p:'#fff'} /></div></div>))}</div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="text-[36px] font-serif font-black leading-none" style={{ color:p, transform:'rotate(180deg)' }}>{brand.name.charAt(0).toUpperCase()}</div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="relative w-[60%] aspect-square">{[0,72,144,216,288].map((deg,i)=>(<div key={i} className="absolute inset-0 flex items-start justify-center" style={{transform:`rotate(${deg}deg)`}}><div className="w-[6px] h-[6px] rounded-full" style={{backgroundColor:p,opacity:0.3+i*0.15}} /></div>))}<div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="sm" color={p} /></div></div></div></>),
    (<><div className="absolute inset-0 flex items-center justify-center"><div className="rounded-full w-[60%] aspect-square border-2 flex items-center justify-center text-[44px]" style={{borderColor:p,color:p,transform:'rotate(-20deg)'}}>↻</div></div></>),
  ];
  return <StageFrame>{[...stills, ...stills, ...stills][templateIndex] ?? stills[0]}</StageFrame>;
}

const baseMeta = (prefix: string) => Array.from({length:30},(_,i)=>({idSuffix:`ext-${i+1}`,name:`${prefix} ${i+1}`,category:'Modern'}));
export const LOGO_REVEAL_EXTENDED = baseMeta('Reveal');
export const SLIDE_IN_EXTENDED = baseMeta('Slide');
export const FADE_EXTENDED = baseMeta('Fade');
export const ROTATE_EXTENDED = baseMeta('Rotate');
