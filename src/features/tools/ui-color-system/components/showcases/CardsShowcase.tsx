/**
 * CardsShowcase — the flagship preview, wired with real photography.
 *
 * Layout: 4 × 2 asymmetric grid.
 *   [1] photo card (primary bg)     [2] stat + bar chart
 *   [3] photo card (secondary bg)   [4] donut + legend
 *   [5] blog list                   [6] large photo card (tall)
 *   [7] 3 mini line stats (col)     [8] product card with photo
 *
 * All photos come from `PHOTOS` (Unsplash). Each photo is wrapped in
 * the `Photo` component which gracefully falls back to a palette-tinted
 * gradient if the CDN is unreachable. Cards use the cosmos radii,
 * borders, and shadow tokens via the shared `.tile` utility.
 */
import { pickOn, type ShowcaseProps } from './showcase-shared';
import { PHOTOS } from './photos';
import { Photo } from './Photo';

export function CardsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  return (
    <div className="grid gap-5 md:grid-cols-4 md:auto-rows-[minmax(0,1fr)]">
      {/* 1 — Track your expenses */}
      <PhotoCard
        bg={p[200].hex}
        photoSrc={PHOTOS.trackExpenses}
        photoAlt="Hands holding a phone"
        fallback={{ from: p[100].hex, to: p[400].hex }}
        fallbackGlyph="𖦹"
        title="Track your expenses"
        titleColor={pickOn(p[200].hex, n[50].hex, n[950].hex)}
        accent={p[300].hex}
      />

      {/* 2 — Expenses / bar chart */}
      <StatBarTile primary={p} neutral={n} />

      {/* 3 — Gain control */}
      <PhotoCard
        bg={s[400].hex}
        photoSrc={PHOTOS.vrHeadset}
        photoAlt="Person wearing a VR headset"
        fallback={{ from: s[200].hex, to: s[600].hex }}
        fallbackGlyph="◎"
        title="Gain control"
        titleColor={pickOn(s[400].hex, n[50].hex, n[950].hex)}
        accent={s[500].hex}
      />

      {/* 4 — Expenses donut */}
      <DonutTile primary={p} neutral={n} />

      {/* 5 — Blog list */}
      <BlogTile primary={p} secondary={s} neutral={n} />

      {/* 6 — Create budgets (tall) */}
      <PhotoCard
        bg={s[200].hex}
        photoSrc={PHOTOS.womenAtLaptop}
        photoAlt="Two people working at a laptop"
        fallback={{ from: s[100].hex, to: s[400].hex }}
        fallbackGlyph="✦"
        title="Create budgets"
        titleColor={pickOn(s[200].hex, n[50].hex, n[950].hex)}
        accent={s[400].hex}
        flex
      />

      {/* 7 — 3 mini line charts */}
      <div className="flex flex-col gap-4">
        <MiniLineStat
          label="Income"
          value="$15,989"
          sub="$18,871 last period"
          primary={p[500].hex}
          light={p[100].hex}
          data={[30, 40, 35, 55, 48, 62, 58]}
          neutral={n}
        />
        <MiniLineStat
          label="Expenses"
          value="$12,543"
          sub="$10,221 last period"
          primary={p[500].hex}
          light={p[100].hex}
          data={[40, 35, 50, 45, 55, 48, 52]}
          neutral={n}
        />
        <MiniLineStat
          label="Savings"
          value="$5,210"
          sub="10,221 last period"
          primary={p[500].hex}
          light={p[100].hex}
          data={[20, 30, 25, 40, 35, 28, 42]}
          neutral={n}
        />
      </div>

      {/* 8 — MacBook product card */}
      <MacBookCard primary={p} neutral={n} />
    </div>
  );
}

// ─── Tile: big photo card ─────────────────────────────────────

function PhotoCard({
  bg,
  photoSrc,
  photoAlt,
  fallback,
  fallbackGlyph,
  title,
  titleColor,
  accent,
  flex = false,
}: {
  bg: string;
  photoSrc: string;
  photoAlt: string;
  fallback: { from: string; to: string };
  fallbackGlyph?: string;
  title: string;
  titleColor: string;
  accent: string;
  flex?: boolean;
}) {
  return (
    <div
      className="tile tile--brand"
      style={{ background: bg, minHeight: 360 }}
    >
      <DecorCircles color={accent} />
      <div
        className="relative"
        style={{
          width: '100%',
          aspectRatio: flex ? undefined : '1 / 1',
          flex: flex ? 1 : undefined,
          overflow: 'hidden',
        }}
      >
        <Photo
          src={photoSrc}
          alt={photoAlt}
          fallback={fallback}
          fallbackGlyph={fallbackGlyph}
          style={{ position: 'absolute', inset: 0 }}
        />
      </div>
      <div className="relative z-10 p-5 pt-4">
        <h3
          className="text-xl font-semibold leading-tight"
          style={{ color: titleColor }}
        >
          {title}
        </h3>
      </div>
    </div>
  );
}

// ─── Tile: bar chart stat ─────────────────────────────────────

type ScaleMap = Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950, { hex: string }>;

function StatBarTile({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  const bars = [60, 80, 72, 44, 85, 90];
  const muteBars = [38, 46, 55, 26, 52, 62];
  return (
    <div
      className="tile p-5"
      style={{ background: neutral[50].hex, minHeight: 360 }}
    >
      <span className="text-[13px] font-medium" style={{ color: neutral[500].hex }}>
        Expenses
      </span>
      <span className="mt-0.5 text-2xl font-bold tracking-tight" style={{ color: neutral[900].hex }}>
        $12,543
      </span>
      <div className="mt-auto flex h-32 items-end gap-3 pt-6">
        {bars.map((h, i) => (
          <div key={i} className="relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-md"
              style={{ background: primary[500].hex, height: `${h}%` }}
            />
            <div
              className="absolute bottom-0 left-1/2 w-[45%] -translate-x-1/2 rounded-md"
              style={{ background: primary[300].hex, height: `${muteBars[i]}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]" style={{ color: neutral[400].hex }}>
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Tile: donut + legend ─────────────────────────────────────

function DonutTile({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  return (
    <div className="tile p-5" style={{ background: neutral[50].hex, minHeight: 360 }}>
      <span className="text-[13px] font-medium" style={{ color: neutral[500].hex }}>
        Expenses
      </span>
      <div className="relative mx-auto my-3 h-36 w-36">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={primary[200].hex} strokeWidth="7" />
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={primary[500].hex} strokeWidth="7" strokeDasharray="33 67" />
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={primary[400].hex} strokeWidth="7" strokeDasharray="33 67" strokeDashoffset="-33" />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center text-base font-bold"
          style={{ color: neutral[900].hex }}
        >
          $ 14,919
        </div>
      </div>
      <ul className="mt-auto flex flex-col gap-1.5 text-[12px]" style={{ color: neutral[900].hex }}>
        {[
          { c: primary[500].hex, l: 'Groceries', v: '$ 4,973' },
          { c: primary[400].hex, l: 'Household', v: '$ 4,973' },
          { c: primary[200].hex, l: 'Travel', v: '$ 4,973' },
        ].map((r) => (
          <li key={r.l} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.c }} />
            <span className="flex-1">{r.l}</span>
            <span className="font-mono tabular-nums">{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Tile: blog list ───────────────────────────────────────────

function BlogTile({ primary, secondary, neutral }: { primary: ScaleMap; secondary: ScaleMap; neutral: ScaleMap }) {
  const rows = [
    { title: 'Productivity Hacks for Life on the Road', tag: 'Work', tagBg: primary[200].hex, tagFg: primary[900].hex, photo: PHOTOS.blogProductivity, fallback: { from: primary[100].hex, to: primary[400].hex } },
    { title: 'The Ultimate Digital Nomad Toolkit', tag: 'Travel', tagBg: secondary[200].hex, tagFg: secondary[900].hex, photo: PHOTOS.blogNomad, fallback: { from: secondary[100].hex, to: secondary[400].hex } },
    { title: 'Design in Cross-Functional Teams', tag: 'Design', tagBg: primary[300].hex, tagFg: primary[900].hex, photo: PHOTOS.blogDesign, fallback: { from: primary[200].hex, to: primary[500].hex } },
  ];
  return (
    <div className="tile p-5" style={{ background: neutral[50].hex, minHeight: 360, color: neutral[900].hex }}>
      <span className="text-[13px] font-medium" style={{ color: neutral[500].hex }}>
        Blog
      </span>
      <ul className="mt-3 flex flex-col">
        {rows.map((row, i) => (
          <li key={row.title}>
            {i > 0 && <div className="h-px" style={{ background: neutral[200].hex }} />}
            <div className="flex items-center gap-3 py-3">
              <div
                className="h-10 w-10 shrink-0 overflow-hidden"
                style={{ borderRadius: 10, background: row.fallback.from }}
              >
                <Photo
                  src={row.photo}
                  alt={row.title}
                  fallback={row.fallback}
                />
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

// ─── Tile: mini line stat ─────────────────────────────────────

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
    <div
      className="tile flex-1 p-4"
      style={{ background: neutral[50].hex, color: neutral[900].hex }}
    >
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

// ─── Tile: MacBook product ─────────────────────────────────────

function MacBookCard({ primary, neutral }: { primary: ScaleMap; neutral: ScaleMap }) {
  const bg = primary[200].hex;
  const titleColor = pickOn(bg, neutral[50].hex, neutral[950].hex);
  return (
    <div className="tile tile--brand relative flex flex-col" style={{ background: bg, minHeight: 360 }}>
      <DecorCircles color={primary[300].hex} />
      <div
        className="relative flex-1"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Photo
          src={PHOTOS.macbook}
          alt="MacBook Pro on a desk"
          fallback={{ from: primary[100].hex, to: primary[400].hex }}
          style={{ position: 'absolute', inset: 0 }}
        />
      </div>
      <div className="relative z-10 flex flex-col gap-3 p-5 pt-4" style={{ color: titleColor }}>
        <h3 className="text-2xl font-bold leading-tight">MacBook Pro 14 inch</h3>
        <button
          type="button"
          className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
          style={{ background: neutral[950].hex, color: neutral[50].hex }}
        >
          Shop now
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
