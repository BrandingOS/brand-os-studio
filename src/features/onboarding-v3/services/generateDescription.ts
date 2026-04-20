import { supabase } from '@/integrations/supabase/client';

/** Streams 1–2 sentence brand description from Claude via Edge Function. */
export async function* generateDescriptionStream(
  sessionId: string,
  brandName: string,
  assetContext?: string[],
): AsyncGenerator<string, void, void> {
  const { data: { session } } = await supabase.auth.getSession();
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-description`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ sessionId, brandName, assetContext }),
  });
  if (!res.ok || !res.body) throw new Error(`generate-description ${res.status}`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    yield decoder.decode(value, { stream: true });
  }
}
