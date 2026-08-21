/**
 * Supabase client for the landing page.
 *
 * Points at the brandos-prod project (eu-central-1 / Frankfurt). The anon
 * key below is a public client key — safe to commit. Row Level Security
 * policies on the `early_access` table allow INSERT only and disallow
 * SELECT for anon users, so visitors can submit but cannot read other
 * people's submissions.
 *
 * View signups: Supabase Dashboard → brandos-prod → Table Editor → early_access
 *
 * NOTE: this is the SAME project the main BrandOS app uses. The anon key
 * mirrors the one in src/integrations/supabase/client.ts. If you ever
 * rotate the key in Supabase, update both files.
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ciojgoozobzbeglwdxcz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb2pnb296b2J6YmVnbHdkeGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDQ4ODgsImV4cCI6MjA5MTMyMDg4OH0.qwfviBXKJh1i2-vyUYtCIdUXMZM5ICBJtBTEmqDYbng';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Landing page is anonymous-only — no session, no auto-refresh.
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ─── early_access table contract ─────────────────────────────────────
//
// Mirrors the columns defined in the migration (see /tmp/early_access_migration.sql
// in the session that created the project, or recreate from this type).

export interface EarlyAccessSubmission {
  email: string;
  name?: string;
  role?: string;
  use_case?: string;
  /** Which feature the user is most excited about (set in step 3 of the form). */
  interesting_feature?: string;
  /** Tester commitment level: 'notify' | 'beta' | 'founder'. */
  tester_interest?: string;
  source?: string;
  user_agent?: string;
}

/**
 * Insert one early-access submission. Throws on Supabase error so the
 * form can show the error state.
 */
export async function submitEarlyAccess(payload: EarlyAccessSubmission): Promise<void> {
  const { error } = await supabase.from('early_access').insert({
    ...payload,
    source: payload.source ?? 'landing-page',
    user_agent:
      payload.user_agent ??
      (typeof navigator !== 'undefined' ? navigator.userAgent : undefined),
  });

  if (error) {
    // Swallow the duplicate-email constraint as a soft success — they're
    // already on the list, no need to scare them.
    if (error.code === '23505') {
      return;
    }
    throw new Error(error.message);
  }
}
