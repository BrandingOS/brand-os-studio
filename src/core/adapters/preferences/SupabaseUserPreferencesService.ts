/**
 * Preferences that follow the user to another device (`public.user_preferences`,
 * migration 030).
 *
 * It EXTENDS the local service rather than wrapping one, because it genuinely
 * is the local service plus a server round-trip: the localStorage mirror stays
 * the synchronous read cache, and every read path is inherited unchanged. What
 * this class adds is hydrate() reconciling against the server row, and set()
 * scheduling a debounced write-back.
 *
 * Degrades the way 014/015/017/018 do: if the table is not deployed yet every
 * operation is exactly the local behaviour, so this can ship ahead of the
 * migration and change nothing for anyone. That fallback is also what makes the
 * down migration safe.
 */
import { supabase } from '@/integrations/supabase/client';
import type { UserPreferences } from '@/core/types/services';
import { LocalUserPreferencesService } from './LocalUserPreferencesService';
import { mergePreferences, seedFromLegacyKeys } from './preferencesShape';

// The generated Supabase types stop at ~migration 008 — the same untyped
// accessor `designs` (015) and `brand_kit_state` (018) use. Remove when
// src/integrations/supabase/types.ts is regenerated.
const table = () => (supabase as any).from('user_preferences');

/** How long to coalesce a burst of preference changes into one server write. */
const WRITE_DEBOUNCE_MS = 600;

type PgError = { code?: string; message?: string } | null;

function isMissingTable(error: PgError): boolean {
  if (!error) return false;
  // 42P01 = undefined_table (Postgres); PGRST205 = PostgREST cannot find the
  // relation in its schema cache, which is what a client actually receives.
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .* does not exist|could not find the table/i.test(error.message ?? '')
  );
}

export class SupabaseUserPreferencesService extends LocalUserPreferencesService {
  /** Latched on the first missing-table answer: one probe per session, not one per write. */
  private degraded = false;
  private userId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: UserPreferences = {};
  private inFlight: Promise<void> | null = null;

  isServerBacked(): boolean {
    return !this.degraded && this.userId !== null;
  }

  private async resolveUserId(): Promise<string | null> {
    if (this.userId) return this.userId;
    const { data } = await supabase.auth.getUser();
    this.userId = data?.user?.id ?? null;
    return this.userId;
  }

  /**
   * Reconcile the mirror against the server row. Three cases, and the third is
   * the migration of every user who existed before 030.
   */
  async hydrate(): Promise<UserPreferences> {
    const local = await super.hydrate();

    const uid = await this.resolveUserId();
    if (!uid) return local;

    const { data, error } = await table()
      .select('preferences')
      .eq('user_id', uid)
      .maybeSingle();

    if (isMissingTable(error)) {
      this.degraded = true;
      return local;
    }
    if (error) {
      // A transient failure must not lose the local value or throw into boot.
      console.warn('[preferences] hydrate failed, staying local:', error.message);
      return local;
    }

    const server: UserPreferences | undefined = data?.preferences;

    // Case 3 — no server row. This user's preferences have only ever been
    // local, so seed the first row from the pre-030 keys. Those keys are NEVER
    // deleted, so rolling 030 back is a no-op for them.
    if (!server) {
      const seeded = mergePreferences(seedFromLegacyKeys(), local);
      this.replaceCache(seeded);
      await this.upsert(uid, seeded);
      return seeded;
    }

    // Cases 1 and 2 — the SERVER wins on conflicting keys. A fresh device holds
    // defaults, not intentions: if local won, signing in on a new laptop would
    // silently push that laptop's defaults over the user's real settings.
    // Local-only keys are promoted rather than dropped.
    const merged = mergePreferences(local, server);
    this.replaceCache(merged);

    // Promote anything the server did not have, once.
    if (JSON.stringify(merged) !== JSON.stringify(server)) {
      await this.upsert(uid, merged);
    }
    return merged;
  }

  async set(patch: UserPreferences): Promise<UserPreferences> {
    // Synchronous half first: cache, mirror and subscribers all update now, so
    // the UI never waits on the network to reflect a toggle.
    const merged = await super.set(patch);
    if (this.degraded) return merged;

    this.pending = mergePreferences(this.pending, patch);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.flush(), WRITE_DEBOUNCE_MS);
    return merged;
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.inFlight) await this.inFlight;
    if (this.degraded) return;

    const patch = this.pending;
    if (Object.keys(patch).length === 0) return;
    this.pending = {};

    this.inFlight = this.writeThrough(patch).finally(() => {
      this.inFlight = null;
    });
    await this.inFlight;
  }

  /**
   * Read-modify-write, not a blind upsert of the local cache.
   *
   * This is what lets two devices that changed DIFFERENT keys both survive.
   * Only the same key changed on two devices concurrently is last-write-wins,
   * which is the correct and least surprising semantic for preferences — and it
   * needs no vector clocks, no updated_at comparison and no merge UI.
   */
  private async writeThrough(patch: UserPreferences): Promise<void> {
    const uid = await this.resolveUserId();
    if (!uid) return;

    const { data, error: readErr } = await table()
      .select('preferences')
      .eq('user_id', uid)
      .maybeSingle();

    if (isMissingTable(readErr)) {
      this.degraded = true;
      return;
    }

    const merged = mergePreferences(data?.preferences ?? {}, patch);
    const { error } = await table().upsert(
      { user_id: uid, preferences: merged, version: 1 },
      { onConflict: 'user_id' },
    );

    if (isMissingTable(error)) {
      this.degraded = true;
      return;
    }
    if (error) {
      // Keep the local value and retry on the next write. A preference write
      // must never surface an error toast.
      console.warn('[preferences] write failed, keeping local value:', error.message);
      this.pending = mergePreferences(patch, this.pending);
    }
  }

  private async upsert(uid: string, prefs: UserPreferences): Promise<void> {
    const { error } = await table().upsert(
      { user_id: uid, preferences: prefs, version: 1 },
      { onConflict: 'user_id' },
    );
    if (isMissingTable(error)) this.degraded = true;
    else if (error) console.warn('[preferences] seed failed:', error.message);
  }
}
