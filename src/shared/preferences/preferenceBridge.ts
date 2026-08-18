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

/** Server (or another tab) → the stores. */
function applyToStores(prefs: UserPreferences): void {
  applying = true;
  try {
    if (prefs.uiPreference && prefs.uiPreference !== useUiPreferenceStore.getState().preference) {
      useUiPreferenceStore.getState().setPreference(prefs.uiPreference);
    }

    if (prefs.aiGenerate) {
      const gen = useGeneratePrefs.getState();
      const { brandAware, model, count } = prefs.aiGenerate;
      if (brandAware !== undefined && brandAware !== gen.brandAware) gen.setBrandAware(brandAware);
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
      state.brandAware === prev.brandAware &&
      state.model === prev.model &&
      state.count === prev.count
    ) {
      return;
    }
    writePreference({
      aiGenerate: { brandAware: state.brandAware, model: state.model, count: state.count },
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
