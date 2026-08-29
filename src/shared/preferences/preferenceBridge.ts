/**
 * The seam between the stores that already own each preference and the service
 * that persists them.
 *
 * Nothing existing is renamed, re-keyed or re-typed. `useUiPreferenceStore`
 * keeps its `persist` key, its version and its default; `useGeneratePrefs`
 * keeps its own. Their READS are untouched, so every synchronous initialiser in
 * the app still works exactly as before. This just carries changes both ways.
 *
 * The `applying` latch is load-bearing. Without it, pushing a server value into
 * a store fires that store's subscriber, which calls `set()`, which notifies
 * the service, which pushes into the store again — a loop that would hammer the
 * database for as long as the tab stayed open.
 */
import { container } from '@/core/container/ServiceContainer';
import {
  SERVICE_KEYS,
  type IUserPreferencesService,
  type UserPreferences,
} from '@/core/types/services';
import { useUiPreferenceStore } from '@/shared/hooks/useUiPreference';
import { useWorkspaceStore } from '@/shared/store/workspaceStore';
import { useGeneratePrefs } from '@/features/editor/shell/v2/panels/generate/generatePrefs';

let applying = false;
let stop: (() => void) | null = null;

function service(): IUserPreferencesService {
  return container.get<IUserPreferencesService>(SERVICE_KEYS.USER_PREFERENCES);
}

/** Push a preference change from ANY component into the service. */
export function writePreference(patch: UserPreferences): void {
  if (applying) return;
  try {
    void service().set(patch);
  } catch {
    // The container may not be booted yet in a unit test that renders a
    // component in isolation. A preference is never worth throwing over.
  }
}

const INCLUSION_KEYS = ['logo', 'text', 'colours', 'identity'] as const;

/** True when two inclusion bags say the same thing, treating absent as on. */
function sameInclusions(
  a: Partial<Record<typeof INCLUSION_KEYS[number], boolean>> | undefined,
  b: Partial<Record<typeof INCLUSION_KEYS[number], boolean>> | undefined,
): boolean {
  return INCLUSION_KEYS.every((k) => (a?.[k] ?? true) === (b?.[k] ?? true));
}

/** Server (or another tab) → the stores. */
function applyToStores(prefs: UserPreferences): void {
  applying = true;
  try {
    if (prefs.uiPreference && prefs.uiPreference !== useUiPreferenceStore.getState().preference) {
      useUiPreferenceStore.getState().setPreference(prefs.uiPreference);
    }

    if (prefs.aiGenerate) {
      const gen = useGeneratePrefs.getState();
      const { include, model, count } = prefs.aiGenerate;
      // A partial bag from an older client is merged over "everything
      // included", so a missing key can never silently drop part of the brand.
      if (include && !sameInclusions(include, gen.include)) {
        gen.setInclude({
          logo: include.logo ?? true,
          text: include.text ?? true,
          colours: include.colours ?? true,
          identity: include.identity ?? true,
        });
      }
      if (model !== undefined && model !== gen.model) gen.setModel(model);
      if (count !== undefined && count !== gen.count) gen.setCount(count);
    }

    // Theme is applied by useWorkspaceTheme, which reads the mirror on mount.
    // Writing next-themes' key from here would race the provider's own hydration.
  } finally {
    applying = false;
  }
}

/**
 * Start the two-way sync. Idempotent and safe to call twice (StrictMode).
 * Returns a stop function; the mounted <PreferencesBridge /> owns the lifecycle.
 */
export function startPreferenceBridge(): () => void {
  if (stop) return stop;

  const prefs = service();

  applyToStores(prefs.getCached());
  const offService = prefs.subscribe(applyToStores);

  const offUi = useUiPreferenceStore.subscribe((state, prev) => {
    if (applying || state.preference === prev.preference) return;
    writePreference({ uiPreference: state.preference });
  });

  const offGenerate = useGeneratePrefs.subscribe((state, prev) => {
    if (applying) return;
    if (
      sameInclusions(state.include, prev.include) &&
      state.model === prev.model &&
      state.count === prev.count
    ) {
      return;
    }
    writePreference({
      aiGenerate: { include: { ...state.include }, model: state.model, count: state.count },
    });
  });

  const offWorkspace = useWorkspaceStore.subscribe((state, prev) => {
    if (applying || state.current?.id === prev.current?.id) return;
    writePreference({ lastWorkspaceId: state.current?.id ?? null });
  });

  stop = () => {
    offService();
    offUi();
    offGenerate();
    offWorkspace();
    stop = null;
  };
  return stop;
}
