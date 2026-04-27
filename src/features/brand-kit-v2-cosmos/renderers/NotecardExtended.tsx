import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Notecard designs — folded greeting / thank-you card. Each design
 * shows the front face of a folded card (roughly 5.5" × 4.25") with
 * a small mono message on the inside hinted at the side fold edge.
 *
 *   0 Centered Mark      5 Brand Glow
 *   1 Type Splash        6 Half Tone
 *   2 Color Block        7 Folded Edge
 *   3 Floral Frame       8 Hand-Drawn
 *   4 Embossed Initial   9 Postcard Stripe
 */
interface Props {
  brand: Brand;
  templateIndex: number;
}

function CardFrame({ children, accent }: { children: React.ReactNode; accent?: string }) {
  // Folded card: front face on the left half, inside hint on the
  // right (lighter background to suggest the card is opened in
  // preview). Aspect ~5.5/4.25 → 1.3 (squarer than business cards).
  return (
    <div className="w-full h-full bg-[#EFE9DA] flex items-center justify-center p-[6%]">
      <div className="flex shadow-md" style={{ width: '78%', aspectRatio: '1.6 / 1' }}>
        <div className="w-1/2 h-full relative overflow-hidden bg-white">
          {children}
        </div>
        <div className="w-1/2 h-full relative bg-[#FBF8EE] flex items-center justify-center overflow-hidden">
          <div className="text-[5px] italic text-gray-400 -rotate-3" style={{ color: accent }}>— inside —</div>
        </div>
      </div>
    </div>
  );
}

export function NotecardExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();

  const designs = [
    // 0 — Centered Mark. Big serif initial centered, tiny brand
    // name underneath. Elegant.
    (
      <CardFrame>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[44px] font-serif font-bold leading-none" style={{ color: p }}>{init}</div>
          <div className="text-[4.5px] uppercase tracking-[0.3em] text-gray-500 mt-2">{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 1 — Type Splash. Bold "thanks" or "hello" splashed across in
    // brand color, with brand mark anchoring the bottom corner.
    (
      <CardFrame>
        <div className="absolute inset-0 flex flex-col items-start justify-center px-[8%]">
          <div className="text-[20px] font-serif italic font-bold leading-none" style={{ color: p }}>thank<br/>you.</div>
        </div>
        <div className="absolute right-[6%] bottom-[6%] flex items-center gap-1">
          <BrandLogo brand={brand} size="xs" />
          <span className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">{brand.name}</span>
        </div>
      </CardFrame>
    ),

    // 2 — Color Block. Front is split into two horizontal blocks —
    // brand color on top, white below with a small mark.
    (
      <CardFrame>
        <div className="absolute inset-x-0 top-0 h-[60%] flex items-end justify-center pb-3" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="md" color="#ffffff" />
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[40%] flex items-center justify-center">
          <div className="text-center">
            <div className="text-[5px] uppercase tracking-[0.3em] text-gray-500">— With —</div>
            <div className="text-[8px] font-serif italic text-gray-900 mt-1">gratitude</div>
          </div>
        </div>
      </CardFrame>
    ),

    // 3 — Floral Frame. Decorative scalloped border in brand color,
    // small mark centered.
    (
      <CardFrame>
        <div className="absolute inset-[6%] border-2 rounded-[40%/24%]" style={{ borderColor: p }} />
        <div className="absolute inset-[10%] border rounded-[40%/24%]" style={{ borderColor: `${p}55` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <BrandLogo brand={brand} size="sm" />
          <div className="text-[5px] uppercase tracking-[0.3em] mt-2" style={{ color: p }}>{brand.name}</div>
          <div className="text-[4px] italic text-gray-500 mt-0.5">est. 2026</div>
        </div>
      </CardFrame>
    ),

    // 4 — Embossed Initial. Pressed-in initial — soft inset shadow
    // mimics deboss on cardstock.
    (
      <CardFrame>
        <div className="absolute inset-0 flex items-center justify-center bg-[#FAF6EE]">
          <div className="text-[60px] font-serif font-black leading-none" style={{ color: '#fff', textShadow: `inset 0 2px 0 rgba(0,0,0,0.05)`, WebkitTextStroke: `1.5px ${p}55`, filter: `drop-shadow(0 1px 0 ${p}33) drop-shadow(0 -1px 0 #fff)` }}>{init}</div>
        </div>
        <div className="absolute inset-x-0 bottom-[8%] text-center text-[3.5px] uppercase tracking-[0.32em] text-gray-500">{brand.name}</div>
      </CardFrame>
    ),

    // 5 — Brand Glow. Soft radial brand-color glow with a small
    // mark centered. Modern + dreamy.
    (
      <CardFrame>
        <div className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 50% 50%, ${p}66 0%, transparent 70%)` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <BrandLogo brand={brand} size="md" />
          <div className="text-[4px] uppercase tracking-[0.32em] text-gray-700 mt-2">{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 6 — Half Tone. Halftone-dot wash sets a textured warm
    // backdrop; clean type sits on top.
    (
      <CardFrame>
        <div className="absolute inset-0" style={{ background: `linear-gradient(160deg, ${p}DD 0%, ${p}55 100%)` }} />
        <div className="absolute inset-0 mix-blend-multiply opacity-60" style={{ backgroundImage: `radial-gradient(circle, #111 0.6px, transparent 0.7px)`, backgroundSize: '4px 4px' }} />
        <div className="relative w-full h-full flex flex-col items-center justify-center text-white">
          <div className="text-[4px] uppercase tracking-[0.3em] opacity-80">a card from</div>
          <div className="text-[14px] font-serif font-bold mt-1">{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 7 — Folded Edge. Visible "fold crease" line down the right
    // edge with a small mark, evoking a folded card open just a
    // bit.
    (
      <CardFrame accent={p}>
        <div className="absolute inset-y-0 right-0 w-[3px]" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p}66 100%)` }} />
        <div className="absolute left-[8%] top-[10%]">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3.5px] uppercase tracking-[0.3em] text-gray-500 mt-1">{brand.name}</div>
        </div>
        <div className="absolute left-[8%] bottom-[10%]">
          <div className="text-[8px] font-serif text-gray-900">Hello,</div>
          <div className="text-[3.5px] text-gray-600 mt-0.5">— a small note —</div>
        </div>
      </CardFrame>
    ),

    // 8 — Hand-Drawn. Sketched border + handwritten-style accent.
    (
      <CardFrame>
        <div className="absolute inset-[6%] border-2 border-dashed rounded-md" style={{ borderColor: `${p}AA` }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[14px] leading-none italic" style={{ color: p, fontFamily: 'Caveat, cursive' }}>hello,</div>
          <div className="text-[5px] uppercase tracking-[0.3em] text-gray-500 mt-2">— from —</div>
          <div className="text-[6px] font-serif italic text-gray-900 mt-0.5">{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 9 — Postcard Stripe. Horizontal address-style stripe in
    // brand color cuts the bottom; logo top-left.
    (
      <CardFrame>
        <div className="absolute left-[8%] top-[10%]">
          <BrandLogo brand={brand} size="xs" />
        </div>
        <div className="absolute left-[8%] right-[8%] top-1/2 -translate-y-1/2">
          <div className="text-[7px] font-serif text-gray-900 italic">a small thanks,</div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[18%] flex items-center px-[8%] text-white" style={{ backgroundColor: p }}>
          <div className="text-[3.5px] uppercase tracking-[0.3em]">{brand.name.toLowerCase()}.com · est. 2026</div>
        </div>
      </CardFrame>
    ),

    // 10 — Big Period. A single oversized brand-color dot acts as
    // visual anchor; a quiet "."
    (
      <CardFrame>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] aspect-square rounded-full" style={{ backgroundColor: p }} />
        <div className="absolute inset-x-0 bottom-[12%] text-center text-[3.5px] uppercase tracking-[0.32em] text-gray-600">{brand.name}</div>
      </CardFrame>
    ),

    // 11 — Diagonal Stripe. Bold brand-color diagonal cuts across.
    (
      <CardFrame>
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p} 0%, ${p} 50%, transparent 50.5%, transparent 100%)` }} />
        <div className="absolute left-[8%] top-[10%] text-white">
          <div className="text-[5px] uppercase tracking-[0.3em]">{brand.name}</div>
        </div>
        <div className="absolute right-[8%] bottom-[10%] text-right text-gray-700">
          <div className="text-[8px] font-serif italic">cheers,</div>
        </div>
      </CardFrame>
    ),

    // 12 — Stripes Pattern. Repeating brand stripes covering the
    // full front; small label sticker on top.
    (
      <CardFrame>
        <div className="absolute inset-0" style={{ background: `repeating-linear-gradient(90deg, ${p} 0 8px, #fff 8px 16px)` }} />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-1 shadow-md">
          <div className="text-[3.5px] uppercase tracking-[0.3em] text-center" style={{ color: p }}>{brand.name}</div>
          <div className="text-[5px] font-serif text-gray-900">— a note —</div>
        </div>
      </CardFrame>
    ),

    // 13 — Confetti. Small dots scattered as confetti on cream.
    (
      <CardFrame>
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{ width: '4px', height: '4px', backgroundColor: i % 3 === 0 ? p : i % 3 === 1 ? '#0F1216' : '#D4D2CB', left: `${(i * 17) % 90 + 5}%`, top: `${(i * 23) % 80 + 10}%` }} />
        ))}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <BrandLogo brand={brand} size="sm" />
          <div className="text-[5px] uppercase tracking-[0.32em] mt-1" style={{ color: p }}>celebrate</div>
        </div>
      </CardFrame>
    ),

    // 14 — Window Cut. A circular brand-color "window" reveals
    // initial; rest is white.
    (
      <CardFrame>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[55%] aspect-square rounded-full flex items-center justify-center" style={{ backgroundColor: p }}>
          <div className="text-white text-[36px] font-serif font-black leading-none">{init}</div>
        </div>
        <div className="absolute inset-x-0 bottom-[8%] text-center text-[3.5px] uppercase tracking-[0.32em] text-gray-600">— for you —</div>
      </CardFrame>
    ),

    // 15 — Folded Banner. A "ribbon banner" carries a greeting.
    (
      <CardFrame>
        <div className="absolute inset-x-[4%] top-[40%] h-[18%] flex items-center justify-center" style={{ backgroundColor: p, boxShadow: '0 2px 4px rgba(0,0,0,0.08)' }}>
          <div className="text-white text-[8px] font-serif italic font-bold">— hello —</div>
        </div>
        <div className="absolute right-[10%] bottom-[10%] text-right text-[3.5px] uppercase tracking-[0.22em] text-gray-500">{brand.name}</div>
      </CardFrame>
    ),

    // 16 — Color Swatch Grid. 3×3 grid of brand color shades like
    // a paint chip card.
    (
      <CardFrame>
        <div className="absolute inset-[6%] grid grid-cols-3 grid-rows-3 gap-[2px]">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} style={{ backgroundColor: p, opacity: 0.3 + (i / 12) }} />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-[6%] text-center text-[3.5px] uppercase tracking-[0.3em] text-gray-600">{brand.name} · palette</div>
      </CardFrame>
    ),

    // 17 — Big Quote. A single oversized typographic quote mark.
    (
      <CardFrame>
        <div className="absolute left-[5%] top-[2%] text-[60px] font-serif leading-none" style={{ color: p }}>"</div>
        <div className="absolute right-[8%] bottom-[10%] text-right">
          <div className="text-[6px] font-serif italic text-gray-900">— a small reminder</div>
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500 mt-0.5">{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 18 — Round Frame. Soft round vignette in brand color
    // surrounding small mark.
    (
      <CardFrame>
        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at 50% 50%, transparent 30%, ${p}AA 70%, ${p} 100%)` }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white rounded-full w-[60%] aspect-square flex items-center justify-center">
            <div className="text-center">
              <BrandLogo brand={brand} size="sm" />
              <div className="text-[3.5px] uppercase tracking-[0.32em] mt-1" style={{ color: p }}>{brand.name}</div>
            </div>
          </div>
        </div>
      </CardFrame>
    ),

    // 19 — Letter Stack. Stacked letterforms that spell the brand
    // initial in different weights.
    (
      <CardFrame>
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          <div className="text-[36px] font-black leading-none" style={{ color: `${p}33` }}>{init}</div>
          <div className="text-[36px] font-bold leading-none" style={{ color: `${p}66` }}>{init}</div>
          <div className="text-[36px] font-medium leading-none" style={{ color: p }}>{init}</div>
        </div>
        <div className="absolute inset-x-0 bottom-[8%] text-center text-[3.5px] uppercase tracking-[0.32em] text-gray-600">{brand.name}</div>
      </CardFrame>
    ),

    // 20 — Calendar Day. Single big tear-off date with the brand name.
    (
      <CardFrame>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border-2 shadow-md p-2 text-center" style={{ borderColor: p }}>
          <div className="text-[3.5px] uppercase tracking-[0.32em]" style={{ color: p }}>April</div>
          <div className="text-[20px] font-serif font-black leading-none text-gray-900 my-1">27</div>
          <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 21 — Brushstroke Mark. A thick painterly brushstroke arc in
    // brand color across the front.
    (
      <CardFrame>
        <div className="absolute left-[10%] right-[10%] top-1/2 -translate-y-1/2 h-[12%] rounded-full" style={{ background: `linear-gradient(90deg, transparent 0%, ${p} 20%, ${p} 80%, transparent 100%)` }} />
        <div className="absolute inset-x-0 bottom-[8%] text-center">
          <div className="text-[7px] font-serif italic text-gray-900">— with thanks</div>
          <div className="text-[3.5px] uppercase tracking-[0.32em] mt-0.5" style={{ color: p }}>{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 22 — Card Wrap. Big logo wrapped in a vertical brand-color band.
    (
      <CardFrame>
        <div className="absolute left-[35%] right-[35%] top-0 bottom-0" style={{ backgroundColor: p }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white p-1.5">
            <BrandLogo brand={brand} size="md" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-[6%] text-center text-[3.5px] uppercase tracking-[0.32em] text-gray-600">{brand.name}</div>
      </CardFrame>
    ),

    // 23 — Open Frame. Dashed brand-color border with the brand
    // initial centered like a monogram bookplate.
    (
      <CardFrame>
        <div className="absolute inset-[8%] border border-dashed" style={{ borderColor: p }} />
        <div className="absolute inset-[12%] border" style={{ borderColor: p }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[3.5px] uppercase tracking-[0.32em]" style={{ color: p }}>ex libris</div>
          <div className="text-[24px] font-serif font-bold mt-1 text-gray-900">{init}</div>
          <div className="text-[3.5px] uppercase tracking-[0.32em] mt-1 text-gray-600">{brand.name}</div>
        </div>
      </CardFrame>
    ),

    // 24 — Bottom Color Wedge. Triangular brand-color wedge at the
    // bottom; clean type above.
    (
      <CardFrame>
        <div className="absolute inset-x-0 bottom-0 h-[55%]" style={{ background: p, clipPath: 'polygon(0 100%, 100% 100%, 100% 0)' }} />
        <div className="absolute left-[8%] top-[14%]">
          <BrandLogo brand={brand} size="xs" />
        </div>
        <div className="absolute left-[8%] top-[40%]">
          <div className="text-[10px] font-serif italic text-gray-900">hello,</div>
        </div>
        <div className="absolute right-[8%] bottom-[8%] text-right text-white text-[3.5px] uppercase tracking-[0.32em]">— {brand.name}</div>
      </CardFrame>
    ),

    // 25 — Twin Initials. Two big initials offset — like a couple's
    // monogram or partnership.
    (
      <CardFrame>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-[40px] font-serif font-black leading-none" style={{ color: `${p}55` }}>{init}</div>
          <div className="text-[40px] font-serif font-black leading-none -ml-2" style={{ color: p }}>{init}</div>
        </div>
        <div className="absolute inset-x-0 bottom-[8%] text-center text-[3.5px] uppercase tracking-[0.32em] text-gray-600">— {brand.name} · 2026 —</div>
      </CardFrame>
    ),

    // 26 — Ticket. A small "ticket" feel with perforated edge and
    // tear-off stub.
    (
      <CardFrame>
        <div className="absolute inset-[8%] flex border-2 border-dashed" style={{ borderColor: p }}>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-[3.5px] uppercase tracking-[0.32em]" style={{ color: p }}>admit one</div>
              <div className="text-[10px] font-serif font-bold text-gray-900 mt-1">{brand.name}</div>
            </div>
          </div>
        </div>
      </CardFrame>
    ),

    // 27 — Soft Gradient. Vertical brand-to-white gradient with
    // serif greeting.
    (
      <CardFrame>
        <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p}66 50%, #fff 100%)` }} />
        <div className="absolute inset-x-0 top-[14%] text-center text-white text-[3.5px] uppercase tracking-[0.32em]">— from —</div>
        <div className="absolute inset-x-0 top-[38%] text-center text-white text-[14px] font-serif italic font-bold">{brand.name}</div>
        <div className="absolute inset-x-0 bottom-[10%] text-center text-[3.5px] uppercase tracking-[0.32em] text-gray-600">est · 2026</div>
      </CardFrame>
    ),

    // 28 — Pen-Nib Mark. Small stylised pen-nib glyph in brand
    // color, anchored bottom-right.
    (
      <CardFrame>
        <div className="absolute right-[10%] bottom-[14%]">
          <div className="w-[10px] h-[14px] rounded-t-full" style={{ background: p, clipPath: 'polygon(50% 0, 100% 60%, 50% 100%, 0 60%)' }} />
        </div>
        <div className="absolute left-[8%] top-[14%]">
          <div className="text-[5px] uppercase tracking-[0.32em] text-gray-500">— hand-written —</div>
          <div className="text-[14px] font-serif italic font-bold text-gray-900 mt-1">a note,</div>
        </div>
        <div className="absolute left-[8%] bottom-[14%] text-[3.5px] uppercase tracking-[0.32em]" style={{ color: p }}>{brand.name}</div>
      </CardFrame>
    ),

    // 29 — Solid Mono. Pure brand-color front with a tiny white
    // mark in one corner — boldest possible note.
    (
      <CardFrame>
        <div className="absolute inset-0" style={{ backgroundColor: p }} />
        <div className="absolute right-[8%] bottom-[8%] text-right">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-white text-[3.5px] uppercase tracking-[0.32em] mt-1 opacity-90">{brand.name}</div>
        </div>
      </CardFrame>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const NOTECARD_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Centered Mark', category: 'Minimalist' },
  { idSuffix: 'ext-2', name: 'Type Splash', category: 'Editorial' },
  { idSuffix: 'ext-3', name: 'Color Block', category: 'Modern' },
  { idSuffix: 'ext-4', name: 'Floral Frame', category: 'Vintage' },
  { idSuffix: 'ext-5', name: 'Embossed Initial', category: 'Lux' },
  { idSuffix: 'ext-6', name: 'Brand Glow', category: 'Modern' },
  { idSuffix: 'ext-7', name: 'Half Tone', category: 'Editorial' },
  { idSuffix: 'ext-8', name: 'Folded Edge', category: 'Minimalist' },
  { idSuffix: 'ext-9', name: 'Hand-Drawn', category: 'Vintage' },
  { idSuffix: 'ext-10', name: 'Postcard Stripe', category: 'Bold' },
  { idSuffix: 'ext-11', name: 'Big Period', category: 'Minimalist' },
  { idSuffix: 'ext-12', name: 'Diagonal Stripe', category: 'Bold' },
  { idSuffix: 'ext-13', name: 'Stripes Pattern', category: 'Bold' },
  { idSuffix: 'ext-14', name: 'Confetti', category: 'Modern' },
  { idSuffix: 'ext-15', name: 'Window Cut', category: 'Bold' },
  { idSuffix: 'ext-16', name: 'Folded Banner', category: 'Vintage' },
  { idSuffix: 'ext-17', name: 'Color Swatches', category: 'Modern' },
  { idSuffix: 'ext-18', name: 'Big Quote', category: 'Editorial' },
  { idSuffix: 'ext-19', name: 'Round Frame', category: 'Lux' },
  { idSuffix: 'ext-20', name: 'Letter Stack', category: 'Editorial' },
  { idSuffix: 'ext-21', name: 'Calendar Day', category: 'Modern' },
  { idSuffix: 'ext-22', name: 'Brushstroke', category: 'Editorial' },
  { idSuffix: 'ext-23', name: 'Card Wrap', category: 'Modern' },
  { idSuffix: 'ext-24', name: 'Ex Libris', category: 'Vintage' },
  { idSuffix: 'ext-25', name: 'Color Wedge', category: 'Bold' },
  { idSuffix: 'ext-26', name: 'Twin Initials', category: 'Lux' },
  { idSuffix: 'ext-27', name: 'Ticket', category: 'Vintage' },
  { idSuffix: 'ext-28', name: 'Soft Gradient', category: 'Modern' },
  { idSuffix: 'ext-29', name: 'Pen Nib', category: 'Editorial' },
  { idSuffix: 'ext-30', name: 'Solid Mono', category: 'Bold' },
] as const;
