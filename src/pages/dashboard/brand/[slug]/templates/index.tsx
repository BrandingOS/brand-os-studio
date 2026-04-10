/**
 * Brand Templates — saved templates and quick access to the marketplace.
 *
 * Shows templates the user has saved/favorited for this brand, plus
 * curated suggestions and quick links to the cross-brand marketplace.
 */
import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBrandBySlug } from '@/shared/hooks/useBrandBySlug';
import { useSavedTemplatesStore } from '@/shared/store/savedTemplatesStore';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LayoutTemplate,
  ExternalLink,
  Sparkles,
  CreditCard,
  Instagram,
  FileText,
  Presentation,
  Image as ImageIcon,
  ArrowRight,
  Heart,
  Bookmark,
} from 'lucide-react';
import type { InnerNavConfig } from '@/shared/layouts/InnerNavRail';
import { useBrandPageConfig } from '@/shared/layouts/brandPageConfig';

const QUICK_START = [
  { id: 'business-cards', label: 'Business Cards', icon: CreditCard, count: 12 },
  { id: 'instagram-posts', label: 'Instagram Posts', icon: Instagram, count: 10 },
  { id: 'brand-guides', label: 'Brand Guides', icon: FileText, count: 10 },
  { id: 'presentations', label: 'Presentations', icon: Presentation, count: 8 },
  { id: 'profile-icons', label: 'Profile Icons', icon: ImageIcon, count: 12 },
];

const COLLECTIONS = [
  {
    id: 'startup-essentials',
    name: 'Startup Essentials',
    description: 'Business cards, pitch deck, social kit — everything to launch.',
    templates: ['business-cards', 'presentations', 'instagram-posts', 'profile-icons'],
    color: 'from-violet-500 to-purple-600',
  },
  {
    id: 'social-media-kit',
    name: 'Social Media Kit',
    description: 'Instagram posts, stories, Facebook covers — all on-brand.',
    templates: ['instagram-posts', 'instagram-stories', 'facebook-covers', 'profile-icons'],
    color: 'from-pink-500 to-rose-600',
  },
  {
    id: 'brand-guidelines-pack',
    name: 'Brand Guidelines Pack',
    description: 'Comprehensive brand book, logo files, and style sheets.',
    templates: ['brand-guides', 'profile-icons', 'business-cards'],
    color: 'from-blue-500 to-indigo-600',
  },
];

export default function BrandTemplatesPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { brand } = useBrandBySlug(slug);
  const { forBrand, count } = useSavedTemplatesStore();
  const savedTemplates = brand ? forBrand(brand.id) : [];
  const savedCount = brand ? count(brand.id) : 0;

  const innerNav = useMemo<InnerNavConfig>(() => ({
    title: 'Templates',
    icon: LayoutTemplate,
    storageKey: 'brandos:brand-templates-nav-open',
    groups: [
      {
        id: 'sections',
        label: 'On this page',
        items: [
          { id: 'saved', label: `Saved (${savedCount})`, icon: Bookmark, anchor: 'saved' },
          { id: 'quick-start', label: 'Quick Start', icon: Sparkles, anchor: 'quick-start' },
          { id: 'collections', label: 'Collections', icon: Heart, anchor: 'collections' },
        ],
      },
      {
        id: 'related',
        label: 'Related',
        items: [
          { id: 'marketplace', label: 'Full Marketplace', icon: ExternalLink, href: '/templates' },
        ],
      },
    ],
  }), [savedCount]);

  useBrandPageConfig({ brandName: brand?.name, innerNav });

  return (
    <>
      <PageHeader
        compact
        title="Templates"
        subtitle={`${savedCount} saved template${savedCount !== 1 ? 's' : ''} for this brand`}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/templates')} className="gap-1.5">
            <ExternalLink className="h-3.5 w-3.5" />
            Browse Marketplace
          </Button>
        }
      />

      {/* Saved Templates */}
      <section id="section-saved" className="scroll-mt-24 mt-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bookmark className="h-5 w-5 text-primary" />
          Saved Templates
        </h2>

        {savedTemplates.length === 0 ? (
          <Card className="p-8 text-center bg-muted/20">
            <Bookmark className="h-8 w-8 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No saved templates yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Save templates from the marketplace or Brand Kit modules to access them here.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/templates')}>
              Browse Templates
            </Button>
          </Card>
        ) : (
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
        )}
      </section>

      {/* Quick Start */}
      <section id="section-quick-start" className="scroll-mt-24 mt-10 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Quick Start
        </h2>
        <p className="text-sm text-muted-foreground">
          Jump into a template category and start creating.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {QUICK_START.map((cat) => {
            const Icon = cat.icon;
            return (
              <Card
                key={cat.id}
                className="p-4 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group text-center"
                onClick={() => navigate(`/b/${slug}/brandkit/${cat.id}`)}
              >
                <div className="h-10 w-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-medium">{cat.label}</p>
                <p className="text-xs text-muted-foreground">{cat.count} templates</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Curated Collections */}
      <section id="section-collections" className="scroll-mt-24 mt-10 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          Curated Collections
        </h2>
        <p className="text-sm text-muted-foreground">
          Pre-built packs to get your brand started fast.
        </p>

        <div className="grid gap-4 md:grid-cols-3">
          {COLLECTIONS.map((collection) => (
            <Card
              key={collection.id}
              className="overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group"
              onClick={() => navigate(`/b/${slug}/brandkit/${collection.templates[0]}`)}
            >
              <div className={`h-24 bg-gradient-to-br ${collection.color} flex items-center justify-center`}>
                <LayoutTemplate className="h-10 w-10 text-white/80" />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold">{collection.name}</h3>
                  <Badge variant="outline" className="text-[10px]">
                    {collection.templates.length} types
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{collection.description}</p>
                <div className="mt-3 flex items-center text-xs text-primary font-medium group-hover:underline">
                  Start creating <ArrowRight className="h-3 w-3 ml-1" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
