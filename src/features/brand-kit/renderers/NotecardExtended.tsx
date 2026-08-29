import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';
import { Bind } from '@/features/brandkit/content/Bind';
import {
  defaultNoteContent,
  type DeliverableContent,
  type NoteContent,
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
 * Notecards — the `note` kind, drawn twelve ways.
 *
 * ## What this file used to be
 *
 * 130 variants across two waves. The card was drawn as a folded spread
 * whose right half said "— inside —" in grey italic, so half of every
 * tile was a caption about the tile. The left half carried invented
 * greetings ("Hi.", "thank you.", "Hello, Jane."), a signature reading
 * "Jane", an issue number, a season, and `fontFamily: 'Caveat, cursive'`
 * — a typeface belonging to nobody's brand — while the actual note, the
 * words a customer would send, existed nowhere and could not be typed.
 *
 * ## What it is now
 *
 * Twelve card faces. A notecard's content is three things — a greeting,
 * a message and a sign-off — and every design paints all three from
 * `NoteContent` through `<Bind>`, so each is a live field. The fold is
 * gone: what is drawn is the face that carries the writing, because that
 * is the face the content describes. The other eighteen wave-1 ids and
 * all hundred wave-2 ids are archived in `curation/notecard.ts` with
 * their ids reserved.
 *
 * ## Notecard is not in the catalog — yet
 *
 * `legacy-mapping.ts`'s `MAP` has no Notecard card, so `variantsForCard`
 * returns nothing for it and nothing here is reachable from the Brand Kit
 * page today. It is converted anyway, and deliberately: the family is
 * wired into the renderer dispatch and the template list, so adding the
 * card is a one-line `MAP.stationery` entry rather than a conversion.
 * That is also why this family's bind test builds its own template list
 * from `NOTECARD_EXTENDED` instead of going through `variantsForCard` —
 * see `__tests__/notecard.bind.test.tsx`.
 *
 * Sizing and colour follow the same two rules as the envelope family: the
 * card is laid out at its real proportion (A6, ~1.41) inside the 1.6 tile
 * on the brand's own subtle ground, and no ground, ink or typeface is
 * named here — they come from `surface`, `fgOn`/measured tokens, and
 * `fontStack`.
 */

interface Props {
  brand: Brand;
  templateIndex: number;
  /** The deliverable's content; anything that is not a note is ignored. */
  content?: DeliverableContent;
}

/* ── Ink ──────────────────────────────────────────────────────────── */

type Ink = { bg: string; text: string; muted: string; border: string };

/**
 * A surface's ink, with the muted tone measured against its own ground.
 *
 * `pickSurfaceTokens` only guarantees `text` against `bg`; on the brand
 * surfaces `textMuted` is mixed 35% toward the ground and can land under
 * AA. Where it does, it collapses to the full-strength tone — a note's
 * sign-off is short, and a short line that cannot be read is worse than
 * one that is not quieter than the message above it.
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

/**
 * Brand colour as ink, but only where it reads on this ground.
 *
 * The floor comes from the SIZE the caller will really render at rather
 * than from a boolean, because the boolean drifted from the type it was
 * describing: `ext-2` asked for the large floor (3:1) and then set its
 * greeting at 15px, which WCAG counts as normal text however bold it is.
 * SKAM's red cleared 3.76:1, passed, and shipped a greeting under AA.
 *
 * Large is ≥ 24px, or ≥ 18.66px at weight ≥ 700 — the same rule
 * `__guards__/contrast.ts` measures with, so the design and the guard
 * cannot disagree about what a heading is.
 */
function accentInk(accent: string, ink: Ink, sizePx = 12, weight = 400): string {
  const large = sizePx >= 24 || (sizePx >= 18.66 && weight >= 700);
  return contrastOf(accent, ink.bg) >= (large ? 3 : 4.5) ? accent : ink.text;
}

/**
 * The brand a design paints with, after the customer's own picks.
 *
 * See `EnvelopeExtended.tsx` for why the colour system is rewritten and
 * not just the legacy scalar, and why `fontId` is applied at the stage
 * rather than here.
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

type Fonts = { heading: string; body: string; mono: string };

/**
 * The greeting. One line, so it clamps rather than wraps: a greeting that
 * ran onto a second line would push the message off the card.
 */
function Greeting({
  c,
  ink,
  fonts,
  size = 9,
  color,
  align,
  weight = 600,
  tracking,
  upper,
}: {
  c: NoteContent;
  ink: Ink;
  fonts: Fonts;
  size?: number;
  color?: string;
  align?: CSSProperties['textAlign'];
  weight?: number;
  tracking?: string;
  upper?: boolean;
}) {
  return (
    <Bind
      path="greeting"
      value={c.greeting}
      fit="clamp"
      placeholder="Hello,"
      style={{
        display: 'block',
        maxWidth: '100%',
        fontSize: `${size}px`,
        lineHeight: 1.2,
        fontFamily: fonts.heading,
        fontWeight: weight,
        letterSpacing: tracking,
        textTransform: upper ? 'uppercase' : undefined,
        color: color ?? ink.text,
        textAlign: align,
      }}
    />
  );
}

/**
 * The note itself. Wraps, and is multiline — Enter inside it inserts a
 * paragraph break rather than committing, because that is what writing a
 * note is.
 */
function Message({
  c,
  ink,
  fonts,
  size = 4.2,
  color,
  align,
  lines = 5,
}: {
  c: NoteContent;
  ink: Ink;
  fonts: Fonts;
  size?: number;
  color?: string;
  align?: CSSProperties['textAlign'];
  /** Rows of space the design reserves, so an empty note is not a hole. */
  lines?: number;
}) {
  return (
    <Bind
      path="message"
      value={c.message}
      fit="wrap"
      multiline
      placeholder="Write your note…"
      style={{
        display: 'block',
        fontSize: `${size}px`,
        lineHeight: 1.65,
        fontFamily: fonts.body,
        color: color ?? ink.muted,
        textAlign: align,
        minHeight: `${(size * 1.65 * lines).toFixed(1)}px`,
      }}
    />
  );
}

function SignOff({
  c,
  ink,
  fonts,
  size = 4.4,
  color,
  align,
  weight = 500,
}: {
  c: NoteContent;
  ink: Ink;
  fonts: Fonts;
  size?: number;
  color?: string;
  align?: CSSProperties['textAlign'];
  weight?: number;
}) {
  return (
    <Bind
      path="signOff"
      value={c.signOff}
      fit="clamp"
      placeholder="— Your brand"
      style={{
        display: 'block',
        maxWidth: '100%',
        fontSize: `${size}px`,
        lineHeight: 1.35,
        fontFamily: fonts.heading,
        fontWeight: weight,
        color: color ?? ink.text,
        textAlign: align,
      }}
    />
  );
}

/** The mark, on a ground it was measured against. See the envelope file. */
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
        style={{ height: `${height}px`, width: 'auto', maxWidth: '52%', objectFit: 'contain', display: 'block' }}
      />
    );
  }
  const color = tint && contrastOf(tint, ground) >= 3 ? tint : fgOn(ground);
  return <BrandLogo brand={brand} size={height >= 14 ? 'sm' : 'xs'} color={color} />;
}

/* ── The stage ────────────────────────────────────────────────────── */

/**
 * An A6 card (~1.41) centred in the 1.6 tile.
 *
 * The width is 72% rather than the 92% the envelope uses because a card
 * is nearly square: at any more, its height would exceed what the tile
 * leaves once the stage's own padding is taken, and the card would be
 * cropped by the tile rather than sitting in it.
 */
function CardStage({
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
      style={{ background: stage, padding: '5%' }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: '72%',
          aspectRatio: '1.41 / 1',
          background: paper,
          border: `0.5px solid ${border}`,
          boxShadow: '0 3px 8px -3px rgba(0,0,0,0.25)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

type Ctx = {
  brand: Brand;
  c: NoteContent;
  fonts: Fonts;
  stage: string;
  paper: Ink;
  elevated: Ink;
  brandInk: Ink;
  invInk: Ink;
  primary: string;
  showLogo: boolean;
};

type Design = (x: Ctx) => JSX.Element;

/* ── The twelve ───────────────────────────────────────────────────── */

/** Keyed by `templateIndex` (`<id> - 1`); the gaps are archived ids. */
const DESIGNS: Record<number, Design> = {
  // ext-1 · Centred Mark — everything on the centre line. The plain one.
  0: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute inset-x-[12%] top-[10%] bottom-[10%] flex flex-col items-center justify-center gap-[4px] text-center">
        <div className="flex justify-center w-full">
          <Mark brand={x.brand} ground={x.paper.bg} show={x.showLogo} tint={x.primary} />
        </div>
        <Greeting c={x.c} ink={x.paper} fonts={x.fonts} align="center" />
        <Message c={x.c} ink={x.paper} fonts={x.fonts} align="center" lines={4} />
        <SignOff c={x.c} ink={x.paper} fonts={x.fonts} align="center" />
      </div>
    </CardStage>
  ),

  // ext-2 · Open Greeting — the greeting set large in brand ink, the
  // note beneath it in a narrow column.
  1: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[9%] right-[9%] top-[11%]">
        <Greeting
          c={x.c}
          ink={x.paper}
          fonts={x.fonts}
          size={15}
          weight={700}
          color={accentInk(x.primary, x.paper, 15, 700)}
        />
      </div>
      <div className="absolute left-[9%] right-[30%] top-[36%]">
        <Message c={x.c} ink={x.paper} fonts={x.fonts} lines={4} />
      </div>
      <div className="absolute left-[9%] bottom-[10%]">
        <Mark brand={x.brand} ground={x.paper.bg} height={8} show={x.showLogo} tint={x.primary} />
      </div>
      <div className="absolute right-[9%] bottom-[10%] max-w-[52%]">
        <SignOff c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
    </CardStage>
  ),

  // ext-3 · Colour Block — a brand panel down the left carrying the mark
  // and the sign-off; the writing gets the clean side.
  2: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute left-0 top-0 bottom-0 w-[38%] flex flex-col justify-between p-[6%]"
        style={{ background: x.brandInk.bg }}
      >
        <Mark brand={x.brand} ground={x.brandInk.bg} height={10} show={x.showLogo} />
        <SignOff c={x.c} ink={x.brandInk} fonts={x.fonts} size={4} />
      </div>
      <div className="absolute left-[44%] right-[7%] top-[14%] bottom-[12%] flex flex-col gap-[5px]">
        <Greeting c={x.c} ink={x.paper} fonts={x.fonts} size={8} />
        <Message c={x.c} ink={x.paper} fonts={x.fonts} size={3.9} lines={5} />
      </div>
    </CardStage>
  ),

  /* ext-5 · Embossed Mark — the brand's own mark pressed into the stock
     behind the writing, the way a blind deboss shows on good card.

     It used to be an INITIAL: a 58px letter with `color: transparent` and
     a one-pixel stroke, taken from the first letter of the sign-off. Two
     things were wrong with it and they are the same thing. It was a text
     node that could never read — the contrast sweep measured the
     transparent fill against the paper and got 1.00:1, and no stroke
     weight fixes that, because an emboss on cream stock genuinely sits
     around 1.3:1 in life. And at the 260px tile the card is authored for
     it contributed nothing at all, which left the design indistinguishable
     from the plain ones.

     A debossed MARK says the same thing without pretending to be type:
     it is artwork, so it is judged as artwork, and it is the brand's
     rather than a letter borrowed from a sign-off nobody wrote yet. The
     opacity is a real deboss weight, not a hiding place — at tile size it
     reads as a watermark, which is what it is.

     It is drawn ONLY where the brand has real artwork. `Mark` falls back
     to `BrandLogo`, which sets the brand's NAME as type, and a name at
     14% opacity is the invisible-text problem all over again wearing a
     different hat. A deboss needs something to deboss. */
  4: (x) => (
    <CardStage stage={x.stage} paper={x.elevated.bg} border={x.elevated.border}>
      {x.showLogo && logoOn(x.brand, x.elevated.bg) && (
        <div
          aria-hidden
          className="absolute right-[6%] bottom-[8%] pointer-events-none"
          style={{ opacity: 0.14 }}
        >
          <Mark brand={x.brand} ground={x.elevated.bg} height={38} show />
        </div>
      )}
      <div className="absolute left-[9%] right-[9%] top-[13%] flex flex-col gap-[5px]">
        <Greeting c={x.c} ink={x.elevated} fonts={x.fonts} size={8.5} />
        <Message c={x.c} ink={x.elevated} fonts={x.fonts} lines={4} />
      </div>
      <div className="absolute left-[9%] bottom-[11%]">
        <SignOff c={x.c} ink={x.elevated} fonts={x.fonts} />
      </div>
    </CardStage>
  ),

  // ext-8 · Folded Edge — a narrow brand band down the binding edge,
  // the way a folded card shows its spine.
  7: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute left-0 top-0 bottom-0 w-[7%]"
        style={{ background: x.primary }}
      />
      <div className="absolute left-[15%] right-[9%] top-[13%] flex flex-col gap-[5px]">
        <Greeting c={x.c} ink={x.paper} fonts={x.fonts} size={8.5} />
        <Message c={x.c} ink={x.paper} fonts={x.fonts} lines={4} />
      </div>
      <div className="absolute left-[15%] right-[9%] bottom-[11%] flex items-end justify-between gap-[6px]">
        <SignOff c={x.c} ink={x.paper} fonts={x.fonts} />
        <Mark brand={x.brand} ground={x.paper.bg} height={8} show={x.showLogo} tint={x.primary} />
      </div>
    </CardStage>
  ),

  // ext-10 · Postcard Stripe — a brand header band with the mark in it;
  // the note reads like the back of a postcard.
  9: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute inset-x-0 top-0 h-[22%] flex items-center px-[7%]"
        style={{ background: x.brandInk.bg }}
      >
        <Mark brand={x.brand} ground={x.brandInk.bg} height={9} show={x.showLogo} />
      </div>
      <div className="absolute left-[7%] right-[7%] top-[29%] flex flex-col gap-[4px]">
        <Greeting c={x.c} ink={x.paper} fonts={x.fonts} size={8} />
        <Message c={x.c} ink={x.paper} fonts={x.fonts} size={3.9} lines={4} />
      </div>
      <div className="absolute right-[7%] bottom-[9%] max-w-[70%]">
        <SignOff c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
    </CardStage>
  ),

  // ext-15 · Window Cut — the writing sits inside a drawn frame, so the
  // card has a margin the note cannot spill into.
  14: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[7%] top-[8%]">
        <Mark brand={x.brand} ground={x.paper.bg} height={8} show={x.showLogo} tint={x.primary} />
      </div>
      <div
        className="absolute left-[7%] right-[7%] top-[24%] bottom-[22%] flex flex-col justify-center gap-[4px] px-[6%]"
        style={{ background: x.elevated.bg, border: `1px solid ${x.primary}` }}
      >
        <Greeting c={x.c} ink={x.elevated} fonts={x.fonts} size={7.5} />
        <Message c={x.c} ink={x.elevated} fonts={x.fonts} size={3.8} lines={3} />
      </div>
      <div className="absolute left-[7%] right-[7%] bottom-[8%]">
        <SignOff c={x.c} ink={x.paper} fonts={x.fonts} align="right" />
      </div>
    </CardStage>
  ),

  // ext-18 · Pull Quote — the message IS the design, set large under a
  // brand rule with the greeting as a small eyebrow.
  17: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[9%] right-[9%] top-[13%]">
        <Greeting
          c={x.c}
          ink={x.paper}
          fonts={x.fonts}
          size={3.8}
          weight={600}
          tracking="0.26em"
          upper
          color={x.paper.muted}
        />
      </div>
      <div
        className="absolute left-[9%] top-[24%] w-[18%]"
        style={{ height: '1.5px', background: x.primary }}
      />
      <div className="absolute left-[9%] right-[9%] top-[31%]">
        <Message c={x.c} ink={x.paper} fonts={x.fonts} size={6} color={x.paper.text} lines={3} />
      </div>
      <div className="absolute left-[9%] right-[9%] bottom-[10%] flex items-end justify-between gap-[6px]">
        <SignOff c={x.c} ink={x.paper} fonts={x.fonts} size={4} />
        <Mark brand={x.brand} ground={x.paper.bg} height={8} show={x.showLogo} tint={x.primary} />
      </div>
    </CardStage>
  ),

  // ext-19 · Round Frame — a brand oval drawn around the greeting, the
  // rest of the card left quiet.
  18: (x) => (
    <CardStage stage={x.stage} paper={x.elevated.bg} border={x.elevated.border}>
      <div
        className="absolute left-[22%] right-[22%] top-[11%] h-[24%] flex items-center justify-center px-[4%]"
        style={{ border: `1px solid ${x.primary}`, borderRadius: '999px' }}
      >
        <Greeting c={x.c} ink={x.elevated} fonts={x.fonts} size={7} align="center" />
      </div>
      <div className="absolute left-[13%] right-[13%] top-[42%]">
        <Message c={x.c} ink={x.elevated} fonts={x.fonts} align="center" lines={3} />
      </div>
      <div className="absolute left-[13%] right-[13%] bottom-[10%] flex flex-col items-center gap-[3px]">
        <SignOff c={x.c} ink={x.elevated} fonts={x.fonts} align="center" />
        <Mark brand={x.brand} ground={x.elevated.bg} height={7} show={x.showLogo} tint={x.primary} />
      </div>
    </CardStage>
  ),

  // ext-23 · Card Wrap — a brand footer band carrying the sign-off, so
  // the card closes on the brand rather than opening on it.
  22: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div className="absolute left-[8%] top-[10%]">
        <Mark brand={x.brand} ground={x.paper.bg} height={8} show={x.showLogo} tint={x.primary} />
      </div>
      <div className="absolute left-[8%] right-[8%] top-[27%] flex flex-col gap-[4px]">
        <Greeting c={x.c} ink={x.paper} fonts={x.fonts} size={8} />
        <Message c={x.c} ink={x.paper} fonts={x.fonts} size={3.9} lines={4} />
      </div>
      <div
        className="absolute inset-x-0 bottom-0 h-[18%] flex items-center px-[8%]"
        style={{ background: x.brandInk.bg }}
      >
        <SignOff c={x.c} ink={x.brandInk} fonts={x.fonts} size={4.2} />
      </div>
    </CardStage>
  ),

  // ext-25 · Colour Wedge — a brand corner cut across the top right,
  // with the writing kept clear of it.
  24: (x) => (
    <CardStage stage={x.stage} paper={x.paper.bg} border={x.paper.border}>
      <div
        className="absolute right-0 top-0 w-[52%] h-[46%]"
        style={{ background: x.primary, clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
      />
      <div className="absolute left-[8%] top-[12%]">
        <Mark brand={x.brand} ground={x.paper.bg} height={8} show={x.showLogo} tint={x.primary} />
      </div>
      <div className="absolute left-[8%] right-[8%] top-[40%] flex flex-col gap-[4px]">
        <Greeting c={x.c} ink={x.paper} fonts={x.fonts} size={8.5} />
        <Message c={x.c} ink={x.paper} fonts={x.fonts} size={3.9} lines={3} />
      </div>
      <div className="absolute left-[8%] right-[8%] bottom-[9%]">
        <SignOff c={x.c} ink={x.paper} fonts={x.fonts} />
      </div>
    </CardStage>
  ),

  // ext-30 · Solid Brand — the whole card in the brand's colour, every
  // word in the tone `pickSurfaceTokens` guarantees on it.
  29: (x) => (
    <CardStage stage={x.stage} paper={x.brandInk.bg} border={x.brandInk.bg}>
      <div className="absolute left-[9%] top-[11%]">
        <Mark brand={x.brand} ground={x.brandInk.bg} height={9} show={x.showLogo} />
      </div>
      <div className="absolute left-[9%] right-[9%] top-[32%] flex flex-col gap-[4px]">
        <Greeting c={x.c} ink={x.brandInk} fonts={x.fonts} size={8.5} />
        <Message c={x.c} ink={x.brandInk} fonts={x.fonts} size={3.9} lines={4} />
      </div>
      <div className="absolute left-[9%] right-[9%] bottom-[10%]">
        <SignOff c={x.c} ink={x.brandInk} fonts={x.fonts} />
      </div>
    </CardStage>
  ),
};

const FALLBACK_INDEX = 0;

export function NotecardExtendedRenderer({ brand, templateIndex, content }: Props) {
  const note = content && content.kind === 'note' ? content : undefined;
  const picks = content?.picks;
  const painted = brandWithPicks(brand, picks);
  const c: NoteContent = note ?? defaultNoteContent(painted);

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
    invInk: inkFor(painted, 'inverted'),
    primary: surface(painted, 'brand').bg,
    showLogo: picks?.showLogo !== false,
  };

  const design = DESIGNS[templateIndex] ?? DESIGNS[FALLBACK_INDEX];
  return design(x);
}

/**
 * The family's template list. Ids are persistence keys and unchanged; the
 * eighteen culled wave-1 ids are declared archived in
 * `curation/notecard.ts` rather than removed from here, so the list and
 * the archive cannot disagree about which ids exist.
 */
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
