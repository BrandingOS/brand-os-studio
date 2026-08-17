// Uploading a reference image.
//
// The bytes go through the upload-ai-reference Edge Function, which writes them
// with the service role into the caller's own `ai-refs/<userId>/…` folder and
// hands back BOTH a preview URL and the storage PATH. The path is what travels
// with a generation: the server resolves it itself, so no caller-supplied URL
// is ever fetched on the server's behalf.

import { supabase, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '@/integrations/supabase/client';
import type { AttachedReference } from './components/ReferenceStrip';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export async function uploadReference(file: File): Promise<AttachedReference> {
  if (!ACCEPTED.includes(file.type)) {
    throw new Error('Reference images must be PNG, JPEG or WebP.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('Reference images must be smaller than 8 MB.');
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error('Sign in to attach reference images.');

  const fileBase64 = await toBase64(file);
  const base = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
  const res = await fetch(`${base}/functions/v1/upload-ai-reference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      sessionId: sessionData.session.user.id,
      fileBase64,
      contentType: file.type,
      ext: (file.name.split('.').pop() || 'png').toLowerCase(),
    }),
  });
  if (!res.ok) throw new Error('Could not upload that image. Try again.');

  const { url, path } = await res.json() as { url: string; path: string };
  return { id: crypto.randomUUID(), path, previewUrl: url, fileName: file.name };
}

async function toBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}
