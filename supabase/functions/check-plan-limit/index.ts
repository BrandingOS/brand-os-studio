// ============================================================================
// "May this workspace do one more of these?"
//
// Rewritten for two reasons:
//
//  1. It took `workspaceId` from the request body and never tied it to the caller. The
//     comment said "Verify user is workspace member"; the code only checked that SOMEONE
//     was signed in. Any authenticated user could read any workspace's plan, brand count,
//     member count and storage usage (threat A2).
//  2. It counted usage in TypeScript against a hard-coded PLAN_LIMITS table, so the
//     answer here and the answer the database enforces could disagree. Both now come from
//     `check_limit()`, which is the same function the triggers call.
// ============================================================================
import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  requireCaller,
  resolveWorkspaceContext,
  withAuthz,
  AuthzError,
} from '../_shared/authz.ts';

/** What each action consumes. Unknown actions are allowed: this is a limit check, not a gate. */
const ACTION_TO_KEY: Record<string, string> = {
  create_brand: 'brands',
  add_member: 'seats',
  invite_guest: 'guest_seats',
  upload_asset: 'storage_mb',
  create_share_link: 'share_links',
  create_workspace: 'workspaces.owned',
  export: 'exports_month',
};

Deno.serve((req) =>
  withAuthz(async () => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const caller = await requireCaller(req);
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : '';
    if (!action) throw new AuthzError('not_found', 400, { message: 'action is required' });

    // The workspace must be one the CALLER can see. resolveWorkspaceContext reads it
    // through their own client, so RLS decides, not the body.
    const { workspaceId } = await resolveWorkspaceContext(caller, String(body?.workspaceId ?? ''));

    const key = ACTION_TO_KEY[action];
    if (!key) {
      return json({ allowed: true, action, note: 'no limit applies to this action' });
    }

    const service = createServiceClient();
    const { data, error } = await service.rpc('check_limit', {
      _workspace_id: workspaceId,
      _key: key,
      _adding: Number(body?.adding ?? 1),
    });
    if (error) throw new AuthzError('not_found', 500, { message: error.message });

    // { allowed, limit, used, plan, reason } — `reason` is the semantic id the client maps.
    return json({ ...data, action, metric: key });
  })
);

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
