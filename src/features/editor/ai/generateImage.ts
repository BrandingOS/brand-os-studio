// Browser-side wrapper for the ai-generate-image Edge Function.
// Phase 4.3 — mock-only at the Edge Function layer; this wrapper
// stays vendor-agnostic so swapping to a real vendor is a single
// Edge Function change.

import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';

export interface GenerateImageRequest {
  prompt: string;
  width?: number;
  height?: number;
}

export interface GenerateImageResult {
  imageUrl: string;
  mock: boolean;
  prompt: string;
}

const ENDPOINT_PATH = '/functions/v1/ai-generate-image';
const TIMEOUT_MS = 60_000;

export async function generateImage(
  args: GenerateImageRequest,
  opts: { fetchImpl?: typeof fetch; endpoint?: string } = {},
): Promise<GenerateImageResult> {
  const fetcher = opts.fetchImpl ?? fetch;
  // VITE_SUPABASE_URL is not populated in .env; fall back to the
  // hard-coded URL exported by the supabase client.
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
  const url = opts.endpoint ?? `${baseUrl}${ENDPOINT_PATH}`;

  const sessionId = await resolveSessionId();
  const { data } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (data?.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetcher(url, {
      method: 'POST',
      headers,
      signal: ctrl.signal,
      body: JSON.stringify({ sessionId, ...args }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI image service ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
    }
    return (await res.json()) as GenerateImageResult;
  } finally {
    clearTimeout(timeout);
  }
}

const ANON_KEY = 'brandos.ai-image.anon-session';
async function resolveSessionId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) return data.user.id;
  } catch { /* fall through */ }
  try {
    const existing = localStorage.getItem(ANON_KEY);
    if (existing) return existing;
    const fresh = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(ANON_KEY, fresh);
    return fresh;
  } catch {
    return `anon-${crypto.randomUUID()}`;
  }
}
