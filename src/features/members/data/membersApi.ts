// ============================================================================
// Every membership write goes through a SECURITY DEFINER RPC — there are no client
// write policies on workspace_members, brand_access or workspace_invitations, by design
// (migration 039). This module is the one place the UI calls them, so error handling and
// the semantic reason vocabulary live in one file rather than in each component.
// ============================================================================
import { supabase } from '@/integrations/supabase/client';
import { parseDenial, reasonMessage, type AccessDenialReason, type DenialDetail } from '@/shared/access';
import type { BrandRole, WorkspaceRole } from '@/shared/access';

/** The generated Supabase types are behind the schema; see accessStore for the note. */
const db = supabase as unknown as {
  rpc: (n: string, a?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  from: (t: string) => any;
};

export class MembersError extends Error {
  constructor(readonly reason: AccessDenialReason, readonly detail: DenialDetail = {}) {
    super(reasonMessage(reason, detail));
    this.name = 'MembersError';
  }
}

/** Postgres raises the reason id as the message; anything else is a genuine fault. */
function rethrow(error: unknown): never {
  const message = (error as { message?: string })?.message ?? '';
  const parsed = parseDenial({ error: message, ...(error as object) });
  if (parsed) throw new MembersError(parsed.reason, parsed.detail);
  throw new Error(message || 'That didn’t work.');
}

export type Member = {
  userId: string;
  role: WorkspaceRole;
  status: 'active' | 'suspended';
  mode: 'all' | 'selected';
  defaultBrandRole: BrandRole | null;
  overrides: { grant?: string[]; deny?: string[] };
  creditsMonthlyCap: number | null;
  joinedAt: string | null;
  name: string;
  email: string;
  avatarUrl: string | null;
  /** Brands granted directly. Empty for `all`-mode members with no per-brand override. */
  grants: { brandId: string; role: BrandRole; overrides?: { grant?: string[]; deny?: string[] } }[];
};

export type Invitation = {
  id: string;
  email: string;
  role: WorkspaceRole;
  mode: 'all' | 'selected';
  defaultBrandRole: BrandRole | null;
  brandGrants: { brandId: string; role?: BrandRole }[];
  invitedBy: string;
  invitedByName: string;
  expiresAt: string;
  createdAt: string;
};

export async function listMembers(workspaceId: string): Promise<Member[]> {
  const [{ data: rows, error }, { data: grants }] = await Promise.all([
    db.from('workspace_members')
      .select('user_id, role, status, brand_access_mode, default_brand_role, capability_overrides, credits_monthly_cap, joined_at')
      .eq('workspace_id', workspaceId),
    db.from('brand_access').select('brand_id, user_id, role, capability_overrides').eq('workspace_id', workspaceId),
  ]);
  if (error) rethrow(error);

  const ids = (rows ?? []).map((r: { user_id: string }) => r.user_id);
  const { data: profiles } = ids.length
    ? await db.from('profiles').select('id, full_name, email, avatar_url').in('id', ids)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));

  return (rows ?? []).map((r: Record<string, unknown>) => {
    const p = byId.get(r.user_id as string) as { full_name?: string; email?: string; avatar_url?: string } | undefined;
    return {
      userId: r.user_id as string,
      role: r.role as WorkspaceRole,
      status: r.status as 'active' | 'suspended',
      mode: r.brand_access_mode as 'all' | 'selected',
      defaultBrandRole: (r.default_brand_role as BrandRole) ?? null,
      overrides: (r.capability_overrides as Member['overrides']) ?? {},
      creditsMonthlyCap: (r.credits_monthly_cap as number) ?? null,
      joinedAt: (r.joined_at as string) ?? null,
      name: p?.full_name || p?.email?.split('@')[0] || 'Someone',
      email: p?.email ?? '',
      avatarUrl: p?.avatar_url ?? null,
      grants: (grants ?? [])
        .filter((g: { user_id: string }) => g.user_id === r.user_id)
        .map((g: Record<string, unknown>) => ({
          brandId: g.brand_id as string,
          role: g.role as BrandRole,
          overrides: g.capability_overrides as Member['overrides'],
        })),
    };
  });
}

export async function listInvitations(workspaceId: string): Promise<Invitation[]> {
  const { data, error } = await db.from('workspace_invitations')
    .select('id, email, role, brand_access_mode, default_brand_role, brand_grants, invited_by, expires_at, created_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) rethrow(error);

  const inviterIds = [...new Set((data ?? []).map((r: { invited_by: string }) => r.invited_by))];
  const { data: profiles } = inviterIds.length
    ? await db.from('profiles').select('id, full_name, email').in('id', inviterIds)
    : { data: [] };
  const byId = new Map((profiles ?? []).map((p: { id: string }) => [p.id, p]));

  return (data ?? [])
    .filter((r: { expires_at: string }) => new Date(r.expires_at) > new Date())
    .map((r: Record<string, unknown>) => {
      const p = byId.get(r.invited_by as string) as { full_name?: string; email?: string } | undefined;
      return {
        id: r.id as string,
        email: r.email as string,
        role: r.role as WorkspaceRole,
        mode: r.brand_access_mode as 'all' | 'selected',
        defaultBrandRole: (r.default_brand_role as BrandRole) ?? null,
        brandGrants: (r.brand_grants as { brandId: string; role?: BrandRole }[]) ?? [],
        invitedBy: r.invited_by as string,
        invitedByName: p?.full_name || p?.email?.split('@')[0] || 'Someone',
        expiresAt: r.expires_at as string,
        createdAt: r.created_at as string,
      };
    });
}

export async function createInvitation(input: {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  mode: 'all' | 'selected';
  defaultBrandRole: BrandRole;
  brandGrants: { brandId: string; role: BrandRole }[];
  overrides?: { grant?: string[]; deny?: string[] };
  message?: string;
}): Promise<{ id: string; token: string }> {
  const { data, error } = await db.rpc('create_invitation', {
    _workspace_id: input.workspaceId,
    _email: input.email,
    _role: input.role,
    _mode: input.mode,
    _default_brand_role: input.defaultBrandRole,
    _brand_grants: input.brandGrants.map((g) => ({ brandId: g.brandId, role: g.role })),
    _overrides: input.overrides ?? {},
    _message: input.message ?? null,
  });
  if (error) rethrow(error);
  const r = data as { id: string; token: string };
  return { id: r.id, token: r.token };
}

export async function resendInvitation(id: string): Promise<{ token: string }> {
  const { data, error } = await db.rpc('resend_invitation', { _id: id });
  if (error) rethrow(error);
  return { token: (data as { token: string }).token };
}

export async function revokeInvitation(id: string): Promise<void> {
  const { error } = await db.rpc('revoke_invitation', { _id: id });
  if (error) rethrow(error);
}

export async function setMemberRole(input: {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  mode?: 'all' | 'selected';
  defaultBrandRole?: BrandRole | null;
  overrides?: { grant?: string[]; deny?: string[] } | null;
}): Promise<void> {
  const { error } = await db.rpc('set_member_role', {
    _workspace_id: input.workspaceId,
    _user_id: input.userId,
    _role: input.role,
    _mode: input.mode ?? null,
    _default_brand_role: input.defaultBrandRole ?? null,
    _overrides: input.overrides ?? null,
  });
  if (error) rethrow(error);
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
  const { error } = await db.rpc('remove_member', { _workspace_id: workspaceId, _user_id: userId });
  if (error) rethrow(error);
}

export async function transferOwnership(workspaceId: string, toUser: string, demoteSelf: boolean): Promise<void> {
  const { error } = await db.rpc('transfer_ownership', {
    _workspace_id: workspaceId, _to_user: toUser, _demote_self: demoteSelf,
  });
  if (error) rethrow(error);
}

export async function grantBrandAccess(input: {
  brandId: string;
  userId: string;
  role: BrandRole;
  overrides?: { grant?: string[]; deny?: string[] };
  allowAi?: boolean | null;
}): Promise<void> {
  const { error } = await db.rpc('grant_brand_access', {
    _brand_id: input.brandId,
    _user_id: input.userId,
    _role: input.role,
    _overrides: input.overrides ?? {},
    _allow_ai: input.allowAi ?? null,
  });
  if (error) rethrow(error);
}

export async function revokeBrandAccess(brandId: string, userId: string): Promise<void> {
  const { error } = await db.rpc('revoke_brand_access', { _brand_id: brandId, _user_id: userId });
  if (error) rethrow(error);
}

export async function checkLimit(workspaceId: string, key: string, adding = 1) {
  const { data, error } = await db.rpc('check_limit', {
    _workspace_id: workspaceId, _key: key, _adding: adding,
  });
  if (error) rethrow(error);
  return data as { allowed: boolean; limit: number; used: number; plan: string; reason: string | null };
}
