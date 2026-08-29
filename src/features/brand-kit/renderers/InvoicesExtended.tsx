import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';
import { Bind } from '@/features/brandkit/content/Bind';
import { defaultInvoiceContent, type InvoiceContent, type WithPicks } from '@/features/brandkit/content/kinds';
import {
  formatMoney,
  formatPercent,
  invoiceTotals,
  lineItemTotal,
  type InvoiceTotals,
} from '@/features/brandkit/content/compute';
import {
  brandColors,
  contrastOf,
  fgOn,
  fontStack,
  normalizeHex,
  surface,
} from './brandStyle';

/**
 * Invoice designs — A4 portrait, one sheet per design.
 *
 * Three things changed here in the W1 conversion, and each was a defect:
 *
 *   1. **The sheet is the artwork.** These designs used to draw a 46%-wide
 *      page floating on a hardcoded `#E5E0D2` desk, so a card whose whole
 *      job is to show an invoice showed a ~120px document inside a 260px
 *      beige tile with 3px type in it (`.audit/OURS.md` D24). The card's
 *      aspect is ALREADY A4 portrait — `aspectForLabel('Invoice')` is
 *      1/1.414 — so the page fills the tile and the type is sized for the
 *      260 × 368 stage `ScalingStage` renders at.
 *   2. **Every figure is derived.** Designs 9-22 printed `$8,300` and a
 *      four-item array as literals, so an edited price left the total
 *      saying what it had always said. Every design now maps
 *      `content.lineItems` and takes its numbers from `invoiceTotals`.
 *   3. **Colour and type are the brand's.** No `#E5E0D2`, no
 *      `text-gray-500`, no `font-serif`, no welded `'Caveat, cursive'`.
 *      Surfaces come from `surface()`, typefaces from `fontStack()`, and
 *      every brand-coloured piece of text is checked against the ground it
 *      sits on before it is painted (`onGround`).
 *
 * Layout is in FLOW, not absolute percentages. The designs that collided
 * with themselves did so because a header's real height and the offset the
 * block below it assumed were two independent guesses; a column cannot
 * disagree with itself.
 */
interface Props {
  brand: Brand;
  templateIndex: number;
  /**
   * Structured invoice content. Absent (the drilldown grid, an offscreen
   * export) the renderer paints the brand-derived defaults, which is what
   * `hydrateContent` would have produced anyway.
   */
  content?: InvoiceContent & WithPicks;
}

/* ── Colour plumbing ──────────────────────────────────────────────── */

function channels(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? '#000000';
  return [
    Number.parseInt(h.slice(1, 3), 16),
    Number.parseInt(h.slice(3, 5), 16),
    Number.parseInt(h.slice(5, 7), 16),
  ];
}

/** `t` of `a` over `b`. Both normalised on the way in and out. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const c = (x: number, y: number) =>
    Math.round(x * t + y * (1 - t))
      .toString(16)
      .padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/**
 * A quieter ink that still READS.
 *
 * `palette.text.muted` is not safe to print at 7px: in light mode it is
 * an L51 grey, which is ~4:1 on white and fails AA for body copy. So the
 * secondary ink is BLENDED from the surface's own guaranteed heading ink
 * towards its background, and the blend stops at the first step that
 * clears 4.5:1 — the lightest grey this surface can actually carry.
 */
function quietInk(ink: string, bg: string): string {
  for (const t of [0.55, 0.65, 0.75, 0.85]) {
    const candidate = mix(ink, bg, t);
    if (contrastOf(candidate, bg) >= 4.5) return candidate;
  }
  return ink;
}

/**
 * A brand colour used as INK, or the readable fallback.
 *
 * A brand whose primary is pale yellow cannot letter its total in it, and
 * the answer is not "print it anyway" — it is black or white, chosen by
 * `fgOn`. `large` relaxes the threshold to WCAG's 3:1 for text ≥ 24px,
 * which is the only place these designs use it.
 */
function onGround(color: string, bg: string, large = false): string {
  return contrastOf(color, bg) >= (large ? 3 : 4.5) ? color : fgOn(bg);
}

/** One ground and everything that may be printed on it. */
type Sheet = {
  bg: string;
  ink: string;
  quiet: string;
  line: string;
  /** The brand colour, if it reads here; the readable foreground if not. */
  accent: string;
};

type Ink = {
  paper: Sheet;
  /** The brand's primary as a filled band. */
  band: Sheet;
  /** The brand's secondary as a filled band. */
  alt: Sheet;
  /** A pale brand-tinted panel on the paper. */
  tint: Sheet;
  /** The brand's near-black. */
  dark: Sheet;
  head: string;
  body: string;
  mono: string;
  /** `picks.showLogo === false` removes every logo from the artwork. */
  showLogo: boolean;
  /** `picks.logoColor`, or the brand colour that reads on paper. */
  logoInk: string;
};

function sheetOn(bg: string, ink: string, brandColor: string, line?: string): Sheet {
  return {
    bg,
    ink,
    quiet: quietInk(ink, bg),
    line: line ?? mix(ink, bg, 0.16),
    accent: onGround(brandColor, bg),
  };
}

/**
 * Every colour and typeface this family paints with, decided once.
 *
 * `content.picks` wins where it answers: a customer who chose a colour for
 * THIS invoice gets it, and the contrast rules are then applied to their
 * choice exactly as they are to the brand's own. `picks.fontId` is
 * deliberately not read — it names a font on the Setup-shaped `MockBrand`,
 * and a renderer is handed the canonical `Brand`, which has no such id to
 * resolve it against.
 */
function invoiceInk(brand: Brand, content: InvoiceContent & WithPicks): Ink {
  const picks = content.picks;
  const colors = brandColors(brand);
  const primary = normalizeHex(picks?.primaryColor) ?? colors.primary;
  const secondary = normalizeHex(picks?.secondaryColor) ?? colors.secondary;

  const card = surface(brand, 'card');
  const subtle = surface(brand, 'subtle');
  const inverted = surface(brand, 'inverted');

  const paper = sheetOn(card.bg, card.text, primary, card.border);
  const tint = sheetOn(subtle.bg, subtle.text, primary, subtle.border);
  const dark = sheetOn(inverted.bg, inverted.text, primary);
  const band = sheetOn(primary, fgOn(primary), fgOn(primary));
  const alt = sheetOn(secondary, fgOn(secondary), fgOn(secondary));

  return {
    paper,
    band,
    alt,
    tint,
    dark,
    head: fontStack(brand, 'heading'),
    body: fontStack(brand, 'body'),
    mono: fontStack(brand, 'mono'),
    showLogo: picks?.showLogo !== false,
    logoInk: normalizeHex(picks?.logoColor) ?? paper.accent,
  };
}

/* ── The parts every design is built from ─────────────────────────── */

/** What a design body is handed. */
type Ctx = {
  brand: Brand;
  c: InvoiceContent;
  t: InvoiceTotals;
  k: Ink;
  money: (amount: number) => string;
};

const MICRO: CSSProperties = {
  fontSize: 6,
  lineHeight: 1.35,
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
};

const BODY_PX = 7;

function Micro({
  children,
  color,
  style,
  className,
}: {
  children: ReactNode;
  color: string;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div className={className} style={{ ...MICRO, color, ...style }}>
      {children}
    </div>
  );
}

/**
 * The logo, or the space it would have taken.
 *
 * `BrandLogo` sizes by HEIGHT and leaves the width to the artwork, which
 * is right on a full-width masthead and wrong inside a column: Raqm's
 * wordmark drawn at `h-3` is about sixty pixels wide, the Side Stripe's
 * brand column is under forty, and the sheet clips its overflow — so the
 * front of the brand's own name was cut off. `max-w-full` hands the
 * shortfall to `object-contain`, which shrinks the drawing instead. It
 * can only ever narrow a logo that did not fit, so it is applied here
 * once rather than at the one call site that happened to show it.
 */
function Logo({
  brand,
  k,
  color,
  size = 'sm',
}: {
  brand: Brand;
  k: Ink;
  color: string;
  size?: 'xs' | 'sm' | 'md';
}) {
  if (!k.showLogo) return <span />;
  return <BrandLogo brand={brand} size={size} color={color} className="max-w-full" />;
}

/** A micro caption over one value. */
function Field({
  s,
  label,
  children,
  className,
  align = 'left',
}: {
  s: Sheet;
  label: string;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''} ${className ?? ''}`}>
      <Micro color={s.quiet}>{label}</Micro>
      <div
        className="truncate"
        style={{ fontSize: BODY_PX, lineHeight: 1.5, color: s.ink, marginTop: 1 }}
      >
        {children}
      </div>
    </div>
  );
}

/** Bill from · Bill to. Both parties, both addresses. */
function Parties({
  c,
  s,
  stacked = false,
}: {
  c: InvoiceContent;
  s: Sheet;
  stacked?: boolean;
}) {
  const block = (
    label: string,
    name: string,
    namePath: string,
    address: string,
    addressPath: string,
  ) => (
    <div className="min-w-0 flex-1">
      <Micro color={s.quiet}>{label}</Micro>
      <div style={{ fontSize: BODY_PX, lineHeight: 1.5, color: s.ink, marginTop: 1, fontWeight: 600 }}>
        <Bind path={namePath} value={name} />
      </div>
      <div style={{ fontSize: BODY_PX, lineHeight: 1.45, color: s.quiet }}>
        <Bind path={addressPath} value={address} fit="wrap" />
      </div>
    </div>
  );
  return (
    <div className={stacked ? 'flex flex-col gap-[6px]' : 'flex gap-3'}>
      {block('From', c.issuerName, 'issuerName', c.issuerAddress, 'issuerAddress')}
      {block('Bill to', c.clientName, 'clientName', c.clientAddress, 'clientAddress')}
    </div>
  );
}

/** № · issued · due. */
function RefRow({
  c,
  s,
  className,
}: {
  c: InvoiceContent;
  s: Sheet;
  className?: string;
}) {
  return (
    <div className={`flex gap-3 ${className ?? ''}`}>
      <Field s={s} label="Invoice">
        <Bind path="number" value={c.number} />
      </Field>
      <Field s={s} label="Issued">
        <Bind path="issueDate" value={c.issueDate} />
      </Field>
      <Field s={s} label="Due">
        <Bind path="dueDate" value={c.dueDate} />
      </Field>
    </div>
  );
}

/**
 * The line items.
 *
 * Description, quantity and rate are all bound; the amount is DERIVED
 * (`qty × unitPrice`) and deliberately is not — a figure a customer could
 * type over is a figure that can disagree with the two numbers above it.
 * Rows are capped at what the design has room for and the remainder is
 * counted, while the totals below stay computed from ALL items.
 */
function Items({
  c,
  s,
  money,
  max,
  header = true,
  rule = true,
}: {
  c: InvoiceContent;
  s: Sheet;
  money: (n: number) => string;
  max: number;
  header?: boolean;
  rule?: boolean;
}) {
  const shown = c.lineItems.slice(0, max);
  const hidden = c.lineItems.length - shown.length;
  const border = rule ? `1px solid ${s.line}` : undefined;
  return (
    <div style={{ fontSize: BODY_PX, lineHeight: 1.5, color: s.ink }}>
      {header && (
        <div className="flex gap-2" style={{ ...MICRO, color: s.quiet, borderBottom: `1px solid ${s.line}`, paddingBottom: 3 }}>
          <span className="flex-1">Description</span>
          <span className="w-[12%] text-right">Qty</span>
          <span className="w-[24%] text-right">Rate</span>
          <span className="w-[26%] text-right">Amount</span>
        </div>
      )}
      {shown.map((item, i) => (
        <div key={item.id} className="flex gap-2 items-baseline" style={{ borderBottom: border, paddingTop: 3, paddingBottom: 3 }}>
          <span className="flex-1 min-w-0 truncate">
            <Bind path={`lineItems.${i}.label`} value={item.label} />
          </span>
          <span className="w-[12%] text-right">
            <Bind path={`lineItems.${i}.qty`} value={String(item.qty)} />
          </span>
          <span className="w-[24%] text-right" style={{ color: s.quiet }}>
            <Bind path={`lineItems.${i}.unitPrice`} value={money(item.unitPrice)} />
          </span>
          <span className="w-[26%] text-right" style={{ fontWeight: 600 }}>
            {money(lineItemTotal(item))}
          </span>
        </div>
      ))}
      {hidden > 0 && (
        <div style={{ ...MICRO, color: s.quiet, paddingTop: 3 }}>+ {hidden} more</div>
      )}
    </div>
  );
}

/**
 * Subtotal · discount · tax · total. Every figure from `invoiceTotals`.
 *
 * Three of the panel's fields are only ever SEEN here, and two of them
 * were printed as plain text: "Tax 5%" and "Discount 10%" read like part
 * of the design, so a customer who wanted 20% VAT clicked the number,
 * found no control, and had to guess that "Adjustments" further down the
 * panel was the same thing. The percentages are the rates, so they bind
 * to the rates.
 *
 * The grand total binds to `currency`, which is the one honest answer for
 * it. The figure itself is DERIVED — a total a customer could type over
 * is a total that can disagree with the line items above it, which is the
 * defect this whole model exists to remove — but the currency it is
 * quoted in is genuinely theirs to choose, and the total is where a
 * reader looks to find out what currency an invoice is in.
 */
function Totals({
  ctx,
  s,
  align = 'right',
  size = 15,
  font,
  label = 'Total due',
}: {
  ctx: Ctx;
  s: Sheet;
  align?: 'left' | 'right';
  size?: number;
  font?: string;
  label?: string;
}) {
  const { c, t, k, money } = ctx;
  return (
    <div className={align === 'right' ? 'text-right' : ''} style={{ fontSize: BODY_PX, lineHeight: 1.6, color: s.quiet }}>
      <div>Subtotal · {money(t.subtotal)}</div>
      {t.discount > 0 && (
        <div>
          Discount <Bind path="discountRate" value={formatPercent(c.discountRate)} /> · −{money(t.discount)}
        </div>
      )}
      {t.tax > 0 && (
        <div>
          Tax <Bind path="taxRate" value={formatPercent(c.taxRate)} /> · {money(t.tax)}
        </div>
      )}
      <Micro color={s.quiet} style={{ marginTop: 3 }}>
        {label}
      </Micro>
      <div
        style={{
          fontFamily: font ?? k.head,
          fontSize: size,
          lineHeight: 1.1,
          fontWeight: 700,
          color: size >= 24 ? onGround(s.accent, s.bg, true) : s.accent,
        }}
      >
        <Bind path="currency" value={money(t.total)} fit="shrink" />
      </div>
    </div>
  );
}

/**
 * The discount and tax lines, without the rest of the totals block.
 *
 * Two designs draw the amount due themselves, because the amount due IS
 * their layout — a deep brand footer and a page-sized centred figure —
 * and so never went through `Totals`. Both therefore printed a total that
 * silently included the customer's tax without naming it anywhere, and
 * neither gave them any way to reach the rate. A total that is 5% larger
 * than its line items with nothing on the page saying why is not a design
 * decision, it is an invoice a client queries.
 *
 * Rendered only when there is an adjustment to state: a zero rate is not
 * a fact worth a line.
 */
function Adjustments({
  c,
  t,
  money,
  color,
  align = 'right',
}: {
  c: InvoiceContent;
  t: InvoiceTotals;
  money: (n: number) => string;
  color: string;
  align?: 'left' | 'right' | 'center';
}) {
  if (t.discount <= 0 && t.tax <= 0) return null;
  return (
    <div style={{ fontSize: 6, lineHeight: 1.45, color, textAlign: align }}>
      {t.discount > 0 && (
        <div>
          Discount <Bind path="discountRate" value={formatPercent(c.discountRate)} /> · −{money(t.discount)}
        </div>
      )}
      {t.tax > 0 && (
        <div>
          Tax <Bind path="taxRate" value={formatPercent(c.taxRate)} /> · {money(t.tax)}
        </div>
      )}
    </div>
  );
}

/** The footer note — the one piece of prose an invoice carries. */
function Notes({
  c,
  s,
  align = 'left',
  className,
}: {
  c: InvoiceContent;
  s: Sheet;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={`${align === 'center' ? 'text-center' : ''} ${className ?? ''}`}
      style={{ fontSize: 6.5, lineHeight: 1.5, color: s.quiet }}
    >
      <Bind path="notes" value={c.notes} fit="wrap" />
    </div>
  );
}

/** The sheet itself: full bleed, in flow, its own ground. */
function Page({
  s,
  k,
  children,
  style,
  className,
}: {
  s: Sheet;
  k: Ink;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`w-full h-full relative overflow-hidden flex flex-col ${className ?? ''}`}
      style={{ background: s.bg, color: s.ink, fontFamily: k.body, ...style }}
    >
      {children}
    </div>
  );
}

/** The word every one of these documents carries, in the brand's display face. */
function Title({
  k,
  color,
  size = 15,
  weight = 700,
  children = 'Invoice',
  style,
}: {
  k: Ink;
  color: string;
  size?: number;
  weight?: number;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div style={{ fontFamily: k.head, fontSize: size, lineHeight: 1.05, fontWeight: weight, color, ...style }}>
      {children}
    </div>
  );
}

/* ── The designs ──────────────────────────────────────────────────── */

export function InvoicesExtendedRenderer({ brand, templateIndex, content }: Props) {
  const c = content ?? defaultInvoiceContent(brand);
  const t = invoiceTotals(c);
  const k = invoiceInk(brand, c);
  const money = (amount: number) => formatMoney(amount, c.currency);
  const ctx: Ctx = { brand, c, t, k, money };
  const { paper, band, alt, tint, dark } = k;

  const designs: ReactNode[] = [
    // 0 — Classic Pro. Brand header band, then the document in flow.
    (
      <Page s={paper} k={k}>
        <div className="flex items-center justify-between px-[7%] py-[4%]" style={{ background: band.bg, color: band.ink }}>
          <Logo brand={brand} k={k} color={band.ink} />
          <div className="text-right">
            <Title k={k} color={band.ink}>Invoice</Title>
            <Micro color={band.quiet} style={{ marginTop: 2 }}>
              № <Bind path="number" value={c.number} />
            </Micro>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-[10px] px-[7%] pt-[5%] pb-[4%]">
          <Parties c={c} s={paper} />
          <RefRow c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={5} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 1 — Side Stripe. A full-height brand column carries the identity.
    (
      <Page s={paper} k={k} style={{ flexDirection: 'row' }}>
        <div className="w-[16%] flex flex-col items-center justify-between px-[2.5%] py-[6%]" style={{ background: band.bg, color: band.ink }}>
          <Logo brand={brand} k={k} color={band.ink} size="xs" />
          <div style={{ ...MICRO, color: band.ink, writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            <Bind path="issuerName" value={c.issuerName} />
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-[9px] px-[8%] py-[6%]">
          <Title k={k} color={paper.ink} size={17}>Invoice</Title>
          <RefRow c={c} s={paper} />
          <Parties c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto">
            <Totals ctx={ctx} s={paper} />
            <Notes c={c} s={paper} className="mt-[6px]" />
          </div>
        </div>
      </Page>
    ),

    // 2 — Editorial Header. A magazine masthead over a plain document.
    (
      <Page s={paper} k={k}>
        <div className="px-[7%] pt-[6%]">
          <Title k={k} color={paper.ink} size={30} weight={800} style={{ letterSpacing: '-0.03em' }}>
            Invoice
          </Title>
          <div style={{ height: 2, background: paper.accent, marginTop: 4 }} />
          <div className="flex justify-between gap-2 mt-[4px]" style={{ ...MICRO, color: paper.quiet }}>
            <span className="min-w-0 truncate">
              <Bind path="issuerName" value={c.issuerName} />
            </span>
            <span className="shrink-0">
              № <Bind path="number" value={c.number} /> · <Bind path="issueDate" value={c.issueDate} />
            </span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-[10px] px-[7%] pt-[5%] pb-[5%]">
          <Parties c={c} s={paper} />
          <Field s={paper} label="Payment due">
            <Bind path="dueDate" value={c.dueDate} />
          </Field>
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} size={17} />
          </div>
        </div>
      </Page>
    ),

    // 3 — Brute Force. The brand's near-black, set in its mono face.
    (
      <Page s={dark} k={k} style={{ fontFamily: k.mono }}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <div className="flex items-center justify-between gap-2">
            <Title k={k} color={dark.accent} size={13} style={{ fontFamily: k.mono, letterSpacing: '0.04em' }}>
              <Bind path="issuerName" value={c.issuerName} fit="shrink" />
            </Title>
            <div style={{ ...MICRO, color: dark.quiet }}>
              Invoice <Bind path="number" value={c.number} />
            </div>
          </div>
          <div style={{ height: 1, background: dark.line }} />
          <Parties c={c} s={dark} />
          <RefRow c={c} s={dark} />
          <Items c={c} s={dark} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={dark} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={dark} font={k.mono} />
          </div>
        </div>
      </Page>
    ),

    // 4 — Stamped Due. The rotated stamp carries the due date, not a claim.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Logo brand={brand} k={k} color={k.logoInk} />
              <Title k={k} color={paper.ink} size={15} style={{ marginTop: 6 }}>
                Invoice № <Bind path="number" value={c.number} fit="shrink" />
              </Title>
            </div>
            <div
              className="shrink-0 text-center"
              style={{
                transform: 'rotate(-11deg)',
                border: `2px solid ${paper.accent}`,
                color: paper.accent,
                padding: '3px 6px',
                borderRadius: 3,
              }}
            >
              <div style={{ ...MICRO, color: paper.accent }}>Due</div>
              <div style={{ fontSize: 7, fontWeight: 700, lineHeight: 1.3 }}>
                <Bind path="dueDate" value={c.dueDate} fit="shrink" />
              </div>
            </div>
          </div>
          <Parties c={c} s={paper} />
          <Field s={paper} label="Issued">
            <Bind path="issueDate" value={c.issueDate} />
          </Field>
          <Items c={c} s={paper} money={money} max={4} rule={false} />
          <div style={{ borderTop: `1px dashed ${paper.line}` }} />
          <div className="mt-auto">
            <Totals ctx={ctx} s={paper} />
            <Notes c={c} s={paper} align="center" className="mt-[6px]" />
          </div>
        </div>
      </Page>
    ),

    // 5 — Two-Colour Bands. The brand's two colours as alternating rules.
    (
      <Page s={paper} k={k}>
        <div className="flex items-center justify-between px-[7%] py-[4%]" style={{ background: alt.bg, color: alt.ink }}>
          <Title k={k} color={alt.ink} size={13}>Invoice</Title>
          <Logo brand={brand} k={k} color={alt.ink} size="xs" />
        </div>
        <div style={{ height: 4, background: band.bg }} />
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] pt-[5%] pb-[5%]">
          <RefRow c={c} s={paper} />
          <Parties c={c} s={paper} />
          <div>
            {c.lineItems.slice(0, 5).map((item, i) => (
              <div
                key={item.id}
                className="flex gap-2 items-baseline px-[3px]"
                style={{
                  background: i % 2 === 0 ? tint.bg : 'transparent',
                  color: i % 2 === 0 ? tint.ink : paper.ink,
                  fontSize: BODY_PX,
                  lineHeight: 1.5,
                  paddingTop: 3,
                  paddingBottom: 3,
                }}
              >
                <span className="flex-1 min-w-0 truncate">
                  <Bind path={`lineItems.${i}.label`} value={item.label} />
                </span>
                <span className="w-[12%] text-right">
                  <Bind path={`lineItems.${i}.qty`} value={String(item.qty)} />
                </span>
                <span className="w-[24%] text-right">
                  <Bind path={`lineItems.${i}.unitPrice`} value={money(item.unitPrice)} />
                </span>
                <span className="w-[26%] text-right" style={{ fontWeight: 600 }}>
                  {money(lineItemTotal(item))}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 6 — Bottom Heavy. A deep brand footer carries the amount due.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] pt-[6%] pb-[4%]">
          <div className="flex items-start justify-between gap-2">
            <Logo brand={brand} k={k} color={k.logoInk} />
            <Field s={paper} label="Due" align="right" className="shrink-0">
              <Bind path="dueDate" value={c.dueDate} />
            </Field>
          </div>
          <Title k={k} color={paper.ink} size={15}>
            Invoice <Bind path="number" value={c.number} fit="shrink" />
          </Title>
          <Parties c={c} s={paper} />
          <Field s={paper} label="Issued">
            <Bind path="issueDate" value={c.issueDate} />
          </Field>
          <Items c={c} s={paper} money={money} max={4} />
          <Notes c={c} s={paper} className="mt-auto" />
        </div>
        <div className="flex items-end justify-between gap-3 px-[7%] py-[5%]" style={{ background: band.bg, color: band.ink }}>
          <div className="min-w-0">
            <Micro color={band.quiet}>From</Micro>
            <div style={{ fontSize: BODY_PX, lineHeight: 1.4, fontWeight: 600 }}>
              <Bind path="issuerName" value={c.issuerName} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <Adjustments c={c} t={t} money={money} color={band.quiet} />
            <Micro color={band.quiet}>Total due</Micro>
            <div style={{ fontFamily: k.head, fontSize: 22, lineHeight: 1.05, fontWeight: 700 }}>
              <Bind path="currency" value={money(t.total)} fit="shrink" />
            </div>
          </div>
        </div>
      </Page>
    ),

    // 7 — Receipt Roll. A narrow till roll on a brand-tinted counter.
    (
      <Page s={tint} k={k} className="items-center justify-center px-[10%] py-[5%]">
        <div
          className="w-full h-full flex flex-col"
          style={{ background: paper.bg, color: paper.ink, border: `1px solid ${paper.line}`, fontFamily: k.mono }}
        >
          <div className="text-center px-[6%] py-[4%]" style={{ borderBottom: `1px dashed ${paper.line}` }}>
            <div style={{ ...MICRO, color: paper.accent, fontSize: 8, fontWeight: 700 }}>
              <Bind path="issuerName" value={c.issuerName} fit="shrink" />
            </div>
            <div style={{ fontSize: 6.5, lineHeight: 1.5, color: paper.quiet, marginTop: 2 }}>
              <Bind path="issuerAddress" value={c.issuerAddress} fit="wrap" />
            </div>
            <Micro color={paper.quiet} style={{ marginTop: 3 }}>
              № <Bind path="number" value={c.number} /> · <Bind path="issueDate" value={c.issueDate} />
            </Micro>
          </div>
          <div className="flex-1 flex flex-col gap-[7px] px-[6%] py-[5%]">
            <div className="flex gap-2" style={{ fontSize: BODY_PX, lineHeight: 1.5 }}>
              <span style={{ ...MICRO, color: paper.quiet }}>To</span>
              <span className="flex-1 min-w-0 truncate">
                <Bind path="clientName" value={c.clientName} />
              </span>
            </div>
            <div style={{ fontSize: 6.5, lineHeight: 1.45, color: paper.quiet }}>
              <Bind path="clientAddress" value={c.clientAddress} fit="wrap" />
            </div>
            <Items c={c} s={paper} money={money} max={5} header={false} rule={false} />
            <div style={{ borderTop: `1px dashed ${paper.line}`, paddingTop: 5 }}>
              <Totals ctx={ctx} s={paper} align="left" size={13} font={k.mono} />
            </div>
            <div className="mt-auto flex gap-2" style={{ fontSize: BODY_PX, color: paper.quiet }}>
              <span style={{ ...MICRO, color: paper.quiet }}>Due</span>
              <span><Bind path="dueDate" value={c.dueDate} /></span>
            </div>
          </div>
          <Notes c={c} s={paper} align="center" className="px-[6%] py-[3%]" />
        </div>
      </Page>
    ),

    // 8 — Index Card. The invoice number as the artwork.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Micro color={paper.quiet}>Invoice №</Micro>
              <div style={{ fontFamily: k.head, fontSize: 40, lineHeight: 0.95, fontWeight: 800, color: onGround(paper.accent, paper.bg, true), fontVariantNumeric: 'tabular-nums' }}>
                <Bind path="number" value={c.number} fit="shrink" />
              </div>
            </div>
            <div className="shrink-0 text-right">
              <Logo brand={brand} k={k} color={k.logoInk} />
              <Field s={paper} label="Due" align="right" className="mt-[6px]">
                <Bind path="dueDate" value={c.dueDate} />
              </Field>
              <Field s={paper} label="Issued" align="right">
                <Bind path="issueDate" value={c.issueDate} />
              </Field>
            </div>
          </div>
          <Parties c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    /* 9 — Colour Wash. The brand fading out of the head of the page.

       The wash is BELOW the type, not behind it. As first drawn, the head
       was one `linear-gradient(brand → tint)` block with the type laid
       over it, and the ink was `fgOn(primary)` — chosen for the top of
       the ramp only. At the bottom of that ramp the ground is the pale
       tint, so a white "Invoice" faded into it as it fell. The contrast
       sweep could not even report it: a gradient is not one colour, so
       all three lines were skipped rather than judged, and the design
       "passed" by being unmeasurable.

       So the head is a flat brand band the ink is picked against, and the
       fade is its own strip underneath — which is what the name describes
       anyway: the brand leaving the page, not type dissolving into it. */
    (
      <Page s={paper} k={k}>
        <div className="px-[7%] pt-[6%] pb-[5%]" style={{ background: band.bg, color: band.ink }}>
          <div className="flex items-start justify-between gap-2">
            <Logo brand={brand} k={k} color={band.ink} />
            <div className="text-right">
              <Title k={k} color={band.ink} size={15}>Invoice</Title>
              <Micro color={band.ink} style={{ marginTop: 2 }}>
                № <Bind path="number" value={c.number} />
              </Micro>
            </div>
          </div>
        </div>
        <div
          aria-hidden
          style={{
            flex: '0 0 auto',
            height: '9%',
            background: `linear-gradient(180deg, ${band.bg} 0%, ${tint.bg} 55%, ${paper.bg} 100%)`,
          }}
        />
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] pt-[5%] pb-[5%]">
          <Parties c={c} s={paper} />
          <RefRow c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 10 — Numbered Items. Each line counted in a brand disc.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <div className="flex items-start justify-between gap-2">
            <Title k={k} color={paper.ink} size={15}>
              Invoice <Bind path="number" value={c.number} fit="shrink" />
            </Title>
            <Logo brand={brand} k={k} color={k.logoInk} size="xs" />
          </div>
          <RefRow c={c} s={paper} />
          <Parties c={c} s={paper} />
          <div className="flex flex-col gap-[5px]">
            {c.lineItems.slice(0, 4).map((item, i) => (
              <div key={item.id} className="flex items-center gap-2" style={{ fontSize: BODY_PX, lineHeight: 1.4 }}>
                <span
                  className="shrink-0 flex items-center justify-center"
                  style={{ width: 13, height: 13, borderRadius: 999, background: band.bg, color: band.ink, fontSize: 7, fontWeight: 700 }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0 truncate">
                  <Bind path={`lineItems.${i}.label`} value={item.label} />
                </span>
                <span className="shrink-0" style={{ color: paper.quiet }}>
                  <Bind path={`lineItems.${i}.qty`} value={String(item.qty)} /> ×{' '}
                  <Bind path={`lineItems.${i}.unitPrice`} value={money(item.unitPrice)} />
                </span>
                <span className="shrink-0" style={{ fontWeight: 600 }}>{money(lineItemTotal(item))}</span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 11 — Architectural. A drawing sheet: faint brand grid, tabular figures.
    (
      <Page s={paper} k={k}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(${tint.bg} 1px, transparent 1px), linear-gradient(90deg, ${tint.bg} 1px, transparent 1px)`,
            backgroundSize: '18px 18px',
          }}
        />
        <div className="relative flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Title k={k} color={paper.ink} size={13}>
                Invoice / <Bind path="number" value={c.number} fit="shrink" />
              </Title>
              <Micro color={paper.quiet} style={{ marginTop: 2 }}>
                <Bind path="issuerName" value={c.issuerName} />
              </Micro>
            </div>
            <Logo brand={brand} k={k} color={k.logoInk} size="xs" />
          </div>
          <div style={{ height: 1, background: paper.accent }} />
          <Parties c={c} s={paper} />
          <RefRow c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 12 — Big Title Light. One enormous, quiet word.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <Title k={k} color={paper.ink} size={44} weight={300} style={{ letterSpacing: '-0.04em' }}>
            invoice.
          </Title>
          <RefRow c={c} s={paper} />
          <Parties c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} size={26} />
          </div>
        </div>
      </Page>
    ),

    // 13 — Brand Border. The document inside a brand frame.
    (
      <Page s={paper} k={k} className="p-[4%]">
        <div className="w-full h-full flex flex-col gap-[9px] px-[6%] py-[5%]" style={{ border: `3px solid ${band.bg}` }}>
          <div className="flex items-center justify-between gap-2">
            <Logo brand={brand} k={k} color={k.logoInk} size="xs" />
            <Title k={k} color={paper.accent} size={11}>
              Invoice <Bind path="number" value={c.number} fit="shrink" />
            </Title>
          </div>
          <RefRow c={c} s={paper} />
          <Parties c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} size={13} />
          </div>
        </div>
      </Page>
    ),

    // 14 — Thank You Note. The note leads; the ledger follows.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <Title k={k} color={paper.accent} size={20} weight={400} style={{ fontStyle: 'italic' }}>
            Thank you
          </Title>
          <div style={{ fontSize: BODY_PX, lineHeight: 1.6, color: paper.ink }}>
            <Bind path="notes" value={c.notes} fit="wrap" />
          </div>
          <div style={{ height: 1, background: paper.line }} />
          <Parties c={c} s={paper} />
          <RefRow c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Logo brand={brand} k={k} color={k.logoInk} size="xs" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 15 — Side Totals. The ledger left, the arithmetic in its own panel.
    (
      <Page s={paper} k={k}>
        <div className="flex items-start justify-between gap-2 px-[7%] pt-[6%]">
          <Logo brand={brand} k={k} color={k.logoInk} />
          <Field s={paper} label="Invoice" align="right" className="shrink-0">
            <Bind path="number" value={c.number} />
          </Field>
        </div>
        <div className="flex-1 flex gap-3 px-[7%] pt-[5%] pb-[5%]">
          <div className="flex-1 min-w-0 flex flex-col gap-[8px]">
            <Parties c={c} s={paper} stacked />
            <Items c={c} s={paper} money={money} max={5} header={false} />
            <Notes c={c} s={paper} className="mt-auto" />
          </div>
          <div className="w-[38%] shrink-0 p-[8px] flex flex-col gap-[4px]" style={{ background: tint.bg, color: tint.ink }}>
            <Field s={tint} label="Issued">
              <Bind path="issueDate" value={c.issueDate} />
            </Field>
            <Field s={tint} label="Due">
              <Bind path="dueDate" value={c.dueDate} />
            </Field>
            <div style={{ height: 1, background: tint.line, margin: '3px 0' }} />
            <Totals ctx={ctx} s={tint} align="left" size={15} />
          </div>
        </div>
      </Page>
    ),

    // 16 — Mono Document. Rules and restraint; one accent line.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <div className="text-center py-[4px]" style={{ borderTop: `2px solid ${paper.ink}`, borderBottom: `2px solid ${paper.ink}` }}>
            <div style={{ ...MICRO, fontSize: 8, fontWeight: 700, color: paper.ink }}>
              Invoice · <Bind path="number" value={c.number} />
            </div>
          </div>
          <RefRow c={c} s={paper} />
          <Parties c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={5} />
          <Notes c={c} s={paper} className="mt-auto" />
          <div style={{ borderTop: `2px solid ${paper.ink}`, paddingTop: 4 }}>
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 17 — Stamp Header. A round office stamp beside the identity.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <div className="flex items-start justify-between gap-3">
            <div
              className="shrink-0 flex flex-col items-center justify-center text-center"
              style={{ width: 54, height: 54, borderRadius: 999, border: `2px solid ${paper.accent}`, color: paper.accent }}
            >
              <div style={{ ...MICRO, color: paper.accent, fontSize: 5 }}>Invoice</div>
              <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2 }}>
                <Bind path="number" value={c.number} fit="shrink" />
              </div>
              <div style={{ fontSize: 5.5, lineHeight: 1.2 }}>
                <Bind path="issueDate" value={c.issueDate} fit="shrink" />
              </div>
            </div>
            <div className="text-right min-w-0">
              <Logo brand={brand} k={k} color={k.logoInk} />
              <Field s={paper} label="Due" align="right" className="mt-[6px]">
                <Bind path="dueDate" value={c.dueDate} />
              </Field>
            </div>
          </div>
          <Parties c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 18 — Diagonal Header. The brand cut across the top corner.
    (
      <Page s={paper} k={k}>
        <div
          className="px-[7%] pt-[6%] pb-[9%] flex items-start justify-between gap-2"
          style={{ background: band.bg, color: band.ink, clipPath: 'polygon(0 0, 100% 0, 100% 66%, 0 100%)' }}
        >
          <Logo brand={brand} k={k} color={band.ink} />
          <div className="text-right">
            <Title k={k} color={band.ink} size={15}>Invoice</Title>
            <Micro color={band.ink} style={{ marginTop: 2 }}>
              № <Bind path="number" value={c.number} />
            </Micro>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] pt-[3%] pb-[5%]">
          <RefRow c={c} s={paper} />
          <Parties c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={4} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 19 — Itemised Cards. Every line its own tile.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[8px] px-[7%] py-[6%]">
          <div className="flex items-start justify-between gap-2">
            <Title k={k} color={paper.ink} size={13}>
              Invoice <Bind path="number" value={c.number} fit="shrink" />
            </Title>
            <Logo brand={brand} k={k} color={k.logoInk} size="xs" />
          </div>
          <Parties c={c} s={paper} />
          <RefRow c={c} s={paper} />
          <div className="flex flex-col gap-[4px]">
            {c.lineItems.slice(0, 4).map((item, i) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 px-[6px] py-[4px]"
                style={{ background: tint.bg, color: tint.ink, borderRadius: 4 }}
              >
                <div className="min-w-0">
                  <div className="truncate" style={{ fontSize: BODY_PX, lineHeight: 1.4, fontWeight: 600 }}>
                    <Bind path={`lineItems.${i}.label`} value={item.label} />
                  </div>
                  <Micro color={tint.quiet}>
                    <Bind path={`lineItems.${i}.qty`} value={String(item.qty)} /> ×{' '}
                    <Bind path={`lineItems.${i}.unitPrice`} value={money(item.unitPrice)} />
                  </Micro>
                </div>
                <span className="shrink-0" style={{ fontSize: 10, fontWeight: 700, color: tint.accent }}>
                  {money(lineItemTotal(item))}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),

    // 20 — Centred Total. The amount due is the page.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]">
          <div className="text-center">
            <Micro color={paper.quiet}>
              <Bind path="issuerName" value={c.issuerName} /> · Invoice{' '}
              <Bind path="number" value={c.number} />
            </Micro>
          </div>
          <Parties c={c} s={paper} />
          <RefRow c={c} s={paper} />
          <div className="text-center">
            <Micro color={paper.quiet}>Total amount due</Micro>
            <div
              style={{
                fontFamily: k.head,
                fontSize: 34,
                lineHeight: 1.1,
                fontWeight: 800,
                color: onGround(paper.accent, paper.bg, true),
                marginTop: 2,
              }}
            >
              <Bind path="currency" value={money(t.total)} fit="shrink" />
            </div>
            <Adjustments c={c} t={t} money={money} color={paper.quiet} align="center" />
          </div>
          <Items c={c} s={paper} money={money} max={4} header={false} />
          <Notes c={c} s={paper} align="center" className="mt-auto" />
        </div>
      </Page>
    ),

    // 21 — Ledger Lines. Ruled book-keeping paper, figures aligned.
    (
      <Page s={paper} k={k}>
        <div className="flex-1 flex flex-col gap-[9px] px-[7%] py-[6%]" style={{ fontVariantNumeric: 'tabular-nums' }}>
          <div className="flex items-end justify-between gap-2" style={{ borderBottom: `2px solid ${paper.accent}`, paddingBottom: 3 }}>
            <Title k={k} color={paper.ink} size={17} weight={400} style={{ fontStyle: 'italic' }}>
              Invoice
            </Title>
            <Micro color={paper.quiet}>
              № <Bind path="number" value={c.number} />
            </Micro>
          </div>
          <Parties c={c} s={paper} />
          <RefRow c={c} s={paper} />
          <Items c={c} s={paper} money={money} max={5} />
          <div className="mt-auto flex items-end justify-between gap-3">
            <Notes c={c} s={paper} className="flex-1 min-w-0" />
            <Totals ctx={ctx} s={paper} />
          </div>
        </div>
      </Page>
    ),
  ];

  return designs[templateIndex] ?? designs[0];
}

/**
 * The 22 wave-1 invoice designs.
 *
 * The array's LENGTH and ORDER are a persistence contract: `invoices-ext-N`
 * resolves to `designs[N - 1]`, so an entry is never removed and never
 * reordered. Two of them (`ext-18`, `ext-22`) are culled in
 * `renderers/curation/invoices.ts` — archiving is how a design stops being
 * offered, because it leaves the id valid for anything already saved
 * against it. Human names and filter tags live there too.
 */
export const INVOICES_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Classic Pro', category: 'Modern' },
  { idSuffix: 'ext-2', name: 'Side Stripe', category: 'Modern' },
  { idSuffix: 'ext-3', name: 'Editorial Header', category: 'Editorial' },
  { idSuffix: 'ext-4', name: 'Brute Force', category: 'Bold' },
  { idSuffix: 'ext-5', name: 'Stamped Due', category: 'Vintage' },
  { idSuffix: 'ext-6', name: 'Two-Colour Bands', category: 'Modern' },
  { idSuffix: 'ext-7', name: 'Bottom Heavy', category: 'Bold' },
  { idSuffix: 'ext-8', name: 'Receipt Roll', category: 'Vintage' },
  { idSuffix: 'ext-9', name: 'Index Card', category: 'Editorial' },
  { idSuffix: 'ext-10', name: 'Colour Wash', category: 'Modern' },
  { idSuffix: 'ext-11', name: 'Numbered Items', category: 'Modern' },
  { idSuffix: 'ext-12', name: 'Architectural', category: 'Modern' },
  { idSuffix: 'ext-13', name: 'Big Title Light', category: 'Editorial' },
  { idSuffix: 'ext-14', name: 'Brand Border', category: 'Bold' },
  { idSuffix: 'ext-15', name: 'Thank You Note', category: 'Lux' },
  { idSuffix: 'ext-16', name: 'Side Totals', category: 'Modern' },
  { idSuffix: 'ext-17', name: 'Mono Document', category: 'Minimalist' },
  { idSuffix: 'ext-18', name: 'Stamp Header', category: 'Vintage' },
  { idSuffix: 'ext-19', name: 'Diagonal Header', category: 'Bold' },
  { idSuffix: 'ext-20', name: 'Itemised Cards', category: 'Modern' },
  { idSuffix: 'ext-21', name: 'Centred Total', category: 'Editorial' },
  { idSuffix: 'ext-22', name: 'Ledger Lines', category: 'Vintage' },
] as const;
