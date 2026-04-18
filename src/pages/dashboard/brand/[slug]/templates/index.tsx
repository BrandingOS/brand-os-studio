/**
 * Templates — unified catalog of starters + saved templates.
 *
 * Absorbs the old Assets deliverable catalog (Print/Social/Screen/Utility)
 * and adds the layout-deliverables (Brand Board, Guidelines, Bento).
 * Category tabs filter the visible cards; active tab persists to `?tab=`.
 *
 * Saved templates (user-flagged from the marketplace and brandkit modules)
 * render above the catalog when the active filter is All.
 */
import { useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useSavedTemplatesStore } from '@/shared/store/savedTemplatesStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import {
  LayoutTemplate,
  ExternalLink,
  LayoutGrid,
  Printer,
  Megaphone,
  MonitorPlay,
  Wrench,
  Bookmark,
  FileText,
  Grid3X3,
  Palette,
  CreditCard,
  Square,
  Smartphone,
  RectangleHorizontal,
  Share2,
  Presentation,
  Play,
  PenTool,
  QrCode,
  FolderOpen,
  Monitor,
  BookOpen,
} from 'lucide-react';

type CategoryId = 'all' | 'brand-board' | 'guidelines' | 'bento' | 'social' | 'print' | 'screen' | 'utility';

const CATEGORIES: { id: CategoryId; label: string; icon: React.ElementType }[] = [
  { id: 'all',         label: 'All',         icon: LayoutGrid },
  { id: 'brand-board', label: 'Brand Board', icon: Palette },
  { id: 'guidelines',  label: 'Guidelines',  icon: BookOpen },
  { id: 'bento',       label: 'Bento',       icon: Grid3X3 },
  { id: 'social',      label: 'Social',      icon: Megaphone },
  { id: 'print',       label: 'Print',       icon: Printer },
  { id: 'screen',      label: 'Screen',      icon: MonitorPlay },
  { id: 'utility',     label: 'Utility',     icon: Wrench },
];

interface CatalogCard {
  title: string;
  description: string;
  icon: React.ElementType;
  accent: string;
  category: Exclude<CategoryId, 'all'>;
  path: (slug: string) => string;
}

const CATALOG: CatalogCard[] = [
  // Brand Board — on-brand single-canvas showcase
  {
    title: 'Brand Board',
    description: 'One-canvas identity snapshot — logo, colors, type, voice.',
    icon: Palette,
    accent: 'from-indigo-500 to-blue-600',
    category: 'brand-board',
    path: (slug) => `/b/${slug}/brand-board`,
  },
  // Guidelines — the brand book
  {
    title: 'Brand Guidelines',
    description: 'Slide-based, editable brand book.',
    icon: BookOpen,
    accent: 'from-rose-500 to-pink-600',
    category: 'guidelines',
    path: (slug) => `/b/${slug}/guidelines/canvas`,
  },
  {
    title: 'Brand Guides library',
    description: 'Browse pre-designed guideline templates.',
    icon: FileText,
    accent: 'from-rose-400 to-red-500',
    category: 'guidelines',
    path: (slug) => `/b/${slug}/brand-guides`,
  },
  // Bento
  {
    title: 'Bento Grid',
    description: 'Visual brand showcase grid.',
    icon: Grid3X3,
    accent: 'from-emerald-500 to-teal-600',
    category: 'bento',
    path: (slug) => `/b/${slug}/bento`,
  },
  // Social
  {
    title: 'Instagram Posts',
    description: 'Square post templates with brand colors.',
    icon: Square,
    accent: 'from-teal-400 to-cyan-500',
    category: 'social',
    path: (slug) => `/b/${slug}/brandkit/instagram-posts`,
  },
  {
    title: 'Instagram Stories',
    description: 'Vertical story templates.',
    icon: Smartphone,
    accent: 'from-pink-500 to-rose-600',
    category: 'social',
    path: (slug) => `/b/${slug}/brandkit/instagram-stories`,
  },
  {
    title: 'Facebook Covers',
    description: 'Page cover image templates.',
    icon: RectangleHorizontal,
    accent: 'from-blue-500 to-indigo-600',
    category: 'social',
    path: (slug) => `/b/${slug}/brandkit/facebook-covers`,
  },
  {
    title: 'Social Media Hub',
    description: 'Cross-platform post manager.',
    icon: Share2,
    accent: 'from-violet-500 to-purple-600',
    category: 'social',
    path: (slug) => `/b/${slug}/social-media`,
  },
  // Print
  {
    title: 'Business Cards',
    description: 'Print-ready business card templates.',
    icon: CreditCard,
    accent: 'from-indigo-500 to-blue-600',
    category: 'print',
    path: (slug) => `/b/${slug}/brandkit/business-cards`,
  },
  {
    title: 'Invoices',
    description: 'Branded invoice templates.',
    icon: FileText,
    accent: 'from-slate-500 to-gray-700',
    category: 'print',
    path: (slug) => `/b/${slug}/brandkit/invoices`,
  },
  // Screen
  {
    title: 'Presentations',
    description: 'Branded slide decks.',
    icon: Presentation,
    accent: 'from-purple-500 to-violet-600',
    category: 'screen',
    path: (slug) => `/b/${slug}/presentations`,
  },
  {
    title: 'Mockup Designs',
    description: 'Device & product mockups.',
    icon: Monitor,
    accent: 'from-emerald-500 to-teal-600',
    category: 'screen',
    path: (slug) => `/b/${slug}/brandkit/mockups`,
  },
  {
    title: 'Animations',
    description: 'Animated logo & loop templates.',
    icon: Play,
    accent: 'from-orange-500 to-amber-500',
    category: 'screen',
    path: (slug) => `/b/${slug}/brandkit/animations`,
  },
  {
    title: 'Design Tool',
    description: 'Free-form canvas editor.',
    icon: PenTool,
    accent: 'from-fuchsia-500 to-pink-600',
    category: 'screen',
    path: (slug) => `/editor/design/${slug}`,
  },
  // Utility
  {
    title: 'QR Code',
    description: 'Brand-styled QR generator.',
    icon: QrCode,
    accent: 'from-blue-400 to-blue-600',
    category: 'utility',
    path: (slug) => `/b/${slug}/brandkit/qr-code`,
  },
  {
    title: 'Profile Icons',
    description: 'Avatars and social profile images.',
    icon: FolderOpen,
    accent: 'from-emerald-500 to-teal-600',
    category: 'utility',
    path: (slug) => `/b/${slug}/brandkit/profile-icons`,
  },
];

function isCategory(v: string | null): v is CategoryId {
  return v !== null && CATEGORIES.some((c) => c.id === v);
}

export default function BrandTemplatesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand } = useBrandBySlug(slug);
  const { forBrand, count } = useSavedTemplatesStore();
  const savedTemplates = brand ? forBrand(brand.id) : [];
  const savedCount = brand ? count(brand.id) : 0;

  const activeCategory: CategoryId = useMemo(() => {
    // Support both ?tab= and ?category= for deep-link back-compat.
    const t = searchParams.get('tab') ?? searchParams.get('category');
    return isCategory(t) ? t : 'all';
  }, [searchParams]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      if (!isCategory(value)) return;
      const next = new URLSearchParams(searchParams);
      next.delete('category');
      if (value === 'all') next.delete('tab');
      else next.set('tab', value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const visibleCards = useMemo(
    () => (activeCategory === 'all' ? CATALOG : CATALOG.filter((c) => c.category === activeCategory)),
    [activeCategory],
  );

  const innerNav = useMemo<InnerNavConfig | undefined>(
    () =>
      slug
        ? {
            title: 'Templates',
            icon: LayoutTemplate,
            storageKey: 'brandos:brand-templates-nav-open',
            groups: [
              {
                id: 'filters',
                label: 'Categories',
                items: CATEGORIES.map((c) => ({
                  id: c.id,
                  label: c.label,
                  icon: c.icon,
                  href: c.id === 'all' ? `/b/${slug}/templates` : `/b/${slug}/templates?tab=${c.id}`,
                })),
              },
              {
                id: 'related',
                label: 'Related',
                items: [
                  { id: 'marketplace', label: 'Full Marketplace', icon: ExternalLink, href: '/templates' },
                ],
              },
            ],
          }
        : undefined,
    [slug],
  );

  useBrandPageConfig({ brandName: brand?.name, maxWidth: '7xl', innerNav });

  if (!slug) {
    return <div className="text-center py-16 text-muted-foreground">Brand not found.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        compact
        title="Templates"
        subtitle="Branded starters for every deliverable — brand board, guidelines, bento, social, print, screen, utility."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/templates')} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Browse Marketplace
          </Button>
        }
      />

      <Tabs value={activeCategory} onValueChange={handleCategoryChange} className="w-full">
        <TabsList className="grid grid-cols-4 sm:grid-cols-8 w-full max-w-4xl">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Saved templates — only on All. */}
      {activeCategory === 'all' && savedTemplates.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Bookmark className="h-4 w-4" />
            Saved ({savedCount})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {savedTemplates.map((tpl) => (
              <Card
                key={tpl.id}
                className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
                onClick={() => navigate(`/b/${slug}/brandkit/${tpl.moduleId}`)}
              >
                <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-3">
                  <LayoutTemplate className="h-8 w-8 text-primary/40 group-hover:text-primary/60 transition-colors" />
                </div>
                <p className="text-sm font-medium truncate">{tpl.name}</p>
                <p className="text-xs text-muted-foreground">{tpl.category}</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Catalog grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.title}
              onClick={() => navigate(card.path(slug))}
              className="group relative overflow-hidden p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div
                className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${card.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
              />
              <div
                className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center mb-3`}
              >
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="relative text-base font-semibold mb-1">{card.title}</h3>
              <p className="relative text-xs text-muted-foreground">{card.description}</p>
            </Card>
          );
        })}
      </div>

      {visibleCards.length === 0 && (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No templates in this category yet.
        </div>
      )}
    </div>
  );
}
