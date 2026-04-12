/**
 * Admin service — full platform access for super admins.
 * All queries rely on admin RLS policies (is_super_admin()).
 */
import { supabase } from '@/integrations/supabase/client';

export interface AdminUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
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

export interface AdminStats {
  totalUsers: number;
  totalBrands: number;
  totalWorkspaces: number;
  totalSubscriptions: { free: number; pro: number; agency: number };
  recentSignups: number;
}

export const adminService = {
  // ─── Users ──────────────────────────────────────────────────
  async getUsers(): Promise<AdminUser[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const roleMap = new Map((roles || []).map((r: any) => [r.user_id, r.role]));

    return (profiles || []).map((p: any) => ({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      role: roleMap.get(p.id) || 'user',
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
  },

  async setUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
    if (role === 'admin') {
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: 'admin' }, { onConflict: 'user_id' });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (error) throw error;
    }
  },

  async deleteUser(userId: string): Promise<void> {
    // Delete profile (cascades to related data via workspace membership)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if (error) throw error;
  },

  // ─── Brands ─────────────────────────────────────────────────
  async getBrands(): Promise<AdminBrand[]> {
    const { data, error } = await supabase
      .from('brands')
      .select(`
        *,
        profiles:user_id (email),
        workspaces:workspace_id (name)
      `)
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
    const { error } = await supabase
      .from('brands')
      .update({ is_public: isPublic })
      .eq('id', id);
    if (error) throw error;
  },

  // ─── Workspaces ─────────────────────────────────────────────
  async getWorkspaces(): Promise<AdminWorkspace[]> {
    const { data: workspaces, error } = await supabase
      .from('workspaces')
      .select(`
        *,
        profiles:owner_id (email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get member counts
    const { data: memberCounts } = await supabase
      .from('workspace_members')
      .select('workspace_id');

    const mcMap = new Map<string, number>();
    (memberCounts || []).forEach((m: any) => {
      mcMap.set(m.workspace_id, (mcMap.get(m.workspace_id) || 0) + 1);
    });

    // Get brand counts
    const { data: brandCounts } = await supabase
      .from('brands')
      .select('workspace_id');

    const bcMap = new Map<string, number>();
    (brandCounts || []).forEach((b: any) => {
      if (b.workspace_id) bcMap.set(b.workspace_id, (bcMap.get(b.workspace_id) || 0) + 1);
    });

    // Get subscriptions
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('workspace_id, plan');

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
      .select(`
        *,
        workspaces:workspace_id (name, slug)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async updateSubscriptionPlan(id: string, plan: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({ plan })
      .eq('id', id);
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
    const [users, brands, workspaces, subs] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('brands').select('*', { count: 'exact', head: true }),
      supabase.from('workspaces').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('plan'),
    ]);

    // Recent signups (last 7 days)
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
    };
  },
};
