/**
 * Marketplace — integrations & extensions hub.
 *
 * Mounted at /marketplace. Lists available + planned integrations as cards.
 * Click a card to open a stub install panel.
 *
 * v5 PRD Phase 11.
 */
import * as React from 'react';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import {
  Figma,
  Slack,
  Zap,
  Webhook,
  Key,
  Code2,
  Box,
  PaintBucket,
  Send,
  Database,
  Layers,
  X,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  category: 'design' | 'communication' | 'automation' | 'developer' | 'storage';
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  short: string;
  long: string;
  status: 'available' | 'coming-soon' | 'beta';
  permissions: string[];
}

const INTEGRATIONS: Integration[] = [
  {
    id: 'figma',
    name: 'Figma',
    category: 'design',
    icon: Figma,
    color: 'from-pink-500/30 to-purple-500/30',
    short: 'Sync brand tokens to your Figma libraries.',
    long: 'Push BrandOS colors, typography, and components to Figma as a managed library. Refresh anytime; designers get the latest tokens automatically.',
    status: 'available',
    permissions: ['Read brand tokens', 'Write to Figma library'],
  },
  {
    id: 'adobe-cc',
    name: 'Adobe Creative Cloud',
    category: 'design',
    icon: PaintBucket,
    color: 'from-red-500/30 to-orange-500/30',
    short: 'Brand assets in Photoshop, Illustrator, InDesign.',
    long: 'CC Library connector that surfaces logos, colors, and templates inside Adobe apps. Versioned, governed, and always-current.',
    status: 'beta',
    permissions: ['Read brand assets', 'Read brand colors'],
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    icon: Slack,
    color: 'from-violet-500/30 to-fuchsia-500/30',
    short: 'Notifications, approvals, and search in Slack.',
    long: 'Get pinged when assets change. Approve guideline edits from a thread. Find brand assets with /brandos in any channel.',
    status: 'available',
    permissions: ['Send messages', 'Receive interaction events'],
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'communication',
    icon: Box,
    color: 'from-slate-500/30 to-zinc-500/30',
    short: 'Embed brand portals as Notion blocks.',
    long: 'Drop a BrandOS embed into any Notion page. Always shows the latest version of your guidelines.',
    status: 'coming-soon',
    permissions: ['Embed external content'],
  },
  {
    id: 'zapier',
    name: 'Zapier',
    category: 'automation',
    icon: Zap,
    color: 'from-amber-500/30 to-yellow-500/30',
    short: 'Connect BrandOS to 6,000+ apps.',
    long: 'Triggers for new brands, asset uploads, and approvals. Actions to create assets, push notifications, and update metadata.',
    status: 'available',
    permissions: ['Trigger workflows', 'Receive webhooks'],
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    category: 'automation',
    icon: Webhook,
    color: 'from-indigo-500/30 to-blue-500/30',
    short: 'Get an HTTP POST when anything changes.',
    long: 'Subscribe to events: brand.created, brand.updated, asset.uploaded, guideline.published, comment.created. JSON payload, signed.',
    status: 'available',
    permissions: ['Send HTTP requests to your endpoints'],
  },
  {
    id: 'api-keys',
    name: 'API & Keys',
    category: 'developer',
    icon: Key,
    color: 'from-emerald-500/30 to-teal-500/30',
    short: 'Programmatic access to brands, assets, guidelines.',
    long: 'Personal access tokens, service accounts, scoped keys. REST and GraphQL endpoints. Full read/write API.',
    status: 'beta',
    permissions: ['Read all brands', 'Write all brands', 'Manage members'],
  },
  {
    id: 'sdk',
    name: 'Brand SDK',
    category: 'developer',
    icon: Code2,
    color: 'from-cyan-500/30 to-sky-500/30',
    short: 'TypeScript SDK for embedding brand surfaces.',
    long: 'npm install @brandos/sdk — embed brand portals, fetch tokens at build time, hot-reload guidelines in your app.',
    status: 'coming-soon',
    permissions: ['Read public brand data'],
  },
  {
    id: 'transfer',
    name: 'Bulk transfer',
    category: 'storage',
    icon: Send,
    color: 'from-rose-500/30 to-pink-500/30',
    short: 'Send a brand kit via secure link.',
    long: 'WeTransfer-style: package any brand into a one-click download for clients. Expiration, password, watermarks.',
    status: 'available',
    permissions: ['Generate signed download links'],
  },
  {
    id: 's3',
    name: 'Custom storage (S3)',
    category: 'storage',
    icon: Database,
    color: 'from-orange-500/30 to-red-500/30',
    short: 'Bring your own S3 bucket.',
    long: 'Store assets in your own S3 (or compatible) bucket. BrandOS handles the index; storage stays under your control.',
    status: 'coming-soon',
    permissions: ['Upload to your bucket', 'Read your bucket'],
  },
  {
    id: 'design-system',
    name: 'Design system bridge',
    category: 'developer',
    icon: Layers,
    color: 'from-purple-500/30 to-violet-500/30',
    short: 'Sync to a design system repo (Tailwind, CSS vars).',
    long: 'Generate Tailwind config, CSS variables, or Style Dictionary tokens from BrandOS. Commit on every change.',
    status: 'beta',
    permissions: ['Push to a Git repo'],
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'design', label: 'Design' },
  { id: 'communication', label: 'Communication' },
  { id: 'automation', label: 'Automation' },
  { id: 'developer', label: 'Developer' },
  { id: 'storage', label: 'Storage' },
] as const;

export default function MarketplacePage() {
  const [activeCat, setActiveCat] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');
  const [active, setActive] = React.useState<Integration | null>(null);

  const filtered = React.useMemo(() => {
    let list = INTEGRATIONS;
    if (activeCat !== 'all') list = list.filter((i) => i.category === activeCat);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.short.toLowerCase().includes(q));
    }
    return list;
  }, [activeCat, search]);

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Marketplace"
        title="Integrations & extensions"
        subtitle="Connect BrandOS to your stack — design tools, comms, automation, developer APIs."
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="-mx-1 flex flex-wrap items-center gap-1">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveCat(c.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                activeCat === c.id
                  ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => setActive(it)}
              className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.4)]"
            >
              <div className={cn('pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 transition group-hover:opacity-100', it.color)} />
              <div className="relative flex items-start justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background">
                  <Icon className="h-5 w-5 text-foreground" />
                </span>
                <StatusBadge status={it.status} />
              </div>
              <div className="relative mt-4 flex-1">
                <h3 className="text-base font-semibold text-foreground">{it.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{it.short}</p>
              </div>
              <div className="relative mt-4 flex items-center justify-between border-t border-border pt-3 text-[11px]">
                <span className="capitalize text-muted-foreground">{it.category}</span>
                <span className="font-medium text-foreground">View →</span>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/30 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">No integrations match your filters.</p>
        </div>
      )}

      {active && <InstallPanel integration={active} onClose={() => setActive(null)} />}
    </DashboardLayout>
  );
}

function StatusBadge({ status }: { status: Integration['status'] }) {
  if (status === 'available') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Available
      </span>
    );
  }
  if (status === 'beta') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <Sparkles className="h-2.5 w-2.5" />
        Beta
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
      <Clock className="h-2.5 w-2.5" />
      Coming soon
    </span>
  );
}

function InstallPanel({ integration, onClose }: { integration: Integration; onClose: () => void }) {
  const Icon = integration.icon;
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 p-4 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('relative h-32 w-full bg-gradient-to-br', integration.color)}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md bg-background/40 p-1.5 text-foreground backdrop-blur hover:bg-background/60"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-0 left-6 translate-y-1/2 transform">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-2xl">
              <Icon className="h-7 w-7 text-foreground" />
            </span>
          </div>
        </div>

        <div className="px-6 pb-6 pt-12">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground">{integration.name}</h3>
              <p className="mt-0.5 text-xs capitalize text-muted-foreground">{integration.category}</p>
            </div>
            <StatusBadge status={integration.status} />
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{integration.long}</p>

          <div className="mt-5">
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Permissions requested
            </h4>
            <ul className="space-y-1 text-xs text-foreground">
              {integration.permissions.map((p) => (
                <li key={p} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                  {p}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              type="button"
              disabled={integration.status === 'coming-soon'}
              className="flex-1 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {integration.status === 'coming-soon' ? 'Coming soon' : `Install ${integration.name}`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border bg-card px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
