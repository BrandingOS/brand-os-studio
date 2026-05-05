/**
 * FeaturesIndexPage — the workspace-level "everything in BrandOS" index.
 *
 * Lists every page and tool in the product, grouped by scope, so:
 *   1. The user can FIND a feature even if it isn't linked from the
 *      AppRail (e.g. Logo Maker — orphaned in the new IA).
 *   2. The user can DECIDE where each orphan should live by seeing the
 *      whole inventory in one place.
 *
 * This is a docs-page-as-product: the route table in App.tsx is the
 * source of truth. When you add a new top-level route, add a new entry
 * here in the same commit so it doesn't become an orphan.
 *
 * Brand-scoped items use the most-recently-loaded brand for their links.
 * If the user has no brands yet, those links route to /dashboard/brands
 * instead so they never land on a 404.
 */
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/features/dashboard/components/DashboardLayout';
import { PageHeader } from '@/shared/ui/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useBrandStore } from '@/shared/store/brandStore';
import {
  Home,
  Building2,
  GraduationCap,
  Wand2,
  LayoutTemplate,
  Store,
  Activity,
  Sparkles,
  CreditCard,
  UserCog,
  Compass,
  Wrench,
  BookOpen,
  FolderOpen,
  Palette,
  Image as ImageIcon,
  Presentation,
  MessageSquare,
  BarChart3,
  CheckSquare,
  Settings,
  Layers,
  PenTool,
  Globe,
  Eye,
  Users,
  Package,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';

type FeatureStatus = 'linked' | 'orphan' | 'deep' | 'experiment' | 'public';

interface FeatureEntry {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /**
   * Either an absolute path (workspace/admin/public) or a function that
   * builds the path from the active brand's slug. The function form is
   * used for brand-scoped features so the link goes to the user's most-
   * recently-loaded brand.
   */
  href: string | ((brandSlug: string) => string);
  /** Whether this feature requires a brand slug to be useful. */
  needsBrand?: boolean;
  status: FeatureStatus;
}

interface FeatureGroup {
  id: string;
  title: string;
  subtitle: string;
  items: FeatureEntry[];
}

/* ───────────────────────────────────────────────────────────────────── */
/* Recent feature updates — changelog for what shipped recently           */
/* ───────────────────────────────────────────────────────────────────── */

interface RecentUpdate {
  id: string;
  feature: string;
  description: string;
  path?: string;
  firstDate: string;
  lastUpdate: string;
  phase: string;
  status: 'shipped' | 'beta' | 'in-progress';
}

const RECENT_UPDATES: RecentUpdate[] = [
  { id: 'fabric-renderer', feature: 'Fabric.js Template Renderer', description: 'Converts variable templates to Fabric.js canvas objects for editing + high-res export. Round-trip extract support.', path: '/templates/builder', firstDate: '2026-04-11', lastUpdate: '2026-04-11', phase: 'Phase E', status: 'shipped' },
  { id: 'quality-pass', feature: 'Quality Pass — 88 Tests', description: 'Comprehensive test suite: DAM utils, variable map, notifications, analytics, activity service.', path: '/dashboard/features', firstDate: '2026-04-11', lastUpdate: '2026-04-11', phase: 'Quality', status: 'shipped' },
  { id: 'template-builder', feature: 'Template Builder', description: 'Visual no-code template creation with variable binding, live brand preview, and element library.', path: '/templates/builder', firstDate: '2026-04-11', lastUpdate: '2026-04-11', phase: 'Phase D', status: 'shipped' },
  { id: 'variable-templates', feature: 'Variable Template System', description: 'Core engine for auto-adaptive templates. Every design bound to brand variables. 18 tests passing.', path: '/templates', firstDate: '2026-04-11', lastUpdate: '2026-04-11', phase: 'Phase A-C', status: 'shipped' },
  { id: 'perf-phase12', feature: 'Performance & CI/CD', description: 'Bundle splitting (3.5MB→755KB), lazy loading, GitHub Actions pipeline, error boundaries.', path: '/dashboard/features', firstDate: '2026-04-11', lastUpdate: '2026-04-11', phase: 'Phase 12', status: 'shipped' },
  { id: 'share-phase11', feature: 'Share Enhancements', description: 'Visibility toggle, embed code, brand portal link, 6-section share hub.', path: (s: string) => `/b/${s}/share`, firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 11', status: 'shipped' },
  { id: 'learn-phase10', feature: 'Learn Hub', description: '8 lessons with real content, progress tracking, lesson reader.', path: '/learn', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 10', status: 'shipped' },
  { id: 'analytics-phase9', feature: 'Analytics & Brand Health', description: 'Brand Health Score (SVG ring), WCAG contrast analysis, 12-item completeness checklist.', path: (s: string) => `/b/${s}/analytics`, firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 9', status: 'shipped' },
  { id: 'dam-phase8', feature: 'DAM Upgrade', description: 'Real Supabase storage, smart category detection, bulk operations, lightbox enhancements.', path: (s: string) => `/b/${s}/folders`, firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 8', status: 'shipped' },
  { id: 'marketplace-phase7', feature: 'Marketplace & Templates', description: 'Brand templates page, curated collections, saved templates store, featured packs.', path: '/templates', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 7', status: 'shipped' },
  { id: 'collab-phase6', feature: 'Collaboration', description: 'Activity feed, notification bell, comments on guidelines + assets, team + approvals logging.', path: '/dashboard/activity', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 6', status: 'shipped' },
  { id: 'settings-phase5', feature: 'Settings Hub', description: 'Settings layout with sidebar, workspace settings, members page, wired UserMenu links.', path: '/settings/account', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 5', status: 'shipped' },
  { id: 'wizard-phase4', feature: 'Brand Wizard Enhancement', description: 'Full BrandGuidelines populated on creation from wizard answers.', path: '/onboarding', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 4', status: 'shipped' },
  { id: 'ai-phase3', feature: 'AI Integration', description: 'Claude-powered onboarding parsers, AI logo suggestions, async AI assist.', path: '/dashboard/logo-maker', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 3', status: 'shipped' },
  { id: 'url-phase2', feature: 'URL Migration', description: 'All internal navigation uses /b/:slug short-form (37 files migrated).', path: '/dashboard/features', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 2', status: 'shipped' },
  { id: 'editor-phase1', feature: 'Editor Unification', description: 'EditorChrome + useAutoSave adopted across 5 editors.', path: '/dashboard/logo-maker', firstDate: '2026-04-10', lastUpdate: '2026-04-10', phase: 'Phase 1', status: 'shipped' },
];

/* ───────────────────────────────────────────────────────────────────── */
/* Feature inventory — keep in sync with App.tsx routes                  */
/* ───────────────────────────────────────────────────────────────────── */

const WORKSPACE_FEATURES: FeatureEntry[] = [
  { id: 'home',          title: 'Home',                description: 'Workspace overview and recent activity.',                  icon: Home,           href: '/dashboard',           status: 'linked' },
  { id: 'brands',        title: 'Brands',              description: 'All brands you own or can edit.',                          icon: Building2,      href: '/dashboard/brands',    status: 'linked' },
  { id: 'learn',         title: 'Learn',               description: 'Tutorials, lessons, and brand strategy guides.',           icon: GraduationCap,  href: '/learn',               status: 'linked' },
  { id: 'logo-maker',    title: 'Logo Maker',          description: 'Standalone logo generator. Save outputs to a brand.',      icon: Wand2,          href: '/dashboard/logo-maker', status: 'orphan' },
  { id: 'templates-w',   title: 'Guideline Templates', description: 'Cross-brand catalog of guideline document templates.',     icon: LayoutTemplate, href: '/dashboard/templates', status: 'orphan' },
  { id: 'templates-mp',  title: 'Templates Marketplace', description: 'BrandOS v5 marketplace of community templates.',         icon: Store,          href: '/templates',           status: 'orphan' },
  { id: 'marketplace',   title: 'Marketplace',         description: 'General-purpose marketplace surface.',                     icon: Store,          href: '/marketplace',         status: 'orphan' },
  { id: 'editor',        title: 'Design Editor',       description: 'Canva-style design editor — shapes, templates, text, images, filters, layers.',  icon: PenTool,        href: '/editor',              status: 'linked' },
  { id: 'bento-tool',    title: 'Bento Grid',          description: 'Bento-style collage generator. Templates, shuffle, multi-size export — standalone or brand-powered.',  icon: Layers,         href: '/tools/bento',         status: 'linked' },
  { id: 'activity',      title: 'Activity feed',       description: 'Real-time feed of all brand actions, filterable by type.', icon: Activity,       href: '/dashboard/activity',  status: 'linked' },
  { id: 'dashboard-v2',  title: 'Dashboard v2 landing', description: 'Experimental landing page (BrandOS v5 sprint).',          icon: Sparkles,       href: '/v2',                  status: 'experiment' },
];

const ACCOUNT_FEATURES: FeatureEntry[] = [
  { id: 'account',  title: 'Account settings',   description: 'Profile, password, theme, language.',          icon: UserCog,    href: '/settings/account', status: 'linked' },
  { id: 'plans',    title: 'Plans & billing',    description: 'Subscription tier and payment methods.',       icon: CreditCard, href: '/settings/plans',   status: 'linked' },
];

const BRAND_FEATURES: FeatureEntry[] = [
  { id: 'overview',     title: 'Overview',     description: 'Brand at-a-glance and jumping-off point.',         icon: Compass,    href: (s) => `/b/${s}`,             status: 'linked',  needsBrand: true },
  { id: 'setup',        title: 'Setup',        description: 'Edit logos, colors, and type with live preview.',  icon: Wrench,     href: (s) => `/b/${s}/identity`,    status: 'linked',  needsBrand: true },
  { id: 'identity',     title: 'Identity',     description: 'Tabbed identity hub: logo, colors, type, voice.',  icon: Sparkles,   href: (s) => `/b/${s}/identity`,    status: 'linked',  needsBrand: true },
  { id: 'guidelines',   title: 'Guidelines',   description: 'The brand book — strategy through applications.', icon: BookOpen,   href: (s) => `/b/${s}/guidelines`,  status: 'linked',  needsBrand: true },
  { id: 'folders',      title: 'Folders',      description: 'Brand asset library — logos, photos, icons.',     icon: FolderOpen, href: (s) => `/b/${s}/folders`,     status: 'linked',  needsBrand: true },
  { id: 'kit',          title: 'Brand Kit',    description: 'Unified brand kit hub with bulk export.',         icon: Sparkles,   href: (s) => `/b/${s}/kit`,         status: 'linked',  needsBrand: true },
  { id: 'design',       title: 'Design',       description: 'Brand-scoped launchpad — hero prompt, recents, templates.', icon: Wand2, href: (s) => `/b/${s}/design`, status: 'linked', needsBrand: true },
  { id: 'bento',        title: 'Bento Grid',   description: 'Bentogrids.com-style collage from brand colors, logo, voice, and assets. Shuffle + multi-size export.', icon: Layers, href: (s) => `/b/${s}/bento`, status: 'linked', needsBrand: true },
  { id: 'designs',      title: 'Designs',      description: 'Generated deliverables — print, social, screen.', icon: Palette,    href: (s) => `/b/${s}/assets`,      status: 'linked',  needsBrand: true },
  { id: 'b-templates',  title: 'Brand Templates', description: 'Templates saved to this brand. Coming soon.',  icon: LayoutTemplate, href: (s) => `/b/${s}/templates`, status: 'linked', needsBrand: true },
  { id: 'share',        title: 'Share',        description: 'Visibility toggle, embed code, portal, decks, exports.', icon: Globe,      href: (s) => `/b/${s}/share`,       status: 'linked',  needsBrand: true },
  { id: 'b-settings',   title: 'Brand Settings', description: 'Per-brand configuration v2.',                   icon: Settings,   href: (s) => `/b/${s}/settings`,    status: 'orphan',  needsBrand: true },
];

const BRAND_DEEP_FEATURES: FeatureEntry[] = [
  { id: 'brand-guides',     title: 'Brand Guides editor',    description: 'Fullscreen slide editor. Off-limits — stable export baseline.', icon: PenTool,     href: (s) => `/b/${s}/brand-guides`,        status: 'deep',   needsBrand: true },
  { id: 'guidelines-canvas', title: 'Guidelines Canvas',     description: 'Fullscreen DOM-slide guidelines canvas.',          icon: PenTool,        href: (s) => `/b/${s}/guidelines/canvas`,   status: 'deep',   needsBrand: true },
  { id: 'guidelines-blocks', title: 'Guidelines Blocks',     description: 'Block-based guidelines builder.',                  icon: Layers,         href: (s) => `/b/${s}/guidelines/blocks`,   status: 'deep',   needsBrand: true },
  { id: 'logo-presentation', title: 'Logo Presentation',     description: 'Logo concept presentation deck.',                  icon: Presentation,   href: (s) => `/b/${s}/logo-presentation`,   status: 'orphan', needsBrand: true },
  { id: 'presentations',    title: 'Presentations',          description: 'General presentation builder.',                    icon: Presentation,   href: (s) => `/b/${s}/presentations`,       status: 'orphan', needsBrand: true },
  { id: 'social-media',     title: 'Social Media',           description: 'Per-channel social asset generator.',              icon: ImageIcon,      href: (s) => `/b/${s}/social-media`,        status: 'orphan', needsBrand: true },
  { id: 'analytics',        title: 'Analytics',              description: 'Brand Health Score, WCAG contrast, 12-item checklist.',  icon: BarChart3,      href: (s) => `/b/${s}/analytics`,           status: 'linked', needsBrand: true },
  { id: 'approvals',        title: 'Approvals',              description: 'Review queue for brand artifacts.',                icon: CheckSquare,    href: (s) => `/b/${s}/approvals`,           status: 'orphan', needsBrand: true },
  { id: 'design-editor',    title: 'Design Editor',          description: 'Fullscreen Fabric.js design editor.',              icon: Palette,        href: (s) => `/editor/design/${s}`,                       status: 'deep',   needsBrand: true },
];

const PUBLIC_FEATURES: FeatureEntry[] = [
  { id: 'showcase',  title: 'Public showcase',  description: 'Anonymous brand showcase page.',  icon: Eye,    href: (s) => `/brand/${s}/showcase`, status: 'public', needsBrand: true },
  { id: 'portal',    title: 'Brand Portal v2',  description: 'BrandOS v5 public-facing portal.', icon: Globe, href: (s) => `/p/${s}`,              status: 'public', needsBrand: true },
];

const ADMIN_FEATURES: FeatureEntry[] = [
  { id: 'admin-brands',    title: 'All brands',     description: 'Admin: every brand in the system.', icon: Users,     href: '/dashboard/admin/brands',    status: 'linked' },
  { id: 'admin-analytics', title: 'System analytics', description: 'Admin: cross-brand metrics.',     icon: BarChart3, href: '/dashboard/admin/analytics', status: 'linked' },
];

const ONBOARDING_FEATURES: FeatureEntry[] = [
  { id: 'onboarding',         title: 'Onboarding flow',   description: 'First-run brand creation wizard.', icon: Package,      href: '/onboarding',         status: 'orphan' },
  { id: 'onboarding-preview', title: 'Brand preview',     description: 'Onboarding wizard preview step.',  icon: Eye,          href: '/onboarding/preview', status: 'orphan' },
];

/* ───────────────────────────────────────────────────────────────────── */

export default function FeaturesIndexPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const brands = useBrandStore((s) => s.list);
  const loadAll = useBrandStore((s) => s.loadAll);

  // Lazy-load brands once so brand-scoped feature links can resolve to a
  // real slug. The store caches so this only fetches if it hasn't yet.
  useEffect(() => {
    if (brands.length === 0) {
      loadAll().catch((err) => console.error('FeaturesIndex brand load failed:', err));
    }
  }, [brands.length, loadAll]);

  // Pick the most-recently-updated brand as the target for brand-scoped
  // links. If the user has no brands, brand-scoped links instead route
  // them to /dashboard/brands so they create one first.
  const activeBrandSlug = useMemo(() => {
    if (brands.length === 0) return null;
    const sorted = [...brands].sort((a, b) => {
      const ta = a.updatedAt ? new Date(a.updatedAt as unknown as string).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt as unknown as string).getTime() : 0;
      return tb - ta;
    });
    return sorted[0].slug;
  }, [brands]);

  const handleOpen = (entry: FeatureEntry) => {
    if (entry.needsBrand) {
      if (!activeBrandSlug) {
        navigate('/dashboard/brands');
        return;
      }
      const path =
        typeof entry.href === 'function' ? entry.href(activeBrandSlug) : entry.href;
      navigate(path);
      return;
    }
    if (typeof entry.href === 'function') return; // shouldn't happen for non-brand
    navigate(entry.href);
  };

  const groups: FeatureGroup[] = useMemo(() => {
    const base: FeatureGroup[] = [
      {
        id: 'workspace',
        title: 'Workspace',
        subtitle: 'Tools that live above any single brand.',
        items: WORKSPACE_FEATURES,
      },
      {
        id: 'brand-core',
        title: 'Brand — main pages',
        subtitle: activeBrandSlug
          ? 'Linked to your most recently used brand.'
          : 'Create a brand first to use these.',
        items: BRAND_FEATURES,
      },
      {
        id: 'brand-deep',
        title: 'Brand — deep editors & extras',
        subtitle: 'Specialized surfaces, some intentionally fullscreen.',
        items: BRAND_DEEP_FEATURES,
      },
      {
        id: 'public',
        title: 'Public surfaces',
        subtitle: 'Unauthenticated views of a brand.',
        items: PUBLIC_FEATURES,
      },
      {
        id: 'account',
        title: 'Account',
        subtitle: 'Your personal settings and billing.',
        items: ACCOUNT_FEATURES,
      },
      {
        id: 'onboarding',
        title: 'Onboarding',
        subtitle: 'First-run flows.',
        items: ONBOARDING_FEATURES,
      },
    ];
    if (isAdmin) {
      base.push({
        id: 'admin',
        title: 'Admin',
        subtitle: 'Workspace administration. Visible to admins only.',
        items: ADMIN_FEATURES,
      });
    }
    return base;
  }, [isAdmin, activeBrandSlug]);

  // Roll up the orphan count so the user can see at a glance how many
  // surfaces still need a home in the IA.
  const orphanCount = useMemo(() => {
    return groups.reduce(
      (n, g) => n + g.items.filter((it) => it.status === 'orphan').length,
      0,
    );
  }, [groups]);

  return (
    <DashboardLayout>
      <PageHeader
        title="Features index"
        subtitle={
          orphanCount > 0
            ? `Every page and tool in BrandOS. ${orphanCount} feature${orphanCount === 1 ? '' : 's'} aren't linked from the sidebar yet — find a home for them.`
            : 'Every page and tool in BrandOS, grouped by scope.'
        }
      />

      <div className="space-y-10">
        {/* Recent Updates — what shipped recently */}
        <section>
          <header className="mb-3">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              Recent updates
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              What shipped recently — {RECENT_UPDATES.filter(u => u.status === 'shipped').length} features shipped, {RECENT_UPDATES.filter(u => u.status === 'in-progress').length} in progress
            </p>
          </header>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {RECENT_UPDATES.map((update) => (
              <div
                key={update.id}
                className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm"
              >
                <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${update.status === 'shipped' ? 'bg-emerald-500' : update.status === 'beta' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-foreground">{update.feature}</span>
                    <Badge variant="secondary" className="shrink-0 rounded-full border-0 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-[0.06em] bg-primary/10 text-primary">
                      {update.phase}
                    </Badge>
                    <Badge variant="secondary" className={`shrink-0 rounded-full border-0 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-[0.06em] ${update.status === 'shipped' ? 'bg-emerald-500/10 text-emerald-600' : update.status === 'beta' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'}`}>
                      {update.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{update.description}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground/60">
                    <span>First: {update.firstDate}</span>
                    <span>Updated: {update.lastUpdate}</span>
                    {update.path && <span className="text-primary/60">{typeof update.path === 'string' ? update.path : '(brand-scoped)'}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {groups.map((group) => (
          <section key={group.id}>
            <header className="mb-3">
              <h2 className="text-base font-semibold tracking-tight text-foreground">
                {group.title}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{group.subtitle}</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map((entry) => (
                <FeatureCard
                  key={entry.id}
                  entry={entry}
                  onClick={() => handleOpen(entry)}
                  disabled={entry.needsBrand && !activeBrandSlug}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}

/* ───────────────────────────────────────────────────────────────────── */
/* Inline helpers                                                        */
/* ───────────────────────────────────────────────────────────────────── */

function FeatureCard({
  entry,
  onClick,
  disabled,
}: {
  entry: FeatureEntry;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = entry.icon;
  return (
    <Card
      onClick={disabled ? undefined : onClick}
      className={`group relative p-4 transition-all ${
        disabled
          ? 'opacity-60 cursor-not-allowed'
          : 'cursor-pointer hover:border-primary/40 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground truncate">
              {entry.title}
            </h3>
            <StatusPill status={entry.status} />
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground line-clamp-2">
            {entry.description}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Card>
  );
}

function StatusPill({ status }: { status: FeatureStatus }) {
  const styles: Record<FeatureStatus, { label: string; classes: string }> = {
    linked: {
      label: 'Linked',
      classes: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
    orphan: {
      label: 'Orphan',
      classes: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    deep: {
      label: 'Deep',
      classes: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
    },
    experiment: {
      label: 'Experiment',
      classes: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    },
    public: {
      label: 'Public',
      classes: 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
    },
  };
  const { label, classes } = styles[status];
  return (
    <Badge
      variant="secondary"
      className={`shrink-0 rounded-full border-0 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-[0.06em] ${classes}`}
    >
      {label}
    </Badge>
  );
}
