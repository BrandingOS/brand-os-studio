import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings, Shield, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_EMAILS = ['brandingos.ai@gmail.com', 'hamza2007ezzat@gmail.com'];

export default function AdminSettings() {
  const [newEmail, setNewEmail] = useState('');
  const [adminEmails, setAdminEmails] = useState(ADMIN_EMAILS);
  const [signupEnabled, setSignupEnabled] = useState(true);

  const handleAddEmail = () => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Enter a valid email');
      return;
    }
    if (adminEmails.includes(newEmail)) {
      toast.error('Email already in admin list');
      return;
    }
    setAdminEmails([...adminEmails, newEmail]);
    setNewEmail('');
    toast.success(`${newEmail} added to admin list. Update the check_admin_email trigger in Supabase to apply.`);
  };

  const handleRemoveEmail = (email: string) => {
    if (email === 'brandingos.ai@gmail.com') {
      toast.error('Cannot remove the primary admin');
      return;
    }
    setAdminEmails(adminEmails.filter((e) => e !== email));
    toast.success(`${email} removed. Update the check_admin_email trigger in Supabase to apply.`);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">Platform configuration and admin management</p>
      </div>

      {/* Admin Emails */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-red-500" /> Super Admin Emails
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          These emails automatically get admin access when they sign up.
        </p>

        <div className="space-y-3 mb-4">
          {adminEmails.map((email) => (
            <div key={email} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{email}</span>
                {email === 'brandingos.ai@gmail.com' && (
                  <Badge variant="destructive" className="text-xs">Primary</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveEmail(email)}
                disabled={email === 'brandingos.ai@gmail.com'}
                className="text-destructive hover:text-destructive h-7 w-7 p-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="admin@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleAddEmail} className="gap-1">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </Card>

      {/* Platform Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Platform Settings</h2>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">User Signups</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow new users to create accounts. Disable after early access phase.
              </p>
            </div>
            <Switch
              checked={signupEnabled}
              onCheckedChange={(checked) => {
                setSignupEnabled(checked);
                toast.success(checked ? 'Signups enabled' : 'Signups disabled. Update Supabase auth settings to apply.');
              }}
            />
          </div>

          <div className="border-t pt-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Settings require Supabase Dashboard changes
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Admin email list and signup toggles are defined in the database trigger (check_admin_email function)
                  and Supabase Auth settings. Changes made here are displayed locally — to persist them,
                  update the trigger SQL and auth config in the Supabase Dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card className="p-6 border-red-200 dark:border-red-900">
        <h2 className="text-lg font-semibold text-red-500 mb-4">Danger Zone</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Purge Activity Logs</p>
              <p className="text-xs text-muted-foreground">Delete all activity log entries older than 30 days</p>
            </div>
            <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50">
              Purge
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
