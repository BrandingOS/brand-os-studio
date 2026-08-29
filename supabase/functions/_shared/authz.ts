// ============================================================================
// The authorization kernel for Edge Functions.
//
// A function holding the service-role key bypasses RLS entirely, so it must ask the
// same questions the database would have asked. The rules here are not advice:
//
//   1. A tenant id from the request body is UNTRUSTED. Resolve the workspace from a
//      brand the caller can reach, or verify the membership — never take `workspaceId`
//      on faith. (`check-plan-limit` did exactly that and leaked any workspace's plan,
//      member count and storage usage to any signed-in user.)
//   2. Read with the CALLER's client where you can, so RLS answers for you; use the
//      service role only for what the caller may not do themselves.
//   3. Capability, not role: `requireCapability('ai.generate', …)` is the same question
//      the policies ask, answered by the same function.
//   4. Every failure is a semantic reason id the client already knows how to render
//      (docs/access-architecture/04 §4), not prose.
// ============================================================================
import { createServiceClient, createUserClient } from './supabase.ts';
import { corsHeaders } from './cors.ts';

export type Caller = {
  userId: string;
  email: string | null;
  /** The caller's own client: RLS applies exactly as it does in the browser. */
  client: ReturnType<typeof createUserClient>;
};

export type DenialReason =
  | 'not_authenticated'
  | 'permission_denied'
  | 'brand_access_denied'
  | 'not_found'
  | 'feature_not_in_plan'
  | 'rate_limited'
  | 'insufficient_credits'
  | 'member_credit_cap_reached'
  | 'conflict';

export class AuthzError extends Error {
  constructor(
    readonly reason: DenialReason,
    readonly status: number,
    readonly detail?: Record<string, unknown>,
  ) {
    super(reason);
  }

  toResponse(): Response {
    return new Response(
      JSON.stringify({ error: this.reason, ...(this.detail ?? {}) }),
      { status: this.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
}

/** A verified user, or a 401. Never trust a user id from the body. */
export async function requireCaller(req: Request): Promise<Caller> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ') || authHeader.length < 20) {
    throw new AuthzError('not_authenticated', 401);
  }
  const client = createUserClient(authHeader);
  const { data, error } = await client.auth.getUser();
  if (error || !data?.user) throw new AuthzError('not_authenticated', 401);
  return { userId: data.user.id, email: data.user.email ?? null, client };
}

/**
 * The same question the RLS policies ask, asked through the same function.
 * Evaluated with the SERVICE role because has_capability() reads membership tables the
 * caller cannot see in full — but it resolves for the caller's own uid, which we pass
 * explicitly rather than relying on the ambient session.
 */
export async function hasCapability(
  caller: Caller,
  capability: string,
  workspaceId: string,
  brandId?: string | null,
): Promise<boolean> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('effective_capabilities', {
    _user_id: caller.userId,
    _workspace_id: workspaceId,
    _brand_id: brandId ?? null,
  });
  if (error) return false;
  return Array.isArray(data) && data.includes(capability);
}

export async function requireCapability(
  caller: Caller,
  capability: string,
  workspaceId: string,
  brandId?: string | null,
): Promise<void> {
  if (!(await hasCapability(caller, capability, workspaceId, brandId))) {
    throw new AuthzError('permission_denied', 403, { capability });
  }
}

/**
 * Resolve the workspace a brand belongs to, having proved the caller can reach the brand.
 * The read goes through the CALLER's client, so a brand they cannot see simply is not
 * there — a guessed id yields `not_found`, never a workspace id.
 */
export async function resolveBrandContext(
  caller: Caller,
  brandId: string,
): Promise<{ brandId: string; workspaceId: string }> {
  if (!isUuid(brandId)) throw new AuthzError('not_found', 404);
  const { data, error } = await caller.client
    .from('brands')
    .select('id, workspace_id')
    .eq('id', brandId)
    .maybeSingle();
  if (error || !data?.workspace_id) throw new AuthzError('brand_access_denied', 404);
  return { brandId: data.id, workspaceId: data.workspace_id };
}

/** A workspace the caller is actually a member of. Use when there is no brand in play. */
export async function resolveWorkspaceContext(
  caller: Caller,
  workspaceId: string,
): Promise<{ workspaceId: string }> {
  if (!isUuid(workspaceId)) throw new AuthzError('not_found', 404);
  const { data, error } = await caller.client
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle();
  if (error || !data?.id) throw new AuthzError('permission_denied', 403);
  return { workspaceId: data.id };
}

/**
 * The workspace to bill for a caller who named no brand: their personal workspace, or the
 * oldest one they own. Never a workspace id they sent us.
 */
export async function callerBillingWorkspace(caller: Caller): Promise<string> {
  const { data } = await caller.client
    .from('workspaces')
    .select('id, is_personal, created_at')
    .order('is_personal', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1);
  const ws = data?.[0]?.id;
  if (!ws) throw new AuthzError('permission_denied', 403);
  return ws;
}

/** A plan entitlement, read server-side. `-1` means unlimited. */
export async function entitlement(workspaceId: string, key: string): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('entitlement', { _workspace_id: workspaceId, _key: key });
  if (error) return 0;
  return Number(data ?? 0);
}

export async function requireEntitlement(workspaceId: string, key: string, feature: string): Promise<void> {
  const value = await entitlement(workspaceId, key);
  if (value === 0) throw new AuthzError('feature_not_in_plan', 403, { feature });
}

/**
 * A cron-only endpoint. Fails CLOSED when the secret is unset: a deployment that forgot to
 * configure it must not expose a destructive job to anyone holding the anon key.
 */
export function requireCronSecret(req: Request, envVar = 'PURGE_CRON_SECRET'): void {
  const expected = Deno.env.get(envVar);
  const provided = req.headers.get('x-cron-secret');
  if (!expected || !provided || provided !== expected) {
    throw new AuthzError('permission_denied', 403);
  }
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Wrap a handler so an AuthzError becomes its response rather than a 500. */
export async function withAuthz(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AuthzError) return err.toResponse();
    if (err instanceof Response) return err;
    throw err;
  }
}
