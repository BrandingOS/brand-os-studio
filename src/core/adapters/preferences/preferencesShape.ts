/**
 * The shape of a user's preferences, how two copies of it merge, and the
 * localStorage mirror both implementations read through.
 *
 * There is one mirror key (`brandos:preferences`) and it is a CACHE, not the
 * source of truth. Reads have to be synchronous — `useUiPreferenceStore`'s
 * zustand `persist` initialiser and `InnerNavRail`'s `useState` initialiser
 * both need a value during the first render and cannot await a network call —
 * so the mirror is what they read, and the server row is what reconciles it on
 * sign-in.
 */
import type { UserPreferences } from '@/core/types/services';

export const MIRROR_KEY = 'brandos:preferences';

/**
 * The keys each preference lived under before this feature existed. On a user's
 * first sign-in after migration 030 there is no server row, so the first one is
 * seeded from these — and they are NEVER deleted afterwards, so rolling 030
 * back is a no-op for the user rather than a data loss.
 */
export const LEGACY_KEYS = {
  uiPreference: 'brandos:ui-preference',
  theme: 'brandos-theme',
  innerNavOpen: 'brandos:inner-nav-open',
  aiGenerate: 'brandos:ai-image:prefs',
  featuresSeen: 'brandos:features-seen',
  lastWorkspace: 'brandos-workspace',
} as const;

function readJson<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/**
 * Deep for the two nested bags, shallow elsewhere.
 *
 * `undefined` in the patch means "not mentioned" and leaves the base alone;
 * `null` on lastWorkspaceId means "cleared" and must survive, which is why the
 * check is `!== undefined` rather than a truthiness test.
 */
export function mergePreferences(
  base: UserPreferences,
  patch: UserPreferences,
): UserPreferences {
  const next: UserPreferences = { ...base };

  if (patch.theme !== undefined) next.theme = patch.theme;
  if (patch.uiPreference !== undefined) next.uiPreference = patch.uiPreference;
  if (patch.innerNavOpen !== undefined) next.innerNavOpen = patch.innerNavOpen;
  if (patch.lastWorkspaceId !== undefined) next.lastWorkspaceId = patch.lastWorkspaceId;

  if (patch.aiGenerate) {
    next.aiGenerate = { ...(base.aiGenerate ?? {}), ...patch.aiGenerate };
  }
  if (patch.dismissed) {
    next.dismissed = {
      ...(base.dismissed ?? {}),
      ...patch.dismissed,
      // The three maps merge key-by-key: dismissing one hint must not forget
      // every hint dismissed before it.
      featuresSeen: patch.dismissed.featuresSeen
        ? { ...(base.dismissed?.featuresSeen ?? {}), ...patch.dismissed.featuresSeen }
        : base.dismissed?.featuresSeen,
      hints: patch.dismissed.hints
        ? { ...(base.dismissed?.hints ?? {}), ...patch.dismissed.hints }
        : base.dismissed?.hints,
      tours: patch.dismissed.tours
        ? { ...(base.dismissed?.tours ?? {}), ...patch.dismissed.tours }
        : base.dismissed?.tours,
    };
  }

  return next;
}

export function readMirror(): UserPreferences {
  if (typeof window === 'undefined') return {};
  const stored = readJson<UserPreferences>(MIRROR_KEY);
  return stored && typeof stored === 'object' ? stored : {};
}

export function writeMirror(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MIRROR_KEY, JSON.stringify(prefs));
  } catch {
    /* Quota or private mode — the in-memory copy still serves this session. */
  }
}

/**
 * Build a preferences object out of the pre-030 localStorage keys.
 *
 * Only called when a signed-in user has NO server row, i.e. exactly once per
 * existing user. Anything absent stays absent rather than being defaulted, so
 * the first server row records real choices and not this device's defaults.
 */
export function seedFromLegacyKeys(): UserPreferences {
  if (typeof window === 'undefined') return {};
  const out: UserPreferences = {};

  // zustand `persist` wraps its payload as { state, version }.
  const ui = readJson<{ state?: { preference?: 'studio' | 'classic' } }>(
    LEGACY_KEYS.uiPreference,
  );
  if (ui?.state?.preference) out.uiPreference = ui.state.preference;

  try {
    const theme = window.localStorage.getItem(LEGACY_KEYS.theme);
    if (theme === 'dark' || theme === 'light') out.theme = theme;
  } catch {
    /* noop */
  }

  try {
    const nav = window.localStorage.getItem(LEGACY_KEYS.innerNavOpen);
    if (nav === '1' || nav === '0') out.innerNavOpen = nav === '1';
  } catch {
    /* noop */
  }

  const ai = readJson<{
    state?: {
      include?: { logo?: boolean; text?: boolean; colours?: boolean; identity?: boolean };
      model?: string; count?: number;
    };
  }>(LEGACY_KEYS.aiGenerate);
  if (ai?.state) {
    const { include, model, count } = ai.state;
    const bag: UserPreferences['aiGenerate'] = {};
    // `brandAware` is deliberately NOT read across. It was one boolean standing
    // for four independent decisions, and we cannot tell which of them a user
    // who had turned it off actually meant — so they start from everything
    // included, which is the reading that loses no brand information.
    if (include !== undefined) bag.include = include;
    if (model !== undefined) bag.model = model;
    if (count !== undefined) bag.count = count;
    if (Object.keys(bag).length > 0) out.aiGenerate = bag;
  }

  const seen = readJson<Record<string, string>>(LEGACY_KEYS.featuresSeen);
  if (seen && Object.keys(seen).length > 0) out.dismissed = { featuresSeen: seen };

  const ws = readJson<{ state?: { current?: { id?: string } } }>(LEGACY_KEYS.lastWorkspace);
  if (ws?.state?.current?.id) out.lastWorkspaceId = ws.state.current.id;

  return out;
}
