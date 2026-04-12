import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService } from '../services/adminService';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    adminService.getSubscriptions()
      .then(setSubs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handlePlanChange = async (id: string, plan: string) => {
    setActionLoading(id);
    try {
      await adminService.updateSubscriptionPlan(id, plan);
      setSubs((prev) => prev.map((s) => s.id === id ? { ...s, plan } : s));
      toast.success(`Plan updated to ${plan}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'past_due': return 'destructive';
      case 'canceled': return 'secondary';
      case 'trialing': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6" /> Subscriptions
        </h1>
        <p className="text-muted-foreground mt-1">Manage workspace plans and billing</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Workspace</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Stripe Customer</th>
                  <th className="text-left px-4 py-3 font-medium">Period End</th>
                  <th className="text-right px-4 py-3 font-medium">Change Plan</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => (
                  <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      {sub.workspaces?.name || sub.workspace_id?.substring(0, 8)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="capitalize">{sub.plan}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor(sub.status) as any} className="capitalize">
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {sub.stripe_customer_id?.startsWith('pending_')
                        ? 'No Stripe account'
                        : sub.stripe_customer_id?.substring(0, 18) + '...'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sub.current_period_end
                        ? new Date(sub.current_period_end).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Select
                          value={sub.plan}
                          onValueChange={(value) => handlePlanChange(sub.id, value)}
                          disabled={actionLoading === sub.id}
                        >
                          <SelectTrigger className="w-28 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">Free</SelectItem>
                            <SelectItem value="pro">Pro</SelectItem>
                            <SelectItem value="agency">Agency</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
                {subs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No subscriptions yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
