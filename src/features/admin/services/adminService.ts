/**
 * Admin service — full platform access for super admins.
 * All queries rely on admin RLS policies (is_super_admin()).
 */
import { supabase } from '@/integrations/supabase/client';
import type { PlatformRole } from '@/shared/types/user';
import type { Announcement, AnnouncementFormData, PlatformMetrics, GrowthDataPoint } from '@/features/admin/types';
import { PLAN_PRICING } from '@/shared/utils/plan-gates';

// ─── Types ────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  status: string;
  adminNotes?: string;
  suspensionReason?: string;
  lastSignIn?: string;
  createdAt: string;
  updatedAt: string;
  workspaceCount?: number;
  brandCount?: number;
  plan?: string;
}

export interface AdminBrand {
  id: string;
  name: string;
  slug: string;
  userId: string;
  userEmail?: string;
  workspaceId?: string;
  workspaceName?: string;
  primaryColor: string;
  isPublic: boolean;
  createdAt: string;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  ownerEmail?: string;
  memberCount: number;
  brandCount: number;
  plan: string;
  createdAt: string;
}

export interface EarlyAccessEntry {
  id: string;
  email: string;
  name?: string;
  role?: string;
  testerInterest?: string;
  useCase?: string;
  interestingFeature?: string;
  source?: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalBrands: number;
  totalWorkspaces: number;
  totalSubscriptions: { free: number; pro: number; agency: number };
  recentSignups: number;
  earlyAccess: { total: number; pending: number; approved: number; rejected: number };
}

export const adminService = {
  // ─── Users ──────────────────────────────────────────────────
  async getUsers(): Promise<AdminUser[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const [{ data: roles }, { data: memberships }, { data: brands }, { data: subs }] = await Promise.all([
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('workspace_members').select('user_id, workspace_id'),
      supabase.from('brands').select('user_id'),
      supabase.from('subscriptions').select('workspace_id, plan'),
    ]);

    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

    const wsCountMap = new Map<string, number>();
    (memberships || []).forEach((m: any) => {
      wsCountMap.set(m.user_id, (wsCountMap.get(m.user_id) || 0) + 1);
    });

    const brandCountMap = new Map<string, number>();
    (brands || []).forEach((b: any) => {
      brandCountMap.set(b.user_id, (brandCountMap.get(b.user_id) || 0) + 1);
    });

    // Build user → plan map via workspace memberships + subscriptions
    const wsSubMap = new Map((subs || []).map((s: any) => [s.workspace_id, s.plan]));
    const userPlanMap = new Map<string, string>();
    (memberships || []).forEach((m: any) => {
      const plan = wsSubMap.get(m.workspace_id);
      if (plan && plan !== 'free') {
        userPlanMap.set(m.user_id, plan);
      }
    });

    return (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      role: roleMap.get(p.id) || 'user',
      status: p.status || 'active',
      adminNotes: p.admin_notes,
      suspensionReason: p.suspension_reason,
      lastSignIn: p.last_sign_in,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      workspaceCount: wsCountMap.get(p.id) || 0,
      brandCount: brandCountMap.get(p.id) || 0,
      plan: userPlanMap.get(p.id) || 'free',
    }));
  },

  async getUserDetail(userId: string) {
    const [{ data: profile }, { data: workspaces }, { data: brands }, { data: role }, { data: activity }] =
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('workspace_members').select('role, workspaces:workspace_id (id, name, slug)').eq('user_id', userId),
        supabase.from('brands').select('id, name, slug, primary_color, created_at').eq('user_id', userId),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('activity_log').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
      ]);

    return {
      profile,
      workspaces: workspaces || [],
      brands: brands || [],
      role: role?.role || 'user',
      activity: activity || [],
    };
  },

  async updateUserProfile(userId: string, data: { full_name?: string; email?: string }): Promise<void> {
    const { error } = await supabase.from('profiles').update(data).eq('id', userId);
    if (error) throw error;
  },

  async setUserRole(userId: string, role: PlatformRole): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id' });
    if (error) throw error;
  },

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
  },

  // ─── Account Status ──────────────────────────────────────────
  async suspendUser(userId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'suspended', suspension_reason: reason })
      .eq('id', userId);
    if (error) throw error;
  },

  async banUser(userId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'banned', suspension_reason: reason })
      .eq('id', userId);
    if (error) throw error;
  },

  async reinstateUser(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active', suspension_reason: null })
      .eq('id', userId);
    if (error) throw error;
  },

  async updateAdminNotes(userId: string, notes: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ admin_notes: notes })
      .eq('id', userId);
    if (error) throw error;
  },

  // ─── CSV Export ──────────────────────────────────────────────
  exportUsersCSV(users: AdminUser[]): string {
    const headers = ['Email', 'Name', 'Role', 'Status', 'Plan', 'Brands', 'Workspaces', 'Joined'];
    const rows = users.map((u) => [
      u.email,
      u.fullName || '',
      u.role || 'user',
      u.status,
      u.plan || 'free',
      String(u.brandCount || 0),
      String(u.workspaceCount || 0),
      new Date(u.createdAt).toLocaleDateString(),
    ]);
    return [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
  },

  // ─── Early Access ──────────────────────────────────────────
  async getEarlyAccess(filters?: { status?: string }): Promise<EarlyAccessEntry[]> {
    let query = supabase
      .from('early_access')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map((e: any) => ({
      id: e.id,
      email: e.email,
      name: e.name,
      role: e.role,
      testerInterest: e.tester_interest,
      useCase: e.use_case,
      interestingFeature: e.interesting_feature,
      source: e.source,
      status: e.status || 'pending',
      adminNotes: e.admin_notes,
      createdAt: e.created_at,
    }));
  },

  async approveEarlyAccess(id: string): Promise<void> {
    const { error } = await supabase
      .from('early_access')
      .update({ status: 'approved' })
      .eq('id', id);
    if (error) throw error;
  },

  async rejectEarlyAccess(id: string): Promise<void> {
    const { error } = await supabase
      .from('early_access')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) throw error;
  },

  async bulkUpdateEarlyAccess(ids: string[], status: string): Promise<void> {
    const { error } = await supabase
      .from('early_access')
      .update({ status })
      .in('id', ids);
    if (error) throw error;
  },

  async addAdminNote(id: string, note: string): Promise<void> {
    const { error } = await supabase
      .from('early_access')
      .update({ admin_notes: note })
      .eq('id', id);
    if (error) throw error;
  },

  async sendInvite(email: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('admin-invite', {
      body: { email },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  },

  async deleteEarlyAccess(id: string): Promise<void> {
    const { error } = await supabase.from('early_access').delete().eq('id', id);
    if (error) throw error;
  },

  exportEarlyAccessCSV(entries: EarlyAccessEntry[]): string {
    const headers = ['Email', 'Name', 'Role', 'Interest', 'Status', 'Date'];
    const rows = entries.map((e) => [
      e.email,
      e.name || '',
      e.role || '',
      e.testerInterest || '',
      e.status,
      new Date(e.createdAt).toLocaleDateString(),
    ]);
    return [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
  },

  // ─── Brands ─────────────────────────────────────────────────
  async getBrands(): Promise<AdminBrand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select(`*, profiles:user_id (email), workspaces:workspace_id (name)`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      userId: b.user_id,
      userEmail: b.profiles?.email,
      workspaceId: b.workspace_id,
      workspaceName: b.workspaces?.name,
      primaryColor: b.primary_color,
      isPublic: b.is_public || false,
      createdAt: b.created_at,
    }));
  },

  async deleteBrand(id: string): Promise<void> {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleBrandPublic(id: string, isPublic: boolean): Promise<void> {
    const { error } = await supabase.from('brands').update({ is_public: isPublic }).eq('id', id);
    if (error) throw error;
  },

  async transferBrand(brandId: string, newWorkspaceId: string): Promise<void> {
    const { error } = await supabase
      .from('brands')
      .update({ workspace_id: newWorkspaceId })
      .eq('id', brandId);
    if (error) throw error;
  },

  // ─── Workspaces ─────────────────────────────────────────────
  async getWorkspaces(): Promise<AdminWorkspace[]> {
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select(`*, profiles:owner_id (email)`)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const [{ data: memberCounts }, { data: brandCounts }, { data: subs }] = await Promise.all([
      supabase.from('workspace_members').select('workspace_id'),
      supabase.from('brands').select('workspace_id'),
      supabase.from('subscriptions').select('workspace_id, plan'),
    ]);

    const mcMap = new Map<string, number>();
    (memberCounts || []).forEach((m: any) => {
      mcMap.set(m.workspace_id, (mcMap.get(m.workspace_id) || 0) + 1);
    });

    const bcMap = new Map<string, number>();
    (brandCounts || []).forEach((b: any) => {
      if (b.workspace_id) bcMap.set(b.workspace_id, (bcMap.get(b.workspace_id) || 0) + 1);
    });

    const subMap = new Map((subs || []).map((s: any) => [s.workspace_id, s.plan]));

    return (workspaces || []).map((w: any) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      ownerId: w.owner_id,
      ownerEmail: w.profiles?.email,
      memberCount: mcMap.get(w.id) || 0,
      brandCount: bcMap.get(w.id) || 0,
      plan: subMap.get(w.id) || 'free',
      createdAt: w.created_at,
    }));
  },

  async deleteWorkspace(id: string): Promise<void> {
    const { error } = await supabase.from('workspaces').delete().eq('id', id);
    if (error) throw error;
  },

  // ─── Subscriptions ──────────────────────────────────────────
  async getSubscriptions() {
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`*, workspaces:workspace_id (name, slug)`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateSubscriptionPlan(id: string, plan: string): Promise<void> {
    const { error } = await supabase.from('subscriptions').update({ plan }).eq('id', id);
    if (error) throw error;
  },

  // ─── Activity ───────────────────────────────────────────────
  async getActivity(limit = 100) {
    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  },

  // ─── Stats ──────────────────────────────────────────────────
  async getStats(): Promise<AdminStats> {
    const [users, brands, workspaces, subs, earlyAll, earlyPending, earlyApproved, earlyRejected] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('workspaces').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('plan'),
      supabase.from('early_access').select('*', { count: 'exact', head: true }),
      supabase.from('early_access').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('early_access').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('early_access').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    ]);

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { count: recentCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    const planCounts = { free: 0, pro: 0, agency: 0 };
    (subs.data || []).forEach((s: any) => {
      if (s.plan in planCounts) planCounts[s.plan as keyof typeof planCounts]++;
    });

    return {
      totalUsers: users.count || 0,
      totalBrands: brands.count || 0,
      totalWorkspaces: workspaces.count || 0,
      totalSubscriptions: planCounts,
      recentSignups: recentCount || 0,
      earlyAccess: {
        total: earlyAll.count || 0,
        pending: earlyPending.count || 0,
        approved: earlyApproved.count || 0,
        rejected: earlyRejected.count || 0,
      },
    };
  },

  // ─── Reports & Metrics ──────────────────────────────────────
  async getPlatformMetrics(): Promise<PlatformMetrics> {
    const [{ count: totalUsers }, { count: totalBrands }, { count: totalWorkspaces }, { data: subs }] =
      await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('brands').select('*', { count: 'exact', head: true }),
        supabase.from('workspaces').select('*', { count: 'exact', head: true }),
        supabase.from('subscriptions').select('plan'),
      ]);

    const planCounts: Record<string, number> = { free: 0, pro: 0, agency: 0 };
    (subs || []).forEach((s: any) => {
      if (s.plan in planCounts) planCounts[s.plan]++;
    });

    const mrr = (planCounts.pro * PLAN_PRICING.pro) + (planCounts.agency * PLAN_PRICING.agency);

    const { count: earlyTotal } = await supabase.from('early_access').select('*', { count: 'exact', head: true });
    const { count: earlyApproved } = await supabase.from('early_access').select('*', { count: 'exact', head: true }).eq('status', 'approved');

    const users = totalUsers || 0;
    const brands = totalBrands || 0;

    return {
      totalUsers: users,
      totalBrands: brands,
      totalWorkspaces: totalWorkspaces || 0,
      mrr,
      conversionRate: earlyTotal ? ((earlyApproved || 0) / earlyTotal) * 100 : 0,
      avgBrandsPerUser: users > 0 ? Math.round((brands / users) * 10) / 10 : 0,
      planDistribution: Object.entries(planCounts).map(([plan, count]) => ({ plan, count })),
    };
  },

  async getGrowthData(days: number): Promise<GrowthDataPoint[]> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: users }, { data: brands }, { data: workspaces }] = await Promise.all([
      supabase.from('profiles').select('created_at').gte('created_at', since).order('created_at'),
      supabase.from('brands').select('created_at').gte('created_at', since).order('created_at'),
      supabase.from('workspaces').select('created_at').gte('created_at', since).order('created_at'),
    ]);

    // Group by date
    const dateMap = new Map<string, { users: number; brands: number; workspaces: number }>();
    for (let i = 0; i < days; i++) {
      const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dateMap.set(key, { users: 0, brands: 0, workspaces: 0 });
    }

    (users || []).forEach((u: any) => {
      const key = u.created_at?.split('T')[0];
      if (key && dateMap.has(key)) dateMap.get(key)!.users++;
    });
    (brands || []).forEach((b: any) => {
      const key = b.created_at?.split('T')[0];
      if (key && dateMap.has(key)) dateMap.get(key)!.brands++;
    });
    (workspaces || []).forEach((w: any) => {
      const key = w.created_at?.split('T')[0];
      if (key && dateMap.has(key)) dateMap.get(key)!.workspaces++;
    });

    return Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));
  },

  async getTopUsers(limit: number): Promise<AdminUser[]> {
    const users = await adminService.getUsers();
    return users.sort((a, b) => (b.brandCount || 0) - (a.brandCount || 0)).slice(0, limit);
  },

  // ─── Announcements ──────────────────────────────────────────
  async getAnnouncements(): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    return (data || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      type: a.type,
      audience: a.audience,
      isActive: a.is_active,
      startsAt: a.starts_at,
      expiresAt: a.expires_at,
      createdBy: a.created_by,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
    }));
  },

  async createAnnouncement(data: AnnouncementFormData): Promise<void> {
    const { error } = await supabase.from('announcements').insert({
      title: data.title,
      body: data.body,
      type: data.type,
      audience: data.audience,
      is_active: data.isActive,
      starts_at: data.startsAt || null,
      expires_at: data.expiresAt || null,
    });
    if (error) throw error;
  },

  async updateAnnouncement(id: string, data: Partial<AnnouncementFormData>): Promise<void> {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.body !== undefined) update.body = data.body;
    if (data.type !== undefined) update.type = data.type;
    if (data.audience !== undefined) update.audience = data.audience;
    if (data.isActive !== undefined) update.is_active = data.isActive;
    if (data.startsAt !== undefined) update.starts_at = data.startsAt || null;
    if (data.expiresAt !== undefined) update.expires_at = data.expiresAt || null;

    const { error } = await supabase.from('announcements').update(update).eq('id', id);
    if (error) throw error;
  },

  async deleteAnnouncement(id: string): Promise<void> {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
  },

  async toggleAnnouncementActive(id: string, isActive: boolean): Promise<void> {
    const { error } = await supabase.from('announcements').update({ is_active: isActive }).eq('id', id);
    if (error) throw error;
  },

  // ─── Platform Config ────────────────────────────────────────
  async getPlatformConfig(): Promise<Record<string, any>> {
    const { data, error } = await supabase.from('platform_config').select('*');
    if (error) throw error;
    const config: Record<string, any> = {};
    (data || []).forEach((c: any) => { config[c.key] = c.value; });
    return config;
  },

  async updatePlatformConfig(key: string, value: any): Promise<void> {
    const { error } = await supabase
      .from('platform_config')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) throw error;
  },

  async getFeatureFlagOverrides(): Promise<Record<string, any>> {
    const config = await adminService.getPlatformConfig();
    return config.feature_overrides || {};
  },

  async saveFeatureFlagOverrides(overrides: Record<string, any>): Promise<void> {
    await adminService.updatePlatformConfig('feature_overrides', overrides);
  },
};
