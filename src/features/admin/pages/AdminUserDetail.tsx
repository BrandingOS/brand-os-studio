import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminService } from '../services/adminService';
import { canPerformAction } from '@/features/admin/types';
import { useAuth } from '@/features/auth';
import {
  platformRoleLabel,
  platformRoleBadgeVariant,
  accountStatusBadgeVariant,
  type PlatformRole,
} from '@/shared/types/user';
import { planLabel, planBadgeVariant } from '@/shared/utils/plan-gates';
import {
  ArrowLeft,
  Loader2,
  User,
  Shield,
  Calendar,
  Clock,
  Palette,
  Briefcase,
  AlertTriangle,
  Trash2,
  Ban,
  ShieldOff,
  ShieldCheck,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { platformRole } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [brands, setBrands] = useState<any[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  // Inline editing state
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');

  // Admin notes
  const [notes, setNotes] = useState('');

  // Action form state
  const [suspendReason, setSuspendReason] = useState('');
  const [banReason, setBanReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    if (!userId) return;
    try {
      const detail = await adminService.getUserDetail(userId);
      setProfile(detail.profile);
      setUserRole(detail.role);
      setBrands(detail.brands || []);
      setWorkspaces(detail.workspaces || []);
      setActivity(detail.activity || []);
      setNameValue(detail.profile?.full_name || '');
      setNotes(detail.profile?.admin_notes || '');
    } catch (err) {
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!userId) return;
    try {
      await adminService.updateUserProfile(userId, { full_name: nameValue });
      setProfile((p: any) => ({ ...p, full_name: nameValue }));
      toast.success('Name updated');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setEditingName(false);
    }
  };

  const handleRoleChange = async (newRole: string) => {
    if (!userId) return;
    try {
      await adminService.setUserRole(userId, newRole as PlatformRole);
      setUserRole(newRole);
      toast.success(`Role updated to ${platformRoleLabel(newRole as PlatformRole)}`);
    } catch {
      toast.error('Failed to update role');
    }
  };

  const handleSaveNotes = async () => {
    if (!userId) return;
    try {
      await adminService.updateAdminNotes(userId, notes);
      toast.success('Admin notes saved');
    } catch {
      toast.error('Failed to save notes');
    }
  };

  const handleSuspend = async () => {
    if (!userId || !suspendReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setActionLoading(true);
    try {
      await adminService.suspendUser(userId, suspendReason);
      setProfile((p: any) => ({ ...p, status: 'suspended', suspension_reason: suspendReason }));
      setSuspendReason('');
      toast.success('User suspended');
    } catch {
      toast.error('Failed to suspend user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async () => {
    if (!userId || !banReason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    if (!confirm('Are you sure you want to ban this user?')) return;
    setActionLoading(true);
    try {
      await adminService.banUser(userId, banReason);
      setProfile((p: any) => ({ ...p, status: 'banned', suspension_reason: banReason }));
      setBanReason('');
      toast.success('User banned');
    } catch {
      toast.error('Failed to ban user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReinstate = async () => {
    if (!userId) return;
    setActionLoading(true);
    try {
      await adminService.reinstateUser(userId);
      setProfile((p: any) => ({ ...p, status: 'active', suspension_reason: null }));
      toast.success('User reinstated');
    } catch {
      toast.error('Failed to reinstate user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!userId || deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    if (!confirm('This is permanent and cannot be undone. Proceed?')) return;
    setActionLoading(true);
    try {
      await adminService.deleteUser(userId);
      toast.success('User deleted');
      navigate('/admin/users');
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 lg:p-8">
        <p className="text-muted-foreground">User not found.</p>
        <Button variant="ghost" onClick={() => navigate('/admin/users')} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
        </Button>
      </div>
    );
  }

  const status = profile.status || 'active';
  const plan = profile.plan || 'free';
  const initials = (profile.full_name || profile.email || '?')
    .split(' ')
    .map((w: string) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-2xl font-bold font-display">User Detail</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column — Profile Card */}
        <div className="w-full lg:w-80 shrink-0 space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center gap-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {initials}
                  </div>
                )}

                {/* Name — inline editable */}
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <Input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onBlur={handleSaveName}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveName();
                        if (e.key === 'Escape') {
                          setNameValue(profile.full_name || '');
                          setEditingName(false);
                        }
                      }}
                      className="h-8 text-center text-sm"
                      autoFocus
                    />
                    <Button variant="ghost" size="sm" onClick={handleSaveName}>
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNameValue(profile.full_name || '');
                        setEditingName(false);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <button
                    className="font-semibold text-lg flex items-center gap-1 hover:text-primary transition-colors"
                    onClick={() => setEditingName(true)}
                  >
                    {profile.full_name || 'No Name'}
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}

                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>

              <Separator />

              {/* Role */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Role</Label>
                {canPerformAction(platformRole as PlatformRole, 'manage_roles') ? (
                  <Select value={userRole} onValueChange={handleRoleChange}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={platformRoleBadgeVariant(userRole as PlatformRole) as any}>
                    {platformRoleLabel(userRole as PlatformRole)}
                  </Badge>
                )}
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={accountStatusBadgeVariant(status) as any}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Badge>
                  {status !== 'active' && (
                    <Button variant="outline" size="sm" onClick={handleReinstate} disabled={actionLoading}>
                      <ShieldCheck className="h-3 w-3 mr-1" /> Reinstate
                    </Button>
                  )}
                </div>
                {profile.suspension_reason && (
                  <p className="text-xs text-muted-foreground">Reason: {profile.suspension_reason}</p>
                )}
              </div>

              {/* Plan */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Plan</Label>
                <Badge variant={planBadgeVariant(plan) as any}>{planLabel(plan)}</Badge>
              </div>

              <Separator />

              {/* Dates */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                {profile.last_sign_in && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Last sign in {new Date(profile.last_sign_in).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Admin Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  placeholder="Internal notes about this user..."
                  rows={3}
                  className="text-sm"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column — Tabs */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Palette className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{brands.length}</p>
                      <p className="text-xs text-muted-foreground">Brands</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-cyan-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{workspaces.length}</p>
                      <p className="text-xs text-muted-foreground">Workspaces</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Brands Grid */}
              {brands.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Brands</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {brands.map((brand: any) => (
                        <div
                          key={brand.id}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                        >
                          <div
                            className="h-8 w-8 rounded-md shrink-0"
                            style={{ backgroundColor: brand.primary_color || '#6366f1' }}
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{brand.name}</p>
                            <p className="text-xs text-muted-foreground truncate">/{brand.slug}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Workspaces List */}
              {workspaces.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Workspaces</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {workspaces.map((ws: any) => {
                        const workspace = ws.workspaces || ws;
                        return (
                          <div
                            key={workspace.id}
                            className="flex items-center justify-between p-3 rounded-lg border"
                          >
                            <div className="flex items-center gap-3">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium text-sm">{workspace.name}</p>
                                <p className="text-xs text-muted-foreground">/{workspace.slug}</p>
                              </div>
                            </div>
                            {ws.role && (
                              <Badge variant="outline" className="text-xs">
                                {ws.role}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Activity Log</CardTitle>
                </CardHeader>
                <CardContent>
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activity.map((entry: any) => (
                        <div key={entry.id} className="flex gap-3">
                          <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{entry.action}</p>
                            {entry.details && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {typeof entry.details === 'string'
                                  ? entry.details
                                  : JSON.stringify(entry.details)}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(entry.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-6 mt-4">
              {/* Suspend */}
              <Card className="border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-yellow-600">
                    <ShieldOff className="h-4 w-4" /> Suspend User
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Suspending prevents the user from signing in. They can be reinstated later.
                  </p>
                  <Input
                    placeholder="Reason for suspension..."
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleSuspend}
                    disabled={actionLoading || !suspendReason.trim()}
                    className="border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Suspend User
                  </Button>
                </CardContent>
              </Card>

              {/* Ban */}
              <Card className="border-destructive/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <Ban className="h-4 w-4" /> Ban User
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Banning permanently prevents access. The user will see a banned message.
                  </p>
                  <Input
                    placeholder="Reason for ban..."
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleBan}
                    disabled={actionLoading || !banReason.trim()}
                    className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Ban User
                  </Button>
                </CardContent>
              </Card>

              {/* Delete */}
              <Card className="border-destructive/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2 text-destructive">
                    <Trash2 className="h-4 w-4" /> Delete User
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                      <p className="text-sm text-destructive">
                        This action is permanent and cannot be undone. All user data, brands, and
                        workspaces will be deleted.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm">
                      Type <span className="font-mono font-bold">DELETE</span> to confirm
                    </Label>
                    <Input
                      value={deleteConfirm}
                      onChange={(e) => setDeleteConfirm(e.target.value)}
                      placeholder="DELETE"
                      className="font-mono"
                    />
                  </div>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={actionLoading || deleteConfirm !== 'DELETE'}
                  >
                    {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Permanently Delete User
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
