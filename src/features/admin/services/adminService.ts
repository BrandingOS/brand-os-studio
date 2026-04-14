/**
 * Admin service — full platform access for super admins.
 * All queries rely on admin RLS policies (is_super_admin()).
 */
import { supabase } from '@/integrations/supabase/client';

// ─── Types ────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
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

    const { data: roles } = await supabase.from('user_roles').select('user_id, role');
    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

    // Get workspace memberships for each user
    const { data: memberships } = await supabase.from('workspace_members').select('user_id, workspace_id');
    const wsCountMap = new Map<string, number>();
    (memberships || []).forEach((m: any) => {
      wsCountMap.set(m.user_id, (wsCountMap.get(m.user_id) || 0) + 1);
    });

    // Get brand counts per user
    const { data: brands } = await supabase.from('brands').select('user_id');
    const brandCountMap = new Map<string, number>();
    (brands || []).forEach((b: any) => {
      brandCountMap.set(b.user_id, (brandCountMap.get(b.user_id) || 0) + 1);
    });

    return (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      role: roleMap.get(p.id) || 'user',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      workspaceCount: wsCountMap.get(p.id) || 0,
      brandCount: brandCountMap.get(p.id) || 0,
    }));
  },

  async getUserDetail(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    const { data: workspaces } = await supabase
      .from('workspace_members')
      .select('role, workspaces:workspace_id (id, name, slug)')
      .eq('user_id', userId);

    const { data: brands } = await supabase
      .from('brands')
      .select('id, name, slug, primary_color, created_at')
      .eq('user_id', userId);

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    return { profile, workspaces: workspaces || [], brands: brands || [], role: role?.role || 'user' };
  },

  async updateUserProfile(userId: string, data: { full_name?: string; email?: string }): Promise<void> {
    const { error } = await supabase.from('profiles').update(data).eq('id', userId);
    if (error) throw error;
  },

  async setUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    if (role === 'admin') {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) throw error;
    }
  },

  async deleteUser(userId: string): Promise<void> {
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
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

    const { data: memberCounts } = await supabase.from('workspace_members').select('workspace_id');
    const mcMap = new Map<string, number>();
    (memberCounts || []).forEach((m: any) => {
      mcMap.set(m.workspace_id, (mcMap.get(m.workspace_id) || 0) + 1);
    });

    const { data: brandCounts } = await supabase.from('brands').select('workspace_id');
    const bcMap = new Map<string, number>();
    (brandCounts || []).forEach((b: any) => {
      if (b.workspace_id) bcMap.set(b.workspace_id, (bcMap.get(b.workspace_id) || 0) + 1);
    });

    const { data: subs } = await supabase.from('subscriptions').select('workspace_id, plan');
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
};
