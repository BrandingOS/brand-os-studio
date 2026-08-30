import type { CSSProperties, ReactNode } from 'react';
import type { Brand } from '@/shared/types/brand';
import { Bind } from '@/features/brandkit/content/Bind';
import { defaultPersonContent, type PersonContent } from '@/features/brandkit/content/kinds';
import type { TemplateDesignPicks } from '@/features/brandkit/content/schema';
import {
  brandColors,
  contrastOk,
  fgOn,
  fontStack,
  logoOn,
  normalizeHex,
  surface,
} from './brandStyle';

/**
 * Email signatures — sixteen real signature BLOCKS.
 *
 * What this file used to be: thirty designs of which five painted the
 * customer's content and twenty-five printed "Jane Smith · Vice President ·
 * jane@brand.com · +1 234 56789" inside a mail window whose header said
 * "RE: project update" and whose body said "Hi team," over three grey bars.
 * The frame told a story about a message nobody sent, and the signature
 * under it belonged to a person who does not exist.
 *
 * Three rules shape the rewrite.
 *
 * **1 — A signature is the whole `person`, not five fields of it.** The
 * reference audit's "Edit Info" is one place a customer fills in name,
 * role, company, tagline, address, phone, email, website, social handle and
 * pronouns, after which every stationery template follows. So every design
 * here paints all ten, and the bind sweep holds them to it: a design that
 * quietly dropped `address` would accept the edit in the panel and never
 * repaint. Fields the customer leaves blank (pronouns, most often) render
 * as an empty region — the separator beside them is what disappears, not
 * the binding.
 *
 * **2 — It has to survive being pasted into a mail client.** A signature is
 * not a picture; it is a fragment of HTML that Gmail, Outlook and Apple
 * Mail will re-host inside their own document. Flexbox, grid, custom
 * properties, class selectors and absolute positioning are all stripped or
 * ignored somewhere in that set. So the SIGNATURE itself is tables, blocks
 * and inline-blocks with inline styles, which is what a later
 * `exporters/signature.ts` can serialise more or less verbatim. The mail
 * WINDOW around it is a preview frame and is allowed to use flexbox: it is
 * never exported, and the boundary between the two is `MailFrame`.
 *
 * **3 — The frame may not carry copy.** It kept its window chrome because a
 * signature block floating on white does not read as a signature; it lost
 * the subject line and the fake message body, because the moment a preview
 * writes words a customer did not, it is inventing content again. What is
 * left is a title bar with three dots and, above the signature, the hairline
 * rule a real signature sits under.
 *
 * Colour and type come from `brandStyle` only. Every foreground is either a
 * surface token or is measured against its own ground with `contrastOk`
 * before it is used, and a brand ground that cannot carry either black or
 * white is deepened in its own hue rather than swapped for a neutral.
 */

/* ── Design picks ─────────────────────────────────────────────────── */

/**
 * The saved picks travel WITH the content, so they arrive here on the
 * content object rather than as a second prop.
 *
 * `fontId` is deliberately not honoured: it names an entry in the
 * Setup-shaped `MockBrand.fonts` list, and a renderer is handed the
 * canonical `Brand`, whose `fonts` has no ids to match it against.
 * Resolving it here would mean guessing. The editor still applies the
 * chosen face to its own preview.
 */
type Picks = TemplateDesignPicks;

interface Props {
  brand: Brand;
  templateIndex: number;
  /**
   * The same `person` content the business cards use. One kind serves
   * both, so an edit made on one surface means the same thing on the
   * other.
   */
  content?: PersonContent & { picks?: Picks };
}

/* ── Colour helpers ───────────────────────────────────────────────── */

/** Ink for one ground. Every member is safe to paint text in. */
type Ink = {
  bg: string;
  text: string;
  /** Secondary text. Never below AA on `bg` — falls back to `text`. */
  muted: string;
  /** Hairlines and dividers. Not for text. */
  border: string;
  /** The brand colour when it reads here, the ground's own text when not. */
  accent: string;
};

function channels(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? '#000000';
  return [
    Number.parseInt(h.slice(1, 3), 16),
    Number.parseInt(h.slice(3, 5), 16),
    Number.parseInt(h.slice(5, 7), 16),
  ];
}

/** `weight` of `a` over `b`. Both must already be hexes. */
function mixHex(a: string, b: string, weight: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const w = Math.max(0, Math.min(1, weight));
  const to = (x: number, y: number) =>
    Math.round(x * w + y * (1 - w))
      .toString(16)
      .padStart(2, '0');
  return `#${to(ar, br)}${to(ag, bg)}${to(ab, bb)}`;
}

/** `candidate` when it reads on `bg`, `fallback` when it does not. */
function readable(candidate: string, bg: string, fallback: string): string {
  return contrastOk(candidate, bg) ? candidate : fallback;
}

/**
 * A brand ground that can carry text, in the brand's own hue.
 *
 * A mid-tone brand colour can be too dark for black and too light for
 * white — roughly 3:1 either way — and the honest fix is not a neutral
 * panel (which takes the brand out of the design) but the same hue, deeper
 * or lighter, until one of the two clears AA.
 */
function readableGround(hex: string): string {
  let bg = normalizeHex(hex) ?? '#111113';
  for (let i = 0; i < 10; i += 1) {
    if (contrastOk(fgOn(bg), bg)) return bg;
    bg = mixHex(bg, fgOn(bg) === '#ffffff' ? '#000000' : '#ffffff', 0.85);
  }
  return bg;
}

/** Ink for one of the palette's surface kinds. */
function inkOn(brand: Brand, kind: 'card' | 'subtle' | 'inverted', accent: string): Ink {
  const s = surface(brand, kind);
  const text = readable(s.text, s.bg, fgOn(s.bg));
  return {
    bg: s.bg,
    text,
    muted: readable(s.textMuted, s.bg, text),
    border: s.border,
    accent: readable(accent, s.bg, text),
  };
}

/** Ink for an arbitrary colour ground — a brand band or a colour block. */
function inkOnColor(hex: string): Ink {
  const bg = readableGround(hex);
  const text = fgOn(bg);
  return {
    bg,
    text,
    muted: readable(mixHex(text, bg, 0.78), bg, text),
    border: mixHex(text, bg, 0.32),
    accent: text,
  };
}

/* ── The mark ─────────────────────────────────────────────────────── */

/** The brand's initials, from the CONTENT's company so an edit follows. */
function initialsOf(company: string): string {
  const words = company.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '·';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return words
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

type MarkOptions = {
  /** The ground the mark sits on — decides which variant can be seen. */
  ground: string;
  /** Box size in canvas px (the renderer is authored at 260px wide). */
  size: number;
  /** Lettermark tile colour when the brand has no artwork that reads. */
  tint: string;
  company: string;
  /** Wordmark-ish: allow the artwork to run wide rather than boxing it. */
  wide?: boolean;
};

/* ── The signature kit ────────────────────────────────────────────── */

/**
 * Everything a design is handed.
 *
 * Designs differ in ARRANGEMENT, ground, rule treatment, alignment and
 * type — never in which fields they carry, because a customer choosing a
 * look must not be choosing which of their details survive.
 */
type SigKit = {
  /** The ten bound regions. Every design renders every one. */
  F: Record<
    | 'name'
    | 'pronouns'
    | 'role'
    | 'company'
    | 'tagline'
    | 'address'
    | 'email'
    | 'phone'
    | 'website'
    | 'social',
    ReactNode
  >;
  /** Whether a value is non-empty — separators, not bindings, depend on it. */
  has: Record<'pronouns' | 'tagline' | 'address' | 'social', boolean>;
  primary: string;
  secondary: string;
  head: string;
  body: string;
  mono: string;
  /** The paper the sheet is made of. */
  paper: Ink;
  /** A tinted panel that still reads as paper. */
  soft: Ink;
  /** The brand colour as a ground. */
  brandInk: Ink;
  /** The brand's near-black. */
  dark: Ink;
  /** `null` when the customer turned the logo off. */
  mark: (options: MarkOptions) => ReactNode;
};

/* ── Small typographic atoms ──────────────────────────────────────── */

/** A middot between two inline values. Punctuation, never content. */
function Sep({ color, gap = 4 }: { color: string; gap?: number }) {
  return <span style={{ color, padding: `0 ${gap}px` }}>·</span>;
}

function Row({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ display: 'block', ...style }}>{children}</div>;
}

/** A Gmail-safe two-column row. Tables are the one layout every client keeps. */
function Cols({
  left,
  right,
  leftWidth,
  gap = 8,
  align = 'top',
  rightAlign = 'left',
}: {
  left: ReactNode;
  right: ReactNode;
  leftWidth?: number | string;
  gap?: number;
  align?: 'top' | 'middle' | 'bottom';
  rightAlign?: 'left' | 'right';
}) {
  return (
    <table
      cellPadding={0}
      cellSpacing={0}
      style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}
    >
      <tbody>
        <tr>
          <td
            valign={align}
            style={{ width: leftWidth, paddingRight: gap, verticalAlign: align }}
          >
            {left}
          </td>
          <td valign={align} style={{ verticalAlign: align, textAlign: rightAlign }}>
            {right}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** A hairline. `width` is a percentage so it scales with the canvas. */
function Rule({
  color,
  width = '100%',
  thickness = 1,
  style,
}: {
  color: string;
  width?: string;
  thickness?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width,
        height: thickness,
        background: color,
        fontSize: 0,
        lineHeight: 0,
        ...style,
      }}
    />
  );
}

/* ── The sixteen designs ──────────────────────────────────────────── */

type Design = {
  /** A designer's name. Mirrored in `curation/emailSignature.ts`. */
  name: string;
  tags: string[];
  /** The signature fills the sheet edge to edge instead of sitting on it. */
  bleed?: boolean;
  render: (k: SigKit) => ReactNode;
};

const SIZE = {
  name: 11,
  nameLarge: 14,
  role: 8,
  contact: 7.5,
  fine: 7,
} as const;

const DESIGNS: Design[] = [
  /* 1 */ {
    name: 'Brand Rule',
    tags: ['Minimal', 'Corporate', 'Classic'],
    render: (k) => (
      <div style={{ borderLeft: `2px solid ${k.paper.accent}`, paddingLeft: 7 }}>
        <Row
          style={{
            fontFamily: k.head,
            fontSize: SIZE.name,
            fontWeight: 700,
            color: k.paper.text,
            lineHeight: 1.25,
          }}
        >
          {k.F.name}
          {k.has.pronouns && (
            <span style={{ fontSize: SIZE.fine, fontWeight: 400, color: k.paper.muted }}>
              <Sep color={k.paper.muted} />
              {k.F.pronouns}
            </span>
          )}
          {!k.has.pronouns && k.F.pronouns}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.role,
            color: k.paper.accent,
            lineHeight: 1.5,
          }}
        >
          {k.F.role}
          <Sep color={k.paper.muted} />
          {k.F.company}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.55,
            marginTop: 3,
          }}
        >
          {k.F.email}
          <Sep color={k.paper.border} />
          {k.F.phone}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.55,
          }}
        >
          {k.F.website}
          {k.has.social && <Sep color={k.paper.border} />}
          {k.F.social}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.paper.muted,
            lineHeight: 1.5,
            marginTop: 2,
          }}
        >
          {k.F.address}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            fontStyle: 'italic',
            color: k.paper.accent,
            lineHeight: 1.5,
          }}
        >
          {k.F.tagline}
        </Row>
      </div>
    ),
  },

  /* 2 */ {
    name: 'Mark Beside',
    tags: ['Logo-led', 'Corporate', 'Classic'],
    render: (k) => (
      <Cols
        leftWidth={40}
        gap={9}
        left={
          <div style={{ paddingRight: 8, borderRight: `1px solid ${k.paper.border}` }}>
            {k.mark({ ground: k.paper.bg, size: 26, tint: k.primary, company: '' })}
          </div>
        }
        right={
          <>
            <Row
              style={{
                fontFamily: k.head,
                fontSize: SIZE.name,
                fontWeight: 700,
                color: k.paper.text,
                lineHeight: 1.2,
              }}
            >
              {k.F.name}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.role,
                color: k.paper.muted,
                lineHeight: 1.5,
              }}
            >
              {k.F.role}
              {k.has.pronouns && <Sep color={k.paper.border} />}
              {k.F.pronouns}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.role,
                fontWeight: 600,
                color: k.paper.accent,
                lineHeight: 1.5,
              }}
            >
              {k.F.company}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.muted,
                lineHeight: 1.55,
                marginTop: 2,
              }}
            >
              {k.F.email}
              <Sep color={k.paper.border} />
              {k.F.phone}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.muted,
                lineHeight: 1.55,
              }}
            >
              {k.F.website}
              {k.has.social && <Sep color={k.paper.border} />}
              {k.F.social}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.fine,
                color: k.paper.muted,
                lineHeight: 1.5,
              }}
            >
              {k.F.address}
              {k.has.tagline && <Sep color={k.paper.border} />}
              <span style={{ fontStyle: 'italic' }}>{k.F.tagline}</span>
            </Row>
          </>
        }
      />
    ),
  },

  /* 3 */ {
    name: 'Name Lead',
    tags: ['Editorial', 'Bold', 'Founder'],
    render: (k) => (
      <>
        <Cols
          leftWidth="auto"
          align="middle"
          rightAlign="right"
          left={
            <>
              <Row
                style={{
                  fontFamily: k.head,
                  fontSize: SIZE.nameLarge,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  color: k.paper.text,
                  lineHeight: 1.1,
                }}
              >
                {k.F.name}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                }}
              >
                {k.F.role}
                {k.has.pronouns && <Sep color={k.paper.border} />}
                {k.F.pronouns}
              </Row>
            </>
          }
          right={k.mark({ ground: k.paper.bg, size: 22, tint: k.primary, company: '' })}
        />
        <Rule color={k.paper.accent} thickness={2} width="26%" style={{ margin: '5px 0 4px' }} />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.role,
            fontWeight: 600,
            color: k.paper.text,
            lineHeight: 1.5,
          }}
        >
          {k.F.company}
          {k.has.tagline && <Sep color={k.paper.border} />}
          <span style={{ fontWeight: 400, fontStyle: 'italic', color: k.paper.muted }}>
            {k.F.tagline}
          </span>
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.6,
            marginTop: 2,
          }}
        >
          {k.F.email}
          <Sep color={k.paper.border} />
          {k.F.phone}
          <Sep color={k.paper.border} />
          {k.F.website}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.address}
          {k.has.social && <Sep color={k.paper.border} />}
          {k.F.social}
        </Row>
      </>
    ),
  },

  /* 4 */ {
    name: 'Hairline Grid',
    tags: ['Minimal', 'Studio', 'Structured'],
    render: (k) => (
      <>
        <Rule color={k.paper.border} style={{ marginBottom: 5 }} />
        <Cols
          leftWidth="52%"
          gap={10}
          left={
            <>
              <Row
                style={{
                  fontFamily: k.head,
                  fontSize: SIZE.name,
                  fontWeight: 700,
                  color: k.paper.text,
                  lineHeight: 1.25,
                }}
              >
                {k.F.name}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                }}
              >
                {k.F.role}
                {k.has.pronouns && <Sep color={k.paper.border} />}
                {k.F.pronouns}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  color: k.paper.accent,
                  lineHeight: 1.5,
                }}
              >
                {k.F.company}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.fine,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                  marginTop: 2,
                }}
              >
                {k.F.address}
              </Row>
            </>
          }
          rightAlign="right"
          right={
            <>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.paper.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.email}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.paper.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.phone}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.paper.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.website}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.paper.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.social}
              </Row>
            </>
          }
        />
        <Rule color={k.paper.border} style={{ margin: '5px 0 4px' }} />
        <Cols
          leftWidth="auto"
          align="middle"
          rightAlign="right"
          left={
            <span
              style={{
                fontFamily: k.body,
                fontSize: SIZE.fine,
                fontStyle: 'italic',
                color: k.paper.muted,
              }}
            >
              {k.F.tagline}
            </span>
          }
          right={k.mark({ ground: k.paper.bg, size: 16, tint: k.primary, company: '' })}
        />
      </>
    ),
  },

  /* 5 */ {
    name: 'Brand Header',
    tags: ['Bold', 'Corporate', 'Colour-led'],
    bleed: true,
    render: (k) => (
      <div style={{ height: '100%' }}>
        <div style={{ background: k.brandInk.bg, padding: '6px 9px' }}>
          <Cols
            leftWidth="auto"
            align="middle"
            rightAlign="right"
            left={
              <span
                style={{
                  fontFamily: k.head,
                  fontSize: SIZE.role,
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  color: k.brandInk.text,
                }}
              >
                {k.F.company}
              </span>
            }
            right={k.mark({
              ground: k.brandInk.bg,
              size: 14,
              tint: k.brandInk.text,
              company: '',
            })}
          />
        </div>
        <div style={{ padding: '7px 9px 8px' }}>
          <Row
            style={{
              fontFamily: k.head,
              fontSize: SIZE.name,
              fontWeight: 700,
              color: k.paper.text,
              lineHeight: 1.25,
            }}
          >
            {k.F.name}
            {k.has.pronouns && (
              <span style={{ fontSize: SIZE.fine, fontWeight: 400, color: k.paper.muted }}>
                <Sep color={k.paper.border} />
                {k.F.pronouns}
              </span>
            )}
            {!k.has.pronouns && k.F.pronouns}
          </Row>
          <Row
            style={{
              fontFamily: k.body,
              fontSize: SIZE.role,
              color: k.paper.muted,
              lineHeight: 1.5,
            }}
          >
            {k.F.role}
            {k.has.tagline && <Sep color={k.paper.border} />}
            <span style={{ fontStyle: 'italic' }}>{k.F.tagline}</span>
          </Row>
          <Row
            style={{
              fontFamily: k.body,
              fontSize: SIZE.contact,
              color: k.paper.muted,
              lineHeight: 1.6,
              marginTop: 3,
            }}
          >
            {k.F.email}
            <Sep color={k.paper.border} />
            {k.F.phone}
          </Row>
          <Row
            style={{
              fontFamily: k.body,
              fontSize: SIZE.contact,
              color: k.paper.muted,
              lineHeight: 1.6,
            }}
          >
            {k.F.website}
            {k.has.social && <Sep color={k.paper.border} />}
            {k.F.social}
          </Row>
          <Row
            style={{
              fontFamily: k.body,
              fontSize: SIZE.fine,
              color: k.paper.muted,
              lineHeight: 1.5,
            }}
          >
            {k.F.address}
          </Row>
        </div>
      </div>
    ),
  },

  /* 6 */ {
    name: 'Soft Panel',
    tags: ['Calm', 'Studio', 'Rounded'],
    render: (k) => (
      <div
        style={{
          background: k.soft.bg,
          border: `1px solid ${k.soft.border}`,
          borderRadius: 4,
          padding: '7px 8px',
        }}
      >
        <Cols
          leftWidth={22}
          gap={7}
          align="middle"
          left={k.mark({ ground: k.soft.bg, size: 20, tint: k.primary, company: '' })}
          right={
            <>
              <Row
                style={{
                  fontFamily: k.head,
                  fontSize: SIZE.name,
                  fontWeight: 700,
                  color: k.soft.text,
                  lineHeight: 1.2,
                }}
              >
                {k.F.name}
                {k.has.pronouns && (
                  <span style={{ fontSize: SIZE.fine, fontWeight: 400, color: k.soft.muted }}>
                    <Sep color={k.soft.border} />
                    {k.F.pronouns}
                  </span>
                )}
                {!k.has.pronouns && k.F.pronouns}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  color: k.soft.muted,
                  lineHeight: 1.45,
                }}
              >
                {k.F.role}
                <Sep color={k.soft.border} />
                <span style={{ color: k.soft.accent, fontWeight: 600 }}>{k.F.company}</span>
              </Row>
            </>
          }
        />
        <Rule color={k.soft.border} style={{ margin: '5px 0 4px' }} />
        <Cols
          leftWidth="50%"
          gap={8}
          left={
            <>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.soft.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.email}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.soft.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.phone}
              </Row>
            </>
          }
          right={
            <>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.soft.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.website}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.soft.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.social}
              </Row>
            </>
          }
        />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.soft.muted,
            lineHeight: 1.5,
            marginTop: 3,
          }}
        >
          {k.F.address}
          {k.has.tagline && <Sep color={k.soft.border} />}
          <span style={{ fontStyle: 'italic' }}>{k.F.tagline}</span>
        </Row>
      </div>
    ),
  },

  /* 7 */ {
    name: 'Compact',
    tags: ['Minimal', 'Dense', 'Corporate'],
    render: (k) => (
      <Cols
        leftWidth={18}
        gap={6}
        align="top"
        left={k.mark({ ground: k.paper.bg, size: 16, tint: k.primary, company: '' })}
        right={
          <>
            <Row
              style={{
                fontFamily: k.head,
                fontSize: SIZE.role + 1.5,
                fontWeight: 700,
                color: k.paper.text,
                lineHeight: 1.35,
              }}
            >
              {k.F.name}
              <Sep color={k.paper.border} />
              <span style={{ fontWeight: 400, color: k.paper.muted }}>{k.F.role}</span>
              {k.has.pronouns && <Sep color={k.paper.border} />}
              <span style={{ fontWeight: 400, color: k.paper.muted }}>{k.F.pronouns}</span>
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.accent,
                lineHeight: 1.5,
              }}
            >
              {k.F.company}
              {k.has.tagline && <Sep color={k.paper.border} />}
              <span style={{ fontStyle: 'italic', color: k.paper.muted }}>{k.F.tagline}</span>
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.muted,
                lineHeight: 1.55,
              }}
            >
              {k.F.email}
              <Sep color={k.paper.border} />
              {k.F.phone}
              <Sep color={k.paper.border} />
              {k.F.website}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.fine,
                color: k.paper.muted,
                lineHeight: 1.5,
              }}
            >
              {k.F.address}
              {k.has.social && <Sep color={k.paper.border} />}
              {k.F.social}
            </Row>
          </>
        }
      />
    ),
  },

  /* 8 */ {
    name: 'Split Column',
    tags: ['Structured', 'Studio', 'Two-up'],
    render: (k) => (
      <Cols
        leftWidth="46%"
        gap={10}
        left={
          <>
            {k.mark({ ground: k.paper.bg, size: 18, tint: k.primary, company: '' })}
            <Row
              style={{
                fontFamily: k.head,
                fontSize: SIZE.name,
                fontWeight: 700,
                color: k.paper.text,
                lineHeight: 1.25,
                marginTop: 3,
              }}
            >
              {k.F.name}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.role,
                color: k.paper.muted,
                lineHeight: 1.5,
              }}
            >
              {k.F.role}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.role,
                fontWeight: 600,
                color: k.paper.accent,
                lineHeight: 1.5,
              }}
            >
              {k.F.company}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.fine,
                color: k.paper.muted,
                lineHeight: 1.5,
              }}
            >
              {k.F.pronouns}
            </Row>
          </>
        }
        right={
          <div style={{ borderLeft: `1px solid ${k.paper.border}`, paddingLeft: 9 }}>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.muted,
                lineHeight: 1.55,
              }}
            >
              {k.F.email}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.muted,
                lineHeight: 1.55,
              }}
            >
              {k.F.phone}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.muted,
                lineHeight: 1.55,
              }}
            >
              {k.F.website}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.contact,
                color: k.paper.muted,
                lineHeight: 1.55,
              }}
            >
              {k.F.social}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.fine,
                color: k.paper.muted,
                lineHeight: 1.5,
              }}
            >
              {k.F.address}
            </Row>
            <Row
              style={{
                fontFamily: k.body,
                fontSize: SIZE.fine,
                fontStyle: 'italic',
                color: k.paper.muted,
                lineHeight: 1.5,
              }}
            >
              {k.F.tagline}
            </Row>
          </div>
        }
      />
    ),
  },

  /* 9 */ {
    name: 'Monogram Tile',
    tags: ['Logo-led', 'Bold', 'Colour-led'],
    render: (k) => (
      <>
        <Cols
          leftWidth={38}
          gap={9}
          align="middle"
          left={
            <div
              style={{
                background: k.brandInk.bg,
                borderRadius: 4,
                padding: 6,
                textAlign: 'center',
              }}
            >
              {k.mark({
                ground: k.brandInk.bg,
                size: 20,
                tint: k.brandInk.text,
                company: '',
              })}
            </div>
          }
          right={
            <>
              <Row
                style={{
                  fontFamily: k.head,
                  fontSize: SIZE.nameLarge,
                  fontWeight: 700,
                  color: k.paper.text,
                  lineHeight: 1.15,
                }}
              >
                {k.F.name}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                }}
              >
                {k.F.role}
                {k.has.pronouns && <Sep color={k.paper.border} />}
                {k.F.pronouns}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  fontWeight: 600,
                  color: k.paper.accent,
                  lineHeight: 1.5,
                }}
              >
                {k.F.company}
              </Row>
            </>
          }
        />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.6,
            marginTop: 5,
          }}
        >
          {k.F.email}
          <Sep color={k.paper.border} />
          {k.F.phone}
          <Sep color={k.paper.border} />
          {k.F.website}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.address}
          {k.has.social && <Sep color={k.paper.border} />}
          {k.F.social}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            fontStyle: 'italic',
            color: k.paper.accent,
            lineHeight: 1.5,
          }}
        >
          {k.F.tagline}
        </Row>
      </>
    ),
  },

  /* 10 */ {
    name: 'Underlined',
    tags: ['Editorial', 'Minimal', 'Classic'],
    render: (k) => (
      <>
        <Row style={{ marginBottom: 4 }}>
          <span
            style={{
              display: 'inline-block',
              fontFamily: k.head,
              fontSize: SIZE.nameLarge,
              fontWeight: 700,
              color: k.paper.text,
              lineHeight: 1.2,
              borderBottom: `2px solid ${k.paper.accent}`,
              paddingBottom: 2,
            }}
          >
            {k.F.name}
          </span>
          {k.has.pronouns && (
            <span
              style={{ fontFamily: k.body, fontSize: SIZE.fine, color: k.paper.muted }}
            >
              <Sep color={k.paper.border} />
              {k.F.pronouns}
            </span>
          )}
          {!k.has.pronouns && k.F.pronouns}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.role,
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.role}
          <Sep color={k.paper.border} />
          {k.F.company}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            fontStyle: 'italic',
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.tagline}
        </Row>
        <Cols
          leftWidth="auto"
          align="bottom"
          rightAlign="right"
          gap={6}
          left={
            <>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.paper.muted,
                  lineHeight: 1.6,
                  marginTop: 3,
                }}
              >
                {k.F.email}
                <Sep color={k.paper.border} />
                {k.F.phone}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.contact,
                  color: k.paper.muted,
                  lineHeight: 1.6,
                }}
              >
                {k.F.website}
                {k.has.social && <Sep color={k.paper.border} />}
                {k.F.social}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.fine,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                }}
              >
                {k.F.address}
              </Row>
            </>
          }
          right={k.mark({ ground: k.paper.bg, size: 20, tint: k.primary, company: '' })}
        />
      </>
    ),
  },

  /* 11 */ {
    name: 'Centred',
    tags: ['Calm', 'Symmetrical', 'Boutique'],
    render: (k) => (
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-block' }}>
          {k.mark({ ground: k.paper.bg, size: 18, tint: k.primary, company: '' })}
        </div>
        <Row
          style={{
            fontFamily: k.head,
            fontSize: SIZE.name,
            fontWeight: 700,
            color: k.paper.text,
            lineHeight: 1.3,
            marginTop: 3,
          }}
        >
          {k.F.name}
          {k.has.pronouns && (
            <span style={{ fontSize: SIZE.fine, fontWeight: 400, color: k.paper.muted }}>
              <Sep color={k.paper.border} />
              {k.F.pronouns}
            </span>
          )}
          {!k.has.pronouns && k.F.pronouns}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.role,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: k.paper.accent,
            lineHeight: 1.5,
          }}
        >
          {k.F.role}
          <Sep color={k.paper.border} gap={5} />
          {k.F.company}
        </Row>
        <Rule
          color={k.paper.border}
          width="34%"
          style={{ margin: '4px auto', display: 'block' }}
        />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.6,
          }}
        >
          {k.F.email}
          <Sep color={k.paper.border} />
          {k.F.phone}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.6,
          }}
        >
          {k.F.website}
          {k.has.social && <Sep color={k.paper.border} />}
          {k.F.social}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.address}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            fontStyle: 'italic',
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.tagline}
        </Row>
      </div>
    ),
  },

  /* 12 */ {
    name: 'Reverse Panel',
    tags: ['Bold', 'Dark', 'Corporate'],
    bleed: true,
    render: (k) => (
      <div style={{ background: k.dark.bg, padding: '9px 10px', height: '100%' }}>
        <Cols
          leftWidth="auto"
          align="middle"
          rightAlign="right"
          left={
            <Row
              style={{
                fontFamily: k.head,
                fontSize: SIZE.nameLarge,
                fontWeight: 700,
                color: k.dark.text,
                lineHeight: 1.15,
              }}
            >
              {k.F.name}
            </Row>
          }
          right={k.mark({ ground: k.dark.bg, size: 18, tint: k.dark.text, company: '' })}
        />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.role,
            color: k.dark.accent,
            lineHeight: 1.5,
          }}
        >
          {k.F.role}
          {k.has.pronouns && <Sep color={k.dark.border} />}
          <span style={{ color: k.dark.muted }}>{k.F.pronouns}</span>
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.role,
            fontWeight: 600,
            color: k.dark.text,
            lineHeight: 1.5,
          }}
        >
          {k.F.company}
        </Row>
        <Rule color={k.dark.border} style={{ margin: '5px 0 4px' }} />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.dark.muted,
            lineHeight: 1.6,
          }}
        >
          {k.F.email}
          <Sep color={k.dark.border} />
          {k.F.phone}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.dark.muted,
            lineHeight: 1.6,
          }}
        >
          {k.F.website}
          {k.has.social && <Sep color={k.dark.border} />}
          {k.F.social}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.dark.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.address}
          {k.has.tagline && <Sep color={k.dark.border} />}
          <span style={{ fontStyle: 'italic' }}>{k.F.tagline}</span>
        </Row>
      </div>
    ),
  },

  /* 13 */ {
    name: 'Between Rules',
    tags: ['Editorial', 'Structured', 'Classic'],
    render: (k) => (
      <>
        <Rule color={k.paper.accent} thickness={2} style={{ marginBottom: 5 }} />
        <Cols
          leftWidth="auto"
          align="top"
          rightAlign="right"
          left={
            <>
              <Row
                style={{
                  fontFamily: k.head,
                  fontSize: SIZE.name,
                  fontWeight: 700,
                  color: k.paper.text,
                  lineHeight: 1.25,
                }}
              >
                {k.F.name}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                }}
              >
                {k.F.role}
                <Sep color={k.paper.border} />
                {k.F.company}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.fine,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                }}
              >
                {k.F.pronouns}
              </Row>
            </>
          }
          right={k.mark({ ground: k.paper.bg, size: 20, tint: k.primary, company: '' })}
        />
        <Rule color={k.paper.border} style={{ margin: '5px 0 4px' }} />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.6,
          }}
        >
          {k.F.email}
          <Sep color={k.paper.border} />
          {k.F.phone}
          <Sep color={k.paper.border} />
          {k.F.website}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.address}
          {k.has.social && <Sep color={k.paper.border} />}
          {k.F.social}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            fontStyle: 'italic',
            color: k.paper.accent,
            lineHeight: 1.5,
          }}
        >
          {k.F.tagline}
        </Row>
      </>
    ),
  },

  /* 14 */ {
    name: 'Wide Footer',
    tags: ['Corporate', 'Three-up', 'Structured'],
    render: (k) => (
      <>
        <table
          cellPadding={0}
          cellSpacing={0}
          style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}
        >
          <tbody>
            <tr>
              <td valign="middle" style={{ width: 26, verticalAlign: 'middle' }}>
                {k.mark({ ground: k.paper.bg, size: 22, tint: k.primary, company: '' })}
              </td>
              <td valign="middle" style={{ verticalAlign: 'middle', paddingLeft: 8 }}>
                <Row
                  style={{
                    fontFamily: k.head,
                    fontSize: SIZE.name,
                    fontWeight: 700,
                    color: k.paper.text,
                    lineHeight: 1.2,
                  }}
                >
                  {k.F.name}
                </Row>
                <Row
                  style={{
                    fontFamily: k.body,
                    fontSize: SIZE.fine,
                    color: k.paper.muted,
                    lineHeight: 1.45,
                  }}
                >
                  {k.F.role}
                  {k.has.pronouns && <Sep color={k.paper.border} />}
                  {k.F.pronouns}
                </Row>
                <Row
                  style={{
                    fontFamily: k.body,
                    fontSize: SIZE.fine,
                    fontWeight: 600,
                    color: k.paper.accent,
                    lineHeight: 1.45,
                  }}
                >
                  {k.F.company}
                </Row>
              </td>
              <td
                valign="middle"
                style={{
                  width: '42%',
                  verticalAlign: 'middle',
                  textAlign: 'right',
                  paddingLeft: 6,
                }}
              >
                <Row
                  style={{
                    fontFamily: k.body,
                    fontSize: SIZE.contact,
                    color: k.paper.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {k.F.email}
                </Row>
                <Row
                  style={{
                    fontFamily: k.body,
                    fontSize: SIZE.contact,
                    color: k.paper.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {k.F.phone}
                </Row>
                <Row
                  style={{
                    fontFamily: k.body,
                    fontSize: SIZE.contact,
                    color: k.paper.muted,
                    lineHeight: 1.5,
                  }}
                >
                  {k.F.website}
                  <Sep color={k.paper.border} gap={3} />
                  {k.F.social}
                </Row>
              </td>
            </tr>
          </tbody>
        </table>
        <div
          style={{
            background: k.soft.bg,
            borderTop: `1px solid ${k.soft.border}`,
            marginTop: 5,
            padding: '4px 6px',
          }}
        >
          <Row
            style={{
              fontFamily: k.body,
              fontSize: SIZE.fine,
              color: k.soft.muted,
              lineHeight: 1.5,
            }}
          >
            {k.F.address}
            {k.has.tagline && <Sep color={k.soft.border} />}
            <span style={{ fontStyle: 'italic' }}>{k.F.tagline}</span>
          </Row>
        </div>
      </>
    ),
  },

  /* 15 */ {
    name: 'Tagline Lead',
    tags: ['Boutique', 'Editorial', 'Voice-led'],
    render: (k) => (
      <>
        <Row
          style={{
            fontFamily: k.head,
            fontSize: SIZE.role + 1,
            fontStyle: 'italic',
            color: k.paper.accent,
            lineHeight: 1.35,
          }}
        >
          {k.F.tagline}
        </Row>
        <Rule color={k.paper.border} style={{ margin: '5px 0 5px' }} />
        <Cols
          leftWidth="auto"
          align="middle"
          rightAlign="right"
          left={
            <>
              <Row
                style={{
                  fontFamily: k.head,
                  fontSize: SIZE.name,
                  fontWeight: 700,
                  color: k.paper.text,
                  lineHeight: 1.25,
                }}
              >
                {k.F.name}
                {k.has.pronouns && (
                  <span style={{ fontSize: SIZE.fine, fontWeight: 400, color: k.paper.muted }}>
                    <Sep color={k.paper.border} />
                    {k.F.pronouns}
                  </span>
                )}
                {!k.has.pronouns && k.F.pronouns}
              </Row>
              <Row
                style={{
                  fontFamily: k.body,
                  fontSize: SIZE.role,
                  color: k.paper.muted,
                  lineHeight: 1.5,
                }}
              >
                {k.F.role}
                <Sep color={k.paper.border} />
                {k.F.company}
              </Row>
            </>
          }
          right={k.mark({ ground: k.paper.bg, size: 18, tint: k.primary, company: '' })}
        />
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.contact,
            color: k.paper.muted,
            lineHeight: 1.6,
            marginTop: 3,
          }}
        >
          {k.F.email}
          <Sep color={k.paper.border} />
          {k.F.phone}
          <Sep color={k.paper.border} />
          {k.F.website}
        </Row>
        <Row
          style={{
            fontFamily: k.body,
            fontSize: SIZE.fine,
            color: k.paper.muted,
            lineHeight: 1.5,
          }}
        >
          {k.F.address}
          {k.has.social && <Sep color={k.paper.border} />}
          {k.F.social}
        </Row>
      </>
    ),
  },

  /* 16 */ {
    name: 'Typewriter',
    tags: ['Technical', 'Mono', 'Minimal'],
    render: (k) => (
      <div
        style={{
          border: `1px solid ${k.paper.border}`,
          padding: '6px 8px',
          fontFamily: k.mono,
        }}
      >
        <Cols
          leftWidth="auto"
          align="middle"
          rightAlign="right"
          left={
            <Row
              style={{
                fontSize: SIZE.name,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                color: k.paper.text,
                lineHeight: 1.25,
              }}
            >
              {k.F.name}
            </Row>
          }
          right={k.mark({ ground: k.paper.bg, size: 15, tint: k.primary, company: '' })}
        />
        <Row style={{ fontSize: SIZE.contact, color: k.paper.accent, lineHeight: 1.55 }}>
          {k.F.role}
          {k.has.pronouns && <Sep color={k.paper.border} gap={3} />}
          <span style={{ color: k.paper.muted }}>{k.F.pronouns}</span>
        </Row>
        <Row style={{ fontSize: SIZE.contact, color: k.paper.text, lineHeight: 1.55 }}>
          {k.F.company}
        </Row>
        <Row style={{ fontSize: SIZE.contact, color: k.paper.muted, lineHeight: 1.55 }}>
          {k.F.email}
        </Row>
        <Row style={{ fontSize: SIZE.contact, color: k.paper.muted, lineHeight: 1.55 }}>
          {k.F.phone}
          <Sep color={k.paper.border} gap={3} />
          {k.F.website}
        </Row>
        <Row style={{ fontSize: SIZE.fine, color: k.paper.muted, lineHeight: 1.5 }}>
          {k.F.address}
          {k.has.social && <Sep color={k.paper.border} gap={3} />}
          {k.F.social}
        </Row>
        <Row style={{ fontSize: SIZE.fine, color: k.paper.muted, lineHeight: 1.5 }}>
          {k.F.tagline}
        </Row>
      </div>
    ),
  },
];

/* ── The preview frame ────────────────────────────────────────────── */

/**
 * The mail window. A PREVIEW, and only that.
 *
 * It carries no subject line and no message body, because a frame that
 * writes words the customer did not is inventing content — the exact
 * defect this family was rebuilt to remove. What is left says "this is
 * what lands at the bottom of your mail" without saying anything: a title
 * bar with three dots, and the hairline a signature sits under.
 *
 * Flexbox here is deliberate and safe: the frame is never exported. The
 * SIGNATURE inside it is tables and blocks, which is what a mail client
 * keeps.
 */
function MailFrame({
  ground,
  paper,
  bleed,
  children,
}: {
  ground: string;
  paper: Ink;
  bleed: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        background: ground,
        padding: 7,
        display: 'flex',
      }}
    >
      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          background: paper.bg,
          border: `1px solid ${paper.border}`,
          borderRadius: 5,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flex: '0 0 auto',
            padding: '5px 7px',
            borderBottom: `1px solid ${paper.border}`,
            lineHeight: 0,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'inline-block',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: paper.border,
                marginRight: 3,
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: '1 1 auto',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: bleed ? 0 : '8px 9px 9px',
          }}
        >
          {!bleed && (
            <div style={{ marginBottom: 6 }}>
              <Rule color={paper.border} width="30%" />
            </div>
          )}
          <div style={{ width: '100%' }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ── The renderer ─────────────────────────────────────────────────── */

export function WebEmailSignatureExtendedRenderer({ brand, templateIndex, content }: Props) {
  const c = { ...defaultPersonContent(brand), ...content };
  const picks = content?.picks ?? {};

  const colors = brandColors(brand);
  const primary = normalizeHex(picks.primaryColor) ?? colors.primary;
  const secondary = normalizeHex(picks.secondaryColor) ?? colors.secondary;
  const markTint = normalizeHex(picks.logoColor) ?? primary;
  const showLogo = picks.showLogo !== false;

  const paper = inkOn(brand, 'card', primary);
  const soft = inkOn(brand, 'subtle', primary);
  const dark = inkOn(brand, 'inverted', primary);
  const brandInk = inkOnColor(primary);
  const ground = surface(brand, 'subtle').bg;

  const head = fontStack(brand, 'heading');
  const body = fontStack(brand, 'body');
  const mono = fontStack(brand, 'mono');

  /**
   * The mark.
   *
   * `logoOn` answers with the variant that READS on this ground, or
   * nothing — and "nothing" is an answer, not a failure: a brand with no
   * artwork that clears the readability floor gets its own lettermark on
   * its own colour rather than an invisible logo. The tile's ink comes
   * from `fgOn`, so it is legible whatever the brand's colour is.
   */
  const mark = ({ ground: bg, size, tint }: MarkOptions): ReactNode => {
    if (!showLogo) return null;
    const resolved = logoOn(brand, bg);
    if (resolved?.url) {
      return (
        <img
          src={resolved.url}
          alt=""
          style={{
            display: 'block',
            height: size,
            width: 'auto',
            maxWidth: '100%',
            objectFit: 'contain',
          }}
        />
      );
    }
    const tileBg = readableGround(tint);
    return (
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          lineHeight: `${size}px`,
          textAlign: 'center',
          borderRadius: Math.round(size * 0.22),
          background: tileBg,
          color: fgOn(tileBg),
          fontFamily: head,
          fontWeight: 700,
          fontSize: Math.round(size * 0.46),
          letterSpacing: '0.02em',
        }}
      >
        {initialsOf(c.company)}
      </span>
    );
  };

  const kit: SigKit = {
    F: {
      name: <Bind path="fullName" value={c.fullName} />,
      pronouns: <Bind path="pronouns" value={c.pronouns ?? ''} />,
      role: <Bind path="jobTitle" value={c.jobTitle} />,
      company: <Bind path="company" value={c.company} />,
      tagline: <Bind path="tagline" value={c.tagline} fit="wrap" />,
      address: <Bind path="address" value={c.address} fit="wrap" />,
      email: <Bind path="email" value={c.email} />,
      phone: <Bind path="phone" value={c.phone} />,
      website: <Bind path="website" value={c.website} />,
      social: <Bind path="socialHandle" value={c.socialHandle ?? ''} />,
    },
    has: {
      pronouns: Boolean(c.pronouns),
      tagline: Boolean(c.tagline),
      address: Boolean(c.address),
      social: Boolean(c.socialHandle),
    },
    primary,
    secondary,
    head,
    body,
    mono,
    paper,
    soft,
    brandInk,
    dark,
    mark,
  };

  const design = DESIGNS[templateIndex] ?? DESIGNS[0]!;

  return (
    <MailFrame ground={ground} paper={paper} bleed={Boolean(design.bleed)}>
      {design.render(kit)}
    </MailFrame>
  );
}

/* ── The template list ────────────────────────────────────────────── */

/**
 * Ids are persistence keys and never move.
 *
 * `email-sig-ext-1..16` are the sixteen designs above, in order.
 * `email-sig-ext-17..30` are the culled generation; their ids stay
 * reserved and their names stay here so an old saved customization still
 * resolves to a real record, but `curation/emailSignature.ts` archives
 * them so nothing shows them. `variantsForCard` is what applies that.
 */
const ARCHIVED_NAMES = [
  'Two-Column',
  'Brand Bar',
  'Initials Big',
  'Quote',
  'Centered',
  'Color Block',
  'Wide Border',
  'Initial Stack',
  'Logo Repeat',
  'Slogan',
  'Frosted',
  'Banner',
  'Block Right',
  'Magazine',
] as const;

/** The ids this family still shows, in order. */
export const EMAIL_SIG_KEPT_IDS: string[] = DESIGNS.map((_, i) => `email-sig-ext-${i + 1}`);

/** The ids that stay reserved but are archived out of every surface. */
export const EMAIL_SIG_ARCHIVED_IDS: string[] = ARCHIVED_NAMES.map(
  (_, i) => `email-sig-ext-${DESIGNS.length + i + 1}`,
);

export const WEB_EMAIL_SIG_EXTENDED = [
  ...DESIGNS.map((d, i) => ({
    idSuffix: `ext-${i + 1}`,
    name: d.name,
    category: 'Signature',
  })),
  ...ARCHIVED_NAMES.map((name, i) => ({
    idSuffix: `ext-${DESIGNS.length + i + 1}`,
    name,
    category: 'Archived',
  })),
];

/** The designer names, by template id — mirrored in the curation file. */
export const EMAIL_SIG_NAMES: Record<string, string> = Object.fromEntries(
  DESIGNS.map((d, i) => [`email-sig-ext-${i + 1}`, d.name]),
);

/** The filter chips, by template id — mirrored in the curation file. */
export const EMAIL_SIG_TAGS: Record<string, string[]> = Object.fromEntries(
  DESIGNS.map((d, i) => [`email-sig-ext-${i + 1}`, d.tags]),
);
