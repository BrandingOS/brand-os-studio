import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Favicon extensions — 30 designs. Each tile shows a browser-tab
 * frame with the favicon mark and the rest of the tab as a tiny
 * page preview. Distinct from the Profile drilldown (which shows
 * round avatars).
 */
interface Props { brand: Brand; templateIndex: number }

function TabFrame({ children, fav, title }: { children?: React.ReactNode; fav: React.ReactNode; title?: string }) {
  return (
    <div className="w-full h-full bg-[#E5E0D2] flex items-end p-[6%]">
      <div className="w-full bg-white rounded-md shadow-md overflow-hidden">
        {/* tab strip */}
        <div className="bg-[#F1ECE0] px-2 pt-1 flex items-end gap-1 h-[28px]">
          <div className="bg-white rounded-t-md px-2 py-0.5 flex items-center gap-1 shadow-sm">
            <div className="w-[10px] h-[10px] flex items-center justify-center overflow-hidden rounded-sm">{fav}</div>
            <span className="text-[5px] text-gray-700">{title || 'Brand'}</span>
            <span className="text-[7px] text-gray-400 ml-1">×</span>
          </div>
          <div className="bg-[#E5E0D2] rounded-t-sm px-2 py-0.5 text-[5px] text-gray-500">tab 2</div>
        </div>
        {/* address bar */}
        <div className="bg-[#FBF8EE] flex items-center gap-1 px-2 py-1 border-t border-[#E5E0D2]">
          <div className="w-[6px] h-[6px] rounded-full bg-[#E76A6A]" />
          <div className="w-[6px] h-[6px] rounded-full bg-[#E7B96A]" />
          <div className="w-[6px] h-[6px] rounded-full bg-[#7BC56A]" />
          <div className="ml-1 flex-1 bg-white rounded-sm px-2 py-0.5 text-[5px] text-gray-500 truncate">https://brand.com</div>
        </div>
        {children && <div className="h-[60px]">{children}</div>}
      </div>
    </div>
  );
}

export function WebFaviconExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();
  const F = ({ children, bg = p }: { children?: React.ReactNode; bg?: string }) => (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: bg }}>{children}</div>
  );

  const favs = [
    <F key="0" bg={p}><span className="text-[6px] font-black text-white leading-none">{init}</span></F>,
    <F key="1" bg="#fff"><div className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: p }} /></F>,
    <F key="2" bg={p}><div className="w-[6px] h-[6px] rounded-full bg-white" /></F>,
    <F key="3" bg="#FBF8EE"><span className="text-[6px] font-serif font-black leading-none" style={{color:p}}>{init}</span></F>,
    <F key="4" bg={p}><div className="text-white text-[5px]">★</div></F>,
    <F key="5" bg="#0F1216"><span className="text-[6px] font-black leading-none" style={{color:p}}>{init}</span></F>,
    <F key="6" bg={p}><div className="w-[8px] h-[1px] bg-white" /></F>,
    <F key="7" bg="#fff"><div className="w-[7px] h-[7px] rotate-45" style={{ backgroundColor: p }} /></F>,
    <F key="8" bg={p}><div className="w-[6px] h-[6px] border border-white rounded-full" /></F>,
    <F key="9" bg="#FBF8EE"><div className="grid grid-cols-2 gap-[1px]"><div className="w-[3px] h-[3px]" style={{backgroundColor:p}} /><div className="w-[3px] h-[3px]" style={{backgroundColor:p}} /><div className="w-[3px] h-[3px]" style={{backgroundColor:p}} /><div className="w-[3px] h-[3px]" style={{backgroundColor:p}} /></div></F>,
    <F key="10" bg={p}><div className="text-white text-[5px]">⊕</div></F>,
    <F key="11" bg="#0F1216"><div className="w-[6px] h-[6px] rounded-full" style={{backgroundColor:p}} /></F>,
    <F key="12" bg={p}><div className="w-[6px] h-[2px] bg-white" /></F>,
    <F key="13" bg="#fff"><div className="text-[5px] font-black" style={{color:p}}>{init}.</div></F>,
    <F key="14" bg={p}><div className="rotate-45 w-[7px] h-[7px] border border-white" /></F>,
    <F key="15" bg="#FBF8EE"><div className="w-[7px] h-[7px] rounded-full border-2" style={{borderColor:p}} /></F>,
    <F key="16" bg={p}><BrandLogo brand={brand} size="xs" color="#ffffff" /></F>,
    <F key="17" bg="#FBF8EE"><BrandLogo brand={brand} size="xs" color={p} /></F>,
    <F key="18" bg={p}><div className="text-white text-[5px]">◯</div></F>,
    <F key="19" bg="#0F1216"><div className="text-[5px]" style={{color:p}}>◆</div></F>,
    <F key="20" bg={p}><div className="text-white text-[4px] tracking-tight">{brand.name.slice(0,3).toUpperCase()}</div></F>,
    <F key="21" bg="#FBF8EE"><div className="text-[6px] font-serif italic font-bold" style={{color:p}}>{init.toLowerCase()}</div></F>,
    <F key="22" bg={p}><div className="text-white text-[5px]">→</div></F>,
    <F key="23" bg="#fff"><div className="rounded-full w-[8px] h-[8px]" style={{ background: `conic-gradient(${p} 0% 25%, transparent 25% 100%)` }} /></F>,
    <F key="24" bg={p}><div className="w-[7px] h-[7px] rounded-full" style={{ background: 'conic-gradient(#fff 0% 50%, transparent 50% 100%)' }} /></F>,
    <F key="25" bg="#FAF6EE"><div style={{ borderLeft: `2px solid ${p}`, borderTop: `2px solid ${p}` }} className="w-[7px] h-[7px]" /></F>,
    <F key="26" bg="#0F1216"><div className="text-[5px] font-mono font-bold" style={{color:p}}>{`{${init}}`}</div></F>,
    <F key="27" bg={p}><div className="grid grid-cols-3 grid-rows-3 gap-[1px]">{Array.from({length:9}).map((_,i)=><div key={i} className="w-[2px] h-[2px] bg-white" style={{opacity: i%2===0?1:0.4}} />)}</div></F>,
    <F key="28" bg="#FBF8EE"><div className="text-[5px] font-bold" style={{color:p}}>#{init.toLowerCase()}</div></F>,
    <F key="29" bg={p}><div className="w-[7px] h-[7px]" style={{background:'#fff', clipPath:'polygon(50% 0%, 100% 100%, 0% 100%)'}} /></F>,
  ];

  const titles = ['Brand', 'Home', 'Studio', 'Index', 'Hello', 'Brand · co', 'Studio.', 'About', 'Work', 'Brand', 'Open', 'Brand', 'Brand', 'Brand', 'Brand', 'Studio', 'Brand', 'Studio', 'Brand', 'Brand', 'Brand', 'Brand', 'Next', 'Brand', 'Loading', 'Brand', 'Code', 'Grid', 'Tag', 'Play'];
  return <TabFrame fav={favs[templateIndex] ?? favs[0]} title={titles[templateIndex]} />;
}

export const WEB_FAVICON_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: ['Initial', 'Dot', 'Dot Inverse', 'Serif Initial', 'Star', 'Mono Initial', 'Bar', 'Diamond', 'Ring', 'Quad', 'Plus', 'Inverted Dot', 'Dash', 'Stop', 'Diamond Outline', 'Ring Outline', 'Logo Light', 'Logo Dark', 'Circle', 'Diamond Mono', 'Triple', 'Italic', 'Arrow', 'Pie', 'Half Pie', 'L-Bracket', 'Code', 'Mosaic', 'Hashtag', 'Triangle'][i],
  category: 'Modern',
}));
