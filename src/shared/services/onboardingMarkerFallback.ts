/**
 * Where the onboarding marker lives when the database has nowhere to put it.
 *
 * Migration 022 adds `brands.onboarding`. Until it is deployed, PostgREST
 * refuses any write naming that column, and the brands adapter drops it so the
 * save still succeeds. That tolerance keeps brands creatable — but it also
 * means an unfinished brand comes back with no marker at all, which every
 * reader is required to interpret as FINISHED. The visible result is the one
 * thing onboarding must not do: a brand abandoned halfway sits in the dashboard
 * next to the brands its owner actually completed, with no way back into the
 * flow that was building it.
 *
 * So the marker is kept here instead, and merged back on read. This is an
 * ADAPTER-level degradation, deliberately: it lives beside `seedBrandOverrides`
 * (which does the same thing for seed brands in the same service) so that
 * `brand.onboarding` still has exactly one meaning everywhere above the
 * service, and `onboardingState.ts` remains the only module that interprets it.
 *
 * What is lost, honestly: the marker is per browser. Start on a laptop and open
 * the same brand on a phone and the flow will think you never started — the
 * brand and everything in it is still there, only your place in the flow is
 * not. That is the same trade the drop already made, made visible in one place
 * instead of silently.
 *
 * The moment the column exists this stops being consulted for new writes, and a
 * brand whose row carries a marker never reads from here at all.
 */

const KEY = 'brandos:onboarding-markers';

type Store = Record<string, unknown>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // A full or unavailable storage costs the user their place in the flow.
    // It must never cost them the save that was already made.
  }
}

/**
 * Keeps a marker the database could not take.
 *
 * A FINISHED marker is deleted rather than stored: absent already means
 * finished everywhere, so writing it would only leave a row behind that says
 * what silence already says.
 */
export function rememberMarker(brandId: string, marker: unknown): void {
  if (!brandId) return;
  const store = read();
  const completed =
    marker && typeof marker === 'object' && Boolean((marker as { completedAt?: unknown }).completedAt);
  if (!marker || completed) {
    if (!(brandId in store)) return;
    delete store[brandId];
  } else {
    store[brandId] = marker;
  }
  write(store);
}

/** The marker held for this brand, or `undefined`. */
export function rememberedMarker(brandId: string): unknown {
  if (!brandId) return undefined;
  return read()[brandId];
}

/** Drops a brand's marker — on finish, and when the brand itself is deleted. */
export function forgetMarker(brandId: string): void {
  rememberMarker(brandId, undefined);
}
