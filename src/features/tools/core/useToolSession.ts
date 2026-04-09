/**
 * useToolSession — anonymous-session persistence for tools.
 *
 * The platform persists tool state to localStorage keyed by
 * `(slug, anonymousToken)`. When a public-mode user signs up, the
 * session is claimed (see `claim.ts`) and materialized into a real
 * brand. In-app mode bypasses this — the calling tool persists into
 * the brand directly via `useAutoSave` against the brands service.
 *
 * Why localStorage and not Supabase?
 *  - Zero round-trip on every keystroke; the tool stays snappy.
 *  - Anonymous sessions don't need server identity to work.
 *  - The session moves with the device until claimed.
 *
 * If you later want cross-device anonymous sessions, swap the
 * persistence layer here without touching tool code.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ToolMode, ToolSession, ToolSlug } from './types';

const STORAGE_PREFIX = 'brandos:tool-session';
const TOKEN_KEY = 'brandos:tool-anon-token';

function readToken(): string {
  if (typeof window === 'undefined') return 'ssr';
  let token = window.localStorage.getItem(TOKEN_KEY);
  if (!token) {
    token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `anon-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    window.localStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

function storageKey(slug: ToolSlug, token: string): string {
  return `${STORAGE_PREFIX}:${slug}:${token}`;
}

function loadSession<TPayload>(
  slug: ToolSlug,
  token: string,
): ToolSession<TPayload> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(slug, token));
    if (!raw) return null;
    return JSON.parse(raw) as ToolSession<TPayload>;
  } catch {
    return null;
  }
}

function persistSession<TPayload>(session: ToolSession<TPayload>) {
  if (typeof window === 'undefined') return;
  const key = storageKey(session.slug, session.anonymousToken ?? 'in-app');
  window.localStorage.setItem(key, JSON.stringify(session));
}

export interface UseToolSessionOptions<TPayload> {
  slug: ToolSlug;
  mode: ToolMode;
  /** Initial payload used the first time a session is created. */
  initialPayload: TPayload;
}

export interface UseToolSessionResult<TPayload> {
  session: ToolSession<TPayload>;
  /** Replace the entire payload. */
  setPayload: (next: TPayload) => void;
  /** Patch the payload (shallow merge). */
  patchPayload: (patch: Partial<TPayload>) => void;
  /** Force-write the current session to storage. */
  flush: () => void;
  /** Clear the session (used after a successful claim). */
  clear: () => void;
}

export function useToolSession<TPayload>({
  slug,
  mode,
  initialPayload,
}: UseToolSessionOptions<TPayload>): UseToolSessionResult<TPayload> {
  const token = useMemo(() => (mode === 'public' ? readToken() : 'in-app'), [mode]);

  const [session, setSession] = useState<ToolSession<TPayload>>(() => {
    const existing = loadSession<TPayload>(slug, token);
    if (existing) return existing;
    const now = new Date().toISOString();
    return {
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${slug}-${Date.now()}`,
      slug,
      mode,
      anonymousToken: mode === 'public' ? token : undefined,
      payload: initialPayload,
      createdAt: now,
      updatedAt: now,
    };
  });

  // Persist on every change. Debounced lightly via a microtask to coalesce
  // burst updates from React's batching.
  const pendingWrite = useRef<number | null>(null);
  useEffect(() => {
    if (pendingWrite.current) cancelAnimationFrame(pendingWrite.current);
    pendingWrite.current = requestAnimationFrame(() => persistSession(session));
    return () => {
      if (pendingWrite.current) cancelAnimationFrame(pendingWrite.current);
    };
  }, [session]);

  const setPayload = useCallback((next: TPayload) => {
    setSession((s) => ({ ...s, payload: next, updatedAt: new Date().toISOString() }));
  }, []);

  const patchPayload = useCallback((patch: Partial<TPayload>) => {
    setSession((s) => ({
      ...s,
      payload: { ...(s.payload as object), ...(patch as object) } as TPayload,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const flush = useCallback(() => persistSession(session), [session]);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(storageKey(slug, token));
  }, [slug, token]);

  return { session, setPayload, patchPayload, flush, clear };
}
