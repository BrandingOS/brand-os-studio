import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { adminService } from '../services/adminService';
import { Settings, Shield, AlertTriangle, Loader2, ShieldX, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const ADMIN_EMAILS = ['brandingos.ai@gmail.com', 'hamza2007ezzat@gmail.com'];

export default function AdminSettings() {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, any>>({});

  // Load platform config on mount
  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false);
      return;
    }
    adminService.getPlatformConfig()
      .then((cfg) => setConfig(cfg))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  // ─── Access gate ──────────────────────────────────────────────
  if (!isSuperAdmin) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="p-8 max-w-md mx-auto text-center">
          <ShieldX className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            This page is restricted to Super Admins only. Contact a Super Admin if you need access to platform settings.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Config helpers ────────────────────────────────────────────
  const updateConfig = async (key: string, value: any) => {
    setSaving(key);
    try {
      await adminService.updatePlatformConfig(key, value);
      setConfig((prev) => ({ ...prev, [key]: value }));
      toast.success(`Setting "${key}" updated`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const maintenanceMode = config.maintenance_mode === true;
  const registrationEnabled = config.registration_enabled !== false; // default to true

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1">Platform configuration and admin management</p>
      </div>

      {/* Section 1: Super Admin Emails */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-red-500" /> Super Admin Emails
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          These emails automatically get admin access when they sign up. Managed via database trigger.
        </p>

        <div className="space-y-3">
          {ADMIN_EMAILS.map((email) => (
            <div key={email} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{email}</span>
                {email === 'brandingos.ai@gmail.com' && (
                  <Badge variant="destructive" className="text-xs">Primary</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/30 border">
          <p className="text-xs text-muted-foreground">
            To modify this list, update the <code className="text-xs bg-muted px-1 py-0.5 rounded">check_admin_email</code> trigger in the Supabase Dashboard.
          </p>
        </div>
      </Card>

      {/* Section 2: Platform Settings */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Platform Settings</h2>

        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, non-admin users see a maintenance page. All admin access remains unaffected.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving === 'maintenance_mode' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={maintenanceMode}
                onCheckedChange={(checked) => updateConfig('maintenance_mode', checked)}
                disabled={saving === 'maintenance_mode'}
              />
            </div>
          </div>

          <Separator />

          {/* User Registration */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">User Registration</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Allow new users to create accounts. Disable to close registration after early access phase.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {saving === 'registration_enabled' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Switch
                checked={registrationEnabled}
                onCheckedChange={(checked) => updateConfig('registration_enabled', checked)}
                disabled={saving === 'registration_enabled'}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Section 3: Danger Zone */}
      <Card className="p-6 border-red-200 dark:border-red-900">
        <h2 className="text-lg font-semibold text-red-500 flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5" /> Danger Zone
        </h2>
        <div className="space-y-4">
          {/* Purge Activity Logs */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Purge Activity Logs</p>
              <p className="text-xs text-muted-foreground">Delete all activity log entries older than 30 days</p>
            </div>
            <Button
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2"
              onClick={() => {
                if (!confirm('Are you sure you want to purge activity logs older than 30 days? This cannot be undone.')) return;
                toast.success('Activity logs purged (placeholder -- not yet wired to backend)');
              }}
            >
              <Trash2 className="h-4 w-4" /> Purge
            </Button>
          </div>

          <Separator />

          {/* Export Platform Data */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export Platform Data</p>
              <p className="text-xs text-muted-foreground">Download a full snapshot of all platform data as JSON</p>
            </div>
            <Button
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 gap-2"
              onClick={() => {
                toast.info('Platform data export is not yet available');
              }}
            >
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
