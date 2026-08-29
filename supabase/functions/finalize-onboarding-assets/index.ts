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

  // ─── AuthZ, both ends of the move ─────────────────────────────────────────
  // DESTINATION: the caller must be able to upload into this brand — capability, not
  // bare membership (a viewer of the workspace was previously enough).
  const { data: brand, error: brandErr } = await supabase
    .from('brands')
    .select('id, workspace_id')
    .eq('id', brandId)
    .maybeSingle();
  if (brandErr || !brand) return new Response('Brand not found', { status: 404, headers: cors });

  const { data: caps } = await supabase.rpc('effective_capabilities', {
    _user_id: user.id, _workspace_id: brand.workspace_id, _brand_id: brand.id,
  });
  if (!Array.isArray(caps) || !caps.includes('library.upload')) {
    return new Response('Forbidden', { status: 403, headers: cors });
  }

  // SOURCE: the scratch session must be the CALLER'S. This was the missing half — the
  // session id came from the body and was used verbatim with the service role, so an
  // authenticated user who obtained someone else's onboarding session id could move that
  // person's logos and brand imagery into their own brand and read them (threat A27,
  // finding S3-B in docs/phase-2/stage-1/03-SECURITY-VERIFICATION.md).
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(sessionId)) {
    return new Response('Bad sessionId', { status: 400, headers: cors });
  }
  const { data: scratchOwners, error: ownerErr } = await supabase
    .schema('storage')
    .from('objects')
    .select('owner')
    .eq('bucket_id', 'onboarding-scratch')
    .like('name', `${sessionId}/%`)
    .limit(50);
  if (ownerErr) return new Response('Could not verify the upload session', { status: 500, headers: cors });
  // An empty session is nothing to move; a session containing anyone else's object is refused.
  if ((scratchOwners ?? []).some((o: { owner: string | null }) => o.owner !== user.id)) {
    return new Response('Forbidden', { status: 403, headers: cors });
  }

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
