/**
 * claim.ts — turn an anonymous tool session into a real brand on signup.
 *
 * The contract:
 *  1. The signup flow lands the user at `/claim?slug=...&feature=...`.
 *  2. The ClaimPage looks up the most-recent anonymous session for that
 *     slug, calls `claimSession`, and routes the user into the resulting
 *     brand.
 *  3. The session is cleared from localStorage.
 *
 * Each tool registers a `materialize` function that knows how to convert
 * its payload into a `CreateBrandInput` plus any post-create patches.
 * That keeps tool-specific knowledge out of the platform.
 */
import { services } from '@/shared/services/registry';
import type { Brand, CreateBrandInput } from '@/shared/types/brand';
import type { ToolSession, ToolSlug } from './types';

export interface MaterializedSession {
  create: CreateBrandInput;
  /** Optional patch applied after creation (e.g. logoAssets, assets). */
  patch?: Partial<Brand>;
}

export type Materializer<TPayload> = (
  session: ToolSession<TPayload>,
) => MaterializedSession;

const materializers = new Map<ToolSlug, Materializer<unknown>>();

export function registerMaterializer<TPayload>(
  slug: ToolSlug,
  fn: Materializer<TPayload>,
) {
  materializers.set(slug, fn as Materializer<unknown>);
}

const STORAGE_PREFIX = 'brandos:tool-session';
const TOKEN_KEY = 'brandos:tool-anon-token';

function findMostRecentSession<TPayload>(slug: ToolSlug): ToolSession<TPayload> | null {
  if (typeof window === 'undefined') return null;
  let best: ToolSession<TPayload> | null = null;
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith(`${STORAGE_PREFIX}:${slug}:`)) continue;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key)!) as ToolSession<TPayload>;
      if (!best || parsed.updatedAt > best.updatedAt) best = parsed;
    } catch {
      /* skip corrupted entries */
    }
  }
  return best;
}

function clearSession(slug: ToolSlug, token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(`${STORAGE_PREFIX}:${slug}:${token}`);
}

/**
 * Materialize the most recent anonymous session for `slug` into a real
 * brand. Returns the new brand. Caller routes the user to it.
 */
export async function claimSession(slug: ToolSlug): Promise<Brand | null> {
  const session = findMostRecentSession(slug);
  if (!session) return null;
  const fn = materializers.get(slug);
  if (!fn) {
    console.warn(`[claim] No materializer registered for tool slug "${slug}"`);
    return null;
  }
  const { create, patch } = fn(session);
  const brand = await services.brands.create(create);
  if (patch) {
    await services.brands.update(brand.id, patch);
  }
  // Clean up the anon session — the work now lives in the brand.
  if (session.anonymousToken) {
    clearSession(slug, session.anonymousToken);
  }
  // Also clear the bare token so the next public-mode visit starts fresh.
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(TOKEN_KEY);
  }
  return brand;
}
