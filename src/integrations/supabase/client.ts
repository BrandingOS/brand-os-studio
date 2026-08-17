// Migrated 2026-04-09: previous project (iyrqpsrnjoglrxhpzjgq) was paused
// for >90 days on the free tier and could not be restored from the dashboard.
// This points at the new brandos-prod project in eu-central-1 (Frankfurt).
// The anon JWT below is a public client key — safe to commit; RLS protects data.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Exported so direct-fetch Edge Function callers (e.g.
// `features/editor/ai/applyCommand.ts`) share the same hard-coded URL
// instead of reaching for `import.meta.env.VITE_SUPABASE_URL`, which is
// not populated in `.env` and resolves to literal `"undefined"`.
export const SUPABASE_URL = "https://ciojgoozobzbeglwdxcz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb2pnb296b2J6YmVnbHdkeGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDQ4ODgsImV4cCI6MjA5MTMyMDg4OH0.qwfviBXKJh1i2-vyUYtCIdUXMZM5ICBJtBTEmqDYbng";

// Safe localStorage wrapper that handles quota exceeded errors.
// When storage is full, it clears non-essential items and retries.
const safeStorage: Storage = {
  get length() { return localStorage.length; },
  clear() { localStorage.clear(); },
  key(index: number) { return localStorage.key(index); },
  getItem(key: string) { return localStorage.getItem(key); },
  removeItem(key: string) { localStorage.removeItem(key); },
  setItem(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      // QuotaExceededError — clear non-auth items and retry
      const authKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('sb-')) authKeys.push(k);
      }
      // Remove everything except Supabase auth keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && !k.startsWith('sb-')) keysToRemove.push(k);
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
      try {
        localStorage.setItem(key, value);
      } catch {
        // Still full — keep the Supabase session, drop everything else, retry.
        const keep = authKeys.map((k) => [k, localStorage.getItem(k)] as const);
        localStorage.clear();
        keep.forEach(([k, v]) => { if (v !== null && k !== key) localStorage.setItem(k, v); });
        localStorage.setItem(key, value);
      }
    }
  },
};

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
    // PKCE: OAuth + magic/confirm links come back as `?code=…` on
    // /auth/callback and the client exchanges it for a session on load
    // (detectSessionInUrl). The auth controller then sees SIGNED_IN.
    flowType: 'pkce',
    detectSessionInUrl: true,
  }
});