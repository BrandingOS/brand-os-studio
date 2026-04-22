/**
 * SocialShowcase — portrait social-media cards that show the palette
 * across a coordinated brand campaign.
 *
 * Six 4:5 portrait tiles in a 3-col grid. The set intentionally cycles
 * between black / primary / white surfaces so every shade in the scale
 * gets a turn, and mirrors the typography language of premium social
 * decks: pill badges with arrow icons, small uppercase tracked tags,
 * mixed serif-italic + bold sans, big stat numbers with accent
 * character, asterisk accents, and a hand-drawn-style underline.
 *
 * All copy is brand-agnostic (no product names, currencies, or
 * industry-specific wording).
 */
import { ArrowUpRight } from 'lucide-react';

import { pickOn, type ShowcaseProps } from './showcase-shared';
import { PHOTOS, WEB_PHOTOS } from './photos';
import { Photo } from './Photo';

export function SocialShowcase({ palette, secondary, brand }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <PortraitTile>
        <ProfileCard
          ink={n[950].hex}
          accent={p[500].hex}
          pillFg={n[50].hex}
          pillBg={n[950].hex}
          photo={WEB_PHOTOS.avatar4}
          fallback={{ from: n[800].hex, to: n[950].hex }}
          role="Director"
          name="Marcus Hale"
        />
      </PortraitTile>

      <PortraitTile>
        <HeadlineCard
          bg={n[50].hex}
          ink={n[950].hex}
          muted={n[500].hex}
          accent={p[600].hex}
          eyebrow="Smart businesses"
          pre="Grow"
          headline="Smarter"
          photo={PHOTOS.blogNomad}
          fallback={{ from: n[200].hex, to: n[400].hex }}
        />
      </PortraitTile>

      <PortraitTile>
        <QuoteCard
          bg={n[950].hex}
          ink={n[50].hex}
          accent={p[500].hex}
          footnoteFg={n[400].hex}
          brandName={brand.name}
        />
      </PortraitTile>

      <PortraitTile>
        <ManifestoCard
          bg={p[500].hex}
          ink={pickOn(p[500].hex, n[50].hex, n[950].hex)}
          starColor={pickOn(p[500].hex, n[50].hex, n[950].hex)}
          buttonBg={n[50].hex}
          buttonFg={n[950].hex}
          brandName={brand.name}
        />
      </PortraitTile>

      <PortraitTile>
        <StatCard
          bg={n[50].hex}
          ink={n[950].hex}
          muted={n[500].hex}
          accent={p[500].hex}
          big="84%"
          lead="Design the long game."
          sub="The founder mindset."
          note="of brand leaders say a clear identity is the single biggest driver of trust."
          brandName={brand.name}
        />
      </PortraitTile>

      <PortraitTile>
        <NumberCard
          bg={n[950].hex}
          ink={n[50].hex}
          accent={p[500].hex}
          muted={n[400].hex}
          number="2.4"
          unit="K"
          label="Brands"
          body="that treat identity as a system"
          bodyAccent="compound 6×"
          bodyTail="faster across every channel."
          brandName={brand.name}
        />
      </PortraitTile>

      <PortraitTile>
        <SecondaryCard
          bg={s[500].hex}
          ink={pickOn(s[500].hex, n[50].hex, n[950].hex)}
          starColor={pickOn(s[500].hex, n[50].hex, n[950].hex)}
          brandName={brand.name}
        />
      </PortraitTile>

      <PortraitTile>
        <CtaCard
          bg={n[50].hex}
          ink={n[950].hex}
          accent={p[600].hex}
          muted={n[500].hex}
          primary={p[500].hex}
          photo={PHOTOS.blogDesign}
          fallback={{ from: n[100].hex, to: n[300].hex }}
          brandName={brand.name}
        />
      </PortraitTile>

      <PortraitTile>
        <ClosingCard
          bg={n[950].hex}
          ink={n[50].hex}
          accent={p[500].hex}
          muted={n[400].hex}
          brandName={brand.name}
        />
      </PortraitTile>
    </div>
  );
}

// ─── Frame ─────────────────────────────────────────────────────

function PortraitTile({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="tile relative overflow-hidden"
      style={{ aspectRatio: '4 / 5', padding: 0 }}
    >
      {children}
    </div>
  );
}

// ─── 1. Profile card ──────────────────────────────────────────

function ProfileCard({
  ink,
  accent,
  pillFg,
  pillBg,
  photo,
  fallback,
  role,
  name,
}: {
  ink: string;
  accent: string;
  pillFg: string;
  pillBg: string;
  photo: string;
  fallback: { from: string; to: string };
  role: string;
  name: string;
}) {
  return (
    <div className="relative flex h-full flex-col" style={{ background: ink }}>
      <CornerBracket corner="tr" color={accent} label="A BETTER FUTURE" />
      <div className="relative flex-1">
        <Photo
          src={photo}
          alt="Portrait"
          fallback={fallback}
          style={{ position: 'absolute', inset: 0 }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: `linear-gradient(180deg, transparent 0%, ${ink}cc 70%, ${ink} 100%)` }}
        />
        <div className="absolute left-4 top-4">
          <ArrowPill color={accent} />
        </div>
        <div
          className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ background: accent, color: pickOn(accent, '#ffffff', '#0a0a0a') }}
        >
          <span aria-hidden>●</span>
          {role}
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-center px-4 pb-5 pt-2">
        <div
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold uppercase tracking-[0.08em]"
          style={{ background: pillBg, color: pillFg, border: `1px solid ${pillFg}22` }}
        >
          {name}
        </div>
      </div>
    </div>
  );
}

// ─── 2. Headline card ─────────────────────────────────────────

function HeadlineCard({
  bg,
  ink,
  muted,
  accent,
  eyebrow,
  pre,
  headline,
  photo,
  fallback,
}: {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  eyebrow: string;
  pre: string;
  headline: string;
  photo: string;
  fallback: { from: string; to: string };
}) {
  return (
    <div className="relative flex h-full flex-col p-5" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <ArrowPill color={accent} outline />
        <div
          className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1"
          style={{ borderColor: ink, background: bg }}
        >
          <div
            className="h-4 w-6 shrink-0 overflow-hidden rounded-sm"
            style={{ background: fallback.from }}
          >
            <Photo src={photo} alt="" fallback={fallback} />
          </div>
          <span className="whitespace-nowrap text-[9px] italic" style={{ color: ink }}>
            {eyebrow}
          </span>
        </div>
      </div>
      <div className="mt-auto">
        <p
          className="text-[34px] font-light italic leading-[0.95] tracking-tight"
          style={{ color: ink, fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' }}
        >
          {pre}
        </p>
        <h3
          className="text-[58px] font-bold leading-[0.9] tracking-[-0.03em]"
          style={{ color: ink }}
        >
          {headline}
        </h3>
        <div className="mt-4 flex items-center gap-2 text-[10px]" style={{ color: muted }}>
          <span aria-hidden className="inline-block h-1 w-1 rounded-full" style={{ background: muted }} />
          A series on identity
        </div>
      </div>
    </div>
  );
}

// ─── 3. Quote card with circled keyword ───────────────────────

function QuoteCard({
  bg,
  ink,
  accent,
  footnoteFg,
  brandName,
}: {
  bg: string;
  ink: string;
  accent: string;
  footnoteFg: string;
  brandName: string;
}) {
  return (
    <div className="relative flex h-full flex-col p-6" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <ArrowPill color={accent} />
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: footnoteFg }}
        >
          [ {brandName} ]
        </span>
      </div>
      <div className="my-auto">
        <p
          className="text-[18px] leading-[1.3]"
          style={{
            color: ink,
            fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
          }}
        >
          Every great business needs a strong digital presence. We craft identities
          that attract, engage, and{' '}
          <span className="relative inline-block px-1">
            <span className="relative z-10">convert</span>
            <svg
              className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
              viewBox="0 0 120 42"
              style={{ width: '100%', height: '130%' }}
              aria-hidden
            >
              <ellipse
                cx="60"
                cy="21"
                rx="54"
                ry="14"
                fill="none"
                stroke={accent}
                strokeWidth="2"
                strokeLinecap="round"
                transform="rotate(-3 60 21)"
              />
            </svg>
          </span>
          .
        </p>
      </div>
      <p
        className="text-center text-[11px] italic"
        style={{
          color: footnoteFg,
          fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
        }}
      >
        Branding is what people say about you
        <br />
        when you're not in the room.
      </p>
    </div>
  );
}

// ─── 4. Manifesto card (primary-colored) ──────────────────────

function ManifestoCard({
  bg,
  ink,
  starColor,
  buttonBg,
  buttonFg,
  brandName,
}: {
  bg: string;
  ink: string;
  starColor: string;
  buttonBg: string;
  buttonFg: string;
  brandName: string;
}) {
  return (
    <div className="relative flex h-full flex-col p-6" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <ArrowPill color={ink} outline />
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-75"
          style={{ color: ink }}
        >
          [ {brandName} ]
        </span>
      </div>
      <div className="my-auto">
        <p
          className="text-[22px] leading-[1.15] tracking-tight"
          style={{
            color: ink,
            fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
          }}
        >
          Creativity isn't just about aesthetics
          <span className="italic">—it's about problem‑solving</span>
        </p>
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.1em]"
          style={{ background: buttonBg, color: buttonFg }}
        >
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: buttonFg, color: buttonBg }}
          >
            <ArrowUpRight size={10} />
          </span>
          Join us
        </button>
        <div className="flex items-center gap-2 text-[11px] font-medium opacity-85" style={{ color: ink }}>
          <Asterisk color={starColor} size={14} />
          Build smarter, not just prettier.
        </div>
      </div>
    </div>
  );
}

// ─── 5. Stat card (big %) ────────────────────────────────────

function StatCard({
  bg,
  ink,
  muted,
  accent,
  big,
  lead,
  sub,
  note,
  brandName,
}: {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  big: string;
  lead: string;
  sub: string;
  note: string;
  brandName: string;
}) {
  return (
    <div className="relative flex h-full flex-col p-6" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <ArrowPill color={ink} outline />
        <CornerBracketInline color={muted} label={`[  ${brandName}  ]`} />
      </div>
      <div className="mt-4">
        <p className="text-[18px] font-semibold leading-tight">{lead}</p>
        <p
          className="mt-1 text-[14px] italic"
          style={{
            color: muted,
            fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
          }}
        >
          {sub}
        </p>
      </div>
      <div className="mt-auto flex items-end gap-4">
        <div
          className="text-[88px] font-bold leading-[0.85] tracking-[-0.05em]"
          style={{ color: ink }}
        >
          {big}
        </div>
        <div className="mb-2 flex-1">
          <Asterisk color={accent} size={16} />
          <p
            className="mt-2 text-[10px] italic"
            style={{
              color: muted,
              fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
              lineHeight: 1.35,
            }}
          >
            {note}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 6. Big number card ───────────────────────────────────────

function NumberCard({
  bg,
  ink,
  accent,
  muted,
  number,
  unit,
  label,
  body,
  bodyAccent,
  bodyTail,
  brandName,
}: {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  number: string;
  unit: string;
  label: string;
  body: string;
  bodyAccent: string;
  bodyTail: string;
  brandName: string;
}) {
  return (
    <div className="relative flex h-full flex-col p-6" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <CornerBracketInline color={muted} label={`[  ${brandName}  ]`} />
        <Asterisk color={accent} size={14} />
      </div>
      <div className="my-auto">
        <div className="flex items-baseline leading-[0.85] tracking-[-0.05em]">
          <span className="text-[110px] font-bold" style={{ color: ink }}>
            {number}
          </span>
          <span className="text-[110px] font-bold" style={{ color: accent }}>
            {unit}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <ArrowPill color={accent} />
          <span
            className="text-[20px] italic"
            style={{
              color: ink,
              fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
            }}
          >
            {label}
          </span>
        </div>
      </div>
      <p className="text-[11px] leading-[1.45]" style={{ color: muted }}>
        {body}{' '}
        <span className="font-semibold" style={{ color: accent }}>
          {bodyAccent}
        </span>{' '}
        {bodyTail}
      </p>
    </div>
  );
}

// ─── 7. Secondary-color card ──────────────────────────────────

function SecondaryCard({
  bg,
  ink,
  starColor,
  brandName,
}: {
  bg: string;
  ink: string;
  starColor: string;
  brandName: string;
}) {
  return (
    <div className="relative flex h-full flex-col p-6" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <ArrowPill color={ink} outline />
        <span
          className="text-[9px] font-semibold uppercase tracking-[0.16em] opacity-75"
          style={{ color: ink }}
        >
          [ {brandName} ]
        </span>
      </div>
      <div className="my-auto">
        <p
          className="text-[28px] leading-[1.05] tracking-tight"
          style={{ color: ink, fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' }}
        >
          Design is the
          <br />
          <span className="italic">silent ambassador</span>
          <br />
          of your brand.
        </p>
      </div>
      <div className="flex items-center gap-2 text-[11px] font-medium opacity-90" style={{ color: ink }}>
        <Asterisk color={starColor} size={14} />
        A point of view, not just a palette.
      </div>
    </div>
  );
}

// ─── 8. CTA card with photo ───────────────────────────────────

function CtaCard({
  bg,
  ink,
  accent,
  muted,
  primary,
  photo,
  fallback,
  brandName,
}: {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  primary: string;
  photo: string;
  fallback: { from: string; to: string };
  brandName: string;
}) {
  return (
    <div className="relative flex h-full flex-col p-5" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <ArrowPill color={accent} outline />
        <CornerBracketInline color={muted} label={`[  ${brandName}  ]`} />
      </div>
      <div
        className="relative mt-4 overflow-hidden"
        style={{
          borderRadius: 14,
          aspectRatio: '4 / 3',
          background: fallback.from,
        }}
      >
        <Photo
          src={photo}
          alt="Team"
          fallback={fallback}
          style={{ position: 'absolute', inset: 0 }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2"
          style={{ background: `linear-gradient(180deg, transparent, ${primary}bb)` }}
        />
        <span
          className="absolute left-3 bottom-3 rounded-full px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em]"
          style={{
            background: primary,
            color: pickOn(primary, '#ffffff', '#0a0a0a'),
          }}
        >
          In studio
        </span>
      </div>
      <h3 className="mt-4 text-[22px] font-bold leading-[1.1] tracking-tight" style={{ color: ink }}>
        Fail fast,
        <br />
        <span
          className="italic"
          style={{ fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif' }}
        >
          learn faster.
        </span>
      </h3>
      <p className="mt-2 text-[11px]" style={{ color: muted }}>
        The founder mindset — iteration is the strategy.
      </p>
    </div>
  );
}

// ─── 9. Closing card ──────────────────────────────────────────

function ClosingCard({
  bg,
  ink,
  accent,
  muted,
  brandName,
}: {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  brandName: string;
}) {
  return (
    <div className="relative flex h-full flex-col p-6" style={{ background: bg, color: ink }}>
      <div className="flex items-start justify-between">
        <ArrowPill color={accent} />
        <span className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: muted }}>
          [ END ]
        </span>
      </div>
      <div className="my-auto text-center">
        <p
          className="text-[16px] italic"
          style={{
            color: muted,
            fontFamily: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
          }}
        >
          made with
        </p>
        <p
          className="mt-2 text-[44px] font-bold leading-[0.95] tracking-[-0.03em]"
          style={{ color: ink }}
        >
          {brandName}
        </p>
        <p
          className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: accent }}
        >
          Identity · Design · Story
        </p>
      </div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em]" style={{ color: muted }}>
        <span>Follow →</span>
        <Asterisk color={accent} size={12} />
        <span>Share</span>
      </div>
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────

function ArrowPill({ color, outline = false }: { color: string; outline?: boolean }) {
  return (
    <span
      className="inline-flex h-6 w-8 items-center justify-center rounded-full"
      style={
        outline
          ? { border: `1px solid ${color}`, color }
          : { background: color, color: pickOn(color, '#ffffff', '#0a0a0a') }
      }
    >
      <ArrowUpRight size={11} strokeWidth={2.4} />
    </span>
  );
}

function Asterisk({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      <path
        d="M12 2 L13.2 10.8 L22 12 L13.2 13.2 L12 22 L10.8 13.2 L2 12 L10.8 10.8 Z"
        fill={color}
      />
    </svg>
  );
}

function CornerBracket({
  corner,
  color,
  label,
}: {
  corner: 'tr' | 'tl';
  color: string;
  label: string;
}) {
  const pos = corner === 'tr' ? 'right-4 top-4' : 'left-4 top-4';
  return (
    <span
      className={`pointer-events-none absolute z-10 text-[9px] font-semibold uppercase tracking-[0.16em] ${pos}`}
      style={{ color }}
    >
      [ {label} ]
    </span>
  );
}

function CornerBracketInline({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="text-[9px] font-semibold uppercase tracking-[0.14em]"
      style={{ color }}
    >
      {label}
    </span>
  );
}
