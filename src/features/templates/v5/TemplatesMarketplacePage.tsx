/**
 * Templates Marketplace — Canva-style visual template explorer.
 *
 * Hero heading, prominent search, category pills, and large visual
 * category cards. Clean, easy to browse, click to open.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { useBrandStore } from '@/shared/store/brandStore';
import { useTemplateStore } from '@/shared/templates/store/templateStore';
import { DomRenderer } from '@/shared/templates/renderers/DomRenderer';
import { resolveTemplate } from '@/shared/templates/engine/resolve';
import { BrandChooserDialog, type BrandChoice } from '@/features/brand/components/BrandChooserDialog';
import { cn } from '@/lib/utils';
import {
  Search,
  CreditCard,
  Instagram,
  Facebook,
  Presentation,
  FileText,
  ImageIcon,
  Wand2,
  Sparkles,
  Layout,
  PenTool,
  Box,
  Plus,
  type LucideIcon,
} from 'lucide-react';

// ─── Category definitions ─────────────────────────────────────────

interface CategoryDef {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  gradient: string;
  brandkitModule: string;
  blurb: string;
}

const CATEGORIES: CategoryDef[] = [
  { id: 'business-cards',    label: 'Business Cards',  icon: CreditCard,   color: '#f3e8ff', gradient: 'from-purple-200 to-purple-100',   brandkitModule: 'business-cards',  blurb: 'Print-ready professional cards' },
  { id: 'presentations',     label: 'Presentation',    icon: Presentation, color: '#fce7f3', gradient: 'from-pink-200 to-pink-100',     brandkitModule: 'presentations',   blurb: 'Pitch decks & slide packs' },
  { id: 'brand-guides',      label: 'Brand Guide',     icon: FileText,     color: '#dbeafe', gradient: 'from-blue-200 to-blue-100',     brandkitModule: 'brand-guides',    blurb: 'Guideline documents' },
  { id: 'instagram-posts',   label: 'Instagram Post',  icon: Instagram,    color: '#fce7f3', gradient: 'from-rose-200 to-rose-100',     brandkitModule: 'instagram-posts', blurb: 'Square feed templates' },
  { id: 'instagram-stories', label: 'Instagram Story',  icon: Instagram,    color: '#f3e8ff', gradient: 'from-violet-200 to-violet-100', brandkitModule: 'instagram-stories', blurb: 'Vertical story designs' },
  { id: 'facebook-covers',   label: 'Facebook Cover',  icon: Facebook,     color: '#dbeafe', gradient: 'from-sky-200 to-sky-100',       brandkitModule: 'facebook-covers', blurb: 'Wide banner templates' },
  { id: 'profile-icons',     label: 'Profile Icon',    icon: ImageIcon,    color: '#dcfce7', gradient: 'from-green-200 to-green-100',   brandkitModule: 'profile-icons',   blurb: 'Avatars & PFP styles' },
  { id: 'mockups',           label: 'Mockup',          icon: Box,          color: '#fef3c7', gradient: 'from-amber-200 to-amber-100',   brandkitModule: 'mockups',         blurb: 'Product & device mockups' },
  { id: 'invoices',          label: 'Invoice',         icon: FileText,     color: '#f1f5f9', gradient: 'from-slate-200 to-slate-100',   brandkitModule: 'invoices',        blurb: 'Professional billing' },
  { id: 'logo-decks',        label: 'Logo Deck',       icon: Wand2,        color: '#fae8ff', gradient: 'from-fuchsia-200 to-fuchsia-100', brandkitModule: 'logo-presentation', blurb: 'Showcase a logo system' },
];

const CATEGORY_PILLS = [
  { id: 'all',      label: 'All Templates', icon: Sparkles },
  { id: 'business', label: 'Business',      icon: CreditCard },
  { id: 'social',   label: 'Social Media',  icon: Instagram },
  { id: 'branding', label: 'Branding',      icon: PenTool },
  { id: 'print',    label: 'Print & Cards', icon: Layout },
  { id: 'present',  label: 'Presentations', icon: Presentation },
];

const PILL_TO_CATS: Record<string, string[]> = {
  all:      CATEGORIES.map(c => c.id),
  business: ['business-cards', 'invoices', 'presentations'],
  social:   ['instagram-posts', 'instagram-stories', 'facebook-covers', 'profile-icons'],
  branding: ['brand-guides', 'logo-decks'],
  print:    ['business-cards', 'mockups', 'invoices'],
  present:  ['presentations', 'logo-decks'],
};

export default function TemplatesMarketplacePage() {
  const navigate = useNavigate();
  const brands = useBrandStore((s) => s.list);
  const { all: allTemplates } = useTemplateStore();
  const [activePill, setActivePill] = React.useState('all');
  const [search, setSearch] = React.useState('');

  /**
   * Pending category — set when the user clicks a template. The brand chooser
   * opens, and once they pick a destination we route there with this category
   * in hand. Null means no chooser is open.
   */
  const [pendingCategory, setPendingCategory] = React.useState<CategoryDef | null>(null);

  const lastBrand = React.useMemo(
    () => [...brands].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0],
    [brands],
  );

  const variableTemplates = allTemplates();

  const visibleCategories = React.useMemo(() => {
    const allowedIds = PILL_TO_CATS[activePill] || PILL_TO_CATS.all;
    let cats = CATEGORIES.filter(c => allowedIds.includes(c.id));
    if (search.trim()) {
      const q = search.toLowerCase();
      cats = cats.filter(c =>
        c.label.toLowerCase().includes(q) || c.blurb.toLowerCase().includes(q),
      );
    }
    return cats;
  }, [activePill, search]);

  // Open the chooser; actual navigation happens in handleBrandChoice.
  const handleCategoryClick = (cat: CategoryDef) => setPendingCategory(cat);

  const handleBrandChoice = (choice: BrandChoice) => {
    const cat = pendingCategory;
    setPendingCategory(null);
    if (!cat) return;

    if (choice.kind === 'brand') {
      navigate(`/b/${choice.brand.slug}/brandkit/${cat.brandkitModule}`);
      return;
    }
    if (choice.kind === 'standalone') {
      // No brand yet — open the standalone editor. Users can assign to a
      // brand later via the editor's "Save to brand" menu.
      navigate(`/editor?category=${cat.brandkitModule}`);
      return;
    }
    if (choice.kind === 'new') {
      // Use a `?then=` param so the onboarding flow can round-trip back
      // into this template once a brand is created.
      navigate(`/onboarding-brand?then=${encodeURIComponent(`brandkit/${cat.brandkitModule}`)}`);
      return;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* ─── Hero ────────────────────────────────────────────── */}
        <div className="text-center pt-4 pb-2">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
            Templates
          </h1>
        </div>

        {/* ─── Search Bar ──────────────────────────────────────── */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full h-14 rounded-2xl border border-border bg-card pl-12 pr-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-shadow focus:shadow-md"
            />
          </div>
        </div>

        {/* ─── Category Pills ──────────────────────────────────── */}
        <div className="flex justify-center gap-2 flex-wrap px-4">
          {CATEGORY_PILLS.map((pill) => {
            const Icon = pill.icon;
            const active = activePill === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setActivePill(pill.id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card border border-border text-foreground hover:bg-muted/50 hover:border-primary/30',
                )}
              >
                <Icon className="h-4 w-4" />
                {pill.label}
              </button>
            );
          })}
        </div>

        {/* ─── Explore Templates ───────────────────────────────── */}
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground mb-5">
            Explore templates
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {visibleCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat)}
                  className="group relative overflow-hidden rounded-2xl text-left transition-all hover:-translate-y-1 hover:shadow-xl"
                >
                  <div
                    className={`aspect-[4/3] bg-gradient-to-br ${cat.gradient} flex items-end p-4`}
                  >
                    {/* Decorative icon */}
                    <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-30 transition-opacity">
                      <Icon className="h-12 w-12" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground leading-tight">{cat.label}</h3>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Create your own */}
            <button
              onClick={() => navigate('/templates/builder')}
              className="group relative overflow-hidden rounded-2xl text-left transition-all hover:-translate-y-1 hover:shadow-xl border-2 border-dashed border-border hover:border-primary/40"
            >
              <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 p-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">Create your own</span>
              </div>
            </button>
          </div>
        </div>

        {/* ─── Variable Templates (live preview) ───────────────── */}
        {variableTemplates.length > 0 && lastBrand && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  Smart templates
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Auto-adapt to your brand — powered by the variable engine
                </p>
              </div>
              <button
                onClick={() => navigate('/templates/builder')}
                className="text-sm text-primary font-medium hover:underline"
              >
                Create template →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {variableTemplates.map((tpl) => {
                const resolved = resolveTemplate({ template: tpl, brand: lastBrand });
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      const typeMap: Record<string, string> = {
                        'business-card': 'business-cards',
                        'social-post': 'instagram-posts',
                        'social-story': 'instagram-stories',
                        'social-cover': 'facebook-covers',
                        'presentation': 'presentations',
                        'brand-guide': 'brand-guides',
                        'profile-icon': 'profile-icons',
                        'invoice': 'invoices',
                        'mockup': 'mockups',
                      };
                      const module = typeMap[tpl.meta.type] || tpl.meta.type;
                      const cat = CATEGORIES.find(c => c.brandkitModule === module) || CATEGORIES[0];
                      handleCategoryClick(cat);
                    }}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
                  >
                    <div className="overflow-hidden rounded-t-xl">
                      <DomRenderer template={resolved} />
                    </div>
                    <div className="p-3 border-t border-border">
                      <div className="text-xs font-semibold text-foreground truncate">{tpl.meta.name}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{tpl.meta.type.replace(/-/g, ' ')}</div>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-primary/95 py-2.5 text-xs font-semibold text-primary-foreground opacity-0 transition-all group-hover:opacity-100 rounded-b-xl">
                      Use template
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── Stats footer ────────────────────────────────────── */}
        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">
            {variableTemplates.length} smart templates · {CATEGORIES.length} categories · {variableTemplates.length > 0 ? 'Adapts to your brand automatically' : 'More templates coming soon'}
          </p>
        </div>
      </div>

      <BrandChooserDialog
        open={pendingCategory !== null}
        onOpenChange={(open) => !open && setPendingCategory(null)}
        onChoose={handleBrandChoice}
        title={pendingCategory ? `Open "${pendingCategory.label}" in…` : 'Choose a brand'}
        description="Templates live inside a brand so they pick up your colors, fonts, and voice. Start without a brand if you just want a quick design."
      />
    </DashboardLayout>
  );
}
