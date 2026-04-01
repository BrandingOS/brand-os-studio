import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, UserPlus, Shield, Eye, Download, Trash2, Crown } from 'lucide-react';
import { toast } from 'sonner';

type Role = 'Owner' | 'Editor' | 'Exporter' | 'Viewer';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface TeamPanelProps {
  brandId: string;
  brandName: string;
}

const ROLE_CONFIG: Record<Role, { icon: React.ElementType; color: string }> = {
  Owner: { icon: Crown, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  Editor: { icon: Shield, color: 'bg-blue-100 text-blue-800 border-blue-200' },
  Exporter: { icon: Download, color: 'bg-green-100 text-green-800 border-green-200' },
  Viewer: { icon: Eye, color: 'bg-gray-100 text-gray-700 border-gray-200' },
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function TeamPanel({ brandId, brandName }: TeamPanelProps) {
  const [members, setMembers] = useState<TeamMember[]>([
    {
      id: 'owner-1',
      name: 'Dev User',
      email: 'dev@brandos.local',
      role: 'Owner',
    },
  ]);

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('Viewer');

  const handleInvite = () => {
    const email = inviteEmail.trim();
    if (!email) {
      toast.error('Please enter an email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (members.some((m) => m.email === email)) {
      toast.error('This person is already a team member.');
      return;
    }

    const namePart = email.split('@')[0].replace(/[._-]/g, ' ');
    const displayName = namePart
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: displayName,
      email,
      role: inviteRole,
    };

    setMembers((prev) => [...prev, newMember]);
    setInviteEmail('');
    setInviteRole('Viewer');
    setShowInviteForm(false);
    toast.success(`Invited ${email} as ${inviteRole}`);
  };

  const handleRemove = (member: TeamMember) => {
    if (member.role === 'Owner') return;
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    toast.success(`Removed ${member.name} from the team.`);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Team</CardTitle>
              <CardDescription>
                Manage collaborators for {brandName}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setShowInviteForm((v) => !v)}
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invite form */}
        {showInviteForm && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
            <p className="text-sm font-medium">Invite a new team member</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                className="flex-1"
              />
              <Select
                value={inviteRole}
                onValueChange={(val) => setInviteRole(val as Role)}
              >
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Editor">Editor</SelectItem>
                  <SelectItem value="Exporter">Exporter</SelectItem>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleInvite}>
                  Send Invite
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowInviteForm(false);
                    setInviteEmail('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-2">
          {members.map((member) => {
            const roleConfig = ROLE_CONFIG[member.role];
            const RoleIcon = roleConfig.icon;

            return (
              <div
                key={member.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {getInitials(member.name)}
                </div>

                {/* Name and email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {member.email}
                  </p>
                </div>

                {/* Role badge */}
                <Badge
                  variant="outline"
                  className={`gap-1 shrink-0 ${roleConfig.color}`}
                >
                  <RoleIcon className="h-3 w-3" />
                  {member.role}
                </Badge>

                {/* Remove button */}
                {member.role !== 'Owner' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => handleRemove(member)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : (
                  <div className="h-8 w-8 shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <p className="text-xs text-muted-foreground pt-2">
          {members.length} {members.length === 1 ? 'member' : 'members'} on this
          brand
        </p>
      </CardContent>
    </Card>
  );
}
