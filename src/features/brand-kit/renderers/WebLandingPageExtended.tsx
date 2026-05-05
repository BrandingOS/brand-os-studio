import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Landing-page extensions — 30 designs. Each tile shows a hero
 * + section composition specific to a marketing landing flow:
 * top nav, big headline, CTA, supporting modules. Distinct from
 * the Website renderer (which shows a full app/site mock).
 */
interface Props { brand: Brand; templateIndex: number }

function LandingFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-[#E5E0D2] flex items-center justify-center p-[3%]">
      <div className="w-full h-full bg-white shadow-md overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}

function Nav({ brand, p }: { brand: Brand; p: string }) {
  return (
    <div className="h-[10%] flex items-center justify-between px-2 border-b border-gray-100 bg-white">
      <BrandLogo brand={brand} size="xs" />
      <div className="flex gap-1.5 text-[3.5px] text-gray-700">{['Product','Pricing','About','Sign in'].map(s=><span key={s}>{s}</span>)}</div>
      <div className="text-[3.5px] text-white px-1.5 py-0.5 rounded" style={{backgroundColor:p}}>Try free →</div>
    </div>
  );
}

export function WebLandingPageExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;

  const heroes = [
    // 0 — Center Bold
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex items-center justify-center text-center px-3"><div><div className="text-[5px] uppercase tracking-[0.32em]" style={{color:p}}>{brand.name} · 2026</div><div className="text-[16px] font-serif font-black text-gray-900 leading-[1.05] mt-1">make work that lasts.</div><div className="text-[4px] text-gray-500 mt-1.5">a small studio building careful brands.</div><div className="mt-2 inline-block px-3 py-0.5 rounded-full text-white text-[4px]" style={{backgroundColor:p}}>Get started</div></div></div></>),
    // 1 — Split
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex"><div className="w-1/2 flex items-center px-2"><div><div className="text-[10px] font-serif font-bold leading-tight" style={{color:p}}>Build less.<br/>Ship better.</div><div className="text-[3.5px] text-gray-500 mt-1">A studio for small teams.</div><div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-white text-[3.5px]" style={{backgroundColor:p}}>Try {brand.name}</div></div></div><div className="w-1/2" style={{backgroundColor:p}} /></div></>),
    // 2 — Big Hero with Visual
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex flex-col items-center justify-center text-center"><div className="text-[14px] font-serif font-black" style={{color:p}}>{brand.name}.</div><div className="text-[4px] text-gray-500 mt-1">make brand work that lasts.</div><div className="mt-2 grid grid-cols-3 gap-1 w-[80%]">{Array.from({length:3}).map((_,i)=>(<div key={i} className="aspect-square rounded" style={{backgroundColor:i===1?p:'#FBF8EE'}} />))}</div></div></>),
    // 3 — Wave
    (<><Nav brand={brand} p={p} /><div className="flex-1 relative overflow-hidden"><div className="absolute inset-x-0 bottom-0 h-[60%]" style={{background:p,clipPath:'polygon(0 30%, 33% 10%, 66% 25%, 100% 0%, 100% 100%, 0 100%)'}} /><div className="absolute inset-x-0 top-[10%] text-center"><div className="text-[12px] font-serif font-bold text-gray-900">small studio.<br/>big ideas.</div></div></div></>),
    // 4 — Stats
    (<><Nav brand={brand} p={p} /><div className="flex-1 p-2 flex flex-col justify-center"><div className="text-[10px] font-serif font-bold text-gray-900 text-center">trusted by 1k+ brands.</div><div className="grid grid-cols-3 gap-1 mt-2">{[['014','years'],['08k','clients'],['56','awards']].map(([n,l],i)=>(<div key={i} className="bg-[#FBF8EE] rounded p-1 text-center"><div className="text-[12px] font-serif font-black" style={{color:p}}>{n}</div><div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">{l}</div></div>))}</div></div></>),
    // 5 — Three Pillars
    (<><Nav brand={brand} p={p} /><div className="flex-1 grid grid-cols-3 gap-1 p-2">{['Identity','System','Print'].map((s,i)=>(<div key={i} className="rounded p-1.5 flex flex-col" style={{backgroundColor:i===1?p:'#FBF8EE',color:i===1?'#fff':'#0F1216'}}><div className="text-[3px] uppercase tracking-[0.22em] opacity-80">0{i+1}</div><div className="text-[7px] font-bold mt-1">{s}</div></div>))}</div></>),
    // 6 — Big Quote
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex items-center justify-center"><div className="text-center px-3"><div className="text-[36px] leading-none font-serif" style={{color:p}}>"</div><div className="text-[8px] font-serif italic font-bold text-gray-800 leading-tight">{brand.name} got it. Real, careful work.</div><div className="text-[3.5px] mt-1.5 uppercase tracking-[0.22em] text-gray-500">— a happy client</div></div></div></>),
    // 7 — Manifesto
    (<><Nav brand={brand} p={p} /><div className="flex-1 p-3 flex flex-col justify-center bg-[#FAF6EE]"><div className="text-[3.5px] uppercase tracking-[0.32em] mb-1" style={{color:p}}>— manifesto</div>{['1. Make less.','2. Make better.','3. Make it last.'].map((s,i)=>(<div key={i} className="text-[10px] font-serif italic font-bold leading-tight" style={{color:i===1?p:'#0F1216'}}>{s}</div>))}</div></>),
    // 8 — Pricing
    (<><Nav brand={brand} p={p} /><div className="flex-1 p-1.5"><div className="text-[8px] font-bold text-center text-gray-900">simple pricing</div><div className="grid grid-cols-3 gap-1 mt-1.5">{['$10','$24','$48'].map((pr,i)=>(<div key={i} className="rounded p-1 text-center" style={{backgroundColor:i===1?p:'#FBF8EE',color:i===1?'#fff':'#0F1216',border:i===1?'none':'1px solid #E5E0D2'}}><div className="text-[3px] uppercase tracking-[0.22em] opacity-70">tier {i+1}</div><div className="text-[10px] font-bold mt-0.5">{pr}</div><div className="text-[3.5px] mt-1 px-1 py-[1px] rounded" style={{backgroundColor:i===1?'#fff':p,color:i===1?p:'#fff'}}>Choose</div></div>))}</div></div></>),
    // 9 — Photo Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex"><div className="w-1/2 p-2 flex flex-col justify-center"><div className="text-[10px] font-serif font-bold" style={{color:p}}>{brand.name}</div><div className="text-[6px] mt-1 text-gray-700">building brands<br/>since 2026.</div></div><div className="w-1/2 grid grid-cols-2 gap-[1px]">{Array.from({length:4}).map((_,i)=>(<div key={i} style={{backgroundColor:i%2===0?p:'#0F1216'}} />))}</div></div></>),
    // 10 — Newsletter
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex flex-col items-center justify-center bg-[#FBF8EE] px-3"><div className="text-[10px] font-serif font-bold text-center" style={{color:p}}>get the newsletter.</div><div className="text-[3.5px] text-gray-500 mt-1 text-center">small notes, every other Sunday.</div><div className="flex gap-1 mt-2 w-[80%]"><div className="flex-1 bg-white border rounded px-2 py-1 text-[3.5px] text-gray-400">your@email.com</div><div className="px-2 py-1 rounded text-white text-[3.5px]" style={{backgroundColor:p}}>Subscribe →</div></div></div></>),
    // 11 — Big Logo Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex flex-col items-center justify-center"><BrandLogo brand={brand} size="xl" color={p} /><div className="text-[5px] uppercase tracking-[0.32em] mt-2 text-gray-500">— a brand —</div></div></>),
    // 12 — Code Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 bg-[#0F1216] text-white p-2 font-mono text-[5px] flex items-center"><div><div className="opacity-50">// quickstart</div><div className="mt-0.5">$ npm install <span style={{color:p}}>{brand.name.toLowerCase()}</span></div><div className="mt-0.5 opacity-70">→ ready in 30s</div></div></div></>),
    // 13 — Testimonial Bar
    (<><Nav brand={brand} p={p} /><div className="flex-1 grid grid-cols-3 gap-1 p-1.5">{Array.from({length:3}).map((_,i)=>(<div key={i} className="bg-[#FBF8EE] rounded p-1.5 flex flex-col justify-between"><div className="text-[8px] font-serif" style={{color:p}}>"</div><div className="text-[3.5px] text-gray-700">a real partner.</div><div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">— client 0{i+1}</div></div>))}</div></>),
    // 14 — Halftone Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 relative overflow-hidden"><div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p}EE 0%, ${p}66 100%)` }} /><div className="absolute inset-0 mix-blend-multiply opacity-50" style={{ backgroundImage: `radial-gradient(circle, #111 0.6px, transparent 0.7px)`, backgroundSize: '5px 5px' }} /><div className="absolute inset-0 flex items-center justify-center text-white text-center"><div><div className="text-[14px] font-serif font-bold">{brand.name}</div><div className="text-[3.5px] uppercase tracking-[0.22em] mt-0.5 opacity-90">make better</div></div></div></div></>),
    // 15 — Number Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex items-center px-3"><div className="text-[44px] leading-none font-bold tabular-nums mr-3" style={{color:p}}>014</div><div><div className="text-[10px] font-serif font-bold text-gray-900">years of</div><div className="text-[10px] font-serif font-bold text-gray-900 -mt-0.5">careful work.</div><div className="text-[3.5px] text-gray-500 mt-1">— {brand.name} since 2026</div></div></div></>),
    // 16 — Diagonal Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 relative overflow-hidden"><div className="absolute inset-0" style={{ background:p, clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 100%)' }} /><div className="absolute left-2 top-2 text-white"><div className="text-[10px] font-serif font-bold">{brand.name}</div></div><div className="absolute right-2 bottom-2 text-right"><div className="text-[8px] font-bold text-gray-900">make better →</div></div></div></>),
    // 17 — Big Cta
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex flex-col items-center justify-center"><div className="text-[10px] font-serif font-bold text-gray-900">ready?</div><div className="mt-2 px-4 py-2 rounded-full text-white text-[6px] font-bold" style={{backgroundColor:p,boxShadow:`0 4px 12px ${p}55`}}>Start your brand →</div></div></>),
    // 18 — Sun + Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 relative overflow-hidden bg-[#FBF8EE]"><div className="absolute -left-[10%] -top-[40%] w-[80%] aspect-square rounded-full" style={{ background: `conic-gradient(from 180deg, ${p} 0deg, ${p}99 30deg, transparent 60deg, ${p} 90deg, transparent 150deg, ${p} 180deg)`, opacity: 0.85 }} /><div className="absolute right-2 top-1/2 -translate-y-1/2 text-right"><div className="text-[12px] font-serif font-black text-gray-900">{brand.name}</div><div className="text-[3.5px] uppercase tracking-[0.22em] mt-0.5" style={{color:p}}>since 2026</div></div></div></>),
    // 19 — Mountain
    (<><Nav brand={brand} p={p} /><div className="flex-1 relative overflow-hidden bg-[#FBF8EE]"><div className="absolute left-0 right-0 bottom-0 h-[60%]" style={{backgroundColor:p}} /><div className="absolute left-0 right-0 bottom-[60%] h-[12%]" style={{backgroundColor:`${p}77`}} /><div className="absolute right-[16%] top-[8%] w-[14%] aspect-square rounded-full bg-white/70" /><div className="absolute left-2 bottom-2 text-white"><div className="text-[8px] font-serif font-bold">build above the noise.</div><div className="text-[3.5px] uppercase tracking-[0.22em] mt-0.5 opacity-90">{brand.name}</div></div></div></>),
    // 20 — Sticker Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 relative overflow-hidden"><div className="absolute -left-[6%] top-[12%] w-[28%] aspect-square rounded-full -rotate-12" style={{backgroundColor:p}} /><div className="absolute right-[10%] bottom-[10%] w-[22%] aspect-square rounded-full bg-[#0F1216] rotate-6" /><div className="absolute right-[20%] top-1/2 -translate-y-1/2 text-right"><div className="text-[10px] font-serif font-bold text-gray-900">{brand.name}</div><div className="text-[3.5px] uppercase tracking-[0.22em] mt-0.5 text-gray-500">studio · 2026</div></div></div></>),
    // 21 — Onboarding Steps
    (<><Nav brand={brand} p={p} /><div className="flex-1 p-2 flex items-center justify-center"><div className="grid grid-cols-3 gap-1.5 w-full">{['Plan','Build','Ship'].map((s,i)=>(<div key={i} className="text-center"><div className="w-[20px] h-[20px] rounded-full mx-auto flex items-center justify-center text-white text-[6px] font-bold" style={{backgroundColor:i===1?p:'#0F1216'}}>{i+1}</div><div className="text-[5px] font-bold mt-1 text-gray-900">{s}</div><div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">step {i+1}</div></div>))}</div></div></>),
    // 22 — Logos Wall
    (<><Nav brand={brand} p={p} /><div className="flex-1 p-2 flex flex-col items-center justify-center"><div className="text-[3.5px] uppercase tracking-[0.32em] text-gray-500">trusted by</div><div className="grid grid-cols-4 gap-1.5 mt-1.5 w-full">{Array.from({length:8}).map((_,i)=>(<div key={i} className="h-[12px] bg-[#FBF8EE] rounded flex items-center justify-center text-[3px] uppercase tracking-[0.22em]" style={{color:p}}>BRAND {i+1}</div>))}</div></div></>),
    // 23 — Big Underline
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex items-center justify-center"><div className="text-center"><div className="text-[14px] font-serif font-black text-gray-900">make.</div><div className="h-[2px] mx-auto w-[40%]" style={{backgroundColor:p}} /><div className="text-[14px] font-serif font-black text-gray-900 mt-0.5">better.</div></div></div></>),
    // 24 — Frosted CTA
    (<><Nav brand={brand} p={p} /><div className="flex-1 relative overflow-hidden"><div className="absolute inset-0" style={{ background: `radial-gradient(140% 80% at 18% 30%, ${p} 0%, ${p}AA 35%, transparent 80%)` }} /><div className="absolute inset-[10%] rounded-md backdrop-blur-[3px] bg-white/55 border border-white/70 flex items-center justify-between px-3"><div><div className="text-[8px] font-serif font-bold text-gray-900">launch with us.</div><div className="text-[3.5px] text-gray-700 mt-0.5">{brand.name} · since 2026</div></div><div className="text-[3.5px] text-white px-1.5 py-0.5 rounded-full" style={{backgroundColor:p}}>Try free →</div></div></div></>),
    // 25 — FAQ
    (<><Nav brand={brand} p={p} /><div className="flex-1 p-2 flex flex-col justify-center"><div className="text-[3.5px] uppercase tracking-[0.32em] mb-1" style={{color:p}}>questions</div>{['What is {b}?','How do I start?','Can I cancel?'].map((q,i)=>(<div key={i} className="border-b py-1 text-[5px] text-gray-900" style={{borderColor:'#E5E0D2'}}>{q.replace('{b}',brand.name)}</div>))}</div></>),
    // 26 — Brand Banner
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex flex-col items-center justify-center" style={{backgroundColor:p}}><div className="text-white text-center"><div className="text-[3.5px] uppercase tracking-[0.32em] opacity-80">— launching —</div><div className="text-[14px] font-serif font-black mt-0.5">{brand.name}</div><div className="text-[3.5px] uppercase tracking-[0.32em] opacity-80 mt-1">spring 2026</div></div></div></>),
    // 27 — Type Wall
    (<><Nav brand={brand} p={p} /><div className="flex-1 p-2 flex flex-col justify-center bg-[#FAF6EE]" style={{ lineHeight: 0.85 }}>{Array.from({length:5}).map((_,i)=>(<div key={i} className="text-[12px] font-serif font-black uppercase tracking-tight" style={{ color: i===2?p:`${p}33` }}>{brand.name}</div>))}</div></>),
    // 28 — Footer Heavy
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex flex-col"><div className="flex-1 flex items-center justify-center"><div className="text-[10px] font-serif font-bold" style={{color:p}}>build with us.</div></div><div className="h-[40%] p-2" style={{backgroundColor:p}}><div className="text-white text-[10px] font-bold">{brand.name} →</div><div className="text-white text-[3.5px] uppercase tracking-[0.22em] mt-1 opacity-80">jane@{brand.name.toLowerCase()}.com</div></div></div></>),
    // 29 — Calendar Hero
    (<><Nav brand={brand} p={p} /><div className="flex-1 flex flex-col justify-center px-3"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">{brand.name} · April · 2026</div><div className="text-[10px] font-serif font-bold mt-1">Spring intake — open.</div><div className="grid grid-cols-7 gap-[1px] mt-2">{Array.from({length:14}).map((_,i)=>(<div key={i} className="aspect-square flex items-center justify-center text-[3.5px]" style={{backgroundColor:i===6?p:'#FBF8EE',color:i===6?'#fff':'#888'}}>{i===6?'27':i+14}</div>))}</div></div></>),
  ];

  return <LandingFrame>{heroes[templateIndex] ?? heroes[0]}</LandingFrame>;
}

export const WEB_LANDING_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: ['Center Bold','Split','Big Hero','Wave','Stats','Three Pillars','Quote','Manifesto','Pricing','Photo Hero','Newsletter','Big Logo','Code Hero','Testimonials','Halftone','Number','Diagonal','Big CTA','Sun Hero','Mountain','Sticker','Onboarding','Logos Wall','Big Underline','Frosted CTA','FAQ','Brand Banner','Type Wall','Footer Heavy','Calendar'][i],
  category: 'Modern',
}));
