/**
 * BrandNavbar — slim brand-scope topbar (v3).
 *
 * In the two-rail architecture, the topbar's job shrinks. The brand switcher
 * has moved into AppRail's top slot. Settings and the user menu have moved
 * into AppRail's bottom slot. What remains is contextual: a breadcrumb of
 * where you are inside this brand, search, and notifications/help.
 *
 * The component is intentionally stateless about the active section — the
 * Brand Context Rail owns that. The breadcrumb here is a derived label only.
 */
import { useMemo } from 'react';
import { Search, HelpCircle, ArrowLeft } from 'lucide-react';
import { NotificationBell } from '@/shared/components/NotificationBell';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { Link, useLocation, useParams } from 'react-router-dom';

interface BrandNavbarProps {
  brandName?: string;
}

/**
 * Resolve a human-friendly section label from the current pathname so the
 * topbar can show "Identity", "Assets", etc. without each page having to wire
 * up a breadcrumb prop.
 */
function resolveSectionLabel(pathname: string, slug: string | undefined): string {
  if (!slug) return 'Brand';
  const prefix = `/b/${slug}`;
  if (!pathname.startsWith(prefix)) return 'Brand';
  const tail = pathname.slice(prefix.length).replace(/^\/+/, '');
  if (!tail) return 'Overview';
  const first = tail.split('/')[0];
  switch (first) {
    case 'identity':
    case 'edit':
      return 'Identity';
    case 'assets':
    case 'dam':
    case 'presentations':
      return 'Assets';
    case 'guidelines':
    case 'brand-guides':
      return 'Guidelines';
    case 'share':
    case 'logo-presentation':
      return 'Share';
    case 'kit':
    case 'brandkit':
      return 'Brand Kit';
    default:
      return first.charAt(0).toUpperCase() + first.slice(1);
  }
}

export function BrandNavbar({ brandName }: BrandNavbarProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'hamza2007ezzat@gmail.com';
  const location = useLocation();
  const { slug } = useParams<{ slug: string }>();

  const sectionLabel = useMemo(
    () => resolveSectionLabel(location.pathname, slug),
    [location.pathname, slug],
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="px-4 sm:px-6 lg:px-8 flex h-14 items-center justify-between gap-4">
        {/* Left: back-to-dashboard + breadcrumb (Brand · Section) -------- */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/dashboard"
            aria-label="Back to dashboard"
            className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <span aria-hidden className="hidden sm:inline-block h-5 w-px bg-border" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-foreground truncate max-w-[160px]">
              {brandName ?? 'Brand'}
            </span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-sm text-muted-foreground truncate">
              {sectionLabel}
            </span>
            {isAdmin && (
              <Badge variant="secondary" className="hidden md:inline-flex ml-2">
                Admin
              </Badge>
            )}
          </div>
        </div>

        {/* Search --------------------------------------------------------- */}
        <div className="hidden md:flex flex-1 justify-center px-8">
          <div className="w-full max-w-sm">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search this brand…"
                className="w-full bg-background pl-8"
              />
            </div>
          </div>
        </div>

        {/* Right actions -------------------------------------------------- */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
          <NotificationBell />
          <Button variant="ghost" size="icon" aria-label="Help">
            <HelpCircle className="h-4 w-4" />
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
