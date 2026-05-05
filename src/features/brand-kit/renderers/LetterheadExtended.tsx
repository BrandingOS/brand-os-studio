import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Letterhead designs — distinct from business cards. Shows a
 * portrait page (A4-ish) centered inside the cosmos landscape tile,
 * with an editorial header / body / footer rhythm. Brand color
 * accents the header band, dividers, or footer signature.
 *
 * 10 designs in this first batch. We'll extend up to 30 in
 * subsequent passes, mirroring the business-cards approach.
 *
 *   0 Header Bar         5 Bottom Block
 *   1 Side Stripe        6 Centered Mark
 *   2 Editorial Index    7 Diagonal Header
 *   3 Minimalist Rule    8 Watermark
 *   4 Stamped Memo       9 Two-Column Modern
 */
interface Props {
  brand: Brand;
  templateIndex: number;
}

function PageFrame({ children }: { children: React.ReactNode }) {
  // Page-shaped white sheet centered in a soft beige background
  // so each letterhead reads as a printed document, not a card.
  return (
    <div className="w-full h-full bg-[#E8E4D8] flex items-center justify-center p-[3%]">
      <div
        className="bg-white shadow-lg relative overflow-hidden"
        style={{ width: '46%', aspectRatio: '8.5 / 11' }}
      >
        {children}
      </div>
    </div>
  );
}

function bodyLines(rows: number, color = '#D4D2CB') {
  return Array.from({ length: rows }).map((_, i) => (
    <div
      key={i}
      className="rounded-sm"
      style={{
        height: '2px',
        background: color,
        width: `${85 - (i % 4) * 8}%`,
      }}
    />
  ));
}

export function LetterheadExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;

  const designs = [
    // 0 — Header Bar. Solid brand-color header band; logo + brand
    // name on top, body text below, contact footer.
    (
      <PageFrame>
        <div className="absolute inset-x-0 top-0 h-[14%] flex items-center justify-between px-[6%]" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <span className="text-white text-[4.5px] uppercase tracking-[0.22em]">{brand.name}</span>
        </div>
        <div className="absolute inset-x-[8%] top-[20%] space-y-[2.5px]">
          {bodyLines(14)}
        </div>
        <div className="absolute inset-x-[8%] bottom-[5%] flex justify-between text-[3.5px] uppercase tracking-[0.18em] text-gray-500">
          <span>{brand.name.toLowerCase()}.com</span>
          <span>+1 234 56789</span>
        </div>
      </PageFrame>
    ),

    // 1 — Side Stripe. Vertical brand-color stripe down the left;
    // logo top-left in the stripe, contact rotated up the side.
    (
      <PageFrame>
        <div className="absolute left-0 top-0 bottom-0 w-[10%] flex flex-col justify-between items-center py-[6%]" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <span className="text-white text-[3.5px] uppercase tracking-[0.4em] origin-center [writing-mode:vertical-rl] rotate-180">{brand.name.toLowerCase()}.com</span>
        </div>
        <div className="absolute left-[16%] right-[6%] top-[10%]">
          <div className="text-[6px] font-serif font-semibold text-gray-900">Dear {brand.name},</div>
          <div className="space-y-[2.5px] mt-[6%]">{bodyLines(16)}</div>
        </div>
      </PageFrame>
    ),

    // 2 — Editorial Index. N° corner badge, body lines, signature.
    (
      <PageFrame>
        <div className="absolute left-[6%] top-[6%]">
          <div className="text-[18px] leading-none font-bold tabular-nums" style={{ color: p }}>N°<br/>014</div>
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-1">Memo · 2026</div>
        </div>
        <div className="absolute right-[6%] top-[6%] text-right">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-1">{brand.name}</div>
        </div>
        <div className="absolute inset-x-[8%] top-[34%] space-y-[2.5px]">{bodyLines(14)}</div>
        <div className="absolute right-[8%] bottom-[8%] text-right">
          <div className="text-[5px] font-serif italic text-gray-700">— Jane Smith</div>
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-0.5" style={{ color: p }}>Vice President</div>
        </div>
      </PageFrame>
    ),

    // 3 — Minimalist Rule. Tiny logo top-center, single brand-color
    // hairline divides header from body. Restrained, very swiss.
    (
      <PageFrame>
        <div className="absolute inset-x-[8%] top-[8%] flex flex-col items-center">
          <BrandLogo brand={brand} size="xs" />
          <div className="w-full h-[1.5px] mt-[4%]" style={{ backgroundColor: p }} />
        </div>
        <div className="absolute inset-x-[8%] top-[20%] space-y-[2.5px]">{bodyLines(18)}</div>
        <div className="absolute inset-x-[8%] bottom-[6%] flex items-center gap-[6px] text-[3px] uppercase tracking-[0.22em] text-gray-500">
          <span>{brand.name}</span><span style={{ color: p }}>·</span><span>{brand.name.toLowerCase()}.com</span>
        </div>
      </PageFrame>
    ),

    // 4 — Stamped Memo. Tilted "MEMO" stamp + ringed badge
    // in upper area. Body text wraps under.
    (
      <PageFrame>
        <div className="absolute -left-[2%] -top-[2%] w-[28%] aspect-square rounded-full border-2" style={{ borderColor: p }} />
        <div className="absolute right-[6%] top-[6%] -rotate-6 border-2 px-1 text-[5px] uppercase tracking-[0.22em] font-bold" style={{ borderColor: p, color: p }}>MEMO</div>
        <div className="absolute left-[12%] top-[10%]">
          <div className="text-[8px] font-serif font-semibold text-gray-900">{brand.name}</div>
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">Internal · 2026</div>
        </div>
        <div className="absolute inset-x-[8%] top-[32%] space-y-[2.5px]">{bodyLines(15)}</div>
        <div className="absolute inset-x-[8%] bottom-[6%] text-[3.5px] text-gray-500">cc: jane@{brand.name.toLowerCase()}.com</div>
      </PageFrame>
    ),

    // 5 — Bottom Block. Body lives at top; brand-color footer band
    // anchors the contact.
    (
      <PageFrame>
        <div className="absolute inset-x-[8%] top-[10%]">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[5px] font-serif font-semibold text-gray-900 mt-[2%]">Hello,</div>
          <div className="space-y-[2.5px] mt-[4%]">{bodyLines(14)}</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[18%] flex flex-col justify-center px-[6%] text-white" style={{ backgroundColor: p }}>
          <div className="text-[4.5px] uppercase tracking-[0.22em]">{brand.name}</div>
          <div className="text-[3.5px] mt-1 opacity-90">jane@{brand.name.toLowerCase()}.com · +1 234 56789 · {brand.name.toLowerCase()}.com</div>
        </div>
      </PageFrame>
    ),

    // 6 — Centered Mark. Big brand-mark watermark centered behind
    // body type. Subtle but heroic.
    (
      <PageFrame>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[64px] font-serif font-black opacity-10" style={{ color: p }}>{brand.name.charAt(0).toUpperCase()}</div>
        </div>
        <div className="absolute inset-x-[8%] top-[8%] flex justify-between items-center text-[3.5px] uppercase tracking-[0.22em] text-gray-500">
          <span>{brand.name}</span>
          <span>{brand.name.toLowerCase()}.com</span>
        </div>
        <div className="absolute inset-x-[10%] top-[20%] space-y-[2.5px] z-10 relative">{bodyLines(16)}</div>
      </PageFrame>
    ),

    // 7 — Diagonal Header. Brand-color triangle slices the upper
    // corner; text content sits clean below.
    (
      <PageFrame>
        <div className="absolute inset-x-0 top-0 h-[24%]" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 100%)' }} />
        <div className="absolute right-[6%] top-[6%] text-right">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-white text-[3.5px] uppercase tracking-[0.22em] mt-0.5">{brand.name}</div>
        </div>
        <div className="absolute inset-x-[8%] top-[30%] space-y-[2.5px]">{bodyLines(15)}</div>
        <div className="absolute right-[8%] bottom-[6%] text-right text-[3.5px] uppercase tracking-[0.22em] text-gray-500">— jane@{brand.name.toLowerCase()}.com</div>
      </PageFrame>
    ),

    // 8 — Watermark. Pale body text fades down with a faint diagonal
    // brand-color watermark. Editorial / archival feel.
    (
      <PageFrame>
        <div className="absolute inset-0 flex items-center justify-center -rotate-12">
          <div className="text-[14px] font-serif uppercase tracking-[0.6em] opacity-15" style={{ color: p }}>{brand.name}</div>
        </div>
        <div className="absolute inset-x-[8%] top-[8%] flex justify-between items-center">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">Archive · 2026</div>
        </div>
        <div className="absolute inset-x-[8%] top-[20%] space-y-[2.5px] relative z-10">{bodyLines(14)}</div>
      </PageFrame>
    ),

    // 9 — Two-Column Modern. Narrow left column with title/contact,
    // body in the wider right column. Magazine-style.
    (
      <PageFrame>
        <div className="absolute left-[6%] top-[8%] w-[24%] flex flex-col justify-between h-[84%]">
          <div>
            <BrandLogo brand={brand} size="xs" />
            <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-1">{brand.name}</div>
          </div>
          <div className="text-[3.5px] text-gray-700 leading-[1.6]">
            <div className="font-semibold" style={{ color: p }}>From</div>
            <div>Jane Smith</div>
            <div>Vice President</div>
            <div className="mt-1">jane@{brand.name.toLowerCase()}.com</div>
          </div>
        </div>
        <div className="absolute right-[6%] top-[8%] w-[58%]">
          <div className="text-[6px] font-serif font-semibold text-gray-900">Quarterly Update</div>
          <div className="space-y-[2.5px] mt-[4%]">{bodyLines(18)}</div>
        </div>
      </PageFrame>
    ),

    // 10 — Color Wash Top. Full-width pastel brand wash bands the
    // upper third; type sits clean below.
    (
      <PageFrame>
        <div className="absolute inset-x-0 top-0 h-[36%]" style={{ background: `linear-gradient(180deg, ${p}DD 0%, ${p}66 100%)` }} />
        <div className="absolute inset-x-[8%] top-[8%] flex justify-between items-start text-white">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-[3.5px] uppercase tracking-[0.22em]">Memo · 2026</div>
        </div>
        <div className="absolute inset-x-[8%] top-[40%] space-y-[2.5px]">{bodyLines(15)}</div>
        <div className="absolute inset-x-[8%] bottom-[6%] text-[3.5px] uppercase tracking-[0.22em] text-gray-500 flex justify-between">
          <span>{brand.name}</span><span>{brand.name.toLowerCase()}.com</span>
        </div>
      </PageFrame>
    ),

    // 11 — Bracketed Frame. Small brand-color L-brackets at each
    // corner frame an otherwise empty page.
    (
      <PageFrame>
        {[['top-[6%] left-[6%] border-t-2 border-l-2', ''], ['top-[6%] right-[6%] border-t-2 border-r-2', ''], ['bottom-[6%] left-[6%] border-b-2 border-l-2', ''], ['bottom-[6%] right-[6%] border-b-2 border-r-2', '']].map(([cls], i) => (
          <div key={i} className={`absolute w-[10%] h-[10%] ${cls}`} style={{ borderColor: p }} />
        ))}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <BrandLogo brand={brand} size="sm" />
          <div className="text-[5px] uppercase tracking-[0.32em] text-gray-600 mt-3">{brand.name}</div>
        </div>
      </PageFrame>
    ),

    // 12 — Numbered Sections. Sidebar of section numbers in brand
    // color; body text sits in the main column.
    (
      <PageFrame>
        <div className="absolute left-[4%] top-[10%] flex flex-col gap-2 text-[8px] font-bold tabular-nums" style={{ color: p }}>
          {['01', '02', '03', '04', '05'].map((n) => <span key={n}>{n}</span>)}
        </div>
        <div className="absolute left-[18%] right-[8%] top-[10%]">
          <div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">{brand.name} · Memo</div>
          <div className="space-y-[2.5px] mt-[6%]">{bodyLines(16)}</div>
        </div>
        <div className="absolute right-[8%] bottom-[6%] text-[3.5px] uppercase tracking-[0.22em] text-gray-500">— Jane Smith</div>
      </PageFrame>
    ),

    // 13 — Quote Frame. A stylised pull quote with brand-color
    // open-quote glyph dominates the upper third.
    (
      <PageFrame>
        <div className="absolute left-[6%] top-[6%] text-[40px] font-serif leading-none" style={{ color: p }}>"</div>
        <div className="absolute left-[20%] right-[8%] top-[14%]">
          <div className="text-[6px] font-serif italic text-gray-800 leading-[1.4]">A short, quiet message that sets the tone for everything that follows.</div>
          <div className="text-[3.5px] uppercase tracking-[0.22em] mt-2 text-gray-500" style={{ color: p }}>— {brand.name}</div>
        </div>
        <div className="absolute inset-x-[8%] top-[44%] space-y-[2.5px]">{bodyLines(13)}</div>
        <div className="absolute inset-x-[8%] bottom-[5%] text-[3.5px] uppercase tracking-[0.22em] text-gray-500 flex justify-between">
          <span>{brand.name.toLowerCase()}.com</span><span>+1 234 56789</span>
        </div>
      </PageFrame>
    ),

    // 14 — Grid Header. Tiny modular grid of brand-color squares
    // forms the masthead; body text follows below.
    (
      <PageFrame>
        <div className="absolute left-[6%] top-[6%] grid grid-cols-6 gap-[2px]">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="w-[6px] h-[6px]" style={{ backgroundColor: i % 3 === 0 ? p : `${p}33` }} />
          ))}
        </div>
        <div className="absolute right-[6%] top-[6%] text-right">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-1">{brand.name}</div>
        </div>
        <div className="absolute inset-x-[8%] top-[26%] space-y-[2.5px]">{bodyLines(17)}</div>
      </PageFrame>
    ),

    // 15 — Spotlight. A single brand-color circular spotlight in
    // the corner casts a soft gradient over the page.
    (
      <PageFrame>
        <div className="absolute -right-[10%] -top-[10%] w-[60%] aspect-square rounded-full" style={{ background: `radial-gradient(circle, ${p}AA 0%, transparent 70%)` }} />
        <div className="absolute left-[6%] top-[8%]">
          <BrandLogo brand={brand} size="xs" />
        </div>
        <div className="absolute inset-x-[8%] top-[28%] space-y-[2.5px]">{bodyLines(16)}</div>
        <div className="absolute right-[8%] bottom-[6%] text-right text-[3.5px] uppercase tracking-[0.22em] text-gray-500">— jane@{brand.name.toLowerCase()}.com</div>
      </PageFrame>
    ),

    // 16 — Mono Block. Heavy black header band with a small
    // brand-color accent line; body in clean serif.
    (
      <PageFrame>
        <div className="absolute inset-x-0 top-0 h-[12%] bg-[#0F1216] flex items-center justify-between px-[6%]">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <span className="text-white text-[3.5px] uppercase tracking-[0.22em]">{brand.name}</span>
        </div>
        <div className="absolute inset-x-0 top-[12%] h-[1px]" style={{ backgroundColor: p }} />
        <div className="absolute inset-x-[8%] top-[18%]">
          <div className="text-[6px] font-serif font-semibold text-gray-900">Letter of Introduction</div>
          <div className="space-y-[2.5px] mt-[4%]">{bodyLines(15)}</div>
        </div>
      </PageFrame>
    ),

    // 17 — Asymmetric Split. Page is split — upper-left filled
    // brand color, lower-right white. Type wraps on the diagonal.
    (
      <PageFrame>
        <div className="absolute inset-0" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
        <div className="absolute left-[8%] top-[8%] text-white">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] mt-1">{brand.name}</div>
        </div>
        <div className="absolute right-[8%] bottom-[18%] text-right">
          <div className="text-[6px] font-serif font-semibold text-gray-900">Greetings,</div>
          <div className="space-y-[2.5px] mt-[4%] text-right" style={{ width: '60%', marginLeft: 'auto' }}>{bodyLines(8)}</div>
        </div>
        <div className="absolute inset-x-[8%] bottom-[5%] text-[3.5px] uppercase tracking-[0.22em] text-gray-500 flex justify-between">
          <span>— Jane Smith</span><span>{brand.name.toLowerCase()}.com</span>
        </div>
      </PageFrame>
    ),

    // 18 — Stationery Header. Classic "letterhead" header — large
    // serif brand name, address line, hairline rule.
    (
      <PageFrame>
        <div className="absolute inset-x-[8%] top-[8%] text-center">
          <div className="text-[14px] font-serif font-bold tracking-tight" style={{ color: p }}>{brand.name}</div>
          <div className="text-[3.5px] uppercase tracking-[0.32em] mt-1 text-gray-500">a brand · est. 2026</div>
          <div className="w-full h-[1px] mt-2" style={{ backgroundColor: p }} />
        </div>
        <div className="absolute inset-x-[8%] top-[26%] space-y-[2.5px]">{bodyLines(16)}</div>
        <div className="absolute inset-x-[8%] bottom-[5%] text-center text-[3.5px] uppercase tracking-[0.22em] text-gray-500">+1 234 56789 · jane@{brand.name.toLowerCase()}.com · {brand.name.toLowerCase()}.com</div>
      </PageFrame>
    ),

    // 19 — Big Number Foreground. Massive faint brand-color "01"
    // sits behind body — like a chapter opening.
    (
      <PageFrame>
        <div className="absolute right-[2%] top-[2%] text-[80px] font-serif font-black leading-none opacity-15" style={{ color: p }}>01</div>
        <div className="absolute left-[6%] top-[10%]">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-1">Chapter</div>
        </div>
        <div className="absolute inset-x-[8%] top-[30%] space-y-[2.5px] z-10 relative">{bodyLines(15)}</div>
      </PageFrame>
    ),

    // 20 — Footer Heavy. Large brand-color footer block carries
    // the contact info; body lives clean above.
    (
      <PageFrame>
        <div className="absolute inset-x-[8%] top-[8%]">
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">{brand.name} Studio</div>
          <div className="text-[6px] font-serif font-semibold text-gray-900 mt-1">A Note,</div>
          <div className="space-y-[2.5px] mt-[4%]">{bodyLines(13)}</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[28%] flex flex-col justify-center px-[8%] text-white" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-[5px] uppercase tracking-[0.22em] mt-2 opacity-90">Jane Smith · Vice President</div>
          <div className="text-[3.5px] mt-1 opacity-80">jane@{brand.name.toLowerCase()}.com · +1 234 56789 · {brand.name.toLowerCase()}.com</div>
        </div>
      </PageFrame>
    ),

    // 21 — Typewriter Memo. Mono-spaced "TO/FROM/RE" memo header.
    (
      <PageFrame>
        <div className="absolute inset-x-[8%] top-[8%] font-mono text-[4px] leading-[1.6] text-gray-700">
          <div><span style={{ color: p }}>TO</span>     · {brand.name} Team</div>
          <div><span style={{ color: p }}>FROM</span>   · Jane Smith</div>
          <div><span style={{ color: p }}>RE</span>     · Quarterly Brief</div>
          <div><span style={{ color: p }}>DATE</span>   · 27 · 04 · 2026</div>
          <div className="w-full border-t border-dashed mt-2" style={{ borderColor: p }} />
        </div>
        <div className="absolute inset-x-[8%] top-[28%] space-y-[2.5px] font-mono">{bodyLines(15, '#C8C5BA')}</div>
        <div className="absolute right-[8%] bottom-[6%] text-[3.5px] font-mono text-gray-500">— END OF MEMO —</div>
      </PageFrame>
    ),

    // 22 — Color Bar Right. Vertical brand stripe down the right
    // edge with logo embedded vertically.
    (
      <PageFrame>
        <div className="absolute right-0 top-0 bottom-0 w-[8%] flex flex-col items-center justify-between py-[6%]" style={{ backgroundColor: p }}>
          <div className="text-white text-[3.5px] uppercase tracking-[0.4em] [writing-mode:vertical-rl]">Memo · 2026</div>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
        </div>
        <div className="absolute left-[6%] top-[8%]">
          <div className="text-[6px] font-serif font-semibold text-gray-900">Hello {brand.name}</div>
        </div>
        <div className="absolute inset-x-[6%] right-[14%] top-[20%] space-y-[2.5px]">{bodyLines(17)}</div>
      </PageFrame>
    ),

    // 23 — Stamped Date. A circular "date stamp" in brand color.
    (
      <PageFrame>
        <div className="absolute right-[6%] top-[6%] w-[20%] aspect-square rounded-full border-2 flex flex-col items-center justify-center -rotate-6" style={{ borderColor: p }}>
          <div className="text-[3.5px] uppercase tracking-[0.18em]" style={{ color: p }}>{brand.name}</div>
          <div className="text-[6px] font-bold tabular-nums" style={{ color: p }}>27 · 04 · 26</div>
          <div className="text-[3.5px] uppercase tracking-[0.18em]" style={{ color: p }}>memo</div>
        </div>
        <div className="absolute left-[6%] top-[8%]">
          <BrandLogo brand={brand} size="xs" />
        </div>
        <div className="absolute inset-x-[8%] top-[30%] space-y-[2.5px]">{bodyLines(15)}</div>
      </PageFrame>
    ),

    // 24 — Three-Dot Header. Three brand-color dots in a row above
    // the brand name — restrained signal of voice.
    (
      <PageFrame>
        <div className="absolute inset-x-[8%] top-[10%] flex flex-col items-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => <div key={i} className="w-[6px] h-[6px] rounded-full" style={{ backgroundColor: p, opacity: 0.4 + i * 0.3 }} />)}
          </div>
          <div className="text-[10px] font-serif font-semibold text-gray-900 mt-2">{brand.name}</div>
        </div>
        <div className="absolute inset-x-[10%] top-[30%] space-y-[2.5px]">{bodyLines(16)}</div>
        <div className="absolute inset-x-[8%] bottom-[6%] text-[3.5px] uppercase tracking-[0.22em] text-gray-500 text-center">{brand.name.toLowerCase()}.com</div>
      </PageFrame>
    ),

    // 25 — Side Folio. Slim folio tab on the left — like a folder
    // file label.
    (
      <PageFrame>
        <div className="absolute left-0 top-[20%] bottom-[20%] w-[14%] rounded-r-md flex flex-col items-start justify-end p-1.5" style={{ backgroundColor: p }}>
          <div className="text-white text-[3.5px] uppercase tracking-[0.32em] [writing-mode:vertical-rl] rotate-180 leading-tight">{brand.name} · folio</div>
        </div>
        <div className="absolute left-[20%] right-[8%] top-[10%]">
          <div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">Folio · 014</div>
          <div className="text-[6px] font-serif font-semibold text-gray-900 mt-0.5">An open letter</div>
          <div className="space-y-[2.5px] mt-[4%]">{bodyLines(15)}</div>
        </div>
      </PageFrame>
    ),

    // 26 — Brand Strip Footer. Footer is a thin brand-color strip
    // with all contact info on one line.
    (
      <PageFrame>
        <div className="absolute inset-x-[8%] top-[8%]">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[6px] font-serif font-semibold text-gray-900 mt-2">A Quick Note</div>
          <div className="space-y-[2.5px] mt-[4%]">{bodyLines(16)}</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[6%] flex items-center justify-between px-[8%] text-white text-[3px] uppercase tracking-[0.32em]" style={{ backgroundColor: p }}>
          <span>{brand.name}</span><span>jane@{brand.name.toLowerCase()}.com</span><span>+1 234 56789</span>
        </div>
      </PageFrame>
    ),

    // 27 — Half-Half. Page split horizontally — top half white with
    // logo + title, bottom half brand color with body text in white.
    (
      <PageFrame>
        <div className="absolute inset-x-0 top-0 h-1/2 flex flex-col items-center justify-center">
          <BrandLogo brand={brand} size="md" />
          <div className="text-[5px] uppercase tracking-[0.32em] mt-2" style={{ color: p }}>{brand.name}</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-1/2 flex flex-col justify-center px-[8%]" style={{ backgroundColor: p }}>
          <div className="space-y-[2.5px]">{bodyLines(12, 'rgba(255,255,255,0.4)')}</div>
          <div className="text-white text-[3.5px] uppercase tracking-[0.22em] mt-2 opacity-90">— jane@{brand.name.toLowerCase()}.com</div>
        </div>
      </PageFrame>
    ),

    // 28 — Ledger Lines. Faint ruled lines fill the page — like a
    // paper ledger; brand-color heading row at top.
    (
      <PageFrame>
        <div className="absolute inset-x-0 top-[8%] h-[5%] flex items-center px-[6%]" style={{ backgroundColor: p, color: '#fff' }}>
          <span className="text-[3.5px] uppercase tracking-[0.32em]">{brand.name} · Ledger · 2026</span>
        </div>
        {Array.from({ length: 22 }).map((_, i) => (
          <div key={i} className="absolute left-[6%] right-[6%] h-[1px] bg-[#E2DFD2]" style={{ top: `${18 + i * 3.5}%` }} />
        ))}
        <div className="absolute right-[6%] bottom-[6%] text-[3.5px] uppercase tracking-[0.22em] text-gray-500">— page 01 / 12</div>
      </PageFrame>
    ),

    // 29 — Initial Drop Cap. Big serif drop-cap brand-color initial
    // anchors body. Editorial / book-chapter feel.
    (
      <PageFrame>
        <div className="absolute left-[8%] top-[10%] text-[64px] font-serif font-black leading-[0.8]" style={{ color: p }}>{brand.name.charAt(0).toUpperCase()}</div>
        <div className="absolute right-[8%] top-[10%] text-right">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-1">{brand.name}</div>
        </div>
        <div className="absolute left-[28%] top-[18%] right-[8%] space-y-[2.5px]">{bodyLines(8)}</div>
        <div className="absolute inset-x-[8%] top-[44%] space-y-[2.5px]">{bodyLines(12)}</div>
        <div className="absolute right-[8%] bottom-[6%] text-[3.5px] uppercase tracking-[0.22em] text-gray-500">— Jane Smith</div>
      </PageFrame>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const LETTERHEAD_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Header Bar', category: 'Modern' },
  { idSuffix: 'ext-2', name: 'Side Stripe', category: 'Modern' },
  { idSuffix: 'ext-3', name: 'Editorial Index', category: 'Editorial' },
  { idSuffix: 'ext-4', name: 'Minimalist Rule', category: 'Minimalist' },
  { idSuffix: 'ext-5', name: 'Stamped Memo', category: 'Vintage' },
  { idSuffix: 'ext-6', name: 'Bottom Block', category: 'Modern' },
  { idSuffix: 'ext-7', name: 'Centered Mark', category: 'Lux' },
  { idSuffix: 'ext-8', name: 'Diagonal Header', category: 'Bold' },
  { idSuffix: 'ext-9', name: 'Watermark', category: 'Editorial' },
  { idSuffix: 'ext-10', name: 'Two-Column', category: 'Editorial' },
  { idSuffix: 'ext-11', name: 'Color Wash', category: 'Modern' },
  { idSuffix: 'ext-12', name: 'Bracket Frame', category: 'Minimalist' },
  { idSuffix: 'ext-13', name: 'Numbered Sections', category: 'Editorial' },
  { idSuffix: 'ext-14', name: 'Quote Frame', category: 'Editorial' },
  { idSuffix: 'ext-15', name: 'Grid Header', category: 'Modern' },
  { idSuffix: 'ext-16', name: 'Spotlight', category: 'Modern' },
  { idSuffix: 'ext-17', name: 'Mono Block', category: 'Bold' },
  { idSuffix: 'ext-18', name: 'Asymmetric Split', category: 'Bold' },
  { idSuffix: 'ext-19', name: 'Stationery Header', category: 'Lux' },
  { idSuffix: 'ext-20', name: 'Drop Number', category: 'Editorial' },
  { idSuffix: 'ext-21', name: 'Footer Heavy', category: 'Bold' },
  { idSuffix: 'ext-22', name: 'Typewriter Memo', category: 'Vintage' },
  { idSuffix: 'ext-23', name: 'Color Bar Right', category: 'Modern' },
  { idSuffix: 'ext-24', name: 'Stamped Date', category: 'Vintage' },
  { idSuffix: 'ext-25', name: 'Three-Dot', category: 'Minimalist' },
  { idSuffix: 'ext-26', name: 'Side Folio', category: 'Modern' },
  { idSuffix: 'ext-27', name: 'Brand Strip', category: 'Modern' },
  { idSuffix: 'ext-28', name: 'Half-Half', category: 'Bold' },
  { idSuffix: 'ext-29', name: 'Ledger Lines', category: 'Vintage' },
  { idSuffix: 'ext-30', name: 'Drop Cap', category: 'Editorial' },
] as const;
