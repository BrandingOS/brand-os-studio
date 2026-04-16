import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { adminService } from '../services/adminService';
import { FEATURE_FLAG_DEFINITIONS } from '@/features/admin/types';
import { PLAN_FEATURES } from '@/shared/utils/plan-gates';
import { useAuth } from '@/features/auth';
import { Loader2, Flag, Save, RotateCcw, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

type PlanKey = 'free' | 'pro' | 'agency';
const PLANS: PlanKey[] = ['free', 'pro', 'agency'];
const CATEGORIES = ['limits', 'export', 'collaboration', 'tools', 'advanced'] as const;
const CATEGORY_LABELS: Record<string, string> = {
  limits: 'Limits',
  export: 'Export',
  collaboration: 'Collaboration',
  tools: 'Tools',
  advanced: 'Advanced',
};

export default function AdminFeatureFlags() {
  const { isSuperAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  useEffect(() => {
    loadOverrides();
  }, []);

  const loadOverrides = async () => {
    try {
      const data = await adminService.getFeatureFlagOverrides();
      setOverrides(data);
    } catch {
      toast.error('Failed to load feature flag overrides');
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="p-6 lg:p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <ShieldAlert className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Only super admins can manage feature flags. Contact a super admin if you need access.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  // Get value: override -> default
  const getValue = (flagKey: string, plan: PlanKey) => {
    const overrideKey = `${plan}.${flagKey}`;
    if (overrideKey in overrides) return overrides[overrideKey];
    const defaults = PLAN_FEATURES[plan] as Record<string, any>;
    return defaults[flagKey];
  };

  const setValue = (flagKey: string, plan: PlanKey, value: any) => {
    const overrideKey = `${plan}.${flagKey}`;
    const defaults = PLAN_FEATURES[plan] as Record<string, any>;
    const defaultValue = defaults[flagKey];

    setOverrides((prev) => {
      const next = { ...prev };
      // If value matches default, remove override
      if (value === defaultValue) {
        delete next[overrideKey];
      } else {
        next[overrideKey] = value;
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.saveFeatureFlagOverrides(overrides);
      toast.success('Feature flags saved');
    } catch {
      toast.error('Failed to save feature flags');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all overrides to default plan values?')) return;
    setSaving(true);
    try {
      await adminService.saveFeatureFlagOverrides({});
      setOverrides({});
      toast.success('Feature flags reset to defaults');
    } catch {
      toast.error('Failed to reset feature flags');
    } finally {
      setSaving(false);
    }
  };

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Flag className="h-6 w-6" /> Feature Flags
          </h1>
          <p className="text-muted-foreground">Override plan feature limits and capabilities</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving || !hasOverrides}>
            <RotateCcw className="h-4 w-4 mr-2" /> Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {hasOverrides && (
        <div className="text-sm text-muted-foreground">
          <Badge variant="secondary">{Object.keys(overrides).length}</Badge>{' '}
          active override{Object.keys(overrides).length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Matrix Table grouped by category */}
      {CATEGORIES.map((category) => {
        const flags = FEATURE_FLAG_DEFINITIONS.filter((f) => f.category === category);
        if (flags.length === 0) return null;

        return (
          <Card key={category}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{CATEGORY_LABELS[category]}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium w-1/4">Feature</th>
                      <th className="text-center py-2 px-4 font-medium">Free</th>
                      <th className="text-center py-2 px-4 font-medium">Pro</th>
                      <th className="text-center py-2 px-4 font-medium">Agency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flags.map((flag) => (
                      <tr key={flag.key} className="border-b last:border-0">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{flag.label}</p>
                          <p className="text-xs text-muted-foreground">{flag.description}</p>
                        </td>
                        {PLANS.map((plan) => {
                          const value = getValue(flag.key, plan);
                          const overrideKey = `${plan}.${flag.key}`;
                          const isOverridden = overrideKey in overrides;

                          return (
                            <td key={plan} className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {flag.valueType === 'boolean' ? (
                                  <Switch
                                    checked={!!value}
                                    onCheckedChange={(checked) =>
                                      setValue(flag.key, plan, checked)
                                    }
                                  />
                                ) : (
                                  <Input
                                    type="number"
                                    value={value === Infinity ? '' : (value ?? '')}
                                    placeholder={value === Infinity ? 'Unlimited' : ''}
                                    onChange={(e) => {
                                      const num = e.target.value === '' ? Infinity : Number(e.target.value);
                                      setValue(flag.key, plan, num);
                                    }}
                                    className="h-8 w-24 text-center"
                                  />
                                )}
                                {isOverridden && (
                                  <span className="text-[10px] text-primary font-medium">
                                    overridden
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
