import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';
import { Bind } from '../../content/Bind';
import { defaultInvoiceContent } from '../../content/kinds';
import { formatMoney, invoiceTotals, lineItemTotal } from '../../content/compute';
import {
  contrastOf,
  fgOn,
  fontStack,
  surface,
} from '@/features/brand-kit/renderers/brandStyle';

interface InvoiceRendererProps {
  brand: Brand;
  templateIndex: number;
}

/**
 * The legacy invoice designs — `invoices-1` … `invoices-8`.
 *
 * These are the eight entries `TEMPLATE_LIBRARY` generates, and they were
 * four designs shown twice each (`invoices[templateIndex % 4]`), every one
 * of them printing a made-up client and a made-up total: "Acme Corp",
 * "#INV-0042", "$8,400.00". None of it was reachable by an edit — this
 * renderer is reached through `renderTemplateDesign`, which takes no
 * content — so the figures could not be made to agree with anything the
 * customer typed.
 *
 * All eight ids are archived in `renderers/curation/invoices.ts`; the
 * curated family is the 20 wave-1 designs in `InvoicesExtended.tsx`. What
 * remains here is ONE honest sheet, drawn from the brand's own defaults
 * (`defaultInvoiceContent`) with its totals computed rather than typed, so
 * the Classic module page still renders a real document if anything asks.
 *
 * `Bind` with no provider above it is an ordinary span, which is exactly
 * what this path gets — the declaration costs nothing here and means the
 * sheet is already shaped correctly if these designs are ever brought back
 * through a content-carrying dispatch.
 */
export function InvoiceRenderer({ brand, templateIndex }: InvoiceRendererProps) {
  const c = defaultInvoiceContent(brand);
  const t = invoiceTotals(c);
  const money = (amount: number) => formatMoney(amount, c.currency);

  // Even indices take the brand band; odd indices the plain sheet. One
  // decision, so the eight ids are not eight copies of one picture.
  const banded = templateIndex % 2 === 0;
  const card = surface(brand, 'card');
  const bandBg = brand.primaryColor ?? card.text;
  const bandInk = fgOn(bandBg);
  const ink = card.text;
  const quiet = contrastOf(card.textMuted, card.bg) >= 4.5 ? card.textMuted : ink;
  const accent = contrastOf(bandBg, card.bg) >= 4.5 ? bandBg : ink;
  const head = fontStack(brand, 'heading');
  const body = fontStack(brand, 'body');
  const micro = {
    fontSize: 6,
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    lineHeight: 1.4,
  } as const;

  return (
    <div
      className="w-full h-full flex flex-col overflow-hidden"
      style={{ background: card.bg, color: ink, fontFamily: body }}
    >
      <div
        className="flex items-center justify-between px-[7%] py-[4%]"
        style={
          banded
            ? { background: bandBg, color: bandInk }
            : { borderBottom: `2px solid ${accent}` }
        }
      >
        <BrandLogo brand={brand} size="sm" color={banded ? bandInk : accent} />
        <div className="text-right">
          <div style={{ fontFamily: head, fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>
            Invoice
          </div>
          <div style={{ ...micro, color: banded ? bandInk : quiet }}>
            № <Bind path="number" value={c.number} />
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-[8px] px-[7%] pt-[5%] pb-[5%]">
        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <div style={{ ...micro, color: quiet }}>From</div>
            <div style={{ fontSize: 7, fontWeight: 600 }}>
              <Bind path="issuerName" value={c.issuerName} />
            </div>
            <div style={{ fontSize: 7, color: quiet }}>
              <Bind path="issuerAddress" value={c.issuerAddress} fit="wrap" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ ...micro, color: quiet }}>Bill to</div>
            <div style={{ fontSize: 7, fontWeight: 600 }}>
              <Bind path="clientName" value={c.clientName} />
            </div>
            <div style={{ fontSize: 7, color: quiet }}>
              <Bind path="clientAddress" value={c.clientAddress} fit="wrap" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="min-w-0 flex-1">
            <div style={{ ...micro, color: quiet }}>Issued</div>
            <div style={{ fontSize: 7 }}>
              <Bind path="issueDate" value={c.issueDate} />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div style={{ ...micro, color: quiet }}>Due</div>
            <div style={{ fontSize: 7 }}>
              <Bind path="dueDate" value={c.dueDate} />
            </div>
          </div>
        </div>

        <div style={{ fontSize: 7 }}>
          {c.lineItems.slice(0, 4).map((item, i) => (
            <div
              key={item.id}
              className="flex gap-2 items-baseline"
              style={{ borderBottom: `1px solid ${card.border}`, paddingTop: 3, paddingBottom: 3 }}
            >
              <span className="flex-1 min-w-0 truncate">
                <Bind path={`lineItems.${i}.label`} value={item.label} />
              </span>
              <span className="w-[12%] text-right">
                <Bind path={`lineItems.${i}.qty`} value={String(item.qty)} />
              </span>
              <span className="w-[24%] text-right" style={{ color: quiet }}>
                <Bind path={`lineItems.${i}.unitPrice`} value={money(item.unitPrice)} />
              </span>
              <span className="w-[26%] text-right" style={{ fontWeight: 600 }}>
                {money(lineItemTotal(item))}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div style={{ fontSize: 6.5, color: quiet }} className="flex-1 min-w-0">
            <Bind path="notes" value={c.notes} fit="wrap" />
          </div>
          <div className="text-right shrink-0">
            <div style={{ fontSize: 7, color: quiet }}>Subtotal · {money(t.subtotal)}</div>
            {t.tax > 0 && <div style={{ fontSize: 7, color: quiet }}>Tax · {money(t.tax)}</div>}
            <div style={{ ...micro, color: quiet, marginTop: 2 }}>Total due</div>
            <div style={{ fontFamily: head, fontSize: 15, fontWeight: 700, color: accent }}>
              {money(t.total)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
