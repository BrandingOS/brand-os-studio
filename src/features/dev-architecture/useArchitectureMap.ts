/**
 * Loads the generated architecture map from the dev-server endpoint.
 *
 * The endpoint only exists while `vite dev` is running (the plugin is
 * `apply: 'serve'`), which is intentional: this tool has no production mode to
 * degrade into. A failed fetch therefore reports "dev server only" rather than
 * pretending the data is missing.
 */
import { useCallback, useEffect, useState } from 'react';

import type { ArchitectureMap } from './types';

export const ARCHITECTURE_MAP_URL = '/__architecture-map.json';

type State =
  | { status: 'loading' }
  | { status: 'ready'; map: ArchitectureMap }
  | { status: 'error'; message: string };

export function useArchitectureMap() {
  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const response = await fetch(ARCHITECTURE_MAP_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`endpoint returned ${response.status}`);
      }
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        // The SPA fallback served index.html — the plugin isn't registered.
        throw new Error(
          'the /__architecture-map.json endpoint is not registered (restart `npm run dev`)',
        );
      }
      const map = (await response.json()) as ArchitectureMap;
      if (map.schemaVersion !== 1) {
        throw new Error(
          `map schemaVersion ${map.schemaVersion} does not match this UI (expected 1)`,
        );
      }
      setState({ status: 'ready', map });
    } catch (error) {
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, reload: load };
}
