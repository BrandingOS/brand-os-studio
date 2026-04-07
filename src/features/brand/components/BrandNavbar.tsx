import { useEffect, useMemo } from 'react';
import { Search, Bell, HelpCircle, Settings, ArrowLeft, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useBrandStore } from '@/shared/store/brandStore';

interface BrandNavbarProps {
  brandName?: string;
}

/**
 * Resolve the brand-scoped sub-path for the current location.
 *
 * E.g. for `/dashboard/brand/acme/identity?tab=logo` returns
 * `identity?tab=logo`. For the brand root `/dashboard/brand/acme` returns
 * the empty string. Used by the brand switcher to preserve the user's
 * section when switching brands (User Flow F10 in USER-FLOWS.md).
 */
function getBrandSectionPath(pathname: string, search: string, slug: string | undefined): string {
  if (!slug) return '';
  const prefix = `/dashboard/brand/${slug}`;
  if (!pathname.startsWith(prefix)) return '';
  const rest = pathname.slice(prefix.length).replace(/^\/+/, '');
  return rest + (search || '');
}

export function BrandNavbar({ brandName }: BrandNavbarProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'hamza2007ezzat@gmail.com';

  const navigate = useNavigate();
  const location = useLocation();
  const { slug: currentSlug } = useParams<{ slug: string }>();
  const brands = useBrandStore((s) => s.list);
  const loadAll = useBrandStore((s) => s.loadAll);

  // Lazy-load the brand list once for the switcher.
  useEffect(() => {
    if (brands.length === 0) {
      loadAll().catch((err) => console.error('Brand switcher load failed:', err));
    }
  }, [brands.length, loadAll]);

  const sectionPath = useMemo(
    () => getBrandSectionPath(location.pathname, location.search, currentSlug),
    [location.pathname, location.search, currentSlug],
  );

  const handleSwitchBrand = (newSlug: string) => {
    if (newSlug === currentSlug) return;
    // Preserve the current section when switching brands. If the new brand
    // doesn't have the same leaf, the page itself falls back gracefully —
    // worst case, it 404s and the user navigates manually.
    const target = sectionPath
      ? `/dashboard/brand/${newSlug}/${sectionPath}`
      : `/dashboard/brand/${newSlug}`;
    navigate(target);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <NavLink to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </NavLink>
          {/* Brand switcher — section-preserving (USER-FLOWS.md F10). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50 transition-colors group"
              >
                <Building2 className="h-5 w-5 text-primary shrink-0" />
                <span className="font-semibold text-sm truncate max-w-[200px]">
                  {brandName || 'Brand Workspace'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-xs uppercase tracking-wider text-muted-foreground">
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
                    const isCurrent = b.slug === currentSlug;
                    return (
                      <DropdownMenuItem
                        key={b.id}
                        onSelect={() => handleSwitchBrand(b.slug)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        {b.logo ? (
                          <img
                            src={b.logo}
                            alt={b.name}
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
        </div>

        {/* Search Bar (hidden on mobile) */}
        <div className="hidden md:flex flex-1 justify-center px-8">
          <div className="w-full max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search brand assets..."
                className="w-full bg-background pl-8"
              />
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Mobile Search */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-4 w-4" />
          </Button>

          {/* Action Buttons */}
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon">
            <HelpCircle className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>

          {/* Admin Badge */}
          {isAdmin && (
            <Badge variant="secondary" className="hidden md:flex">
              Admin
            </Badge>
          )}

          <UserMenu />
        </div>
      </div>
    </header>
  );
}