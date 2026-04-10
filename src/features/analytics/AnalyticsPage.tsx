/**
 * Analytics — per-brand dashboard with brand health scoring + WCAG analysis.
 */
import * as React from 'react';
import { useParams } from 'react-router-dom';
import { BrandLayout } from '@/features/brand/components/BrandLayout';
import { useBrandStore } from '@/shared/store/brandStore';
import { activityService } from '@/shared/services/activityService';
import { computeMetrics as compute } from './computeMetrics';
import { PageHeader } from '@/shared/ui/PageHeader';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Eye, Download, Search, TrendingUp, Activity, Shield, CheckCircle2, AlertTriangle, XCircle, Palette } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const TT = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 };

export default function AnalyticsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { current, loadBySlug } = useBrandStore();
  const [activityCount, setActivityCount] = React.useState(0);

  React.useEffect(() => { if (slug) loadBySlug(slug); }, [slug, loadBySlug]);
  React.useEffect(() => {
    if (current?.id) activityService.list({ brandId: current.id, limit: 100 }).then((e) => setActivityCount(e.length));
  }, [current?.id]);

  const m = React.useMemo(() => compute(current, activityCount), [current, activityCount]);
  if (!current) return <BrandLayout><div className="p-8 text-sm text-muted-foreground">Loading...</div></BrandLayout>;

  return (
    <BrandLayout maxWidth="7xl">
      <PageHeader eyebrow="Analytics" title="Brand performance" subtitle={`How ${current.name}'s brand is performing.`} />
      <div className="space-y-8">

        {/* Health Score Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-primary/20 to-primary/0 blur-3xl" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
              <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <circle cx="60" cy="60" r="52" fill="none" stroke={m.healthScore >= 80 ? '#10b981' : m.healthScore >= 50 ? '#f59e0b' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(m.healthScore / 100) * 327} 327`} />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="font-display text-3xl font-bold">{m.healthScore}</span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Score</span>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-1">Brand Health Score</h2>
              <p className="text-sm text-muted-foreground mb-3">
                {m.healthScore >= 80 ? 'Excellent! Your brand is well-defined and consistent.' : m.healthScore >= 50 ? 'Good progress. Fill in the gaps below.' : 'Your brand needs attention. Start with the checklist.'}
              </p>
              <div className="flex flex-wrap gap-2">
                {m.healthBreakdown.map((h) => (
                  <div key={h.label} className="flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-[11px]">
                    {h.score >= 80 ? <CheckCircle2 className="h-3 w-3 text-emerald-500" /> : h.score >= 40 ? <AlertTriangle className="h-3 w-3 text-amber-500" /> : <XCircle className="h-3 w-3 text-red-500" />}
                    <span>{h.label}</span>
                    <span className="text-muted-foreground">{h.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <MC label="Brand completeness" value={`${m.completeness}%`} icon={TrendingUp} accent="from-primary/30 to-primary/0" sub={m.completeness >= 80 ? 'Looking great' : 'Room to grow'} />
          <MC label="Asset views (30d)" value={m.viewCount.toLocaleString()} icon={Eye} accent="from-emerald-500/30 to-emerald-500/0" sub={`+${m.viewGrowth}% vs last 30d`} />
          <MC label="Downloads (30d)" value={m.downloadCount.toLocaleString()} icon={Download} accent="from-violet-500/30 to-violet-500/0" sub="Top: brand kit zip" />
          <MC label="Activity events" value={activityCount.toString()} icon={Activity} accent="from-amber-500/30 to-amber-500/0" sub="From activity log" />
        </div>

        {/* WCAG Contrast */}
        {m.contrastResults.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Color Accessibility (WCAG)</h2></header>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {m.contrastResults.map((cr, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 p-3">
                  <div className="flex gap-1">
                    <div className="h-8 w-8 rounded-md border border-border" style={{ backgroundColor: cr.fg }} />
                    <div className="h-8 w-8 rounded-md border border-border" style={{ backgroundColor: cr.bg }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{cr.label}</div>
                    <div className="text-[11px] text-muted-foreground">Ratio: {cr.ratio.toFixed(1)}:1</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cr.level === 'AAA' ? 'bg-emerald-500/10 text-emerald-500' : cr.level === 'AA' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}`}>{cr.level}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trend Chart */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-4 flex items-center justify-between">
            <div><h2 className="text-sm font-semibold">Asset views</h2><p className="text-[11px] text-muted-foreground">Last 30 days</p></div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400"><TrendingUp className="h-3 w-3" />+{m.viewGrowth}%</span>
          </header>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.viewSeries}>
                <defs><linearGradient id="gv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={TT} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gv)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Category Pie */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2"><Palette className="h-3.5 w-3.5 text-primary" /><h2 className="text-sm font-semibold">Assets by category</h2></div>
            <div className="flex items-center gap-6">
              <div className="h-40 w-40 shrink-0"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={m.categoryBreakdown} dataKey="count" nameKey="category" innerRadius={45} outerRadius={70} paddingAngle={2}>{m.categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie></PieChart></ResponsiveContainer></div>
              <ul className="flex-1 space-y-2 text-xs">
                {m.categoryBreakdown.map((c, i) => <li key={c.category} className="flex items-center gap-2"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} /><span className="flex-1 capitalize">{c.category}</span><span className="text-muted-foreground">{c.count}</span></li>)}
                {m.categoryBreakdown.length === 0 && <li className="text-muted-foreground">No assets yet</li>}
              </ul>
            </div>
          </section>
          {/* Top Searches */}
          <section className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2"><Search className="h-3.5 w-3.5 text-primary" /><h2 className="text-sm font-semibold">Top searches (30d)</h2></header>
            <div className="h-40"><ResponsiveContainer width="100%" height="100%"><BarChart data={m.topSearches} layout="vertical" margin={{ left: 60 }}><CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" horizontal={false} /><XAxis type="number" hide /><YAxis type="category" dataKey="term" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} /><Tooltip contentStyle={TT} /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
          </section>
        </div>

        {/* Checklist (12 items) */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <header className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5 text-primary" /><h2 className="text-sm font-semibold">Brand completeness</h2></div>
            <span className="text-xs text-muted-foreground">{m.completeness}% complete</span>
          </header>
          <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${m.completeness}%` }} /></div>
          <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {m.checklist.map((c) => <li key={c.label} className="flex items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2 text-xs"><span className={`flex h-5 w-5 items-center justify-center rounded-full ${c.done ? 'bg-emerald-500/20 text-emerald-400' : 'border border-border text-muted-foreground'}`}>{c.done ? '✓' : '·'}</span><span className={c.done ? 'text-foreground' : 'text-muted-foreground'}>{c.label}</span></li>)}
          </ul>
        </section>
      </div>
    </BrandLayout>
  );
}

function MC({ label, value, icon: Icon, accent, sub }: { label: string; value: string; icon: React.ComponentType<{ className?: string }>; accent: string; sub?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5">
      <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl ${accent}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-display text-3xl font-bold">{value}</div>
          {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background"><Icon className="h-4 w-4" /></span>
      </div>
    </div>
  );
}

// compute() extracted to ./computeMetrics.ts for testability
