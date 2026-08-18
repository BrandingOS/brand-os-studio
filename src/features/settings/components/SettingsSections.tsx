import type { ReactNode } from 'react';
import '../settings.css';

/**
 * The single-column stack every settings page renders into.
 *
 * `wide` is for a page whose content is not a form — the plan tiers need room
 * for three across, which the form width cannot give them.
 */
export function SettingsSections({
  wide,
  children,
}: {
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`settings-sections${wide ? ' is-wide' : ''}`}>{children}</div>
  );
}
