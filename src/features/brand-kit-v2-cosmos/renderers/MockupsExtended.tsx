import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Extended mockup designs for the cosmos Brand Kit. 20 designs that
 * extend the legacy 10 → 30 total mockup variants. Each is a small
 * stylised product scene rendered in CSS — no external assets — so
 * they reflect the brand's palette live.
 *
 *    0  Phone Case          11 Coffee Cup Sleeve
 *    1  Laptop Sleeve       12 Wine Bottle
 *    2  Tablet Cover        13 Beer Can
 *    3  Smartwatch Face     14 Cosmetic Tube
 *    4  Hardcover Book      15 Storefront Awning
 *    5  Magazine Spread     16 Subway Ad
 *    6  Hoodie Print        17 Bus Stop Poster
 *    7  Tote Bag            18 Backpack Patch
 *    8  Cap Embroidery      19 Concert Ticket
 *    9  Soap Box
 *   10  Notebook Cover
 */
interface Props {
  brand: Brand;
  templateIndex: number;
}

export function MockupsExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#0F1216';
  const init = brand.name.charAt(0).toUpperCase();

  const designs = [
    // 0 — Phone Case. Phone-back view with brand color and logo.
    (
      <div className="w-full h-full bg-[#EEECE6] flex items-center justify-center p-[6%]">
        <div className="w-[24%] aspect-[9/19] rounded-[10px] shadow-xl relative overflow-hidden" style={{ backgroundColor: p }}>
          {/* camera bump */}
          <div className="absolute top-[6%] left-[14%] w-[36%] aspect-[5/3] rounded-[3px] bg-black/20 flex items-center gap-0.5 p-0.5">
            <div className="w-[28%] aspect-square rounded-full bg-black/40" />
            <div className="w-[28%] aspect-square rounded-full bg-black/40" />
          </div>
          <div className="absolute inset-x-0 bottom-[14%] flex items-center justify-center">
            <BrandLogo brand={brand} size="md" color="#ffffff" />
          </div>
        </div>
      </div>
    ),

    // 1 — Laptop Sleeve. Vegan-leather sleeve with embossed logo.
    (
      <div className="w-full h-full bg-[#E7E2D6] flex items-center justify-center p-[8%]">
        <div className="w-[60%] aspect-[16/11] rounded-[6px] shadow-lg relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${p} 0%, ${p}CC 100%)` }}>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 80% at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 70%)' }} />
          <div className="absolute right-[8%] bottom-[10%] flex items-center gap-1.5">
            <BrandLogo brand={brand} size="sm" color="#ffffff" />
            <span className="text-white text-[6px] tracking-[0.2em] uppercase">{brand.name}</span>
          </div>
          <div className="absolute left-[6%] top-[10%] w-[35%] h-[1px] bg-white/40" />
        </div>
      </div>
    ),

    // 2 — Tablet Cover. Folio-style tablet case open at angle.
    (
      <div className="w-full h-full bg-[#F4F1EA] flex items-center justify-center p-[6%]">
        <div className="flex gap-[2px] -rotate-6">
          <div className="w-[40px] aspect-[4/5] rounded-l-md shadow-lg" style={{ backgroundColor: p }} />
          <div className="w-[60px] aspect-[4/5] rounded-r-md bg-[#1a1a1a] shadow-lg p-1">
            <div className="w-full h-full rounded-sm bg-white flex flex-col">
              <div className="h-[18%] flex items-center px-1" style={{ backgroundColor: p }}>
                <BrandLogo brand={brand} size="xs" color="#ffffff" />
              </div>
              <div className="flex-1 grid grid-cols-3 gap-0.5 p-0.5">
                {Array.from({length: 6}).map((_, i) => <div key={i} className="aspect-square rounded-sm bg-gray-100" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 3 — Smartwatch Face. Round face with brand initial monogram.
    (
      <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center">
        <div className="w-[36%] aspect-square rounded-full bg-black border-[6px] border-[#2a2a2a] shadow-2xl relative flex items-center justify-center">
          <div className="absolute inset-2 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, ${p}55, transparent 70%)` }} />
          <div className="text-white text-[5px] absolute top-[14%] tracking-[0.3em] uppercase opacity-70">{brand.name}</div>
          <div className="text-[28px] font-serif font-bold leading-none" style={{ color: p }}>{init}</div>
          <div className="text-white text-[4px] absolute bottom-[16%] opacity-60">10:24 AM</div>
        </div>
      </div>
    ),

    // 4 — Hardcover Book. Book cover with foil-stamped title.
    (
      <div className="w-full h-full bg-[#E8E4D8] flex items-center justify-center p-[6%]">
        <div className="w-[42%] aspect-[3/4] rounded-r-sm shadow-2xl relative overflow-hidden" style={{ backgroundColor: p }}>
          {/* spine */}
          <div className="absolute left-0 top-0 bottom-0 w-[6%] bg-black/15" />
          <div className="absolute inset-0 flex flex-col items-center justify-between p-[10%] text-white">
            <div className="text-[5px] uppercase tracking-[0.3em] opacity-80">A Manual</div>
            <div className="text-center">
              <div className="text-[11px] font-serif font-bold leading-tight">{brand.name}</div>
              <div className="text-[5px] uppercase tracking-[0.22em] mt-1 opacity-80">Vol. 01</div>
            </div>
            <BrandLogo brand={brand} size="xs" color="#ffffff" />
          </div>
        </div>
      </div>
    ),

    // 5 — Magazine Spread. Open editorial spread with brand color.
    (
      <div className="w-full h-full bg-[#F5F2E8] flex items-center justify-center p-[6%]">
        <div className="flex w-[78%] aspect-[16/9] shadow-xl rounded-sm overflow-hidden">
          <div className="w-1/2 bg-white p-[5%] flex flex-col justify-between">
            <div className="text-[4px] uppercase tracking-[0.22em] text-gray-500">Issue 14</div>
            <div>
              <div className="text-[10px] font-serif font-bold text-gray-900 leading-tight">The {brand.name} Issue</div>
              <div className="text-[3.5px] mt-1 leading-tight text-gray-600">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.</div>
            </div>
            <div className="text-[3.5px] text-gray-400">— P.04</div>
          </div>
          <div className="w-1/2 flex flex-col" style={{ backgroundColor: p }}>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-white text-[24px] font-serif font-bold opacity-90">{init}</div>
            </div>
            <div className="text-white text-[3.5px] uppercase tracking-[0.2em] p-[5%] opacity-80">{brand.name.toLowerCase()}.com</div>
          </div>
        </div>
      </div>
    ),

    // 6 — Hoodie Print. Hoodie silhouette with center-chest logo.
    (
      <div className="w-full h-full bg-[#1F1F1F] flex items-center justify-center p-[6%]">
        <div className="relative w-[58%] aspect-[5/4]" style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))' }}>
          <div className="absolute inset-0" style={{ backgroundColor: p, clipPath: 'polygon(30% 0%, 70% 0%, 80% 8%, 100% 18%, 100% 100%, 0% 100%, 0% 18%, 20% 8%)' }} />
          {/* hood */}
          <div className="absolute top-0 left-[35%] right-[35%] h-[20%] rounded-t-full" style={{ backgroundColor: p, filter: 'brightness(0.85)' }} />
          {/* drawstrings */}
          <div className="absolute top-[16%] left-[44%] w-[1px] h-[16%] bg-white/40" />
          <div className="absolute top-[16%] right-[44%] w-[1px] h-[16%] bg-white/40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <BrandLogo brand={brand} size="sm" color="#ffffff" />
              <div className="text-[5px] uppercase tracking-[0.2em] mt-1 opacity-80">{brand.name}</div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 7 — Tote Bag. Canvas tote with screen-printed logo and slogan.
    (
      <div className="w-full h-full bg-[#EFE9DA] flex items-center justify-center p-[5%]">
        <div className="relative w-[45%] aspect-[4/5]">
          {/* handles */}
          <div className="absolute -top-[6%] left-[16%] right-[16%] h-[14%] border-2 border-[#9A8E72] rounded-t-full" />
          <div className="absolute top-[8%] left-0 right-0 bottom-0 bg-[#E1D8C0] rounded-sm shadow-md p-[8%] flex flex-col justify-between">
            <BrandLogo brand={brand} size="sm" color={p} />
            <div className="text-center">
              <div className="text-[9px] font-bold leading-tight" style={{ color: p }}>CARRY</div>
              <div className="text-[9px] font-bold leading-tight" style={{ color: p }}>{brand.name.toUpperCase()}</div>
            </div>
            <div className="text-[3.5px] text-center uppercase tracking-[0.22em] text-gray-700">est · {brand.name.toLowerCase()}.com</div>
          </div>
        </div>
      </div>
    ),

    // 8 — Cap Embroidery. Side view of a 5-panel cap with logo.
    (
      <div className="w-full h-full bg-[#0F1216] flex items-center justify-center p-[6%]">
        <div className="relative w-[52%] aspect-[2/1]">
          <div className="absolute left-0 right-[28%] top-0 bottom-[28%] rounded-tl-[60%] rounded-tr-[40%] rounded-bl-[8%]" style={{ backgroundColor: p }} />
          {/* brim */}
          <div className="absolute left-[20%] right-0 bottom-[20%] h-[14%] rounded-r-full" style={{ backgroundColor: p, filter: 'brightness(0.78)' }} />
          {/* embroidery */}
          <div className="absolute left-[18%] top-[28%]">
            <BrandLogo brand={brand} size="xs" color="#ffffff" />
          </div>
        </div>
      </div>
    ),

    // 9 — Soap Box. Squat product box with branded label.
    (
      <div className="w-full h-full bg-[#F2EEE2] flex items-end justify-center p-[6%]">
        <div className="w-[44%] aspect-[5/4] relative" style={{ filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))' }}>
          {/* main face */}
          <div className="absolute inset-0 bg-white rounded-sm overflow-hidden flex flex-col">
            <div className="h-[40%] relative" style={{ backgroundColor: p }}>
              <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 30% 30%, #fff 0%, transparent 50%)' }} />
              <div className="absolute right-2 top-2">
                <BrandLogo brand={brand} size="xs" color="#ffffff" />
              </div>
            </div>
            <div className="flex-1 p-[6%] flex flex-col justify-between">
              <div>
                <div className="text-[4.5px] uppercase tracking-[0.22em] text-gray-500">{brand.name}</div>
                <div className="text-[10px] font-serif font-semibold text-gray-900 leading-tight">Cedar Bar</div>
              </div>
              <div className="text-[3.5px] text-gray-500">100g · made in studio</div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 10 — Notebook Cover. Hardcover notebook with elastic strap.
    (
      <div className="w-full h-full bg-[#E5E0D2] flex items-center justify-center p-[8%]">
        <div className="relative w-[45%] aspect-[3/4] rounded-[3px] shadow-xl" style={{ backgroundColor: p }}>
          {/* elastic */}
          <div className="absolute right-[18%] top-0 bottom-0 w-[5px] bg-black/40" />
          {/* embossed mark */}
          <div className="absolute left-[14%] top-[14%] opacity-80">
            <BrandLogo brand={brand} size="sm" color="#ffffff" />
          </div>
          <div className="absolute left-[14%] bottom-[14%] text-white text-[5px] tracking-[0.3em] uppercase opacity-70">{brand.name}</div>
        </div>
      </div>
    ),

    // 11 — Coffee Cup Sleeve. Takeaway cup with branded sleeve.
    (
      <div className="w-full h-full bg-[#E0DAC8] flex items-end justify-center p-[6%]">
        <div className="relative w-[34%] aspect-[3/4]">
          {/* cup */}
          <div className="absolute inset-0 bg-white rounded-b-[40%] rounded-t-[6%]" style={{ clipPath: 'polygon(8% 0, 92% 0, 100% 100%, 0 100%)' }} />
          {/* sleeve */}
          <div className="absolute inset-x-[-2%] top-[35%] h-[35%] rounded-sm" style={{ backgroundColor: p }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <BrandLogo brand={brand} size="xs" color="#ffffff" />
              <div className="text-[3.5px] uppercase tracking-[0.22em] mt-0.5 opacity-90">{brand.name}</div>
            </div>
          </div>
          {/* lid */}
          <div className="absolute left-0 right-0 top-0 h-[8%] rounded-t-md bg-[#3B3128]" />
        </div>
      </div>
    ),

    // 12 — Wine Bottle. Tall bottle with elegant label.
    (
      <div className="w-full h-full bg-[#1A1611] flex items-end justify-center p-[6%]">
        <div className="relative w-[16%] h-[88%]">
          {/* bottle */}
          <div className="absolute inset-0 bg-[#0E1A12] rounded-t-[40%] rounded-b-md" />
          {/* highlight */}
          <div className="absolute left-[20%] top-[10%] bottom-[8%] w-[2px] bg-white/15 rounded-full" />
          {/* label */}
          <div className="absolute left-0 right-0 top-[40%] h-[34%] flex items-center justify-center text-white" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p}DD 100%)` }}>
            <div className="text-center">
              <div className="text-[10px] font-serif font-bold leading-none">{init}</div>
              <div className="text-[3px] uppercase tracking-[0.3em] mt-0.5 opacity-90">{brand.name}</div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 13 — Beer Can. Soda/beer aluminium can with brand wrap.
    (
      <div className="w-full h-full bg-[#F4F1E8] flex items-end justify-center p-[6%]">
        <div className="relative w-[32%] aspect-[3/5]">
          <div className="absolute inset-x-0 top-[6%] bottom-0 rounded-md shadow-md" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p} 50%, ${p}DD 100%)` }}>
            {/* can rings */}
            <div className="absolute inset-x-0 top-0 h-[3%] bg-black/20" />
            <div className="absolute inset-x-0 bottom-0 h-[3%] bg-black/20" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="text-[4px] uppercase tracking-[0.3em] opacity-80">brewed</div>
              <BrandLogo brand={brand} size="sm" color="#ffffff" />
              <div className="text-[3px] uppercase tracking-[0.3em] mt-0.5 opacity-80">{brand.name}</div>
            </div>
          </div>
          {/* tab */}
          <div className="absolute left-1/2 -translate-x-1/2 top-[2%] w-[18%] h-[3%] bg-gray-300 rounded-sm" />
        </div>
      </div>
    ),

    // 14 — Cosmetic Tube. Squeezable tube with cap.
    (
      <div className="w-full h-full bg-[#EBE6D8] flex items-center justify-center p-[6%]">
        <div className="relative w-[58%] aspect-[3/2] -rotate-90 origin-center">
          <div className="absolute left-0 top-0 bottom-0 w-[20%] bg-[#2A2520] rounded-l-md" />
          <div className="absolute left-[20%] top-[6%] right-0 bottom-[6%] rounded-r-[4px]" style={{ backgroundColor: p }}>
            <div className="absolute inset-0 flex items-center justify-center text-white rotate-90">
              <div className="text-center">
                <div className="text-[6px] uppercase tracking-[0.22em] opacity-80">{brand.name}</div>
                <div className="text-[10px] font-serif font-bold">SERUM</div>
                <div className="text-[3.5px] mt-0.5 opacity-70">30 ml</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 15 — Storefront Awning. Storefront facade with awning.
    (
      <div className="w-full h-full bg-[#E5E0D2] flex items-end p-0">
        <div className="w-full">
          <div className="h-[28px] relative" style={{ background: `repeating-linear-gradient(90deg, ${p} 0px, ${p} 16px, #fff 16px, #fff 32px)` }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white px-3 py-1 rounded-sm text-[6px] uppercase tracking-[0.22em] font-bold" style={{ color: p }}>{brand.name}</div>
            </div>
          </div>
          <div className="bg-[#F4EFE0] h-[80px] flex">
            <div className="flex-1 border-r border-[#D2CBB6] flex items-end justify-center p-2">
              <div className="w-full h-[80%] bg-[#1A1A1A] rounded-t-sm flex items-center justify-center">
                <BrandLogo brand={brand} size="sm" color="#ffffff" />
              </div>
            </div>
            <div className="w-[30%] border-l-2" style={{ borderColor: p }}>
              <div className="h-full bg-white flex items-center justify-center">
                <div className="text-[5px] uppercase tracking-[0.22em] text-gray-500">OPEN</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 16 — Subway Ad. Backlit transit advertisement panel.
    (
      <div className="w-full h-full bg-[#0A0F12] flex items-center justify-center p-[6%]">
        <div className="relative w-[78%] h-[72%] bg-[#1F2429] border-2 border-[#33393F] flex">
          <div className="w-[60%] h-full p-[5%] flex flex-col justify-between" style={{ backgroundColor: p }}>
            <div className="text-white text-[5px] uppercase tracking-[0.3em]">{brand.name}</div>
            <div>
              <div className="text-white text-[14px] font-bold leading-[1.05]">Now boarding.</div>
              <div className="text-white/80 text-[5px] uppercase tracking-[0.2em] mt-1">{brand.name.toLowerCase()}.com</div>
            </div>
            <BrandLogo brand={brand} size="sm" color="#ffffff" />
          </div>
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-[40px] font-bold" style={{ color: p }}>{init}</div>
          </div>
        </div>
      </div>
    ),

    // 17 — Bus Stop Poster. Vertical poster in a glass case.
    (
      <div className="w-full h-full bg-[#3F4348] flex items-end justify-center p-[3%]">
        <div className="relative w-[36%] h-[94%] bg-[#0F0F0F] p-[3px]">
          <div className="w-full h-full bg-white relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[55%]" style={{ background: `linear-gradient(180deg, ${p} 0%, ${p}AA 100%)` }} />
            <div className="absolute inset-x-0 top-[6%] flex justify-center">
              <BrandLogo brand={brand} size="md" color="#ffffff" />
            </div>
            <div className="absolute inset-x-0 top-[58%] text-center px-3">
              <div className="text-[12px] font-bold text-gray-900 leading-tight">{brand.name}</div>
              <div className="text-[5px] uppercase tracking-[0.22em] text-gray-600 mt-0.5">Coming this fall</div>
            </div>
            <div className="absolute inset-x-0 bottom-[5%] text-center text-[3.5px] uppercase tracking-[0.22em] text-gray-500">{brand.name.toLowerCase()}.com</div>
          </div>
        </div>
      </div>
    ),

    // 18 — Backpack Patch. Embroidered patch on a pack.
    (
      <div className="w-full h-full bg-[#1B1F22] flex items-center justify-center">
        <div className="w-[60%] aspect-square bg-[#2A2F32] rounded-md p-[10%] relative">
          <div className="absolute top-[8%] left-1/2 -translate-x-1/2 w-[10%] h-[8%] bg-[#3F4348] rounded-sm" />
          <div className="w-full h-full rounded border-2 border-dashed border-white/20 flex items-center justify-center">
            <div className="w-[70%] aspect-square rounded-md flex items-center justify-center" style={{ backgroundColor: p, boxShadow: 'inset 0 -3px 6px rgba(0,0,0,0.25)' }}>
              <div className="text-center">
                <BrandLogo brand={brand} size="sm" color="#ffffff" />
                <div className="text-white text-[4px] uppercase tracking-[0.25em] mt-1 opacity-80">{brand.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),

    // 19 — Concert Ticket. Tear-off ticket stub with perforation.
    (
      <div className="w-full h-full bg-[#1A1A1A] flex items-center justify-center p-[5%]">
        <div className="relative w-[78%] aspect-[5/2] flex shadow-2xl">
          <div className="w-[68%] h-full p-[4%] flex flex-col justify-between" style={{ backgroundColor: p }}>
            <div className="flex items-center justify-between">
              <BrandLogo brand={brand} size="xs" color="#ffffff" />
              <div className="text-white text-[4px] uppercase tracking-[0.22em]">Sec A · Row 12 · Seat 4</div>
            </div>
            <div>
              <div className="text-white text-[5px] uppercase tracking-[0.22em] opacity-80">{brand.name}</div>
              <div className="text-white text-[14px] font-bold leading-tight">Live · 2026</div>
            </div>
            <div className="text-white text-[3.5px] uppercase tracking-[0.22em] opacity-70">Sat · Apr 27 · 8:00 PM</div>
          </div>
          {/* perforation */}
          <div className="w-0 border-l border-dashed border-white/40 self-stretch" />
          <div className="flex-1 bg-white p-[4%] flex flex-col items-center justify-between">
            <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">Stub</div>
            <div className="text-[14px] font-bold" style={{ color: p }}>{init}</div>
            <div className="text-[3.5px] uppercase tracking-[0.22em] text-gray-500">Keep</div>
          </div>
        </div>
      </div>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const MOCKUPS_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Phone Case', category: 'Devices' },
  { idSuffix: 'ext-2', name: 'Laptop Sleeve', category: 'Devices' },
  { idSuffix: 'ext-3', name: 'Tablet Folio', category: 'Devices' },
  { idSuffix: 'ext-4', name: 'Smartwatch Face', category: 'Devices' },
  { idSuffix: 'ext-5', name: 'Hardcover Book', category: 'Print' },
  { idSuffix: 'ext-6', name: 'Magazine Spread', category: 'Print' },
  { idSuffix: 'ext-7', name: 'Hoodie Print', category: 'Apparel' },
  { idSuffix: 'ext-8', name: 'Tote Bag', category: 'Apparel' },
  { idSuffix: 'ext-9', name: 'Cap Embroidery', category: 'Apparel' },
  { idSuffix: 'ext-10', name: 'Soap Box', category: 'Print' },
  { idSuffix: 'ext-11', name: 'Notebook Cover', category: 'Print' },
  { idSuffix: 'ext-12', name: 'Coffee Cup Sleeve', category: 'Print' },
  { idSuffix: 'ext-13', name: 'Wine Bottle', category: 'Print' },
  { idSuffix: 'ext-14', name: 'Beer Can', category: 'Print' },
  { idSuffix: 'ext-15', name: 'Cosmetic Tube', category: 'Print' },
  { idSuffix: 'ext-16', name: 'Storefront Awning', category: 'Environment' },
  { idSuffix: 'ext-17', name: 'Subway Ad', category: 'Environment' },
  { idSuffix: 'ext-18', name: 'Bus Stop Poster', category: 'Environment' },
  { idSuffix: 'ext-19', name: 'Backpack Patch', category: 'Apparel' },
  { idSuffix: 'ext-20', name: 'Concert Ticket', category: 'Print' },
] as const;
