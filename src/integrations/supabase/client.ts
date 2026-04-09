// Migrated 2026-04-09: previous project (iyrqpsrnjoglrxhpzjgq) was paused
// for >90 days on the free tier and could not be restored from the dashboard.
// This points at the new brandos-prod project in eu-central-1 (Frankfurt).
// The anon JWT below is a public client key — safe to commit; RLS protects data.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ciojgoozobzbeglwdxcz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpb2pnb296b2J6YmVnbHdkeGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDQ4ODgsImV4cCI6MjA5MTMyMDg4OH0.qwfviBXKJh1i2-vyUYtCIdUXMZM5ICBJtBTEmqDYbng";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});