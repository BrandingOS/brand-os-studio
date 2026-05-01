/**
 * Design — launchpad for creating new work.
 *
 * Tabs:
 *   - Blank Canvas  → opens the Fabric.js editor at /editor/design/:slug
 *   - AI Design     → seeds a brand-bound social-post design + navigates
 *                     to the unified editor at /b/:slug/design/:designId.
 *                     The unified editor's top-chrome AI prompt bar is
 *                     the in-editor AI surface (Phase 3.5 commit 5).
 *                     Pre-3.5: two separate fullscreen pages
 *                     (/b/:slug/ai-design, /b/:slug/design-ai) — both
 *                     deleted in Phase 3.5 commit 9.
 *   - Recent        → recently opened designs (reads from the local store)
 *
 * The underlying editor surfaces are fullscreen tools that bypass the
 * brand shell. This page is the in-shell launching pad that links into
 * them so the user has one obvious place to go to start creating.
 */
import { useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import { useService, SERVICE_KEYS } from '@/core';
import type { IDesignStorage } from '@/core/types/services';
import { seedInstagramPostTemplate } from '@/features/brandkit/templateSeeds';
import { toast } from 'sonner';
import {
  Wand2,
  Paintbrush,
  Sparkles,
  Clock,
  ArrowRight,
  FileText,
  LayoutGrid,
  Presentation,
  Image as ImageIcon,
} from 'lucide-react';
import type { Brand } from '@/shared/types/brand';
import type { NavigateFunction } from 'react-router-dom';

type TabId = 'blank' | 'ai' | 'recent';
const TABS: TabId[] = ['blank', 'ai', 'recent'];

function isTab(v: string | null): v is TabId {
  return v !== null && (TABS as string[]).includes(v);
}

interface LaunchCard {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  /** Static URL the card navigates to. Used by every blank-canvas
   *  card. Mutually exclusive with `action`. */
  path?: (slug: string) => string;
  /** Async click handler. Used when the card needs to seed/persist
   *  before navigating (e.g. the AI Design card seeds a brand-bound
   *  blank doc, persists via IDesignStorage, then navigates to the
   *  unified-editor route). Mutually exclusive with `path`. */
  action?: (args: { slug: string; brand: Brand; navigate: NavigateFunction; designStorage: IDesignStorage }) => Promise<void> | void;
}

const BLANK_LAUNCHERS: LaunchCard[] = [
  {
    title: 'Freeform canvas',
    description: 'Open the editor with a blank canvas, brand palette pre-loaded.',
    icon: Paintbrush,
    accent: 'from-fuchsia-500 to-pink-600',
    path: (slug) => `/editor/design/${slug}`,
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

// Phase 3.5 commit 9 — both pre-3.5 fullscreen AI pages were
// absorbed into the unified editor's top-chrome prompt bar. The
// launchpad now offers ONE AI card that seeds a brand-bound blank
// social-post design + navigates to the production editor. The
// in-editor prompt bar (always visible per vision §3) is the AI
// surface from here.
const AI_LAUNCHERS: LaunchCard[] = [
  {
    title: 'Design with AI',
    description: "Open a brand-bound canvas with the AI prompt bar ready. Type what you want — \"add a CTA button\", \"translate to Arabic\", \"convert to social posts\".",
    icon: Sparkles,
    accent: 'from-violet-500 to-purple-600',
    action: async ({ brand, navigate, designStorage }) => {
      try {
        const doc = seedInstagramPostTemplate(brand);
        await designStorage.saveDesign(brand.id, doc.id, doc);
        navigate(`/b/${brand.slug}/design/${doc.id}`);
      } catch (err) {
        console.error('[design launchpad] failed to seed AI design:', err);
        toast.error('Could not start a new AI design — please try again.');
      }
    },
  },
];

export default function DesignLaunchpadPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const activeTab: TabId = useMemo(() => {
    const t = searchParams.get('tab');
    return isTab(t) ? t : 'blank';
  }, [searchParams]);

  const handleTabChange = useCallback(
    (value: string) => {
      if (!isTab(value)) return;
      const next = new URLSearchParams(searchParams);
      if (value === 'blank') next.delete('tab');
      else next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const innerNav = useMemo<InnerNavConfig | undefined>(
    () =>
      slug
        ? {
            title: 'Design',
            icon: Wand2,
            storageKey: 'brandos:design-nav-open',
            groups: [
              {
                id: 'tabs',
                label: 'Start from',
                items: [
                  { id: 'blank', label: 'Blank Canvas', icon: Paintbrush, href: `/b/${slug}/design` },
                  { id: 'ai', label: 'AI Design', icon: Wand2, href: `/b/${slug}/design?tab=ai` },
                  { id: 'recent', label: 'Recent', icon: Clock, href: `/b/${slug}/design?tab=recent` },
                ],
              },
            ],
          }
        : undefined,
    [slug],
  );

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

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
    <div className="space-y-6">
      <PageHeader
        compact
        title="Design"
        subtitle="Start something new — blank canvas, AI assist, or pick up where you left off."
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="blank" className="gap-2">
            <Paintbrush className="w-4 h-4" />
            <span>Blank Canvas</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Wand2 className="w-4 h-4" />
            <span>AI Design</span>
          </TabsTrigger>
          <TabsTrigger value="recent" className="gap-2">
            <Clock className="w-4 h-4" />
            <span>Recent</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'blank' && <LaunchGrid cards={BLANK_LAUNCHERS} slug={slug} brand={brand} navigate={navigate} />}
      {activeTab === 'ai' && <LaunchGrid cards={AI_LAUNCHERS} slug={slug} brand={brand} navigate={navigate} />}
      {activeTab === 'recent' && <RecentEmpty slug={slug} onBrowseTemplates={() => navigate(`/b/${slug}/templates`)} />}
    </div>
  );
}

function LaunchGrid({
  cards,
  slug,
  brand,
  navigate,
}: {
  cards: LaunchCard[];
  slug: string;
  brand: Brand | null | undefined;
  navigate: NavigateFunction;
}) {
  const designStorage = useService<IDesignStorage>(SERVICE_KEYS.DESIGN_STORAGE);
  const onCardClick = (c: LaunchCard) => {
    if (c.action) {
      if (!brand) {
        toast.error('Brand context missing — refresh and try again.');
        return;
      }
      void c.action({ slug, brand, navigate, designStorage });
      return;
    }
    if (c.path) {
      navigate(c.path(slug));
    }
  };
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.title}
            onClick={() => onCardClick(c)}
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

function RecentEmpty({ slug: _slug, onBrowseTemplates }: { slug: string; onBrowseTemplates: () => void }) {
  return (
    <Card className="p-10 text-center bg-muted/20">
      <Clock className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" />
      <p className="text-sm font-medium mb-1">No recent designs yet</p>
      <p className="text-xs text-muted-foreground mb-4">
        Designs you open will show up here for quick access.
      </p>
      <Button variant="outline" size="sm" onClick={onBrowseTemplates}>
        Browse templates
      </Button>
    </Card>
  );
}
