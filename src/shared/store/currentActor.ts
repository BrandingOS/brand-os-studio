/**
 * Who is performing the Core write happening right now.
 *
 * Core metadata records `setBy` for every value. Without this, every write from
 * the UI was attributed to `UNATTRIBUTED_ACTOR` — a human actor with the literal
 * user id `"unattributed"` — so the authorship the metadata exists to carry was
 * lost at the moment it was recorded.
 *
 * This reads the session rather than taking an actor parameter because
 * `brandStore.update` is the SINGLE funnel every UI Core edit passes through
 * (Setup, Brand Board, editor tools, brand kit — all of them call it). One
 * resolution point at that funnel attributes all of them; threading an actor
 * argument through every call site would be the same information, spelled out
 * dozens of times, with dozens of chances to forget.
 *
 * When there is genuinely no user — signed out, or the dev auth bypass, which
 * seeds a local session with no Supabase identity — the fallback stays
 * `UNATTRIBUTED_ACTOR`. That is honest: an unknown author is recorded as
 * unknown, not invented. It still cannot launder anything into brand truth,
 * because ordinary writes never reach Confirmed or Official no matter who
 * performs them; only `promoteCoreValue` does, and it takes an explicit
 * `HumanActor` with no default.
 */
import type { Actor } from '@/domain/brand/coreMeta';
import { UNATTRIBUTED_ACTOR, type CoreWriteOptions } from '@/application/brand/coreWrite';
import { useSessionStore } from './sessionStore';

/** The acting user, or the unattributed stand-in when nobody is signed in. */
export function currentActor(): Actor {
  try {
    const userId = useSessionStore.getState().user?.id;
    return userId ? { kind: 'human', userId } : UNATTRIBUTED_ACTOR;
  } catch {
    // Never let attribution break a save. An unreachable store (a non-React
    // caller, a test harness) means unknown author, not a failed write.
    return UNATTRIBUTED_ACTOR;
  }
}

/** `CoreWriteOptions` carrying the current actor. Provenance stays derived. */
export function currentCoreWriteOptions(): CoreWriteOptions {
  return { actor: currentActor() };
}
