/**
 * Analytics — per-brand analytics dashboard.
 *
 * Mounted at /b/:slug/analytics. Computes signal-rich metrics from the
 * existing brand state (no telemetry pipeline yet). Mock series for the
 * trends visualizations until a real backend lands.
 *
 * v5 PRD Phase 10. Uses recharts (already in package.json).
 */
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Eye, Download, Search, Users, Image as ImageIcon, FileText, TrendingUp, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug } = useBrandStore();

  React.useEffect(() => {
    if (slug) loadBySlug(slug);
  }, [slug, loadBySlug]);

  const brand = current;

  const metrics = React.useMemo(() => computeMetrics(brand), [brand]);

  if (!brand) {
    return (
      <BrandLayout>
        <div className="p-8 text-sm text-muted-foreground">Loading…</div>
      </BrandLayout>
    );
  }

  return (
    <BrandLayout maxWidth="7xl">
      <PageHeader
        eyebrow="Analytics"
        title="Brand performance"
        subtitle={`How ${brand.name}'s assets and guidelines are being used.`}
      />

      <div className="space-y-8">
        {/* Top metric cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Brand completeness"
            value={`${metrics.completeness}%`}
            icon={TrendingUp}
            accent="from-primary/30 to-primary/0"
            sub={metrics.completeness >= 80 ? 'Looking great' : 'Room to grow'}
          />
          <MetricCard
            label="Asset views (30d)"
            value={metrics.viewCount.toLocaleString()}
            icon={Eye}
            accent="from-emerald-500/30 to-emerald-500/0"
            sub={`+${metrics.viewGrowth}% vs last 30d`}
          />
          <MetricCard
            label="Downloads (30d)"
            value={metrics.downloadCount.toLocaleString()}
            icon={Download}
            accent="from-violet-500/30 to-violet-500/0"
            sub="Top: brand kit zip"
          />
          <MetricCard
            label="Active members"
            value={metrics.activeMembers.toString()}
            icon={Users}
            accent="from-amber-500/30 to-amber-500/0"
            sub={`of ${metrics.totalMembers} total`}
          />
        </div>

        {/* Trend chart */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Asset views</h2>
              <p className="text-[11px] text-muted-foreground">Last 30 days · all assets</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              +{metrics.viewGrowth}%
            </span>
          </header>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.viewSeries}>
                <defs>
                  <linearGradient id="grad-views" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#grad-views)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Asset breakdown */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Assets by category</h2>
            <div className="flex items-center gap-6">
              <div className="h-40 w-40 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={metrics.categoryBreakdown}
                      dataKey="count"
                      nameKey="category"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={2}
                    >
                      {metrics.categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-2 text-xs">
                {metrics.categoryBreakdown.map((c, i) => (
                  <li key={c.category} className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="flex-1 capitalize text-foreground">{c.category}</span>
                    <span className="text-muted-foreground">{c.count}</span>
                  </li>
                ))}
                {metrics.categoryBreakdown.length === 0 && <li className="text-muted-foreground">No assets yet</li>}
              </ul>
            </div>
          </section>

          {/* Top searches */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2">
              <Search className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Top searches (30d)</h2>
            </header>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.topSearches} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="term"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* Completeness checklist */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Brand completeness</h2>
            </div>
            <span className="text-xs text-muted-foreground">{metrics.completeness}% complete</span>
          </header>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
              style={{ width: `${metrics.completeness}%` }}
            />
          </div>
          <ul className="grid gap-2 md:grid-cols-2">
            {metrics.checklist.map((item) => (
              <li
                key={item.label}
                className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs"
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full ${
                    item.done ? 'bg-emerald-500/20 text-emerald-400' : 'border border-border text-muted-foreground'
                  }`}
                >
                  {item.done ? '✓' : '·'}
                </span>
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </BrandLayout>
  );
}

const CHART_COLORS = ['hsl(var(--primary))', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function MetricCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  sub?: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl ${accent}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold text-foreground">{value}</div>
          {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background">
          <Icon className="h-4 w-4 text-foreground" />
        </span>
      </div>
    </div>
  );
}

function computeMetrics(brand: ReturnType<typeof useBrandStore.getState>['current']) {
  if (!brand) {
    return {
      completeness: 0,
      viewCount: 0,
      viewGrowth: 0,
      downloadCount: 0,
      activeMembers: 0,
      totalMembers: 0,
      viewSeries: [],
      categoryBreakdown: [],
      topSearches: [],
      checklist: [],
    };
  }

  const checklist = [
    { label: 'Logo uploaded', done: !!(brand.logo || brand.logoAssets?.full) },
    { label: 'Primary color set', done: !!brand.primaryColor },
    { label: 'Secondary color set', done: !!brand.secondaryColor },
    { label: 'Tone defined', done: !!brand.tone && brand.tone.length > 3 },
    { label: 'Audience defined', done: !!brand.audience && brand.audience.length > 3 },
    { label: 'Primary font set', done: !!brand.fonts?.primary },
    { label: 'At least 3 assets', done: (brand.assets?.length ?? 0) >= 3 },
    { label: 'Strategy documented', done: !!brand.guidelines?.strategy?.mission },
  ];
  const completeness = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);

  const categoryBreakdown = (brand.assets ?? []).reduce<Array<{ category: string; count: number }>>((acc, a) => {
    const found = acc.find((c) => c.category === a.category);
    if (found) found.count++;
    else acc.push({ category: a.category, count: 1 });
    return acc;
  }, []);

  // Mock 30-day series — replaceable with real telemetry later.
  const seed = brand.name.length + brand.assets.length;
  const viewSeries = Array.from({ length: 30 }, (_, i) => {
    const day = `${i + 1}`;
    const base = 30 + ((seed * (i + 1)) % 25);
    const wave = Math.round(20 * Math.sin(i / 4));
    return { day, views: Math.max(0, base + wave) };
  });
  const viewCount = viewSeries.reduce((s, p) => s + p.views, 0);
  const viewGrowth = 12 + (seed % 18);

  const topSearches = [
    { term: 'logo', count: 48 + (seed % 20) },
    { term: 'color palette', count: 32 + (seed % 15) },
    { term: 'business card', count: 21 + (seed % 12) },
    { term: 'brand guide', count: 17 + (seed % 10) },
    { term: 'social', count: 14 + (seed % 8) },
  ];

  return {
    completeness,
    viewCount,
    viewGrowth,
    downloadCount: Math.round(viewCount * 0.18),
    activeMembers: 4,
    totalMembers: 12,
    viewSeries,
    categoryBreakdown,
    topSearches,
    checklist,
  };
}
