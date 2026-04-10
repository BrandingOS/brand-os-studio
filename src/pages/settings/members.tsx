import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Users, Mail, Crown, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function MembersPage() {
  const { user } = useSessionStore();
  const [inviteEmail, setInviteEmail] = useState('');

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    toast.success(`Invitation sent to ${inviteEmail}`);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6">
      {/* Invite */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite Members
        </h2>
        <div className="flex gap-3 max-w-md">
          <div className="flex-1">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              type="email"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <Button onClick={handleInvite} className="gap-1.5">
            <Mail className="h-4 w-4" />
            Invite
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Members can view and edit brands in this workspace. Role management coming soon.
        </p>
      </Card>

      {/* Current Members */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Workspace Members
        </h2>
        <div className="divide-y divide-border">
          {/* Current user — always shown as owner */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                {(user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.name || 'You'}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Crown className="h-3 w-3" />
                Owner
              </Badge>
            </div>
          </div>

          {/* Placeholder for when there are no other members */}
          <div className="py-8 text-center">
            <Users className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">
              No other members yet. Invite someone to collaborate.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
