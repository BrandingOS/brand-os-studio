import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';
import { Bind } from '@/features/brandkit/content/Bind';
import { defaultLetterContent, type LetterContent } from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import {
  brandColors,
  contrastOf,
  fgOn,
  fontStack,
  normalizeHex,
  surface,
} from './brandStyle';

/**
 * Letterhead — twenty letters, not a hundred and thirty pages.
 *
 * What this family used to be: 130 variants of an A4 page floating at 46%
 * width inside a beige tile, whose "body" was a stack of grey rules, whose
 * sender was "Jane Smith · Vice President", whose memo header said
 * "RE · Quarterly Brief / DATE 27 · 04 · 2026", and two of whose designs
 * (wave 1 · 11, wave 2 · 39) rendered a page with nothing on it at all.
 * Of the eight fields a letter has, 128 of the 130 bound exactly one.
 *
 * What it is now: twenty designs, each of which is a REAL LETTER. Every one
 * of them carries all eight fields of the `letter` content kind —
 *
 *     senderName · senderAddress · website · phone
 *     date · recipient · subject · body
 *
 * — through `<Bind>`, so every one of them repaints when a field is edited
 * and ships the customer's own words in an export. The body is set as type,
 * always: a letterhead whose letter is a row of grey bars is a picture of a
 * document rather than a document.
 *
 * ## The three rules the rewrite is built on
 *
 * 1. **The page IS the tile.** `PICKER_ASPECT_BY_LABEL.Letterhead` and
 *    `aspectForType('letterhead')` both say 1 : 1.414, so the frame this
 *    renderer is handed is already A4 portrait. Drawing a second, smaller
 *    page inside it — which is what `PageFrame` did — is what produced a
 *    140px sheet adrift in a beige field, and a 1040×3600 letterboxed PNG.
 *    Every design here fills its box edge to edge.
 *
 * 2. **Nothing is hand-paired.** Grounds come from `surface(brand, kind)`,
 *    ink from `fgOn` or from the surface's own tokens, type from
 *    `fontStack`. `readable()` below is the one extra guard: a token that
 *    does not clear WCAG AA on the ground it lands on is replaced by one
 *    that does, so the family is contrast-clean for ANY brand rather than
 *    for the two we happened to look at.
 *
 * 3. **Variety is chrome, not content.** All twenty share one letter core
 *    (date · recipient · subject · body) and one contact vocabulary; what
 *    differs is the masthead, the field the brand colour occupies, and the
 *    footer. That is also what a real stationery system looks like.
 *
 * Ids `letterhead-ext-1` … `letterhead-ext-20` are the kept designs.
 * `ext-21` … `ext-30` here, and all 100 of wave 2, are archived in
 * `renderers/curation/letterhead.ts` — the ids stay reserved so a saved
 * customization keyed to one is never orphaned.
 */
interface Props {
  brand: Brand;
  templateIndex: number;
  /**
   * Structured letter content. Absent → the brand-derived defaults.
   *
   * `picks` rides on the same saved object (see `kinds.ts` — content and
   * picks are one artifact), so it is read here rather than being a second
   * prop that could arrive without its content.
   */
  content?: LetterContent & { picks?: TemplateDesignPicks };
}

/* ── Reading the picks ────────────────────────────────────────────── */

/**
 * The brand this design should actually paint with.
 *
 * A colour pick has to reach `surface()` and `logoOn()`, not just the two
 * places a renderer happens to spell `brand.primaryColor` — otherwise a
 * recoloured letterhead keeps its old header band and only its accent rule
 * moves. So the pick is applied to the BRAND and every derived surface
 * follows from it.
 */
function withPicks(brand: Brand, picks?: TemplateDesignPicks): Brand {
  const primary = normalizeHex(picks?.primaryColor);
  const secondary = normalizeHex(picks?.secondaryColor);
  if (!primary && !secondary) return brand;
  const cs = brand.colorSystem;
  return {
    ...brand,
    primaryColor: primary ?? brand.primaryColor,
    secondaryColor: secondary ?? brand.secondaryColor,
    colorSystem: {
      ...cs,
      ...(primary ? { primary: { ...(cs?.primary ?? {}), hex: primary } } : {}),
      ...(secondary ? { secondary: { ...(cs?.secondary ?? {}), hex: secondary } } : {}),
    },
  } as Brand;
}

/* ── Ink that is guaranteed to read ───────────────────────────────── */

/** WCAG AA. Large is ≥ 24px at the size the design is finally shown. */
const AA_NORMAL = 4.5;

/**
 * `preferred` if it clears AA on `bg`, otherwise `fallback`.
 *
 * The palette guarantees `text` on every surface; it does NOT guarantee
 * `textMuted`, and on the 'brand' surface `textMuted` is a 35% mix toward
 * the brand colour, which fails outright for a mid-tone brand. Rather than
 * avoid muted ink — a letter needs a quiet register for its date and its
 * footer — the muted token is offered and checked, and the strong one is
 * used when it does not hold up.
 */
function readable(preferred: string | undefined, bg: string, fallback: string): string {
  const hex = normalizeHex(preferred);
  if (hex && contrastOf(hex, bg) >= AA_NORMAL) return hex;
  return fallback;
}

export function LetterheadExtendedRenderer({ brand, templateIndex, content }: Props) {
  const c = content ?? defaultLetterContent(brand);
  const picks = content?.picks;
  const b = withPicks(brand, picks);
  const showLogo = picks?.showLogo !== false;

  const colors = brandColors(b);
  const sheetT = surface(b, 'card');
  const bandT = surface(b, 'brand');
  const band2T = surface(b, 'brand-secondary');
  const darkT = surface(b, 'inverted');
  const tintT = surface(b, 'subtle');

  const headingFont = fontStack(b, 'heading');
  const bodyFont = fontStack(b, 'body');
  const monoFont = fontStack(b, 'mono');

  /* The paper, and the three inks that read on it. */
  const paper = sheetT.bg;
  const ink = sheetT.text;
  const inkQuiet = readable(sheetT.textMuted, paper, ink);
  const inkBrand = readable(colors.primary, paper, ink);
  const rule = sheetT.border;

  /* A band of the brand's own colour, and the inks that read on THAT. */
  const bandBg = bandT.bg;
  const bandInk = fgOn(bandBg);
  const bandQuiet = readable(bandT.textMuted, bandBg, bandInk);

  /* The secondary band, for the designs that need a second temperature. */
  const band2Bg = band2T.bg;
  const band2Ink = fgOn(band2Bg);

  /* A near-black (brand-tinted) page, for the one reversed-out design. */
  const darkBg = darkT.bg;
  const darkInk = fgOn(darkBg);
  const darkQuiet = readable(darkT.textMuted, darkBg, darkInk);
  const darkBrand = readable(colors.primary, darkBg, darkInk);

  /* A pale brand-tinted panel, for rails and header wells. */
  const tintBg = tintT.bg;
  const tintInk = readable(tintT.text, tintBg, fgOn(tintBg));
  const tintQuiet = readable(tintT.textMuted, tintBg, tintInk);
  const tintBrand = readable(colors.primary, tintBg, tintInk);

  /** The logo's colour on a ground, honouring a pick when it reads there. */
  const markColor = (bg: string, fallback: string) =>
    readable(picks?.logoColor, bg, fallback);

  /* ── The page ───────────────────────────────────────────────────── */

  /**
   * The sheet — full bleed, because the frame is already A4.
   *
   * A flex column rather than the absolute positioning this family used
   * to be built from: a letter whose body is real type has a body of
   * unknown height, and absolutely-placed blocks either overlap it or
   * leave a hole above the footer depending on how much the customer
   * wrote. In a column the footer is simply last.
   */
  const Sheet = ({
    children,
    bg = paper,
    color = ink,
    style,
  }: {
    children: ReactNode;
    bg?: string;
    color?: string;
    style?: CSSProperties;
  }) => (
    <div
      className="w-full h-full relative overflow-hidden flex flex-col"
      style={{ background: bg, color, fontFamily: bodyFont, ...style }}
    >
      {children}
    </div>
  );

  /* ── Atoms. Each one owns exactly one content path. ─────────────── */

  const microStyle: CSSProperties = {
    fontSize: 3.9,
    lineHeight: 1.5,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  };

  const Mark = ({ color, size = 'xs' }: { color: string; size?: 'xs' | 'sm' | 'md' }) =>
    showLogo ? (
      <div style={{ fontFamily: headingFont, lineHeight: 1 }}>
        <BrandLogo brand={b} size={size} color={color} />
      </div>
    ) : null;

  const Sender = ({
    size = 6.5,
    color = ink,
    weight = 600,
    font = headingFont,
    tracking,
    upper = false,
    align,
    style,
  }: {
    size?: number;
    color?: string;
    weight?: number;
    font?: string;
    tracking?: string;
    upper?: boolean;
    align?: CSSProperties['textAlign'];
    style?: CSSProperties;
  }) => (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing: tracking,
        textTransform: upper ? 'uppercase' : undefined,
        textAlign: align,
        minWidth: 0,
        ...style,
      }}
    >
      <Bind path="senderName" value={c.senderName} fit="shrink" />
    </div>
  );

  const Address = ({
    color = inkQuiet,
    size = 3.9,
    align,
    style,
  }: {
    color?: string;
    size?: number;
    align?: CSSProperties['textAlign'];
    style?: CSSProperties;
  }) => (
    <div style={{ fontSize: size, lineHeight: 1.5, color, textAlign: align, minWidth: 0, ...style }}>
      <Bind path="senderAddress" value={c.senderAddress} fit="wrap" />
    </div>
  );

  const Web = ({ color = inkQuiet, size = 3.9, style }: { color?: string; size?: number; style?: CSSProperties }) => (
    <div style={{ fontSize: size, lineHeight: 1.5, color, minWidth: 0, ...style }}>
      <Bind path="website" value={c.website} />
    </div>
  );

  const Tel = ({ color = inkQuiet, size = 3.9, style }: { color?: string; size?: number; style?: CSSProperties }) => (
    <div style={{ fontSize: size, lineHeight: 1.5, color, minWidth: 0, ...style }}>
      <Bind path="phone" value={c.phone} />
    </div>
  );

  /** Website · phone · address on one line — the ordinary letter footer. */
  const ContactRow = ({
    color = inkQuiet,
    size = 3.6,
    align = 'space-between',
    upper = true,
  }: {
    color?: string;
    size?: number;
    align?: CSSProperties['justifyContent'];
    upper?: boolean;
  }) => (
    <div
      style={{
        display: 'flex',
        gap: 8,
        justifyContent: align,
        alignItems: 'baseline',
        fontSize: size,
        lineHeight: 1.5,
        letterSpacing: upper ? '0.14em' : undefined,
        textTransform: upper ? 'uppercase' : undefined,
        color,
        minWidth: 0,
      }}
    >
      <span style={{ minWidth: 0, flex: '0 1 auto' }}>
        <Bind path="website" value={c.website} />
      </span>
      <span style={{ minWidth: 0, flex: '0 1 auto' }}>
        <Bind path="phone" value={c.phone} />
      </span>
      <span style={{ minWidth: 0, flex: '0 1 auto', maxWidth: '46%' }}>
        <Bind path="senderAddress" value={c.senderAddress} />
      </span>
    </div>
  );

  /**
   * The letter itself: date, recipient, subject, body — in that order,
   * which is the order a letter is read in.
   *
   * The body is ONE bound region, set `pre-wrap`, so a blank line in the
   * content is a paragraph break on the page. Splitting it into a Bind per
   * paragraph would mean an edit to the second paragraph committing itself
   * as the whole body, which is worse than losing the indent.
   */
  const LetterCore = ({
    color = ink,
    quiet = inkQuiet,
    accent = inkBrand,
    dateAlign = 'left',
    subject: subjectStyle = 'accent',
    bodySize = 4.8,
    align,
  }: {
    color?: string;
    quiet?: string;
    accent?: string;
    dateAlign?: CSSProperties['textAlign'];
    subject?: 'accent' | 'rule' | 'display' | 'quiet';
    bodySize?: number;
    align?: CSSProperties['textAlign'];
  }) => (
    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, textAlign: align }}>
      <div style={{ ...microStyle, color: quiet, textAlign: dateAlign }}>
        <Bind path="date" value={c.date} />
      </div>
      <div
        style={{
          marginTop: 9,
          fontFamily: headingFont,
          fontSize: 5.2,
          fontWeight: 500,
          color,
          minWidth: 0,
        }}
      >
        <Bind path="recipient" value={c.recipient} fit="shrink" />
      </div>
      <div
        style={{
          marginTop: 5,
          paddingBottom: subjectStyle === 'rule' ? 4 : 0,
          borderBottom: subjectStyle === 'rule' ? `0.5px solid ${rule}` : undefined,
          fontFamily: headingFont,
          fontSize: subjectStyle === 'display' ? 8.5 : 6,
          fontWeight: 700,
          letterSpacing: subjectStyle === 'display' ? '-0.015em' : undefined,
          lineHeight: 1.25,
          color: subjectStyle === 'quiet' ? color : accent,
          minWidth: 0,
        }}
      >
        <Bind path="subject" value={c.subject} fit="wrap" />
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: bodySize,
          lineHeight: 1.75,
          color,
          minWidth: 0,
        }}
      >
        <Bind
          path="body"
          value={c.body}
          fit="wrap"
          multiline
          placeholder="Write your letter here."
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );

  /** The letter, padded and given the room the design left it. */
  const Body = (props: Parameters<typeof LetterCore>[0] & { pad?: string; style?: CSSProperties }) => {
    const { pad = '9%', style, ...core } = props;
    return (
      <div style={{ flex: 1, minHeight: 0, paddingLeft: pad, paddingRight: pad, ...style }}>
        <LetterCore {...core} />
      </div>
    );
  };

  /** Logo left, sender right — the masthead most of these share. */
  const Masthead = ({
    color,
    markOn,
    size = 6.5,
    upper = false,
    tracking,
  }: {
    color: string;
    markOn: string;
    size?: number;
    upper?: boolean;
    tracking?: string;
  }) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        minWidth: 0,
      }}
    >
      <Mark color={markColor(markOn, color)} />
      <div style={{ minWidth: 0, flex: '0 1 auto' }}>
        <Sender size={size} color={color} upper={upper} tracking={tracking} align="right" />
      </div>
    </div>
  );

  const designs: ReactNode[] = [
    /* 0 · ext-1 — Header Bar.
       A solid band of the brand's colour carries the masthead; the letter
       sits on clean paper below it and the contacts close the page. */
    <Sheet key="header-bar">
      <div
        style={{
          background: bandBg,
          color: bandInk,
          padding: '6% 9%',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Masthead color={bandInk} markOn={bandBg} />
        <Address color={bandQuiet} />
      </div>
      <Body style={{ paddingTop: '7%' }} />
      <div style={{ padding: '0 9% 7%' }}>
        <div style={{ borderTop: `0.5px solid ${rule}`, paddingTop: 5 }}>
          <ContactRow />
        </div>
      </div>
    </Sheet>,

    /* 1 · ext-2 — Side Stripe.
       A full-height brand stripe down the binding edge, logo at its head. */
    <Sheet key="side-stripe">
      <div
        className="absolute inset-y-0 left-0"
        style={{
          width: '11%',
          background: bandBg,
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '7%',
        }}
      >
        <Mark color={markColor(bandBg, bandInk)} />
      </div>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          marginLeft: '11%',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '8%',
        }}
      >
        <div style={{ padding: '0 8%' }}>
          <Sender size={7} />
          <Address style={{ marginTop: 2 }} />
        </div>
        <Body pad="8%" style={{ paddingTop: '7%' }} />
        <div style={{ padding: '0 8% 7%' }}>
          <ContactRow />
        </div>
      </div>
    </Sheet>,

    /* 2 · ext-3 — Right Rail.
       The stripe on the outer edge instead of the binding edge, with the
       contacts running up it. */
    <Sheet key="right-rail">
      <div
        className="absolute inset-y-0 right-0"
        style={{
          width: '13%',
          background: bandBg,
          color: bandInk,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '7% 0',
        }}
      >
        <Mark color={markColor(bandBg, bandInk)} />
        <div
          style={{
            ...microStyle,
            color: bandInk,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            maxHeight: '60%',
            overflow: 'hidden',
          }}
        >
          <Bind path="website" value={c.website} />
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          marginRight: '13%',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          paddingTop: '8%',
        }}
      >
        <div style={{ padding: '0 8% 0 9%' }}>
          <Sender size={7} />
          <Address style={{ marginTop: 2 }} />
        </div>
        <div style={{ flex: 1, minHeight: 0, padding: '7% 8% 0 9%' }}>
          <LetterCore />
        </div>
        <div style={{ padding: '0 8% 8% 9%' }}>
          <Tel />
        </div>
      </div>
    </Sheet>,

    /* 3 · ext-4 — Rule Under.
       Nothing but a heavy brand rule under the masthead. The restrained
       one — it has to hold up on its typography alone. */
    <Sheet key="rule-under">
      <div style={{ padding: '9% 9% 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <Mark color={markColor(paper, inkBrand)} />
            <Sender size={7} style={{ marginTop: 3 }} />
          </div>
          <Address align="right" style={{ maxWidth: '50%' }} />
        </div>
        <div style={{ height: 2.5, background: inkBrand, marginTop: '4%' }} />
      </div>
      <Body style={{ paddingTop: '7%' }} subject="quiet" />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <Web />
          <Tel />
        </div>
      </div>
    </Sheet>,

    /* 4 · ext-5 — Typewriter.
       Meta in the brand's mono face between dashed brand rules. The
       internal-memo register, without inventing a memo's content. */
    <Sheet key="typewriter">
      <div style={{ padding: '8% 9% 0', fontFamily: monoFont }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Sender size={5.4} font={monoFont} upper tracking="0.18em" />
          <Mark color={markColor(paper, inkBrand)} />
        </div>
        <div style={{ borderTop: `1px dashed ${inkBrand}`, marginTop: '4%' }} />
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '6% 9% 0', fontFamily: monoFont }}>
        <LetterCore subject="quiet" bodySize={4.5} />
      </div>
      <div style={{ padding: '0 9% 8%', fontFamily: monoFont }}>
        <div style={{ borderTop: `1px dashed ${inkBrand}`, paddingTop: 5 }}>
          <ContactRow upper={false} size={3.8} />
        </div>
      </div>
    </Sheet>,

    /* 5 · ext-6 — Bottom Block.
       Paper at the top, a deep brand footer that carries every contact —
       the letter reads first and the identity signs off. */
    <Sheet key="bottom-block">
      <div style={{ padding: '9% 9% 0' }}>
        <Masthead color={ink} markOn={paper} />
      </div>
      <Body style={{ paddingTop: '7%' }} />
      <div
        style={{
          background: bandBg,
          color: bandInk,
          padding: '6% 9%',
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
      >
        <Sender size={5.6} color={bandInk} upper tracking="0.16em" />
        <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
          <Web color={bandQuiet} />
          <Tel color={bandQuiet} />
        </div>
        <Address color={bandQuiet} />
      </div>
    </Sheet>,

    /* 6 · ext-7 — Ring Mark.
       A large open brand ring bled off the corner. Drawn, never typed —
       a giant pale INITIAL is text nobody can read, which is a contrast
       failure wearing a watermark's clothes. */
    <Sheet key="ring-mark">
      <div
        className="absolute"
        style={{
          right: '-18%',
          top: '-12%',
          width: '62%',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          border: `10px solid ${bandBg}`,
          opacity: 0.14,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, padding: '8% 9% 0' }}>
        <Masthead color={ink} markOn={paper} />
      </div>
      <Body style={{ paddingTop: '8%', position: 'relative', zIndex: 1 }} />
      <div style={{ position: 'relative', zIndex: 1, padding: '0 9% 8%' }}>
        <ContactRow />
      </div>
    </Sheet>,

    /* 7 · ext-8 — Diagonal Header.
       One angled cut of brand colour. The masthead reverses out of it.

       The band CONTAINS the masthead rather than sitting behind it. The
       first drawing of this design put the brand colour in an absolutely
       positioned sibling and the reversed type in a transparent block on
       top, which is two separate claims about where the band is: the
       contrast sweep, climbing from the text for an opaque ancestor,
       found the white sheet and measured white-on-white at 1.00:1 for
       both lines. It was not only a measurement artefact — the masthead
       ranged its sender name RIGHT, which is exactly where the diagonal
       cuts the band shortest, so a long name really could sit off it.

       Now there is one element: it is the band, it carries the colour and
       the clip, and the type is its child. The content is held inside the
       left 62% and the bottom padding keeps it clear of the cut, so the
       band cannot move out from under its own type. */
    <Sheet key="diagonal-header">
      <div
        style={{
          background: bandBg,
          clipPath: 'polygon(0 0, 100% 0, 100% 62%, 0 100%)',
          color: bandInk,
          padding: '7% 9% 12%',
        }}
      >
        <div style={{ maxWidth: '62%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Mark color={markColor(bandBg, bandInk)} />
          <Sender size={6.5} color={bandInk} />
          <Web color={bandQuiet} />
        </div>
      </div>
      <Body style={{ paddingTop: '9%' }} />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <Tel />
          <Address align="right" style={{ maxWidth: '60%' }} />
        </div>
      </div>
    </Sheet>,

    /* 8 · ext-9 — Tinted Well.
       A pale brand-tinted well at the head — softer than a full band and
       the one that suits a brand whose colour is loud. */
    <Sheet key="tinted-well">
      <div
        style={{
          background: tintBg,
          color: tintInk,
          padding: '8% 9%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Mark color={markColor(tintBg, tintBrand)} />
          <Sender size={6.5} color={tintInk} style={{ marginTop: 3 }} />
        </div>
        <div style={{ minWidth: 0, textAlign: 'right' }}>
          <Web color={tintQuiet} />
          <Tel color={tintQuiet} />
          <Address color={tintQuiet} align="right" />
        </div>
      </div>
      <Body style={{ paddingTop: '7%' }} />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ height: 1.5, width: '18%', background: inkBrand }} />
      </div>
    </Sheet>,

    /* 9 · ext-10 — Left Rail.
       A pale brand-tinted rail holds the whole identity so the letter
       column is nothing but the letter. */
    <Sheet key="left-rail">
      <div className="absolute inset-y-0 left-0" style={{ width: '30%', background: tintBg }} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex' }}>
        <div
          style={{
            width: '30%',
            padding: '9% 5%',
            color: tintInk,
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <Mark color={markColor(tintBg, tintBrand)} />
          <Sender size={5.6} color={tintInk} />
          <Address color={tintQuiet} />
          <Web color={tintQuiet} />
          <Tel color={tintQuiet} />
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: '9% 8% 9% 6%' }}>
          <LetterCore />
        </div>
      </div>
    </Sheet>,

    /* 10 · ext-11 — Two-Tone.
       A quarter of brand colour at the head, paper beneath. The plainest
       way to make a page unmistakably one brand's. */
    <Sheet key="two-tone">
      <div
        style={{
          background: bandBg,
          color: bandInk,
          padding: '8% 9% 6%',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Mark color={markColor(bandBg, bandInk)} />
        <Sender size={9} color={bandInk} weight={600} tracking="-0.015em" />
        <Address color={bandQuiet} />
      </div>
      <Body style={{ paddingTop: '7%' }} subject="rule" />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <Web />
          <Tel />
        </div>
      </div>
    </Sheet>,

    /* 11 · ext-12 — Framed.
       A single brand hairline around the whole page. Everything the
       letter needs sits inside it. */
    <Sheet key="framed">
      <div className="absolute" style={{ inset: '5%', border: `0.75px solid ${inkBrand}` }} />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: '9%',
        }}
      >
        <Masthead color={ink} markOn={paper} />
        <div style={{ flex: 1, minHeight: 0, paddingTop: '7%' }}>
          <LetterCore />
        </div>
        <ContactRow />
      </div>
    </Sheet>,

    /* 12 · ext-13 — Footer Column.
       The contacts set as three labelled columns over a brand rule —
       the layout a company with a real address actually needs. */
    <Sheet key="footer-column">
      <div style={{ padding: '9% 9% 0' }}>
        <Masthead color={ink} markOn={paper} size={7} />
      </div>
      <Body style={{ paddingTop: '7%' }} />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ height: 1.5, background: inkBrand, marginBottom: 5 }} />
        <div style={{ display: 'flex', gap: 8, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Address />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Web />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <Tel />
          </div>
        </div>
      </div>
    </Sheet>,

    /* 13 · ext-14 — Display Subject.
       The subject set large, the way a proposal or an offer wants to be
       read: the first thing on the page after the name. */
    <Sheet key="display-subject">
      <div style={{ padding: '8% 9% 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <Mark color={markColor(paper, inkBrand)} />
          <div style={{ ...microStyle, color: inkQuiet, minWidth: 0 }}>
            <Bind path="website" value={c.website} />
          </div>
        </div>
        <Sender size={5.4} upper tracking="0.2em" color={inkQuiet} style={{ marginTop: 4 }} />
      </div>
      <Body style={{ paddingTop: '6%' }} subject="display" />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ borderTop: `0.5px solid ${rule}`, paddingTop: 5, display: 'flex', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <Tel />
          <Address align="right" style={{ maxWidth: '60%' }} />
        </div>
      </div>
    </Sheet>,

    /* 14 · ext-15 — Swiss Grid.
       Everything on a rule: mark and sender left, contacts right, one
       hairline across the page, the letter squared under it. */
    <Sheet key="swiss-grid">
      <div
        style={{
          padding: '8% 9% 0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <Mark color={markColor(paper, inkBrand)} />
          <Sender size={6} style={{ marginTop: 3 }} />
        </div>
        <div style={{ minWidth: 0, textAlign: 'right' }}>
          <Web />
          <Tel />
          <Address align="right" />
        </div>
      </div>
      <div style={{ margin: '4% 9% 0', height: 1, background: inkBrand }} />
      <Body style={{ paddingTop: '6%' }} subject="quiet" />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ ...microStyle, color: inkBrand }}>
          <Bind path="senderName" value={c.senderName} />
        </div>
      </div>
    </Sheet>,

    /* 15 · ext-16 — Corner Block.
       A filled brand square at the corner holds the mark; the identity
       lines up opposite it. */
    <Sheet key="corner-block">
      <div
        className="absolute left-0 top-0"
        style={{
          width: '24%',
          height: '15%',
          background: bandBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Mark color={markColor(bandBg, bandInk)} />
      </div>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '7% 9% 0 28%',
          textAlign: 'right',
        }}
      >
        <Sender size={6.5} align="right" />
        <Address align="right" style={{ marginTop: 2 }} />
      </div>
      <Body style={{ paddingTop: '9%' }} />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ display: 'flex', gap: 10, minWidth: 0 }}>
          <Web />
          <Tel />
        </div>
      </div>
    </Sheet>,

    /* 16 · ext-17 — Reversed.
       The whole page in the brand's own near-black, letter reversed out,
       subject in brand colour. For the letters that are announcements. */
    <Sheet key="reversed" bg={darkBg} color={darkInk}>
      <div style={{ padding: '9% 9% 0' }}>
        <Masthead color={darkInk} markOn={darkBg} />
        <Address color={darkQuiet} style={{ marginTop: 3 }} />
      </div>
      <Body
        style={{ paddingTop: '8%' }}
        color={darkInk}
        quiet={darkQuiet}
        accent={darkBrand}
      />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ borderTop: `0.5px solid ${darkQuiet}`, paddingTop: 5 }}>
          <ContactRow color={darkQuiet} />
        </div>
      </div>
    </Sheet>,

    /* 17 · ext-18 — Duo Band.
       Two bands — the secondary colour over the primary — so a brand with
       a real second colour has somewhere to spend it. */
    <Sheet key="duo-band">
      <div style={{ background: band2Bg, color: band2Ink, padding: '3% 9%' }}>
        <div style={{ ...microStyle, color: band2Ink, textAlign: 'right' }}>
          <Bind path="website" value={c.website} />
        </div>
      </div>
      <div
        style={{
          background: bandBg,
          color: bandInk,
          padding: '6% 9%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Mark color={markColor(bandBg, bandInk)} />
        <div style={{ minWidth: 0, textAlign: 'right' }}>
          <Sender size={6.5} color={bandInk} align="right" />
          <Address color={bandQuiet} align="right" />
        </div>
      </div>
      <Body style={{ paddingTop: '7%' }} />
      <div style={{ padding: '0 9% 8%' }}>
        <Tel />
      </div>
    </Sheet>,

    /* 18 · ext-19 — Editorial Masthead.
       The sender set as a centred display line between two rules — the
       classic printed letterhead, and the one that most needs the brand's
       heading face rather than a generic serif. */
    <Sheet key="editorial-masthead">
      <div style={{ padding: '9% 9% 0', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Mark color={markColor(paper, inkBrand)} />
        </div>
        <Sender size={13} weight={600} align="center" tracking="-0.02em" />
        <div style={{ height: 1, background: inkBrand, margin: '4% 0 2px' }} />
        <div style={{ height: 0.5, background: rule }} />
        <Address align="center" style={{ marginTop: 4 }} />
      </div>
      <Body style={{ paddingTop: '7%' }} subject="quiet" />
      <div style={{ padding: '0 9% 8%' }}>
        <ContactRow align="center" />
      </div>
    </Sheet>,

    /* 19 · ext-20 — Stacked Masthead.
       Mark, name and contacts stacked and centred, then a rule. Reads
       like an announcement rather than a memo. */
    <Sheet key="stacked-masthead">
      <div
        style={{
          padding: '10% 9% 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <Mark color={markColor(paper, inkBrand)} size="sm" />
        <Sender size={8} align="center" weight={600} />
        <ContactRow align="center" size={3.5} />
        <div style={{ width: '22%', height: 1.5, background: inkBrand, marginTop: 4 }} />
      </div>
      <Body style={{ paddingTop: '7%' }} />
      <div style={{ padding: '0 9% 8%' }}>
        <div style={{ ...microStyle, color: inkQuiet, textAlign: 'center' }}>
          <Bind path="senderName" value={c.senderName} />
        </div>
      </div>
    </Sheet>,
  ];

  return <>{designs[templateIndex] ?? designs[templateIndex % designs.length] ?? designs[0]}</>;
}

/**
 * The family's variants, in display order.
 *
 * Twenty kept designs (`ext-1` … `ext-20`) and ten reserved ids
 * (`ext-21` … `ext-30`) that no longer show anywhere. The reserved ten
 * stay in this list rather than being deleted from it so that
 * `curation/letterhead.ts` archives ids that really exist — an id nobody
 * emits cannot be un-archived by a dev Archive toggle, and cannot be
 * proved reserved by a test either. Their `name` is the one they shipped
 * with; nothing renders it.
 *
 * NEVER renumber. Each id is the persistence key a saved customization
 * and a Design snapshot are filed under.
 */
export const LETTERHEAD_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Header Bar', category: 'Modern' }, // was Header Bar
  { idSuffix: 'ext-2', name: 'Side Stripe', category: 'Modern' }, // was Side Stripe
  { idSuffix: 'ext-3', name: 'Right Rail', category: 'Modern' }, // was Editorial Index
  { idSuffix: 'ext-4', name: 'Rule Under', category: 'Minimalist' }, // was Minimalist Rule
  { idSuffix: 'ext-5', name: 'Typewriter', category: 'Vintage' }, // was Stamped Memo
  { idSuffix: 'ext-6', name: 'Bottom Block', category: 'Bold' }, // was Bottom Block
  { idSuffix: 'ext-7', name: 'Ring Mark', category: 'Modern' }, // was Centered Mark
  { idSuffix: 'ext-8', name: 'Diagonal Header', category: 'Bold' }, // was Diagonal Header
  { idSuffix: 'ext-9', name: 'Tinted Well', category: 'Minimalist' }, // was Watermark
  { idSuffix: 'ext-10', name: 'Left Rail', category: 'Editorial' }, // was Two-Column
  { idSuffix: 'ext-11', name: 'Two-Tone', category: 'Bold' }, // was Color Wash
  { idSuffix: 'ext-12', name: 'Framed', category: 'Lux' }, // was Bracket Frame
  { idSuffix: 'ext-13', name: 'Footer Column', category: 'Modern' }, // was Numbered Sections
  { idSuffix: 'ext-14', name: 'Display Subject', category: 'Editorial' }, // was Quote Frame
  { idSuffix: 'ext-15', name: 'Swiss Grid', category: 'Minimalist' }, // was Grid Header
  { idSuffix: 'ext-16', name: 'Corner Block', category: 'Modern' }, // was Spotlight
  { idSuffix: 'ext-17', name: 'Reversed', category: 'Bold' }, // was Mono Block
  { idSuffix: 'ext-18', name: 'Duo Band', category: 'Bold' }, // was Asymmetric Split
  { idSuffix: 'ext-19', name: 'Editorial Masthead', category: 'Editorial' }, // was Stationery Header
  { idSuffix: 'ext-20', name: 'Stacked Masthead', category: 'Lux' }, // was Drop Number
  // ── Reserved. Archived in `curation/letterhead.ts`. ──
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
