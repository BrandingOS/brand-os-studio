/**
 * Auth controller — the ONE owner of the Supabase auth lifecycle.
 *
 * Why this exists: the previous `useAuth` hook raced `getSession()` against
 * timeouts, a parallel `.then`, a safety timer AND `onAuthStateChange`, and
 * `AuthModal` seeded the store on its own — four writers to one store, and
 * twenty `fix(auth)` commits patching the flip-flops between them.
 *
 * Rules that bind here:
 *  - `onAuthStateChange` is the only session source. supabase-js v2 always
 *    emits `INITIAL_SESSION` (session or null) once it has read storage, so
 *    there is no separate `getSession()` race. One bounded fallback (a hung
 *    navigator.locks lock) marks the app guest after 6s — and a later event
 *    still upgrades it.
 *  - `becomeAuthenticated` is idempotent BY USER ID: the service swap and the
 *    store reloads run once per signed-in user, not once per event.
 *  - Every action exported here finishes its store update BEFORE resolving,
 *    so a caller may `navigate()` the moment the promise settles.
 *  - No routing in here. Components navigate; the controller only writes state.
 */
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useOnboardingStore } from '@/shared/store/onboardingStore';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
import { useBrandStore } from '@/shared/store/brandStore';
import { reconfigureForAuth } from '@/core/boot';
import { migrateLocalStorageToSupabase } from '@/shared/utils/localStorage-migration';
import { toast } from 'sonner';
import type { PlatformRole, User } from '@/shared/types/user';

// ─── Dev bypass ──────────────────────────────────────────────────────────────
// Dev-only escape hatch for when the Supabase project is paused/unreachable.
// `import.meta.env.DEV` is statically false in production builds, so Vite
// dead-code-eliminates the branch — it cannot ship. Enable locally with
// `VITE_DEV_BYPASS_AUTH=true` in .env. Never auto-applied: the user must click
// the button in AuthModal; the choice persists in localStorage across reloads.
export const DEV_AUTH_BYPASS =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';
export const DEV_BYPASS_STORAGE_KEY = 'brandos:dev-bypass';
export const DEV_BYPASS_USER: User = {
  id: 'dev-bypass-user',
  email: 'dev@local.test',
  name: 'Dev (bypass)',
  plan: 'agency',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** How long we wait for INITIAL_SESSION before treating the visitor as a guest. */
export const INITIAL_SESSION_FALLBACK_MS = 6000;

export const mapSupabaseUser = (u: SupabaseUser): User => ({
  id: u.id,
  email: u.email || '',
  name: u.user_metadata?.name || u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
  avatar: u.user_metadata?.avatar_url,
  plan: 'free',
  createdAt: new Date(u.created_at),
  updatedAt: new Date(u.updated_at || u.created_at),
});

// ─── State ───────────────────────────────────────────────────────────────────
let started = false;
let unsubscribe: (() => void) | null = null;
let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
/** The user id whose sign-in side effects have already run. */
let activeUserId: string | null = null;

const store = () => useSessionStore.getState();

// ─── Background side effects (never block the store transition) ─────────────
const checkPlatformRole = async (userId: string) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .order('role')
      .limit(10)
      .abortSignal(controller.signal);
    clearTimeout(timeout);
    if (error || !data?.length) return store().setPlatformRole('user');
    // A user may hold several rows; the highest rank wins.
    const rank: Record<string, number> = { super_admin: 4, admin: 3, moderator: 2, user: 1 };
    const best = data
      .map((r) => r.role as PlatformRole)
      .sort((a, b) => (rank[b] ?? 0) - (rank[a] ?? 0))[0];
    store().setPlatformRole(rank[best] ? best : 'user');
  } catch {
    store().setPlatformRole('user');
  }
};

const checkAccountStatus = async (userId: string) => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('status, suspension_reason')
      .eq('id', userId)
      .maybeSingle();
    if (data?.status === 'suspended' || data?.status === 'banned') {
      const reason =
        data.status === 'banned'
          ? 'Your account has been banned. Contact support for assistance.'
          : data.suspension_reason
            ? `Your account has been suspended: ${data.suspension_reason}`
            : 'Your account has been suspended. Contact support for assistance.';
      await supabase.auth.signOut();
      toast.error(reason);
    }
  } catch {
    // Fail open — a flaky profiles read must never lock a real user out.
  }
};

const updateLastSignIn = async (userId: string) => {
  try {
    await supabase.from('profiles').update({ last_sign_in: new Date().toISOString() }).eq('id', userId);
  } catch {
    // Non-critical.
  }
};

const runSignedInSideEffects = (userId: string) => {
  void checkPlatformRole(userId);
  void checkAccountStatus(userId);
  void updateLastSignIn(userId);
  useWorkspaceStore.getState().loadAll().catch(console.error);
  // Services were just swapped to Supabase — anything loaded against the
  // Local service is stale until re-fetched.
  useBrandStore.getState().loadAll().catch(console.error);
  const onboarding = useOnboardingStore.getState();
  onboarding
    .syncToSupabase()
    .catch(console.error)
    .then(() => onboarding.loadFromSupabase())
    .catch(console.error);
  // Reads `brandos:brands` — nothing may clear that key before this runs.
  migrateLocalStorageToSupabase().catch(console.error);
};

// ─── Transitions ─────────────────────────────────────────────────────────────
export function becomeAuthenticated(user: SupabaseUser): void {
  const mapped = mapSupabaseUser(user);
  if (activeUserId === user.id) {
    // Same user — refresh profile fields only, no side effects.
    store().signIn(mapped);
    return;
  }
  activeUserId = user.id;
  reconfigureForAuth(true);
  store().signIn(mapped);
  runSignedInSideEffects(user.id);
}

export function becomeGuest(): void {
  const wasAuthed = activeUserId !== null;
  activeUserId = null;
  reconfigureForAuth(false);
  if (wasAuthed) {
    useWorkspaceStore.getState().reset();
    useBrandStore.getState().loadAll().catch(console.error);
  }
  store().signOut();
}

const clearFallback = () => {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer);
    fallbackTimer = null;
  }
};

export function handleAuthEvent(event: AuthChangeEvent, session: Session | null): void {
  switch (event) {
    case 'INITIAL_SESSION':
      clearFallback();
      if (session?.user) becomeAuthenticated(session.user);
      else becomeGuest();
      return;
    case 'SIGNED_IN':
      clearFallback();
      if (session?.user) becomeAuthenticated(session.user);
      return;
    case 'TOKEN_REFRESHED':
    case 'USER_UPDATED':
      if (session?.user) becomeAuthenticated(session.user);
      return;
    case 'PASSWORD_RECOVERY':
      store().setRecovery(true);
      if (session?.user) becomeAuthenticated(session.user);
      return;
    case 'SIGNED_OUT':
      clearFallback();
      becomeGuest();
      return;
    default:
      return;
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────
/** Idempotent. Safe under React StrictMode double-effects and Vite HMR. */
export function startAuthController(): () => void {
  if (started) return stopAuthController;
  started = true;

  if (DEV_AUTH_BYPASS && localStorage.getItem(DEV_BYPASS_STORAGE_KEY) === '1') {
    activeUserId = DEV_BYPASS_USER.id;
    store().signIn(DEV_BYPASS_USER);
    store().setPlatformRole('super_admin');
    return stopAuthController;
  }

  fallbackTimer = setTimeout(() => {
    fallbackTimer = null;
    if (store().isLoading) {
      console.warn(
        `[auth] no INITIAL_SESSION within ${INITIAL_SESSION_FALLBACK_MS}ms — treating as guest; a later event still signs in`,
      );
      becomeGuest();
    }
  }, INITIAL_SESSION_FALLBACK_MS);

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    handleAuthEvent(event, session);
  });
  unsubscribe = () => data.subscription.unsubscribe();
  return stopAuthController;
}

export function stopAuthController(): void {
  clearFallback();
  unsubscribe?.();
  unsubscribe = null;
  started = false;
}

/** Test-only: forget the active user without touching stores. */
export function __resetAuthControllerForTests(): void {
  stopAuthController();
  activeUserId = null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────
export type AuthActionResult = { error: string | null; code?: string };

const friendly = (err: { message?: string; code?: string; status?: number } | null | undefined): AuthActionResult => {
  if (!err) return { error: null };
  const code = err.code ?? '';
  const msg = err.message ?? '';
  const has = (s: string) => msg.toLowerCase().includes(s);
  if (code === 'invalid_credentials' || has('invalid login credentials'))
    return { code, error: 'Invalid email or password. Please try again.' };
  if (code === 'email_not_confirmed' || has('email not confirmed'))
    return { code, error: 'Please verify your email before signing in — check your inbox.' };
  if (code === 'user_already_exists' || has('already registered'))
    return { code, error: 'An account with this email already exists. Try signing in instead.' };
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || has('rate limit') || has('too many'))
    return { code, error: 'Too many attempts. Please wait a moment and try again.' };
  if (code === 'email_address_invalid')
    return { code, error: "We couldn't send a code to that address. Check the spelling or try another email." };
  if (code === 'weak_password' || has('password should'))
    return { code, error: msg || 'Password is too weak.' };
  if (code === 'validation_failed' && has('provider'))
    return { code, error: 'Google sign-in is not configured yet. Please use email/password.' };
  if (has('failed to fetch') || has('network'))
    return { code, error: 'Could not reach the server. Check your connection and try again.' };
  return { code, error: msg || 'Something went wrong. Please try again.' };
};

export async function signInWithPassword(email: string, password: string): Promise<AuthActionResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return friendly(error);
  if (!data.session || !data.user) return { error: 'Login failed — no session was created. Please try again.' };
  becomeAuthenticated(data.user);
  return { error: null };
}

export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<AuthActionResult & { needsEmailConfirmation?: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name: name || email.split('@')[0] },
      emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}`,
    },
  });
  if (error) return friendly(error);
  // With email confirmation OFF Supabase hands back a session right away.
  if (data.session && data.user) {
    becomeAuthenticated(data.user);
    return { error: null, needsEmailConfirmation: false };
  }
  // Supabase returns a user with an empty identities array when the address
  // is already registered (to avoid leaking accounts). Say so plainly.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return { error: 'An account with this email already exists. Try signing in instead.', code: 'user_already_exists' };
  }
  return { error: null, needsEmailConfirmation: true };
}

/** Digits in the e-mail confirmation code. Supabase enforces 6–10 (`mailer_otp_length`). */
export const SIGNUP_CODE_LENGTH = 6;

/**
 * Confirm a fresh sign-up with the code from the e-mail. On success Supabase
 * returns a session — the user is signed in and may enter the app.
 */
export async function verifySignupCode(email: string, token: string): Promise<AuthActionResult> {
  const { data, error } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'signup' });
  if (error) {
    const code = error.code ?? '';
    if (code === 'otp_expired' || /expired|invalid/i.test(error.message ?? ''))
      return { code, error: 'That code is wrong or has expired. Check the digits or request a new one.' };
    return friendly(error);
  }
  if (!data.session || !data.user) return { error: 'The code was accepted but no session was created. Please sign in.' };
  becomeAuthenticated(data.user);
  return { error: null };
}

/** Send a fresh confirmation code to an unconfirmed address. */
export async function resendSignupCode(email: string): Promise<AuthActionResult> {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/dashboard')}` },
  });
  return friendly(error);
}

export async function signInWithGoogle(next = '/dashboard'): Promise<AuthActionResult> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  return friendly(error);
}

export async function signOut(): Promise<AuthActionResult> {
  if (DEV_AUTH_BYPASS && store().user?.id === DEV_BYPASS_USER.id) {
    localStorage.removeItem(DEV_BYPASS_STORAGE_KEY);
    becomeGuest();
    return { error: null };
  }
  const { error } = await supabase.auth.signOut();
  // Even if the network call failed, the user asked to leave — leave locally.
  becomeGuest();
  return friendly(error);
}

export async function sendPasswordReset(email: string): Promise<AuthActionResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  return friendly(error);
}

export async function updatePassword(password: string): Promise<AuthActionResult> {
  const { error } = await supabase.auth.updateUser({ password });
  if (!error) store().setRecovery(false);
  return friendly(error);
}
