import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Envelope designs — landscape #10 envelope (~9.5" × 4"). Each
 * design shows the front face with return address, recipient
 * area, and stamp/postage corner. Brand color appears as flap,
 * border, or accent block.
 *
 *   0 Classic Return     5 Window Frame
 *   1 Brand Stripe       6 Stamp Heavy
 *   2 Top Flap           7 Diagonal Cut
 *   3 Mono Minimal       8 Editorial Index
 *   4 Wax Sealed         9 Vintage Airmail
 */
interface Props {
  brand: Brand;
  templateIndex: number;
}

function EnvelopeFrame({ children }: { children: React.ReactNode }) {
  // Landscape envelope ratio (9.5 × 4 ≈ 2.375). We compress
  // slightly to ~2.2 so it sits well in the cosmos tile (1.6:1).
  return (
    <div className="w-full h-full bg-[#E5E0D2] flex items-center justify-center p-[6%]">
      <div
        className="bg-[#FBF8EE] shadow-md relative overflow-hidden border border-[#D8D2C2]"
        style={{ width: '92%', aspectRatio: '2.2 / 1' }}
      >
        {children}
      </div>
    </div>
  );
}

export function EnvelopeExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;

  const designs = [
    // 0 — Classic Return. Return address top-left in brand color
    // box, recipient block centered, postage square top-right.
    (
      <EnvelopeFrame>
        <div className="absolute left-[3%] top-[8%] flex items-start gap-1.5">
          <div className="w-[10px] h-[10px] flex items-center justify-center" style={{ backgroundColor: p }}>
            <BrandLogo brand={brand} size="xs" color="#ffffff" />
          </div>
          <div className="text-[4px] leading-tight text-gray-700">
            <div className="font-semibold" style={{ color: p }}>{brand.name}</div>
            <div>1234 Studio St.</div>
            <div>NY · 10001</div>
          </div>
        </div>
        <div className="absolute right-[5%] top-[8%] w-[14px] h-[16px] border border-gray-400 flex items-center justify-center text-[3px] uppercase tracking-tight text-gray-600">postage</div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">To</div>
          <div className="text-[7px] font-serif text-gray-900 mt-1">Jane Smith</div>
          <div className="text-[4px] text-gray-600 mt-0.5">567 Recipient Ave · NY 10010</div>
        </div>
      </EnvelopeFrame>
    ),

    // 1 — Brand Stripe. Solid brand-color stripe runs the bottom
    // edge with logo + brand name; clean recipient zone above.
    (
      <EnvelopeFrame>
        <div className="absolute left-[5%] top-[12%] text-[4px] leading-tight text-gray-700">
          <div className="font-semibold uppercase tracking-[0.18em]" style={{ color: p }}>From</div>
          <div className="mt-0.5">{brand.name}</div>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-[7px] font-bold text-gray-900">Jane Smith</div>
          <div className="text-[4px] text-gray-600 mt-0.5">567 Recipient Ave</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[14%] flex items-center justify-between px-[4%]" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <span className="text-white text-[3.5px] uppercase tracking-[0.22em]">{brand.name.toLowerCase()}.com</span>
        </div>
      </EnvelopeFrame>
    ),

    // 2 — Top Flap. Brand color triangle peeks from the top — the
    // visual "flap" of the envelope.
    (
      <EnvelopeFrame>
        <div className="absolute inset-x-0 top-0 h-[40%]" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
        <div className="absolute left-[5%] bottom-[12%] text-[4px] leading-tight text-gray-700">
          <div className="font-semibold uppercase tracking-[0.18em]" style={{ color: p }}>Return</div>
          <div className="mt-0.5">{brand.name} · NY</div>
        </div>
        <div className="absolute right-[5%] bottom-[10%] text-right">
          <div className="text-[6px] font-serif text-gray-900">Jane Smith</div>
          <div className="text-[3.5px] text-gray-600">567 Ave · NY 10010</div>
        </div>
      </EnvelopeFrame>
    ),

    // 3 — Mono Minimal. Just typography. Brand-color hairline
    // separates return from recipient.
    (
      <EnvelopeFrame>
        <div className="absolute left-[5%] top-[14%] text-[4px] leading-[1.5] text-gray-700">
          <div className="uppercase tracking-[0.22em] text-[3.5px]" style={{ color: p }}>{brand.name}</div>
          <div>1234 Studio St.</div>
          <div>NY · 10001</div>
        </div>
        <div className="absolute left-[40%] top-[20%] bottom-[20%] w-[1px]" style={{ backgroundColor: p }} />
        <div className="absolute right-[5%] top-[26%] text-right text-[5px] text-gray-900">
          <div className="font-semibold">Jane Smith</div>
          <div className="text-[4px] text-gray-600 mt-0.5">567 Recipient Ave</div>
          <div className="text-[4px] text-gray-600">NY · 10010</div>
        </div>
      </EnvelopeFrame>
    ),

    // 4 — Wax Sealed. Wax-stamp seal at center-back where the flap
    // would close; stamps + addresses around it.
    (
      <EnvelopeFrame>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[26px] h-[26px] rounded-full flex items-center justify-center" style={{ background: `radial-gradient(circle at 30% 30%, ${p}EE, ${p} 60%, ${p}AA 100%)`, boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.18)' }}>
          <div className="text-white text-[10px] font-serif font-bold">{brand.name.charAt(0).toUpperCase()}</div>
        </div>
        <div className="absolute left-[4%] top-[10%] text-[3.5px] uppercase tracking-[0.22em] text-gray-600">{brand.name}</div>
        <div className="absolute right-[4%] top-[10%] text-[3.5px] uppercase tracking-[0.22em] text-gray-600">Sealed · 2026</div>
        <div className="absolute left-[4%] bottom-[10%] text-[3.5px] text-gray-700">From: {brand.name.toLowerCase()}.com</div>
        <div className="absolute right-[4%] bottom-[10%] text-[3.5px] text-gray-700">To: Jane Smith</div>
      </EnvelopeFrame>
    ),

    // 5 — Window Frame. Classic window-envelope feel — a
    // brand-color rectangular cutout reveals the recipient block.
    (
      <EnvelopeFrame>
        <div className="absolute left-[28%] right-[18%] top-[28%] bottom-[28%] border-2 flex items-center justify-center" style={{ borderColor: p, backgroundColor: '#fff' }}>
          <div className="text-center">
            <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">Window</div>
            <div className="text-[6px] font-bold text-gray-900 mt-0.5">Jane Smith</div>
            <div className="text-[3.5px] text-gray-600">567 Recipient Ave</div>
          </div>
        </div>
        <div className="absolute left-[4%] top-[14%]"><BrandLogo brand={brand} size="xs" /></div>
        <div className="absolute right-[4%] top-[14%] text-[3.5px] uppercase tracking-[0.22em] text-gray-600">{brand.name}</div>
      </EnvelopeFrame>
    ),

    // 6 — Stamp Heavy. Big bold brand-color "stamp" graphic
    // dominates the right; addresses cluster left.
    (
      <EnvelopeFrame>
        <div className="absolute right-[3%] top-[12%] bottom-[12%] w-[20%] flex flex-col" style={{ backgroundColor: p, color: '#fff' }}>
          <div className="flex-1 flex items-center justify-center">
            <BrandLogo brand={brand} size="sm" color="#ffffff" />
          </div>
          <div className="px-1 py-0.5 text-[3px] uppercase tracking-[0.22em] text-center border-t border-white/40">$2.50 · 2026</div>
        </div>
        <div className="absolute left-[4%] top-[10%] text-[4px] leading-tight text-gray-700">
          <div className="font-semibold uppercase" style={{ color: p }}>{brand.name}</div>
          <div>1234 Studio St.</div>
        </div>
        <div className="absolute left-[4%] bottom-[10%] text-[5px] text-gray-900">
          <div className="font-bold">Jane Smith</div>
          <div className="text-[4px] text-gray-600">567 Recipient Ave · NY 10010</div>
        </div>
      </EnvelopeFrame>
    ),

    // 7 — Diagonal Cut. A brand-color diagonal slices the envelope
    // into two zones; addresses sit on each.
    (
      <EnvelopeFrame>
        <div className="absolute inset-0" style={{ background: `linear-gradient(105deg, transparent 0%, transparent 38%, ${p} 38.5%, ${p} 41.5%, transparent 42%, transparent 100%)` }} />
        <div className="absolute left-[4%] top-[14%] text-[4px] leading-tight">
          <BrandLogo brand={brand} size="xs" />
          <div className="mt-1 text-gray-700">{brand.name} · NY</div>
        </div>
        <div className="absolute right-[4%] bottom-[14%] text-right text-[4px] text-gray-700">
          <div className="font-semibold text-gray-900 text-[6px]">Jane Smith</div>
          <div>567 Recipient Ave</div>
        </div>
      </EnvelopeFrame>
    ),

    // 8 — Editorial Index. N° corner badge, magazine masthead vibe.
    (
      <EnvelopeFrame>
        <div className="absolute left-[4%] top-[10%]">
          <div className="text-[12px] leading-none font-bold" style={{ color: p }}>N°<br/>014</div>
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-0.5">{brand.name}</div>
        </div>
        <div className="absolute right-[4%] top-[10%] text-right">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-0.5">Series A</div>
        </div>
        <div className="absolute right-[4%] bottom-[14%] text-right">
          <div className="text-[6px] font-serif font-semibold text-gray-900">Jane Smith</div>
          <div className="text-[4px] text-gray-600">567 Recipient Ave · NY 10010</div>
        </div>
      </EnvelopeFrame>
    ),

    // 9 — Vintage Airmail. Classic red+blue striped border feel,
    // recolored with brand. Par avion vibe.
    (
      <EnvelopeFrame>
        <div className="absolute inset-0 border-[5px]" style={{ borderImage: `repeating-linear-gradient(135deg, ${p} 0 4px, #fff 4px 8px, #1F2A48 8px 12px, #fff 12px 16px) 5` }} />
        <div className="absolute left-[6%] top-[14%] text-[4px] leading-tight">
          <div className="font-bold uppercase tracking-[0.22em]" style={{ color: p }}>Par Avion</div>
          <div className="mt-1 text-gray-700">{brand.name} · NY</div>
        </div>
        <div className="absolute right-[6%] bottom-[14%] text-right text-[4px] text-gray-700">
          <div className="font-bold text-gray-900 text-[6px]">Jane Smith</div>
          <div>567 Recipient Ave</div>
        </div>
      </EnvelopeFrame>
    ),

    // 10 — Centered Mark. Brand-color circular mark center-front,
    // addresses tucked at corners.
    (
      <EnvelopeFrame>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[20px] h-[20px] rounded-full flex items-center justify-center" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
        </div>
        <div className="absolute left-[4%] top-[8%] text-[3.5px] uppercase tracking-[0.22em] text-gray-600">{brand.name}</div>
        <div className="absolute right-[4%] bottom-[8%] text-right text-[3.5px] text-gray-700">Jane Smith · 567 Ave</div>
      </EnvelopeFrame>
    ),

    // 11 — Half Color. Right half is full brand color holding the
    // recipient address; left is white with the return.
    (
      <EnvelopeFrame>
        <div className="absolute right-0 top-0 bottom-0 w-1/2 flex flex-col justify-center px-[6%] text-white" style={{ backgroundColor: p }}>
          <div className="text-[3.5px] uppercase tracking-[0.22em] opacity-90">To</div>
          <div className="text-[6px] font-bold mt-0.5">Jane Smith</div>
          <div className="text-[3.5px] mt-0.5 opacity-90">567 Recipient Ave · NY 10010</div>
        </div>
        <div className="absolute left-[4%] top-[14%] text-[3.5px] text-gray-700">
          <BrandLogo brand={brand} size="xs" />
          <div className="mt-1">{brand.name}</div>
          <div>1234 Studio St.</div>
        </div>
      </EnvelopeFrame>
    ),

    // 12 — Sealed Sticker. A sticker-like brand seal sits dead-center
    // mimicking a closure label.
    (
      <EnvelopeFrame>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[28%] aspect-square flex items-center justify-center" style={{ backgroundColor: p, clipPath: 'polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)' }}>
          <div className="text-center text-white">
            <div className="text-[3.5px] uppercase tracking-[0.22em] opacity-80">sealed</div>
            <div className="text-[10px] font-serif font-bold leading-none mt-0.5">{brand.name.charAt(0).toUpperCase()}</div>
          </div>
        </div>
        <div className="absolute left-[4%] top-[10%] text-[3.5px] text-gray-700">{brand.name}</div>
        <div className="absolute right-[4%] bottom-[10%] text-right text-[3.5px] text-gray-700">Jane Smith</div>
      </EnvelopeFrame>
    ),

    // 13 — Tracked Bar. A brand-color "tracking strip" runs across
    // the bottom carrying barcode-like ticks.
    (
      <EnvelopeFrame>
        <div className="absolute inset-x-0 bottom-[4%] h-[12%] flex items-center justify-between px-[3%]" style={{ backgroundColor: p }}>
          <div className="flex items-center gap-[2px]">
            {Array.from({ length: 26 }).map((_, i) => (
              <div key={i} className="w-[1.5px] bg-white" style={{ height: `${50 + ((i * 13) % 50)}%` }} />
            ))}
          </div>
          <div className="text-white text-[3px] uppercase tracking-[0.22em]">{brand.name.toLowerCase()}.com</div>
        </div>
        <div className="absolute left-[4%] top-[12%] text-[3.5px] text-gray-700">
          <div className="font-semibold uppercase" style={{ color: p }}>{brand.name}</div>
          <div>1234 Studio St.</div>
        </div>
        <div className="absolute right-[4%] top-[12%] text-right text-[5px] text-gray-900">
          <div className="font-bold">Jane Smith</div>
        </div>
      </EnvelopeFrame>
    ),

    // 14 — Brand Wash. Pastel brand wash entire envelope; type
    // sits clean on top in white.
    (
      <EnvelopeFrame>
        <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${p} 0%, ${p}DD 100%)` }} />
        <div className="absolute left-[4%] top-[12%] text-white">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-[3.5px] uppercase tracking-[0.22em] mt-0.5 opacity-90">{brand.name}</div>
        </div>
        <div className="absolute right-[4%] bottom-[12%] text-right text-white">
          <div className="text-[7px] font-bold">Jane Smith</div>
          <div className="text-[3.5px] mt-0.5 opacity-90">567 Recipient Ave</div>
        </div>
      </EnvelopeFrame>
    ),

    // 15 — Postage Square. Big postage square in brand color
    // takes the upper-right; clean addresses below.
    (
      <EnvelopeFrame>
        <div className="absolute right-[4%] top-[8%] w-[24%] aspect-square flex flex-col items-center justify-center" style={{ background: p, color: '#fff' }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-[3px] uppercase tracking-[0.22em] mt-0.5">$2.50</div>
          <div className="text-[3px] uppercase tracking-[0.22em] opacity-80">2026</div>
        </div>
        <div className="absolute left-[4%] top-[12%] text-[3.5px] text-gray-700">
          <div className="font-semibold uppercase" style={{ color: p }}>{brand.name}</div>
          <div>1234 Studio St. · NY</div>
        </div>
        <div className="absolute left-[4%] bottom-[12%] text-[5px] text-gray-900">
          <div className="font-bold">Jane Smith</div>
          <div className="text-[3.5px] text-gray-600">567 Recipient Ave</div>
        </div>
      </EnvelopeFrame>
    ),

    // 16 — Triangle Flap. Inverted brand-color triangle peeks from
    // the bottom — like a back flap.
    (
      <EnvelopeFrame>
        <div className="absolute inset-x-0 bottom-0 h-[55%]" style={{ background: p, clipPath: 'polygon(0 100%, 50% 0, 100% 100%)', opacity: 0.18 }} />
        <div className="absolute inset-x-0 bottom-0 h-[14%] flex items-center justify-between px-[4%] text-white text-[3.5px] uppercase tracking-[0.22em]" style={{ backgroundColor: p }}>
          <span>{brand.name}</span><span>{brand.name.toLowerCase()}.com</span>
        </div>
        <div className="absolute left-[4%] top-[14%]"><BrandLogo brand={brand} size="xs" /></div>
        <div className="absolute right-[4%] top-[24%] text-right text-[5px] text-gray-900"><span className="font-bold">Jane Smith</span></div>
      </EnvelopeFrame>
    ),

    // 17 — Type Stack. Brand name stacked vertically in the corner,
    // hand-printed feel.
    (
      <EnvelopeFrame>
        <div className="absolute left-[4%] top-[10%] flex flex-col text-[6px] font-black leading-[0.9] uppercase" style={{ color: p }}>
          {brand.name.split('').map((c, i) => <span key={i}>{c}</span>)}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">— for —</div>
          <div className="text-[6px] font-serif text-gray-900 mt-0.5">Jane Smith</div>
          <div className="text-[3.5px] text-gray-600">567 Ave · NY</div>
        </div>
      </EnvelopeFrame>
    ),

    // 18 — Brand Tape. A tilted "tape strip" of brand color crosses
    // the envelope diagonally.
    (
      <EnvelopeFrame>
        <div className="absolute -inset-x-2 top-1/2 -translate-y-1/2 h-[18%] -rotate-6 flex items-center justify-center text-white text-[3.5px] uppercase tracking-[0.32em]" style={{ backgroundColor: p, opacity: 0.92 }}>
          {brand.name.toUpperCase()} · TO Jane Smith · 567 RECIPIENT AVE
        </div>
        <div className="absolute left-[4%] top-[10%]"><BrandLogo brand={brand} size="xs" /></div>
        <div className="absolute right-[4%] bottom-[10%] text-right text-[3.5px] text-gray-600">postage paid · 2026</div>
      </EnvelopeFrame>
    ),

    // 19 — Bordered Modern. Brand-color thick border with notched
    // corners — modern artistic frame.
    (
      <EnvelopeFrame>
        <div className="absolute inset-[5%] border-2" style={{ borderColor: p }} />
        <div className="absolute left-[2%] top-[2%] w-[16px] h-[16px] bg-[#FBF8EE]" />
        <div className="absolute right-[2%] bottom-[2%] w-[16px] h-[16px] bg-[#FBF8EE]" />
        <div className="absolute left-[10%] top-[14%] text-[3.5px] text-gray-700">
          <div className="font-semibold uppercase" style={{ color: p }}>From {brand.name}</div>
        </div>
        <div className="absolute right-[10%] bottom-[14%] text-right text-[3.5px] text-gray-700">
          <div className="font-bold text-gray-900 text-[6px]">Jane Smith</div>
          <div>567 Recipient Ave</div>
        </div>
      </EnvelopeFrame>
    ),

    // 20 — Big Initial Block. Massive brand-color initial fills
    // the left third.
    (
      <EnvelopeFrame>
        <div className="absolute left-0 top-0 bottom-0 w-[36%] flex items-center justify-center" style={{ backgroundColor: p }}>
          <div className="text-white text-[36px] font-serif font-bold leading-none">{brand.name.charAt(0).toUpperCase()}</div>
        </div>
        <div className="absolute left-[40%] top-[14%] text-[3.5px] uppercase tracking-[0.22em] text-gray-600">{brand.name}</div>
        <div className="absolute left-[40%] bottom-[14%] text-[5px] text-gray-900">
          <div className="font-bold">Jane Smith</div>
          <div className="text-[3.5px] text-gray-600">567 Recipient Ave · NY 10010</div>
        </div>
      </EnvelopeFrame>
    ),

    // 21 — Hand-Drawn Outline. Hand-traced brand-color border
    // with playful dashes; informal greeting card vibe.
    (
      <EnvelopeFrame>
        <div className="absolute inset-[6%] border-2 border-dashed rounded-md" style={{ borderColor: p }} />
        <div className="absolute left-[10%] top-[18%] text-[3.5px] text-gray-700">
          <div className="font-semibold" style={{ color: p, fontFamily: 'Caveat, cursive', fontSize: '9px' }}>{brand.name}</div>
        </div>
        <div className="absolute right-[10%] bottom-[18%] text-right text-[3.5px] text-gray-700">
          <div className="text-[8px]" style={{ fontFamily: 'Caveat, cursive', color: '#0F1216' }}>Jane Smith</div>
          <div>— with love</div>
        </div>
      </EnvelopeFrame>
    ),

    // 22 — Stripes. Repeating thin brand stripes in upper-right
    // corner — a postage-zone marker.
    (
      <EnvelopeFrame>
        <div className="absolute right-[4%] top-[8%] w-[26%] h-[14%]" style={{ background: `repeating-linear-gradient(45deg, ${p} 0 4px, transparent 4px 8px)` }} />
        <div className="absolute left-[4%] top-[12%] text-[3.5px] text-gray-700">
          <BrandLogo brand={brand} size="xs" />
          <div className="mt-1 font-semibold uppercase" style={{ color: p }}>{brand.name}</div>
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-[7px] font-bold text-gray-900">Jane Smith</div>
          <div className="text-[3.5px] text-gray-600">567 Recipient Ave · NY</div>
        </div>
      </EnvelopeFrame>
    ),

    // 23 — Embossed Initial. Inset brand-color initial bottom-right.
    (
      <EnvelopeFrame>
        <div className="absolute right-[4%] bottom-[6%] text-[36px] font-serif font-black leading-none" style={{ color: '#FBF8EE', WebkitTextStroke: `1px ${p}` }}>{brand.name.charAt(0).toUpperCase()}</div>
        <div className="absolute left-[4%] top-[14%] text-[3.5px] text-gray-700">
          <div className="font-semibold uppercase" style={{ color: p }}>{brand.name}</div>
          <div>1234 Studio St.</div>
        </div>
        <div className="absolute left-[4%] bottom-[14%] text-[5px] text-gray-900">
          <div className="font-bold">Jane Smith</div>
        </div>
      </EnvelopeFrame>
    ),

    // 24 — Two Colors. Brand color on top half, neutral charcoal
    // on bottom — bold split.
    (
      <EnvelopeFrame>
        <div className="absolute inset-x-0 top-0 h-1/2" style={{ backgroundColor: p }} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[#1A1F22]" />
        <div className="absolute left-[4%] top-[12%] text-white">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
        </div>
        <div className="absolute left-[4%] bottom-[12%] text-white">
          <div className="text-[6px] font-bold">Jane Smith</div>
          <div className="text-[3.5px] opacity-80">567 Recipient Ave</div>
        </div>
        <div className="absolute right-[4%] top-[12%] text-right text-white text-[3.5px] uppercase tracking-[0.22em]">{brand.name}</div>
        <div className="absolute right-[4%] bottom-[12%] text-right text-white text-[3.5px] uppercase tracking-[0.22em] opacity-80">{brand.name.toLowerCase()}.com</div>
      </EnvelopeFrame>
    ),

    // 25 — Ticket Edge. Half-circle perforations along the left
    // edge — like a tear-off ticket.
    (
      <EnvelopeFrame>
        <div className="absolute left-0 top-0 bottom-0 w-[2px] flex flex-col justify-around">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-[5px] h-[5px] rounded-full bg-[#E5E0D2] -ml-[2px]" />)}
        </div>
        <div className="absolute left-[6%] top-[14%]"><BrandLogo brand={brand} size="xs" /></div>
        <div className="absolute right-[4%] top-1/2 -translate-y-1/2 text-right">
          <div className="text-[7px] font-bold text-gray-900">Jane Smith</div>
          <div className="text-[3.5px] text-gray-600 mt-0.5">567 Recipient Ave</div>
          <div className="text-[3.5px] mt-0.5" style={{ color: p }}>{brand.name}</div>
        </div>
      </EnvelopeFrame>
    ),

    // 26 — Mono Address Block. Crisp typewriter-style address block
    // centered, brand color underline.
    (
      <EnvelopeFrame>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center font-mono text-[4px] leading-tight text-gray-700">
          <div>JANE SMITH</div>
          <div>567 RECIPIENT AVE</div>
          <div>NEW YORK · NY 10010</div>
          <div className="w-full h-[1px] mt-1" style={{ backgroundColor: p }} />
          <div className="mt-1" style={{ color: p }}>VIA {brand.name.toUpperCase()}</div>
        </div>
        <div className="absolute right-[4%] top-[8%] w-[14px] h-[16px] border border-gray-400" />
      </EnvelopeFrame>
    ),

    // 27 — Centered Logo Big. Single oversized brand mark front
    // and center; thin contact below.
    (
      <EnvelopeFrame>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <BrandLogo brand={brand} size="lg" color={p} />
          <div className="text-[3.5px] uppercase tracking-[0.32em] text-gray-600 mt-2">{brand.name}</div>
        </div>
        <div className="absolute inset-x-0 bottom-[4%] text-center text-[3px] uppercase tracking-[0.22em] text-gray-500">to: jane smith · 567 ave</div>
      </EnvelopeFrame>
    ),

    // 28 — Mosaic Backdrop. Tiled brand-color squares form a
    // textured backdrop; type sits over a clean white card.
    (
      <EnvelopeFrame>
        <div className="absolute inset-0 grid" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
          {Array.from({ length: 60 }).map((_, i) => (
            <div key={i} style={{ background: i % 4 === 0 ? p : `${p}11`, aspectRatio: '1' }} />
          ))}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 py-2 shadow-md">
          <div className="text-[6px] font-bold text-gray-900">Jane Smith</div>
          <div className="text-[3.5px] text-gray-600">— from {brand.name}</div>
        </div>
      </EnvelopeFrame>
    ),

    // 29 — Subtle Lux. Cream stock with a thin brand-color foil
    // accent and serif type.
    (
      <EnvelopeFrame>
        <div className="absolute inset-0 bg-gradient-to-br from-[#FBF8EE] to-[#F0EBDC]" />
        <div className="absolute inset-x-[6%] top-[18%] h-[1px]" style={{ background: `linear-gradient(90deg, transparent 0%, ${p} 50%, transparent 100%)` }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-[3.5px] uppercase tracking-[0.32em]" style={{ color: p }}>{brand.name}</div>
          <div className="text-[10px] font-serif italic text-gray-900 mt-1">to Jane Smith</div>
          <div className="text-[3.5px] text-gray-600 mt-1">— with regards</div>
        </div>
      </EnvelopeFrame>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const ENVELOPE_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Classic Return', category: 'Minimalist' },
  { idSuffix: 'ext-2', name: 'Brand Stripe', category: 'Modern' },
  { idSuffix: 'ext-3', name: 'Top Flap', category: 'Bold' },
  { idSuffix: 'ext-4', name: 'Mono Minimal', category: 'Minimalist' },
  { idSuffix: 'ext-5', name: 'Wax Sealed', category: 'Lux' },
  { idSuffix: 'ext-6', name: 'Window Frame', category: 'Modern' },
  { idSuffix: 'ext-7', name: 'Stamp Heavy', category: 'Bold' },
  { idSuffix: 'ext-8', name: 'Diagonal Cut', category: 'Bold' },
  { idSuffix: 'ext-9', name: 'Editorial Index', category: 'Editorial' },
  { idSuffix: 'ext-10', name: 'Vintage Airmail', category: 'Vintage' },
  { idSuffix: 'ext-11', name: 'Centered Mark', category: 'Lux' },
  { idSuffix: 'ext-12', name: 'Half Color', category: 'Bold' },
  { idSuffix: 'ext-13', name: 'Sealed Sticker', category: 'Lux' },
  { idSuffix: 'ext-14', name: 'Tracked Bar', category: 'Modern' },
  { idSuffix: 'ext-15', name: 'Brand Wash', category: 'Bold' },
  { idSuffix: 'ext-16', name: 'Postage Square', category: 'Modern' },
  { idSuffix: 'ext-17', name: 'Triangle Flap', category: 'Bold' },
  { idSuffix: 'ext-18', name: 'Type Stack', category: 'Editorial' },
  { idSuffix: 'ext-19', name: 'Brand Tape', category: 'Bold' },
  { idSuffix: 'ext-20', name: 'Bordered Modern', category: 'Modern' },
  { idSuffix: 'ext-21', name: 'Big Initial', category: 'Bold' },
  { idSuffix: 'ext-22', name: 'Hand-Drawn', category: 'Vintage' },
  { idSuffix: 'ext-23', name: 'Stripes Corner', category: 'Modern' },
  { idSuffix: 'ext-24', name: 'Embossed Initial', category: 'Lux' },
  { idSuffix: 'ext-25', name: 'Two Colors', category: 'Bold' },
  { idSuffix: 'ext-26', name: 'Ticket Edge', category: 'Modern' },
  { idSuffix: 'ext-27', name: 'Mono Address', category: 'Minimalist' },
  { idSuffix: 'ext-28', name: 'Logo Big', category: 'Lux' },
  { idSuffix: 'ext-29', name: 'Mosaic', category: 'Modern' },
  { idSuffix: 'ext-30', name: 'Subtle Lux', category: 'Lux' },
] as const;
