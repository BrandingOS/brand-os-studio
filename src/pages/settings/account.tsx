import { Container } from '@/shared/ui/Container';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Link } from 'react-router-dom';
import { User, Mail, Shield, AlertTriangle } from 'lucide-react';

export default function AccountSettingsPage() {
  const { user } = useSessionStore();

  const displayName = user?.name || 'Guest';
  const displayEmail = user?.email || 'Not signed in';
  const currentPlan = user?.plan || 'free';
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <Container className="py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

        {/* Profile Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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

        {/* Current Plan Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
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
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-destructive">
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
    </Container>
  );
}
