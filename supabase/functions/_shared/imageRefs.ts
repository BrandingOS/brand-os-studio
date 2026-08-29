// Reference images — resolution and storage of generation inputs/outputs.
//
// SECURITY: a reference is NEVER an arbitrary URL. The previous contract took
// `{url}` and fetched it server-side, which is a read-SSRF: any caller could
// point us at an internal address and get the bytes back. The only accepted
// shapes now are
//
//   { kind: 'inline',  dataUrl }        bytes the browser already had
//   { kind: 'storage', path }           an object in OUR bucket, and the path
//                                       must sit under the caller's brand
//
// Both are resolved with the service role, so nothing the caller writes turns
// into an outbound request to a host they chose.

import { imageError } from './imageErrors.ts';
import { readImageDimensions } from './imageProviders.ts';

export const REFERENCE_BUCKET = 'brand-assets';
/** Combined cap across all references on one request. */
export const MAX_REFS_BYTES = 12 * 1024 * 1024;
export const MAX_SINGLE_REF_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif',
]);

export interface ReferenceInput {
  role?: string;
  dataUrl?: string;
  /** Object path inside REFERENCE_BUCKET. */
  path?: string;
}

export interface ResolvedReference {
  role: string;
  bytes: Uint8Array;
  mime: string;
  /** Recorded on the job so the inputs are auditable. */
  descriptor: { role: string; kind: 'inline' | 'storage'; path?: string; bytes: number; mime: string };
}

interface StorageClient {
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: { message: string } | null }>;
      upload: (path: string, body: ArrayBuffer | Uint8Array | Blob, opts?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
    };
  };
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const mime = (m[1] || 'application/octet-stream').toLowerCase();
  try {
    if (!m[2]) return { mime, bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
    const bin = atob(m[3]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime, bytes };
  } catch { return null; }
}

/**
 * Magic-byte sniff. A declared `image/*` content type means nothing — it is a
 * client string. This is what actually decides whether we pass bytes to a
 * vendor (and it is why an SVG, which can carry script, never gets through).
 */
export function sniffImageMime(bytes: Uint8Array): string | null {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes.length >= 6 &&
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return 'image/gif';
  return null;
}

/** A storage path is only accepted inside the caller's own brand folder. */
export function isPathAllowedForBrand(path: string, brandId: string, userId: string): boolean {
  if (!path || path.includes('..') || path.startsWith('/')) return false;
  const segments = path.split('/');
  if (segments.length < 2) return false;
  // Brand-owned assets: `<brandId>/...`
  if (segments[0] === brandId) return true;
  // The caller's own uploaded references: `ai-refs/<userId>/...`
  if (segments[0] === 'ai-refs' && segments[1] === userId) return true;
  return false;
}

export async function resolveReferences(
  refs: ReferenceInput[],
  ctx: { brandId: string; userId: string; maxCount: number; client: StorageClient },
): Promise<{ resolved: ResolvedReference[]; warnings: string[] }> {
  const warnings: string[] = [];
  const resolved: ResolvedReference[] = [];
  let total = 0;

  if (ctx.maxCount <= 0) {
    if (refs.length > 0) warnings.push('refs-unsupported');
    return { resolved, warnings };
  }

  for (const ref of refs) {
    if (resolved.length >= ctx.maxCount) {
      warnings.push(`only the first ${ctx.maxCount} references were used`);
      break;
    }
    const role = typeof ref.role === 'string' ? ref.role.slice(0, 32) : 'image';
    let bytes: Uint8Array | null = null;
    let kind: 'inline' | 'storage' = 'inline';
    let path: string | undefined;

    if (typeof ref.dataUrl === 'string' && ref.dataUrl.startsWith('data:')) {
      const parsed = parseDataUrl(ref.dataUrl);
      if (!parsed) { warnings.push(`reference "${role}" was not readable`); continue; }
      bytes = parsed.bytes;
    } else if (typeof ref.path === 'string') {
      if (!isPathAllowedForBrand(ref.path, ctx.brandId, ctx.userId)) {
        throw imageError('invalid_input', {
          message: 'A reference image does not belong to this brand.',
          providerError: `rejected reference path: ${ref.path}`,
        });
      }
      kind = 'storage';
      path = ref.path;
      const { data, error } = await ctx.client.storage.from(REFERENCE_BUCKET).download(ref.path);
      if (error || !data) { warnings.push(`reference "${role}" could not be loaded`); continue; }
      bytes = new Uint8Array(await data.arrayBuffer());
    } else {
      // Anything else (notably a bare URL) is refused outright.
      warnings.push(`reference "${role}" was ignored — unsupported reference form`);
      continue;
    }

    if (bytes.length > MAX_SINGLE_REF_BYTES) {
      throw imageError('invalid_input', { message: 'A reference image is larger than 8 MB.' });
    }
    total += bytes.length;
    if (total > MAX_REFS_BYTES) {
      throw imageError('invalid_input', { message: 'Reference images exceed 12 MB in total.' });
    }

    const mime = sniffImageMime(bytes);
    if (!mime || !ALLOWED_MIME.has(mime)) {
      warnings.push(`reference "${role}" was ignored — not a PNG, JPEG, WebP or GIF`);
      continue;
    }

    resolved.push({
      role, bytes, mime,
      descriptor: { role, kind, path, bytes: bytes.length, mime },
    });
  }

  return { resolved, warnings };
}

// ─── Output storage ──────────────────────────────────────────────────────────

export interface StoredOutput {
  storagePath: string;
  url: string;
  width?: number;
  height?: number;
  mime: string;
  bytes: number;
  seed?: number;
}

/**
 * Seven days (A4). The path is durable and the client re-signs on demand, so a long TTL
 * bought nothing — but a signed URL is a bearer token that ignores RLS for as long as it
 * lives, so a year of it survives the member being removed, the brand being deleted and
 * the link being pasted into a chat. A week is long enough for a tab left open overnight.
 */
export const OUTPUT_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/svg+xml': 'svg',
};

/**
 * Persist generated bytes into the brand's own folder so an output outlives
 * the request, the browser tab and any provider CDN.
 */
export async function storeOutputs(
  images: Array<{ bytes: Uint8Array; mime: string; width?: number; height?: number; seed?: number }>,
  ctx: { brandId: string; jobId: string; client: StorageClient },
): Promise<StoredOutput[]> {
  const out: StoredOutput[] = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const ext = EXT_BY_MIME[img.mime] ?? 'png';
    const path = `${ctx.brandId}/generated/${ctx.jobId}/${i + 1}.${ext}`;

    const { error } = await ctx.client.storage.from(REFERENCE_BUCKET).upload(
      path,
      img.bytes,
      { contentType: img.mime, upsert: true, cacheControl: '31536000' },
    );
    if (error) {
      throw imageError('storage_failure', { providerError: `upload ${path}: ${error.message}` });
    }

    const signed = await ctx.client.storage.from(REFERENCE_BUCKET)
      .createSignedUrl(path, OUTPUT_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      throw imageError('storage_failure', {
        providerError: `sign ${path}: ${signed.error?.message ?? 'no url'}`,
      });
    }

    const dims = img.width && img.height
      ? { width: img.width, height: img.height }
      : readImageDimensions(img.bytes) ?? undefined;

    out.push({
      storagePath: path,
      url: signed.data.signedUrl,
      width: dims?.width,
      height: dims?.height,
      mime: img.mime,
      bytes: img.bytes.length,
      seed: img.seed,
    });
  }
  return out;
}
