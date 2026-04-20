import { supabase } from '@/integrations/supabase/client';

export interface FinalizeResult {
  moved: string[];
  failed: { assetId: string; error: string }[];
}

export async function finalizeAssets(
  sessionId: string, brandId: string, assetIds: string[],
): Promise<FinalizeResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/finalize-onboarding-assets`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ sessionId, brandId, assetIds }),
  });
  if (!res.ok) throw new Error(`finalize-onboarding-assets ${res.status}`);
  return res.json();
}
