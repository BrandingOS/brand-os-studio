import { useEffect, useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminService, type EarlyAccessEntry } from '../services/adminService';
import {
  Search, CheckCircle2, XCircle, Mail, Trash2, Loader2,
  Download, UserPlus, Clock, CheckCheck, X,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminEarlyAccess() {
  const [entries, setEntries] = useState<EarlyAccessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadEntries = () => {
    setLoading(true);
    adminService.getEarlyAccess({ status: statusFilter })
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadEntries(); }, [statusFilter]);

  const filtered = entries.filter((e) =>
    e.email.toLowerCase().includes(search.toLowerCase()) ||
    (e.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.role || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleApprove = async (entry: EarlyAccessEntry) => {
    setActionLoading(entry.id);
    try {
      await adminService.approveEarlyAccess(entry.id);
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: 'approved' } : e));
      toast.success(`Approved ${entry.email}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (entry: EarlyAccessEntry) => {
    setActionLoading(entry.id);
    try {
      await adminService.rejectEarlyAccess(entry.id);
      setEntries((prev) => prev.map((e) => e.id === entry.id ? { ...e, status: 'rejected' } : e));
      toast.success(`Rejected ${entry.email}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvite = async (entry: EarlyAccessEntry) => {
    setActionLoading(`invite-${entry.id}`);
    try {
      await adminService.sendInvite(entry.email);
      toast.success(`Invitation sent to ${entry.email}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (entry: EarlyAccessEntry) => {
    if (!confirm(`Delete ${entry.email} from early access list?`)) return;
    setActionLoading(entry.id);
    try {
      await adminService.deleteEarlyAccess(entry.id);
      setEntries((prev) => prev.filter((e) => e.id !== entry.id));
      toast.success(`Deleted ${entry.email}`);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (status: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    try {
      await adminService.bulkUpdateEarlyAccess(ids, status);
      setEntries((prev) => prev.map((e) => ids.includes(e.id) ? { ...e, status } : e));
      setSelected(new Set());
      toast.success(`${ids.length} entries ${status}`);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleExport = () => {
    const csv = adminService.exportEarlyAccessCSV(filtered);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `early-access-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((e) => e.id)));
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Rejected</Badge>;
      default: return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Pending</Badge>;
    }
  };

  // Stats
  const counts = {
    total: entries.length,
    pending: entries.filter((e) => e.status === 'pending').length,
    approved: entries.filter((e) => e.status === 'approved').length,
    rejected: entries.filter((e) => e.status === 'rejected').length,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserPlus className="h-6 w-6" /> Early Access
          </h1>
          <p className="text-muted-foreground mt-1">Manage early access submissions and send invitations</p>
        </div>
        <Button variant="outline" className="gap-2" onClick={handleExport}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, icon: UserPlus, color: 'text-blue-500' },
          { label: 'Pending', value: counts.pending, icon: Clock, color: 'text-yellow-500' },
          { label: 'Approved', value: counts.approved, icon: CheckCircle2, color: 'text-green-500' },
          { label: 'Rejected', value: counts.rejected, icon: XCircle, color: 'text-red-500' },
        ].map((s) => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <s.icon className={`h-5 w-5 ${s.color}`} />
            <div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters + Bulk Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by email, name, role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleBulkAction('approved')}>
              <CheckCheck className="h-3.5 w-3.5" /> Approve All
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={() => handleBulkAction('rejected')}>
              <X className="h-3.5 w-3.5" /> Reject All
            </Button>
          </div>
        )}
      </div>

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
                      checked={selected.size === filtered.length && filtered.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Interest</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selected.has(entry.id)}
                        onCheckedChange={() => toggleSelect(entry.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{entry.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.name || '-'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{entry.role || '-'}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {entry.testerInterest === 'beta' ? 'Beta Tester' : 'Notify'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{statusBadge(entry.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {entry.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleApprove(entry)}
                              disabled={actionLoading === entry.id}
                              title="Approve"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              onClick={() => handleReject(entry)}
                              disabled={actionLoading === entry.id}
                              title="Reject"
                              className="text-red-500 hover:text-red-600"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {entry.status === 'approved' && (
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => handleSendInvite(entry)}
                            disabled={actionLoading === `invite-${entry.id}`}
                            title="Send Invite Email"
                            className="text-blue-500 hover:text-blue-600"
                          >
                            {actionLoading === `invite-${entry.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => handleDelete(entry)}
                          disabled={actionLoading === entry.id}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      {search ? 'No entries match your search' : 'No early access submissions yet'}
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
