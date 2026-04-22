/**
 * BentoShowcase — asymmetric bento grid that shows the palette across
 * a premium marketing-style page.
 *
 * Grid is 6 cols × 3 rows on md+; collapses to a single column on
 * narrow viewports. Tile spans are chosen so every tile sits on a
 * different surface (brand, dark neutral, light neutral, palette chip
 * stack) and every shade in the scale gets airtime somewhere on the
 * grid.
 *
 *   Row 1 | Hero 3×2 ────────── | Stat 2×1   | Chip 1×2
 *   Row 2 | (Hero continues)    | Features 2×1 | (Chip continues)
 *   Row 3 | Quote 3×1           | Team 2×1   | CTA 1×1
 *
 * Copy is brand-agnostic; the brand name is threaded through where
 * it makes sense (eyebrow tags, CTA).
 */
import { ArrowUpRight, Sparkles, Zap, Layers, Target } from 'lucide-react';

import { pickOn, type ShowcaseProps } from './showcase-shared';
import { PHOTOS, WEB_PHOTOS, PHOTO_POOLS } from './photos';
import { Photo } from './Photo';
import { SwappablePhoto } from './SwappablePhoto';

export function BentoShowcase({ palette, secondary, brand }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;
  const hasSecondary = !!secondary;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[minmax(170px,1fr)]">
      {/* HERO 3×2 — photo with brand gradient overlay */}
      <HeroTile
        className="md:col-span-3 md:row-span-2"
        primary={p}
        neutral={n}
        brandName={brand.name}
      />

      {/* STAT 2×1 — big number + sparkline (secondary comparison if set) */}
      <StatTile
        className="md:col-span-2 md:row-span-1"
        primary={p}
        secondary={s}
        neutral={n}
        hasSecondary={hasSecondary}
      />

      {/* PALETTE CHIP 1×2 — split stack when secondary is set */}
      <PaletteChipTile
        className="md:col-span-1 md:row-span-2"
        primary={p}
        secondary={s}
        neutral={n}
        hasSecondary={hasSecondary}
      />

      {/* FEATURES 2×1 — 2×2 icon grid alternates primary + secondary */}
      <FeatureGridTile
        className="md:col-span-2 md:row-span-1"
        primary={p}
        secondary={s}
        neutral={n}
        hasSecondary={hasSecondary}
      />

      {/* QUOTE 3×1 — pull quote with avatar */}
      <QuoteTile
        className="md:col-span-3 md:row-span-1"
        primary={p}
        secondary={s}
        neutral={n}
      />

      {/* TEAM 2×1 — avatar stack + metric */}
      <TeamTile
        className="md:col-span-2 md:row-span-1"
        primary={p}
        secondary={s}
        neutral={n}
      />

      {/* CTA 1×1 — secondary-colored when we have one, else primary */}
      <CtaTile
        className="md:col-span-1 md:row-span-1"
        primary={p}
        secondary={s}
        neutral={n}
        hasSecondary={hasSecondary}
        brandName={brand.name}
      />
    </div>
  );
}

type ScaleMap = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, { hex: string }>;

// ─── Hero ─────────────────────────────────────────────────────

function HeroTile({
  className = '',
  primary,
  neutral,
  brandName,
}: {
  className?: string;
  primary: ScaleMap;
  neutral: ScaleMap;
  brandName: string;
}) {
  const ink = pickOn(primary[700].hex, neutral[50].hex, neutral[950].hex);
  return (
    <div
      className={`tile relative overflow-hidden ${className}`}
      style={{ background: primary[700].hex, padding: 0, minHeight: 340 }}
    >
      <div className="absolute inset-0">
        <SwappablePhoto
          defaultSrc={PHOTOS.vrHeadset}
          alternatives={PHOTO_POOLS.square}
          alt="Product moment"
          fallback={{ from: primary[400].hex, to: primary[700].hex }}
          overlay={
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent 30%, ${primary[600].hex}aa 60%, ${primary[800].hex} 100%)`,
              }}
            />
          }
        />
      </div>
      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between p-7" style={{ color: ink }}>
        <div className="flex items-start justify-between">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ background: `${ink}22`, color: ink, backdropFilter: 'blur(6px)' }}
          >
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: ink }} />
            {brandName}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] opacity-70">
            A · 01
          </span>
        </div>
        <div>
          <p
            className="text-[15px] italic opacity-80"
            style={{ fontFamily: 'var(--brand-font-display, ui-serif, Georgia, Cambria, "Times New Roman", serif)' }}
          >
            Introducing
          </p>
          <h2 className="mt-1 text-[38px] font-bold leading-[0.95] tracking-[-0.02em] md:text-[48px]">
            A new way
            <br />
            <span
              className="italic"
              style={{ fontFamily: 'var(--brand-font-display, ui-serif, Georgia, Cambria, "Times New Roman", serif)', fontWeight: 400 }}
            >
              to show up.
            </span>
          </h2>
          <p className="mt-3 max-w-[28ch] text-[13px] leading-relaxed opacity-85">
            A system of marks, colors, and motion that travels across every
            surface your customers meet.
          </p>
          <div className="mt-5 flex items-center gap-2 text-[12px] font-semibold">
            <span
              className="inline-flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: ink, color: primary[700].hex }}
            >
              <ArrowUpRight size={13} strokeWidth={2.4} />
            </span>
            Explore the system
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stat ─────────────────────────────────────────────────────

function StatTile({
  className = '',
  primary,
  secondary,
  neutral,
  hasSecondary,
}: {
  className?: string;
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
  hasSecondary: boolean;
}) {
  const spark = [30, 38, 34, 48, 42, 58, 52, 68, 62, 82];
  const sparkPrev = [24, 30, 28, 36, 32, 40, 38, 44, 42, 52];
  const max = Math.max(...spark, ...sparkPrev);
  const min = Math.min(...spark, ...sparkPrev);
  const range = max - min || 1;
  const toPoints = (arr: number[]) =>
    arr.map((v, i) => `${(i / (arr.length - 1)) * 100},${100 - ((v - min) / range) * 70 - 15}`).join(' ');
  const points = toPoints(spark);
  const prevPoints = toPoints(sparkPrev);
  return (
    <div
      className={`tile flex flex-col justify-between p-6 ${className}`}
      style={{ background: neutral[950].hex, color: neutral[50].hex }}
    >
      <div className="flex items-start justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: neutral[400].hex }}
        >
          Brand recall
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: primary[500].hex, color: pickOn(primary[500].hex, '#ffffff', '#0a0a0a') }}
        >
          ↑ Live
        </span>
      </div>
      <div className="flex items-end justify-between gap-6">
        <div className="flex items-baseline">
          <span className="text-[76px] font-bold leading-[0.82] tracking-[-0.04em]">+48</span>
          <span className="text-[36px] font-bold leading-none" style={{ color: primary[400].hex }}>
            %
          </span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-16 w-28">
          <defs>
            <linearGradient id="spark-bento" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={primary[500].hex} stopOpacity="0.35" />
              <stop offset="100%" stopColor={primary[500].hex} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`M0,100 L${points.split(' ').join(' L')} L100,100 Z`}
            fill="url(#spark-bento)"
          />
          {hasSecondary && (
            <polyline
              points={prevPoints}
              fill="none"
              stroke={secondary[400].hex}
              strokeWidth="1.6"
              strokeDasharray="3 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          <polyline
            points={points}
            fill="none"
            stroke={primary[400].hex}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <div className="flex items-center justify-between text-[11px]" style={{ color: neutral[400].hex }}>
        <span>Unaided awareness · 6 weeks.</span>
        {hasSecondary && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-1 w-3 rounded-full"
              style={{ background: primary[400].hex }}
            />
            <span>This</span>
            <span
              className="ml-1 inline-block h-1 w-3 rounded-full"
              style={{ background: secondary[400].hex }}
            />
            <span>Prev</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Palette chip stack ──────────────────────────────────────

function PaletteChipTile({
  className = '',
  primary,
  secondary,
  neutral,
  hasSecondary,
}: {
  className?: string;
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
  hasSecondary: boolean;
}) {
  const stops: (keyof ScaleMap)[] = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return (
    <div
      className={`tile flex flex-col overflow-hidden ${className}`}
      style={{ background: neutral[50].hex, padding: 0 }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: neutral[200].hex }}>
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: neutral[500].hex }}
        >
          {hasSecondary ? 'System · 2 scales' : 'System'}
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: primary[500].hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}
          />
          {hasSecondary && (
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: secondary[500].hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }}
            />
          )}
        </span>
      </div>
      <div className="flex flex-1">
        <div className="flex flex-1 flex-col">
          {stops.map((stop) => (
            <div
              key={`p-${stop}`}
              className="flex flex-1 items-center justify-center px-2 text-[9px] font-semibold"
              style={{
                background: primary[stop].hex,
                color: pickOn(primary[stop].hex, '#ffffff', '#0a0a0a'),
                minHeight: 18,
              }}
              title={primary[stop].hex.toUpperCase()}
            >
              <span style={{ opacity: 0.85 }}>{stop}</span>
            </div>
          ))}
        </div>
        {hasSecondary && (
          <div className="flex flex-1 flex-col" style={{ borderLeft: `1px solid ${neutral[200].hex}` }}>
            {stops.map((stop) => (
              <div
                key={`s-${stop}`}
                className="flex flex-1 items-center justify-center px-2 text-[9px] font-semibold"
                style={{
                  background: secondary[stop].hex,
                  color: pickOn(secondary[stop].hex, '#ffffff', '#0a0a0a'),
                  minHeight: 18,
                }}
                title={secondary[stop].hex.toUpperCase()}
              >
                <span style={{ opacity: 0.85 }}>{stop}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Feature grid (2×2 icons) ────────────────────────────────

function FeatureGridTile({
  className = '',
  primary,
  secondary,
  neutral,
  hasSecondary,
}: {
  className?: string;
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
  hasSecondary: boolean;
}) {
  const items = [
    { Icon: Sparkles, label: 'Clarity', hint: 'One system', useSecondary: false },
    { Icon: Target, label: 'Focus', hint: 'One voice', useSecondary: true },
    { Icon: Layers, label: 'Scale', hint: 'Every surface', useSecondary: true },
    { Icon: Zap, label: 'Momentum', hint: 'Ships faster', useSecondary: false },
  ];
  return (
    <div
      className={`tile flex flex-col p-5 ${className}`}
      style={{ background: neutral[50].hex, color: neutral[900].hex }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: neutral[500].hex }}>
        Principles
      </span>
      <div className="mt-3 grid flex-1 grid-cols-2 gap-2.5">
        {items.map((it) => {
          const scale = hasSecondary && it.useSecondary ? secondary : primary;
          return (
            <div
              key={it.label}
              className="flex flex-col justify-between rounded-lg p-3"
              style={{ background: neutral[100].hex, border: `1px solid ${neutral[200].hex}` }}
            >
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-md"
                style={{ background: scale[100].hex, color: scale[700].hex }}
              >
                <it.Icon size={13} strokeWidth={2.2} />
              </span>
              <div className="mt-2">
                <div className="text-[12px] font-semibold leading-tight">{it.label}</div>
                <div className="text-[10px]" style={{ color: neutral[500].hex }}>
                  {it.hint}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quote ───────────────────────────────────────────────────

function QuoteTile({
  className = '',
  primary,
  secondary,
  neutral,
}: {
  className?: string;
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
}) {
  return (
    <div
      className={`tile relative flex flex-col justify-between p-7 ${className}`}
      style={{ background: neutral[50].hex, color: neutral[900].hex, overflow: 'hidden' }}
    >
      <svg
        aria-hidden
        className="pointer-events-none absolute -left-4 -top-4"
        width="120"
        height="120"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M6 17c0-5 2-8 6-9v3c-2 1-3 2.5-3 5h3v6H6v-5zm10 0c0-5 2-8 6-9v3c-2 1-3 2.5-3 5h3v6h-6v-5z"
          fill={primary[100].hex}
        />
      </svg>
      <div className="relative">
        <p
          className="text-[22px] leading-[1.25] tracking-tight"
          style={{
            fontFamily: 'var(--brand-font-display, ui-serif, Georgia, Cambria, "Times New Roman", serif)',
          }}
        >
          A brand isn't what you say it is —{' '}
          <span className="italic" style={{ color: primary[700].hex }}>
            it's what your customers say it is
          </span>{' '}
          when you're not in the room.
        </p>
      </div>
      <div className="relative mt-5 flex items-center gap-3">
        <div
          className="h-10 w-10 shrink-0 overflow-hidden rounded-full"
          style={{ background: secondary[200].hex, border: `2px solid ${neutral[50].hex}`, boxShadow: `0 0 0 1px ${neutral[200].hex}` }}
        >
          <Photo
            src={WEB_PHOTOS.avatar1}
            alt=""
            fallback={{ from: secondary[200].hex, to: secondary[500].hex }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold leading-tight">Ava Linden</div>
          <div className="text-[10px]" style={{ color: neutral[500].hex }}>
            Head of Brand · Studio Orion
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold"
          style={{ background: primary[100].hex, color: primary[700].hex }}
        >
          ★ 5.0
        </span>
      </div>
    </div>
  );
}

// ─── Team / avatar stack ─────────────────────────────────────

function TeamTile({
  className = '',
  primary,
  secondary,
  neutral,
}: {
  className?: string;
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
}) {
  const avatars = [WEB_PHOTOS.avatar1, WEB_PHOTOS.avatar2, WEB_PHOTOS.avatar3, WEB_PHOTOS.avatar4];
  return (
    <div
      className={`tile flex flex-col justify-between p-6 ${className}`}
      style={{ background: neutral[50].hex, color: neutral[900].hex }}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: neutral[500].hex }}>
          Contributors
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: primary[600].hex, color: pickOn(primary[600].hex, '#ffffff', '#0a0a0a') }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'currentColor', animation: 'pulse 2s infinite' }} />
          42 active
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-3">
          {avatars.map((src, i) => (
            <div
              key={i}
              className="h-11 w-11 shrink-0 overflow-hidden rounded-full"
              style={{
                background: [primary[200].hex, secondary[200].hex, primary[300].hex, secondary[300].hex][i],
                border: `3px solid ${neutral[50].hex}`,
                boxShadow: `0 0 0 1px ${neutral[200].hex}`,
                zIndex: avatars.length - i,
              }}
            >
              <Photo
                src={src}
                alt=""
                fallback={{ from: primary[200].hex, to: primary[500].hex }}
              />
            </div>
          ))}
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
            style={{
              background: neutral[900].hex,
              color: neutral[50].hex,
              border: `3px solid ${neutral[50].hex}`,
              boxShadow: `0 0 0 1px ${neutral[200].hex}`,
            }}
          >
            +38
          </div>
        </div>
        <div className="text-right">
          <div className="text-[22px] font-bold leading-none tracking-tight" style={{ color: neutral[900].hex }}>
            2.4×
          </div>
          <div className="text-[10px]" style={{ color: neutral[500].hex }}>
            faster reviews
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11px]" style={{ color: neutral[500].hex }}>
        <span className="inline-block h-1 w-1 rounded-full" style={{ background: primary[500].hex }} />
        Collaborating across 6 time zones
      </div>
    </div>
  );
}

// ─── CTA ──────────────────────────────────────────────────────

function CtaTile({
  className = '',
  primary,
  secondary,
  neutral,
  hasSecondary,
  brandName,
}: {
  className?: string;
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
  hasSecondary: boolean;
  brandName: string;
}) {
  // Pick secondary when available so the CTA visibly brings the
  // second brand color into the bento composition.
  const scale = hasSecondary ? secondary : primary;
  const ink = pickOn(scale[500].hex, neutral[50].hex, neutral[950].hex);
  return (
    <div
      className={`tile relative flex flex-col justify-between overflow-hidden p-5 ${className}`}
      style={{ background: scale[500].hex, color: ink }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full"
        style={{ background: `${ink}12` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -right-8 h-28 w-28 rounded-full"
        style={{ background: `${ink}18` }}
      />
      <div className="relative">
        <span
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: ink, opacity: 0.8 }}
        >
          {brandName}
        </span>
        <div className="mt-2 text-[20px] font-bold leading-[1.05] tracking-tight">
          Start
          <br />
          <span
            className="italic"
            style={{ fontFamily: 'var(--brand-font-display, ui-serif, Georgia, Cambria, "Times New Roman", serif)', fontWeight: 400 }}
          >
            the shift
          </span>
        </div>
      </div>
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] opacity-85">Book a demo</span>
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: ink, color: scale[500].hex }}
        >
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );
}
