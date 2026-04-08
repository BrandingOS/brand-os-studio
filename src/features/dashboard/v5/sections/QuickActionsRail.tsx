import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Layout, BookOpen, Image as ImageIcon, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brand } from '@/shared/types/brand';

interface QuickActionsRailProps {
  brands: Brand[];
  onCreateBrand: () => void;
}

export function QuickActionsRail({ brands, onCreateBrand }: QuickActionsRailProps) {
  const navigate = useNavigate();
  const lastBrand = React.useMemo(
    () =>
      [...brands].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0],
    [brands],
  );

  const actions = [
    {
      id: 'create',
      title: 'Create brand',
      subtitle: 'Start a new brand system',
      icon: Plus,
      color: 'from-primary/30 to-primary/0',
      onClick: onCreateBrand,
    },
    {
      id: 'templates',
      title: 'Browse templates',
      subtitle: 'Pick a starting point',
      icon: Layout,
      color: 'from-accent/30 to-accent/0',
      onClick: () => navigate('/dashboard/templates'),
    },
    {
      id: 'guidelines',
      title: 'Edit guidelines',
      subtitle: lastBrand ? `Update ${lastBrand.name}` : 'Open the brand book',
      icon: BookOpen,
      color: 'from-violet-500/30 to-violet-500/0',
      disabled: !lastBrand,
      onClick: () => lastBrand && navigate(`/b/${lastBrand.slug}/guidelines`),
    },
    {
      id: 'assets',
      title: 'Open assets',
      subtitle: lastBrand ? `${lastBrand.name}'s library` : 'Manage assets',
      icon: ImageIcon,
      color: 'from-emerald-500/30 to-emerald-500/0',
      disabled: !lastBrand,
      onClick: () => lastBrand && navigate(`/b/${lastBrand.slug}/assets`),
    },
  ];

  return (
    <section>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-[-0.01em] text-foreground">Quick start</h2>
          <p className="text-sm text-muted-foreground">Common ways to begin</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              type="button"
              disabled={a.disabled}
              onClick={a.onClick}
              className={cn(
                'group relative flex h-32 flex-col items-start justify-between overflow-hidden rounded-2xl border border-border bg-card p-4 text-left transition',
                'hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_18px_40px_-20px_hsl(var(--primary)/0.4)]',
                'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0',
              )}
            >
              <div className={cn('absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-60 transition group-hover:opacity-100', a.color)} />
              <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/60 backdrop-blur">
                <Icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="relative">
                <div className="text-sm font-semibold text-foreground">{a.title}</div>
                <div className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{a.subtitle}</div>
              </div>
              <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
