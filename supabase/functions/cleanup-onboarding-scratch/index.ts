// Edge Function: purge onboarding-scratch files older than 24h. Cron daily.
import { createClient } from 'npm:@supabase/supabase-js@^2.56.0';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async () => {
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
        const { error } = await supabase.storage
          .from('onboarding-scratch').remove([`${session.name}/${file.name}`]);
        if (!error) removed += 1;
      }
    }
  }
  return new Response(JSON.stringify({ removed }), { headers: { 'Content-Type': 'application/json' } });
});
