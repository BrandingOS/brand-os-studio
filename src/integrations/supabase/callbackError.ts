/**
 * Supabase returns provider / link failures as `?error=…&error_code=…&
 * error_description=…` (or the same in the hash). supabase-js reads those on
 * load and — because it treats them as a failed callback — REMOVES the current
 * session. A signed-in user who opens an expired reset link, or backs out of
 * a Google consent screen, was silently logged out (found 2026-08-17 on the
 * demo deploy).
 *
 * So the params are quarantined BEFORE the client initialises: moved out of
 * the URL into sessionStorage, where the callback / reset pages read them.
 */
const KEY = 'brandos:auth-callback-error';

export interface AuthCallbackError {
  error: string;
  error_code?: string | null;
  error_description?: string | null;
}

/** Call once, before `createClient`. Idempotent. */
export function quarantineAuthErrorParams(): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const src = pick(url.searchParams) ?? pick(hash);
    if (!src) return;
    const err: AuthCallbackError = {
      error: src.get('error') as string,
      error_code: src.get('error_code'),
      error_description: src.get('error_description'),
    };
    sessionStorage.setItem(KEY, JSON.stringify(err));
    ['error', 'error_code', 'error_description'].forEach((k) => src.delete(k));
    const h = hash.toString();
    url.hash = h ? `#${h}` : '';
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // Never let URL hygiene break boot.
  }
}

// Only Supabase-shaped errors: `error` together with a code or description.
function pick(p: URLSearchParams): URLSearchParams | null {
  return p.has('error') && (p.has('error_code') || p.has('error_description')) ? p : null;
}

/** Read AND clear the quarantined error (so a reload doesn't re-show it). */
export function takeAuthCallbackError(): AuthCallbackError | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw) as AuthCallbackError;
  } catch {
    return null;
  }
}

/** Human wording for the common codes; falls back to the description. */
export function describeAuthCallbackError(e: AuthCallbackError): string {
  const d = (e.error_description ?? '').replace(/\+/g, ' ');
  switch (e.error_code) {
    case 'otp_expired':
      return 'This link has expired. Please request a new one.';
    case 'access_denied':
      return d || 'Access was denied.';
    default:
      return d || e.error;
  }
}
