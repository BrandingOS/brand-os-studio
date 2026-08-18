import { Card } from '@/shared/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useUiPreference, useSetUiPreference, type UiPreference } from '@/shared/hooks/useUiPreference';
import { Link } from 'react-router-dom';
import { User, Mail, Shield, AlertTriangle, Layout, Sparkles, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const { user } = useSessionStore();
  const uiPreference = useUiPreference();
  const setUiPreference = useSetUiPreference();

  const displayName = user?.name || 'Guest';
  const displayEmail = user?.email || 'Not signed in';
  const currentPlan = user?.plan || 'free';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleSetUiPreference = (next: UiPreference) => {
    if (next === uiPreference) return;
    setUiPreference(next);
    toast.success(
      next === 'studio' ? 'Switched to Studio.' : 'Switched to Classic.',
      {
        description:
          next === 'studio'
            ? 'New brands and brand entry points will use the Studio experience.'
            : 'New brands and brand entry points will use the Classic experience.',
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </h2>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-lg">
            {initials}
          </div>
          <div className="space-y-1">
            <p className="font-medium text-lg">{displayName}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" />
              {displayEmail}
            </p>
          </div>
        </div>
      </Card>

      {/* Interface preference — Studio (canonical) vs Classic (alternate). */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Interface
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the BrandingOS experience for new brand entry points. You
          can switch back any time.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleSetUiPreference('studio')}
            className={
              'group text-left rounded-lg border p-4 transition-all ' +
              (uiPreference === 'studio'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/40')
            }
            aria-pressed={uiPreference === 'studio'}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-medium">Studio</span>
              </div>
              {uiPreference === 'studio' && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Minimal, monochrome chrome with a top segmented nav. Setup ·
              Brand Kit · Guideline · Design · Tools.
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleSetUiPreference('classic')}
            className={
              'group text-left rounded-lg border p-4 transition-all ' +
              (uiPreference === 'classic'
                ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/40')
            }
            aria-pressed={uiPreference === 'classic'}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-primary" />
                <span className="font-medium">Classic</span>
              </div>
              {uiPreference === 'classic' && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  Active
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Denser left-rail layout. Overview · Identity · Templates ·
              Design · Content · Folders · Share.
            </p>
          </button>
        </div>
      </Card>

      {/* Current Plan Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Current Plan
        </h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="capitalize text-sm px-3 py-1">
              {currentPlan}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {currentPlan === 'free' && 'Limited features'}
              {currentPlan === 'pro' && '$19/month'}
              {currentPlan === 'enterprise' && '$49/month'}
            </span>
          </div>
          <Link to="/settings/plans">
            <Button variant="outline" size="sm">
              Manage Plan
            </Button>
          </Link>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-destructive/30">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          Danger Zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting your account is permanent and cannot be undone. All your brands, assets, and
          data will be removed.
        </p>
        <Button variant="destructive" disabled title="Contact support to delete your account">
          Delete Account
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Account deletion is not yet available. Please contact support.
        </p>
      </Card>
    </div>
  );
}
