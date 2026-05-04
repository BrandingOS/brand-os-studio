/**
 * Design — launchpad for creating new work.
 *
 * Single scroll page (was: 3-tab Blank/AI/Recent layout) with the
 * sections users actually scan top-to-bottom:
 *
 *   1. Search       — filters Recent + Browse cards by name/description.
 *   2. Generate     — inline AI generator (reuses GenerateWithAiSection).
 *   3. Recent       — the brand's most recent designs (real data).
 *   4. Browse type  — Freeform / Presentation / Social / Brand Board /
 *                     Bento / Guidelines.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { useService, SERVICE_KEYS } from '@/core';
import type { IDesignStorage, DesignSummary } from '@/core/types/services';
import { useBrandKit } from '@/features/editor/brand/useBrandKit';
import { useAiAgent } from '@/features/editor/ai/useAiAgent';
import { GenerateWithAiSection } from '@/features/editor/shell/v2/panels/GenerateWithAiSection';
import {
  Search,
  Clock,
  ArrowRight,
  FileText,
  LayoutGrid,
  Presentation,
  Image as ImageIcon,
  Paintbrush,
} from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { NavigateFunction } from 'react-router-dom';

interface LaunchCard {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  path: (slug: string) => string;
}

const TYPE_LAUNCHERS: LaunchCard[] = [
  {
    title: 'Freeform canvas',
    description: 'Open the editor with a blank canvas, brand palette pre-loaded.',
    icon: Paintbrush,
    accent: 'from-fuchsia-500 to-pink-600',
    path: (slug) => `/b/${slug}/editor`,
  },
  {
    title: 'Presentation',
    description: 'Start a branded slide deck.',
    icon: Presentation,
    accent: 'from-purple-500 to-violet-600',
    path: (slug) => `/b/${slug}/presentations`,
  },
  {
    title: 'Social post',
    description: 'Pick a platform, get the right canvas size.',
    icon: ImageIcon,
    accent: 'from-teal-400 to-cyan-500',
    path: (slug) => `/b/${slug}/social-media`,
  },
  {
    title: 'Brand board',
    description: 'Snapshot of the brand on a single canvas.',
    icon: LayoutGrid,
    accent: 'from-indigo-500 to-blue-600',
    path: (slug) => `/b/${slug}/brand-board`,
  },
  {
    title: 'Bento grid',
    description: 'Visual brand showcase grid.',
    icon: LayoutGrid,
    accent: 'from-emerald-500 to-teal-600',
    path: (slug) => `/b/${slug}/bento`,
  },
  {
    title: 'Guidelines doc',
    description: 'Slide-based brand guidelines editor.',
    icon: FileText,
    accent: 'from-rose-500 to-pink-600',
    path: (slug) => `/b/${slug}/guidelines/canvas`,
  },
];

const RECENT_LIMIT = 8;

export default function DesignLaunchpadPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const brandKit = useBrandKit(brand);
  const aiAgent = useAiAgent(brandKit);

  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<DesignSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl' });

  useEffect(() => {
    if (!brand?.id) return;
    let cancelled = false;
    setRecentLoading(true);
    designStorage
      .listDesigns(brand.id)
      .then((rows) => {
        if (cancelled) return;
        const sorted = [...rows].sort((a, b) => {
          const at = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const bt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return bt - at;
        });
        setRecent(sorted);
      })
      .catch((err) => {
        console.error('[design launchpad] listDesigns failed:', err);
      })
      .finally(() => {
        if (!cancelled) setRecentLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [brand?.id, designStorage]);

  const filteredCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TYPE_LAUNCHERS;
    return TYPE_LAUNCHERS.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredRecent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const top = recent.slice(0, RECENT_LIMIT);
    if (!q) return top;
    return recent.filter((d) =>
      (d.name ?? '').toLowerCase().includes(q),
    );
  }, [recent, query]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !brand || !slug) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{error || 'Brand not found.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        compact
        title="Design"
        subtitle="Search, generate with AI, pick up where you left off, or start something new."
      />

      <SearchBar value={query} onChange={setQuery} />

      <Section title="Generate with AI">
        <GenerateWithAiSection
          agent={aiAgent}
          brand={brand}
          brandKit={brandKit ?? null}
          designStorage={designStorage}
        />
      </Section>

      <Section
        title="Recent designs"
        action={
          recent.length > RECENT_LIMIT && !query ? (
            <button
              type="button"
              onClick={() => navigate(`/b/${slug}/folders?tab=designs`)}
              className="text-xs font-medium text-primary hover:underline"
            >
              See all
            </button>
          ) : null
        }
      >
        {recentLoading ? (
          <RecentSkeleton />
        ) : filteredRecent.length === 0 ? (
          <RecentEmpty
            query={query}
            onBrowseTemplates={() => navigate(`/b/${slug}/templates`)}
          />
        ) : (
          <RecentGrid
            designs={filteredRecent}
            onOpen={(id) => navigate(`/b/${slug}/design/${id}`)}
          />
        )}
      </Section>

      <Section title="Browse by type">
        {filteredCards.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No types match "{query}".
          </p>
        ) : (
          <LaunchGrid
            cards={filteredCards}
            slug={slug}
            brand={brand}
            navigate={navigate}
          />
        )}
      </Section>
    </div>
  );
}

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative max-w-2xl">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search recent designs and types…"
        className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        data-design-search
      />
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function LaunchGrid({
  cards,
  slug,
  navigate,
}: {
  cards: LaunchCard[];
  slug: string;
  brand: Brand;
  navigate: NavigateFunction;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.title}
            onClick={() => navigate(c.path(slug))}
            className="group relative overflow-hidden p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
          >
            <div
              className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${c.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
            />
            <div
              className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${c.accent} flex items-center justify-center mb-3`}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="relative text-base font-semibold mb-1">{c.title}</h3>
            <p className="relative text-xs text-muted-foreground">{c.description}</p>
            <div className="relative mt-3 flex items-center text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Open <ArrowRight className="h-3 w-3 ml-1" />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function RecentGrid({
  designs,
  onOpen,
}: {
  designs: DesignSummary[];
  onOpen: (id: string) => void;
}) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
      data-recent-grid
    >
      {designs.map((d) => {
        const aspect =
          d.width && d.height ? `${d.width} / ${d.height}` : '4 / 3';
        return (
          <button
            key={d.id}
            type="button"
            onClick={() => onOpen(d.id)}
            className="group text-left rounded-lg overflow-hidden border bg-background hover:shadow-md transition-all hover:-translate-y-0.5"
            data-recent-card
            data-design-id={d.id}
          >
            <div
              className="bg-muted flex items-center justify-center overflow-hidden"
              style={{ aspectRatio: aspect }}
            >
              {d.thumbnailUrl ? (
                <img
                  src={d.thumbnailUrl}
                  alt={d.name ?? 'Design'}
                  className="w-full h-full object-contain"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
              )}
            </div>
            <div className="px-3 py-2">
              <p className="text-xs font-medium truncate">
                {d.name || 'Untitled design'}
              </p>
              {d.contentType ? (
                <p className="text-[10px] text-muted-foreground capitalize">
                  {d.contentType.replace(/-/g, ' ')}
                </p>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RecentSkeleton() {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg overflow-hidden border bg-background"
        >
          <div className="aspect-[4/3] bg-muted animate-pulse" />
          <div className="px-3 py-2 space-y-1">
            <div className="h-3 w-3/4 rounded bg-muted animate-pulse" />
            <div className="h-2 w-1/2 rounded bg-muted animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentEmpty({
  query,
  onBrowseTemplates,
}: {
  query: string;
  onBrowseTemplates: () => void;
}) {
  if (query) {
    return (
      <Card className="p-6 text-center bg-muted/20">
        <p className="text-xs text-muted-foreground">
          No recent designs match "{query}".
        </p>
      </Card>
    );
  }
  return (
    <Card className="p-8 text-center bg-muted/20">
      <Clock className="h-7 w-7 mx-auto text-muted-foreground/40 mb-2" />
      <p className="text-sm font-medium mb-1">No recent designs yet</p>
      <p className="text-xs text-muted-foreground mb-3">
        Designs you open will show up here.
      </p>
      <Button variant="outline" size="sm" onClick={onBrowseTemplates}>
        Browse templates
      </Button>
    </Card>
  );
}
