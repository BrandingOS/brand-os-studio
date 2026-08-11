import { useBrandStore } from '@/shared/store/brandStore';
import { freeDisposableStorage, isStorageFullError } from '@/shared/utils/storageCleanup';

/** True for the Postgres unique-violation family a duplicate slug raises. */
export function isDuplicateSlugError(e: unknown): boolean {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  if (String(o.code) === '23505') return true;
  const msg = String((o as { message?: unknown }).message ?? '');
  if (/duplicate key|unique constraint|brands_slug/i.test(msg)) return true;
  return false;
}

/**
 * Create a brand with the two recoveries every onboarding path needs:
 *
 * - Duplicate slug: the Supabase brands table regenerates `slug` from
 *   `name` in a BEFORE INSERT trigger, so the only way to get a fresh
 *   slug past the global unique constraint is a fresh NAME — retry with
 *   " 2", " 3"… appended. (Local brands uniquify their own slugs and
 *   never throw this.)
 * - Browser storage full: reclaim the disposable half (caches, drafts,
 *   tutorial flags) once, then retry.
 *
 * Both /onboard-brand submit paths go through here so they behave the
 * same; failures beyond the retries re-throw for the caller's reporting.
 */
export async function createBrandResilient(input: Record<string, unknown>) {
  const baseName = String(input.name ?? '').trim() || 'Brand';
  let attemptInput = input;
  let freedOnce = false;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await useBrandStore.getState().create(attemptInput as never);
    } catch (err) {
      if (isStorageFullError(err) && !freedOnce) {
        freedOnce = true;
        const freedKB = freeDisposableStorage();
        console.warn(`[onboarding-v4] storage full — freed ${freedKB} KB of caches, retrying`);
        continue;
      }
      if (!isDuplicateSlugError(err) || attempt === 5) throw err;
      const nextName = `${baseName} ${attempt + 2}`;
      attemptInput = { ...input, name: nextName };
    }
  }
  // Loop exit without return only happens if attempt 5 also failed, and we
  // already re-threw above. TS just doesn't see that.
  throw new Error('Slug retry exhausted');
}
