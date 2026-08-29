// Edge Function: purge onboarding-scratch files older than 24h. Cron daily.
//
// This used to be `Deno.serve(async () => …)` — no header read, no secret, no method
// check. Anyone holding the anon key (which ships in the browser bundle) could trigger a
// mass delete of every user's in-flight onboarding uploads (threat A26). It now requires
// the same shared secret purge-deleted-accounts does, and FAILS CLOSED when the secret is
// unset, because a deployment that forgot to configure it must not be wide open.
import { createClient } from 'npm:@supabase/supabase-js@^2.56.0';
import { requireCronSecret, withAuthz } from '../_shared/authz.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve((req) =>
  withAuthz(async () => {
    requireCronSecret(req, 'PURGE_CRON_SECRET');

    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const { data: sessions, error: topErr } = await supabase.storage
      .from('onboarding-scratch').list('', { limit: 1000 });
    if (topErr) return new Response(topErr.message, { status: 500 });

    let removed = 0;
    for (const session of sessions ?? []) {
      const { data: files } = await supabase.storage
        .from('onboarding-scratch').list(session.name, { limit: 1000 });
      for (const file of files ?? []) {
        const created = file.created_at ? new Date(file.created_at).getTime() : 0;
        if (created < cutoff) {
          if (dryRun) { removed += 1; continue; }
          const { error } = await supabase.storage
            .from('onboarding-scratch').remove([`${session.name}/${file.name}`]);
          if (!error) removed += 1;
        }
      }
    }
    return new Response(JSON.stringify({ removed, dryRun }), {
      headers: { 'Content-Type': 'application/json' },
    });
  })
);
