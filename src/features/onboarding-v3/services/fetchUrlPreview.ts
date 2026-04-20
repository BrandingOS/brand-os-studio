import { supabase } from '@/integrations/supabase/client';
import type { OgMeta } from '../types';

export async function fetchUrlPreview(sessionId: string, url: string): Promise<OgMeta> {
  const { data: { session } } = await supabase.auth.getSession();
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-url-preview`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ sessionId, url }),
  });
  if (!res.ok) throw new Error(`fetch-url-preview ${res.status}`);
  return res.json();
}
