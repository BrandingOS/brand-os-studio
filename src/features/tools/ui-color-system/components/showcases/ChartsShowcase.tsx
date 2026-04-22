/**
 * ChartsShowcase — donut, bars, line, area, radial. Every chart uses
 * primary + secondary (if present) as its two main series.
 */
import { pickOn, type ShowcaseProps } from './showcase-shared';

export function ChartsShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChartCard title="Monthly revenue" subtitle="Q2 2026" bg={n[50].hex} fg={n[900].hex} muted={n[500].hex} border={n[200].hex}>
        <BarGroup primary={p[500].hex} secondary={s[500].hex} muted={n[100].hex} />
      </ChartCard>
      <ChartCard title="Active users" subtitle="Last 30 days" bg={n[50].hex} fg={n[900].hex} muted={n[500].hex} border={n[200].hex}>
        <AreaLine primary={p[500].hex} primaryLight={p[100].hex} secondary={s[500].hex} secondaryLight={s[100].hex} muted={n[200].hex} />
      </ChartCard>
      <ChartCard title="Traffic sources" subtitle="Organic vs paid" bg={n[50].hex} fg={n[900].hex} muted={n[500].hex} border={n[200].hex}>
        <DonutSplit primary={p[500].hex} secondary={s[500].hex} tertiary={p[300].hex} quaternary={n[200].hex} fg={n[900].hex} />
      </ChartCard>
      <ChartCard title="Goal progress" subtitle="Shipping this quarter" bg={n[50].hex} fg={n[900].hex} muted={n[500].hex} border={n[200].hex}>
        <RadialList primary={p[500].hex} secondary={s[500].hex} muted={n[200].hex} fg={n[900].hex} />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  bg,
  fg,
  muted,
  border,
  children,
}: {
  title: string;
  subtitle: string;
  bg: string;
  fg: string;
  muted: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-5" style={{ background: bg, borderColor: border, color: fg }}>
      <div>
        <p className="text-[11px] font-medium" style={{ color: muted }}>{subtitle}</p>
        <h3 className="text-base font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function BarGroup({ primary, secondary, muted }: { primary: string; secondary: string; muted: string }) {
  const data = [
    [60, 40],
    [75, 55],
    [52, 38],
    [82, 48],
    [94, 66],
    [70, 62],
  ];
  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((row, i) => (
        <div key={i} className="flex flex-1 items-end gap-1">
          <div className="relative w-full">
            <div className="w-full rounded-t-sm" style={{ background: muted, height: 100 }} />
          </div>
          <div className="flex w-full items-end gap-0.5">
            <div className="flex-1 rounded-t-sm" style={{ background: primary, height: `${row[0]}%` }} />
            <div className="flex-1 rounded-t-sm" style={{ background: secondary, height: `${row[1]}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function AreaLine({
  primary,
  primaryLight,
  secondary,
  secondaryLight,
  muted,
}: {
  primary: string;
  primaryLight: string;
  secondary: string;
  secondaryLight: string;
  muted: string;
}) {
  const d1 = [10, 18, 22, 32, 28, 44, 40, 55, 50, 62, 58, 68];
  const d2 = [6, 12, 18, 20, 30, 26, 36, 38, 44, 50, 48, 55];
  const pts = (arr: number[]) => arr.map((v, i) => `${(i / (arr.length - 1)) * 100},${100 - v}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full">
      <defs>
        <linearGradient id="a1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={primaryLight} stopOpacity="0.8" />
          <stop offset="100%" stopColor={primaryLight} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="a2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={secondaryLight} stopOpacity="0.6" />
          <stop offset="100%" stopColor={secondaryLight} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke={muted} strokeWidth="0.3" />
      ))}
      <polygon points={`0,100 ${pts(d1)} 100,100`} fill="url(#a1)" />
      <polyline points={pts(d1)} fill="none" stroke={primary} strokeWidth="1.3" />
      <polygon points={`0,100 ${pts(d2)} 100,100`} fill="url(#a2)" />
      <polyline points={pts(d2)} fill="none" stroke={secondary} strokeWidth="1.3" strokeDasharray="2 1" />
    </svg>
  );
}

function DonutSplit({
  primary,
  secondary,
  tertiary,
  quaternary,
  fg,
}: {
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
  fg: string;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr] items-center gap-3">
      <div className="relative mx-auto h-36 w-36">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90">
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={quaternary} strokeWidth="7" />
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={primary} strokeWidth="7" strokeDasharray="45 55" strokeDashoffset="0" />
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={secondary} strokeWidth="7" strokeDasharray="30 70" strokeDashoffset="-45" />
          <circle cx="21" cy="21" r="15.915" fill="none" stroke={tertiary} strokeWidth="7" strokeDasharray="15 85" strokeDashoffset="-75" />
        </svg>
      </div>
      <ul className="flex flex-col gap-1.5 text-[12px]" style={{ color: fg }}>
        {[
          { c: primary, l: 'Organic search', v: '45%' },
          { c: secondary, l: 'Paid social', v: '30%' },
          { c: tertiary, l: 'Direct', v: '15%' },
          { c: quaternary, l: 'Email', v: '10%' },
        ].map((r) => (
          <li key={r.l} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: r.c }} />
            <span className="flex-1">{r.l}</span>
            <span className="font-mono">{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RadialList({
  primary,
  secondary,
  muted,
  fg,
}: {
  primary: string;
  secondary: string;
  muted: string;
  fg: string;
}) {
  const goals = [
    { label: 'Brand book v2', value: 82, color: primary },
    { label: 'Onboarding flow', value: 64, color: secondary },
    { label: 'Tools marketplace', value: 40, color: primary },
    { label: 'Public share API', value: 20, color: secondary },
  ];
  return (
    <ul className="flex flex-col gap-2.5 text-[12px]" style={{ color: fg }}>
      {goals.map((g) => (
        <li key={g.label}>
          <div className="flex items-center justify-between">
            <span>{g.label}</span>
            <span className="font-mono">{g.value}%</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full" style={{ background: muted }}>
            <div className="h-full rounded-full" style={{ background: g.color, width: `${g.value}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
