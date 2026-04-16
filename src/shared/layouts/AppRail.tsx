/**
 * AppRail — the slim, always-visible global navigation rail.
 *
 * This is the single primary navigation surface across the entire product.
 * Its item set is **scope-aware**: the rail shows workspace items when the
 * user is in the dashboard, and brand items when the user is inside a brand.
 * This is intentional — there is no second rail in brand scope. The AppRail
 * itself becomes the brand nav, with the brand switcher pinned to the top
 * slot so the user always knows which brand they are operating on.
 *
 * Layout (top → bottom):
 *
 *   ┌──────┐
 *   │ TOP  │  context slot
 *   │      │    • brand scope    → brand switcher (logo + name)
 *   │      │    • workspace mode → workspace mark
 *   ├──────┤
 *   │ MAIN │  scope-aware nav
 *   │      │    • workspace      → Home · Brands · Learn
 *   │      │    • brand          → Overview · Setup · Guidelines · Folders
 *   │      │                       Brand Kit · Designs · Templates
 *   ├──────┤
 *   │ FOOT │  Settings + UserMenu
 *   └──────┘
 *
 * Width is fixed at 88px so the icon+label stack reads cleanly. We deliberately
 * do NOT use shadcn's collapsible Sidebar primitive here because the rail is
 * not meant to collapse — it is the spine of the product.
 */
import { useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Building2,
  GraduationCap,
  Settings,
  ChevronsUpDown,
  Check,
  Sparkles,
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  Palette,
  LayoutTemplate,
  Compass,
  Wand2,
  LayoutPanelLeft,
  Instagram,
  Image as ImageIcon,
  Type,
  MessageCircle,
  Target,
  Library,
  Layers,
  CheckCircle,
  Presentation,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useBrandStore } from '@/shared/store/brandStore';
import { cn } from '@/lib/utils';

interface RailItem {
  title: string;
  url: string;
  icon: React.ElementType;
  /** When true, only an exact pathname match counts as active. */
  exact?: boolean;
  /** Extra path prefixes that should also activate this item. */
  matchPrefixes?: string[];
  /** Section group label — rendered as a small header before the first item in each group. */
  group?: string;
}

/**
 * Workspace-mode items (the dashboard scope).
 *
 * Intentionally short — the dashboard is a control center, not a deep editor.
 * Templates is brand-scoped now and lives in the brand item set below.
 */
const workspaceItems: RailItem[] = [
  { title: 'Home', url: '/dashboard', icon: Home, exact: true },
  {
    title: 'Brands',
    url: '/dashboard/brands',
    icon: Building2,
    // Don't highlight Brands when the user is INSIDE a brand — the rail is
    // showing brand items at that point and the active item is one of those.
  },
  { title: 'Learn', url: '/learn', icon: GraduationCap },
  // Discoverable home for every feature in the product, including the
  // ones that aren't (yet) linked from this rail. See
  // src/pages/dashboard/features for the inventory.
  { title: 'Features', url: '/dashboard/features', icon: Compass },
];

/**
 * Brand-mode items (the brand scope).
 *
 * Built per-slug so each NavLink targets the correct brand. The list is the
 * primary navigation INSIDE the brand workspace — there is no second rail.
 */
function brandItems(slug: string): RailItem[] {
  return [
    // ── Top-level ──────────────────────────────────────────────
    {
      title: 'Overview',
      url: `/b/${slug}`,
      icon: LayoutDashboard,
      exact: true,
    },

    // ── BRAND CORE — the brand's identity system ──────────────
    {
      title: 'Identity',
      url: `/b/${slug}/identity`,
      icon: Sparkles,
      group: 'Brand',
      matchPrefixes: [`/b/${slug}/edit`, `/b/${slug}/identity`],
    },
    {
      title: 'Logo',
      url: `/b/${slug}/identity?tab=logo`,
      icon: ImageIcon,
      group: 'Brand',
    },
    {
      title: 'Colors',
      url: `/b/${slug}/identity?tab=colors`,
      icon: Palette,
      group: 'Brand',
    },
    {
      title: 'Typography',
      url: `/b/${slug}/identity?tab=typography`,
      icon: Type,
      group: 'Brand',
    },
    {
      title: 'Voice',
      url: `/b/${slug}/identity?tab=voice`,
      icon: MessageCircle,
      group: 'Brand',
    },
    {
      title: 'Strategy',
      url: `/b/${slug}/identity?tab=strategy`,
      icon: Target,
      group: 'Brand',
    },

    // ── ASSETS — brand assets & outputs ───────────────────────
    {
      title: 'Library',
      url: `/b/${slug}/kit`,
      icon: Library,
      group: 'Assets',
      matchPrefixes: [`/b/${slug}/kit`, `/b/${slug}/brandkit`],
    },
    {
      title: 'Folders',
      url: `/b/${slug}/folders`,
      icon: FolderOpen,
      group: 'Assets',
      matchPrefixes: [`/b/${slug}/folders`, `/b/${slug}/dam`],
    },
    {
      title: 'Designs',
      url: `/b/${slug}/assets`,
      icon: Layers,
      group: 'Assets',
      matchPrefixes: [`/b/${slug}/assets`],
    },
    {
      title: 'Approved',
      url: `/b/${slug}/approvals`,
      icon: CheckCircle,
      group: 'Assets',
    },

    // ── CREATE — tools for making things ──────────────────────
    {
      title: 'Templates',
      url: `/b/${slug}/templates`,
      icon: LayoutTemplate,
      group: 'Create',
    },
    {
      title: 'Board',
      url: `/b/${slug}/brand-board`,
      icon: LayoutPanelLeft,
      group: 'Create',
    },
    {
      title: 'Guidelines',
      url: `/b/${slug}/guidelines`,
      icon: BookOpen,
      group: 'Create',
      matchPrefixes: [`/b/${slug}/guidelines`, `/b/${slug}/brand-guides`],
    },
    {
      title: 'Social',
      url: `/b/${slug}/social-media`,
      icon: Instagram,
      group: 'Create',
      matchPrefixes: [`/b/${slug}/social-media`],
    },
    {
      title: 'Presents',
      url: `/b/${slug}/presentations`,
      icon: Presentation,
      group: 'Create',
    },
    {
      title: 'AI Studio',
      url: `/b/${slug}/studio`,
      icon: Wand2,
      group: 'Create',
    },
  ];
}

interface AppRailProps {
  /**
   * When set, the top context slot renders the brand switcher pinned to that
   * brand. When omitted, the slot shows the workspace mark instead.
   */
  brandSlug?: string;
}

export function AppRail({ brandSlug }: AppRailProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const brands = useBrandStore((s) => s.list);
  const loadAll = useBrandStore((s) => s.loadAll);

  // Lazy-load the brand list once so the brand switcher has data.
  useEffect(() => {
    if (brands.length === 0) {
      loadAll().catch((err) => console.error('AppRail brand load failed:', err));
    }
  }, [brands.length, loadAll]);

  const currentBrand = useMemo(
    () => (brandSlug ? brands.find((b) => b.slug === brandSlug) : undefined),
    [brandSlug, brands],
  );

  // Scope-aware item set: brand items when we're inside a brand, workspace
  // items otherwise. The rail's role swaps with the user's context.
  const items = useMemo<RailItem[]>(
    () => (brandSlug ? brandItems(brandSlug) : workspaceItems),
    [brandSlug],
  );

  const isItemActive = (item: RailItem) => {
    // Handle URLs with query params (e.g. /identity?tab=colors)
    const [itemPath, itemQuery] = item.url.split('?');
    if (item.exact) return location.pathname === itemPath && (!itemQuery || location.search.includes(itemQuery));

    // If this item has a ?tab= param, check both path AND query match
    if (itemQuery) {
      return location.pathname === itemPath && location.search.includes(itemQuery);
    }

    if (location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`)) return true;
    return (item.matchPrefixes ?? []).some((p) => location.pathname.startsWith(p));
  };

  /**
   * Section-preserving brand switch — when the user is mid-section and picks
   * another brand, drop them into the same section in the new brand. This
   * matches the behavior we already had on BrandNavbar so muscle memory holds
   * up after the rewrite.
   */
  const handleSwitchBrand = (newSlug: string) => {
    if (!brandSlug) {
      navigate(`/b/${newSlug}`);
      return;
    }
    if (newSlug === brandSlug) return;
    // Match both short-form and legacy prefix
    const shortPrefix = `/b/${brandSlug}`;
    const longPrefix = `/dashboard/brand/${brandSlug}`;
    let tail = '';
    if (location.pathname.startsWith(shortPrefix)) {
      tail = location.pathname.slice(shortPrefix.length).replace(/^\/+/, '');
    } else if (location.pathname.startsWith(longPrefix)) {
      tail = location.pathname.slice(longPrefix.length).replace(/^\/+/, '');
    }
    const target = tail
      ? `/b/${newSlug}/${tail}${location.search || ''}`
      : `/b/${newSlug}`;
    navigate(target);
  };

  return (
    <aside
      aria-label="Global navigation"
      className="hidden md:flex w-[88px] shrink-0 flex-col border-r border-border/60 bg-background"
    >
      {/* TOP — context slot ------------------------------------------------ */}
      <div className="px-2 pt-3 pb-3 border-b border-border/60">
        {currentBrand ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Switch brand — current: ${currentBrand.name}`}
                className="group w-full flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 hover:bg-muted/60 transition-colors"
              >
                <div className="relative">
                  {currentBrand.logo ? (
                    <img
                      src={currentBrand.logo}
                      alt=""
                      className="h-10 w-10 rounded-lg object-contain bg-muted/40 p-1 ring-1 ring-border/60"
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold text-white ring-1 ring-border/60"
                      style={{ backgroundColor: currentBrand.primaryColor }}
                    >
                      {currentBrand.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background border border-border/60 flex items-center justify-center">
                    <ChevronsUpDown className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                </div>
                <span className="text-[10px] font-medium leading-tight text-foreground/80 max-w-[68px] truncate">
                  {currentBrand.name}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="w-64">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Switch brand
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {brands.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Loading brands…
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {brands.map((b) => {
                    const isCurrent = b.slug === brandSlug;
                    return (
                      <DropdownMenuItem
                        key={b.id}
                        onSelect={() => handleSwitchBrand(b.slug)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        {b.logo ? (
                          <img
                            src={b.logo}
                            alt=""
                            className="w-7 h-7 object-contain rounded shrink-0 bg-muted/30 p-0.5"
                          />
                        ) : (
                          <div
                            className="w-7 h-7 rounded shrink-0 flex items-center justify-center text-xs font-bold text-white"
                            style={{ backgroundColor: b.primaryColor }}
                          >
                            {b.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{b.name}</p>
                          {b.tone && (
                            <p className="text-[11px] text-muted-foreground truncate">{b.tone}</p>
                          )}
                        </div>
                        {isCurrent && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navigate('/dashboard/brands')}
                className="cursor-pointer text-sm text-muted-foreground"
              >
                View all brands
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <NavLink
            to="/dashboard"
            aria-label="BrandOS — workspace home"
            className="group w-full flex flex-col items-center gap-1.5 rounded-xl px-1.5 py-2 hover:bg-muted/60 transition-colors"
          >
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-primary to-primary/70 text-white ring-1 ring-border/60">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-semibold leading-tight text-foreground/80">
              BrandOS
            </span>
          </NavLink>
        )}
      </div>

      {/* MAIN — scope-aware nav (workspace items OR brand items) --------- */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-0.5">
        {(() => {
          let lastGroup = '';
          return items.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            const showGroupLabel = !!item.group && item.group !== lastGroup;
            if (item.group) lastGroup = item.group;

            return (
              <div key={item.title}>
                {showGroupLabel && (
                  <div className="px-1 pt-3 pb-1.5">
                    <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground/50">
                      {item.group}
                    </span>
                  </div>
                )}
                <NavLink
                  to={item.url}
                  end={item.exact}
                  className={cn(
                    'group relative flex flex-col items-center gap-1 rounded-xl px-1 py-2 transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-primary"
                    />
                  )}
                  <Icon className="h-4.5 w-4.5" strokeWidth={active ? 2.25 : 1.75} />
                  <span className="text-[9px] font-medium leading-tight">{item.title}</span>
                </NavLink>
              </div>
            );
          });
        })()}
      </nav>

      {/* FOOT — settings + user ------------------------------------------- */}
      <div className="px-2 py-3 border-t border-border/60 flex flex-col items-center gap-2">
        <NavLink
          to="/settings/account"
          aria-label="Settings"
          className={cn(
            'group flex flex-col items-center gap-1 w-full rounded-xl px-1 py-2 transition-colors',
            location.pathname.startsWith('/settings')
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
          )}
        >
          <Settings className="h-5 w-5" strokeWidth={1.75} />
          <span className="text-[10px] font-medium leading-tight">Settings</span>
        </NavLink>
      </div>
    </aside>
  );
}
