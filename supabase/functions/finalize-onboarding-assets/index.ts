// Edge Function: move scratch files to brand-assets when a brand is created.
// Input: { sessionId: string, brandId: string, assetIds: string[] }
// Output: { moved: string[], failed: { assetId: string, error: string }[] }
import { createClient } from 'npm:@supabase/supabase-js@^2.56.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

const cors = {
  ...corsHeaders,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  // ─── AuthN: require a verified JWT ───────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });
  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await authClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return new Response('Unauthorized', { status: 401, headers: cors });

  let body: { sessionId?: string; brandId?: string; assetIds?: string[] };
  try { body = await req.json(); } catch { return new Response('Bad JSON', { status: 400, headers: cors }); }
  const { sessionId, brandId, assetIds } = body;
  if (!sessionId || !brandId || !Array.isArray(assetIds)) {
    return new Response('sessionId, brandId, assetIds required', { status: 400, headers: cors });
  }

  // ─── AuthZ: the caller must OWN the destination brand ─────────────────────
  // Prevents moving scratch assets into another tenant's brand-assets/<brandId>.
  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('user_id, workspace_id')
    .eq('id', brandId)
    .maybeSingle();
  if (brandErr || !brand) return new Response('Brand not found', { status: 404, headers: cors });
  let owns = brand.user_id === user.id;
  if (!owns && brand.workspace_id) {
    const { data: member } = await supabase
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', brand.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();
    owns = Boolean(member);
  }
  if (!owns) return new Response('Forbidden', { status: 403, headers: cors });

  const moved: string[] = [];
  const failed: { assetId: string; error: string }[] = [];

  for (const assetId of assetIds) {
    const { data: list, error: listErr } = await supabase.storage
      .from('onboarding-scratch')
      .list(sessionId, { search: assetId });
    if (listErr || !list || list.length === 0) {
      failed.push({ assetId, error: listErr?.message ?? 'not found' });
      continue;
    }
    const scratchName = list[0].name;
    const fromPath = `${sessionId}/${scratchName}`;
    const toPath = `${brandId}/${scratchName}`;
    const { error: moveErr } = await supabase.storage
      .from('onboarding-scratch')
      .move(fromPath, toPath, { destinationBucket: 'brand-assets' });
    if (moveErr) {
      failed.push({ assetId, error: moveErr.message });
      continue;
    }
    moved.push(assetId);
  }

  return new Response(JSON.stringify({ moved, failed }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
