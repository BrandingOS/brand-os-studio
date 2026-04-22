/**
 * CardsShowcase — the flagship preview.
 *
 * Grid of 8 tiles (4 × 2) with varied treatments so the brand palette
 * shows up across hero cards, charts, lists, and product tiles. Copy is
 * intentionally generic ("Growth", "Featured") so the showcase reads as
 * a neutral brand mock, not someone else's product.
 *
 * Highlights:
 *   - Duotone photo hero (Tile 1) — photo is desaturated then tinted
 *     with a brand-colored multiply layer.
 *   - Gradient-bottom photo (Tile 3) — photo shows through at the top,
 *     dissolves into a brand gradient at the bottom.
 *   - Column chart (Tile 2) rebuilt with gradient bars, baseline and
 *     a highlighted peak.
 */
import { pickOn, type ShowcaseProps } from './showcase-shared';
import { PHOTOS, PHOTO_POOLS } from './photos';
import { Photo } from './Photo';
import { SwappablePhoto } from './SwappablePhoto';

export function CardsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;
  const hasSecondary = !!secondary;

  return (
    <div className="grid gap-5 md:grid-cols-4 md:auto-rows-[minmax(0,1fr)]">
      {/* 1 — Duotone photo hero */}
      <DuotoneHero
        photoSrc={PHOTOS.trackExpenses}
        photoAlt="Hand on a surface"
        primary={p}
        title="Crafted in motion"
        tag="Studio"
      />

      {/* 2 — Column chart */}
      <ColumnChartTile primary={p} neutral={n} />

      {/* 3 — Photo with brand gradient from bottom */}
      <GradientBottomPhoto
        photoSrc={PHOTOS.vrHeadset}
        photoAlt="Hardware product on a surface"
        primary={p}
        secondary={s}
        title="Step forward"
        subtitle="A new chapter"
      />

      {/* 4 — Donut breakdown */}
      <DonutTile primary={p} secondary={s} neutral={n} hasSecondary={hasSecondary} />

      {/* 5 — Blog list */}
      <BlogTile primary={p} secondary={s} neutral={n} />

      {/* 6 — Big photo tall card */}
      <TallPhotoCard
        photoSrc={PHOTOS.womenAtLaptop}
        photoAlt="People collaborating"
        primary={s}
        neutral={n}
        title="Built together"
        tag="Teamwork"
      />

      {/* 7 — 3 mini stats */}
      <div className="flex flex-col gap-4">
        <MiniLineStat
          label="Visitors"
          value="18.2K"
          sub="+12.4% this week"
          primary={p[500].hex}
          light={p[100].hex}
          data={[30, 40, 35, 55, 48, 62, 58]}
          neutral={n}
        />
        <MiniLineStat
          label="Engagement"
          value="92.4%"
          sub="+3.1% this week"
          primary={s[500].hex}
          light={s[100].hex}
          data={[40, 35, 50, 45, 55, 48, 52]}
          neutral={n}
        />
        <MiniLineStat
          label="Growth"
          value="+24.8%"
          sub="vs. last period"
          primary={p[500].hex}
          light={p[100].hex}
          data={[20, 30, 25, 40, 35, 50, 62]}
          neutral={n}
        />
      </div>

      {/* 8 — Feature / product tile */}
      <FeatureTile primary={p} neutral={n} />
    </div>
  );
}

type ScaleMap = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, { hex: string }>;

// ─── Tile 1: duotone hero ─────────────────────────────────────

function DuotoneHero({
  photoSrc,
  photoAlt,
  primary,
  title,
  tag,
}: {
  photoSrc: string;
  photoAlt: string;
  primary: ScaleMap;
  title: string;
  tag: string;
}) {
  const onPrimary = pickOn(primary[600].hex, '#ffffff', '#0a0a0a');
  return (
    <div
      className="tile relative overflow-hidden"
      style={{ background: primary[600].hex, minHeight: 360, padding: 0 }}
    >
      {/* Photo takes the top 2/3, natural colors */}
      <div className="relative" style={{ height: '65%', overflow: 'hidden' }}>
        <SwappablePhoto
          defaultSrc={photoSrc}
          alternatives={PHOTO_POOLS.square}
          alt={photoAlt}
          fallback={{ from: primary[200].hex, to: primary[400].hex }}
        />
        {/* A small tag pill floats over the photo */}
        <span
          className="pointer-events-none absolute left-4 top-4 inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: '#ffffffcc', color: primary[900].hex, backdropFilter: 'blur(6px)' }}
        >
          {tag}
        </span>
      </div>

      {/* Brand-colored text plate at the bottom */}
      <div
        className="relative flex flex-1 flex-col justify-center p-5"
        style={{ background: primary[600].hex, color: onPrimary }}
      >
        <h3 className="text-[24px] font-bold leading-tight">{title}</h3>
        <p className="mt-1 text-[12px]" style={{ color: `${onPrimary}cc` }}>
          A signature moment in every detail.
        </p>
      </div>
    </div>
  );
}

// ─── Tile 2: column chart ─────────────────────────────────────

function ColumnChartTile({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const bars = [55, 72, 64, 38, 88, 96];
  const peak = bars.indexOf(Math.max(...bars));
  return (
    <div
      className="tile flex flex-col p-5"
      style={{ background: neutral[50].hex, minHeight: 360 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[12px] font-medium" style={{ color: neutral[500].hex }}>
            Performance
          </span>
          <div className="mt-1 text-[26px] font-bold tracking-tight" style={{ color: neutral[900].hex }}>
            24.8K
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
          style={{ background: primary[100].hex, color: primary[700].hex }}
        >
          ↑ 18.2%
        </span>
      </div>

      <div className="relative mt-auto flex h-36 items-end gap-2.5 pt-6">
        {/* baseline */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: neutral[200].hex }}
        />
        {bars.map((h, i) => {
          const isPeak = i === peak;
          return (
            <div
              key={i}
              className="flex-1 overflow-hidden rounded-t-md"
              style={{
                height: `${h}%`,
                background: isPeak
                  ? `linear-gradient(180deg, ${primary[700].hex}, ${primary[500].hex})`
                  : `linear-gradient(180deg, ${primary[300].hex}, ${primary[200].hex})`,
              }}
            />
          );
        })}
      </div>
      <div
        className="mt-2 flex items-center justify-between text-[11px]"
        style={{ color: neutral[400].hex }}
      >
        {months.map((m, i) => (
          <span
            key={m}
            style={{ color: i === peak ? neutral[700].hex : neutral[400].hex, fontWeight: i === peak ? 600 : 400 }}
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Tile 3: gradient-bottom photo ─────────────────────────────

function GradientBottomPhoto({
  photoSrc,
  photoAlt,
  primary,
  secondary,
  title,
  subtitle,
}: {
  photoSrc: string;
  photoAlt: string;
  primary: ScaleMap;
  secondary: ScaleMap;
  title: string;
  subtitle: string;
}) {
  const onGrad = pickOn(primary[700].hex, '#ffffff', '#0a0a0a');
  return (
    <div
      className="tile relative overflow-hidden"
      style={{ background: primary[700].hex, minHeight: 360 }}
    >
      <div className="absolute inset-0">
        <SwappablePhoto
          defaultSrc={photoSrc}
          alternatives={PHOTO_POOLS.square}
          alt={photoAlt}
          fallback={{ from: secondary[200].hex, to: primary[500].hex }}
          buttonTone="light"
          overlay={
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent 35%, ${primary[500].hex}cc 65%, ${primary[700].hex} 100%)`,
              }}
            />
          }
        />
      </div>
      <div
        className="pointer-events-none relative z-10 flex h-full flex-col justify-end p-5"
        style={{ minHeight: 360, color: onGrad }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] opacity-80">
          {subtitle}
        </p>
        <h3 className="mt-1 text-[26px] font-bold leading-tight">{title}</h3>
        <div className="mt-3 flex items-center gap-2 text-[12px] opacity-90">
          <span>Learn more</span>
          <span aria-hidden>→</span>
        </div>
      </div>
    </div>
  );
}

// ─── Tile 4: donut + legend ───────────────────────────────────

function DonutTile({
  primary,
  secondary,
  neutral,
  hasSecondary,
}: {
  primary: ScaleMap;
  secondary: ScaleMap;
  neutral: ScaleMap;
  hasSecondary: boolean;
}) {
  // When secondary is set we pick one segment from each scale so the
  // donut reads as a two-brand chart rather than three shades of one.
  const seg1 = primary[600];
  const seg2 = hasSecondary ? secondary[500] : primary[400];
  const seg3 = hasSecondary ? secondary[200] : primary[200];
  return (
    <div className="tile flex flex-col p-5" style={{ background: neutral[50].hex, minHeight: 360 }}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: neutral[500].hex }}>
          Overview
        </span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold"
          style={{ background: primary[100].hex, color: primary[700].hex }}
        >
          Last 30d
        </span>
      </div>

      <div className="relative mx-auto my-3 h-36 w-36">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={neutral[100].hex} strokeWidth="5" />
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={seg1.hex}
            strokeWidth="5"
            strokeDasharray="45 55"
            strokeLinecap="round"
          />
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={seg2.hex}
            strokeWidth="5"
            strokeDasharray="32 68"
            strokeDashoffset="-47"
            strokeLinecap="round"
          />
          <circle
            cx="21"
            cy="21"
            r="15.915"
            fill="none"
            stroke={seg3.hex}
            strokeWidth="5"
            strokeDasharray="23 77"
            strokeDashoffset="-81"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px]" style={{ color: neutral[500].hex }}>
            Total
          </span>
          <span className="text-[22px] font-bold leading-none" style={{ color: neutral[900].hex }}>
            14.9K
          </span>
        </div>
      </div>

      <ul className="mt-auto flex flex-col gap-1.5 text-[12px]" style={{ color: neutral[900].hex }}>
        {[
          { c: seg1.hex, l: 'Direct', v: '45%' },
          { c: seg2.hex, l: 'Search', v: '32%' },
          { c: seg3.hex, l: 'Social', v: '23%' },
        ].map((r) => (
          <li key={r.l} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.c }} />
            <span className="flex-1">{r.l}</span>
            <span className="font-mono tabular-nums text-[11px]" style={{ color: neutral[500].hex }}>
              {r.v}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Tile 5: blog list ────────────────────────────────────────

function BlogTile({ primary, secondary, neutral }: { primary: ScaleMap; secondary: ScaleMap; neutral: ScaleMap }) {
  const rows = [
    {
      title: 'Design systems that scale with teams',
      tag: 'Design',
      tagBg: primary[200].hex,
      tagFg: primary[900].hex,
      photo: PHOTOS.blogProductivity,
      fallback: { from: primary[100].hex, to: primary[400].hex },
    },
    {
      title: 'A field guide to modern work',
      tag: 'Culture',
      tagBg: secondary[200].hex,
      tagFg: secondary[900].hex,
      photo: PHOTOS.blogNomad,
      fallback: { from: secondary[100].hex, to: secondary[400].hex },
    },
    {
      title: 'Collaboration across time zones',
      tag: 'Teams',
      tagBg: primary[300].hex,
      tagFg: primary[900].hex,
      photo: PHOTOS.blogDesign,
      fallback: { from: primary[200].hex, to: primary[500].hex },
    },
  ];
  return (
    <div className="tile flex flex-col p-5" style={{ background: neutral[50].hex, minHeight: 360, color: neutral[900].hex }}>
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-medium" style={{ color: neutral[500].hex }}>
          Stories
        </span>
        <span
          className="text-[11px] font-semibold"
          style={{ color: primary[600].hex }}
        >
          View all →
        </span>
      </div>
      <ul className="mt-3 flex flex-col">
        {rows.map((row, i) => (
          <li key={row.title}>
            {i > 0 && <div className="h-px" style={{ background: neutral[200].hex }} />}
            <div className="flex items-center gap-3 py-3">
              <div
                className="h-11 w-11 shrink-0 overflow-hidden"
                style={{ borderRadius: 10, background: row.fallback.from }}
              >
                <Photo src={row.photo} alt={row.title} fallback={row.fallback} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold leading-snug">{row.title}</p>
                <span
                  className="mt-1 inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ background: row.tagBg, color: row.tagFg, borderRadius: 6 }}
                >
                  {row.tag}
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Tile 6: tall photo ───────────────────────────────────────

function TallPhotoCard({
  photoSrc,
  photoAlt,
  primary,
  neutral,
  title,
  tag,
}: {
  photoSrc: string;
  photoAlt: string;
  primary: ScaleMap;
  neutral: ScaleMap;
  title: string;
  tag: string;
}) {
  const onBrand = pickOn(primary[600].hex, neutral[50].hex, neutral[950].hex);
  return (
    <div
      className="tile relative overflow-hidden"
      style={{ background: primary[600].hex, minHeight: 360 }}
    >
      <div className="absolute inset-0">
        <SwappablePhoto
          defaultSrc={photoSrc}
          alternatives={PHOTO_POOLS.tall}
          alt={photoAlt}
          fallback={{ from: primary[200].hex, to: primary[500].hex }}
          overlay={
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: `linear-gradient(180deg, transparent 40%, ${primary[700].hex}ee 100%)`,
              }}
            />
          }
        />
      </div>
      <div className="pointer-events-none relative z-10 flex h-full flex-col justify-between p-5" style={{ minHeight: 360 }}>
        <span
          className="inline-flex w-fit items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
          style={{ background: `${onBrand}22`, color: onBrand, backdropFilter: 'blur(6px)' }}
        >
          {tag}
        </span>
        <h3 className="text-[26px] font-bold leading-tight" style={{ color: onBrand }}>
          {title}
        </h3>
      </div>
    </div>
  );
}

// ─── Tile 7: mini line stat ───────────────────────────────────

function MiniLineStat({
  label,
  value,
  sub,
  primary,
  light,
  data,
  neutral,
}: {
  label: string;
  value: string;
  sub: string;
  primary: string;
  light: string;
  data: number[];
  neutral: ScaleMap;
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 60 - 20}`)
    .join(' ');
  const areaPath = `M0,100 L${points.split(' ').join(' L')} L100,100 Z`;
  return (
    <div className="tile flex-1 p-4" style={{ background: neutral[50].hex, color: neutral[900].hex }}>
      <span className="text-[11px] font-medium" style={{ color: neutral[500].hex }}>
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold">{value}</div>
          <div className="text-[10px]" style={{ color: neutral[500].hex }}>
            {sub}
          </div>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-12 w-24">
          <defs>
            <linearGradient id={`g-${label}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={light} stopOpacity="0.9" />
              <stop offset="100%" stopColor={light} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#g-${label})`} />
          <polyline
            points={points}
            fill="none"
            stroke={primary}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

// ─── Tile 8: feature / product ────────────────────────────────

function FeatureTile({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  const bg = primary[200].hex;
  const titleColor = pickOn(bg, neutral[50].hex, neutral[950].hex);
  return (
    <div
      className="tile relative flex flex-col overflow-hidden"
      style={{ background: bg, minHeight: 360 }}
    >
      <DecorCircles color={primary[400].hex} />
      <div className="relative flex-1">
        <SwappablePhoto
          defaultSrc={PHOTOS.macbook}
          alternatives={PHOTO_POOLS.wide}
          alt="Product photograph"
          fallback={{ from: primary[100].hex, to: primary[400].hex }}
          buttonTone="light"
        />
      </div>
      <div className="relative z-10 flex flex-col gap-3 p-5 pt-4" style={{ color: titleColor }}>
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: primary[700].hex }}
          >
            Featured
          </p>
          <h3 className="mt-1 text-[22px] font-bold leading-tight">
            The essentials kit
          </h3>
        </div>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
          style={{ background: neutral[950].hex, color: neutral[50].hex }}
        >
          Explore
        </button>
      </div>
    </div>
  );
}

// ─── Decoration ───────────────────────────────────────────────

function DecorCircles({ color }: { color: string }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -bottom-8 -right-8 h-44 w-44 opacity-40"
      viewBox="0 0 100 100"
    >
      <circle cx="50" cy="50" r="50" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="0.8" />
      <circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth="0.8" />
    </svg>
  );
}
