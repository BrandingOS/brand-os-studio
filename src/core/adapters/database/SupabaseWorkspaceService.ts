import { supabase } from '@/integrations/supabase/client';
import type {
  IWorkspaceService,
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
  CreateWorkspaceInput,
} from '@/core/types/services';

export class SupabaseWorkspaceService implements IWorkspaceService {
  async list(): Promise<Workspace[]> {
    // RLS ensures we only get workspaces the user is a member of
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapWorkspace);
  }

  async getById(id: string): Promise<Workspace | null> {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data ? mapWorkspace(data) : null;
  }

  async create(input: CreateWorkspaceInput): Promise<Workspace> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const slug = input.slug || generateSlug(input.name);

    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: input.name,
        slug,
        logo_url: input.logoUrl,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as owner member
    await supabase.from('workspace_members').insert({
      workspace_id: data.id,
      user_id: user.id,
      role: 'owner',
    });

    return mapWorkspace(data);
  }

  async update(id: string, patch: Partial<CreateWorkspaceInput>): Promise<Workspace> {
    const updateData: Record<string, unknown> = {};
    if (patch.name !== undefined) updateData.name = patch.name;
    if (patch.slug !== undefined) updateData.slug = patch.slug;
    if (patch.logoUrl !== undefined) updateData.logo_url = patch.logoUrl;

    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapWorkspace(data);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const { data, error } = await supabase
      .from('workspace_members')
      .select(`
        *,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapMember);
  }

  async addMember(
    workspaceId: string,
    email: string,
    role: WorkspaceRole
  ): Promise<WorkspaceMember> {
    // Look up user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .eq('email', email)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) throw new Error(`No user found with email: ${email}`);

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id: profile.id,
        role,
        invited_by: user?.id,
        invited_at: new Date().toISOString(),
      })
      .select(`
        *,
        profiles:user_id (
          email,
          full_name,
          avatar_url
        )
      `)
      .single();

    if (error) throw error;
    return mapMember(data);
  }

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async updateMemberRole(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole
  ): Promise<void> {
    const { error } = await supabase
      .from('workspace_members')
      .update({ role })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

function mapWorkspace(data: any): Workspace {
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url || undefined,
    ownerId: data.owner_id,
    settings: data.settings || {},
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  };
}

function mapMember(data: any): WorkspaceMember {
  const profile = data.profiles;
  return {
    id: data.id,
    workspaceId: data.workspace_id,
    userId: data.user_id,
    role: data.role,
    invitedBy: data.invited_by || undefined,
    invitedAt: data.invited_at ? new Date(data.invited_at) : undefined,
    joinedAt: new Date(data.joined_at),
    email: profile?.email,
    name: profile?.full_name,
    avatarUrl: profile?.avatar_url,
  };
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}
