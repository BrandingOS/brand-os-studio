/**
 * PalettePreview — realistic UI mockups driven by the palette tokens.
 *
 * These aren't lorem-ipsum boxes. Each mock is a condensed version of
 * a real product surface so users can see whether their palette holds
 * up in production: a dashboard row, a form, a chart, a marketing
 * hero, a mobile app chrome, typography.
 *
 * Every color comes from `palette.semanticTokens` or `palette.roles`,
 * NEVER hard-coded. The parent toggles light/dark via the `theme` prop.
 */
import { useMemo } from 'react';
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Home,
  Menu,
  Search,
  Settings,
  Star,
  Users,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PaletteSystem, Theme } from '@/lib/color-engine';

export interface PalettePreviewProps {
  palette: PaletteSystem;
  theme: Theme;
}

export function PalettePreview({ palette, theme }: PalettePreviewProps) {
  const t = palette.semanticTokens;

  const style = useMemo(
    () =>
      ({
        ['--c-canvas' as string]: t.canvas,
        ['--c-surface' as string]: t.surface,
        ['--c-surface-elev' as string]: t.surfaceElevated,
        ['--c-border' as string]: t.border,
        ['--c-text' as string]: t.textPrimary,
        ['--c-text-2' as string]: t.textSecondary,
        ['--c-text-muted' as string]: t.textMuted,
        ['--c-on-primary' as string]: t.onPrimary,
        ['--c-btn-bg' as string]: t.buttonPrimaryBg,
        ['--c-btn-hover' as string]: t.buttonPrimaryHover,
        ['--c-btn-2-bg' as string]: t.buttonSecondaryBg,
        ['--c-btn-2-fg' as string]: t.buttonSecondaryFg,
        ['--c-focus' as string]: t.focusRing,
        ['--c-chart-1' as string]: t.chart1,
        ['--c-chart-2' as string]: t.chart2,
        ['--c-chart-3' as string]: t.chart3,
        ['--c-chart-4' as string]: t.chart4,
        ['--c-chart-5' as string]: t.chart5,
        ['--c-chart-6' as string]: t.chart6,
      }) as React.CSSProperties,
    [t],
  );

  return (
    <div
      className={cn('grid gap-4 lg:grid-cols-2', theme === 'dark' && 'dark')}
      style={style}
    >
      <Dashboard />
      <MarketingHero palette={palette} />
      <FormCard />
      <ChartCard />
      <MobileScreen palette={palette} />
      <TypographyCard />
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────

function Dashboard() {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border"
      style={{ background: 'var(--c-canvas)', borderColor: 'var(--c-border)' }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-3"
        style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md"
            style={{ background: 'var(--c-btn-bg)', color: 'var(--c-on-primary)' }}
          >
            <Activity className="h-4 w-4" />
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
            Control center
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md p-1.5 hover:bg-black/5"
            style={{ color: 'var(--c-text-2)' }}
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
          </button>
          <div
            className="h-7 w-7 rounded-full"
            style={{ background: 'var(--c-chart-3)' }}
            aria-hidden
          />
        </div>
      </div>

      <div
        className="grid grid-cols-3 gap-2 p-3"
        style={{ background: 'var(--c-canvas)' }}
      >
        <Stat label="MRR" value="$48,210" delta="+12.4%" icon={<CircleDollarSign className="h-3.5 w-3.5" />} />
        <Stat label="Active" value="1,284" delta="+2.1%" icon={<Users className="h-3.5 w-3.5" />} />
        <Stat label="Signup rate" value="38%" delta="+0.6%" icon={<Star className="h-3.5 w-3.5" />} />
      </div>

      <div
        className="border-t"
        style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
      >
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-muted)' }}>
              <th className="px-4 py-2 font-medium">Customer</th>
              <th className="px-4 py-2 font-medium">Plan</th>
              <th className="px-4 py-2 font-medium text-right">MRR</th>
            </tr>
          </thead>
          <tbody style={{ color: 'var(--c-text)' }}>
            {[
              ['Horizon Health', 'Team', '$840'],
              ['Atlas Media', 'Pro', '$320'],
              ['Cove Robotics', 'Team', '$1,240'],
            ].map((row) => (
              <tr key={row[0]} className="border-b" style={{ borderColor: 'var(--c-border)' }}>
                <td className="px-4 py-2 font-medium">{row[0]}</td>
                <td className="px-4 py-2" style={{ color: 'var(--c-text-2)' }}>{row[1]}</td>
                <td className="px-4 py-2 text-right font-mono">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string;
  delta: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col rounded-lg border px-3 py-2"
      style={{ background: 'var(--c-surface-elev)', borderColor: 'var(--c-border)' }}
    >
      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--c-text-muted)' }}>
        {icon}
        {label}
      </span>
      <span className="mt-1 text-base font-semibold" style={{ color: 'var(--c-text)' }}>
        {value}
      </span>
      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--c-chart-2)' }}>
        <ArrowUpRight className="h-3 w-3" />
        {delta}
      </span>
    </div>
  );
}

// ─── Marketing hero ─────────────────────────────────────────────

function MarketingHero({ palette }: { palette: PaletteSystem }) {
  return (
    <div
      className="relative flex flex-col justify-between overflow-hidden rounded-xl border p-6"
      style={{
        background: `linear-gradient(135deg, ${palette.roles.primary.shades[500].hex}, ${palette.roles.primary.shades[700].hex})`,
        borderColor: 'var(--c-border)',
        color: palette.semanticTokens.onPrimary,
      }}
    >
      <div className="flex items-center gap-2 text-xs opacity-80">
        <Star className="h-3.5 w-3.5" />
        New · Vibrant SaaS palette
      </div>
      <div>
        <h3 className="mt-4 text-xl font-semibold leading-tight sm:text-2xl">
          Design systems that feel like a real brand.
        </h3>
        <p className="mt-2 max-w-[38ch] text-sm opacity-90">
          Colors that pass accessibility, ship to production, and look like you
          didn't settle for defaults.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium"
            style={{
              background: palette.semanticTokens.onPrimary,
              color: palette.semanticTokens.buttonPrimaryBg,
            }}
          >
            Start designing
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-medium text-white/95 hover:bg-white/10">
            View docs
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form card ─────────────────────────────────────────────────

function FormCard() {
  return (
    <div
      className="flex flex-col gap-4 rounded-xl border p-5"
      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
    >
      <div>
        <h3 className="text-sm font-semibold" style={{ color: 'var(--c-text)' }}>
          Create account
        </h3>
        <p className="mt-1 text-xs" style={{ color: 'var(--c-text-muted)' }}>
          Join thousands of designers using this palette.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--c-text-muted)' }}>
          Email
        </label>
        <input
          className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2"
          style={{
            borderColor: 'var(--c-border)',
            color: 'var(--c-text)',
          }}
          placeholder="you@company.com"
          defaultValue="hamza@brandos.design"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'var(--c-text-muted)' }}>
          Password
        </label>
        <input
          className="rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
          type="password"
          style={{
            borderColor: 'var(--c-focus)',
            boxShadow: `0 0 0 2px color-mix(in srgb, var(--c-focus) 25%, transparent)`,
            color: 'var(--c-text)',
          }}
          defaultValue="••••••••"
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          className="flex flex-1 items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition"
          style={{ background: 'var(--c-btn-bg)', color: 'var(--c-on-primary)' }}
        >
          Continue
        </button>
        <button
          className="rounded-md px-3 py-2 text-sm font-medium"
          style={{ background: 'var(--c-btn-2-bg)', color: 'var(--c-btn-2-fg)' }}
        >
          Cancel
        </button>
      </div>

      <div
        className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs"
        style={{
          background: 'var(--c-surface-elev)',
          borderColor: 'var(--c-border)',
          color: 'var(--c-text-2)',
        }}
      >
        <CheckCircle2 className="h-3.5 w-3.5" style={{ color: 'var(--c-chart-2)' }} />
        Verification email sent.
      </div>
    </div>
  );
}

// ─── Chart card ─────────────────────────────────────────────────

function ChartCard() {
  const bars = [42, 58, 71, 48, 63, 86, 74];
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium" style={{ color: 'var(--c-text-muted)' }}>
            This week
          </p>
          <h3 className="text-lg font-semibold" style={{ color: 'var(--c-text)' }}>
            Revenue
          </h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]" style={{ borderColor: 'var(--c-border)', color: 'var(--c-text-2)' }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--c-chart-1)' }} />
          Primary
          <span className="mx-1 h-1.5 w-1.5 rounded-full" style={{ background: 'var(--c-chart-2)' }} />
          Growth
        </div>
      </div>

      <div className="flex h-28 items-end gap-1.5">
        {bars.map((h, i) => (
          <div key={i} className="flex flex-1 flex-col items-stretch gap-1">
            <div
              className="w-full rounded-sm"
              style={{ height: `${h}%`, background: `var(--c-chart-${(i % 6) + 1})` }}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px]" style={{ color: 'var(--c-text-muted)' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile screen ─────────────────────────────────────────────

function MobileScreen({ palette }: { palette: PaletteSystem }) {
  return (
    <div
      className="mx-auto flex max-w-[280px] flex-col overflow-hidden rounded-[22px] border shadow-lg"
      style={{
        background: 'var(--c-canvas)',
        borderColor: 'var(--c-border)',
        height: 440,
      }}
    >
      <div
        className="flex items-center justify-between px-4 pt-4 pb-2"
        style={{ background: 'var(--c-surface)', color: 'var(--c-text)' }}
      >
        <Menu className="h-4 w-4" />
        <span className="text-xs font-semibold">Brand</span>
        <Search className="h-4 w-4" />
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div
          className="rounded-xl p-3"
          style={{
            background: palette.roles.primary.shades[500].hex,
            color: palette.semanticTokens.onPrimary,
          }}
        >
          <p className="text-[10px] opacity-80">Today</p>
          <p className="text-base font-semibold">Plan your week</p>
          <p className="mt-1 text-[11px] opacity-80">
            5 scheduled · 2 overdue
          </p>
        </div>

        {['Design review', 'Sprint planning', 'Palette QA'].map((label, i) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border p-2"
            style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
          >
            <div
              className="h-7 w-7 rounded-md"
              style={{ background: `var(--c-chart-${(i % 6) + 1})` }}
            />
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: 'var(--c-text)' }}>{label}</p>
              <p className="text-[10px]" style={{ color: 'var(--c-text-muted)' }}>2 · 3pm</p>
            </div>
            <ChevronRight className="h-3.5 w-3.5" style={{ color: 'var(--c-text-muted)' }} />
          </div>
        ))}
      </div>

      <div
        className="mt-auto flex items-center justify-around border-t px-2 py-2"
        style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}
      >
        {[Home, Search, Activity, Settings].map((Icon, i) => (
          <Icon
            key={i}
            className="h-4 w-4"
            style={{ color: i === 0 ? palette.roles.primary.shades[500].hex : 'var(--c-text-muted)' }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Typography ──────────────────────────────────────────────────

function TypographyCard() {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-5"
      style={{ background: 'var(--c-surface)', borderColor: 'var(--c-border)' }}
    >
      <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--c-text)' }}>
        Built for the real thing.
      </h3>
      <p className="text-sm" style={{ color: 'var(--c-text-2)' }}>
        Use this palette in a hero, on a form, in a table, and inside a chart.
        If it reads cleanly in all four, it's ready for production.
      </p>
      <p className="text-xs" style={{ color: 'var(--c-text-muted)' }}>
        Muted annotation — captions, byline, metadata.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {['primary', 'accent', 'success', 'warning', 'error'].map((label, i) => (
          <span
            key={label}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium"
            style={{
              background: `var(--c-chart-${(i % 6) + 1})`,
              color: '#0a0a0a',
              borderColor: 'transparent',
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
