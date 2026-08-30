import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { Bind } from '@/features/brandkit/content/Bind';
import {
  defaultDeckContent,
  isDeck,
  type DeckVariant,
  type DeckContent,
  type DeckSlide,
  type DeliverableContent,
} from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import {
  brandColors,
  contrastOf,
  fontStack,
  logoOn,
  normalizeHex,
  surface,
  type SurfaceKind,
  type SurfaceTokens,
} from './brandStyle';
import { typePx } from './typeFloor';

/**
 * The five deck families — Pitch Deck, Business Plan, Proposal, Case
 * Studies and Portfolio — as ONE slide system.
 *
 * ## What this file used to be
 *
 * Five renderers, each holding ten hand-drawn slides of a fictional
 * company's story, each of them then TRIPLED (`[...s, ...s, ...s]`) so a
 * thirty-tile grid had something to show. Thirty tiles, ten designs, and
 * twenty duplicates a customer could pick between without any of them
 * differing. The copy was a start-up that does not exist: "$1.4M seed
 * round", a market sized `014M / 2.1M / 340K`, three initialled founders
 * `JS / BK / MR`, a tool stack, a `$8,300 net 30` project fee and a
 * testimonial from a made-up client. None of it was editable, because
 * none of it was data.
 *
 * ## What it is now
 *
 * A deck is `DeckContent` — a title, a subtitle, a presenter, a date and
 * a list of slides. A slide carries a KIND (`title` · `section` ·
 * `content` · `stat` · `quote` · `closing`) and every field any kind
 * might need. There is exactly ONE renderer per kind, shared by all five
 * families, and a family is a STYLE over that set: which surface a cover
 * takes, which one a divider takes, how the heading is scaled and
 * tracked, whether the deck is centred or ranged left.
 *
 * That split is the whole design. A sixth deck family is a row in
 * `DECK_STYLES`. A seventh slide kind is one function and one entry in
 * `SLIDE_RENDERERS` — and the panel already offers it, because the kind
 * list lives in `content/kinds.ts` and this file reads it rather than
 * repeating it.
 *
 * ## One variant is one SLIDE
 *
 * `pres-pitch-ext-3` is slide three of the pitch deck, not "design three
 * of thirty". That is what the tile has always shown; it simply used to
 * show a slide from somebody else's deck. Ten slides are kept per family
 * and the twenty tripled ids are archived in
 * `renderers/curation/presentations.ts`, where they stay reserved as
 * persistence keys.
 *
 * ## What a slide shows
 *
 * Only what its kind needs — the rule `content/fields.ts` states for the
 * panel, held to here as well. A title slide is the cover fields and
 * nothing else; a closing slide is a sign-off; a quote slide is the
 * quote. Rendering every field on every slide would have made the bind
 * sweep uniform and the artwork a form, and would have printed the brand
 * name three times on the cover, because the deck's `title` and slide
 * one's `heading` both default to it.
 *
 * The deck's own four fields (title · subtitle · presenter · date) DO
 * appear on every slide: a running header and a footer, which is what a
 * real deck does, and which means those four are editable from whichever
 * slide the customer happens to be looking at.
 */

/* ── Families ─────────────────────────────────────────────────────── */

/**
 * A family here is the same thing as a deck VARIANT in the content layer —
 * one name, so a renderer and the content it is handed cannot disagree
 * about which document this is.
 */
export type DeckFamily = DeckVariant;

type DeckStyle = {
  /** Behind the slide — the desk or the projection the slide sits on. */
  mat: SurfaceKind;
  /** Title and closing slides. */
  cover: SurfaceKind;
  /** Everything in between. */
  page: SurfaceKind;
  /** Section dividers — the one deliberately loud slide. */
  divider: SurfaceKind;
  /** Cover composition. */
  align: 'left' | 'center';
  /** How a page-slide heading is announced. */
  rule: 'bar' | 'line' | 'none';
  /** Cover title size, at the 260px authoring width. */
  coverPx: number;
  /** Page-slide heading size, same basis. */
  headingPx: number;
  weight: number;
  tracking: string;
};

/**
 * A deck family is a set of surface choices, not a set of drawings.
 *
 * The differences are the ones a reader would name unprompted: a pitch is
 * loud and centred on the brand's own colour; a business plan is a paper
 * document; a proposal is a client-facing letter with a ranged-left
 * margin; a case study is dark and photographic; a portfolio is quiet and
 * wide. Everything else — the slide kinds, the chrome, the binding — is
 * identical, which is why five families cost one renderer set.
 */
const DECK_STYLES: Record<DeckFamily, DeckStyle> = {
  pitch: {
    mat: 'inverted',
    cover: 'brand',
    page: 'card',
    divider: 'inverted',
    align: 'center',
    rule: 'bar',
    coverPx: 21,
    headingPx: 12,
    weight: 800,
    tracking: '-0.02em',
  },
  plan: {
    mat: 'subtle',
    cover: 'subtle',
    page: 'page',
    divider: 'brand-secondary',
    align: 'left',
    rule: 'line',
    coverPx: 17,
    headingPx: 10,
    weight: 700,
    tracking: '-0.01em',
  },
  proposal: {
    mat: 'subtle',
    cover: 'card',
    page: 'card',
    divider: 'brand',
    align: 'left',
    rule: 'bar',
    coverPx: 18,
    headingPx: 11,
    weight: 700,
    tracking: '-0.01em',
  },
  case: {
    mat: 'inverted',
    cover: 'inverted',
    page: 'card',
    divider: 'brand',
    align: 'left',
    rule: 'line',
    coverPx: 19,
    headingPx: 11,
    weight: 800,
    tracking: '-0.02em',
  },
  portfolio: {
    mat: 'subtle',
    cover: 'brand-secondary',
    page: 'page',
    divider: 'inverted',
    align: 'center',
    rule: 'none',
    coverPx: 22,
    headingPx: 11,
    weight: 600,
    tracking: '0.01em',
  },
};

/* ── Colour helpers ───────────────────────────────────────────────── */

/**
 * A colour, or the fallback that is guaranteed to read on this ground.
 *
 * `SurfaceTokens.textMuted` is honest on a neutral surface and is NOT on
 * a brand one: `pickSurfaceTokens('brand')` derives it as 35% of the
 * on-brand colour mixed into the brand's own hex, which is a deliberate
 * de-emphasis and lands well under 4.5:1. The same is true of the
 * accent — the brand's primary printed as text on a pale card passes for
 * one brand and fails for the next. So every non-`text` ink on this page
 * is MEASURED before it is used, and drops back to the surface's own
 * text colour when it does not clear the bar. Hierarchy then comes from
 * size, weight and letter-spacing, which cost no contrast at all.
 */
function ink(candidate: string, bg: string, fallback: string, large = false): string {
  return contrastOf(candidate, bg) >= (large ? 3 : 4.5) ? candidate : fallback;
}

/**
 * The brand, with the customer's design picks folded in.
 *
 * Picks travel with the content (`content.picks`) and mean "use this
 * instead of the brand's own". Colours are applied by rebuilding the
 * source the palette reads, so a picked primary reaches every surface,
 * every derived neutral and every contrast decision — rather than being
 * painted over one box while the rest of the slide keeps the old hue.
 *
 * `fontId` is deliberately NOT honoured here: it indexes the Setup-shaped
 * `MockBrand.fonts` list, and a renderer is handed the canonical `Brand`,
 * which has no such ids. Guessing would silently pick the wrong typeface.
 */
function brandWithPicks(brand: Brand, picks: TemplateDesignPicks | undefined): Brand {
  const primary = normalizeHex(picks?.primaryColor);
  const secondary = normalizeHex(picks?.secondaryColor);
  if (!primary && !secondary) return brand;
  const current = brandColors(brand);
  const next = {
    ...brand,
    primaryColor: primary ?? current.primary,
    secondaryColor: secondary ?? current.secondary,
    colorSystem: {
      ...(brand.colorSystem ?? {}),
      primary: { ...(brand.colorSystem?.primary ?? {}), hex: primary ?? current.primary },
      secondary: { ...(brand.colorSystem?.secondary ?? {}), hex: secondary ?? current.secondary },
    },
  };
  return next as Brand;
}

/* ── The slide frame ──────────────────────────────────────────────── */

/**
 * A 16:9 slide, centred on its family's mat.
 *
 * The mat used to be `#0F1216` — one hex, five families, every brand. It
 * is a surface now, so a paper family sits on a tinted band and a
 * projected one on the brand's own near-black.
 *
 * Sizes inside are authored against the 260px width every renderer in
 * this codebase is drawn for (`ScalingStage`), and every box is a
 * percentage, so the slide scales without re-authoring and nothing is
 * pinned to a height that clips at another width.
 */
function SlideFrame({
  mat,
  tokens,
  children,
}: {
  mat: string;
  tokens: SurfaceTokens;
  children: ReactNode;
}) {
  return (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ backgroundColor: mat, padding: '3%' }}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: '94%',
          aspectRatio: '16 / 9',
          backgroundColor: tokens.bg,
          boxShadow: '0 6px 18px -8px rgba(0, 0, 0, 0.45)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ── Chrome ───────────────────────────────────────────────────────── */

type ChromeProps = {
  deck: DeckContent;
  tokens: SurfaceTokens;
  style: DeckStyle;
  bodyFont: string;
  /** 1-based, derived from the slide's position. Never stored. */
  number: number;
  total: number;
};

const EYEBROW: CSSProperties = {
  fontSize: typePx(3.4),
  letterSpacing: '0.26em',
  textTransform: 'uppercase',
  lineHeight: 1.4,
};

/**
 * The running header and footer every non-cover slide carries.
 *
 * It is also the reason the deck's four cover fields are editable from
 * any slide: a customer who opens slide six and wants to fix the date
 * should not have to find slide one to do it.
 */
function SlideChrome({ deck, tokens, style, bodyFont, number, total }: ChromeProps) {
  const muted = ink(tokens.textMuted, tokens.bg, tokens.text);
  const accent = ink(tokens.accent, tokens.bg, tokens.text);
  return (
    <>
      <div
        className="absolute flex items-baseline justify-between gap-[4%]"
        style={{ left: '6%', right: '6%', top: '6%', fontFamily: bodyFont }}
      >
        <Bind
          path="title"
          value={deck.title}
          fit="clamp"
          style={{ ...EYEBROW, color: accent, fontWeight: 600 }}
        />
        <Bind
          path="subtitle"
          value={deck.subtitle}
          fit="clamp"
          style={{ ...EYEBROW, color: muted, textAlign: 'right', maxWidth: '55%' }}
        />
      </div>
      <div
        className="absolute flex items-baseline justify-between gap-[4%]"
        style={{ left: '6%', right: '6%', bottom: '6%', fontFamily: bodyFont }}
      >
        <Bind path="presenter" value={deck.presenter} fit="clamp" style={{ ...EYEBROW, color: muted }} />
        <span className="flex items-baseline" style={{ gap: '6px' }}>
          <Bind path="date" value={deck.date} fit="clamp" style={{ ...EYEBROW, color: muted }} />
          <span style={{ ...EYEBROW, color: accent, fontWeight: 700 }}>
            {String(number).padStart(2, '0')}
            <span style={{ color: muted, fontWeight: 400 }}>{`/${String(total).padStart(2, '0')}`}</span>
          </span>
        </span>
      </div>
      {style.rule === 'line' && (
        <div
          className="absolute"
          style={{ left: '6%', right: '6%', top: '13%', height: '1px', backgroundColor: tokens.border }}
        />
      )}
    </>
  );
}

/** The accent mark a page slide announces its heading with. */
function HeadingRule({ style, tokens }: { style: DeckStyle; tokens: SurfaceTokens }) {
  if (style.rule !== 'bar') return null;
  return (
    <div
      style={{
        width: '9%',
        height: '2px',
        backgroundColor: tokens.accent,
        marginBottom: '5%',
      }}
    />
  );
}

/* ── The slide renderers, one per kind ────────────────────────────── */

type SlideProps = {
  brand: Brand;
  deck: DeckContent;
  slide: DeckSlide;
  /** 0-based index into `deck.slides` — the prefix every bound path takes. */
  index: number;
  style: DeckStyle;
  tokens: SurfaceTokens;
  headingFont: string;
  bodyFont: string;
  showLogo: boolean;
};

/** `slides.4.quote.by` — one place, so a path can never drift. */
function slidePath(index: number, field: string): string {
  return `slides.${index}.${field}`;
}

/**
 * The brand's mark, only where it can be SEEN.
 *
 * `logoOn` scores every variant the brand owns against this exact ground
 * and answers `undefined` when none of them clears the readability floor.
 * Nothing is drawn in that case — a cover with the brand's name set in
 * the brand's typeface is a finished cover, and a mark nobody can make
 * out is worse than no mark.
 */
function SlideLogo({
  brand,
  bg,
  show,
  heightPct,
}: {
  brand: Brand;
  bg: string;
  show: boolean;
  heightPct: string;
}) {
  const logo = show ? logoOn(brand, bg) : undefined;
  if (!logo) return null;
  return (
    <img
      src={logo.url}
      alt=""
      aria-hidden
      style={{ height: heightPct, width: 'auto', maxWidth: '40%', objectFit: 'contain' }}
    />
  );
}

function TitleSlide({ brand, deck, style, tokens, headingFont, bodyFont, showLogo }: SlideProps) {
  const muted = ink(tokens.textMuted, tokens.bg, tokens.text);
  const centred = style.align === 'center';
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center"
      style={{
        padding: '9%',
        alignItems: centred ? 'center' : 'flex-start',
        textAlign: centred ? 'center' : 'left',
      }}
    >
      <SlideLogo brand={brand} bg={tokens.bg} show={showLogo} heightPct="11%" />
      <Bind
        path="title"
        value={deck.title}
        fit="shrink"
        style={{
          fontFamily: headingFont,
          fontSize: typePx(style.coverPx),
          fontWeight: style.weight,
          letterSpacing: style.tracking,
          lineHeight: 1.05,
          color: tokens.text,
          marginTop: '4%',
          display: 'block',
          maxWidth: '100%',
        }}
      />
      <div
        style={{
          width: centred ? '14%' : '11%',
          height: '2px',
          backgroundColor: tokens.accent,
          margin: centred ? '5% 0' : '5% 0 5% 0',
        }}
      />
      <Bind
        path="subtitle"
        value={deck.subtitle}
        fit="wrap"
        style={{
          fontFamily: bodyFont,
          fontSize: typePx(5),
          lineHeight: 1.5,
          color: tokens.text,
          maxWidth: centred ? '78%' : '64%',
          display: 'block',
        }}
      />
      <div
        className="absolute flex items-baseline justify-between"
        style={{ left: '9%', right: '9%', bottom: '7%', fontFamily: bodyFont }}
      >
        <Bind path="presenter" value={deck.presenter} fit="clamp" style={{ ...EYEBROW, color: muted }} />
        <Bind path="date" value={deck.date} fit="clamp" style={{ ...EYEBROW, color: muted }} />
      </div>
    </div>
  );
}

function SectionSlide({ slide, index, style, tokens, headingFont, bodyFont, number }: SlideProps & { number: number }) {
  const muted = ink(tokens.textMuted, tokens.bg, tokens.text);
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center"
      style={{ padding: '9%' }}
    >
      <span
        style={{
          fontFamily: headingFont,
          fontSize: '9px',
          fontWeight: style.weight,
          color: ink(tokens.accent, tokens.bg, tokens.text, true),
          lineHeight: 1,
        }}
      >
        {String(number).padStart(2, '0')}
      </span>
      <Bind
        path={slidePath(index, 'heading')}
        value={slide.heading}
        fit="shrink"
        style={{
          fontFamily: headingFont,
          fontSize: typePx(style.headingPx + 4),
          fontWeight: style.weight,
          letterSpacing: style.tracking,
          lineHeight: 1.1,
          color: tokens.text,
          marginTop: '3%',
          display: 'block',
        }}
      />
      <Bind
        path={slidePath(index, 'body')}
        value={slide.body}
        fit="wrap"
        style={{
          fontFamily: bodyFont,
          fontSize: typePx(4.4),
          lineHeight: 1.55,
          color: muted,
          maxWidth: '68%',
          marginTop: '4%',
          display: 'block',
        }}
      />
    </div>
  );
}

function ContentSlide({ slide, index, style, tokens, headingFont, bodyFont }: SlideProps) {
  const muted = ink(tokens.textMuted, tokens.bg, tokens.text);
  return (
    <div
      className="absolute flex flex-col"
      style={{ left: '6%', right: '6%', top: '19%', bottom: '15%' }}
    >
      <HeadingRule style={style} tokens={tokens} />
      <Bind
        path={slidePath(index, 'heading')}
        value={slide.heading}
        fit="shrink"
        style={{
          fontFamily: headingFont,
          fontSize: typePx(style.headingPx),
          fontWeight: style.weight,
          letterSpacing: style.tracking,
          lineHeight: 1.1,
          color: tokens.text,
          display: 'block',
        }}
      />
      {slide.body.length > 0 && (
        <Bind
          path={slidePath(index, 'body')}
          value={slide.body}
          fit="wrap"
          style={{
            fontFamily: bodyFont,
            fontSize: typePx(4.4),
            lineHeight: 1.6,
            color: tokens.text,
            maxWidth: '76%',
            marginTop: '4%',
            display: 'block',
          }}
        />
      )}
      {slide.bullets.length > 0 && (
        <ul style={{ marginTop: '5%', display: 'grid', gap: '2.5%' }}>
          {slide.bullets.map((bullet, i) => (
            <li key={`${slide.id}-b-${i}`} className="flex items-baseline" style={{ gap: '4px' }}>
              <span
                aria-hidden
                style={{
                  width: '3px',
                  height: '3px',
                  flex: '0 0 auto',
                  backgroundColor: tokens.accent,
                  transform: 'translateY(-1px)',
                }}
              />
              <Bind
                path={slidePath(index, `bullets.${i}`)}
                value={bullet}
                fit="wrap"
                style={{
                  fontFamily: bodyFont,
                  fontSize: typePx(4.4),
                  lineHeight: 1.45,
                  color: muted,
                  display: 'block',
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatSlide({ slide, index, style, tokens, headingFont, bodyFont }: SlideProps) {
  const muted = ink(tokens.textMuted, tokens.bg, tokens.text);
  const statColor = ink(tokens.accent, tokens.bg, tokens.text, true);
  return (
    <div
      className="absolute flex flex-col justify-center"
      style={{ left: '6%', right: '6%', top: '17%', bottom: '15%' }}
    >
      <Bind
        path={slidePath(index, 'heading')}
        value={slide.heading}
        fit="clamp"
        style={{ ...EYEBROW, fontFamily: bodyFont, color: muted, display: 'block' }}
      />
      <Bind
        path={slidePath(index, 'stat.value')}
        value={slide.stat.value}
        fit="shrink"
        style={{
          fontFamily: headingFont,
          fontSize: '30px',
          fontWeight: style.weight,
          letterSpacing: style.tracking,
          lineHeight: 1,
          color: statColor,
          fontVariantNumeric: 'tabular-nums',
          marginTop: '3%',
          display: 'block',
        }}
      />
      <Bind
        path={slidePath(index, 'stat.label')}
        value={slide.stat.label}
        fit="clamp"
        style={{
          ...EYEBROW,
          fontFamily: bodyFont,
          color: tokens.text,
          fontWeight: 600,
          marginTop: '2%',
          display: 'block',
        }}
      />
      {slide.body.length > 0 && (
        <Bind
          path={slidePath(index, 'body')}
          value={slide.body}
          fit="wrap"
          style={{
            fontFamily: bodyFont,
            fontSize: typePx(4.2),
            lineHeight: 1.55,
            color: muted,
            maxWidth: '62%',
            marginTop: '4%',
            display: 'block',
          }}
        />
      )}
    </div>
  );
}

function QuoteSlide({ slide, index, style, tokens, headingFont, bodyFont }: SlideProps) {
  const muted = ink(tokens.textMuted, tokens.bg, tokens.text);
  return (
    <div
      className="absolute flex flex-col justify-center"
      style={{ left: '8%', right: '8%', top: '17%', bottom: '15%' }}
    >
      <Bind
        path={slidePath(index, 'heading')}
        value={slide.heading}
        fit="clamp"
        style={{ ...EYEBROW, fontFamily: bodyFont, color: muted, display: 'block' }}
      />
      <Bind
        path={slidePath(index, 'quote.text')}
        value={slide.quote.text}
        fit="wrap"
        style={{
          fontFamily: headingFont,
          fontSize: '8px',
          fontWeight: style.weight - 100,
          lineHeight: 1.35,
          color: tokens.text,
          marginTop: '4%',
          display: 'block',
        }}
      />
      <Bind
        path={slidePath(index, 'quote.by')}
        value={slide.quote.by}
        fit="clamp"
        style={{
          ...EYEBROW,
          fontFamily: bodyFont,
          color: ink(tokens.accent, tokens.bg, tokens.text),
          fontWeight: 600,
          marginTop: '5%',
          display: 'block',
        }}
      />
      {slide.body.length > 0 && (
        <Bind
          path={slidePath(index, 'body')}
          value={slide.body}
          fit="wrap"
          style={{
            fontFamily: bodyFont,
            fontSize: typePx(4.2),
            lineHeight: 1.55,
            color: muted,
            maxWidth: '66%',
            marginTop: '3%',
            display: 'block',
          }}
        />
      )}
    </div>
  );
}

function ClosingSlide({ brand, deck, slide, index, style, tokens, headingFont, bodyFont, showLogo }: SlideProps) {
  const muted = ink(tokens.textMuted, tokens.bg, tokens.text);
  const centred = style.align === 'center';
  return (
    <div
      className="absolute inset-0 flex flex-col justify-center"
      style={{
        padding: '9%',
        alignItems: centred ? 'center' : 'flex-start',
        textAlign: centred ? 'center' : 'left',
      }}
    >
      <SlideLogo brand={brand} bg={tokens.bg} show={showLogo} heightPct="9%" />
      <Bind
        path={slidePath(index, 'heading')}
        value={slide.heading}
        fit="shrink"
        style={{
          fontFamily: headingFont,
          fontSize: typePx(style.coverPx - 3),
          fontWeight: style.weight,
          letterSpacing: style.tracking,
          lineHeight: 1.1,
          color: tokens.text,
          marginTop: '4%',
          display: 'block',
        }}
      />
      <Bind
        path={slidePath(index, 'body')}
        value={slide.body}
        fit="wrap"
        style={{
          fontFamily: bodyFont,
          fontSize: typePx(5),
          lineHeight: 1.5,
          color: tokens.text,
          maxWidth: centred ? '74%' : '60%',
          marginTop: '4%',
          display: 'block',
        }}
      />
      <div
        className="absolute flex items-baseline justify-between gap-[4%]"
        style={{ left: '9%', right: '9%', bottom: '7%', fontFamily: bodyFont }}
      >
        <span className="flex items-baseline" style={{ gap: '5px', minWidth: 0 }}>
          <Bind
            path="title"
            value={deck.title}
            fit="clamp"
            style={{ ...EYEBROW, color: ink(tokens.accent, tokens.bg, tokens.text), fontWeight: 600 }}
          />
          <Bind
            path="subtitle"
            value={deck.subtitle}
            fit="clamp"
            style={{ ...EYEBROW, color: muted, maxWidth: '60%' }}
          />
        </span>
        <span className="flex items-baseline" style={{ gap: '5px' }}>
          <Bind path="presenter" value={deck.presenter} fit="clamp" style={{ ...EYEBROW, color: muted }} />
          <Bind path="date" value={deck.date} fit="clamp" style={{ ...EYEBROW, color: muted }} />
        </span>
      </div>
    </div>
  );
}

/* ── Assembly ─────────────────────────────────────────────────────── */

/** Which surface a slide of this kind takes in this family. */
function surfaceForSlide(style: DeckStyle, kind: DeckSlide['kind']): SurfaceKind {
  if (kind === 'title' || kind === 'closing') return style.cover;
  if (kind === 'section') return style.divider;
  return style.page;
}

/**
 * The surface a slide of this kind takes in a family.
 *
 * Exported so the Presentation System view can DESCRIBE the system it is
 * about to show without a second opinion about it: the swatch beside
 * "Divider" is the exact ground the divider slide below it paints on.
 */
export function deckSurfaceKind(family: DeckFamily, kind: DeckSlide['kind']): SurfaceKind {
  return surfaceForSlide(DECK_STYLES[family], kind);
}

/** Kinds that compose the whole slide themselves, chrome included. */
const FULL_BLEED: ReadonlySet<DeckSlide['kind']> = new Set(['title', 'closing']);

export type DeckRendererProps = {
  brand: Brand;
  templateIndex: number;
  content?: DeliverableContent;
};

/**
 * One deck family, one slide.
 *
 * `templateIndex` is the `-ext-N` suffix minus one, which is the slide's
 * position in the deck. It wraps rather than clamping so a saved
 * customization pointing at an id beyond the deck's length still paints
 * a real slide instead of falling back to the cover for all of them.
 */
function DeckSlideRenderer({
  family,
  brand: rawBrand,
  templateIndex,
  content,
}: DeckRendererProps & { family: DeckFamily }) {
  const deckContent = content && isDeck(content) ? content : undefined;
  const picks = content?.picks;
  const brand = brandWithPicks(rawBrand, picks);
  // Falls back to the kind's own brand-derived defaults, so a surface
  // that renders without passing content (a cover thumbnail, a standalone
  // preview) still paints this brand's deck rather than an empty frame.
  // The family IS the document: a plan's ten slides are not a pitch's ten
  // slides (QA Q10), so the fallback is written for THIS family rather
  // than shared across all five.
  const deck: DeckContent = deckContent ?? defaultDeckContent(brand, new Date(), family);
  const slides =
    deck.slides.length > 0 ? deck.slides : defaultDeckContent(brand, new Date(), family).slides;
  const index = ((templateIndex % slides.length) + slides.length) % slides.length;
  const slide = slides[index]!;

  const style = DECK_STYLES[family];
  const tokens = surface(brand, surfaceForSlide(style, slide.kind));
  const mat = surface(brand, style.mat).bg;
  const headingFont = fontStack(brand, 'heading');
  const bodyFont = fontStack(brand, 'body');
  const showLogo = picks?.showLogo !== false;

  const props: SlideProps = {
    brand,
    deck,
    slide,
    index,
    style,
    tokens,
    headingFont,
    bodyFont,
    showLogo,
  };

  return (
    <SlideFrame mat={mat} tokens={tokens}>
      {!FULL_BLEED.has(slide.kind) && (
        <SlideChrome
          deck={deck}
          tokens={tokens}
          style={style}
          bodyFont={bodyFont}
          number={index + 1}
          total={slides.length}
        />
      )}
      {slide.kind === 'title' && <TitleSlide {...props} />}
      {slide.kind === 'section' && <SectionSlide {...props} number={index + 1} />}
      {slide.kind === 'content' && <ContentSlide {...props} />}
      {slide.kind === 'stat' && <StatSlide {...props} />}
      {slide.kind === 'quote' && <QuoteSlide {...props} />}
      {slide.kind === 'closing' && <ClosingSlide {...props} />}
    </SlideFrame>
  );
}

export function PitchDeckRenderer(props: DeckRendererProps) {
  return <DeckSlideRenderer family="pitch" {...props} />;
}

export function BusinessPlanRenderer(props: DeckRendererProps) {
  return <DeckSlideRenderer family="plan" {...props} />;
}

export function PortfolioRenderer(props: DeckRendererProps) {
  return <DeckSlideRenderer family="portfolio" {...props} />;
}

export function ProposalRenderer(props: DeckRendererProps) {
  return <DeckSlideRenderer family="proposal" {...props} />;
}

export function CaseStudyRenderer(props: DeckRendererProps) {
  return <DeckSlideRenderer family="case" {...props} />;
}

/* ── Template meta ────────────────────────────────────────────────── */

/**
 * Thirty ids per family, ten of them live.
 *
 * The list stays thirty long because a template id is a persistence key:
 * `pres-plan-ext-24` may be sitting in somebody's saved kit, and
 * renumbering would hand their customization to a different slide. The
 * twenty tripled ids are archived in `curation/presentations.ts` — they
 * vanish from every surface and stay valid as keys. Kept ids take their
 * human names from that same file.
 */
const baseMeta = (prefix: string) =>
  Array.from({ length: 30 }, (_, i) => ({
    idSuffix: `ext-${i + 1}`,
    name: `${prefix} ${i + 1}`,
    category: 'Editorial',
  }));

export const PITCH_DECK_EXTENDED = baseMeta('Pitch');
export const BUSINESS_PLAN_EXTENDED = baseMeta('Plan');
export const PORTFOLIO_EXTENDED = baseMeta('Portfolio');
export const PROPOSAL_EXTENDED = baseMeta('Proposal');
export const CASE_STUDY_EXTENDED = baseMeta('Case');

/** The number of slides a deck card shows — see `curation/presentations.ts`. */
export const DECK_SLIDES_KEPT = 10;
