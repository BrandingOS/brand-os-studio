import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { adminService, type AdminWorkspace } from '../services/adminService';
import { Search, Trash2, Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminWorkspaces() {
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    adminService.getWorkspaces()
      .then(setWorkspaces)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (ws: AdminWorkspace) => {
    if (!confirm(`Delete workspace "${ws.name}"? This will delete all brands and data inside it.`)) return;
    setActionLoading(ws.id);
    try {
      await adminService.deleteWorkspace(ws.id);
      setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
      toast.success(`Deleted ${ws.name}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const planColor = (plan: string) => {
    switch (plan) {
      case 'pro': return 'default';
      case 'agency': return 'destructive';
      default: return 'secondary';
    }
  };

  const filtered = workspaces.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.ownerEmail || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" /> Workspaces
        </h1>
        <p className="text-muted-foreground mt-1">{workspaces.length} total workspaces</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workspaces..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
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
                  <th className="text-left px-4 py-3 font-medium">Owner</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-center px-4 py-3 font-medium">Members</th>
                  <th className="text-center px-4 py-3 font-medium">Brands</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ws) => (
                  <tr key={ws.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <span className="font-medium">{ws.name}</span>
                        <p className="text-xs text-muted-foreground">/{ws.slug}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{ws.ownerEmail || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={planColor(ws.plan) as any} className="capitalize">
                        {ws.plan}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">{ws.memberCount}</td>
                    <td className="px-4 py-3 text-center">{ws.brandCount}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(ws.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ws)}
                          disabled={actionLoading === ws.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {actionLoading === ws.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      {search ? 'No workspaces match your search' : 'No workspaces yet'}
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
