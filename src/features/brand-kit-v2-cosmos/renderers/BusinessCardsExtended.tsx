import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Extended business-card designs for the cosmos Brand Kit.
 *
 * These live OUTSIDE `@/features/brandkit/components/renderers/` on
 * purpose — the legacy renderers there are off-limits for edits.
 * The cosmos drilldown wraps `renderTemplateDesign` and routes
 * templates whose id starts with `business-cards-ext-` to this
 * renderer instead.
 *
 * Each design is brand-aware (`brand.primaryColor`, `brand.name`,
 * `BrandLogo`) and renders into the same aspect-ratio frame the
 * legacy cards use, so they slot into the variant grid without any
 * extra CSS. With 18 designs here + 12 legacy = 30 total in the
 * business-cards drilldown.
 *
 *    0  Editorial Index   — magazine-style, numbered, type-stacked
 *    1  Color Block Diptych — clean two-color split, modular feel
 *    2  Brute Force Ticker — heavy stacked type + spreadsheet grid
 *    3  Frosted Layer     — translucent overlay over a color glow
 *    4  Halftone Portrait — gradient halftone wash, art-school
 *    5  Passport Stamp    — vintage rubber-stamp aesthetic
 *    6  Type Mosaic       — letterforms tiled into a composition
 *    7  Calendar Grid     — datebook layout, name as a "today"
 *    8  Blueprint Lines   — architectural / technical drawing
 *    9  Sticker Stack     — overlapping sticker shapes, playful
 *   10  Diagonal Slash    — bold diagonal color cut across card
 *   11  Scanline Retro    — CRT scanline, retro-future hardware
 *   12  Mountain Stack    — stacked horizontal lines as landscape
 *   13  Window Pane       — multi-pane grid with logo in one cell
 *   14  Sunburst Mark     — radiating rays from a brand-color sun
 *   15  Wax Seal          — circular wax-stamp seal, formal
 *   16  Iceberg Layer     — color band rises from bottom edge
 *   17  Ribbon Title      — diagonal ribbon carrying the name
 */
interface BusinessCardExtendedProps {
  brand: Brand;
  templateIndex: number;
}

export function BusinessCardExtendedRenderer({ brand, templateIndex }: BusinessCardExtendedProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#0F1216';
  const designs = [
    // 0 — Editorial Index. Oversized ordinal in the corner, name
    // stacked editorial-style on the right; the brand mark lives
    // small under the index. Reads like a magazine masthead.
    (
      <div className="w-full h-full bg-[#FAF7F2] flex relative overflow-hidden p-[6%]">
        <div className="flex flex-col justify-between w-[40%]">
          <div>
            <div
              className="text-[24px] leading-none font-bold tabular-nums"
              style={{ color: p }}
            >
              N°
              <br />
              013
            </div>
            <div className="mt-1 text-[4.5px] uppercase tracking-[0.18em] text-gray-500">
              Issue / Spring
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <BrandLogo brand={brand} size="xs" />
            <span className="text-[5px] tracking-wider text-gray-700 uppercase">
              {brand.name}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between w-[60%] items-end text-right">
          <div>
            <div
              className="text-[8px] font-serif italic"
              style={{ color: p }}
            >
              Vice President
            </div>
            <div className="text-[14px] font-serif font-semibold text-gray-900 leading-[1.05] mt-0.5">
              Jane
              <br />
              Smith
            </div>
          </div>
          <div className="space-y-[1px] text-[4.5px] text-gray-600">
            <div>jane@{brand.name.toLowerCase()}.com</div>
            <div>+1 234 567 89</div>
            <div className="font-medium" style={{ color: p }}>
              {brand.name.toLowerCase()}.com
            </div>
          </div>
        </div>
      </div>
    ),

    // 1 — Color Block Diptych. Left: full-bleed brand color with
    // logo monogram. Right: clean white with name + contact.
    // Modular, very printable, color-led.
    (
      <div className="w-full h-full bg-white flex relative overflow-hidden">
        <div
          className="w-[44%] h-full flex flex-col justify-between p-[8%] relative"
          style={{ backgroundColor: p }}
        >
          <div className="text-[5px] tracking-[0.2em] uppercase text-white/70">
            {brand.name}
          </div>
          <div className="text-white/95 leading-none">
            <BrandLogo brand={brand} size="lg" color="#ffffff" />
          </div>
          <div className="text-[4.5px] text-white/60 uppercase tracking-[0.16em]">
            Est. {brand.name.length > 0 ? '20' + (brand.name.length * 2 + 8).toString().padStart(2, '0') : '2024'}
          </div>
        </div>
        <div className="w-[56%] flex flex-col justify-between p-[8%]">
          <div className="text-[5px] tracking-[0.18em] uppercase text-gray-400">
            Studio · Brand
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-900 tracking-tight">
              Jane Smith
            </div>
            <div className="text-[6px] mt-0.5" style={{ color: p }}>
              Vice President
            </div>
          </div>
          <div className="space-y-[1px] text-[4.5px] text-gray-700">
            <div>+1 234 567 89</div>
            <div>jane@{brand.name.toLowerCase()}.com</div>
            <div>{brand.name.toLowerCase()}.com</div>
          </div>
        </div>
      </div>
    ),

    // 2 — Brute Force Ticker. Heavy stacked typography on a thin
    // grid, deadpan composition. Mostly black & white with a
    // single brand-color hit on the role line.
    (
      <div className="w-full h-full bg-[#0F1216] text-white relative overflow-hidden font-mono">
        {/* faint grid */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        />
        <div className="relative w-full h-full flex flex-col justify-between p-[7%]">
          <div className="flex justify-between items-start text-[4.5px] uppercase tracking-[0.2em] text-white/60">
            <span>{brand.name} / Index</span>
            <span>NYC · 2026</span>
          </div>
          <div className="space-y-[2px] uppercase">
            <div
              className="text-[18px] font-extrabold leading-[0.92] tracking-tight"
              style={{ fontStretch: 'condensed' }}
            >
              Jane
            </div>
            <div className="text-[18px] font-extrabold leading-[0.92] tracking-tight">
              Smith
            </div>
            <div
              className="text-[5.5px] mt-1.5 tracking-[0.22em]"
              style={{ color: p }}
            >
              ▉ VICE PRESIDENT · OPS
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] uppercase tracking-[0.16em]">
            <div className="space-y-[1px] text-white/70">
              <div>jane@{brand.name.toLowerCase()}.com</div>
              <div>+1 234 56789</div>
            </div>
            <BrandLogo brand={brand} size="xs" color="#ffffff" />
          </div>
        </div>
      </div>
    ),

    // 3 — Frosted Layer. Soft brand-color glow behind a translucent
    // panel that holds the type. Captures the 2026 "frosted /
    // semi-transparent" trend without needing real glass.
    (
      <div className="w-full h-full relative overflow-hidden bg-white">
        {/* Color glow */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(140% 80% at 18% 30%, ${p} 0%, ${p}AA 35%, ${s}55 65%, transparent 80%)`,
          }}
        />
        {/* Frosted panel */}
        <div className="absolute inset-[8%] rounded-[14px] backdrop-blur-[3px] bg-white/55 border border-white/70 flex flex-col justify-between p-[7%]">
          <div className="flex items-start justify-between">
            <BrandLogo brand={brand} size="sm" />
            <div className="text-right">
              <div className="text-[5px] tracking-[0.2em] uppercase text-gray-700">
                {brand.name}
              </div>
              <div className="text-[4.5px] mt-0.5 text-gray-500">
                Studio · 2026
              </div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-semibold text-gray-900 leading-tight">
              Jane Smith
            </div>
            <div
              className="text-[5.5px] uppercase tracking-[0.18em] mt-0.5 font-medium"
              style={{ color: p }}
            >
              Vice President
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] text-gray-700">
            <div className="space-y-[1px]">
              <div>jane@{brand.name.toLowerCase()}.com</div>
              <div>{brand.name.toLowerCase()}.com</div>
            </div>
            <div className="text-right">+1 234 56789</div>
          </div>
        </div>
      </div>
    ),

    // 4 — Halftone Portrait. Gradient + radial-dot mask sells a
    // halftone print feel. Dot pattern lives in a CSS background;
    // the brand color tints the gradient underneath.
    (
      <div className="w-full h-full relative overflow-hidden bg-[#F5F2EC]">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(135deg, ${p}EE 0%, ${p}66 55%, transparent 100%)`,
          }}
        />
        <div
          className="absolute inset-0 mix-blend-multiply opacity-70"
          style={{
            backgroundImage: `radial-gradient(circle, #111 0.6px, transparent 0.7px)`,
            backgroundSize: '4px 4px',
          }}
        />
        <div className="relative w-full h-full p-[7%] flex flex-col justify-between text-[#111]">
          <div className="text-[5px] tracking-[0.2em] uppercase">
            Type Foundry / {brand.name}
          </div>
          <div>
            <div className="text-[4.5px] uppercase tracking-[0.16em] opacity-70">
              Vice President · Operations
            </div>
            <div className="text-[14px] font-bold leading-[1.02] mt-1">
              Jane Smith
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px]">
            <div className="space-y-[1px]">
              <div>jane@{brand.name.toLowerCase()}.com</div>
              <div className="opacity-70">+1 234 56789</div>
            </div>
            <BrandLogo brand={brand} size="xs" />
          </div>
        </div>
      </div>
    ),

    // 5 — Passport Stamp. Off-white stock with concentric rings,
    // a stamped role badge, and serif type. Reads like a vintage
    // travel document.
    (
      <div className="w-full h-full relative overflow-hidden bg-[#F4EFE3] p-[6%]">
        {/* concentric stamp rings, top-left */}
        <div
          className="absolute -left-3 -top-3 w-[38%] aspect-square rounded-full border-2 opacity-80"
          style={{ borderColor: p }}
        />
        <div
          className="absolute -left-1 -top-1 w-[34%] aspect-square rounded-full border opacity-60"
          style={{ borderColor: p }}
        />
        {/* role stamp, bottom-right, tilted */}
        <div
          className="absolute right-[6%] bottom-[20%] border-2 px-2 py-0.5 -rotate-6 text-[5.5px] uppercase tracking-[0.22em] font-bold"
          style={{ borderColor: p, color: p }}
        >
          Approved
        </div>
        <div className="relative w-full h-full flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <BrandLogo brand={brand} size="sm" />
            <div className="text-right text-[4.5px] uppercase tracking-[0.18em] text-gray-600">
              Series A · 2026
            </div>
          </div>
          <div>
            <div className="text-[5px] uppercase tracking-[0.2em] text-gray-500">
              Holder
            </div>
            <div className="font-serif text-[13px] leading-tight font-semibold text-gray-900">
              Jane Smith
            </div>
            <div
              className="text-[5px] uppercase tracking-[0.18em] mt-0.5 font-medium"
              style={{ color: p }}
            >
              Vice President
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] text-gray-700">
            <div>jane@{brand.name.toLowerCase()}.com</div>
            <div>+1 234 56789</div>
          </div>
        </div>
      </div>
    ),

    // 6 — Type Mosaic. Tiled grid of large letterforms forming the
    // brand initial. The actual contact info sits as a small block
    // inside the mosaic — a "name finder" reading puzzle.
    (
      <div className="w-full h-full relative overflow-hidden bg-white">
        <div
          className="absolute inset-0 grid"
          style={{ gridTemplateColumns: 'repeat(8, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const row = Math.floor(i / 8);
            const col = i % 8;
            const isAccent =
              (row + col) % 5 === 0 || (row === 1 && col === 4) || (row === 3 && col === 2);
            const isInitial = i === 18; // ~middle
            return (
              <div
                key={i}
                className="flex items-center justify-center text-[10px] font-black leading-none"
                style={{
                  backgroundColor: isInitial ? p : isAccent ? `${p}22` : 'transparent',
                  color: isInitial ? '#fff' : '#111',
                }}
              >
                {isInitial ? brand.name.charAt(0).toUpperCase() : ''}
              </div>
            );
          })}
        </div>
        <div className="absolute right-[6%] bottom-[10%] bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 text-right">
          <div className="text-[7px] font-bold text-gray-900 leading-tight">
            Jane Smith
          </div>
          <div className="text-[4px]" style={{ color: p }}>
            VP · {brand.name}
          </div>
          <div className="text-[3.5px] text-gray-600 mt-0.5">
            jane@{brand.name.toLowerCase()}.com
          </div>
        </div>
      </div>
    ),

    // 7 — Calendar Grid. Datebook layout — 7-column grid, today's
    // cell colored with the brand and holding the name. Plays with
    // editorial / utility aesthetic.
    (
      <div className="w-full h-full bg-white p-[6%] relative overflow-hidden font-mono">
        <div className="flex items-center justify-between text-[4.5px] uppercase tracking-[0.18em] text-gray-500 mb-1">
          <div>April · 2026</div>
          <div className="flex items-center gap-1">
            <BrandLogo brand={brand} size="xs" />
            <span>{brand.name}</span>
          </div>
        </div>
        <div
          className="grid gap-[1px] mb-1.5"
          style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
        >
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div
              key={i}
              className="text-center text-[3.5px] uppercase tracking-wider text-gray-400"
            >
              {d}
            </div>
          ))}
        </div>
        <div
          className="grid gap-[1px]"
          style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}
        >
          {Array.from({ length: 28 }).map((_, i) => {
            const isToday = i === 14; // mid-cell holds the name
            return (
              <div
                key={i}
                className="aspect-square flex items-center justify-center text-[4px] border border-gray-100"
                style={{
                  backgroundColor: isToday ? p : '#FAFAFA',
                  color: isToday ? '#fff' : '#888',
                }}
              >
                {!isToday ? i + 1 : ''}
                {isToday && (
                  <div className="text-center leading-tight">
                    <div className="text-[4px] font-bold">JS</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="absolute right-[6%] bottom-[6%] text-right">
          <div className="text-[7px] font-bold text-gray-900">Jane Smith</div>
          <div className="text-[4px]" style={{ color: p }}>
            Vice President
          </div>
          <div className="text-[3.5px] text-gray-600 mt-0.5">
            jane@{brand.name.toLowerCase()}.com
          </div>
        </div>
      </div>
    ),

    // 8 — Blueprint Lines. Technical drawing aesthetic — graph-paper
    // background, angle markers, dotted measurement lines around the
    // name. Brand color = the construction line.
    (
      <div className="w-full h-full bg-[#F0F4F2] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `linear-gradient(to right, ${p}33 1px, transparent 1px), linear-gradient(to bottom, ${p}33 1px, transparent 1px)`,
            backgroundSize: '12px 12px',
          }}
        />
        {/* dimension marks */}
        <div
          className="absolute top-[20%] left-[10%] right-[10%] border-t border-dashed"
          style={{ borderColor: p }}
        />
        <div
          className="absolute bottom-[28%] left-[10%] right-[10%] border-t border-dashed"
          style={{ borderColor: p }}
        />
        <div
          className="absolute top-[20%] left-[10%] bottom-[28%] border-l border-dashed"
          style={{ borderColor: p }}
        />
        <div
          className="absolute top-[20%] right-[10%] bottom-[28%] border-l border-dashed"
          style={{ borderColor: p }}
        />
        <div className="relative w-full h-full p-[6%] flex flex-col justify-between">
          <div className="flex items-start justify-between text-[4.5px] uppercase tracking-[0.18em] text-gray-700">
            <span>Drawing 01 · {brand.name}</span>
            <span style={{ color: p }}>SCALE 1:1</span>
          </div>
          <div className="text-center">
            <div className="text-[12px] font-bold text-gray-900 leading-tight">
              Jane Smith
            </div>
            <div className="text-[5px] uppercase tracking-[0.22em] text-gray-600 mt-0.5">
              Vice President — Ops
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] text-gray-700">
            <div className="space-y-[1px]">
              <div>+1 234 56789</div>
              <div>jane@{brand.name.toLowerCase()}.com</div>
            </div>
            <BrandLogo brand={brand} size="xs" />
          </div>
        </div>
      </div>
    ),

    // 9 — Sticker Stack. Overlapping rounded shapes give a playful,
    // tactile feel. Each sticker carries a piece of the contact
    // info; the largest sticker is the brand color.
    (
      <div className="w-full h-full bg-[#FFFBF2] relative overflow-hidden p-[5%]">
        <div
          className="absolute -left-[6%] top-[10%] w-[58%] aspect-square rounded-full -rotate-12"
          style={{ backgroundColor: p }}
        />
        <div className="absolute left-[26%] bottom-[6%] w-[34%] aspect-square rounded-full bg-[#0F1216] rotate-6" />
        <div className="absolute right-[6%] top-[8%] w-[28%] aspect-square rounded-full bg-white border-2 border-[#0F1216] -rotate-3 flex items-center justify-center">
          <BrandLogo brand={brand} size="sm" />
        </div>
        <div className="relative w-full h-full flex flex-col justify-between text-[#0F1216]">
          <div className="text-[5px] uppercase tracking-[0.2em] text-white/90 mt-[18%] ml-[6%]">
            {brand.name} Studio
          </div>
          <div className="ml-[8%] mb-[4%]">
            <div className="text-[12px] font-bold leading-tight text-white">
              Jane
              <br />
              Smith
            </div>
            <div className="text-[5px] uppercase tracking-[0.18em] text-white/80 mt-1">
              Vice President
            </div>
            <div className="text-[4px] text-white/70 mt-1">
              jane@{brand.name.toLowerCase()}.com · +1 234 56789
            </div>
          </div>
        </div>
      </div>
    ),

    // 10 — Diagonal Slash. A brand-colored slash cuts the card
    // edge-to-edge; the name lives on top of it, the contact below.
    // High-contrast, instant brand presence.
    (
      <div className="w-full h-full relative overflow-hidden bg-white">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(105deg, transparent 0%, transparent 38%, ${p} 38.5%, ${p} 62%, transparent 62.5%, transparent 100%)`,
          }}
        />
        <div className="relative w-full h-full p-[7%] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <BrandLogo brand={brand} size="sm" />
            <div className="text-right text-[4.5px] uppercase tracking-[0.2em] text-gray-500">
              {brand.name} · Studio
            </div>
          </div>
          <div className="text-center text-white">
            <div className="text-[14px] font-bold leading-none tracking-tight">
              Jane Smith
            </div>
            <div className="text-[5.5px] uppercase tracking-[0.22em] mt-1 opacity-90">
              Vice President
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] text-gray-700">
            <div>jane@{brand.name.toLowerCase()}.com</div>
            <div>+1 234 56789</div>
          </div>
        </div>
      </div>
    ),

    // 11 — Scanline Retro. CRT scanlines + glowing brand-color
    // chrome. Reads like a retro terminal screen.
    (
      <div className="w-full h-full relative overflow-hidden bg-[#0A0F12] text-white font-mono">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 3px)',
          }}
        />
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `radial-gradient(80% 50% at 50% 50%, ${p}55 0%, transparent 70%)`,
          }}
        />
        <div className="relative w-full h-full p-[6%] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[4.5px] uppercase tracking-[0.22em]">
            <span style={{ color: p }}>● {brand.name.toUpperCase()}.SYS</span>
            <span className="opacity-70">v2.026</span>
          </div>
          <div>
            <div className="text-[5px] mb-1 opacity-70 uppercase tracking-[0.2em]">
              user.profile
            </div>
            <div
              className="text-[14px] font-bold leading-[1.02] uppercase tracking-tight"
              style={{ textShadow: `0 0 8px ${p}` }}
            >
              Jane_Smith
            </div>
            <div
              className="text-[5px] uppercase tracking-[0.2em] mt-1"
              style={{ color: p }}
            >
              ▸ vice_president
            </div>
          </div>
          <div className="space-y-[1px] text-[4.5px] uppercase tracking-[0.16em] opacity-80">
            <div>&gt; jane@{brand.name.toLowerCase()}.com</div>
            <div>&gt; +1 234 56789</div>
            <div>&gt; {brand.name.toLowerCase()}.com</div>
          </div>
        </div>
      </div>
    ),

    // 12 — Mountain Stack. Stacked horizontal bands of varying
    // heights form an abstract landscape. Brand color anchors the
    // foreground; the type sits in the sky.
    (
      <div className="w-full h-full relative overflow-hidden bg-[#FBF8F1]">
        {/* layered "mountains" */}
        <div
          className="absolute left-0 right-0 bottom-0 h-[40%]"
          style={{ backgroundColor: p }}
        />
        <div
          className="absolute left-0 right-0 bottom-[40%] h-[14%]"
          style={{ backgroundColor: `${p}77` }}
        />
        <div
          className="absolute left-0 right-0 bottom-[54%] h-[10%]"
          style={{ backgroundColor: `${p}44` }}
        />
        {/* sun */}
        <div
          className="absolute right-[14%] top-[14%] w-[18%] aspect-square rounded-full"
          style={{ backgroundColor: '#fff', mixBlendMode: 'soft-light', opacity: 0.7 }}
        />
        <div className="relative w-full h-full p-[6%] flex flex-col justify-between">
          <div>
            <div className="text-[5px] uppercase tracking-[0.22em] text-gray-700">
              {brand.name} · Studio
            </div>
            <div className="text-[12px] font-serif font-semibold text-gray-900 leading-tight mt-1">
              Jane Smith
            </div>
            <div
              className="text-[5px] uppercase tracking-[0.2em] mt-0.5"
              style={{ color: p, filter: 'brightness(0.6)' }}
            >
              Vice President
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] text-white">
            <div className="space-y-[1px]">
              <div>jane@{brand.name.toLowerCase()}.com</div>
              <div>+1 234 56789</div>
            </div>
            <BrandLogo brand={brand} size="xs" color="#ffffff" />
          </div>
        </div>
      </div>
    ),

    // 13 — Window Pane. 4-pane window grid; logo lives in one cell,
    // name in another, contact in a third — like a contact-sheet
    // grid frozen on the card.
    (
      <div className="w-full h-full bg-[#F8F6F1] relative overflow-hidden">
        <div className="absolute inset-[5%] grid grid-cols-3 grid-rows-2 gap-[1.5%]">
          <div
            className="row-span-2 flex items-end justify-start p-[8%]"
            style={{ backgroundColor: p }}
          >
            <BrandLogo brand={brand} size="md" color="#ffffff" />
          </div>
          <div className="bg-white flex items-end p-[8%]">
            <div>
              <div className="text-[10px] font-bold text-gray-900 leading-tight">
                Jane
              </div>
              <div className="text-[10px] font-bold text-gray-900 leading-tight">
                Smith
              </div>
            </div>
          </div>
          <div className="bg-white flex items-start justify-end p-[8%]">
            <div className="text-right">
              <div className="text-[4px] uppercase tracking-[0.2em] text-gray-500">
                Role
              </div>
              <div
                className="text-[5px] uppercase tracking-[0.18em] font-semibold mt-0.5"
                style={{ color: p }}
              >
                Vice President
              </div>
            </div>
          </div>
          <div
            className="col-span-2 flex items-end justify-between p-[5%] text-[4.5px] text-gray-800"
            style={{ backgroundColor: '#FFFFFF', borderTop: `2px solid ${p}` }}
          >
            <div className="space-y-[1px]">
              <div className="font-medium">jane@{brand.name.toLowerCase()}.com</div>
              <div>+1 234 56789</div>
            </div>
            <div className="text-right" style={{ color: p }}>
              {brand.name.toLowerCase()}.com
            </div>
          </div>
        </div>
      </div>
    ),

    // 14 — Sunburst Mark. Radiating rays from a brand-color sun
    // anchor the card; type wraps around it. Heroic, almost
    // crest-like.
    (
      <div className="w-full h-full bg-white relative overflow-hidden">
        <div
          className="absolute -left-[18%] -bottom-[40%] w-[80%] aspect-square rounded-full"
          style={{
            background: `conic-gradient(from 180deg, ${p} 0deg, ${p}99 30deg, transparent 60deg, ${p} 90deg, ${p}99 120deg, transparent 150deg, ${p} 180deg)`,
            opacity: 0.85,
          }}
        />
        <div
          className="absolute -left-[14%] -bottom-[36%] w-[72%] aspect-square rounded-full bg-white"
        />
        <div
          className="absolute -left-[6%] -bottom-[30%] w-[60%] aspect-square rounded-full"
          style={{ backgroundColor: p }}
        />
        <div className="relative w-full h-full p-[6%] flex flex-col justify-between">
          <div className="flex items-start justify-between text-[4.5px] uppercase tracking-[0.2em] text-gray-700">
            <span>{brand.name} · Studio</span>
            <span>Card 014 / 016</span>
          </div>
          <div className="self-end text-right">
            <div className="text-[12px] font-serif font-semibold text-gray-900 leading-tight">
              Jane Smith
            </div>
            <div
              className="text-[5px] uppercase tracking-[0.22em] mt-0.5 font-medium"
              style={{ color: p }}
            >
              Vice President
            </div>
          </div>
          <div className="self-end text-right text-[4.5px] text-gray-700">
            <div>jane@{brand.name.toLowerCase()}.com</div>
            <div>+1 234 56789</div>
          </div>
        </div>
      </div>
    ),

    // 15 — Wax Seal. Centered circular wax-stamp seal in brand
    // color, with the brand initial debossed inside. Surrounding
    // type is restrained, formal — proposal/contract feel.
    (
      <div className="w-full h-full bg-[#FAF6EE] relative overflow-hidden p-[6%]">
        <div className="relative w-full h-full flex flex-col justify-between">
          <div className="flex items-start justify-between text-[4.5px] uppercase tracking-[0.22em] text-gray-600">
            <span>Office of the President</span>
            <span>{brand.name}</span>
          </div>
          <div className="flex items-center gap-3 mx-auto">
            <div
              className="w-[60px] h-[60px] rounded-full flex items-center justify-center relative"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${p}EE, ${p} 60%, ${p}AA 100%)`,
                boxShadow: `inset 0 -4px 8px rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.12)`,
              }}
            >
              <span className="text-white text-[18px] font-serif font-bold leading-none">
                {brand.name.charAt(0).toUpperCase()}
              </span>
              <div
                className="absolute inset-1 rounded-full border opacity-50"
                style={{ borderColor: '#fff' }}
              />
            </div>
            <div>
              <div className="text-[10px] font-serif font-semibold text-gray-900 leading-tight">
                Jane Smith
              </div>
              <div
                className="text-[5px] uppercase tracking-[0.22em] mt-0.5"
                style={{ color: p }}
              >
                Vice President
              </div>
              <div className="text-[4.5px] text-gray-600 mt-1">
                jane@{brand.name.toLowerCase()}.com
              </div>
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] uppercase tracking-[0.18em] text-gray-600">
            <span>Sealed · 2026</span>
            <span>{brand.name.toLowerCase()}.com</span>
          </div>
        </div>
      </div>
    ),

    // 16 — Iceberg Layer. Vertical brand-color band rises from the
    // bottom edge — like an iceberg cross-section. Type rests on
    // the white ice above; contact info etched into the colored
    // depth below.
    (
      <div className="w-full h-full relative overflow-hidden bg-white">
        <div
          className="absolute left-0 right-0 bottom-0 h-[55%]"
          style={{
            background: `linear-gradient(180deg, ${p} 0%, ${p}DD 60%, ${p}99 100%)`,
            clipPath: 'polygon(0 22%, 18% 12%, 32% 18%, 48% 8%, 64% 16%, 80% 6%, 100% 14%, 100% 100%, 0 100%)',
          }}
        />
        <div className="relative w-full h-full p-[6%] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <BrandLogo brand={brand} size="sm" />
            <div className="text-right text-[4.5px] uppercase tracking-[0.2em] text-gray-500">
              {brand.name} · Studio
            </div>
          </div>
          <div className="text-center mt-[-6%]">
            <div className="text-[12px] font-bold text-gray-900 leading-tight">
              Jane Smith
            </div>
            <div
              className="text-[5px] uppercase tracking-[0.22em] mt-0.5"
              style={{ color: p, filter: 'brightness(0.6)' }}
            >
              Vice President
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] text-white">
            <div className="space-y-[1px]">
              <div>jane@{brand.name.toLowerCase()}.com</div>
              <div>+1 234 56789</div>
            </div>
            <div className="text-right opacity-90">
              {brand.name.toLowerCase()}.com
            </div>
          </div>
        </div>
      </div>
    ),

    // 17 — Ribbon Title. A wide brand-color ribbon sweeps across the
    // middle of the card carrying the name; corners hold logo +
    // contact in a quiet serif voice.
    (
      <div className="w-full h-full relative overflow-hidden bg-[#F8F5EE]">
        <div
          className="absolute left-[-4%] right-[-4%] top-[42%] h-[24%] -rotate-3"
          style={{
            background: `linear-gradient(90deg, ${p}DD 0%, ${p} 50%, ${p}DD 100%)`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        />
        {/* ribbon notches */}
        <div
          className="absolute left-[-4%] top-[64%] w-[14px] h-[10px] -rotate-3"
          style={{
            background: `linear-gradient(45deg, transparent 50%, ${p}77 50%)`,
          }}
        />
        <div className="relative w-full h-full p-[6%] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <BrandLogo brand={brand} size="sm" />
            <div className="text-right text-[4.5px] uppercase tracking-[0.22em] text-gray-700">
              Class of 2026
            </div>
          </div>
          <div className="text-center -rotate-3 text-white">
            <div className="text-[5px] uppercase tracking-[0.24em] opacity-80 mb-0.5">
              {brand.name}
            </div>
            <div className="text-[14px] font-serif italic font-semibold leading-none">
              Jane Smith
            </div>
            <div className="text-[5px] uppercase tracking-[0.22em] mt-1 opacity-90">
              Vice President
            </div>
          </div>
          <div className="flex items-end justify-between text-[4.5px] text-gray-700 font-serif">
            <div>jane@{brand.name.toLowerCase()}.com</div>
            <div>+1 234 56789</div>
          </div>
        </div>
      </div>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

/** Metadata for the extended designs — id suffix maps to index above. */
export const BUSINESS_CARDS_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Editorial Index', category: 'Editorial' },
  { idSuffix: 'ext-2', name: 'Color Block Diptych', category: 'Modern' },
  { idSuffix: 'ext-3', name: 'Brute Force', category: 'Brutalist' },
  { idSuffix: 'ext-4', name: 'Frosted Layer', category: 'Modern' },
  { idSuffix: 'ext-5', name: 'Halftone Portrait', category: 'Editorial' },
  { idSuffix: 'ext-6', name: 'Passport Stamp', category: 'Vintage' },
  { idSuffix: 'ext-7', name: 'Type Mosaic', category: 'Modern' },
  { idSuffix: 'ext-8', name: 'Calendar Grid', category: 'Modern' },
  { idSuffix: 'ext-9', name: 'Blueprint Lines', category: 'Modern' },
  { idSuffix: 'ext-10', name: 'Sticker Stack', category: 'Bold' },
  { idSuffix: 'ext-11', name: 'Diagonal Slash', category: 'Bold' },
  { idSuffix: 'ext-12', name: 'Scanline Retro', category: 'Modern' },
  { idSuffix: 'ext-13', name: 'Mountain Stack', category: 'Modern' },
  { idSuffix: 'ext-14', name: 'Window Pane', category: 'Modern' },
  { idSuffix: 'ext-15', name: 'Sunburst Mark', category: 'Lux' },
  { idSuffix: 'ext-16', name: 'Wax Seal', category: 'Lux' },
  { idSuffix: 'ext-17', name: 'Iceberg Layer', category: 'Modern' },
  { idSuffix: 'ext-18', name: 'Ribbon Title', category: 'Vintage' },
] as const;
