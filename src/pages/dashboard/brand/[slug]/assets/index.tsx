/**
 * Assets — categorized hub for generated brand deliverables.
 *
 * Categories: All · Print · Social · Screen · Utility
 *
 * The active category is persisted to a `?category=` search param so deep
 * links and bookmarks land on the right slice. Cards link to the existing
 * brandkit modules — Stage 9 is information architecture, not a rewrite of
 * the underlying modules.
 *
 * See docs/ux-redesign/ARCHITECTURE.md §3.1 (Assets section).
 */
import { useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';
import {
  CreditCard,
  RectangleHorizontal,
  Square,
  Smartphone,
  Presentation,
  Play,
  QrCode,
  FileText,
  Monitor,
  PenTool,
  Share2,
  FolderOpen,
  LayoutGrid,
  Printer,
  Megaphone,
  MonitorPlay,
  Wrench,
} from 'lucide-react';

type CategoryId = 'all' | 'print' | 'social' | 'screen' | 'utility';

interface AssetCard {
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  accent: string;
  category: Exclude<CategoryId, 'all'>;
}

const ASSETS: AssetCard[] = [
  // Print
  {
    title: 'Business Cards',
    description: 'Print-ready business card templates.',
    icon: CreditCard,
    path: 'brandkit/business-cards',
    accent: 'from-indigo-500 to-blue-600',
    category: 'print',
  },
  {
    title: 'Invoices',
    description: 'Branded invoice templates.',
    icon: FileText,
    path: 'brandkit/invoices',
    accent: 'from-slate-500 to-gray-700',
    category: 'print',
  },
  // Social
  {
    title: 'Instagram Posts',
    description: 'Square post templates with brand colors.',
    icon: Square,
    path: 'brandkit/instagram-posts',
    accent: 'from-teal-400 to-cyan-500',
    category: 'social',
  },
  {
    title: 'Instagram Stories',
    description: 'Vertical story templates.',
    icon: Smartphone,
    path: 'brandkit/instagram-stories',
    accent: 'from-pink-500 to-rose-600',
    category: 'social',
  },
  {
    title: 'Facebook Covers',
    description: 'Page cover image templates.',
    icon: RectangleHorizontal,
    path: 'brandkit/facebook-covers',
    accent: 'from-blue-500 to-indigo-600',
    category: 'social',
  },
  {
    title: 'Social Media Hub',
    description: 'Cross-platform post manager.',
    icon: Share2,
    path: 'social-media',
    accent: 'from-violet-500 to-purple-600',
    category: 'social',
  },
  // Screen
  {
    title: 'Presentations',
    description: 'Branded slide decks.',
    icon: Presentation,
    path: 'presentations',
    accent: 'from-purple-500 to-violet-600',
    category: 'screen',
  },
  {
    title: 'Mockup Designs',
    description: 'Device & product mockups.',
    icon: Monitor,
    path: 'brandkit/mockups',
    accent: 'from-emerald-500 to-teal-600',
    category: 'screen',
  },
  {
    title: 'Animations',
    description: 'Animated logo & loop templates.',
    icon: Play,
    path: 'brandkit/animations',
    accent: 'from-orange-500 to-amber-500',
    category: 'screen',
  },
  {
    title: 'Design Tool',
    description: 'Free-form canvas editor.',
    icon: PenTool,
    path: 'brandkit/design-tool',
    accent: 'from-fuchsia-500 to-pink-600',
    category: 'screen',
  },
  // Utility
  {
    title: 'QR Code',
    description: 'Brand-styled QR generator.',
    icon: QrCode,
    path: 'brandkit/qr-code',
    accent: 'from-blue-400 to-blue-600',
    category: 'utility',
  },
  {
    title: 'Brand Assets',
    description: 'Upload & manage files.',
    icon: FolderOpen,
    path: 'brandkit/assets',
    accent: 'from-emerald-500 to-teal-600',
    category: 'utility',
  },
];

const CATEGORIES: { id: CategoryId; label: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', icon: LayoutGrid },
  { id: 'print', label: 'Print', icon: Printer },
  { id: 'social', label: 'Social', icon: Megaphone },
  { id: 'screen', label: 'Screen', icon: MonitorPlay },
  { id: 'utility', label: 'Utility', icon: Wrench },
];

function isValidCategory(value: string | null): value is CategoryId {
  return value !== null && CATEGORIES.some((c) => c.id === value);
}

export default function AssetsPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { brand, isLoading, error } = useBrandBySlug(slug);

  const activeCategory: CategoryId = useMemo(() => {
    const fromUrl = searchParams.get('category');
    return isValidCategory(fromUrl) ? fromUrl : 'all';
  }, [searchParams]);

  const handleCategoryChange = useCallback(
    (value: string) => {
      if (!isValidCategory(value)) return;
      const next = new URLSearchParams(searchParams);
      if (value === 'all') {
        next.delete('category');
      } else {
        next.set('category', value);
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const visibleAssets = useMemo(
    () =>
      activeCategory === 'all'
        ? ASSETS
        : ASSETS.filter((a) => a.category === activeCategory),
    [activeCategory],
  );

  // Build the inner-nav config — href filter items mirroring categories.
  const innerNav = useMemo<InnerNavConfig | undefined>(
    () =>
      slug
        ? {
            title: 'Designs',
            icon: LayoutGrid,
            storageKey: 'brandos:designs-nav-open',
            groups: [
              {
                id: 'filters',
                label: 'Categories',
                items: [
                  { id: 'all',     label: 'All',     icon: LayoutGrid, href: `/b/${slug}/assets` },
                  { id: 'print',   label: 'Print',   icon: Printer,    href: `/b/${slug}/assets?category=print` },
                  { id: 'social',  label: 'Social',  icon: Megaphone,  href: `/b/${slug}/assets?category=social` },
                  { id: 'screen',  label: 'Screen',  icon: MonitorPlay, href: `/b/${slug}/assets?category=screen` },
                  { id: 'utility', label: 'Utility', icon: Wrench,     href: `/b/${slug}/assets?category=utility` },
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

  if (error || !brand) {
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
          title="Designs"
          subtitle="Generated deliverables built from your brand identity — print, social, screen, and utility."
        />

        <Tabs
          value={activeCategory}
          onValueChange={handleCategoryChange}
          className="w-full"
        >
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleAssets.map((card) => (
            <Card
              key={card.path}
              onClick={() => navigate(`/b/${slug}/${card.path}`)}
              className="group relative overflow-hidden p-5 cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5"
            >
              <div
                className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${card.accent} opacity-10 group-hover:opacity-20 transition-opacity`}
              />
              <div
                className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${card.accent} flex items-center justify-center mb-3`}
              >
                <card.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="relative text-base font-semibold mb-1">{card.title}</h3>
              <p className="relative text-xs text-muted-foreground">{card.description}</p>
            </Card>
          ))}
        </div>

        {visibleAssets.length === 0 && (
          <div className="text-center py-16 text-sm text-muted-foreground">
            No assets in this category yet.
          </div>
        )}
    </div>
  );
}
