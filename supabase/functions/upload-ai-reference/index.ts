// Edge Function: upload-ai-reference.
//
// Why this exists:
//   The `brand-assets` bucket's RLS policy requires the first path
//   segment to be a brand UUID the user is a member of. Reference
//   images for AI image generation aren't tied to a brand id, and
//   seed brands have non-UUID ids — so direct-from-browser uploads
//   fail with "invalid input syntax for type uuid" or RLS rejection.
//
//   This function uses the service-role client to upload under a
//   path that doesn't conflict with brand paths and to mint a signed
//   URL the browser can hand to the AI vendor (Pollinations Kontext).
//   Service role bypasses RLS; signed URLs work for anonymous fetch.
//
// Contract:
//   POST { sessionId, fileBase64, contentType, ext? }
//   → { url, path, expiresAt }

import { corsHeaders } from '../_shared/cors.ts';
import {
  enforceRateLimit, getClientIp, logCall, requireSession, withCors,
} from '../_shared/ai.ts';
import { createServiceClient, createUserClient } from '../_shared/supabase.ts';

const FUNCTION_NAME = 'upload-ai-reference';
const BUCKET = 'brand-assets';
const PATH_PREFIX = 'ai-refs';
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const cors = { ...corsHeaders, 'Access-Control-Allow-Methods': 'POST, OPTIONS' };

interface UploadBody {
  sessionId?: string;
  fileBase64?: string;
  contentType?: string;
  ext?: string;
}

Deno.serve(withCors(cors, async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized — bearer token required.', { status: 401 });
  }

  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const sessionId = requireSession(body as Record<string, unknown>);
  const ipAddress = getClientIp(req);

  if (!body.fileBase64 || !body.contentType) {
    return Response.json({ error: 'fileBase64 and contentType are required' }, { status: 400, headers: cors });
  }
  if (!body.contentType.startsWith('image/')) {
    return Response.json({ error: 'Only image uploads are allowed' }, { status: 400, headers: cors });
  }

  // Decode base64.
  let bytes: Uint8Array;
  try {
    const bin = atob(body.fileBase64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return Response.json({ error: 'Invalid base64 payload' }, { status: 400, headers: cors });
  }
  if (bytes.length > MAX_FILE_BYTES) {
    return Response.json({ error: `File exceeds ${MAX_FILE_BYTES} bytes` }, { status: 413, headers: cors });
  }

  // Resolve the authenticated user. The path is namespaced by the
  // user's id so concurrent uploads from different users never collide.
  const userClient = createUserClient(authHeader);
  const { data: userData } = await userClient.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) {
    return Response.json({ error: 'Sign in required' }, { status: 401, headers: cors });
  }

  await enforceRateLimit({
    sessionId,
    ipAddress,
    functionName: FUNCTION_NAME,
    windows: [{ windowMinutes: 60, maxCalls: 60 }],
    ipWindow: { windowMinutes: 1440, maxCalls: 300 },
  });

  const safeExt = (body.ext || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'png';
  const path = `${PATH_PREFIX}/${userId}/${Date.now()}-${crypto.randomUUID()}.${safeExt}`;

  // Service role bypasses RLS — required because the bucket's policy
  // would otherwise cast the first segment of the path to UUID and
  // reject 'ai-refs' outright.
  const admin = createServiceClient();
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: body.contentType, upsert: false });

  if (uploadErr) {
    return Response.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500, headers: cors });
  }

  // The bucket is private (`public: false`), so getPublicUrl is a
  // no-op. Mint a signed URL valid for an hour — long enough for the
  // user to submit a generation that includes this reference.
  const { data: signed, error: signErr } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signErr || !signed) {
    return Response.json({ error: `Sign URL failed: ${signErr?.message ?? 'unknown'}` }, { status: 500, headers: cors });
  }

  await logCall({
    sessionId, ipAddress, functionName: FUNCTION_NAME, model: 'storage', inputTokens: 0, outputTokens: 0,
  });

  return Response.json(
    {
      url: signed.signedUrl,
      path,
      expiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString(),
    },
    { headers: cors },
  );
}));
