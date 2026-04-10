/**
 * Templates Marketplace — Canva-style category browser.
 *
 * v5 PRD Phase 4. Mounted at /templates.
 *
 * Pulls categories from a self-contained taxonomy + counts from
 * brandkit/data/templates.ts (which already exists). On "Use", navigates to
 * either the brand picker (no brand) or the brandkit module for that template
 * type on the user's current/last brand.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import { useBrandStore } from '@/shared/store/brandStore';
import {
  CreditCard,
  Image as ImageIcon,
  Instagram,
  Facebook,
  Presentation,
  FileText,
  Sparkles,
  Search,
  Layout,
  Wand2,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateCategory {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  brandkitModule: string;
  count: number;
  blurb: string;
}

const CATEGORIES: TemplateCategory[] = [
  { id: 'all', label: 'All', icon: Sparkles, brandkitModule: '', count: 96, blurb: 'Everything in one place' },
  { id: 'brand-guides', label: 'Brand Guides', icon: FileText, brandkitModule: 'brand-guides', count: 10, blurb: 'Beautiful guideline doc layouts' },
  { id: 'business-cards', label: 'Business Cards', icon: CreditCard, brandkitModule: 'business-cards', count: 12, blurb: 'Print-ready card designs' },
  { id: 'instagram-posts', label: 'Instagram Posts', icon: Instagram, brandkitModule: 'instagram-posts', count: 10, blurb: 'On-grid social templates' },
  { id: 'instagram-stories', label: 'IG Stories', icon: Instagram, brandkitModule: 'instagram-stories', count: 10, blurb: 'Vertical, full-screen' },
  { id: 'facebook-covers', label: 'Facebook Covers', icon: Facebook, brandkitModule: 'facebook-covers', count: 8, blurb: 'Wide banner templates' },
  { id: 'profile-icons', label: 'Profile Icons', icon: ImageIcon, brandkitModule: 'profile-icons', count: 12, blurb: 'Avatar and PFP styles' },
  { id: 'presentations', label: 'Presentations', icon: Presentation, brandkitModule: 'presentations', count: 12, blurb: 'Pitch and slide decks' },
  { id: 'logo-presentations', label: 'Logo Decks', icon: Wand2, brandkitModule: 'logo-presentation', count: 6, blurb: 'Showcase a logo system' },
];

/** Synthetic preview templates so the marketplace renders something pretty. */
function generatePreviews(category: TemplateCategory) {
  const palettes = [
    ['#0f0f1a', '#7c3aed'],
    ['#fef3c7', '#92400e'],
    ['#1e293b', '#06b6d4'],
    ['#fafaf9', '#171717'],
    ['#fce7f3', '#be185d'],
    ['#dcfce7', '#166534'],
    ['#dbeafe', '#1d4ed8'],
    ['#fed7aa', '#c2410c'],
  ];
  return Array.from({ length: Math.min(category.count, 8) }).map((_, i) => ({
    id: `${category.id}-${i}`,
    name: `${category.label} ${String(i + 1).padStart(2, '0')}`,
    palette: palettes[i % palettes.length],
    accent: i % 3 === 0,
  }));
}

export default function TemplatesMarketplacePage() {
  const navigate = useNavigate();
  const brands = useBrandStore((s) => s.list);
  const [activeCategory, setActiveCategory] = React.useState<string>('all');
  const [search, setSearch] = React.useState('');

  const lastBrand = React.useMemo(
    () =>
      [...brands].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0],
    [brands],
  );

  const visibleCategories = activeCategory === 'all' ? CATEGORIES.filter((c) => c.id !== 'all') : CATEGORIES.filter((c) => c.id === activeCategory);

  const handleUse = (cat: TemplateCategory) => {
    if (!lastBrand) {
      navigate('/dashboard/brands');
      return;
    }
    navigate(`/b/${lastBrand.slug}/brandkit/${cat.brandkitModule || cat.id}`);
  };

  return (
    <DashboardLayout>
      <PageHeader
        eyebrow="Templates"
        title="Marketplace"
        subtitle="Premium templates for every brand surface — pick one and make it yours."
      />

      {/* Featured collections banner */}
      {activeCategory === 'all' && !search && (
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {[
            { name: 'Staff Picks', desc: 'Our favorite templates this month', color: 'from-violet-500 to-purple-600', icon: Star },
            { name: 'Startup Kit', desc: 'Cards, deck, socials — launch ready', color: 'from-orange-500 to-red-500', icon: Sparkles },
            { name: 'Agency Pack', desc: 'Everything for client deliverables', color: 'from-blue-500 to-cyan-500', icon: Layout },
          ].map((pack) => {
            const Icon = pack.icon;
            return (
              <button
                key={pack.name}
                type="button"
                onClick={() => setActiveCategory('all')}
                className="group relative overflow-hidden rounded-2xl border border-border text-left transition hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className={`h-28 bg-gradient-to-br ${pack.color} flex items-center justify-center`}>
                  <Icon className="h-10 w-10 text-white/80" />
                </div>
                <div className="p-4 bg-card">
                  <h3 className="text-sm font-semibold">{pack.name}</h3>
                  <p className="text-xs text-muted-foreground">{pack.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Search bar */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 text-primary" />
          {CATEGORIES.reduce((s, c) => s + c.count, 0)} templates · {CATEGORIES.length - 1} categories
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        {/* Sidebar */}
        <aside className="space-y-1">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = activeCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategory(c.id)}
                className={cn(
                  'group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition',
                  active
                    ? 'border-primary/40 bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground',
                )}
              >
                <span className={cn('flex h-7 w-7 items-center justify-center rounded-md border border-border', active ? 'bg-primary/10' : 'bg-card')}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className="flex-1 text-sm font-medium">{c.label}</span>
                <span className="text-[10px] text-muted-foreground">{c.count}</span>
              </button>
            );
          })}
        </aside>

        {/* Main grid */}
        <main className="space-y-10">
          {visibleCategories.map((cat) => (
            <section key={cat.id}>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">{cat.label}</h2>
                  <p className="text-xs text-muted-foreground">{cat.blurb}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  See all {cat.count} →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {generatePreviews(cat).map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleUse(cat)}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_24px_60px_-24px_hsl(var(--primary)/0.4)]"
                  >
                    <div
                      className="aspect-[4/5] w-full"
                      style={{
                        background: `linear-gradient(135deg, ${tpl.palette[0]} 0%, ${tpl.palette[1]} 100%)`,
                      }}
                    >
                      <div className="flex h-full flex-col items-center justify-center p-4">
                        <div
                          className="font-display text-2xl font-bold tracking-tight"
                          style={{ color: tpl.palette[0] === '#0f0f1a' || tpl.palette[0] === '#1e293b' || tpl.palette[0] === '#171717' ? 'white' : tpl.palette[1] }}
                        >
                          Aa
                        </div>
                      </div>
                    </div>
                    <div className="border-t border-border bg-card p-2.5">
                      <div className="truncate text-[11px] font-semibold text-foreground">{tpl.name}</div>
                      <div className="text-[10px] text-muted-foreground">{cat.label}</div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-primary/95 py-2 text-xs font-semibold text-primary-foreground opacity-0 transition group-hover:opacity-100">
                      Use template
                    </div>
                    {tpl.accent && (
                      <div className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-foreground backdrop-blur">
                        New
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
    </DashboardLayout>
  );
}
