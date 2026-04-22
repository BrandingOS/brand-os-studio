/**
 * DashboardShowcase — SaaS admin layout with sidebar, top bar, stat
 * tiles, a line chart, and a transactions table.
 *
 * Uses primary for the active-nav highlight, success/error hints for
 * the delta indicators, and secondary for the second chart series so
 * two-color palettes still read as intentional.
 */
import { Home, Users, CreditCard, Settings, Bell, ChevronRight } from 'lucide-react';
import { pickOn, type ShowcaseProps } from './showcase-shared';

export function DashboardShowcase({ palette, secondary }: ShowcaseProps) {
  const p = palette.roles.primary.shades;
  const n = palette.roles.neutral.shades;
  const s = secondary?.shades ?? p;
  const onPrimary = pickOn(p[600].hex, n[50].hex, n[950].hex);

  return (
    <div
      className="grid overflow-hidden rounded-2xl border md:grid-cols-[200px_1fr]"
      style={{ background: n[50].hex, borderColor: n[200].hex }}
    >
      {/* sidebar */}
      <aside
        className="hidden flex-col gap-4 border-r p-4 md:flex"
        style={{ background: n[100].hex, borderColor: n[200].hex }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-bold"
            style={{ background: p[600].hex, color: onPrimary }}
          >
            B
          </span>
          <span className="text-sm font-semibold" style={{ color: n[900].hex }}>
            Brandos
          </span>
        </div>
        <nav className="flex flex-col gap-1 text-[12px]">
          {[
            { label: 'Overview', icon: Home, active: true },
            { label: 'Customers', icon: Users, active: false },
            { label: 'Billing', icon: CreditCard, active: false },
            { label: 'Settings', icon: Settings, active: false },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-md px-2 py-1.5"
                style={{
                  background: item.active ? p[100].hex : 'transparent',
                  color: item.active ? p[800].hex : n[700].hex,
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </div>
            );
          })}
        </nav>
        <div
          className="mt-auto rounded-lg border p-3"
          style={{ background: n[50].hex, borderColor: n[200].hex }}
        >
          <p className="text-[11px] font-semibold" style={{ color: n[900].hex }}>
            Upgrade to Team
          </p>
          <p className="mt-1 text-[11px]" style={{ color: n[600].hex }}>
            Unlimited seats + SSO.
          </p>
          <button
            className="mt-2 w-full rounded-md py-1.5 text-[11px] font-semibold"
            style={{ background: p[600].hex, color: onPrimary }}
          >
            Upgrade
          </button>
        </div>
      </aside>

      {/* main */}
      <div className="flex flex-col">
        {/* top bar */}
        <div
          className="flex items-center justify-between gap-3 border-b px-6 py-3"
          style={{ borderColor: n[200].hex, background: n[50].hex }}
        >
          <div>
            <p className="text-[11px] font-medium" style={{ color: n[500].hex }}>
              Overview
            </p>
            <h2 className="text-base font-semibold" style={{ color: n[900].hex }}>
              Good evening, Hamza
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="relative inline-flex h-8 w-8 items-center justify-center rounded-md"
              style={{ background: n[100].hex, color: n[700].hex }}
            >
              <Bell className="h-3.5 w-3.5" />
              <span
                className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full"
                style={{ background: p[500].hex }}
              />
            </button>
            <div
              className="h-8 w-8 rounded-full"
              style={{ background: p[400].hex }}
              aria-hidden
            />
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <StatTile
            label="MRR"
            value="$48,210"
            delta="+12.4%"
            deltaColor={p[600].hex}
            bg={n[50].hex}
            border={n[200].hex}
            fg={n[900].hex}
            muted={n[500].hex}
          />
          <StatTile
            label="Active customers"
            value="1,284"
            delta="+2.1%"
            deltaColor={s[600].hex}
            bg={n[50].hex}
            border={n[200].hex}
            fg={n[900].hex}
            muted={n[500].hex}
          />
          <StatTile
            label="Churn"
            value="1.9%"
            delta="-0.3%"
            deltaColor={p[700].hex}
            bg={n[50].hex}
            border={n[200].hex}
            fg={n[900].hex}
            muted={n[500].hex}
          />
        </div>

        <div className="px-6 pb-6">
          <div
            className="flex flex-col gap-4 rounded-2xl border p-5"
            style={{ background: n[50].hex, borderColor: n[200].hex }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium" style={{ color: n[500].hex }}>
                  Revenue
                </p>
                <p className="text-lg font-semibold" style={{ color: n[900].hex }}>
                  $280,410
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1" style={{ color: n[700].hex }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: p[500].hex }} />
                  Revenue
                </span>
                <span className="flex items-center gap-1" style={{ color: n[700].hex }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: s[500].hex }} />
                  Expenses
                </span>
              </div>
            </div>
            <DualLineChart
              primary={p[500].hex}
              primaryLight={p[100].hex}
              secondary={s[500].hex}
              secondaryLight={s[100].hex}
              muted={n[200].hex}
            />
          </div>
        </div>

        <div className="px-6 pb-6">
          <div
            className="overflow-hidden rounded-2xl border"
            style={{ background: n[50].hex, borderColor: n[200].hex }}
          >
            <div
              className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 border-b px-4 py-2 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: n[500].hex, borderColor: n[200].hex }}
            >
              <span>Customer</span>
              <span>Plan</span>
              <span>MRR</span>
              <span />
            </div>
            {[
              ['Horizon Health', 'Team', '$840'],
              ['Atlas Media', 'Pro', '$320'],
              ['Cove Robotics', 'Team', '$1,240'],
            ].map((row, i) => (
              <div
                key={row[0]}
                className="grid grid-cols-[1.5fr_1fr_1fr_auto] items-center gap-3 px-4 py-3 text-[12px]"
                style={{
                  borderBottom: i < 2 ? `1px solid ${n[100].hex}` : 'none',
                  color: n[900].hex,
                }}
              >
                <span className="flex items-center gap-2">
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{ background: i === 1 ? s[300].hex : p[300].hex }}
                  />
                  <span className="font-medium">{row[0]}</span>
                </span>
                <span style={{ color: n[600].hex }}>{row[1]}</span>
                <span className="font-mono">{row[2]}</span>
                <ChevronRight className="h-3.5 w-3.5" style={{ color: n[400].hex }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  delta,
  deltaColor,
  bg,
  border,
  fg,
  muted,
}: {
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
  bg: string;
  border: string;
  fg: string;
  muted: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-2xl border p-4"
      style={{ background: bg, borderColor: border, color: fg }}
    >
      <span className="text-[11px] font-medium" style={{ color: muted }}>
        {label}
      </span>
      <span className="text-xl font-bold tracking-tight">{value}</span>
      <span className="text-[11px] font-semibold" style={{ color: deltaColor }}>
        {delta}
      </span>
    </div>
  );
}

function DualLineChart({
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
  const d1 = [20, 35, 30, 50, 42, 60, 55, 70, 62, 78, 72, 85];
  const d2 = [30, 28, 34, 40, 38, 44, 48, 46, 52, 50, 55, 58];
  const pts = (arr: number[]) =>
    arr.map((v, i) => `${(i / (arr.length - 1)) * 100},${100 - v}`).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-36 w-full">
      <defs>
        <linearGradient id="grid1" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={primaryLight} stopOpacity="0.6" />
          <stop offset="100%" stopColor={primaryLight} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="grid2" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={secondaryLight} stopOpacity="0.4" />
          <stop offset="100%" stopColor={secondaryLight} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((y) => (
        <line key={y} x1="0" x2="100" y1={y} y2={y} stroke={muted} strokeWidth="0.3" />
      ))}
      <polygon
        points={`0,100 ${pts(d1)} 100,100`}
        fill="url(#grid1)"
      />
      <polyline
        points={pts(d1)}
        fill="none"
        stroke={primary}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <polygon
        points={`0,100 ${pts(d2)} 100,100`}
        fill="url(#grid2)"
      />
      <polyline
        points={pts(d2)}
        fill="none"
        stroke={secondary}
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeDasharray="2 1.5"
      />
    </svg>
  );
}
