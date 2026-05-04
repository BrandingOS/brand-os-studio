import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Website extensions — 30 browser-window mockups. Each tile shows a
 * miniature site composition: hero with brand color, nav, content
 * tiles, footer. Distinct from Mockups::Website because here every
 * design is a full-bleed website screen, not a phone/laptop frame.
 */
interface Props { brand: Brand; templateIndex: number }

function Browser({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-[#E5E0D2] flex items-center justify-center p-[3%]">
      <div className="w-[92%] h-[88%] bg-white rounded-md shadow-lg overflow-hidden flex flex-col">
        <div className="h-[10%] bg-[#FBF8EE] flex items-center gap-1 px-2 border-b border-[#E5E0D2]">
          <div className="w-[5px] h-[5px] rounded-full bg-[#E76A6A]" />
          <div className="w-[5px] h-[5px] rounded-full bg-[#E7B96A]" />
          <div className="w-[5px] h-[5px] rounded-full bg-[#7BC56A]" />
          <div className="ml-2 flex-1 bg-white rounded-sm px-2 py-0.5 text-[4px] text-gray-500 truncate">brand.com</div>
        </div>
        <div className="flex-1 relative overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export function WebWebsiteExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();

  const layouts = [
    // 0 — Hero Center
    (<><div className="absolute inset-0" style={{backgroundColor:p}} /><div className="absolute inset-0 flex items-center justify-center text-white text-center"><div><div className="text-[5px] uppercase tracking-[0.32em] opacity-80">{brand.name}</div><div className="text-[16px] font-serif font-black mt-1">make it last.</div><div className="text-[4px] uppercase tracking-[0.32em] mt-2 opacity-80">— scroll —</div></div></div></>),
    // 1 — Split Hero
    (<div className="flex w-full h-full"><div className="w-1/2" style={{backgroundColor:p}} /><div className="w-1/2 bg-white p-2 flex flex-col justify-center"><div className="text-[10px] font-serif font-bold text-gray-900">{brand.name}</div><div className="space-y-[2px] mt-1">{Array.from({length:4}).map((_,i)=>(<div key={i} className="h-[2px] bg-gray-100 rounded" style={{width:`${85-i*10}%`}} />))}</div></div></div>),
    // 2 — Editorial Index
    (<div className="absolute inset-0 bg-[#FBF8EE] p-2"><div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">{brand.name} · 014</div><div className="text-[14px] font-serif font-black mt-1" style={{color:p}}>Spring</div><div className="text-[14px] font-serif font-black -mt-1">Issue</div><div className="grid grid-cols-3 gap-1 mt-2">{Array.from({length:6}).map((_,i)=>(<div key={i} className="aspect-square rounded-sm" style={{backgroundColor:i%3===0?p:`${p}33`}} />))}</div></div>),
    // 3 — Big Type Hero
    (<div className="absolute inset-0 flex items-center justify-center bg-white"><div className="text-[28px] font-serif font-black tracking-tight" style={{color:p}}>{brand.name}.</div></div>),
    // 4 — Nav + Grid
    (<div className="w-full h-full bg-white"><div className="h-[14%] flex items-center justify-between px-2 border-b border-gray-100"><BrandLogo brand={brand} size="xs" /><div className="flex gap-2 text-[4px] text-gray-700">{['Work','Studio','Notes','Contact'].map(s=><span key={s}>{s}</span>)}</div></div><div className="grid grid-cols-3 gap-1 p-1.5">{Array.from({length:9}).map((_,i)=>(<div key={i} className="aspect-square" style={{backgroundColor:i%3===0?p:i%3===1?'#FBF8EE':'#0F1216'}} />))}</div></div>),
    // 5 — Halftone Hero
    (<><div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p}EE 0%, ${p}66 100%)` }} /><div className="absolute inset-0 mix-blend-multiply opacity-50" style={{ backgroundImage: `radial-gradient(circle, #111 0.5px, transparent 0.6px)`, backgroundSize: '4px 4px' }} /><div className="absolute inset-0 flex items-center justify-center text-white"><div className="text-center"><div className="text-[14px] font-serif font-bold">{brand.name}</div><div className="text-[4px] uppercase tracking-[0.32em] mt-1 opacity-90">make better</div></div></div></>),
    // 6 — Brutalist Grid
    (<div className="w-full h-full bg-[#0F1216] text-white p-2 font-mono"><div className="text-[5px] uppercase tracking-[0.32em] opacity-70">{brand.name.toUpperCase()} / IDX</div><div className="text-[16px] font-extrabold mt-1" style={{color:p}}>RUN.{init}</div><div className="grid grid-cols-4 gap-[1px] mt-2">{Array.from({length:16}).map((_,i)=>(<div key={i} className="aspect-square" style={{backgroundColor:i%4===0?p:'#1F2429'}} />))}</div></div>),
    // 7 — Sidebar Layout
    (<div className="flex w-full h-full"><div className="w-[24%]" style={{backgroundColor:p}}><div className="p-1.5 text-white text-[5px] uppercase tracking-[0.22em]">{brand.name}</div></div><div className="flex-1 bg-white p-2"><div className="text-[10px] font-serif font-bold text-gray-900">Welcome</div><div className="space-y-[2px] mt-1">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-[2px] bg-gray-100 rounded" style={{width:`${85-i*8}%`}} />))}</div></div></div>),
    // 8 — Pricing Table
    (<div className="w-full h-full bg-white p-2"><div className="text-center text-[8px] font-bold text-gray-900">{brand.name} · plans</div><div className="grid grid-cols-3 gap-1 mt-2">{['$10','$24','$48'].map((pr,i)=>(<div key={i} className="rounded p-1.5 text-center" style={{backgroundColor:i===1?p:'#FBF8EE',color:i===1?'#fff':'#0F1216'}}><div className="text-[4px] uppercase tracking-[0.2em] opacity-80">tier {i+1}</div><div className="text-[10px] font-bold mt-0.5">{pr}</div></div>))}</div></div>),
    // 9 — Hero Card
    (<div className="w-full h-full bg-[#FBF8EE] p-2 flex"><div className="w-[60%] flex flex-col justify-center"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">{brand.name}</div><div className="text-[14px] font-serif font-black text-gray-900 mt-1 leading-tight">A small studio<br/>doing big work.</div><div className="text-[4px] mt-2 px-2 py-0.5 rounded inline-block w-fit text-white" style={{backgroundColor:p}}>Get started →</div></div><div className="flex-1 ml-2 rounded" style={{backgroundColor:p}} /></div>),
    // 10 — Type Wall
    (<div className="w-full h-full bg-[#FAF6EE] p-2 flex flex-col justify-center" style={{ lineHeight: 0.85 }}>{Array.from({length:6}).map((_,i)=>(<div key={i} className="text-[14px] font-serif font-black uppercase tracking-tight" style={{ color: i===2?p:`${p}33` }}>{brand.name}</div>))}</div>),
    // 11 — Photo Grid
    (<div className="w-full h-full bg-white p-1 grid grid-cols-3 grid-rows-3 gap-1">{Array.from({length:9}).map((_,i)=>(<div key={i} style={{backgroundColor: i===4?p:i%2===0?'#FBF8EE':'#0F1216'}} />))}</div>),
    // 12 — Frosted Hero
    (<><div className="absolute inset-0" style={{ background: `radial-gradient(140% 80% at 18% 30%, ${p} 0%, ${p}AA 35%, transparent 80%)` }} /><div className="absolute inset-[8%] rounded-md backdrop-blur-[3px] bg-white/55 border border-white/70 flex items-center justify-between px-3"><BrandLogo brand={brand} size="xs" /><div className="text-right"><div className="text-[10px] font-serif font-bold">{brand.name}</div><div className="text-[4px] uppercase tracking-[0.22em] mt-0.5">2026</div></div></div></>),
    // 13 — Manifesto
    (<div className="w-full h-full bg-[#FBF8EE] p-2 flex flex-col justify-center"><div className="text-[6px] uppercase tracking-[0.32em] mb-1" style={{color:p}}>— manifesto</div>{['Make less.', 'Make better.', 'Make it last.'].map((s,i)=>(<div key={i} className="text-[12px] font-serif italic font-bold leading-tight" style={{color:i===1?p:'#0F1216'}}>{s}</div>))}</div>),
    // 14 — Magazine Spread
    (<div className="w-full h-full bg-white p-1.5 flex"><div className="w-1/2 pr-1"><div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">{brand.name} · 14</div><div className="text-[10px] font-serif font-bold text-gray-900 mt-1">The Spring Issue</div><div className="space-y-[1.5px] mt-1.5">{Array.from({length:6}).map((_,i)=>(<div key={i} className="h-[2px] bg-gray-100 rounded" />))}</div></div><div className="w-1/2 rounded" style={{ backgroundColor: p }} /></div>),
    // 15 — Centered Pill
    (<div className="w-full h-full flex items-center justify-center" style={{backgroundColor:p}}><div className="bg-white rounded-full px-3 py-1 text-center"><div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">welcome to</div><div className="text-[10px] font-serif font-bold" style={{color:p}}>{brand.name}.com</div></div></div>),
    // 16 — Diagonal
    (<><div className="absolute inset-0 bg-white" /><div className="absolute inset-0" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 100%)' }} /><div className="absolute right-2 bottom-2 text-right"><div className="text-[10px] font-serif font-bold text-gray-900">{brand.name}</div><div className="text-[4px] uppercase tracking-[0.22em] mt-0.5 text-gray-500">studio · 2026</div></div><div className="absolute left-2 top-2 text-white"><BrandLogo brand={brand} size="xs" color="#ffffff" /></div></>),
    // 17 — Stats Hero
    (<div className="w-full h-full bg-white p-2"><div className="text-[8px] font-bold text-gray-900">By the numbers</div><div className="grid grid-cols-3 gap-1 mt-1.5">{[['014','projects'],['08','years'],['56','clients']].map(([n,l],i)=>(<div key={i} className="bg-[#FBF8EE] rounded p-1 text-center"><div className="text-[14px] font-serif font-black" style={{color:p}}>{n}</div><div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">{l}</div></div>))}</div></div>),
    // 18 — Testimonial
    (<div className="w-full h-full bg-[#FAF6EE] p-2 flex flex-col justify-center"><div className="text-[36px] leading-none font-serif" style={{color:p}}>"</div><div className="text-[8px] font-serif italic text-gray-800 leading-tight mt-1">A studio that gets it. Real, careful work that lasts.</div><div className="text-[4px] uppercase tracking-[0.22em] mt-2 text-gray-500">— a client of {brand.name}</div></div>),
    // 19 — Calendar Hero
    (<div className="w-full h-full bg-white p-1.5"><div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">{brand.name} · April · 2026</div><div className="grid grid-cols-7 gap-[1px] mt-1">{Array.from({length:28}).map((_,i)=>(<div key={i} className="aspect-square flex items-center justify-center text-[3.5px]" style={{backgroundColor:i===14?p:'#FBF8EE',color:i===14?'#fff':'#888'}}>{i===14?'27':i+1}</div>))}</div></div>),
    // 20 — Big Footer
    (<div className="w-full h-full bg-white"><div className="h-[60%] p-2 flex items-center"><div><div className="text-[10px] font-serif font-bold text-gray-900">{brand.name}</div><div className="text-[4px] uppercase tracking-[0.22em] text-gray-500 mt-1">a brand · est. 2026</div></div></div><div className="h-[40%] p-2" style={{backgroundColor:p}}><div className="text-white text-[10px] font-bold">make better →</div><div className="text-white text-[4px] uppercase tracking-[0.22em] mt-1 opacity-80">{brand.name.toLowerCase()}.com</div></div></div>),
    // 21 — Sun + Hero
    (<><div className="absolute inset-0 bg-[#FBF8EE]" /><div className="absolute -left-[10%] -top-[40%] w-[80%] aspect-square rounded-full" style={{ background: `conic-gradient(from 180deg, ${p} 0deg, ${p}99 30deg, transparent 60deg, ${p} 90deg, transparent 150deg, ${p} 180deg)`, opacity: 0.85 }} /><div className="absolute right-2 top-1/2 -translate-y-1/2 text-right"><div className="text-[14px] font-serif font-black text-gray-900">{brand.name}</div><div className="text-[4px] uppercase tracking-[0.22em] mt-1" style={{color:p}}>since 2026</div></div></>),
    // 22 — Mountain Hero
    (<><div className="absolute inset-0 bg-[#FBF8EE]" /><div className="absolute left-0 right-0 bottom-0 h-[55%]" style={{backgroundColor:p}} /><div className="absolute left-0 right-0 bottom-[55%] h-[12%]" style={{backgroundColor:`${p}77`}} /><div className="absolute right-[14%] top-[14%] w-[14%] aspect-square rounded-full bg-white/70" /><div className="absolute left-2 bottom-2 text-white"><div className="text-[10px] font-serif font-bold">{brand.name}</div></div></>),
    // 23 — Onboarding
    (<div className="w-full h-full bg-white p-2 flex flex-col justify-between"><div className="flex justify-between text-[4px] uppercase tracking-[0.22em] text-gray-500"><span>{brand.name}</span><span>step 1 / 3</span></div><div className="text-center"><div className="text-[10px] font-serif font-bold text-gray-900">Welcome</div><div className="text-[4.5px] text-gray-600 mt-1">Let's set up your brand.</div><div className="text-[4px] uppercase tracking-[0.22em] mt-2 inline-block px-2 py-0.5 rounded text-white" style={{backgroundColor:p}}>Get started</div></div><div className="flex justify-center gap-1">{[0,1,2].map(i=><div key={i} className="w-[6px] h-[2px] rounded" style={{backgroundColor:i===0?p:'#E5E0D2'}} />)}</div></div>),
    // 24 — Cards Layout
    (<div className="w-full h-full bg-[#FBF8EE] p-1.5 grid grid-cols-2 gap-1.5">{Array.from({length:4}).map((_,i)=>(<div key={i} className="bg-white rounded-md p-1.5 flex flex-col justify-between"><div className="text-[4px] uppercase tracking-[0.22em]" style={{color:p}}>card {i+1}</div><div className="text-[6px] font-serif font-bold text-gray-900">Lorem ipsum</div></div>))}</div>),
    // 25 — Code-y
    (<div className="w-full h-full bg-[#0F1216] text-white p-2 font-mono text-[5px]"><div className="opacity-50">// {brand.name}.config</div><div className="mt-0.5">const <span style={{color:p}}>brand</span> = {`{`}</div><div className="ml-3 opacity-80">name: <span style={{color:p}}>"{brand.name}"</span>,</div><div className="ml-3 opacity-80">color: <span style={{color:p}}>"{p}"</span>,</div><div className="ml-3 opacity-80">tone: <span style={{color:p}}>"calm"</span>,</div><div>{`}`}</div></div>),
    // 26 — Centered Logo
    (<div className="w-full h-full flex items-center justify-center bg-[#FBF8EE]"><div className="text-center"><BrandLogo brand={brand} size="lg" color={p} /><div className="text-[5px] uppercase tracking-[0.32em] text-gray-600 mt-2">{brand.name}.com</div></div></div>),
    // 27 — Article Layout
    (<div className="w-full h-full bg-white p-1.5"><div className="text-[4px] uppercase tracking-[0.22em] text-gray-500">{brand.name} · journal</div><div className="text-[8px] font-serif font-bold text-gray-900 mt-1">Why we make less.</div><div className="space-y-[1px] mt-1.5">{Array.from({length:8}).map((_,i)=>(<div key={i} className="h-[1.5px] bg-gray-100 rounded" />))}</div></div>),
    // 28 — Empty State
    (<div className="w-full h-full bg-white flex items-center justify-center"><div className="text-center"><div className="w-[24px] h-[24px] mx-auto rounded-full" style={{backgroundColor:`${p}22`}} /><div className="text-[6px] font-bold text-gray-900 mt-1.5">Nothing here yet</div><div className="text-[4px] text-gray-500 mt-0.5">Start with a new brand.</div></div></div>),
    // 29 — Live Counter
    (<div className="w-full h-full flex items-center justify-center" style={{backgroundColor:p}}><div className="text-center text-white"><div className="text-[4px] uppercase tracking-[0.32em] opacity-80">— launching in —</div><div className="text-[20px] font-serif font-black tabular-nums mt-0.5">07 : 24 : 11</div><div className="text-[4px] uppercase tracking-[0.32em] opacity-80 mt-1">{brand.name.toLowerCase()}.com</div></div></div>),
  ];

  return <Browser>{layouts[templateIndex] ?? layouts[0]}</Browser>;
}

export const WEB_WEBSITE_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: ['Hero Center','Split Hero','Editorial','Big Type','Nav Grid','Halftone','Brutalist','Sidebar','Pricing','Hero Card','Type Wall','Photo Grid','Frosted','Manifesto','Magazine','Centered Pill','Diagonal','Stats','Testimonial','Calendar','Big Footer','Sun Hero','Mountain','Onboarding','Cards','Code Block','Centered Logo','Article','Empty State','Counter'][i],
  category: 'Modern',
}));
