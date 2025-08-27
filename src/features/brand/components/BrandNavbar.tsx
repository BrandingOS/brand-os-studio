import { Search, Bell, HelpCircle, Settings, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { NavLink } from 'react-router-dom';

interface BrandNavbarProps {
  brandName?: string;
}

export function BrandNavbar({ brandName }: BrandNavbarProps) {
  const { user } = useAuth();
  const isAdmin = user?.email === 'hamza2007ezzat@gmail.com';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-tight flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <SidebarTrigger className="md:hidden" />
          <NavLink to="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </NavLink>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="font-semibold">{brandName || 'Brand Workspace'}</span>
          </div>
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