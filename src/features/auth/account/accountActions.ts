/**
 * Self-serve account edits.
 *
 * None of this existed. The only write any user could make to their own record
 * was `last_sign_in`; changing your display name was an admin-only path, and
 * changing your email had no path at all.
 *
 * THE NAME AND AVATAR ARE WRITTEN TWICE, ON PURPOSE.
 * The session `User` is built entirely from `auth.users.user_metadata`
 * (authController.mapSupabaseUser), while the admin panel, workspace member
 * lookups and `shares_workspace_with` all read `public.profiles`. Writing only
 * one of them is what let the two drift apart in the first place. The
 * auth-metadata write is the one that must succeed — it is what the UI shows —
 * so the profiles write is best-effort behind it and never fails the action.
 */
import { supabase } from '@/integrations/supabase/client';
import { DEV_BYPASS_USER } from '@/features/auth/session/authController';
import { useSessionStore } from '@/shared/store/sessionStore';

/**
 * Matches `AuthActionResult` in authController — `error: null` means it worked.
 * Not a discriminated union: `strictNullChecks` is off in this repo, so a
 * `{ ok: true } | { ok: false; error }` union does not narrow at the call site.
 */
export type AccountActionResult = { error: string | null };

/**
 * Dev bypass keeps every service local and never establishes a Supabase
 * session, so any write here would execute as `anon` and be refused by RLS.
 * Each action reports that plainly instead of surfacing a wall of red toasts in
 * the local workflow this repo relies on daily.
 */
export function isDevBypassSession(): boolean {
  return useSessionStore.getState().user?.id === DEV_BYPASS_USER.id;
}

const BYPASS: AccountActionResult = {
  error: 'Not available in the dev bypass session — there is no Supabase session to write to.',
};

function friendly(message: string): string {
  if (/same.*password/i.test(message)) return 'That is already your password.';
  if (/weak.?password|at least/i.test(message)) return 'Password is too weak — use at least 6 characters.';
  if (/invalid.*credential/i.test(message)) return 'That password is not correct.';
  if (/email.*(already|registered|exists)/i.test(message)) return 'That email is already in use.';
  if (/rate.?limit|too many/i.test(message)) return 'Too many attempts — please wait a minute.';
  return message;
}

/** Display name and avatar. Written to auth metadata AND profiles. */
export async function updateProfile(patch: {
  name?: string;
  avatarUrl?: string | null;
}): Promise<AccountActionResult> {
  if (isDevBypassSession()) return BYPASS;

  const metadata: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    metadata.name = patch.name;
    metadata.full_name = patch.name;
  }
  if (patch.avatarUrl !== undefined) metadata.avatar_url = patch.avatarUrl;

  // The authoritative write: USER_UPDATED then refreshes the session store, so
  // the UI reflects the new name without a reload.
  const { error } = await supabase.auth.updateUser({ data: metadata });
  if (error) return { error: friendly(error.message) };

  const { data } = await supabase.auth.getUser();
  const uid = data?.user?.id;
  if (uid) {
    const row: Record<string, unknown> = {};
    if (patch.name !== undefined) row.full_name = patch.name;
    if (patch.avatarUrl !== undefined) row.avatar_url = patch.avatarUrl;
    if (Object.keys(row).length > 0) {
      // Best-effort mirror. Migration 029's guard trigger permits exactly these
      // two columns for a self-write, so a failure here means a real outage,
      // not a permission problem — and it must not undo the metadata write.
      const { error: profileErr } = await supabase.from('profiles').update(row).eq('id', uid);
      if (profileErr) console.warn('[account] profiles mirror failed:', profileErr.message);
    }
  }

  return { error: null };
}

/**
 * Change the sign-in email. Supabase sends a confirmation to the NEW address
 * (and, when "secure email change" is on, to the old one too); the change only
 * lands once it is followed, so this reports "check your email", not "done".
 */
export async function changeEmail(next: string): Promise<AccountActionResult> {
  if (isDevBypassSession()) return BYPASS;
  const { error } = await supabase.auth.updateUser({ email: next.trim() });
  if (error) return { error: friendly(error.message) };
  return { error: null };
}

/**
 * Change the password while signed in.
 *
 * Supabase's `updateUser({ password })` does NOT ask for the current one, so on
 * its own it turns any unattended logged-in browser into an account takeover.
 * Re-authenticating first closes that: the current password is verified against
 * the same account before the new one is set.
 */
export async function changePassword(
  currentPassword: string,
  nextPassword: string,
): Promise<AccountActionResult> {
  if (isDevBypassSession()) return BYPASS;

  const email = useSessionStore.getState().user?.email;
  if (!email) return { error: 'You are not signed in.' };

  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthErr) return { error: friendly(reauthErr.message) };

  const { error } = await supabase.auth.updateUser({ password: nextPassword });
  if (error) return { error: friendly(error.message) };
  return { error: null };
}
