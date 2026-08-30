import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import type { SocialPostContent, ProfileContent } from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import { brandInitials } from '@/features/brandkit/content/brandFacts';
import { Bind } from '@/features/brandkit/content/Bind';
import {
  brandColors,
  contrastOf,
  contrastOk,
  fgOn,
  fontStack,
  logoOn,
  normalizeHex,
  surface,
} from './brandStyle';
import { typePx } from './typeFloor';

/**
 * The vocabulary the four social families share.
 *
 * Post, Story, Cover and Profile are one system wearing four aspect
 * ratios: the same brand grounds, the same mark-on-a-ground decision, the
 * same seven fields of a `socialPost`, the same monogram fallback. Before
 * this module each family answered all of that for itself — which is how
 * `SocialPostExtended` and `SocialStoryExtended` came to hold the SAME
 * invented sentence ("a small studio doing work that lasts.") twice, and
 * how a cover ended up printing "a brand · est. 2026" as if it were a
 * fact about the customer.
 *
 * Two rules run through everything here:
 *
 *   • **A ground is chosen, then everything on it is derived from it.**
 *     Ink is `fgOn`, quiet ink is `softInk` (which BACKS OFF until it
 *     measures ≥ 4.8:1 rather than trusting a fixed opacity), an accent is
 *     `accentOn` (a brand colour only when it reads on that ground, the
 *     plain ink otherwise), and the mark is `logoOn` — never the tone
 *     test that puts a primary-colour logo on a primary-colour post.
 *   • **Nothing is typed in.** Every string a reader sees arrives through
 *     `<Bind>` from the deliverable's own `socialPost` / `profile`
 *     content, which is what makes the panel and the artwork the same
 *     object rather than two that resemble each other.
 */

/* ── Colour plumbing ──────────────────────────────────────────────── */

function channels(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? '#000000';
  return [
    Number.parseInt(h.slice(1, 3), 16),
    Number.parseInt(h.slice(3, 5), 16),
    Number.parseInt(h.slice(5, 7), 16),
  ];
}

/** `t` of the way from `a` to `b`. Used only to make ink quieter. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const c = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
}

/**
 * The quietest ink that still READS on this ground.
 *
 * Secondary copy has to look secondary, and the usual way to get that is
 * `opacity: .7` — which is exactly how a caption ends up at 2.9:1 while
 * the source looks innocent. This walks the mix toward the background and
 * stops at the last step that still measures, so "quiet" can never become
 * "unreadable" for any brand colour anyone ever picks.
 */
export function softInk(bgHex: string, target = 4.8): string {
  const ink = fgOn(bgHex);
  let best = ink;
  for (let t = 0.08; t <= 0.6; t += 0.06) {
    const candidate = mixHex(ink, bgHex, t);
    if (contrastOf(candidate, bgHex) < target) break;
    best = candidate;
  }
  return best;
}

/**
 * A brand colour to emphasise with on this ground — or the ground's own
 * ink when no brand colour reads on it.
 *
 * `large` relaxes the threshold to WCAG's 3:1, which applies only to text
 * actually drawn at ≥ 24px; a caller passing it for 8px copy is lying to
 * the guard, not to the reader.
 */
export function accentOn(
  brand: Brand,
  bgHex: string,
  options: { large?: boolean; picks?: TemplateDesignPicks } = {},
): string {
  const target = options.large ? 3 : 4.5;
  const c = pickedColors(brand, options.picks);
  for (const candidate of [c.primary, c.secondary, ...c.accent]) {
    if (contrastOf(candidate, bgHex) >= target) return candidate;
  }
  return fgOn(bgHex);
}

/** The brand's colours, with the saved design picks laid over them. */
export function pickedColors(brand: Brand, picks?: TemplateDesignPicks) {
  const base = brandColors(brand);
  return {
    ...base,
    primary: normalizeHex(picks?.primaryColor) ?? base.primary,
    secondary: normalizeHex(picks?.secondaryColor) ?? base.secondary,
  };
}

/* ── Grounds ──────────────────────────────────────────────────────── */

export type Ground = {
  /** Flat, opaque. Never a gradient — text on a gradient cannot be measured. */
  bg: string;
  /** Body ink. Always ≥ 4.5:1 on `bg`. */
  ink: string;
  /** Secondary ink, still ≥ 4.8:1. */
  soft: string;
  /** A hairline / divider. Not text, so not contrast-bound. */
  line: string;
  /**
   * The colour to emphasise with IN TEXT, chosen for this ground.
   *
   * Held to 4.5:1, so on a brand whose colour is light against paper it
   * is the plain ink instead. That is right for a word and wrong for a
   * rule — see `mark`.
   */
  accent: string;
  /**
   * The brand colour that can be SEEN on this ground, for marks that
   * carry no words: a rule, a border, a block, the fill of a button
   * whose own label is then derived from it.
   *
   * `accent` and `mark` differ exactly where it matters. SKAM's red
   * measures 3.4:1 on its own cream — readable as a shape, not as 6px
   * type — so `accent` correctly falls back to near-black and, before
   * this existed, every rule and every quote mark on every paper design
   * came out grey. A brand kit that drops the brand's colour the moment
   * a design puts it on paper is not a brand kit.
   */
  mark: string;
};

function groundFrom(bg: string, brand: Brand, picks?: TemplateDesignPicks): Ground {
  const ink = fgOn(bg);
  return {
    bg,
    ink,
    soft: softInk(bg),
    line: mixHex(ink, bg, 0.72),
    accent: accentOn(brand, bg, { picks }),
    // `large: true` is WCAG's 3:1, which is the threshold for something
    // you can SEE rather than read — and nothing wearing this colour
    // carries a word of its own.
    mark: accentOn(brand, bg, { large: true, picks }),
  };
}

/**
 * The five grounds a brand posts on, named by ROLE.
 *
 * A design asks for `g.brand` or `g.paper`; it never names a hex. That is
 * what lets one design serve Raqm's violet and SKAM's red without either
 * looking like it was drawn for the other.
 */
export type Grounds = {
  /** The brand's primary, full strength. */
  brand: Ground;
  /** The brand's secondary. */
  support: Ground;
  /** The lightest on-brand paper. */
  paper: Ground;
  /** A quieter tinted paper, for a second surface inside a design. */
  tint: Ground;
  /** The brand's own near-black. */
  ink: Ground;
};

export function groundsFor(brand: Brand, picks?: TemplateDesignPicks): Grounds {
  const c = pickedColors(brand, picks);
  const paper = surface(brand, 'card');
  const tint = surface(brand, 'subtle');
  const inverted = surface(brand, 'inverted');
  return {
    brand: groundFrom(c.primary, brand, picks),
    support: groundFrom(c.secondary, brand, picks),
    paper: groundFrom(paper.bg, brand, picks),
    tint: groundFrom(tint.bg, brand, picks),
    ink: groundFrom(inverted.bg, brand, picks),
  };
}

/* ── The mark ─────────────────────────────────────────────────────── */

/**
 * The brand's mark on a known ground.
 *
 * `logoOn` answers `undefined` when the brand owns no variant that reads
 * on this colour — that is the honest answer, and the fallback is the
 * monogram in the ground's own ink. It is never "the primary logo
 * anyway", which is how a red mark ends up on a red post.
 */
export function Mark({
  brand,
  ground,
  size = 20,
  picks,
}: {
  brand: Brand;
  ground: Ground;
  /** Height in the 260px design space. */
  size?: number;
  picks?: TemplateDesignPicks;
}) {
  if (picks?.showLogo === false) return null;
  const logo = logoOn(brand, ground.bg);
  if (logo) {
    return (
      <img
        src={logo.url}
        alt=""
        style={{
          height: size,
          width: 'auto',
          maxWidth: size * 4.5,
          objectFit: 'contain',
          display: 'block',
        }}
      />
    );
  }
  const picked = normalizeHex(picks?.logoColor);
  const color = picked && contrastOk(picked, ground.bg, size >= 24) ? picked : ground.ink;
  return (
    <span
      style={{
        fontFamily: fontStack(brand, 'heading'),
        fontWeight: 800,
        fontSize: typePx(Math.round(size * 0.82)),
        letterSpacing: '-0.02em',
        lineHeight: 1,
        color,
        display: 'block',
      }}
    >
      {brandInitials(brand)}
    </span>
  );
}

/* ── The seven fields, bound ──────────────────────────────────────── */

export type PostFields = {
  Headline: ReactNode;
  Subline: ReactNode;
  Body: ReactNode;
  Cta: ReactNode;
  Handle: ReactNode;
  DateText: ReactNode;
  Tag: ReactNode;
};

/**
 * One `<Bind>` per field of a `socialPost`, built once and reused by
 * whichever design is showing.
 *
 * Every design paints all seven. That is not decoration: the bind sweep
 * is all-or-nothing on purpose, because a family where nine designs of
 * sixteen accept an edit is a family where a customer's change works on
 * some cards and silently vanishes on the rest.
 */
export function postFields(c: SocialPostContent): PostFields {
  return {
    Headline: <Bind path="headline" value={c.headline} fit="shrink" placeholder="Your headline" />,
    Subline: <Bind path="subline" value={c.subline} fit="clamp" placeholder="Your second line" />,
    Body: <Bind path="body" value={c.body} fit="wrap" multiline placeholder="Your caption" />,
    Cta: <Bind path="cta" value={c.cta} fit="clamp" placeholder="Learn more" />,
    Handle: <Bind path="handle" value={c.handle} fit="clamp" placeholder="@yourbrand" />,
    DateText: <Bind path="date" value={c.date} fit="clamp" placeholder="Today" />,
    Tag: <Bind path="tag" value={c.tag} fit="clamp" placeholder="#yourbrand" />,
  };
}

export type ProfileFields = {
  Letters: ReactNode;
  TabTitle: ReactNode;
  Url: ReactNode;
};

export function profileFields(c: ProfileContent): ProfileFields {
  return {
    Letters: <Bind path="text" value={c.text.slice(0, 3)} fit="shrink" placeholder="AB" />,
    TabTitle: <Bind path="tabTitle" value={c.tabTitle} fit="shrink" placeholder="Your brand" />,
    Url: <Bind path="url" value={c.url} fit="clamp" placeholder="yoursite.co" />,
  };
}

/* ── Type styles ──────────────────────────────────────────────────── */

/** A display line. `large` sizes clear WCAG's 3:1 threshold on their own. */
export function headingStyle(
  brand: Brand,
  ground: Ground,
  size: number,
  options: { color?: string; weight?: number; italic?: boolean } = {},
): CSSProperties {
  return {
    fontFamily: fontStack(brand, 'heading'),
    fontSize: typePx(size),
    fontWeight: options.weight ?? 800,
    lineHeight: 1.02,
    letterSpacing: '-0.025em',
    color: options.color ?? ground.ink,
    fontStyle: options.italic ? 'italic' : undefined,
  };
}

export function bodyStyle(
  brand: Brand,
  ground: Ground,
  size: number,
  options: { color?: string; weight?: number; lineHeight?: number } = {},
): CSSProperties {
  return {
    fontFamily: fontStack(brand, 'body'),
    fontSize: typePx(size),
    fontWeight: options.weight ?? 400,
    lineHeight: options.lineHeight ?? 1.4,
    color: options.color ?? ground.ink,
  };
}

/** The small tracked-out line a social design uses for meta. */
export function metaStyle(
  brand: Brand,
  ground: Ground,
  size = 6.5,
  options: { color?: string } = {},
): CSSProperties {
  return {
    fontFamily: fontStack(brand, 'body'),
    fontSize: typePx(size),
    fontWeight: 600,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    lineHeight: 1.2,
    color: options.color ?? ground.soft,
  };
}

/* ── Small shared pieces ──────────────────────────────────────────── */

/** `@handle · date` — the attribution every social design carries. */
export function MetaLine({
  brand,
  ground,
  fields,
  size = 6.5,
  align = 'left',
}: {
  brand: Brand;
  ground: Ground;
  fields: PostFields;
  size?: number;
  align?: 'left' | 'right' | 'center';
}) {
  return (
    <div
      style={{
        ...metaStyle(brand, ground, size),
        display: 'flex',
        gap: 6,
        alignItems: 'baseline',
        justifyContent: align === 'right' ? 'flex-end' : align === 'center' ? 'center' : 'flex-start',
        minWidth: 0,
      }}
    >
      {fields.Handle}
      <span aria-hidden style={{ color: ground.line }}>
        ·
      </span>
      {fields.DateText}
    </div>
  );
}

/** The tag, drawn as a chip on its own ground. */
export function TagChip({
  brand,
  ground,
  fields,
  size = 6.5,
  filled = true,
}: {
  brand: Brand;
  ground: Ground;
  fields: PostFields;
  size?: number;
  filled?: boolean;
}) {
  const chipBg = filled ? mixHex(ground.ink, ground.bg, 0.86) : 'transparent';
  const chipInk = filled ? fgOn(chipBg) : ground.soft;
  return (
    <span
      style={{
        ...metaStyle(brand, ground, size, { color: chipInk }),
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${Math.round(size * 0.45)}px ${Math.round(size * 0.95)}px`,
        borderRadius: 999,
        background: filled ? chipBg : undefined,
        border: filled ? undefined : `1px solid ${ground.line}`,
        maxWidth: '100%',
      }}
    >
      {fields.Tag}
    </span>
  );
}

/** The call to action, as a solid button. */
export function CtaPill({
  brand,
  ground,
  fields,
  size = 7.5,
  color,
}: {
  brand: Brand;
  ground: Ground;
  fields: PostFields;
  size?: number;
  /** The button's fill. Defaults to the ground's ink. */
  color?: string;
}) {
  const fill = normalizeHex(color) ?? ground.ink;
  return (
    <span
      style={{
        ...metaStyle(brand, ground, size, { color: fgOn(fill) }),
        display: 'inline-flex',
        alignItems: 'center',
        padding: `${Math.round(size * 0.8)}px ${Math.round(size * 1.7)}px`,
        borderRadius: 999,
        background: fill,
        maxWidth: '100%',
      }}
    >
      {fields.Cta}
    </span>
  );
}

/** The call to action, as a rule-and-arrow text link. */
export function CtaLink({
  brand,
  ground,
  fields,
  size = 7.5,
  color,
}: {
  brand: Brand;
  ground: Ground;
  fields: PostFields;
  size?: number;
  color?: string;
}) {
  const ink = normalizeHex(color) ?? ground.ink;
  return (
    <span
      style={{
        ...metaStyle(brand, ground, size, { color: ink }),
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        borderBottom: `1px solid ${ink}`,
        paddingBottom: 2,
        maxWidth: '100%',
      }}
    >
      {fields.Cta}
      <span aria-hidden>→</span>
    </span>
  );
}

/* ── Frames ───────────────────────────────────────────────────────── */

/**
 * A deliverable fills its tile edge to edge.
 *
 * The old post and story frames drew the artwork INSIDE a grey letterbox,
 * so the thing a customer downloaded was a picture of a post on a mat.
 * The tile already carries the right aspect ratio (`aspectForType`), so
 * the design's job is simply to fill it.
 */
export function Frame({
  ground,
  children,
  pad = 18,
  style,
}: {
  ground: Ground;
  children: ReactNode;
  /** Safe margin, in the 260px design space. */
  pad?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: ground.bg,
        color: ground.ink,
        display: 'flex',
        flexDirection: 'column',
        padding: pad,
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Absolute, non-text decoration. Never sits behind bound text. */
export function Deco({ style }: { style: CSSProperties }) {
  return <div aria-hidden style={{ position: 'absolute', ...style }} />;
}
