/**
 * SocialShowcase — Instagram-style post mockups in a single horizontal
 * row. Six posts, each wrapped in a real IG chrome (avatar header +
 * square content + like / comment / share / save action row), so the
 * palette reads as a cohesive social campaign.
 *
 * Desktop: 6 columns side-by-side at ~180–220px wide each.
 * Medium:  3 columns, 2 rows.
 * Narrow:  2 columns.
 */
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';

import { pickOn, type ShowcaseProps } from './showcase-shared';
import { PHOTOS, PHOTO_POOLS } from './photos';
import { Photo } from './Photo';
import { SwappablePhoto } from './SwappablePhoto';

export function SocialShowcase({ palette, secondary, brand }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;
  const hasSecondary = !!secondary;
  const handle = brand.name.toLowerCase().replace(/\s+/g, '');

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      <IgPost brand={brand} handle={handle} neutral={n}>
        <HeadlineCover primary={p} neutral={n} />
      </IgPost>

      <IgPost brand={brand} handle={handle} neutral={n}>
        <BrandMarkCover primary={p} neutral={n} brandName={brand.name} />
      </IgPost>

      <IgPost brand={brand} handle={handle} neutral={n}>
        {/* Orb picks secondary when it exists so this post carries
            the second brand color prominently. */}
        <DarkOrbCover primary={hasSecondary ? s : p} neutral={n} />
      </IgPost>

      <IgPost brand={brand} handle={handle} neutral={n}>
        <StatCover primary={p} neutral={n} />
      </IgPost>

      <IgPost brand={brand} handle={handle} neutral={n}>
        {/* Quote background uses secondary palette when available. */}
        <QuoteCover primary={hasSecondary ? s : p} neutral={n} />
      </IgPost>

      <IgPost brand={brand} handle={handle} neutral={n}>
        <PhotoCover primary={p} secondary={s} neutral={n} />
      </IgPost>
    </div>
  );
}

type ScaleMap = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, { hex: string }>;

// ─── IG frame ──────────────────────────────────────────────────

function IgPost({
  brand,
  handle,
  neutral,
  children,
}: {
  brand: { name: string; letter: string; logoUrl?: string | null };
  handle: string;
  neutral: ScaleMap;
  children: React.ReactNode;
}) {
  return (
    <div
      className="tile flex flex-col overflow-hidden"
      style={{ background: neutral[50].hex, padding: 0, borderRadius: 14 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5"
        style={{ borderBottom: `1px solid ${neutral[200].hex}` }}
      >
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
          style={{
            background: neutral[200].hex,
            color: neutral[900].hex,
            border: `1px solid ${neutral[300].hex}`,
          }}
        >
          {brand.logoUrl ? (
            <img
              src={brand.logoUrl}
              alt=""
              style={{ maxWidth: '75%', maxHeight: '75%', objectFit: 'contain' }}
            />
          ) : (
            brand.letter
          )}
        </span>
        <span
          className="min-w-0 flex-1 truncate text-[12px] font-semibold"
          style={{ color: neutral[900].hex }}
        >
          {handle}
        </span>
        <MoreHorizontal size={15} style={{ color: neutral[600].hex }} />
      </div>

      {/* Square cover — clipped so decorative orbs/gradients can't
          bleed past the frame edges. */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '1 / 1' }}
      >
        {children}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <Heart size={17} style={{ color: neutral[900].hex }} />
        <MessageCircle size={17} style={{ color: neutral[900].hex }} />
        <Send size={17} style={{ color: neutral[900].hex }} />
        <span style={{ flex: 1 }} />
        <Bookmark size={17} style={{ color: neutral[900].hex }} />
      </div>
    </div>
  );
}

// ─── Covers ───────────────────────────────────────────────────

function HeadlineCover({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  const ink = pickOn(primary[600].hex, neutral[50].hex, neutral[950].hex);
  return (
    <div
      className="relative flex h-full flex-col justify-between p-5"
      style={{ background: primary[600].hex, color: ink }}
    >
      {/* Soft orb — fully inside the frame so nothing bleeds to the edges */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          right: '15%',
          top: '15%',
          width: '50%',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${primary[400].hex}, ${primary[700].hex} 60%, transparent 80%)`,
          filter: 'blur(18px)',
          opacity: 0.85,
        }}
      />
      <span
        className="relative text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: ink, opacity: 0.8 }}
      >
        12:00 · Mon
      </span>
      <h3
        className="relative text-[30px] font-bold leading-[1.02] tracking-[-0.02em]"
        style={{ color: ink }}
      >
        Join the
        <br />
        <span
          className="italic"
          style={{
            fontFamily: 'var(--brand-font-display, ui-serif, Georgia, serif)',
            fontWeight: 400,
          }}
        >
          movement.
        </span>
      </h3>
    </div>
  );
}

function BrandMarkCover({
  primary,
  neutral,
  brandName,
}: {
  primary: ScaleMap;
  neutral: ScaleMap;
  brandName: string;
}) {
  return (
    <div
      className="relative flex h-full items-center justify-center"
      style={{
        background: `linear-gradient(135deg, ${primary[400].hex}, ${primary[700].hex})`,
      }}
    >
      {/* Grid overlay */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: 0.12, color: neutral[50].hex }}
      >
        <defs>
          <pattern id="ig-grid" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="currentColor" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ig-grid)" />
      </svg>

      <div
        className="relative flex items-center gap-2 rounded-md px-4 py-2.5"
        style={{
          background: neutral[50].hex,
          boxShadow: '0 10px 26px -6px rgba(0,0,0,0.22)',
        }}
      >
        <span
          className="inline-block h-5 w-5 rounded-sm"
          style={{ background: primary[600].hex }}
        />
        <span
          className="text-[18px] font-bold uppercase tracking-tight"
          style={{ color: neutral[950].hex, letterSpacing: 0 }}
        >
          {brandName}
        </span>
      </div>
      <span
        className="absolute bottom-3 left-3 rounded-[4px] bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: primary[700].hex }}
      >
        Official partner
      </span>
    </div>
  );
}

function DarkOrbCover({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  return (
    <div
      className="relative flex h-full flex-col justify-between p-5"
      style={{ background: neutral[950].hex, color: neutral[50].hex }}
    >
      {/* Orb — sits inside the frame; no edge bleed */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: '28%',
          top: '25%',
          width: '46%',
          aspectRatio: '1 / 1',
          borderRadius: '50%',
          background: `radial-gradient(circle at 35% 30%, ${primary[300].hex}, ${primary[500].hex} 40%, ${primary[800].hex} 70%, ${neutral[950].hex} 95%)`,
          filter: 'blur(8px)',
        }}
      />
      {/* Grid */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        style={{ opacity: 0.1, color: neutral[50].hex }}
      >
        <defs>
          <pattern id="ig-grid-d" width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="currentColor" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ig-grid-d)" />
      </svg>

      <div className="relative flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: neutral[400].hex }}>
          MM · 2026
        </span>
      </div>
      <div className="relative">
        <h3 className="text-[30px] font-bold leading-[1] tracking-[-0.02em]" style={{ color: neutral[50].hex }}>
          The
          <br />
          Roundup
        </h3>
      </div>
    </div>
  );
}

function StatCover({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  return (
    <div
      className="relative flex h-full flex-col justify-between p-5"
      style={{ background: neutral[50].hex, color: neutral[950].hex }}
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex h-6 w-6 items-center justify-center rounded-full"
          style={{ background: primary[500].hex, color: pickOn(primary[500].hex, '#ffffff', '#0a0a0a'), fontSize: 11 }}
        >
          ↑
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: neutral[500].hex }}>
          [ Insight ]
        </span>
      </div>
      <div>
        <div
          className="flex items-baseline leading-[0.85] tracking-[-0.04em]"
          style={{ color: neutral[950].hex }}
        >
          <span style={{ fontSize: 92, fontWeight: 700 }}>84</span>
          <span style={{ fontSize: 44, fontWeight: 700, color: primary[600].hex }}>%</span>
        </div>
        <p className="mt-2 text-[12px] leading-[1.35]" style={{ color: neutral[600].hex }}>
          of brand leaders name identity as their #1 growth lever.
        </p>
      </div>
    </div>
  );
}

function QuoteCover({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  return (
    <div
      className="relative flex h-full flex-col justify-center p-5"
      style={{ background: primary[100].hex, color: neutral[950].hex }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 top-2"
        style={{
          fontFamily: 'var(--brand-font-display, ui-serif, Georgia, serif)',
          fontSize: 110,
          lineHeight: 1,
          color: primary[300].hex,
          fontWeight: 500,
        }}
      >
        “
      </span>
      <p
        className="relative text-[18px] leading-[1.3]"
        style={{
          fontFamily: 'var(--brand-font-display, ui-serif, Georgia, serif)',
          fontWeight: 500,
        }}
      >
        Design is the silent ambassador of your brand.
      </p>
      <span
        className="relative mt-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: primary[800].hex }}
      >
        — P. Rand
      </span>
    </div>
  );
}

function PhotoCover({
  primary,
  secondary,
  neutral,
}: {
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
}) {
  return (
    <div className="relative h-full overflow-hidden">
      <SwappablePhoto
        defaultSrc={PHOTOS.womenAtLaptop}
        alternatives={PHOTO_POOLS.square}
        alt="Team at work"
        fallback={{ from: secondary[200].hex, to: primary[500].hex }}
        overlay={
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(180deg, transparent 40%, ${neutral[950].hex}cc 100%)`,
            }}
          />
        }
      />
      <div className="pointer-events-none absolute left-3 top-3">
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ background: '#ffffffcc', color: neutral[950].hex, backdropFilter: 'blur(6px)' }}
        >
          In studio
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-4 bottom-4" style={{ color: neutral[50].hex }}>
        <p className="text-[14px] font-semibold leading-tight">Behind the scenes</p>
        <p className="mt-0.5 text-[11px]" style={{ opacity: 0.85 }}>
          this week at the studio.
        </p>
      </div>
    </div>
  );
}
