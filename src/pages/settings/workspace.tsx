import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSessionStore } from '@/shared/store/sessionStore';
import { Building2, Globe, Palette } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkspaceSettingsPage() {
  const { user } = useSessionStore();
  const [workspaceName, setWorkspaceName] = useState(user?.name ? `${user.name}'s Workspace` : 'My Workspace');
  const [domain, setDomain] = useState('');

  const handleSave = () => {
    toast.success('Workspace settings saved');
  };

  return (
    <div className="space-y-6">
      {/* General */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          General
        </h2>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="My Workspace"
            />
            <p className="text-xs text-muted-foreground">
              This name appears in the sidebar and is visible to all workspace members.
            </p>
          </div>
        </div>
      </Card>

      {/* Custom Domain */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Custom Domain
        </h2>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="domain">Brand Guidelines Domain</Label>
            <Input
              id="domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="brand.yourcompany.com"
            />
            <p className="text-xs text-muted-foreground">
              Serve your public brand guidelines from a custom domain.
              Available on Agency plan.
            </p>
          </div>
        </div>
      </Card>

      {/* Defaults */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Defaults
        </h2>
        <div className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Default Export Format</Label>
            <div className="flex gap-2">
              {['PNG', 'SVG', 'PDF'].map((fmt) => (
                <Button key={fmt} variant="outline" size="sm" className="text-xs">
                  {fmt}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Default format when exporting brand assets.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
}
