/**
 * The client half of account deletion (migration 029).
 *
 * Everything goes through SECURITY DEFINER RPCs that read `auth.uid()` and take
 * no user argument, because `account_deletion_requests` has no client write
 * policy at all — there is deliberately no way to schedule someone else's
 * deletion or to backdate a purge.
 *
 * Every function tolerates a pre-029 environment. A missing table or missing
 * function answers `{ available: false }` rather than throwing, and the whole
 * Danger-Zone control hides itself — the same posture
 * SupabaseKitStateRepository has toward a missing brand_kit_state, and what
 * makes the down migration safe.
 */
import { supabase } from '@/integrations/supabase/client';

// The generated Supabase types stop at ~migration 008, so neither the table nor
// the RPCs are typed. Same untyped-accessor workaround as `designs` (015) and
// `brand_kit_state` (018). Remove when types.ts is regenerated.
const db = () => supabase as any;

export interface PendingDeletion {
  id: string;
  purgeAfter: string;
  requestedAt: string;
  graceDays: number;
}

export interface DeletionPreview {
  graceDays: number;
  workspacesDeleted: number;
  workspacesTransferred: number;
  transferTargets: { workspaceId: string; newOwnerEmail: string | null }[];
  brandsDeleted: number;
  brandNames: string[];
  designsDeleted: number;
  assetsDeleted: number;
  imageProjectsDeleted: number;
  creditsForfeited: number;
}

type PgError = { code?: string; message?: string } | null;

/**
 * True when the error means "029 is not deployed here" rather than "something
 * went wrong". PostgREST reports a missing FUNCTION as PGRST202 and a missing
 * TABLE as PGRST205; Postgres itself uses 42P01 / 42883.
 */
function isNotDeployed(error: PgError): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (['42P01', '42883', 'PGRST202', 'PGRST205'].includes(code)) return true;
  return /could not find the (function|table)|does not exist/i.test(error.message ?? '');
}

export type DeletionState =
  | { available: false }
  | { available: true; pending: PendingDeletion | null };

/** Read the caller's own live request, if any. Uses the RLS SELECT policy. */
export async function fetchDeletionState(): Promise<DeletionState> {
  const { data, error } = await db()
    .from('account_deletion_requests')
    .select('id, purge_after, requested_at, grace_days, status')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })
    .limit(1);

  if (isNotDeployed(error)) return { available: false };
  if (error) {
    // A transient failure must not hide a real pending deletion, but it also
    // must not invent one. Report "no pending" and let the next load retry.
    console.warn('[deletion] could not read state:', error.message);
    return { available: true, pending: null };
  }

  const row = data?.[0];
  if (!row) return { available: true, pending: null };
  return {
    available: true,
    pending: {
      id: row.id,
      purgeAfter: row.purge_after,
      requestedAt: row.requested_at,
      graceDays: row.grace_days,
    },
  };
}

/** What the confirmation dialog states, computed server-side. */
export async function fetchDeletionPreview(): Promise<DeletionPreview | null> {
  const { data, error } = await db().rpc('account_deletion_preview');
  if (error) {
    console.warn('[deletion] preview failed:', error.message);
    return null;
  }
  return {
    graceDays: data?.graceDays ?? 7,
    workspacesDeleted: data?.workspacesDeleted ?? 0,
    workspacesTransferred: data?.workspacesTransferred ?? 0,
    transferTargets: data?.transferTargets ?? [],
    brandsDeleted: data?.brandsDeleted ?? 0,
    brandNames: data?.brandNames ?? [],
    designsDeleted: data?.designsDeleted ?? 0,
    assetsDeleted: data?.assetsDeleted ?? 0,
    imageProjectsDeleted: data?.imageProjectsDeleted ?? 0,
    creditsForfeited: Number(data?.creditsForfeited ?? 0),
  };
}

/** Schedule the deletion. Idempotent server-side: asking twice never moves the date. */
export async function requestAccountDeletion(reason?: string): Promise<PendingDeletion> {
  const { data, error } = await db().rpc('request_account_deletion', {
    _reason: reason ?? null,
  });
  if (error) throw new Error(error.message);
  return {
    id: data.id,
    purgeAfter: data.purge_after,
    requestedAt: data.requested_at,
    graceDays: data.grace_days,
  };
}

/** Call it back. Only a `pending` request can be cancelled. */
export async function cancelAccountDeletion(): Promise<void> {
  const { error } = await db().rpc('cancel_account_deletion');
  if (error) throw new Error(error.message);
}

/** "in 6 days" / "tomorrow" / "today", for the banner and the dialog. */
export function daysUntil(iso: string): number {
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

export function formatPurgeDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'soon';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}
