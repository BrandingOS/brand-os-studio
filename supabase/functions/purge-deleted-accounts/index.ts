// ════════════════════════════════════════════════════════════════════════════
// purge-deleted-accounts — the second half of account deletion.
//
// Migration 029 records a request with a purge date `grace_days` out (7 today,
// matching the published policy). This runs daily and erases every request
// whose date has passed.
//
// WHY THIS IS AN EDGE FUNCTION AND NOT pg_cron
//   Two of the steps cannot be done from SQL at all:
//     * deleting the auth user goes through GoTrue's Admin API — deleting
//       auth.users rows by raw SQL bypasses its own bookkeeping.
//     * deleting storage BLOBS. Removing storage.objects rows from SQL orphans
//       the S3 objects forever, which is the opposite of an erasure.
//   Conversely the 20-table relational ordering stays in SQL, in one
//   transaction, rather than being scattered across TypeScript with none.
//
// ORDER: the auth user goes FIRST. That immediately invalidates every session
// so nothing can race the purge, it cascades designs / image_projects / jobs /
// ai_rate_limits away for free, and it makes a retry after a crash idempotent.
// The reverse order would leave a user who can still sign in to an empty
// account if the auth call failed.
//
// Schedule (Supabase dashboard → Edge Functions → Schedule): `20 3 * * *`.
// Twenty past three, twenty minutes after cleanup-onboarding-scratch, so the
// two janitors never contend. This project has no [functions] block in
// config.toml; scheduling is dashboard-side.
//
// Secrets: PURGE_CRON_SECRET (supabase secrets set …).
// ════════════════════════════════════════════════════════════════════════════
import { createServiceClient } from '../_shared/supabase.ts';
import { corsHeaders } from '../_shared/cors.ts';

/** Requests handled per invocation. The rest are picked up by the next run. */
const BATCH = 25;
/** Storage remove() takes a list; keep each call comfortably small. */
const REMOVE_CHUNK = 100;
/** storage.list() page size. */
const LIST_PAGE = 1000;

type Sb = ReturnType<typeof createServiceClient>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function removeInChunks(sb: Sb, bucket: string, names: string[]): Promise<number> {
  let removed = 0;
  for (let i = 0; i < names.length; i += REMOVE_CHUNK) {
    const slice = names.slice(i, i + REMOVE_CHUNK);
    const { error } = await sb.storage.from(bucket).remove(slice);
    // A key that is already gone is not a failure — this whole function has to
    // be safe to re-run.
    if (!error) removed += slice.length;
    else console.warn(`[purge] storage remove failed in ${bucket}:`, error.message);
  }
  return removed;
}

/**
 * Recursively collect every object key under a prefix.
 *
 * Storage's list() is one directory level at a time and paginated, so a brand
 * folder with a `generated/<jobId>/` subtree needs the walk rather than a
 * single call.
 */
async function collectTree(sb: Sb, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (dir: string): Promise<void> => {
    let offset = 0;
    for (;;) {
      const { data, error } = await sb.storage
        .from(bucket)
        .list(dir, { limit: LIST_PAGE, offset });
      if (error) {
        console.warn(`[purge] storage list failed for ${bucket}/${dir}:`, error.message);
        return;
      }
      const entries = data ?? [];
      for (const entry of entries) {
        const path = dir ? `${dir}/${entry.name}` : entry.name;
        // Supabase marks a real object with an id; a folder placeholder has none.
        if (entry.id) out.push(path);
        else await walk(path);
      }
      if (entries.length < LIST_PAGE) break;
      offset += LIST_PAGE;
    }
  };
  await walk(prefix);
  return out;
}

async function purgeOne(sb: Sb, req: { id: string; user_id: string }) {
  // 1. PREPARE — detach the FKs that block the profiles cascade, transfer any
  //    shared workspace, archive the invoices, and learn which brand folders
  //    hold this user's storage.
  const { data: plan, error: planErr } = await sb.rpc('prepare_account_purge', {
    _user_id: req.user_id,
  });
  if (planErr) throw planErr;

  const brandIds: string[] = plan?.brandIds ?? [];

  // 2. AUTH USER FIRST — kills every session, cascades the user-keyed tables.
  //    'not found' on a retry is success, not an error.
  const { error: authErr } = await sb.auth.admin.deleteUser(req.user_id);
  if (authErr && !/not.?found/i.test(authErr.message)) throw authErr;

  // 3. STORAGE — blobs, not just rows.
  let filesRemoved = 0;
  for (const brandId of brandIds) {
    filesRemoved += await removeInChunks(
      sb,
      'brand-assets',
      await collectTree(sb, 'brand-assets', brandId),
    );
  }
  filesRemoved += await removeInChunks(
    sb,
    'brand-assets',
    await collectTree(sb, 'brand-assets', `ai-refs/${req.user_id}`),
  );
  // onboarding-scratch is owner-scoped rather than path-scoped since migration
  // 021, and storage's client cannot filter by owner — so the names come from
  // SQL.
  const { data: scratch } = await sb.rpc('owned_storage_object_names', {
    _user_id: req.user_id,
    _bucket: 'onboarding-scratch',
  });
  const scratchNames: string[] = Array.isArray(scratch)
    ? scratch.map((r: unknown) => (typeof r === 'string' ? r : (r as { name: string }).name))
    : [];
  filesRemoved += await removeInChunks(sb, 'onboarding-scratch', scratchNames);

  // 4. RELATIONAL PURGE — one transaction, ordering expressed once in SQL.
  const { data: counts, error: purgeErr } = await sb.rpc('purge_account_data', {
    _user_id: req.user_id,
  });
  if (purgeErr) throw purgeErr;

  return { ...plan, ...counts, filesRemoved };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // The dashboard cron sends only the anon key, which ships in the client
  // bundle — so anyone could otherwise trigger a purge. Require a shared
  // secret. A missing secret fails CLOSED.
  const expected = Deno.env.get('PURGE_CRON_SECRET');
  if (!expected || request.headers.get('x-cron-secret') !== expected) {
    return json({ error: 'unauthorized' }, 401);
  }

  const sb = createServiceClient();
  const dryRun = new URL(request.url).searchParams.get('dryRun') === '1';

  // Atomic claim: flips pending → purging under FOR UPDATE SKIP LOCKED and
  // reclaims anything a previous run died inside (>1h). Two concurrent
  // invocations therefore never touch the same user.
  const { data: due, error: claimErr } = await sb.rpc('claim_due_account_deletions', {
    _limit: BATCH,
  });
  if (claimErr) return json({ error: claimErr.message }, 500);

  const requests = (due ?? []) as { id: string; user_id: string }[];

  if (dryRun) {
    // Nothing was destroyed, but the claim already moved these rows — hand them
    // back so the next real run picks them up rather than leaving them stuck.
    for (const req of requests) {
      await sb.rpc('finish_account_deletion', {
        _id: req.id,
        _ok: false,
        _error: 'dry run',
      });
    }
    return json({ dryRun: true, due: requests.map((r) => r.user_id) });
  }

  const results: { user: string; ok: boolean; error?: string }[] = [];
  for (const req of requests) {
    try {
      const outcome = await purgeOne(sb, req);
      await sb.rpc('finish_account_deletion', { _id: req.id, _ok: true, _outcome: outcome });
      results.push({ user: req.user_id, ok: true });
    } catch (e) {
      // ERROR ISOLATION: one user's failure must never block the rest of the
      // batch. finish_account_deletion returns the row to 'pending' (retried
      // tomorrow) until attempts hits 5, then parks it 'failed' for a human.
      const message = e instanceof Error ? e.message : String(e);
      await sb.rpc('finish_account_deletion', { _id: req.id, _ok: false, _error: message });
      console.error('[purge] user', req.user_id, message);
      results.push({ user: req.user_id, ok: false, error: message });
    }
  }

  return json({ processed: results.length, results });
});
