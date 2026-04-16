import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminService, type AdminUser } from '../services/adminService';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { canPerformAction } from '@/features/admin/types';
import { platformRoleLabel, platformRoleBadgeVariant, accountStatusBadgeVariant } from '@/shared/types/user';
import { planLabel, planBadgeVariant } from '@/shared/utils/plan-gates';
import type { PlatformRole, AccountStatus } from '@/shared/types/user';
import {
  Search, Trash2, Loader2, Users, Download, Ban, UserX,
} from 'lucide-react';
import { toast } from 'sonner';

type FilterKey =
  | 'all'
  | 'super_admin' | 'admin' | 'moderator'
  | 'free' | 'pro' | 'agency'
  | 'suspended' | 'banned';

const FILTER_PILLS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'super_admin', label: 'Super Admin' },
  { key: 'admin', label: 'Admin' },
  { key: 'moderator', label: 'Moderator' },
  { key: 'free', label: 'Free' },
  { key: 'pro', label: 'Pro' },
  { key: 'agency', label: 'Agency' },
  { key: 'suspended', label: 'Suspended' },
  { key: 'banned', label: 'Banned' },
];

function relativeTime(dateStr: string | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { platformRole } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadUsers = () => {
    setLoading(true);
    adminService.getUsers()
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);

  // ─── Filtering ──────────────────────────────────────────────
  const filtered = users.filter((u) => {
    // Search
    const q = search.toLowerCase();
    if (q && !u.email.toLowerCase().includes(q) && !(u.fullName || '').toLowerCase().includes(q)) {
      return false;
    }
    // Filter pill
    if (filter === 'all') return true;
    if (['super_admin', 'admin', 'moderator'].includes(filter)) return (u.role || 'user') === filter;
    if (['free', 'pro', 'agency'].includes(filter)) return (u.plan || 'free') === filter;
    if (filter === 'suspended') return u.status === 'suspended';
    if (filter === 'banned') return u.status === 'banned';
    return true;
  });

  // ─── Selection helpers ──────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((u) => u.id)));
    }
  };

  // ─── Actions ────────────────────────────────────────────────
  const handleRoleChange = async (user: AdminUser, newRole: string) => {
    setActionLoading(user.id);
    try {
      await adminService.setUserRole(user.id, newRole as PlatformRole);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`${user.email} is now ${platformRoleLabel(newRole as PlatformRole)}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSuspend = async (user: AdminUser) => {
    const reason = prompt(`Reason for suspending ${user.email}:`);
    if (reason === null) return;
    setActionLoading(user.id);
    try {
      await adminService.suspendUser(user.id, reason);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: 'suspended', suspensionReason: reason } : u));
      toast.success(`${user.email} has been suspended`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    setActionLoading(user.id);
    try {
      await adminService.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setSelected((prev) => { const next = new Set(prev); next.delete(user.id); return next; });
      toast.success(`Deleted ${user.email}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkSuspend = async () => {
    const reason = prompt('Reason for suspending selected users:');
    if (reason === null) return;
    const ids = Array.from(selected);
    for (const id of ids) {
      try {
        await adminService.suspendUser(id, reason);
      } catch { /* continue */ }
    }
    setUsers((prev) => prev.map((u) => selected.has(u.id) ? { ...u, status: 'suspended', suspensionReason: reason } : u));
    setSelected(new Set());
    toast.success(`Suspended ${ids.length} users`);
  };

  const handleExportCSV = () => {
    const csv = adminService.exportUsersCSV(selected.size > 0 ? users.filter((u) => selected.has(u.id)) : users);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-export.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const canManageRoles = canPerformAction(platformRole as PlatformRole, 'manage_roles');

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Users
          </h1>
          <p className="text-muted-foreground mt-1">{users.length} total users</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by email or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {FILTER_PILLS.map((pill) => (
          <Button
            key={pill.key}
            variant={filter === pill.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(pill.key)}
          >
            {pill.label}
          </Button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 border">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleBulkSuspend}>
            <Ban className="h-3.5 w-3.5" /> Suspend Selected
          </Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={handleExportCSV}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        </div>
      )}

      {/* Table */}
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
                  <th className="px-4 py-3 w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Plan</th>
                  <th className="text-left px-4 py-3 font-medium">Last Sign In</th>
                  <th className="text-left px-4 py-3 font-medium">Brands</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(user.id)}
                        onCheckedChange={() => toggleSelect(user.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} className="h-8 w-8 rounded-full" alt="" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {(user.fullName || user.email)[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium">{user.fullName || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={platformRoleBadgeVariant((user.role || 'user') as PlatformRole) as any}>
                        {platformRoleLabel((user.role || 'user') as PlatformRole)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={accountStatusBadgeVariant((user.status || 'active') as AccountStatus) as any}>
                        {user.status || 'active'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={planBadgeVariant(user.plan || 'free') as any}>
                        {planLabel(user.plan || 'free')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {relativeTime(user.lastSignIn)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.brandCount || 0}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {/* Role dropdown */}
                        {canManageRoles && (
                          <Select
                            value={user.role || 'user'}
                            onValueChange={(val) => handleRoleChange(user, val)}
                            disabled={actionLoading === user.id}
                          >
                            <SelectTrigger className="h-8 w-[130px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="moderator">Moderator</SelectItem>
                              <SelectItem value="user">User</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {/* Suspend */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSuspend(user)}
                          disabled={actionLoading === user.id || user.status === 'suspended'}
                          title="Suspend user"
                          className="h-8 w-8 p-0"
                        >
                          {actionLoading === user.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <UserX className="h-4 w-4" />
                          )}
                        </Button>
                        {/* Delete */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          disabled={actionLoading === user.id}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      {search || filter !== 'all' ? 'No users match your filters' : 'No users yet'}
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
