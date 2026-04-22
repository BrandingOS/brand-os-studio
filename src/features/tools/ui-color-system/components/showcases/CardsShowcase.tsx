/**
 * CardsShowcase — the flagship preview.
 *
 * Asymmetric grid of eight tiles that together exercise every role the
 * palette defines: brand photo cards, chart surfaces, list tiles, and a
 * product card. Every color on screen comes from the palette —
 * swapping the seed visibly changes the whole board without re-laying.
 *
 * When a secondary scale is present, tiles 3, 6 and 8 shift onto the
 * secondary so the user can see both brands side by side.
 */
import { pickOn, type ShowcaseProps } from './showcase-shared';
import {
  PhoneInHands,
  VRHeadset,
  TwoPeopleAtLaptop,
  MacBookArt,
} from './svg-art';

export function CardsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  const card1Bg = p[200].hex;
  const card1Fg = pickOn(card1Bg, n[50].hex, n[950].hex);
  const card3Bg = s[400].hex;
  const card3Fg = pickOn(card3Bg, n[50].hex, n[950].hex);
  const card6Bg = s[200].hex;
  const card6Fg = pickOn(card6Bg, n[50].hex, n[950].hex);
  const card10Bg = p[200].hex;
  const card10Fg = pickOn(card10Bg, n[50].hex, n[950].hex);

  return (
    <div className="grid gap-4 md:grid-cols-4 md:grid-rows-2">
      {/* 1 — Track your expenses */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl p-4"
        style={{ background: card1Bg, color: card1Fg, minHeight: 360 }}
      >
        <DecorCircles color={p[300].hex} />
        <div className="relative -mx-4 -mt-4 mb-3 aspect-square overflow-hidden rounded-t-2xl">
          <PhoneInHands
            light={p[100].hex}
            mid={p[400].hex}
            deep={p[700].hex}
            className="h-full w-full"
          />
        </div>
        <div className="relative mt-auto">
          <h3 className="text-xl font-semibold leading-tight">Track your expenses</h3>
        </div>
      </div>

      {/* 2 — Expenses bar chart */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl p-4"
        style={{ background: n[50].hex, color: n[900].hex, minHeight: 360 }}
      >
        <span className="text-[13px] font-medium" style={{ color: n[500].hex }}>
          Expenses
        </span>
        <span className="mt-0.5 text-2xl font-bold tracking-tight">$12,543</span>
        <BarChartMini
          primary={p[500].hex}
          muted={p[300].hex}
          className="mt-auto"
        />
        <MonthLabels muted={n[400].hex} />
      </div>

      {/* 3 — Gain control VR */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl p-4"
        style={{ background: card3Bg, color: card3Fg, minHeight: 360 }}
      >
        <DecorCircles color={s[500].hex} />
        <div className="relative -mx-4 -mt-4 mb-3 aspect-square overflow-hidden rounded-t-2xl">
          <VRHeadset
            light={s[100].hex}
            mid={s[400].hex}
            deep={s[700].hex}
            className="h-full w-full"
          />
        </div>
        <div className="relative mt-auto">
          <h3 className="text-xl font-semibold leading-tight">Gain control</h3>
        </div>
      </div>

      {/* 4 — Donut chart */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl p-4"
        style={{ background: n[50].hex, color: n[900].hex, minHeight: 360 }}
      >
        <span className="text-[13px] font-medium" style={{ color: n[500].hex }}>
          Expenses
        </span>
        <DonutChart
          primary={p[500].hex}
          mid={p[400].hex}
          muted={p[200].hex}
          centerLabel="$ 14,919"
          centerColor={n[900].hex}
        />
        <ul className="mt-auto flex flex-col gap-1 text-[12px]">
          <LegendRow color={p[500].hex} label="Groceries" value="$ 4,973" fg={n[900].hex} />
          <LegendRow color={p[400].hex} label="Household" value="$ 4,973" fg={n[900].hex} />
          <LegendRow color={p[200].hex} label="Travel" value="$ 4,973" fg={n[900].hex} />
        </ul>
      </div>

      {/* 5 — Blog list */}
      <div
        className="relative flex flex-col gap-2 overflow-hidden rounded-2xl p-4"
        style={{ background: n[50].hex, color: n[900].hex, minHeight: 360 }}
      >
        <span className="text-[13px] font-medium" style={{ color: n[500].hex }}>
          Blog
        </span>
        <BlogRow
          title="Productivity Hacks for Life on the Road"
          tag="Work"
          tagBg={p[200].hex}
          tagFg={pickOn(p[200].hex, n[50].hex, n[900].hex)}
          thumbColors={{ light: p[100].hex, mid: p[300].hex, deep: p[600].hex }}
        />
        <div className="h-px" style={{ background: n[200].hex }} />
        <BlogRow
          title="The Ultimate Digital Nomad Toolkit"
          tag="Travel"
          tagBg={s[200].hex}
          tagFg={pickOn(s[200].hex, n[50].hex, n[900].hex)}
          thumbColors={{ light: s[100].hex, mid: s[300].hex, deep: s[600].hex }}
        />
        <div className="h-px" style={{ background: n[200].hex }} />
        <BlogRow
          title="Design in Cross-Functional Teams"
          tag="Design"
          tagBg={p[300].hex}
          tagFg={pickOn(p[300].hex, n[50].hex, n[900].hex)}
          thumbColors={{ light: p[100].hex, mid: p[400].hex, deep: p[700].hex }}
        />
      </div>

      {/* 6 — Create budgets (large photo card) */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl p-4 md:row-span-1"
        style={{ background: card6Bg, color: card6Fg, minHeight: 360 }}
      >
        <DecorCircles color={s[400].hex} />
        <div className="relative -mx-4 -mt-4 mb-3 flex-1 overflow-hidden rounded-t-2xl">
          <TwoPeopleAtLaptop
            light={s[100].hex}
            mid={s[300].hex}
            deep={s[600].hex}
            className="h-full w-full object-cover"
          />
        </div>
        <div className="relative">
          <h3 className="text-xl font-semibold leading-tight">Create budgets</h3>
        </div>
      </div>

      {/* 7 — 3 mini line charts stacked */}
      <div className="flex flex-col gap-3">
        <MiniLineStat
          label="Income"
          value="$15,989"
          sub="$18,871 last period"
          primary={p[500].hex}
          light={p[100].hex}
          bg={n[50].hex}
          fg={n[900].hex}
          muted={n[500].hex}
          data={[30, 40, 35, 55, 48, 62, 58]}
        />
        <MiniLineStat
          label="Expenses"
          value="$12,543"
          sub="$10,221 last period"
          primary={p[500].hex}
          light={p[100].hex}
          bg={n[50].hex}
          fg={n[900].hex}
          muted={n[500].hex}
          data={[40, 35, 50, 45, 55, 48, 52]}
        />
        <MiniLineStat
          label="Savings"
          value="$5,210"
          sub="10,221 last period"
          primary={p[500].hex}
          light={p[100].hex}
          bg={n[50].hex}
          fg={n[900].hex}
          muted={n[500].hex}
          data={[20, 30, 25, 40, 35, 28, 42]}
        />
      </div>

      {/* 8 — MacBook product card */}
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl p-4"
        style={{ background: card10Bg, color: card10Fg, minHeight: 360 }}
      >
        <DecorCircles color={p[300].hex} />
        <div className="relative flex flex-1 items-center justify-center py-4">
          <MacBookArt
            light={card10Bg}
            mid={p[400].hex}
            deep={p[700].hex}
            className="h-auto w-full"
          />
        </div>
        <div className="relative mt-auto flex flex-col gap-3">
          <h3 className="text-2xl font-bold leading-tight">MacBook Pro 14 inch</h3>
          <button
            type="button"
            className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: n[950].hex, color: n[50].hex }}
          >
            Shop now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Decorative helpers ───────────────────────────────────────

function DecorCircles({ color }: { color: string }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -bottom-6 -right-6 h-40 w-40 opacity-40"
      viewBox="0 0 100 100"
    >
      <circle cx="50" cy="50" r="50" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="50" cy="50" r="30" fill="none" stroke={color} strokeWidth="1" />
      <circle cx="50" cy="50" r="20" fill="none" stroke={color} strokeWidth="1" />
    </svg>
  );
}

function BarChartMini({
  primary,
  muted,
  className,
}: {
  primary: string;
  muted: string;
  className?: string;
}) {
  const bars = [
    [60, 40],
    [80, 45],
    [75, 55],
    [40, 25],
    [85, 50],
    [90, 60],
  ];
  return (
    <div className={`flex h-28 items-end gap-2 ${className ?? ''}`}>
      {bars.map(([h1, h2], i) => (
        <div key={i} className="relative flex h-full flex-1 flex-col justify-end">
          <div
            className="w-full rounded-sm"
            style={{ background: primary, height: `${h1}%` }}
          />
          <div
            className="absolute bottom-0 left-1/2 w-[40%] -translate-x-1/2 rounded-sm"
            style={{ background: muted, height: `${h2}%` }}
          />
        </div>
      ))}
    </div>
  );
}

function MonthLabels({ muted }: { muted: string }) {
  return (
    <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: muted }}>
      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m) => (
        <span key={m}>{m}</span>
      ))}
    </div>
  );
}

function DonutChart({
  primary,
  mid,
  muted,
  centerLabel,
  centerColor,
}: {
  primary: string;
  mid: string;
  muted: string;
  centerLabel: string;
  centerColor: string;
}) {
  return (
    <div className="relative mx-auto my-2 h-36 w-36">
      <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
        <circle cx="21" cy="21" r="15.915" fill="none" stroke={muted} strokeWidth="7" />
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="none"
          stroke={primary}
          strokeWidth="7"
          strokeDasharray="33 67"
          strokeDashoffset="0"
        />
        <circle
          cx="21"
          cy="21"
          r="15.915"
          fill="none"
          stroke={mid}
          strokeWidth="7"
          strokeDasharray="33 67"
          strokeDashoffset="-33"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center text-base font-bold"
        style={{ color: centerColor }}
      >
        {centerLabel}
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
  fg,
}: {
  color: string;
  label: string;
  value: string;
  fg: string;
}) {
  return (
    <li className="flex items-center gap-2" style={{ color: fg }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
      <span className="flex-1">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </li>
  );
}

function BlogRow({
  title,
  tag,
  tagBg,
  tagFg,
  thumbColors,
}: {
  title: string;
  tag: string;
  tagBg: string;
  tagFg: string;
  thumbColors: { light: string; mid: string; deep: string };
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="h-10 w-10 shrink-0 overflow-hidden rounded-md"
        style={{ background: thumbColors.light }}
      >
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
          <circle cx="20" cy="16" r="8" fill={thumbColors.mid} />
          <path d="M6 40 Q 20 28 34 40 Z" fill={thumbColors.deep} />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-snug">{title}</p>
        <span
          className="mt-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ background: tagBg, color: tagFg }}
        >
          {tag}
        </span>
      </div>
    </div>
  );
}

function MiniLineStat({
  label,
  value,
  sub,
  primary,
  light,
  bg,
  fg,
  muted,
  data,
}: {
  label: string;
  value: string;
  sub: string;
  primary: string;
  light: string;
  bg: string;
  fg: string;
  muted: string;
  data: number[];
}) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 60 - 20}`)
    .join(' ');
  const areaPath = `M0,100 L${points.split(' ').join(' L')} L100,100 Z`;
  return (
    <div className="flex flex-1 flex-col rounded-2xl p-3" style={{ background: bg, color: fg }}>
      <span className="text-[11px] font-medium" style={{ color: muted }}>
        {label}
      </span>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="text-lg font-bold">{value}</div>
          <div className="text-[10px]" style={{ color: muted }}>
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
