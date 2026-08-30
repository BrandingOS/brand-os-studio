/**
 * Business cards — the curated set, and the machinery every one of them
 * shares.
 *
 * WHAT CHANGED, AND WHY
 *
 * This family advertised 130 variants. `.audit/CODE.md` §2 measured what
 * they actually were: ~55 of the hundred Wave-2 designs printed "VP" over
 * the bound job title, five of them tiled the letters "JN / SM / XX", one
 * printed `> jane_smith`, one an issue number "N° 013" and one a founding
 * year computed from the length of the brand's name. None of that is
 * content a customer can reach, and all of it is content a customer reads.
 *
 * So the family is now 24 designs, and the bar every one of them clears is
 * the same:
 *
 *   • **Ten fields, every card.** A business card is the `person` kind, and
 *     the whole of it — name, pronouns, role, company, tagline, e-mail,
 *     phone, website, social handle, address — is declared through `<Bind>`.
 *     There is no design here that shows something the panel cannot edit,
 *     and none that hides a field the panel offers.
 *   • **Two sides.** A business card has a back, and pretending otherwise
 *     is why every previous design had to cram the brand and the person
 *     onto one face. The back is the brand's: its logo, chosen for the
 *     ground it sits on by `logoOn`, on a brand-coloured card. The tile
 *     shows the pair the way a printer's proof does — the front resting on
 *     the back — which is also why the front is the larger of the two.
 *   • **The brand's own type and colour.** Every family, surface and
 *     foreground comes from `brandStyle`. There is not one hex in this
 *     file, and not one typeface name.
 *   • **Readable at 260px.** The renderers are authored against
 *     `RENDERER_BASE_WIDTH`; nothing here is smaller than 5px at that
 *     width, and a colour that would not clear WCAG AA on its own ground is
 *     moved until it does (`accentOn`) rather than being printed anyway.
 *     That last rule is the fix for the one violation the contrast guard
 *     shipped with: the brand's violet job title on a near-black panel.
 *
 * The 94 Wave-2 designs and the 12 legacy ones are ARCHIVED, not deleted —
 * see `renderers/curation/businessCards.ts`. Their ids stay reserved so a
 * saved customization keyed to one still resolves.
 *
 * This module also exports the machinery (`cardTheme`, `CardStage`,
 * `CardBack`, `fragments`, …) that `BusinessCardsExtended2.tsx` builds its
 * six designs from, so the two waves cannot drift into two opinions about
 * what a card is.
 */
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { Bind } from '@/features/brandkit/content/Bind';
import { hydrateContent, isPerson, type PersonContent } from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import {
  brandColors,
  contrastOf,
  fgOn,
  fontStack,
  logoOn,
  normalizeHex,
  surface,
} from './brandStyle';
import { typePx } from './typeFloor';

/* ── What a renderer is handed ────────────────────────────────────── */

/**
 * The content a card paints from.
 *
 * Partial because every caller supplies a different amount: the drilldown
 * grid and every offscreen export pass nothing at all, the editor passes a
 * whole hydrated `person`. `hydrateContent` fills the rest from the brand.
 */
export type PersonCardContent = Partial<PersonContent> & {
  kind?: 'person';
  picks?: TemplateDesignPicks;
};

export interface BusinessCardProps {
  brand: Brand;
  templateIndex: number;
  content?: PersonCardContent;
}

/* ── Colour arithmetic ────────────────────────────────────────────── */

function channels(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? '#000000';
  return [
    Number.parseInt(h.slice(1, 3), 16),
    Number.parseInt(h.slice(3, 5), 16),
    Number.parseInt(h.slice(5, 7), 16),
  ];
}

/** `t` of the way from `a` to `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = channels(a);
  const [r2, g2, b2] = channels(b);
  const pair = (n: number) =>
    Math.round(Math.max(0, Math.min(255, n)))
      .toString(16)
      .padStart(2, '0');
  return `#${pair(r1 + (r2 - r1) * t)}${pair(g1 + (g2 - g1) * t)}${pair(b1 + (b2 - b1) * t)}`;
}

/**
 * A quieter ink that still reads.
 *
 * Secondary text on a card is quieter than the heading, and the cheap way
 * to say that is opacity — which is exactly how a "subtle" caption becomes
 * an unreadable one, because the contrast guard composites translucent ink
 * and so does a human eye. This walks toward the ground only as far as AA
 * still holds, so "quieter" can never become "gone".
 */
export function mutedOn(bg: string, ink: string): string {
  for (const t of [0.45, 0.36, 0.28, 0.2, 0.12]) {
    const candidate = mixHex(ink, bg, t);
    if (contrastOf(candidate, bg) >= 4.6) return candidate;
  }
  return ink;
}

/**
 * The brand's colour, moved only as far as it must be to read on `bg`.
 *
 * The alternative — printing the brand hex whatever the ground — is the
 * defect the contrast guard shipped with, and it is not a string bug: the
 * job title said the right thing, in a colour nobody could see.
 */
export function accentOn(bg: string, colour: string, min = 4.5): string {
  if (contrastOf(colour, bg) >= min) return colour;
  const target = fgOn(bg);
  for (let step = 1; step <= 10; step += 1) {
    const candidate = mixHex(colour, target, step / 10);
    if (contrastOf(candidate, bg) >= min) return candidate;
  }
  return target;
}

/* ── The theme a card paints with ─────────────────────────────────── */

export type CardTheme = {
  /** The stage the two cards rest on. */
  ground: string;
  groundLine: string;
  /** The ordinary card face. */
  paper: string;
  paperInk: string;
  paperMuted: string;
  paperLine: string;
  paperAccent: string;
  /** A tinted face — the brand's hue, at page weight. */
  tint: string;
  tintInk: string;
  tintMuted: string;
  tintLine: string;
  tintAccent: string;
  /** The brand's own colour as a ground. */
  brandBg: string;
  brandInk: string;
  brandMuted: string;
  brandLine: string;
  /** The brand's secondary as a ground. */
  secondBg: string;
  secondInk: string;
  secondMuted: string;
  /** Near-black (or near-white in a dark palette). */
  darkBg: string;
  darkInk: string;
  darkMuted: string;
  darkAccent: string;
  /** Raw brand colours, for rules and blocks — never for small text. */
  primary: string;
  secondary: string;
  heading: string;
  body: string;
  mono: string;
};

/**
 * Project the design picks onto the brand before any surface is asked for.
 *
 * A pick is the customer's answer to "what colour is this card", so it has
 * to arrive BEFORE `surfacePalette` derives grounds, borders and readable
 * foregrounds from it — applying it afterwards would paint the pick on top
 * of a palette built from a colour the card no longer uses.
 */
function withPicks(brand: Brand, picks?: TemplateDesignPicks): Brand {
  const primary = normalizeHex(picks?.primaryColor);
  const secondary = normalizeHex(picks?.secondaryColor);
  if (!primary && !secondary) return brand;
  const system: Partial<NonNullable<Brand['colorSystem']>> = brand?.colorSystem ?? {};
  return {
    ...brand,
    primaryColor: primary ?? brand?.primaryColor,
    secondaryColor: secondary ?? brand?.secondaryColor,
    colorSystem: {
      ...system,
      primary: { ...(system.primary ?? {}), hex: primary ?? system.primary?.hex ?? brand?.primaryColor },
      secondary: {
        ...(system.secondary ?? {}),
        hex: secondary ?? system.secondary?.hex ?? brand?.secondaryColor,
      },
    },
  } as Brand;
}

export function cardTheme(brand: Brand): CardTheme {
  const page = surface(brand, 'page');
  const card = surface(brand, 'card');
  const subtle = surface(brand, 'subtle');
  const brandS = surface(brand, 'brand');
  const second = surface(brand, 'brand-secondary');
  const dark = surface(brand, 'inverted');
  const colours = brandColors(brand);
  return {
    ground: page.bg,
    groundLine: page.border,
    paper: card.bg,
    paperInk: card.text,
    paperMuted: mutedOn(card.bg, card.text),
    paperLine: card.border,
    paperAccent: accentOn(card.bg, colours.primary),
    tint: subtle.bg,
    tintInk: subtle.text,
    tintMuted: mutedOn(subtle.bg, subtle.text),
    tintLine: subtle.border,
    tintAccent: accentOn(subtle.bg, colours.primary),
    brandBg: brandS.bg,
    brandInk: brandS.text,
    brandMuted: mutedOn(brandS.bg, brandS.text),
    brandLine: mixHex(brandS.text, brandS.bg, 0.62),
    secondBg: second.bg,
    secondInk: second.text,
    secondMuted: mutedOn(second.bg, second.text),
    darkBg: dark.bg,
    darkInk: dark.text,
    darkMuted: mutedOn(dark.bg, dark.text),
    darkAccent: accentOn(dark.bg, colours.primary),
    primary: colours.primary,
    secondary: colours.secondary,
    heading: fontStack(brand, 'heading'),
    body: fontStack(brand, 'body'),
    mono: fontStack(brand, 'mono'),
  };
}

/* ── The mark ─────────────────────────────────────────────────────── */

/** Up to two letters from whatever the customer called the company. */
function monogram(company: string): string {
  const words = company
    .split(/[\s·—–-]+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ''))
    .filter(Boolean);
  if (words.length === 0) return '';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/**
 * The brand's mark, on a known ground.
 *
 * `logoOn` answers with the variant that READS on this background, or with
 * nothing — and nothing is a real answer, not a failure: a brand with no
 * usable variant gets its monogram rather than an invisible logo. The
 * monogram's letters come from the bound company name, so it follows an
 * edit like everything else on the card.
 *
 * `picks.showLogo === false` removes the mark entirely; `picks.logoColor`
 * inks the monogram. A logo IMAGE is recoloured upstream, by the editor,
 * before the brand ever reaches a renderer.
 *
 * A url that FAILS falls back to the monogram rather than leaving a hole,
 * and this is not hypothetical: the card editor's preview brand hands us a
 * `data:image/svg+xml` wrapper containing `<image href="/brands/…/logo.svg">`,
 * and a data-URI document is an opaque origin that may not load an external
 * subresource — so the mark silently vanished on the one surface where the
 * customer is looking hardest. Fixing the wrapper belongs to the editor;
 * surviving a broken url belongs here.
 */
export function Mark({
  brand,
  theme,
  on,
  height,
  picks,
  company,
}: {
  brand: Brand;
  theme: CardTheme;
  on: string;
  height: number;
  picks?: TemplateDesignPicks;
  company: string;
}) {
  // The url that failed, not a boolean: a new logo must be given its own
  // chance to load rather than inheriting the last one's failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (picks?.showLogo === false) return null;
  const resolved = logoOn(brand, on);
  if (resolved?.url && resolved.url !== failedUrl) {
    return (
      <img
        src={resolved.url}
        alt=""
        onError={() => setFailedUrl(resolved.url!)}
        style={{
          height: `${height}px`,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    );
  }
  const picked = normalizeHex(picks?.logoColor);
  const ink = picked ? accentOn(on, picked) : fgOn(on);
  const letters = monogram(company);
  if (!letters) return null;
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block',
        fontFamily: theme.heading,
        fontSize: typePx(Math.max(6, height * 0.78)),
        lineHeight: 1,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        color: ink,
      }}
    >
      {letters}
    </span>
  );
}

/* ── The stage: a front card resting on its back ──────────────────── */

/**
 * The two sides, laid out the way a proof sheet shows them.
 *
 * The stage is 1.6:1 (`PICKER_ASPECT_BY_LABEL['Business Card']`), so a box
 * whose width and height percentages are EQUAL is itself 1.6:1. That is
 * why there is no `aspect-ratio` here: html2canvas — which is what every
 * export in the kit rasterises through — does not implement it, and a card
 * that collapsed only in the download would be the worst possible place to
 * find out.
 *
 * The geometry is chosen so the back's mark is never under the front: the
 * front's top edge sits at 30% of the stage, and the back's mark sits above
 * it.
 */
export function CardStage({
  theme,
  front,
  back,
}: {
  theme: CardTheme;
  front: ReactNode;
  back: ReactNode;
}) {
  const shell: CSSProperties = {
    position: 'absolute',
    borderRadius: '4px',
    overflow: 'hidden',
  };
  return (
    <div
      data-bk-card-stage
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: theme.ground,
        overflow: 'hidden',
      }}
    >
      <div
        data-bk-card-side="back"
        style={{
          ...shell,
          right: '1.5%',
          top: '2%',
          width: '46%',
          height: '46%',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
        }}
      >
        {back}
      </div>
      <div
        data-bk-card-side="front"
        style={{
          ...shell,
          left: '1.5%',
          bottom: '2%',
          width: '70%',
          height: '70%',
          boxShadow: '0 3px 9px rgba(0,0,0,0.22)',
        }}
      >
        {front}
      </div>
    </div>
  );
}

/** A card face — the opaque ground every text node on it is measured against. */
export function Face({
  bg,
  children,
  pad = '9% 8%',
  style,
}: {
  bg: string;
  children: ReactNode;
  pad?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: bg,
        padding: pad,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * The back of the card: the brand's mark on a brand ground.
 *
 * Deliberately says nothing else. The back is where the person stops and
 * the brand starts, and a back with a second copy of the phone number is a
 * front that ran out of room.
 *
 * The mark sits at 22% down rather than centred because the front rests
 * over the back's lower half in the stage above — a centred mark would be
 * a mark you cannot see.
 */
export function CardBack({
  brand,
  theme,
  picks,
  company,
  tone = 'brand',
}: {
  brand: Brand;
  theme: CardTheme;
  picks?: TemplateDesignPicks;
  company: string;
  tone?: 'brand' | 'second' | 'dark' | 'paper';
}) {
  const bg =
    tone === 'second'
      ? theme.secondBg
      : tone === 'dark'
        ? theme.darkBg
        : tone === 'paper'
          ? theme.paper
          : theme.brandBg;
  return (
    <div
      data-bk-card-back
      style={{
        position: 'absolute',
        inset: 0,
        background: bg,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '20%',
      }}
    >
      <Mark brand={brand} theme={theme} on={bg} height={17} picks={picks} company={company} />
    </div>
  );
}

/* ── Type helpers ─────────────────────────────────────────────────── */

/** Nothing on a card is smaller than this at the 260px base width. */
const MIN_TEXT = 5;

const UPPER: CSSProperties = { textTransform: 'uppercase', letterSpacing: '0.13em' };

function text(size: number, color: string, font: string, extra: CSSProperties = {}): CSSProperties {
  return {
    fontSize: typePx(Math.max(MIN_TEXT, size)),
    lineHeight: 1.3,
    color,
    fontFamily: font,
    ...extra,
  };
}

/** The contact block — four lines, in one column. */
function Contacts({
  f,
  color,
  font,
  size = 5.6,
  align = 'left',
  gap = 1.6,
}: {
  f: Frag;
  color: string;
  font: string;
  size?: number;
  align?: CSSProperties['textAlign'];
  gap?: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: `${gap}px`,
        textAlign: align,
        ...text(size, color, font),
      }}
    >
      <div>{f.Email}</div>
      <div>{f.Phone}</div>
      <div>{f.Site}</div>
      <div>{f.Social}</div>
    </div>
  );
}

/** The same four, as two columns — for faces that are wider than they are tall. */
function ContactsSplit({
  f,
  color,
  font,
  size = 5.6,
  gap = 1.6,
}: {
  f: Frag;
  color: string;
  font: string;
  size?: number;
  gap?: number;
}) {
  return (
    <div style={{ display: 'flex', gap: '8%', ...text(size, color, font) }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, minWidth: 0 }}>
        <div>{f.Email}</div>
        <div>{f.Phone}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, minWidth: 0 }}>
        <div>{f.Site}</div>
        <div>{f.Social}</div>
      </div>
    </div>
  );
}

/**
 * The shared type helpers, published for Wave 2.
 *
 * `BusinessCardsExtended2.tsx` draws its six designs from exactly these —
 * the same minimum size, the same uppercase tracking, the same contact
 * ladders — so the two waves cannot drift into two opinions about what a
 * card is. Renamed on the way out (`text` → `cardText`) only because a
 * three-letter name is fine inside one module and not across two.
 */
export { Contacts, ContactsSplit, UPPER, text as cardText };

/* ── The bound fragments ──────────────────────────────────────────── */

export type Frag = {
  Name: ReactNode;
  Pron: ReactNode;
  Role: ReactNode;
  Company: ReactNode;
  Tagline: ReactNode;
  Email: ReactNode;
  Phone: ReactNode;
  Site: ReactNode;
  Social: ReactNode;
  Address: ReactNode;
};

/**
 * Every field the `person` kind offers, declared once.
 *
 * Each design places these; none of them re-declares a path, and none of
 * them prints a string that is not one of these. That is what makes the
 * bind sweep an assertion about the family rather than about one design.
 *
 * Pronouns carry their own separator so an unanswered field leaves no
 * orphaned middot behind — but the region is still declared, so filling it
 * in later paints it on all 24 designs with no further work.
 */
export function fragments(c: PersonContent): Frag {
  const pronouns = c.pronouns ?? '';
  return {
    Name: <Bind path="fullName" value={c.fullName} fit="shrink" />,
    Pron: (
      <>
        {pronouns ? ' · ' : ''}
        <Bind path="pronouns" value={pronouns} />
      </>
    ),
    Role: <Bind path="jobTitle" value={c.jobTitle} fit="shrink" />,
    Company: <Bind path="company" value={c.company} fit="shrink" />,
    Tagline: <Bind path="tagline" value={c.tagline} />,
    Email: <Bind path="email" value={c.email} />,
    Phone: <Bind path="phone" value={c.phone} />,
    Site: <Bind path="website" value={c.website} />,
    Social: <Bind path="socialHandle" value={c.socialHandle ?? ''} />,
    Address: <Bind path="address" value={c.address} />,
  };
}

/* ── Designs ──────────────────────────────────────────────────────── */

export type CardCtx = {
  brand: Brand;
  theme: CardTheme;
  f: Frag;
  picks?: TemplateDesignPicks;
  company: string;
};

export type CardDesign = (ctx: CardCtx) => { front: ReactNode; back: ReactNode };

const DESIGNS: CardDesign[] = [
  // 1 — Editorial Rule. A masthead: the company above a hairline, the
  // person below it, the contacts set as a two-column footer.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={text(5.4, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
          <Mark brand={brand} theme={t} on={t.paper} height={11} picks={picks} company={company} />
        </div>
        <div style={{ height: '1px', background: t.paperLine, margin: '4px 0 5px' }} />
        <div style={text(12, t.paperInk, t.heading, { fontWeight: 600, letterSpacing: '-0.015em' })}>
          {f.Name}
          <span style={text(5.4, t.paperMuted, t.body)}>{f.Pron}</span>
        </div>
        <div style={text(6, t.paperAccent, t.body, { marginTop: '1px', ...UPPER })}>{f.Role}</div>
        <div style={text(5.4, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
        <div style={{ marginTop: 'auto' }}>
          <ContactsSplit f={f} color={t.paperInk} font={t.body} />
          <div style={text(5.1, t.paperMuted, t.body, { marginTop: '3px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 2 — Colour Block. A brand panel down the left carrying the mark and
  // the tagline; the person's details on paper to the right of it.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div style={{ display: 'flex', height: '100%' }}>
          <div
            style={{
              width: '33%',
              background: t.brandBg,
              padding: '9% 6%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Mark brand={brand} theme={t} on={t.brandBg} height={13} picks={picks} company={company} />
            <div style={text(5.2, t.brandInk, t.body)}>{f.Tagline}</div>
          </div>
          <div
            style={{
              flex: 1,
              padding: '9% 7%',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
            <div
              style={text(11, t.paperInk, t.heading, {
                fontWeight: 600,
                marginTop: '4px',
                letterSpacing: '-0.015em',
              })}
            >
              {f.Name}
              <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
            </div>
            <div style={text(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
            <div style={{ marginTop: 'auto' }}>
              <Contacts f={f} color={t.paperInk} font={t.body} size={5.4} gap={1.2} />
              <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
            </div>
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="dark" />,
  }),

  // 3 — Brute Slab. Near-black, the name set as large as the face allows,
  // contacts in the mono ladder. The accent is moved onto the panel rather
  // than printed at the brand's own value — the whole point of `accentOn`.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.darkBg}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={text(5.3, t.darkMuted, t.mono, UPPER)}>{f.Company}</div>
          <Mark brand={brand} theme={t} on={t.darkBg} height={11} picks={picks} company={company} />
        </div>
        <div
          style={text(13.5, t.darkInk, t.heading, {
            fontWeight: 700,
            marginTop: '6px',
            lineHeight: 1.02,
            ...UPPER,
            letterSpacing: '-0.01em',
          })}
        >
          {f.Name}
        </div>
        <div style={text(5.8, t.darkAccent, t.mono, { marginTop: '3px', ...UPPER })}>
          {f.Role}
          <span style={text(5.4, t.darkMuted, t.mono)}>{f.Pron}</span>
        </div>
        <div style={text(5.4, t.darkMuted, t.body, { marginTop: '3px' })}>{f.Tagline}</div>
        <div style={{ marginTop: 'auto' }}>
          <ContactsSplit f={f} color={t.darkInk} font={t.mono} size={5.4} gap={1.3} />
          <div style={text(5.1, t.darkMuted, t.mono, { marginTop: '3px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 4 — Soft Layer. A tinted face with a solid brand shelf along the
  // bottom; the contacts live on the shelf, so they are measured against
  // it and not against the tint above.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.tint} pad="0">
        <div style={{ padding: '9% 8% 6%', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Mark brand={brand} theme={t} on={t.tint} height={12} picks={picks} company={company} />
            <div style={text(5.3, t.tintMuted, t.body, UPPER)}>{f.Company}</div>
          </div>
          <div
            style={text(11.5, t.tintInk, t.heading, {
              fontWeight: 600,
              marginTop: 'auto',
              letterSpacing: '-0.015em',
            })}
          >
            {f.Name}
            <span style={text(5.3, t.tintMuted, t.body)}>{f.Pron}</span>
          </div>
          <div style={text(5.9, t.tintAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
          <div style={text(5.2, t.tintMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
        </div>
        <div style={{ background: t.brandBg, padding: '5% 8%' }}>
          <ContactsSplit f={f} color={t.brandInk} font={t.body} size={5.3} gap={1.1} />
          <div style={text(5.1, t.brandMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="paper" />,
  }),

  // 5 — Centre Stack. Symmetrical, formal: mark, name, rule, contacts.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="6% 8%" style={{ alignItems: 'center', textAlign: 'center' }}>
        <Mark brand={brand} theme={t} on={t.paper} height={10} picks={picks} company={company} />
        <div style={text(5.3, t.paperMuted, t.body, { marginTop: '3px', ...UPPER })}>
          {f.Company}
        </div>
        <div
          style={text(10, t.paperInk, t.heading, {
            fontWeight: 600,
            marginTop: '1px',
            letterSpacing: '-0.01em',
          })}
        >
          {f.Name}
          <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
        </div>
        <div style={text(5.6, t.paperAccent, t.body, { ...UPPER })}>{f.Role}</div>
        <div style={{ width: '22%', height: '1px', background: t.paperLine, margin: '3px 0' }} />
        <div style={text(5.2, t.paperMuted, t.body)}>{f.Tagline}</div>
        <div style={{ marginTop: 'auto', width: '100%' }}>
          <Contacts f={f} color={t.paperInk} font={t.body} size={5.3} align="center" gap={0.5} />
          <div style={text(5.1, t.paperMuted, t.body, { marginTop: '1px', textAlign: 'center' })}>
            {f.Address}
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 6 — Corner Mark. Everything pushed to the four corners, the middle
  // left empty. The most conservative layout in the set, on purpose.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Mark brand={brand} theme={t} on={t.paper} height={12} picks={picks} company={company} />
          <div style={{ textAlign: 'right' }}>
            <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
            <div style={text(5.1, t.paperMuted, t.body, { marginTop: '1px' })}>{f.Tagline}</div>
          </div>
        </div>
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: '6%',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={text(11, t.paperInk, t.heading, { fontWeight: 600, letterSpacing: '-0.015em' })}>
              {f.Name}
              <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
            </div>
            <div style={text(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
            <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
          </div>
          <Contacts f={f} color={t.paperInk} font={t.body} size={5.4} align="right" gap={1.1} />
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="second" />,
  }),

  // 7 — Full Brand. The face is the brand's colour and the back is the
  // paper — the reverse of every other card here, which is the point.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.brandBg}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={text(5.4, t.brandMuted, t.body, UPPER)}>{f.Company}</div>
            <div style={text(5.2, t.brandMuted, t.body, { marginTop: '1px' })}>{f.Tagline}</div>
          </div>
          <Mark brand={brand} theme={t} on={t.brandBg} height={12} picks={picks} company={company} />
        </div>
        <div
          style={text(12, t.brandInk, t.heading, {
            fontWeight: 600,
            marginTop: 'auto',
            letterSpacing: '-0.015em',
          })}
        >
          {f.Name}
          <span style={text(5.3, t.brandMuted, t.body)}>{f.Pron}</span>
        </div>
        <div style={text(5.9, t.brandInk, t.body, { marginTop: '1px', ...UPPER })}>{f.Role}</div>
        <div style={{ height: '1px', background: t.brandLine, margin: '5px 0' }} />
        <ContactsSplit f={f} color={t.brandInk} font={t.body} size={5.4} gap={1.1} />
        <div style={text(5.1, t.brandMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="paper" />,
  }),

  // 8 — Drafting Grid. A faint measured grid, drawn as a SIBLING layer so
  // the text is still measured against the paper it sits on rather than
  // being skipped as "text on an image".
  ({ brand, theme: t, f, picks, company }) => {
    const gridLine = mixHex(t.paperLine, t.paper, 0.45);
    return {
    front: (
      <div style={{ position: 'absolute', inset: 0, background: t.paper, overflow: 'hidden' }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            // `to bottom` / `to right`, never `0deg` / `90deg`: measured in
            // Chromium, `repeating-linear-gradient(0deg, …)` with a
            // sub-pixel first stop draws NOTHING, so the grid shipped as a
            // set of vertical stripes — ruled paper, not a drafting grid.
            // The 0.8px rule survives the ScalingStage's transform; 0.5px
            // did not.
            backgroundImage: `repeating-linear-gradient(to bottom, ${gridLine} 0 0.8px, transparent 0.8px 7px), repeating-linear-gradient(to right, ${gridLine} 0 0.8px, transparent 0.8px 7px)`,
          }}
        />
        <Face bg="transparent">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Mark brand={brand} theme={t} on={t.paper} height={11} picks={picks} company={company} />
            <div style={text(5.3, t.paperMuted, t.mono, UPPER)}>{f.Company}</div>
          </div>
          <div
            style={text(11, t.paperInk, t.heading, {
              fontWeight: 600,
              marginTop: '7px',
              letterSpacing: '-0.015em',
            })}
          >
            {f.Name}
            <span style={text(5.2, t.paperMuted, t.mono)}>{f.Pron}</span>
          </div>
          <div style={text(5.7, t.paperAccent, t.mono, { marginTop: '1px', ...UPPER })}>{f.Role}</div>
          <div style={text(5.2, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
          <div style={{ marginTop: 'auto' }}>
            <ContactsSplit f={f} color={t.paperInk} font={t.mono} size={5.3} gap={1.2} />
            <div style={text(5.1, t.paperMuted, t.mono, { marginTop: '2px' })}>{f.Address}</div>
          </div>
        </Face>
      </div>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="dark" />,
    };
  },

  // 9 — Spine. A brand rule down the left edge; the type indented off it.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div style={{ display: 'flex', height: '100%' }}>
          <div style={{ width: '7%', background: t.brandBg }} />
          <div
            style={{
              flex: 1,
              padding: '9% 8% 9% 6%',
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
              <Mark brand={brand} theme={t} on={t.paper} height={11} picks={picks} company={company} />
            </div>
            <div
              style={text(11.5, t.paperInk, t.heading, {
                fontWeight: 600,
                marginTop: 'auto',
                letterSpacing: '-0.015em',
              })}
            >
              {f.Name}
              <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
            </div>
            <div style={text(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
            <div style={text(5.2, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
            <div style={{ marginTop: '6px' }}>
              <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.4} gap={1.1} />
              <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
            </div>
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 10 — Base Band. A solid brand band along the foot of the card holding
  // the contact ladder, the person above it on paper.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div style={{ flex: 1, padding: '9% 8% 5%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Mark brand={brand} theme={t} on={t.paper} height={12} picks={picks} company={company} />
            <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
          </div>
          <div
            style={text(11.5, t.paperInk, t.heading, {
              fontWeight: 600,
              marginTop: 'auto',
              letterSpacing: '-0.015em',
            })}
          >
            {f.Name}
            <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
          </div>
          <div style={text(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
          <div style={text(5.2, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
        </div>
        <div style={{ background: t.brandBg, padding: '4.5% 8%' }}>
          <ContactsSplit f={f} color={t.brandInk} font={t.body} size={5.3} gap={1} />
          <div style={text(5.1, t.brandMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="dark" />,
  }),

  // 11 — Monogram Tile. A square brand tile holding the mark, the details
  // ranged beside it.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper}>
        <div style={{ display: 'flex', gap: '7%', alignItems: 'flex-start' }}>
          <div
            style={{
              width: '26%',
              paddingBottom: '26%',
              position: 'relative',
              borderRadius: '3px',
              background: t.brandBg,
              flex: '0 0 auto',
            }}
          >
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Mark brand={brand} theme={t} on={t.brandBg} height={13} picks={picks} company={company} />
            </span>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
            <div
              style={text(11, t.paperInk, t.heading, {
                fontWeight: 600,
                marginTop: '3px',
                letterSpacing: '-0.015em',
              })}
            >
              {f.Name}
              <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
            </div>
            <div style={text(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
          </div>
        </div>
        <div style={text(5.3, t.paperMuted, t.body, { marginTop: '5px' })}>{f.Tagline}</div>
        <div style={{ marginTop: 'auto' }}>
          <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.4} gap={1.1} />
          <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 12 — Ledger. Ruled rows, one value to a row — the card as a record.
  ({ brand, theme: t, f, picks, company }) => {
    const row: CSSProperties = { borderTop: `1px solid ${t.paperLine}`, padding: '1.1px 0' };
    return {
      front: (
        <Face bg={t.paper} pad="6% 8%">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={text(5.3, t.paperMuted, t.mono, UPPER)}>{f.Company}</div>
            <Mark brand={brand} theme={t} on={t.paper} height={10} picks={picks} company={company} />
          </div>
          <div
            style={text(9.5, t.paperInk, t.heading, {
              fontWeight: 600,
              margin: '3px 0 2px',
              letterSpacing: '-0.015em',
            })}
          >
            {f.Name}
            <span style={text(5.2, t.paperMuted, t.mono)}>{f.Pron}</span>
          </div>
          <div style={{ ...row, ...text(5.6, t.paperAccent, t.mono) }}>{f.Role}</div>
          <div style={{ ...row, ...text(5.4, t.paperInk, t.mono) }}>{f.Email}</div>
          <div style={{ ...row, ...text(5.4, t.paperInk, t.mono) }}>{f.Phone}</div>
          <div style={{ ...row, ...text(5.4, t.paperInk, t.mono) }}>
            {f.Site}
            <span style={{ color: t.paperMuted }}> · </span>
            {f.Social}
          </div>
          <div style={{ ...row, ...text(5.2, t.paperMuted, t.mono) }}>{f.Address}</div>
          <div style={text(5.1, t.paperMuted, t.body, { marginTop: 'auto', paddingTop: '2px' })}>
            {f.Tagline}
          </div>
        </Face>
      ),
      back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
    };
  },

  // 13 — Seal. A ruled ring around the mark; formal, centred, quiet.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.tint} pad="5% 8%" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div
          style={{
            width: '11%',
            paddingBottom: '11%',
            position: 'relative',
            borderRadius: '50%',
            border: `0.8px solid ${t.tintAccent}`,
          }}
        >
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mark brand={brand} theme={t} on={t.tint} height={9} picks={picks} company={company} />
          </span>
        </div>
        <div style={text(5.3, t.tintMuted, t.body, { marginTop: '2px', ...UPPER })}>{f.Company}</div>
        <div
          style={text(10, t.tintInk, t.heading, {
            fontWeight: 600,
            marginTop: '1px',
            letterSpacing: '-0.01em',
          })}
        >
          {f.Name}
          <span style={text(5.2, t.tintMuted, t.body)}>{f.Pron}</span>
        </div>
        <div style={text(5.6, t.tintAccent, t.body)}>{f.Role}</div>
        <div style={text(5.2, t.tintMuted, t.body, { marginTop: '1px' })}>{f.Tagline}</div>
        <div style={{ marginTop: 'auto', width: '100%' }}>
          <Contacts f={f} color={t.tintInk} font={t.body} size={5.3} align="center" gap={0.6} />
          <div style={text(5.1, t.tintMuted, t.body, { marginTop: '1px', textAlign: 'center' })}>
            {f.Address}
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 14 — Banner. The name rides a brand band straight across the face.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div style={{ padding: '6% 8% 3%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Mark brand={brand} theme={t} on={t.paper} height={11} picks={picks} company={company} />
          <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
        </div>
        <div style={{ background: t.brandBg, padding: '3.5% 8%' }}>
          <div style={text(11, t.brandInk, t.heading, { fontWeight: 600, letterSpacing: '-0.015em' })}>
            {f.Name}
            <span style={text(5.2, t.brandMuted, t.body)}>{f.Pron}</span>
          </div>
          <div style={text(5.7, t.brandInk, t.body, { marginTop: '1px', ...UPPER })}>{f.Role}</div>
        </div>
        <div style={{ padding: '3.5% 8% 6%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={text(5.2, t.paperMuted, t.body)}>{f.Tagline}</div>
          <div style={{ marginTop: 'auto' }}>
            <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.4} gap={1.1} />
            <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="paper" />,
  }),

  // 15 — Quiet Type. No rules, no blocks, nothing but the setting.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="11% 10%">
        <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
        <div
          style={text(12.5, t.paperInk, t.heading, {
            fontWeight: 500,
            marginTop: 'auto',
            letterSpacing: '-0.02em',
          })}
        >
          {f.Name}
          <span style={text(5.3, t.paperMuted, t.body)}>{f.Pron}</span>
        </div>
        <div style={text(6, t.paperMuted, t.body, { marginTop: '1px' })}>{f.Role}</div>
        <div style={text(5.3, t.paperAccent, t.body, { marginTop: '3px' })}>{f.Tagline}</div>
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: '5%',
          }}
        >
          <div>
            <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.3} gap={1} />
            <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
          </div>
          <Mark brand={brand} theme={t} on={t.paper} height={10} picks={picks} company={company} />
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 16 — Duo Tone. A secondary-coloured head, a paper body.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper} pad="0">
        <div
          style={{
            background: t.secondBg,
            padding: '7% 8% 6%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '5%',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={text(5.9, t.secondInk, t.body, UPPER)}>{f.Company}</div>
            <div style={text(5.2, t.secondMuted, t.body, { marginTop: '1px' })}>{f.Tagline}</div>
          </div>
          <Mark brand={brand} theme={t} on={t.secondBg} height={12} picks={picks} company={company} />
        </div>
        <div style={{ padding: '6% 8% 8%', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={text(11, t.paperInk, t.heading, { fontWeight: 600, letterSpacing: '-0.015em' })}>
            {f.Name}
            <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
          </div>
          <div style={text(5.8, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
          <div style={{ marginTop: 'auto' }}>
            <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.4} gap={1.1} />
            <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
          </div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 17 — Framed. An inset keyline; everything inside it.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <div style={{ position: 'absolute', inset: 0, background: t.paper, padding: '4.5%' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            border: `0.8px solid ${t.paperAccent}`,
            padding: '6% 6.5%',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={text(5.3, t.paperMuted, t.body, UPPER)}>{f.Company}</div>
            <Mark brand={brand} theme={t} on={t.paper} height={10} picks={picks} company={company} />
          </div>
          <div
            style={text(11, t.paperInk, t.heading, {
              fontWeight: 600,
              marginTop: 'auto',
              letterSpacing: '-0.015em',
            })}
          >
            {f.Name}
            <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
          </div>
          <div style={text(5.7, t.paperAccent, t.body, { marginTop: '1px' })}>{f.Role}</div>
          <div style={text(5.2, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Tagline}</div>
          <div style={{ marginTop: 'auto' }}>
            <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.3} gap={1} />
            <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
          </div>
        </div>
      </div>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} />,
  }),

  // 18 — Tag. The role sits in a brand pill above the name.
  ({ brand, theme: t, f, picks, company }) => ({
    front: (
      <Face bg={t.paper}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              display: 'inline-block',
              background: t.brandBg,
              borderRadius: '999px',
              padding: '2px 6px',
              ...text(5.4, t.brandInk, t.body, UPPER),
            }}
          >
            {f.Role}
          </span>
          <Mark brand={brand} theme={t} on={t.paper} height={11} picks={picks} company={company} />
        </div>
        <div
          style={text(12, t.paperInk, t.heading, {
            fontWeight: 600,
            marginTop: 'auto',
            letterSpacing: '-0.015em',
          })}
        >
          {f.Name}
          <span style={text(5.2, t.paperMuted, t.body)}>{f.Pron}</span>
        </div>
        <div style={text(5.6, t.paperMuted, t.body, { marginTop: '1px' })}>
          {f.Company}
          <span> · </span>
          {f.Tagline}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <ContactsSplit f={f} color={t.paperInk} font={t.body} size={5.4} gap={1.1} />
          <div style={text(5.1, t.paperMuted, t.body, { marginTop: '2px' })}>{f.Address}</div>
        </div>
      </Face>
    ),
    back: <CardBack brand={brand} theme={t} picks={picks} company={company} tone="second" />,
  }),
];

/* ── The renderer ─────────────────────────────────────────────────── */

/**
 * Build the context every design shares.
 *
 * Exported because Wave 2 renders from the same context — one place that
 * knows how a card resolves its content, its picks and its palette.
 */
export function cardContext(brand: Brand, content?: PersonCardContent): CardCtx {
  const hydrated = hydrateContent('person', brand ?? { name: '' }, content);
  const c = (isPerson(hydrated) ? hydrated : null) as PersonContent;
  const picks = content?.picks;
  const themed = withPicks(brand, picks);
  return {
    brand: themed,
    theme: cardTheme(themed),
    f: fragments(c),
    picks,
    company: c.company,
  };
}

export function BusinessCardExtendedRenderer({
  brand,
  templateIndex,
  content,
}: BusinessCardProps) {
  const ctx = cardContext(brand, content);
  // An index outside the curated set can only arrive from a saved
  // customization pointing at an archived design. Painting the first card
  // is better than painting nothing: the customer's own content still
  // shows, on a design that still reads.
  const design = DESIGNS[templateIndex] ?? DESIGNS[0];
  const { front, back } = design(ctx);
  return <CardStage theme={ctx.theme} front={front} back={back} />;
}

/**
 * The kept Wave-1 ids.
 *
 * Ids are persistence keys and never move; the names here are the ones a
 * designer would use, and `renderers/curation/businessCards.ts` carries
 * the same names plus the tags the drilldown filters on.
 */
export const BUSINESS_CARDS_EXTENDED = [
  { idSuffix: 'ext-1', name: 'Editorial Rule', category: 'Editorial' },
  { idSuffix: 'ext-2', name: 'Colour Block', category: 'Modern' },
  { idSuffix: 'ext-3', name: 'Brute Slab', category: 'Bold' },
  { idSuffix: 'ext-4', name: 'Soft Layer', category: 'Modern' },
  { idSuffix: 'ext-5', name: 'Centre Stack', category: 'Minimalist' },
  { idSuffix: 'ext-6', name: 'Corner Mark', category: 'Minimalist' },
  { idSuffix: 'ext-7', name: 'Full Brand', category: 'Bold' },
  { idSuffix: 'ext-8', name: 'Drafting Grid', category: 'Modern' },
  { idSuffix: 'ext-9', name: 'Spine', category: 'Modern' },
  { idSuffix: 'ext-10', name: 'Base Band', category: 'Bold' },
  { idSuffix: 'ext-11', name: 'Monogram Tile', category: 'Modern' },
  { idSuffix: 'ext-12', name: 'Ledger', category: 'Editorial' },
  { idSuffix: 'ext-13', name: 'Seal', category: 'Lux' },
  { idSuffix: 'ext-14', name: 'Banner', category: 'Bold' },
  { idSuffix: 'ext-15', name: 'Quiet Type', category: 'Minimalist' },
  { idSuffix: 'ext-16', name: 'Duo Tone', category: 'Modern' },
  { idSuffix: 'ext-17', name: 'Framed', category: 'Lux' },
  { idSuffix: 'ext-18', name: 'Tag', category: 'Modern' },
] as const;
