import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';
import { Bind } from '@/features/brandkit/content/Bind';
import { defaultPersonContent, type PersonContent } from '@/features/brandkit/content/kinds';

/**
 * Email-signature extensions — 30 designs. Each tile shows an email
 * signature block as it would appear at the bottom of a Gmail-style
 * message. Clean horizontal compositions with name/title/contact.
 */
interface Props {
  brand: Brand;
  templateIndex: number;
  /**
   * The same `person` content the business cards use — these designs
   * hardcode the identical five fields, so one kind serves both and an
   * edit made on one surface means the same thing on the other.
   */
  content?: PersonContent;
}

function MailFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full bg-[#E5E0D2] p-[5%] flex flex-col">
      <div className="bg-white rounded-md shadow-md flex-1 flex flex-col overflow-hidden">
        <div className="h-[16%] bg-[#FBF8EE] flex items-center px-3 border-b border-[#E5E0D2]">
          <div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">RE: project update</div>
        </div>
        <div className="flex-1 p-2.5 flex flex-col text-[4px] text-gray-700 leading-[1.5]">
          <div className="space-y-[2px] flex-1">
            <div>Hi team,</div>
            <div className="h-[1.5px] rounded bg-gray-100 w-full" />
            <div className="h-[1.5px] rounded bg-gray-100 w-[80%]" />
            <div className="h-[1.5px] rounded bg-gray-100 w-[90%]" />
          </div>
          <div className="mt-2 pt-1.5 border-t border-gray-100">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WebEmailSignatureExtendedRenderer({ brand, templateIndex, content }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();
  const c = { ...defaultPersonContent(brand), ...content };
  // Bound fragments, so a design reads as its own composition rather than
  // a wall of props. Each one is a region the editor can select.
  const Name = <Bind path="fullName" value={c.fullName} fit="shrink" />;
  const Title = <Bind path="jobTitle" value={c.jobTitle} />;
  const Email = <Bind path="email" value={c.email} />;
  const Phone = <Bind path="phone" value={c.phone} />;
  const Site = <Bind path="website" value={c.website} />;

  const sigs = [
    // 0 — Classic
    (<div className="flex items-start gap-2"><div className="w-[18px] h-[18px] rounded flex items-center justify-center text-white text-[8px] font-bold" style={{backgroundColor:p}}>{init}</div><div><div className="text-[5px] font-bold text-gray-900">{Name}</div><div className="text-[4px]" style={{color:p}}>{Title} · {brand.name}</div><div className="text-[3.5px] text-gray-500 mt-0.5 flex gap-1 min-w-0">{Email}<span>·</span>{Phone}</div></div></div>),
    // 1 — Bordered Left
    (<div className="flex items-start gap-2 pl-2 border-l-2" style={{borderColor:p}}><div><div className="text-[5px] font-bold text-gray-900">{Name}</div><div className="text-[4px] text-gray-500">{Title} · {brand.name}</div><div className="text-[3.5px] mt-0.5" style={{color:p}}>{Site}</div></div></div>),
    // 2 — Logo + Name
    (<div className="flex items-center gap-2"><BrandLogo brand={brand} size="xs" /><div className="min-w-0"><div className="text-[5px] font-bold">{Name}</div><div className="text-[3.5px] text-gray-500">{Email}</div></div></div>),
    // 3 — Stacked
    (<div className="text-[3.5px] leading-[1.5]"><div className="font-bold text-[5px] text-gray-900">{Name}</div><div style={{color:p}}>{Title}</div><div className="text-gray-500 flex gap-1 min-w-0"><span className="shrink-0">{brand.name}</span><span>·</span>{Email}</div></div>),
    // 4 — Right-aligned
    (<div className="text-right text-[3.5px]"><div className="font-bold text-[5px]">— {Name}</div><div style={{color:p}}>{brand.name}</div></div>),
    // 5 — Mono
    (<div className="font-mono text-[3.5px] leading-[1.5]"><div className="font-bold text-[5px]" style={{color:p}}>JANE.SMITH</div><div className="text-gray-700">VP / {brand.name.toUpperCase()}</div><div className="text-gray-500">jane@{brand.name.toLowerCase()}.com</div></div>),
    // 6 — Brand Strip
    (<div><div className="h-[2px] mb-1 rounded" style={{backgroundColor:p}} /><div className="text-[5px] font-bold">Jane Smith — Vice President · {brand.name}</div><div className="text-[3.5px] text-gray-500 mt-0.5">jane@{brand.name.toLowerCase()}.com · +1 234 56789</div></div>),
    // 7 — Italic Lux
    (<div><div className="text-[7px] font-serif italic font-bold" style={{color:p}}>Jane Smith</div><div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">VP · {brand.name}</div></div>),
    // 8 — Photo Avatar
    (<div className="flex items-center gap-2"><div className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-white font-serif font-bold text-[8px]" style={{ background: `radial-gradient(circle at 30% 30%, ${p}EE, ${p})` }}>JS</div><div><div className="text-[5px] font-bold">Jane Smith</div><div className="text-[3.5px] text-gray-500">VP · {brand.name}</div></div></div>),
    // 9 — Wide Brand
    (<div className="rounded-md p-1.5 text-white" style={{backgroundColor:p}}><div className="text-[5px] font-bold">Jane Smith — VP</div><div className="text-[3.5px] opacity-90">{brand.name} · {brand.name.toLowerCase()}.com</div></div>),
    // 10 — Underline
    (<div><div className="text-[5px] font-bold inline-block" style={{borderBottom:`1.5px solid ${p}`}}>Jane Smith</div><div className="text-[3.5px] text-gray-500 mt-0.5">Vice President · {brand.name} · jane@{brand.name.toLowerCase()}.com</div></div>),
    // 11 — Table-like
    (<div className="grid grid-cols-2 gap-x-2 text-[3.5px]"><div><div className="font-bold text-[5px]">Jane Smith</div><div className="text-gray-500">VP · {brand.name}</div></div><div className="text-right"><div>jane@{brand.name.toLowerCase()}.com</div><div className="text-gray-500">+1 234 56789</div></div></div>),
    // 12 — Brand Tag Pill
    (<div className="flex items-center gap-1.5"><span className="text-[5px] font-bold">Jane Smith</span><span className="text-[3px] uppercase tracking-[0.18em] px-1 py-[1px] rounded text-white" style={{backgroundColor:p}}>VP</span><span className="text-[3.5px] text-gray-500">— {brand.name}</span></div>),
    // 13 — Big Name Small Role
    (<div><div className="text-[8px] font-serif font-bold text-gray-900">Jane Smith</div><div className="text-[3.5px] uppercase tracking-[0.22em] mt-0.5" style={{color:p}}>vice president · {brand.name}</div></div>),
    // 14 — Hand-Lettered
    (<div><div className="text-[10px] italic" style={{ fontFamily:'Caveat, cursive', color:p }}>— Jane</div><div className="text-[3.5px] text-gray-500 mt-0.5">Vice President · {brand.name}</div></div>),
    // 15 — Ledger
    (<div className="font-mono text-[3.5px]"><div className="border-t border-b py-0.5" style={{borderColor:p}}><span className="font-bold">JANE SMITH</span> · VP · {brand.name.toUpperCase()}</div><div className="text-gray-500 mt-0.5">JANE@{brand.name.toUpperCase()}.COM · +1 234 56789</div></div>),
    // 16 — Two-Column
    (<div className="flex gap-3 text-[3.5px]"><div className="flex-1"><div className="text-[5px] font-bold">Jane Smith</div><div style={{color:p}}>Vice President</div></div><div className="flex-1 text-gray-500">jane@{brand.name.toLowerCase()}.com<br/>+1 234 56789<br/>{brand.name.toLowerCase()}.com</div></div>),
    // 17 — Brand Bar Top
    (<div><div className="flex items-center gap-1 mb-0.5"><div className="w-[6px] h-[6px] rounded-full" style={{backgroundColor:p}} /><span className="text-[3.5px] uppercase tracking-[0.22em]" style={{color:p}}>{brand.name}</span></div><div className="text-[5px] font-bold">Jane Smith — Vice President</div><div className="text-[3.5px] text-gray-500">jane@{brand.name.toLowerCase()}.com · +1 234 56789</div></div>),
    // 18 — Initials Big
    (<div className="flex items-center gap-2"><div className="text-[20px] font-serif font-black leading-none" style={{color:p}}>JS</div><div className="text-[3.5px] leading-[1.4]"><div className="font-bold text-[5px]">Jane Smith</div><div className="text-gray-500">VP · {brand.name}</div></div></div>),
    // 19 — Quote Style
    (<div><div className="text-[8px] italic font-serif" style={{color:p}}>"Make less, make better."</div><div className="text-[3.5px] mt-0.5 text-gray-500">— Jane Smith · {brand.name}</div></div>),
    // 20 — Centered
    (<div className="text-center"><div className="text-[5px] font-bold">Jane Smith</div><div className="text-[3.5px] uppercase tracking-[0.32em] mt-0.5" style={{color:p}}>vice president · {brand.name}</div><div className="text-[3.5px] text-gray-500 mt-0.5">{brand.name.toLowerCase()}.com</div></div>),
    // 21 — Color Block
    (<div className="flex"><div className="w-[24px] h-[24px] flex items-center justify-center text-white font-serif font-black text-[10px]" style={{backgroundColor:p}}>{init}</div><div className="ml-2 flex-1"><div className="text-[5px] font-bold">Jane Smith</div><div className="text-[3.5px] text-gray-500">VP · {brand.name}</div></div></div>),
    // 22 — Wide Border
    (<div className="border-2 rounded p-1.5" style={{borderColor:p}}><div className="text-[5px] font-bold">Jane Smith — VP</div><div className="text-[3.5px] mt-0.5 text-gray-500">{brand.name} · jane@{brand.name.toLowerCase()}.com</div></div>),
    // 23 — Initial Stack
    (<div><div className="text-[3.5px] uppercase tracking-[0.32em]" style={{color:p}}>{brand.name}</div><div className="text-[7px] font-bold text-gray-900">Jane Smith</div><div className="text-[3.5px] text-gray-500">Vice President · jane@{brand.name.toLowerCase()}.com</div></div>),
    // 24 — Small Logo Repeat
    (<div className="flex items-center gap-3"><BrandLogo brand={brand} size="xs" /><div className="flex-1"><div className="text-[5px] font-bold">Jane Smith</div><div className="text-[3.5px] text-gray-500">VP · {brand.name}</div></div><BrandLogo brand={brand} size="xs" color={p} /></div>),
    // 25 — Foot Slogan
    (<div><div className="text-[5px] font-bold">Jane Smith — Vice President · {brand.name}</div><div className="text-[3.5px] text-gray-500 mt-0.5">jane@{brand.name.toLowerCase()}.com · +1 234 56789</div><div className="text-[3.5px] italic mt-1" style={{color:p}}>— making things that last.</div></div>),
    // 26 — Frosted
    (<div className="rounded p-1.5" style={{ background: `linear-gradient(120deg, ${p}22 0%, ${p}11 100%)` }}><div className="text-[5px] font-bold" style={{color:p}}>Jane Smith</div><div className="text-[3.5px] text-gray-700">VP · {brand.name}</div></div>),
    // 27 — Brand Banner
    (<div className="text-center"><div className="inline-block rounded-full px-2 py-0.5 text-white text-[3.5px] uppercase tracking-[0.22em]" style={{backgroundColor:p}}>{brand.name}</div><div className="text-[5px] font-bold mt-1">Jane Smith</div><div className="text-[3.5px] text-gray-500">vice president · jane@{brand.name.toLowerCase()}.com</div></div>),
    // 28 — Block Right
    (<div className="flex justify-between items-end"><div><div className="text-[5px] font-bold">Jane Smith</div><div className="text-[3.5px] text-gray-500">VP · {brand.name}</div></div><div className="rounded p-1 text-[3.5px] text-white" style={{backgroundColor:p}}>jane@{brand.name.toLowerCase()}.com</div></div>),
    // 29 — Magazine
    (<div className="border-y py-1" style={{borderColor:p}}><div className="text-[3.5px] uppercase tracking-[0.32em] text-gray-500">{brand.name} · index 014</div><div className="text-[7px] font-serif font-bold text-gray-900">Jane Smith</div><div className="text-[3.5px] text-gray-500">Vice President · jane@{brand.name.toLowerCase()}.com</div></div>),
  ];

  return <MailFrame>{sigs[templateIndex] ?? sigs[0]}</MailFrame>;
}

export const WEB_EMAIL_SIG_EXTENDED = Array.from({ length: 30 }, (_, i) => ({
  idSuffix: `ext-${i + 1}`,
  name: ['Classic','Border Left','Logo + Name','Stacked','Right Aligned','Mono','Brand Strip','Italic Lux','Photo Avatar','Wide Brand','Underline','Table-like','Pill Tag','Big Name','Hand-Lettered','Ledger','Two-Column','Brand Bar','Initials Big','Quote','Centered','Color Block','Wide Border','Initial Stack','Logo Repeat','Slogan','Frosted','Banner','Block Right','Magazine'][i],
  category: 'Modern',
}));
