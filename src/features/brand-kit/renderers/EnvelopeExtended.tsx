import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';
import { Bind } from '@/features/brandkit/content/Bind';
import {
  defaultAddressContent,
  type AddressContent,
  type DeliverableContent,
} from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import {
  contrastOf,
  fgOn,
  fontStack,
  logoOn,
  normalizeHex,
  surface,
  type SurfaceKind,
} from './brandStyle';

/**
 * Envelopes — the `address` kind, drawn sixteen ways.
 *
 * ## What this file used to be
 *
 * 130 variants across two waves, of which the audit (`.audit/CODE.md` §7)
 * counted: "Jane Smith" 27 times here and in ~70 of the hundred wave-2
 * designs, "1234 Studio St." ×7, "567 Recipient Ave" ×16, a `$2.50 · 2026`
 * postage price, `fontFamily: 'Caveat, cursive'` welded into two designs,
 * and a fixed cream/beige stock that no brand ever chose. None of it was
 * editable: the family declared no `content` prop at all, so the kit's own
 * editor could not reach a single word on the artwork.
 *
 * ## What it is now
 *
 * Sixteen curated fronts. Every one of them paints the SAME anatomy —
 * a sender block, a recipient block, the mark, and the postage corner —
 * from `AddressContent`, through `<Bind>`, so each is a field in Quick
 * Edit and each repaints live. The other fourteen wave-1 ids and all
 * hundred wave-2 ids are archived in `curation/envelope.ts`: their ids
 * stay reserved, so a saved customization pointing at one still resolves,
 * and `variantsForCard` stops offering them.
 *
 * ## Two things worth knowing before editing a design here
 *
 * **The envelope is a DL, the tile is 1.6.** A DL envelope is 220×110mm —
 * 2:1 — while `PICKER_ASPECT_BY_LABEL` draws the Envelope card at 1.6.
 * Both are right: the tile is the CARD's shape and the paper inside it is
 * the ENVELOPE's, so the artwork is laid out at a true 2:1 and centred in
 * the 1.6 stage on the brand's own subtle ground. Do not "fix" one to the
 * other — flattening the tile would letterbox every other stationery card,
 * and squashing the paper would print an envelope nobody can buy.
 *
 * **Nothing here names a colour or a typeface.** Grounds come from
 * `surface(brand, kind)`, ink from those tokens or from `fgOn`, type from
 * `fontStack`. Brand colour is used as INK only where it was measured to
 * read on the ground it lands on (`accentInk`) — a yellow brand's primary
 * on white is a decoration, not a sentence.
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  /**
   * The deliverable's content. Typed as the whole union because the
   * dispatcher spreads whatever it was handed; anything that is not an
   * address falls back to the brand's own defaults rather than throwing.
   */
  content?: DeliverableContent;
}

/* ── Ink ──────────────────────────────────────────────────────────── */

type Ink = { bg: string; text: string; muted: string; border: string };

/**
 * A surface's ink, with the muted tone MEASURED rather than assumed.
 *
 * `pickSurfaceTokens` guarantees `text` against `bg` and nothing else —
 * `isPaletteReadable` only ever checks that pair — and on the brand
 * surfaces `textMuted` is deliberately mixed 35% toward the ground. On a
 * mid-tone brand colour that lands under 4.5:1, so a secondary address
 * line would be the one thing on the envelope a postman cannot read.
 * Where the muted tone does not clear AA it collapses to the full-strength
 * one and the hierarchy is carried by size instead.
 */
function inkFor(brand: Brand, kind: SurfaceKind): Ink {
  const t = surface(brand, kind);
  return {
    bg: t.bg,
    text: t.text,
    muted: contrastOf(t.textMuted, t.bg) >= 4.5 ? t.textMuted : t.text,
    border: t.border,
  };
}

/** Brand colour as INK, but only where it reads. Otherwise the ground's own. */
function accentInk(accent: string, ink: Ink, large = false): string {
  return contrastOf(accent, ink.bg) >= (large ? 3 : 4.5) ? accent : ink.text;
}

/* ── Design picks ─────────────────────────────────────────────────── */

/**
 * The brand a design actually paints with.
 *
 * A pick is the customer's answer for THIS deliverable, so it has to win
 * before any surface is derived — `surface()` reads `colorSystem` first
 * and the legacy scalar second, so overriding `primaryColor` alone would
 * be silently ignored by every brand that has a colour system.
 *
 * `fontId` is deliberately not applied here: it keys `MockBrand.fonts[].id`
 * and a renderer is handed the canonical `Brand`, which has no such ids.
 * The editor already applies that pick at the stage level
 * (`ScalingStage`'s `--bk-preview-font`), which is the right altitude for
 * it — one override for every renderer rather than thirty-one opinions.
 */
function brandWithPicks(brand: Brand, picks?: TemplateDesignPicks): Brand {
  const primary = normalizeHex(picks?.primaryColor);
  const secondary = normalizeHex(picks?.secondaryColor);
  if (!primary && !secondary) return brand;
  const cs = brand.colorSystem;
  const next = {
    ...brand,
    primaryColor: primary ?? brand.primaryColor,
    secondaryColor: secondary ?? brand.secondaryColor,
  } as Brand;
  if (cs) {
    next.colorSystem = {
      ...cs,
      primary: primary ? { ...cs.primary, hex: primary } : cs.primary,
      secondary:
        secondary && cs.secondary ? { ...cs.secondary, hex: secondary } : cs.secondary,
    };
  }
  return next;
}

/* ── Bound text ───────────────────────────────────────────────────── */

type LineProps = {
  path: string;
  value: string;
  /** Pixels at the 260px stage base — see `ScalingStage`. */
  size: number;
  color: string;
  font: string;
  weight?: number;
  tracking?: string;
  upper?: boolean;
  placeholder?: string;
  align?: CSSProperties['textAlign'];
};

/**
 * One bound line of an address.
 *
 * `display: block` is set inline and not by a class: `.bk-bind` is
 * `inline-block` so a long value can be clipped, and a utility class of
 * equal specificity cannot be relied on to outrank it (the letterhead
 * family learned this the same way).
 */
function Line({
  path,
  value,
  size,
  color,
  font,
  weight = 400,
  tracking,
  upper,
  placeholder,
  align,
}: LineProps) {
  return (
    <Bind
      path={path}
      value={value}
      fit="clamp"
      placeholder={placeholder}
      style={{
        display: 'block',
        maxWidth: '100%',
        fontSize: `${size}px`,
        lineHeight: 1.35,
        color,
        fontFamily: font,
        fontWeight: weight,
        letterSpacing: tracking,
        textTransform: upper ? 'uppercase' : undefined,
        textAlign: align,
      }}
    />
  );
}

type Fonts = { heading: string; body: string; mono: string };

type BlockProps = {
  c: AddressContent;
  ink: Ink;
  fonts: Fonts;
  /** Multiplies the block's type scale. 1 is the default envelope size. */
  scale?: number;
  align?: CSSProperties['textAlign'];
  /** Overrides the body face — the one design that sets an address in mono. */
  face?: keyof Fonts;
};

/** Who it is from. Name in the heading face, lines under it. */
function SenderBlock({ c, ink, fonts, scale = 1, align = 'left', face = 'body' }: BlockProps) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <Line
        path="sender.name"
        value={c.sender.name}
        size={4.6 * scale}
        color={ink.text}
        font={fonts.heading}
        weight={600}
        align={align}
        placeholder="Your company"
      />
      {c.sender.lines.map((line, i) => (
        <Line
          key={i}
          path={`sender.lines.${i}`}
          value={line}
          size={4 * scale}
          color={ink.muted}
          font={fonts[face]}
          align={align}
          placeholder="Address line"
        />
      ))}
    </div>
  );
}

/** Who it is for. The largest thing on the envelope, always. */
function RecipientBlock({ c, ink, fonts, scale = 1, align = 'left', face = 'body' }: BlockProps) {
  return (
    <div style={{ textAlign: align, minWidth: 0 }}>
      <Line
        path="recipient.name"
        value={c.recipient.name}
        size={8 * scale}
        color={ink.text}
        font={fonts.heading}
        weight={600}
        align={align}
        placeholder="Recipient name"
      />
      {c.recipient.lines.map((line, i) => (
        <Line
          key={i}
          path={`recipient.lines.${i}`}
          value={line}
          size={4.8 * scale}
          color={ink.muted}
          font={fonts[face]}
          align={align}
          placeholder="Address line"
        />
      ))}
    </div>
  );
}

/**
 * The postage corner.
 *
 * Always present, in every design, and always bound. A stamp position is
 * part of what makes a rectangle read as an envelope, and a field that
 * only some designs offer is a field a customer cannot rely on.
 */
function PostageLabel({
  c,
  ink,
  fonts,
  size = 3.4,
  align = 'center',
}: {
  c: AddressContent;
  ink: Ink;
  fonts: Fonts;
  size?: number;
  align?: CSSProperties['textAlign'];
}) {
  return (
    <Line
      path="postageLabel"
      value={c.postageLabel ?? ''}
      size={size}
      color={ink.muted}
      font={fonts.body}
      tracking="0.2em"
      upper
      align={align}
      placeholder="Postage"
    />
  );
}

/** The stamp box: a drawn frame with the postage label inside it. */
function PostageBox({
  c,
  ink,
  fonts,
  style,
}: {
  c: AddressContent;
  ink: Ink;
  fonts: Fonts;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: '15%',
        aspectRatio: '4 / 5',
        border: `0.5px dashed ${ink.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2px',
        ...style,
      }}
    >
      <PostageLabel c={c} ink={ink} fonts={fonts} size={3} />
    </div>
  );
}

/**
 * The mark, on a ground it can be seen on.
 *
 * `logoOn` scores every variant the brand owns against the ground by WCAG
 * contrast and hands back the one that reads, or nothing at all — never
 * "the primary anyway". When it hands back nothing (a brand with no asset
 * library, which is every brand in the sweep) `BrandLogo`'s own last
 * resort draws the name, and it is drawn in `fgOn`'s answer so the last
 * resort is readable too.
 */
function Mark({
  brand,
  ground,
  height = 9,
  show = true,
  tint,
}: {
  brand: Brand;
  ground: string;
  height?: number;
  show?: boolean;
  tint?: string;
}) {
  if (!show) return null;
  const logo = logoOn(brand, ground);
  if (logo) {
    return (
      <img
        src={logo.url}
        alt=""
        style={{ height: `${height}px`, width: 'auto', maxWidth: '46%', objectFit: 'contain', display: 'block' }}
      />
    );
  }
  const color = tint && contrastOf(tint, ground) >= 3 ? tint : fgOn(ground);
  return <BrandLogo brand={brand} size={height >= 14 ? 'sm' : 'xs'} color={color} />;
}

/* ── The stage ────────────────────────────────────────────────────── */

/**
 * A DL envelope centred in the card's 1.6 tile. See the file header for
 * why those two numbers differ and why neither may be changed to match.
 */
function EnvelopeStage({
  stage,
  paper,
  border,
  children,
}: {
  stage: string;
  paper: string;
  border: string;
  children: ReactNode;
}) {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ background: stage, padding: '6%' }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: '100%',
          aspectRatio: '2 / 1',
          background: paper,
          border: `0.5px solid ${border}`,
          boxShadow: '0 2px 6px -2px rgba(0,0,0,0.22)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── What every design is handed ──────────────────────────────────── */

type Ctx = {
  brand: Brand;
  c: AddressContent;
  fonts: Fonts;
  stage: string;
  paper: Ink;
  elevated: Ink;
  brandInk: Ink;
  secondInk: Ink;
  invInk: Ink;
  primary: string;
  secondary: string;
  showLogo: boolean;
};

type Design = (x: Ctx) => JSX.Element;

/* ── The sixteen ──────────────────────────────────────────────────── */

/**
 * Keyed by `templateIndex`, which is `<id> - 1`, so the surviving designs
 * keep the exact ids their saved customizations are filed under. The gaps
 * are the archived ones; `curation/envelope.ts` is the list.
 */
const DESIGNS: Record<number, Design> = {
  // ext-1 · Classic Return — the plain one, and the reference anatomy:
  // mark and sender top-left, stamp box top-right, recipient right of centre.
  0: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[5%] top-[11%] w-[38%] flex flex-col gap-[3px]">
        <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <PostageBox
        c={x.c}
        ink={x.paper}
        fonts={x.fonts}
        style={{ position: 'absolute', right: '5%', top: '11%' }}
      />
      <div className="absolute left-[44%] right-[6%] top-[52%] -translate-y-1/2">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
    </EnvelopeStage>
  ),

  // ext-2 · Brand Band — a full-width brand band along the bottom edge
  // carrying the mark; the paper above is all address.
  1: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[5%] top-[10%] w-[36%]">
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <PostageBox
        c={x.c}
        ink={x.paper}
        fonts={x.fonts}
        style={{ position: 'absolute', right: '5%', top: '10%' }}
      />
      <div className="absolute left-[44%] right-[6%] top-[48%] -translate-y-1/2">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[16%] flex items-center px-[5%]"
        style={{ background: x.brandInk.bg }}
      >
        <Mark brand={x.brand} ground={x.brandInk.bg} height={8} show={x.showLogo} />
      </div>
    </EnvelopeStage>
  ),

  // ext-3 · Top Flap — the brand colour as the envelope's own flap. The
  // triangle leaves both top corners clear, so the stamp still sits where
  // a stamp sits.
  2: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute inset-x-0 top-0 h-[42%]"
        style={{ background: x.primary, clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }}
      />
      <PostageBox
        c={x.c}
        ink={x.paper}
        fonts={x.fonts}
        style={{ position: 'absolute', right: '5%', top: '8%' }}
      />
      <div className="absolute left-[5%] bottom-[10%] w-[34%] flex flex-col gap-[3px]">
        <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <div className="absolute left-[44%] right-[6%] bottom-[12%]">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
    </EnvelopeStage>
  ),

  // ext-4 · Mono Minimal — no shape at all. One brand hairline divides
  // sender from recipient and that is the whole design.
  3: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[6%] top-[18%] w-[30%]">
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <div
        className="absolute left-[41%] top-[18%] bottom-[18%]"
        style={{ width: '0.5px', background: x.primary }}
      />
      <div className="absolute left-[47%] right-[6%] top-[24%]">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <div className="absolute right-[6%] top-[8%]">
        <PostageLabel c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
    </EnvelopeStage>
  ),

  // ext-6 · Window Frame — the recipient sits in a drawn window, the way
  // it does on a real window envelope.
  5: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[5%] top-[11%] w-[30%] flex flex-col gap-[3px]">
        <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} scale={0.9} />
      </div>
      <PostageBox
        c={x.c}
        ink={x.paper}
        fonts={x.fonts}
        style={{ position: 'absolute', right: '5%', top: '11%' }}
      />
      <div
        className="absolute left-[40%] right-[6%] top-[46%] bottom-[12%] flex items-center px-[4%]"
        style={{ background: x.elevated.bg, border: `1px solid ${x.primary}` }}
      >
        <RecipientBlock c={x.c} ink={x.elevated} fonts={x.fonts} scale={0.92} />
      </div>
    </EnvelopeStage>
  ),

  // ext-7 · Stamp Panel — a full-height brand panel on the right holding
  // the mark and the postage line, like an oversized franking block.
  6: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute right-0 top-0 bottom-0 w-[22%] flex flex-col items-center justify-center gap-[4px] px-[2%]"
        style={{ background: x.brandInk.bg }}
      >
        <Mark brand={x.brand} ground={x.brandInk.bg} height={11} show={x.showLogo} />
        <PostageLabel c={x.c} ink={x.brandInk} fonts={x.fonts} />
      </div>
      <div className="absolute left-[5%] top-[11%] w-[36%]">
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <div className="absolute left-[5%] right-[26%] bottom-[12%]">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
    </EnvelopeStage>
  ),

  // ext-9 · Editorial Index — a masthead rule and an outsized brand
  // initial. The magazine treatment, with no invented issue number.
  8: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute left-[5%] right-[5%] top-[20%]"
        style={{ height: '1.5px', background: x.primary }}
      />
      <div className="absolute left-[5%] top-[7%] right-[5%] flex items-baseline justify-between">
        <Line
          path="sender.name"
          value={x.c.sender.name}
          size={4.4}
          color={x.paper.text}
          font={x.fonts.heading}
          weight={700}
          tracking="0.22em"
          upper
          placeholder="Your company"
        />
        <PostageLabel c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
      <div
        className="absolute left-[5%] top-[30%] leading-none"
        style={{
          fontSize: '34px',
          fontFamily: x.fonts.heading,
          fontWeight: 800,
          color: accentInk(x.primary, x.paper, true),
        }}
      >
        {x.c.sender.name.charAt(0).toUpperCase()}
      </div>
      <div className="absolute left-[5%] w-[30%] bottom-[9%]">
        {x.c.sender.lines.map((line, i) => (
          <Line
            key={i}
            path={`sender.lines.${i}`}
            value={line}
            size={3.6}
            color={x.paper.muted}
            font={x.fonts.body}
            placeholder="Address line"
          />
        ))}
      </div>
      <div className="absolute left-[42%] right-[5%] bottom-[14%]">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
    </EnvelopeStage>
  ),

  // ext-12 · Half Colour — the right half is the brand's, and it is the
  // half that carries the address, so the loudest thing is the important one.
  11: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute right-0 top-0 bottom-0 w-1/2 flex flex-col justify-center gap-[4px] px-[6%]"
        style={{ background: x.brandInk.bg }}
      >
        <RecipientBlock c={x.c} ink={x.brandInk} fonts={x.fonts} />
        <PostageLabel c={x.c} ink={x.brandInk} fonts={x.fonts} align="left" />
      </div>
      <div className="absolute left-[6%] top-[14%] w-[36%] flex flex-col gap-[3px]">
        <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
    </EnvelopeStage>
  ),

  // ext-14 · Tracked Bar — a sorting strip along the bottom. The ticks
  // are drawn, not encoded: nothing here claims to be a real barcode.
  13: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[5%] top-[11%] w-[34%] flex flex-col gap-[3px]">
        <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} scale={0.9} />
      </div>
      <div className="absolute left-[44%] right-[6%] top-[42%] -translate-y-1/2">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[18%] flex items-center justify-between px-[4%] gap-[6px]"
        style={{ background: x.brandInk.bg }}
      >
        <div className="flex items-end gap-[1.5px] h-[52%]">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: '1.5px',
                height: `${55 + ((i * 17) % 45)}%`,
                background: x.brandInk.text,
              }}
            />
          ))}
        </div>
        <PostageLabel c={x.c} ink={x.brandInk} fonts={x.fonts} align="right" />
      </div>
    </EnvelopeStage>
  ),

  // ext-16 · Postage Square — the stamp itself is the graphic: a brand
  // square top-right holding the mark and the postage line.
  15: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute right-[5%] top-[9%] w-[22%] aspect-square flex flex-col items-center justify-center gap-[3px] px-[3%]"
        style={{ background: x.brandInk.bg }}
      >
        <Mark brand={x.brand} ground={x.brandInk.bg} height={10} show={x.showLogo} />
        <PostageLabel c={x.c} ink={x.brandInk} fonts={x.fonts} size={3} />
      </div>
      <div className="absolute left-[5%] top-[12%] w-[36%]">
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} scale={0.9} />
      </div>
      <div className="absolute left-[5%] right-[32%] bottom-[13%]">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
    </EnvelopeStage>
  ),

  // ext-20 · Bordered — one heavy brand rule inset from the edge, and
  // nothing else. The whole envelope reads as a frame.
  19: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute inset-[5%]" style={{ border: `1.5px solid ${x.primary}` }} />
      <div className="absolute left-[10%] top-[15%] w-[32%] flex flex-col gap-[3px]">
        <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} scale={0.9} />
      </div>
      <div className="absolute right-[10%] top-[15%]">
        <PostageLabel c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
      <div className="absolute left-[45%] right-[10%] bottom-[16%]">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
    </EnvelopeStage>
  ),

  // ext-21 · Initial Block — the left third is the brand's colour and
  // carries the sender; the paper is left free for the address.
  20: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute left-0 top-0 bottom-0 w-[34%] flex flex-col justify-between p-[4%]"
        style={{ background: x.brandInk.bg }}
      >
        <Mark brand={x.brand} ground={x.brandInk.bg} height={10} show={x.showLogo} />
        <div
          className="leading-none"
          style={{ fontSize: '30px', fontFamily: x.fonts.heading, fontWeight: 800, color: x.brandInk.text }}
        >
          {x.c.sender.name.charAt(0).toUpperCase()}
        </div>
        <SenderBlock c={x.c} ink={x.brandInk} fonts={x.fonts} scale={0.85} />
      </div>
      <div className="absolute right-[5%] top-[11%]">
        <PostageLabel c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
      <div className="absolute left-[40%] right-[6%] top-[54%] -translate-y-1/2">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
    </EnvelopeStage>
  ),

  // ext-25 · Two Tone — brand over inverted. The recipient is on the
  // dark half, where nothing competes with it.
  24: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute inset-x-0 top-0 h-[44%] flex items-center justify-between px-[5%]"
        style={{ background: x.brandInk.bg }}
      >
        <div className="flex flex-col gap-[3px] w-[46%]">
          <Mark brand={x.brand} ground={x.brandInk.bg} show={x.showLogo} />
          <SenderBlock c={x.c} ink={x.brandInk} fonts={x.fonts} scale={0.85} />
        </div>
        <PostageLabel c={x.c} ink={x.brandInk} fonts={x.fonts} align="right" />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[56%] flex items-center justify-end px-[5%]"
        style={{ background: x.invInk.bg }}
      >
        <RecipientBlock c={x.c} ink={x.invInk} fonts={x.fonts} align="right" />
      </div>
    </EnvelopeStage>
  ),

  // ext-26 · Ticket Edge — perforations bitten out of the left edge in
  // the stage's own colour, so the envelope reads as a tear-off.
  25: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-around">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              marginLeft: '-2.5px',
              background: x.stage,
            }}
          />
        ))}
      </div>
      <div className="absolute left-[8%] top-[12%] w-[32%] flex flex-col gap-[3px]">
        <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} scale={0.9} />
      </div>
      <div className="absolute right-[5%] top-[10%]">
        <PostageBox c={x.c} ink={x.paper} fonts={x.fonts} style={{ width: '48px' }} />
      </div>
      <div className="absolute left-[44%] right-[6%] bottom-[14%]">
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
    </EnvelopeStage>
  ),

  // ext-27 · Mono Address — the address set in the brand's monospace, the
  // way a sorting office prints one, under a brand rule.
  26: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[5%] top-[10%] w-[34%]">
        <SenderBlock c={x.c} ink={x.paper} fonts={x.fonts} scale={0.85} face="mono" />
      </div>
      <PostageBox
        c={x.c}
        ink={x.paper}
        fonts={x.fonts}
        style={{ position: 'absolute', right: '5%', top: '10%' }}
      />
      <div className="absolute left-[38%] right-[6%] bottom-[15%]">
        <div style={{ height: '1px', background: x.primary, marginBottom: '3px' }} />
        <RecipientBlock c={x.c} ink={x.paper} fonts={x.fonts} scale={0.92} face="mono" />
      </div>
    </EnvelopeStage>
  ),

  // ext-30 · Subtle Lux — the elevated stock, one hairline, everything
  // centred. The quiet one, and the card's default face.
  29: (x) => (
    <EnvelopeStage stage={x.stage} paper={x.elevated.bg} border={x.elevated.border}>
      <div className="absolute left-[6%] top-[11%] flex items-center gap-[4px]">
        <Mark brand={x.brand} ground={x.elevated.bg} show={x.showLogo} tint={x.primary} />
        <Line
          path="sender.name"
          value={x.c.sender.name}
          size={3.8}
          color={x.elevated.muted}
          font={x.fonts.body}
          tracking="0.24em"
          upper
          placeholder="Your company"
        />
      </div>
      <div className="absolute right-[6%] top-[11%]">
        <PostageLabel c={x.c} ink={x.elevated} fonts={x.fonts} align="right" />
      </div>
      <div
        className="absolute left-[26%] right-[26%] top-[36%]"
        style={{ height: '1px', background: x.primary }}
      />
      <div className="absolute left-[16%] right-[16%] top-[44%]">
        <RecipientBlock c={x.c} ink={x.elevated} fonts={x.fonts} align="center" />
      </div>
      <div className="absolute left-[6%] bottom-[9%] w-[40%]">
        {x.c.sender.lines.map((line, i) => (
          <Line
            key={i}
            path={`sender.lines.${i}`}
            value={line}
            size={3.4}
            color={x.elevated.muted}
            font={x.fonts.body}
            placeholder="Address line"
          />
        ))}
      </div>
    </EnvelopeStage>
  ),
};

/** The first kept design — what an archived id falls back to. */
const FALLBACK_INDEX = 0;

export function EnvelopeExtendedRenderer({ brand, templateIndex, content }: Props) {
  const address = content && content.kind === 'address' ? content : undefined;
  const picks = content?.picks;
  const painted = brandWithPicks(brand, picks);
  const c: AddressContent = address ?? defaultAddressContent(painted);

  const x: Ctx = {
    brand: painted,
    c,
    fonts: {
      heading: fontStack(painted, 'heading'),
      body: fontStack(painted, 'body'),
      mono: fontStack(painted, 'mono'),
    },
    stage: surface(painted, 'subtle').bg,
    paper: inkFor(painted, 'card'),
    elevated: inkFor(painted, 'elevated'),
    brandInk: inkFor(painted, 'brand'),
    secondInk: inkFor(painted, 'brand-secondary'),
    invInk: inkFor(painted, 'inverted'),
    primary: surface(painted, 'brand').bg,
    secondary: surface(painted, 'brand-secondary').bg,
    showLogo: picks?.showLogo !== false,
  };

  const design = DESIGNS[templateIndex] ?? DESIGNS[FALLBACK_INDEX];
  return design(x);
}

/**
 * The family's template list.
 *
 * Ids are persistence keys: the sixteen below are the surviving designs
 * and their `ext-N` numbers are unchanged. The fourteen archived wave-1
 * ids are NOT listed here — they are declared in `curation/envelope.ts`,
 * which is the one place that decides what a card offers, and removing
 * them from this array as well would make `variantsForCard` and the
 * archive disagree about which ids exist.
 */
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
