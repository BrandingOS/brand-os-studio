/**
 * BrandContextRail — sidebar #2 in the v3 two-rail architecture.
 *
 * Only mounted in the brand scope. It is the *contextual* navigation for the
 * currently selected brand: a brand identity header at the top, the five
 * canonical brand sections in the middle, and Brand Settings at the bottom.
 *
 *   ┌────────────────────┐
 *   │ {brand logo}       │   header card — what brand am I in?
 *   │ Brand Name         │
 *   │ Tone · audience    │
 *   ├────────────────────┤
 *   │ ◇ Overview         │
 *   │ ◇ Identity         │   the canonical 5 sections
 *   │ ◇ Assets           │   (see ARCHITECTURE.md §3)
 *   │ ◇ Guidelines       │
 *   │ ◇ Share            │
 *   ├────────────────────┤
 *   │ ◇ Brand Settings   │
 *   └────────────────────┘
 *
 * Width is 256px so the labels breathe and the brand header card has room.
 * Like AppRail, this rail is not collapsible — collapsing it would defeat the
 * "always know where you are" rule that governs the redesign.
 */
import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PenTool,
  Briefcase,
  BookOpen,
  Share2,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Brand } from '@/shared/types/brand';

interface SectionItem {
  title: string;
  description: string;
  url: string;
  icon: React.ElementType;
  exact?: boolean;
  /** Legacy/alias path prefixes that should still highlight this section. */
  matchPrefixes?: string[];
}

function buildSections(slug: string): SectionItem[] {
  return [
    {
      title: 'Overview',
      description: 'At a glance',
      url: `/dashboard/brand/${slug}`,
      icon: LayoutDashboard,
      exact: true,
    },
    {
      title: 'Identity',
      description: 'Logo, color, type, voice',
      url: `/dashboard/brand/${slug}/identity`,
      icon: PenTool,
      matchPrefixes: [
        `/dashboard/brand/${slug}/identity`,
        `/dashboard/brand/${slug}/edit`,
        `/dashboard/brand/${slug}/kit`,
        `/dashboard/brand/${slug}/brandkit`,
      ],
    },
    {
      title: 'Assets',
      description: 'Generated outputs',
      url: `/dashboard/brand/${slug}/assets`,
      icon: Briefcase,
      matchPrefixes: [
        `/dashboard/brand/${slug}/assets`,
        `/dashboard/brand/${slug}/dam`,
        `/dashboard/brand/${slug}/social-media`,
        `/dashboard/brand/${slug}/presentations`,
      ],
    },
    {
      title: 'Guidelines',
      description: 'The brand book',
      url: `/dashboard/brand/${slug}/guidelines`,
      icon: BookOpen,
      matchPrefixes: [
        `/dashboard/brand/${slug}/guidelines`,
        `/dashboard/brand/${slug}/brand-guides`,
      ],
    },
    {
      title: 'Share',
      description: 'Outbox & exports',
      url: `/dashboard/brand/${slug}/share`,
      icon: Share2,
      matchPrefixes: [
        `/dashboard/brand/${slug}/share`,
        `/dashboard/brand/${slug}/logo-presentation`,
      ],
    },
  ];
}

interface BrandContextRailProps {
  slug: string;
  brand?: Brand | null;
}

export function BrandContextRail({ slug, brand }: BrandContextRailProps) {
  const location = useLocation();
  const sections = useMemo(() => buildSections(slug), [slug]);

  const isActive = (item: SectionItem) => {
    if (item.exact) return location.pathname === item.url;
    if (location.pathname === item.url || location.pathname.startsWith(`${item.url}/`)) return true;
    return (item.matchPrefixes ?? []).some(
      (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
    );
  };

  const settingsUrl = `/dashboard/brand/${slug}/brandkit/settings`;
  const settingsActive = location.pathname === settingsUrl;

  return (
    <aside
      aria-label="Brand navigation"
      className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border/60 bg-muted/20"
    >
      {/* HEADER — brand identity card ------------------------------------- */}
      <div className="px-4 pt-5 pb-4 border-b border-border/60">
        <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-muted-foreground mb-2">
          Brand Workspace
        </p>
        <NavLink
          to={`/dashboard/brand/${slug}`}
          className="group flex items-center gap-3 -mx-1 px-1 py-1 rounded-lg hover:bg-muted/60 transition-colors"
        >
          {brand?.logo ? (
            <img
              src={brand.logo}
              alt=""
              className="h-11 w-11 rounded-lg object-contain bg-background p-1 ring-1 ring-border/60 shrink-0"
            />
          ) : (
            <div
              className="h-11 w-11 rounded-lg flex items-center justify-center text-base font-bold text-white ring-1 ring-border/60 shrink-0"
              style={{ backgroundColor: brand?.primaryColor ?? '#6366f1' }}
            >
              {(brand?.name ?? 'B').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold truncate text-foreground">
              {brand?.name ?? 'Brand'}
            </h2>
            <p className="text-[11px] text-muted-foreground truncate">
              {brand?.tone || 'Brand identity'}
            </p>
          </div>
        </NavLink>
      </div>

      {/* SECTIONS --------------------------------------------------------- */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-0.5">
        {sections.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.exact}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                active
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              )}
            >
              <Icon
                className={cn('h-[18px] w-[18px] shrink-0', active && 'text-primary')}
                strokeWidth={active ? 2.25 : 1.75}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight">{item.title}</div>
                <div
                  className={cn(
                    'text-[11px] leading-tight mt-0.5',
                    active ? 'text-muted-foreground' : 'text-muted-foreground/80',
                  )}
                >
                  {item.description}
                </div>
              </div>
            </NavLink>
          );
        })}
      </nav>

      {/* FOOT — brand settings -------------------------------------------- */}
      <div className="px-3 py-3 border-t border-border/60">
        <NavLink
          to={settingsUrl}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 transition-colors',
            settingsActive
              ? 'bg-background text-foreground ring-1 ring-border/60'
              : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
          <span className="text-sm font-medium">Brand Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
