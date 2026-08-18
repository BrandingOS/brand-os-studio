import type { ReactNode } from 'react';
import '../settings.css';

/** The single-column stack every settings page renders into. */
export function SettingsSections({ children }: { children: ReactNode }) {
  return <div className="settings-sections">{children}</div>;
}
