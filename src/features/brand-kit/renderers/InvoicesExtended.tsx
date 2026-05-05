import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * Invoice designs — portrait business document with header,
 * line-items, totals, footer. 22 designs here join the 8 legacy
 * invoices to bring the cosmos drilldown to 30. Each leans into
 * a different bookkeeping/document tradition: classic, modern,
 * editorial, brutalist, hand-stamped, etc.
 */
interface Props { brand: Brand; templateIndex: number }

function InvoiceFrame({ children }: { children: React.ReactNode }) {
  // Invoice paper centered in a soft slate background. Portrait
  // ratio so it reads as a document, not a card.
  return (
    <div className="w-full h-full bg-[#E5E0D2] flex items-center justify-center p-[3%]">
      <div className="bg-white shadow-md relative overflow-hidden" style={{ width: '46%', aspectRatio: '8.5 / 11' }}>
        {children}
      </div>
    </div>
  );
}

function ItemRow({ label, qty, price, color = '#444' }: { label: string; qty: string; price: string; color?: string }) {
  return (
    <div className="flex justify-between text-[3px] py-[2px] border-b border-gray-100" style={{ color }}>
      <span className="flex-1 truncate pr-2">{label}</span>
      <span className="w-[8%] text-right">{qty}</span>
      <span className="w-[14%] text-right">{price}</span>
    </div>
  );
}

export function InvoicesExtendedRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;

  const designs = [
    // 0 — Classic Pro. Clean header band, items, totals at bottom.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-0 top-0 h-[14%] flex items-center justify-between px-[6%]" style={{ backgroundColor: p, color: '#fff' }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-right">
            <div className="text-[7px] font-bold leading-none">INVOICE</div>
            <div className="text-[3px] uppercase tracking-[0.22em] mt-0.5 opacity-90">№ 0014</div>
          </div>
        </div>
        <div className="absolute inset-x-[6%] top-[18%] flex justify-between text-[3px] text-gray-700">
          <div><div className="uppercase tracking-[0.22em] text-gray-400">From</div><div className="font-semibold mt-0.5">{brand.name}</div></div>
          <div className="text-right"><div className="uppercase tracking-[0.22em] text-gray-400">To</div><div className="font-semibold mt-0.5">Acme Co.</div></div>
        </div>
        <div className="absolute inset-x-[6%] top-[32%]">
          <div className="flex text-[3px] uppercase tracking-[0.22em] text-gray-400 border-b border-gray-300 pb-1"><span className="flex-1">Item</span><span className="w-[8%] text-right">Qty</span><span className="w-[14%] text-right">Total</span></div>
          {[['Brand Strategy', '1', '$2,400'], ['Identity System', '1', '$3,800'], ['Guidelines Doc', '1', '$1,200'], ['Asset Library', '1', '$900']].map(([l, q, pr], i) => <ItemRow key={i} label={l as string} qty={q as string} price={pr as string} />)}
        </div>
        <div className="absolute right-[6%] bottom-[14%] text-right text-[3px]">
          <div className="text-gray-500">Subtotal · $8,300</div>
          <div className="text-gray-500">Tax (5%) · $415</div>
          <div className="text-[6px] font-bold mt-1" style={{ color: p }}>Total · $8,715</div>
        </div>
        <div className="absolute inset-x-[6%] bottom-[3%] text-[2.5px] text-center text-gray-400 uppercase tracking-[0.22em]">{brand.name.toLowerCase()}.com · payable in 30 days</div>
      </InvoiceFrame>
    ),

    // 1 — Side Stripe. Brand color stripe down left, items right.
    (
      <InvoiceFrame>
        <div className="absolute left-0 top-0 bottom-0 w-[14%] flex flex-col justify-between items-start px-[3%] py-[6%]" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-white text-[3px] uppercase tracking-[0.32em] [writing-mode:vertical-rl] rotate-180">{brand.name} · Invoice</div>
        </div>
        <div className="absolute left-[20%] right-[6%] top-[6%]">
          <div className="text-[8px] font-bold text-gray-900">Invoice 0014</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-0.5">due 27 · 04 · 2026</div>
        </div>
        <div className="absolute left-[20%] right-[6%] top-[24%]">
          {[['Brand Strategy', '$2,400'], ['Identity', '$3,800'], ['Guidelines', '$1,200'], ['Assets', '$900'], ['Workshop', '$700']].map(([l, pr], i) => (
            <div key={i} className="flex justify-between text-[3px] py-[2px] border-b border-gray-100"><span>{l}</span><span>{pr}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[8%] text-right text-[3px] text-gray-700">
          <div>Subtotal · $9,000</div>
          <div className="text-[5px] font-bold mt-0.5" style={{ color: p }}>Total · $9,450</div>
        </div>
      </InvoiceFrame>
    ),

    // 2 — Editorial Header. Magazine-style INVOICE wordmark.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%]">
          <div className="text-[14px] font-serif font-black tracking-tight text-gray-900">Invoice</div>
          <div className="w-full h-[1px] mt-1" style={{ backgroundColor: p }} />
          <div className="flex justify-between text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-1"><span>{brand.name}</span><span>№ 0014 · 27 / 04 / 26</span></div>
        </div>
        <div className="absolute inset-x-[6%] top-[20%] flex text-[3px]">
          <div className="flex-1"><div className="uppercase tracking-[0.22em] text-gray-400">Bill From</div><div className="text-gray-800 mt-0.5">{brand.name}<br/>1234 Studio · NY</div></div>
          <div className="flex-1 text-right"><div className="uppercase tracking-[0.22em] text-gray-400">Bill To</div><div className="text-gray-800 mt-0.5">Acme Co.<br/>567 Recipient Ave</div></div>
        </div>
        <div className="absolute inset-x-[6%] top-[36%]">
          {[['Strategy Workshop', '$2,400'], ['Identity Build', '$3,800'], ['Guidelines', '$1,200'], ['Assets', '$900']].map(([l, pr], i) => (
            <div key={i} className="flex justify-between text-[3px] py-1 border-b border-gray-100"><span className="font-serif italic text-gray-700">— {l}</span><span className="font-bold text-gray-900">{pr}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right text-[6px] font-serif font-bold" style={{ color: p }}>Total · $8,715</div>
      </InvoiceFrame>
    ),

    // 3 — Brute Force. Mono-spaced, dense black & white grid with brand-color accent.
    (
      <InvoiceFrame>
        <div className="absolute inset-0 bg-[#0F1216] text-white p-[5%] font-mono text-[3px]">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[8px]" style={{ color: p }}>{brand.name.toUpperCase()}</span>
            <span className="uppercase tracking-[0.22em] opacity-70">INVOICE 0014</span>
          </div>
          <div className="border-t border-white/30 my-2" />
          <div className="flex justify-between mb-2"><span>BILL TO · ACME CO.</span><span>DUE · 2026-04-27</span></div>
          {[['STRATEGY..............', '2400.00'], ['IDENTITY..............', '3800.00'], ['GUIDELINES............', '1200.00'], ['ASSETS................', '0900.00']].map(([l, pr], i) => (
            <div key={i} className="flex justify-between py-[1px] border-b border-white/10"><span>{l}</span><span>$ {pr}</span></div>
          ))}
          <div className="absolute right-[5%] bottom-[6%] text-right">
            <div className="text-[3px] opacity-70">SUBTOTAL · $8,300</div>
            <div className="text-[3px] opacity-70">TAX 5% · $415</div>
            <div className="text-[6px] font-bold mt-1" style={{ color: p }}>TOTAL · $8,715</div>
          </div>
        </div>
      </InvoiceFrame>
    ),

    // 4 — Stamped Paid. PAID stamp tilted in upper-right corner.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%]">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[8px] font-serif font-bold mt-2 text-gray-900">Invoice № 0014</div>
        </div>
        <div className="absolute right-[6%] top-[8%] -rotate-12 border-2 px-1 py-0.5 text-[5px] uppercase tracking-[0.22em] font-bold" style={{ borderColor: p, color: p }}>PAID</div>
        <div className="absolute inset-x-[6%] top-[28%]">
          {[['Strategy', '$2,400'], ['Identity', '$3,800'], ['Guidelines', '$1,200'], ['Assets', '$900']].map(([l, pr], i) => (
            <div key={i} className="flex justify-between text-[3px] py-1 border-b border-dashed border-gray-200"><span>{l}</span><span>{pr}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right text-[6px] font-bold" style={{ color: p }}>Total · $8,300</div>
        <div className="absolute inset-x-[6%] bottom-[3%] text-[2.5px] uppercase tracking-[0.22em] text-gray-400 text-center">— thank you —</div>
      </InvoiceFrame>
    ),

    // 5 — Two-Color Bands. Alternating brand & cream bands.
    (
      <InvoiceFrame>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="absolute inset-x-0 h-[10%]" style={{ top: `${10 + i * 10}%`, background: i % 2 === 0 ? `${p}11` : 'transparent' }} />
        ))}
        <div className="absolute inset-x-[6%] top-[6%] flex justify-between items-center">
          <div className="text-[8px] font-bold" style={{ color: p }}>INVOICE</div>
          <BrandLogo brand={brand} size="xs" />
        </div>
        <div className="absolute inset-x-[6%] top-[22%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets', 'Workshop'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[3px] px-1"><span className="text-gray-700">{l}</span><span className="font-bold">${[2400, 3800, 1200, 900, 700][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[8%] text-right text-[6px] font-bold text-gray-900">Total · $9,000</div>
      </InvoiceFrame>
    ),

    // 6 — Bottom Heavy Footer. Big colored footer carries totals.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%]">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[8px] font-bold text-gray-900 mt-2">Invoice 0014</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">due 27 / 04 / 2026</div>
        </div>
        <div className="absolute inset-x-[6%] top-[28%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[2px] border-b border-gray-100"><span>{l}</span><span>${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-[24%] flex items-center justify-between px-[6%] text-white" style={{ backgroundColor: p }}>
          <div>
            <div className="text-[3px] uppercase tracking-[0.22em] opacity-80">{brand.name}</div>
            <div className="text-[3px] opacity-80 mt-0.5">{brand.name.toLowerCase()}.com</div>
          </div>
          <div className="text-right">
            <div className="text-[3px] uppercase tracking-[0.22em] opacity-80">Total Due</div>
            <div className="text-[12px] font-bold leading-none mt-0.5">$8,300</div>
          </div>
        </div>
      </InvoiceFrame>
    ),

    // 7 — Receipt Roll. Long thin receipt feel with dashed cuts.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[12%] top-[5%] bottom-[5%] bg-[#FBF8EE] shadow-inner flex flex-col">
          <div className="text-center py-2 border-b border-dashed border-gray-300">
            <div className="text-[5px] uppercase tracking-[0.32em] font-bold" style={{ color: p }}>{brand.name.toUpperCase()}</div>
            <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-0.5">receipt 0014 · 27 · 04 · 26</div>
          </div>
          <div className="flex-1 px-3 py-2 font-mono text-[3px]">
            {['STRATEGY', 'IDENTITY', 'GUIDELINES', 'ASSETS', 'WORKSHOP'].map((l, i) => (
              <div key={i} className="flex justify-between py-[1px]"><span>{l}</span><span>$ {[2400, 3800, 1200, 900, 700][i]}.00</span></div>
            ))}
            <div className="border-t border-dashed border-gray-300 mt-2 pt-2">
              <div className="flex justify-between font-bold"><span>TOTAL</span><span>$ 9,000.00</span></div>
            </div>
          </div>
          <div className="text-center py-1 text-[2.5px] uppercase tracking-[0.22em] text-gray-400 border-t border-dashed border-gray-300">— thank you —</div>
        </div>
      </InvoiceFrame>
    ),

    // 8 — Index Card. N° style badge, editorial.
    (
      <InvoiceFrame>
        <div className="absolute left-[6%] top-[6%]">
          <div className="text-[18px] leading-none font-bold tabular-nums" style={{ color: p }}>N°<br/>014</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-1">{brand.name} · Invoice</div>
        </div>
        <div className="absolute right-[6%] top-[6%] text-right text-[3px] uppercase tracking-[0.22em] text-gray-500">due · 27 / 04 / 2026</div>
        <div className="absolute inset-x-[6%] top-[34%]">
          {['Strategy Workshop', 'Identity System', 'Guidelines Doc', 'Asset Library'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[3px] border-b border-gray-100"><span className="font-serif italic">— {l}</span><span className="font-bold">${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[8%] text-right">
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">Total Due</div>
          <div className="text-[14px] font-serif font-bold" style={{ color: p }}>$8,300</div>
        </div>
      </InvoiceFrame>
    ),

    // 9 — Color Wash Top. Pastel header with body clean below.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-0 top-0 h-[26%]" style={{ background: `linear-gradient(180deg, ${p}DD 0%, ${p}33 100%)` }} />
        <div className="absolute inset-x-[6%] top-[6%] flex justify-between text-white items-start">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
          <div className="text-right text-white">
            <div className="text-[7px] font-bold">INVOICE</div>
            <div className="text-[3px] uppercase tracking-[0.22em] mt-0.5 opacity-90">№ 0014</div>
          </div>
        </div>
        <div className="absolute inset-x-[6%] top-[32%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets', 'Workshop'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[2px] border-b border-gray-100"><span>{l}</span><span>${[2400, 3800, 1200, 900, 700][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right text-[6px] font-bold" style={{ color: p }}>Total · $9,000</div>
      </InvoiceFrame>
    ),

    // 10 — Numbered Items. Big circled numbers next to items.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%]">
          <div className="text-[8px] font-bold text-gray-900">Invoice 0014</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">{brand.name} · 27 · 04 · 26</div>
        </div>
        <div className="absolute inset-x-[6%] top-[20%] space-y-2">
          {['Strategy', 'Identity', 'Guidelines', 'Assets', 'Workshop'].map((l, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-[12px] h-[12px] rounded-full flex items-center justify-center text-[5px] font-bold" style={{ backgroundColor: p, color: '#fff' }}>{i+1}</div>
                <span className="text-[3.5px] text-gray-800">{l}</span>
              </div>
              <span className="text-[3.5px] font-bold">${[2400, 3800, 1200, 900, 700][i]}</span>
            </div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right text-[6px] font-bold" style={{ color: p }}>Total · $9,000</div>
      </InvoiceFrame>
    ),

    // 11 — Architectural Grid. Faint grid backdrop, blueprint look.
    (
      <InvoiceFrame>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: `linear-gradient(${p}22 1px, transparent 1px), linear-gradient(90deg, ${p}22 1px, transparent 1px)`, backgroundSize: '12px 12px' }} />
        <div className="absolute inset-x-[6%] top-[6%] flex justify-between items-start">
          <div>
            <div className="text-[7px] font-bold text-gray-900">INVOICE / 0014</div>
            <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">{brand.name}</div>
          </div>
          <div className="text-right text-[3px] uppercase tracking-[0.22em]" style={{ color: p }}>SCALE 1:1</div>
        </div>
        <div className="absolute inset-x-[6%] top-[26%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[3px] border-b border-dashed border-gray-300"><span>{l}</span><span className="tabular-nums">${[2400, 3800, 1200, 900][i]}.00</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right">
          <div className="text-[6px] font-bold tabular-nums" style={{ color: p }}>TOTAL · $8,300.00</div>
        </div>
      </InvoiceFrame>
    ),

    // 12 — Big Title Light. Massive thin display title.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[8%]">
          <div className="text-[18px] font-serif font-light tracking-tight text-gray-900">invoice.</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-1">{brand.name} · 27 / 04 / 2026 · № 0014</div>
        </div>
        <div className="absolute inset-x-[6%] top-[32%]">
          {['Strategy Workshop', 'Identity System', 'Guidelines Document', 'Asset Library'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[3px] border-b border-gray-100"><span>{l}</span><span className="font-bold">${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right">
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">amount due</div>
          <div className="text-[16px] font-serif font-light" style={{ color: p }}>$8,300</div>
        </div>
      </InvoiceFrame>
    ),

    // 13 — Brand Bordered. Thick brand-color border frame.
    (
      <InvoiceFrame>
        <div className="absolute inset-[5%] border-[3px]" style={{ borderColor: p }} />
        <div className="absolute inset-x-[10%] top-[10%] flex justify-between items-center">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[6px] font-bold" style={{ color: p }}>INVOICE 0014</div>
        </div>
        <div className="absolute inset-x-[10%] top-[24%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-1 border-b border-gray-200"><span>{l}</span><span>${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[10%] bottom-[12%] text-right text-[6px] font-bold" style={{ color: p }}>Total · $8,300</div>
      </InvoiceFrame>
    ),

    // 14 — Thank You Card. Personal note style.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%]">
          <div className="text-[10px] font-serif italic text-gray-900">Thank you,</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-1">— {brand.name} · Invoice 0014</div>
        </div>
        <div className="absolute inset-x-[6%] top-[24%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-1 border-b border-gray-100"><span>— {l}</span><span>${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute inset-x-[6%] bottom-[8%]">
          <div className="text-[5px] font-serif italic" style={{ color: p }}>— with gratitude</div>
          <div className="text-[6px] font-bold mt-1 text-gray-900">Total · $8,300</div>
        </div>
      </InvoiceFrame>
    ),

    // 15 — Side Totals. Items left, totals stacked right.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%] flex justify-between items-start">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 text-right">№ 0014 · 27.04.26</div>
        </div>
        <div className="absolute left-[6%] right-[36%] top-[20%]">
          <div className="text-[5px] font-bold text-gray-900 mb-1">Items</div>
          {['Strategy', 'Identity', 'Guidelines', 'Assets', 'Workshop'].map((l, i) => (
            <div key={i} className="text-[3px] py-[2px] flex justify-between border-b border-gray-100"><span>{l}</span><span>${[2400, 3800, 1200, 900, 700][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] top-[20%] w-[26%] p-2" style={{ backgroundColor: `${p}15` }}>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">Subtotal</div>
          <div className="text-[5px] font-bold">$9,000</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-1">Tax 5%</div>
          <div className="text-[5px] font-bold">$450</div>
          <div className="border-t mt-2 pt-1" style={{ borderColor: p }}>
            <div className="text-[3px] uppercase tracking-[0.22em]" style={{ color: p }}>Total</div>
            <div className="text-[8px] font-bold" style={{ color: p }}>$9,450</div>
          </div>
        </div>
      </InvoiceFrame>
    ),

    // 16 — Mono Document. Black & white, restrained editorial.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[8%] border-y-2 border-black py-1 text-center">
          <div className="text-[5px] uppercase tracking-[0.32em] font-bold">Invoice · 0014</div>
        </div>
        <div className="absolute inset-x-[6%] top-[20%]">
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mb-1">{brand.name} · 27 · 04 · 2026</div>
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[2px] border-b border-gray-200"><span>{l}</span><span>${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right border-t-2 border-black pt-1">
          <div className="text-[6px] font-bold">Total · $8,300</div>
          <div className="text-[3px] uppercase tracking-[0.22em] mt-0.5" style={{ color: p }}>net 30</div>
        </div>
      </InvoiceFrame>
    ),

    // 17 — Stamp Header. Round stamp + serif title.
    (
      <InvoiceFrame>
        <div className="absolute left-[6%] top-[6%] w-[20%] aspect-square rounded-full border-2 flex flex-col items-center justify-center text-[3px] uppercase tracking-[0.18em]" style={{ borderColor: p, color: p }}>
          <div>Invoice</div>
          <div className="font-bold text-[6px]">№ 014</div>
          <div>27.04.26</div>
        </div>
        <div className="absolute right-[6%] top-[6%] text-right">
          <BrandLogo brand={brand} size="xs" />
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500 mt-1">{brand.name}</div>
        </div>
        <div className="absolute inset-x-[6%] top-[34%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[3px] border-b border-gray-100"><span className="font-serif italic">{l}</span><span className="font-bold">${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right text-[6px] font-bold" style={{ color: p }}>Total · $8,300</div>
      </InvoiceFrame>
    ),

    // 18 — Diagonal Header. Brand-color diagonal corner.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-0 top-0 h-[24%]" style={{ background: p, clipPath: 'polygon(0 0, 100% 0, 100% 60%, 0 100%)' }} />
        <div className="absolute right-[6%] top-[6%] text-right text-white">
          <div className="text-[7px] font-bold">INVOICE</div>
          <div className="text-[3px] uppercase tracking-[0.22em] mt-0.5 opacity-90">№ 0014</div>
        </div>
        <div className="absolute left-[6%] top-[6%]"><BrandLogo brand={brand} size="xs" color="#ffffff" /></div>
        <div className="absolute inset-x-[6%] top-[30%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[2px] border-b border-gray-100"><span>{l}</span><span>${[2400, 3800, 1200, 900][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right text-[6px] font-bold" style={{ color: p }}>Total · $8,300</div>
      </InvoiceFrame>
    ),

    // 19 — Itemized Cards. Each line item is a small card.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%]">
          <div className="text-[7px] font-bold text-gray-900">Invoice 0014</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">{brand.name}</div>
        </div>
        <div className="absolute inset-x-[6%] top-[20%] space-y-1">
          {['Strategy', 'Identity', 'Guidelines', 'Assets'].map((l, i) => (
            <div key={i} className="bg-[#FBF8EE] rounded p-1.5 flex justify-between items-center">
              <div>
                <div className="text-[4px] font-bold text-gray-900">{l}</div>
                <div className="text-[2.5px] uppercase tracking-[0.22em] text-gray-500">qty 1</div>
              </div>
              <span className="text-[5px] font-bold" style={{ color: p }}>${[2400, 3800, 1200, 900][i]}</span>
            </div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right text-[6px] font-bold" style={{ color: p }}>Total · $8,300</div>
      </InvoiceFrame>
    ),

    // 20 — Centered Total. Total dominates center, items in margin.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%] text-center">
          <div className="text-[3px] uppercase tracking-[0.32em] text-gray-500">{brand.name} · invoice 0014</div>
        </div>
        <div className="absolute inset-x-[6%] top-[18%] grid grid-cols-2 gap-2 text-[3px] text-gray-700">
          {['Strategy · $2,400', 'Identity · $3,800', 'Guidelines · $1,200', 'Assets · $900'].map((s, i) => (
            <div key={i} className="border-b border-gray-100 py-1">{s}</div>
          ))}
        </div>
        <div className="absolute inset-x-0 top-[55%] text-center">
          <div className="text-[3px] uppercase tracking-[0.32em] text-gray-500">total amount due</div>
          <div className="text-[24px] font-serif font-black mt-1" style={{ color: p }}>$8,300</div>
        </div>
        <div className="absolute inset-x-[6%] bottom-[8%] text-center text-[3px] uppercase tracking-[0.22em] text-gray-500">payable in 30 days · {brand.name.toLowerCase()}.com</div>
      </InvoiceFrame>
    ),

    // 21 — Calligraphic Header. Hand-script "Invoice" big.
    (
      <InvoiceFrame>
        <div className="absolute inset-x-[6%] top-[6%]">
          <div className="text-[20px] italic font-serif" style={{ color: p, fontFamily: 'Caveat, cursive' }}>Invoice</div>
          <div className="text-[3px] uppercase tracking-[0.22em] text-gray-500">{brand.name} · № 0014 · 27 · 04 · 26</div>
        </div>
        <div className="absolute inset-x-[6%] top-[26%]">
          {['Strategy', 'Identity', 'Guidelines', 'Assets', 'Workshop'].map((l, i) => (
            <div key={i} className="flex justify-between text-[3px] py-[2px] border-b border-gray-100"><span className="font-serif italic">{l}</span><span className="font-bold">${[2400, 3800, 1200, 900, 700][i]}</span></div>
          ))}
        </div>
        <div className="absolute right-[6%] bottom-[10%] text-right">
          <div className="text-[6px] font-bold" style={{ color: p }}>Total · $9,000</div>
          <div className="text-[3px] uppercase tracking-[0.22em] mt-0.5 italic text-gray-500">— with care</div>
        </div>
      </InvoiceFrame>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

export const INVOICES_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Classic Pro', category: 'Modern' },
  { idSuffix: 'ext-2', name: 'Side Stripe', category: 'Modern' },
  { idSuffix: 'ext-3', name: 'Editorial Header', category: 'Editorial' },
  { idSuffix: 'ext-4', name: 'Brute Force', category: 'Bold' },
  { idSuffix: 'ext-5', name: 'Stamped Paid', category: 'Vintage' },
  { idSuffix: 'ext-6', name: 'Two-Color Bands', category: 'Modern' },
  { idSuffix: 'ext-7', name: 'Bottom Heavy', category: 'Bold' },
  { idSuffix: 'ext-8', name: 'Receipt Roll', category: 'Vintage' },
  { idSuffix: 'ext-9', name: 'Index Card', category: 'Editorial' },
  { idSuffix: 'ext-10', name: 'Color Wash', category: 'Modern' },
  { idSuffix: 'ext-11', name: 'Numbered Items', category: 'Modern' },
  { idSuffix: 'ext-12', name: 'Architectural', category: 'Modern' },
  { idSuffix: 'ext-13', name: 'Big Title Light', category: 'Editorial' },
  { idSuffix: 'ext-14', name: 'Brand Border', category: 'Bold' },
  { idSuffix: 'ext-15', name: 'Thank You Note', category: 'Lux' },
  { idSuffix: 'ext-16', name: 'Side Totals', category: 'Modern' },
  { idSuffix: 'ext-17', name: 'Mono Document', category: 'Minimalist' },
  { idSuffix: 'ext-18', name: 'Stamp Header', category: 'Vintage' },
  { idSuffix: 'ext-19', name: 'Diagonal Header', category: 'Bold' },
  { idSuffix: 'ext-20', name: 'Itemized Cards', category: 'Modern' },
  { idSuffix: 'ext-21', name: 'Centered Total', category: 'Editorial' },
  { idSuffix: 'ext-22', name: 'Calligraphic', category: 'Vintage' },
] as const;
