import { useEffect } from 'react';
import { startPreferenceBridge } from './preferenceBridge';

/**
 * Renders nothing; owns the preference bridge's lifecycle. Mounted once inside
 * AuthProvider so it starts after the DI container is booted and stops with the
 * app.
 */
export function PreferencesBridge() {
  useEffect(() => startPreferenceBridge(), []);
  return null;
}
