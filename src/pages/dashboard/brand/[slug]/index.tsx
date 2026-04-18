/**
 * BrandHomePage — the brand's overview screen.
 *
 * Tabs:
 *   - Recent    → at-a-glance + identity highlights + activity + team
 *   - Search    → inline scoped search across brand pages & templates
 *   - Templates → featured template categories (shortcut into /templates)
 *
 * Uses the unified BrandLayout shell (no bespoke headers). Active tab
 * persists to `?tab=`; default is `recent`.
 */
import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { TeamPanel } from '@/features/collaboration';
import { SharePanel } from '@/features/brand/components/SharePanel';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useBrandStore } from '@/shared/store/brandStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { useSearchIndex } from '@/shared/search/searchIndex';
import type { Brand } from '@/shared/types/brand';
import { logoUrl, hasLogo } from '@/shared/brand/logoUrl';
import {
  LayoutDashboard,
  Clock,
  Search,
  LayoutTemplate,
  ArrowRight,
  Edit3,
  Palette,
  BookOpen,
  Grid3X3,
  Square,
  CreditCard,
  Presentation,
  Megaphone,
  Wand2,
  FolderTree,
  Share2,
  SearchX,
} from 'lucide-react';

type TabId = 'recent' | 'search' | 'templates';
const TABS: TabId[] = ['recent', 'search', 'templates'];

function isTab(v: string | null): v is TabId {
  return v !== null && (TABS as string[]).includes(v);
}

interface QuickLink {
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
}

const QUICK_LINKS: QuickLink[] = [
  { label: 'Identity',  description: 'Logo, colors, typography, voice',  path: 'identity',  icon: Edit3 },
  { label: 'Templates', description: 'Branded starters for every surface', path: 'templates', icon: LayoutTemplate },
  { label: 'Design',    description: 'Start a new design from scratch or AI', path: 'design',    icon: Wand2 },
  { label: 'Content',   description: 'Plan & schedule social posts',      path: 'content',   icon: Megaphone },
  { label: 'Folders',   description: 'Designs and uploaded assets',       path: 'folders',   icon: FolderTree },
  { label: 'Share',     description: 'Guidelines, showcase, exports',     path: 'share',     icon: Share2 },
];

const FEATURED_TEMPLATES: { label: string; icon: React.ElementType; accent: string; path: string }[] = [
  { label: 'Brand Board',       icon: Palette,      accent: 'from-indigo-500 to-blue-600',   path: 'brand-board' },
  { label: 'Guidelines',        icon: BookOpen,     accent: 'from-rose-500 to-pink-600',     path: 'guidelines/canvas' },
  { label: 'Bento Grid',        icon: Grid3X3,      accent: 'from-emerald-500 to-teal-600',  path: 'bento' },
  { label: 'Instagram Posts',   icon: Square,       accent: 'from-teal-400 to-cyan-500',     path: 'brandkit/instagram-posts' },
  { label: 'Business Cards',    icon: CreditCard,   accent: 'from-indigo-500 to-blue-600',   path: 'brandkit/business-cards' },
  { label: 'Presentations',     icon: Presentation, accent: 'from-purple-500 to-violet-600', path: 'presentations' },
];

export default function BrandHomePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand, isLoading, error } = useBrandBySlug(slug);
  const updateBrand = useBrandStore((s) => s.update);

  const activeTab: TabId = useMemo(() => {
    const t = searchParams.get('tab');
    return isTab(t) ? t : 'recent';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isTab(value)) return;
      const next = new URLSearchParams(searchParams);
      if (value === 'recent') next.delete('tab');
      else next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Overview',
    icon: LayoutDashboard,
    storageKey: 'brandos:overview-nav-open',
    groups: [
      {
        id: 'tabs',
        label: 'Sections',
        items: [
          { id: 'recent',    label: 'Recent',    icon: Clock,          href: `/b/${slug}` },
          { id: 'search',    label: 'Search',    icon: Search,         href: `/b/${slug}?tab=search` },
          { id: 'templates', label: 'Templates', icon: LayoutTemplate, href: `/b/${slug}?tab=templates` },
        ],
      },
    ],
  }), [slug]);

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

  const handleBrandUpdate = async (patch: Partial<Brand>) => {
    if (!brand) return;
    await updateBrand(brand.id, patch);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !brand) {
    return (
      <Card className="p-8 text-center max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-semibold mb-2">Brand not found</h3>
        <p className="text-muted-foreground mb-4">{error || 'Could not load brand.'}</p>
        <Button onClick={() => navigate('/dashboard/brands')}>Back to brands</Button>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        compact
        title="Overview"
        subtitle={brand.tone || 'At a glance — what this brand is and where to go next.'}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/b/${slug}/identity`)}
          >
            <Edit3 className="h-3.5 w-3.5 mr-1.5" />
            Edit brand
          </Button>
        }
      />

      <div className="mb-6">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="w-4 h-4" />
              <span>Recent</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              <span>Search</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <LayoutTemplate className="w-4 h-4" />
              <span>Templates</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'recent' && (
        <RecentTab brand={brand} slug={slug!} onNav={(p) => navigate(`/b/${slug}/${p}`)} onBrandUpdate={handleBrandUpdate} />
      )}
      {activeTab === 'search' && (
        <SearchTab slug={slug!} onNav={navigate} />
      )}
      {activeTab === 'templates' && (
        <TemplatesTab slug={slug!} onNav={navigate} />
      )}
    </>
  );
}

/* ---- Tab panels ---- */

function RecentTab({
  brand,
  slug,
  onNav,
  onBrandUpdate,
}: {
  brand: Brand;
  slug: string;
  onNav: (path: string) => void;
  onBrandUpdate: (patch: Partial<Brand>) => Promise<void>;
}) {
  return (
    <div className="space-y-12">
      {/* At a glance */}
      <section>
        <Card className="p-6">
          <div className="flex items-start gap-5">
            {hasLogo(brand) ? (
              <div className="h-16 w-16 rounded-xl bg-muted/30 flex items-center justify-center p-2 ring-1 ring-border shrink-0">
                <img src={logoUrl(brand)} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div
                className="h-16 w-16 rounded-xl flex items-center justify-center text-xl font-bold text-white ring-1 ring-border shrink-0"
                style={{ backgroundColor: brand.primaryColor }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1 grid grid-cols-2 sm:grid-cols-4 gap-5">
              <Stat label="Tone" value={brand.tone || '—'} />
              <Stat label="Audience" value={brand.audience || '—'} />
              <ColorStat label="Colors" primary={brand.primaryColor} secondary={brand.secondaryColor} />
              <Stat label="Visibility" value={brand.isPublic ? 'Public' : 'Private'} />
            </div>
          </div>
        </Card>
      </section>

      {/* Jump into */}
      <Section title="Jump into" subtitle="The main surfaces of this brand">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => onNav(link.path)}
                className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            );
          })}
        </div>
      </Section>

      {/* Identity highlights */}
      {brand.guidelines?.strategy && (
        <Section title="Identity highlights" subtitle="Pulled from the brand guidelines">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {brand.guidelines.strategy.mission && (
              <Card className="p-5">
                <Eyebrow>Mission</Eyebrow>
                <p className="text-sm text-foreground leading-relaxed">{brand.guidelines.strategy.mission}</p>
              </Card>
            )}
            {brand.guidelines.strategy.positioning && (
              <Card className="p-5">
                <Eyebrow>Positioning</Eyebrow>
                <p className="text-sm text-foreground leading-relaxed">{brand.guidelines.strategy.positioning}</p>
              </Card>
            )}
            {brand.guidelines.strategy.values && brand.guidelines.strategy.values.length > 0 && (
              <Card className="p-5">
                <Eyebrow>Values</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {brand.guidelines.strategy.values.map((v) => (
                    <span key={v} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{v}</span>
                  ))}
                </div>
              </Card>
            )}
            {brand.guidelines.voiceAndTone?.toneAttributes && (
              <Card className="p-5">
                <Eyebrow>Voice & Tone</Eyebrow>
                <div className="flex flex-wrap gap-1.5">
                  {brand.guidelines.voiceAndTone.toneAttributes.map((t) => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">{t}</span>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </Section>
      )}

      {/* Sharing & team */}
      <Section title="Sharing & team" subtitle="Public link, custom domain, and collaborators">
        <div className="space-y-4">
          <SharePanel brand={brand} onUpdate={onBrandUpdate} />
          <TeamPanel brandId={slug} brandName={brand.name} />
        </div>
      </Section>
    </div>
  );
}

function SearchTab({ slug, onNav }: { slug: string; onNav: (path: string) => void }) {
  const [query, setQuery] = useState('');
  const index = useSearchIndex();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const brandPages = index.filter((item) => item.href?.includes(`/${slug}`) || item.href?.includes(`/b/${slug}`));
    if (!q) return brandPages.slice(0, 24);
    return brandPages
      .filter((item) => {
        const haystack = [item.title, item.subtitle, ...(item.keywords ?? [])].join(' ').toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 40);
  }, [index, slug, query]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          autoFocus
          placeholder="Search this brand's pages, templates, and assets…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-10 h-11"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">⌘K</kbd> anywhere to open the global command palette.
      </p>

      {results.length === 0 ? (
        <Card className="p-10 text-center">
          <SearchX className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium">No matches</p>
          <p className="text-xs text-muted-foreground">Try a different query or open the command palette.</p>
        </Card>
      ) : (
        <div className="space-y-1">
          {results.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.href) onNav(item.href);
                else if (item.action) item.action();
              }}
              className="w-full flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-border hover:bg-muted/30 transition-colors"
            >
              <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                <Search className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.subtitle && <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>}
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">{item.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesTab({ slug, onNav }: { slug: string; onNav: (path: string) => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Featured templates</h2>
          <p className="text-xs text-muted-foreground">Jump straight into the most-used deliverables.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => onNav(`/b/${slug}/templates`)} className="gap-1.5">
          Browse all
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURED_TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <Card
              key={t.label}
              onClick={() => onNav(`/b/${slug}/${t.path}`)}
              className="group relative overflow-hidden p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div
                className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${t.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
              />
              <div
                className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${t.accent} flex items-center justify-center mb-3`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="relative text-base font-semibold">{t.label}</h3>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Inline page helpers ---- */

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <p className="text-sm font-medium text-foreground truncate">{value}</p>
    </div>
  );
}

function ColorStat({
  label,
  primary,
  secondary,
}: {
  label: string;
  primary?: string;
  secondary?: string;
}) {
  return (
    <div className="min-w-0">
      <Eyebrow>{label}</Eyebrow>
      <div className="flex items-center gap-1.5">
        {primary && (
          <span
            className="h-5 w-5 rounded-full ring-1 ring-border"
            style={{ backgroundColor: primary }}
          />
        )}
        {secondary && (
          <span
            className="h-5 w-5 rounded-full ring-1 ring-border"
            style={{ backgroundColor: secondary }}
          />
        )}
        {!primary && !secondary && <span className="text-sm text-muted-foreground">—</span>}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
      {children}
    </p>
  );
}
