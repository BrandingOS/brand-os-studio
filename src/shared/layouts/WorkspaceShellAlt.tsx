import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useSessionStore } from '@/shared/store/sessionStore';
import '@/shared/styles/cosmos-workspace.css';
import '@/shared/styles/workspace-home.css';

/**
 * WorkspaceShell — the simpler sibling of WorkspaceShell for
 * routes that live OUTSIDE a brand (`/`, `/learn`, `/settings`,
 * `/templates`).
 *
 * Differences vs WorkspaceShell:
 *   - No center tab pill nav. The header is brand-mark (left) +
 *     optional rightActions + theme toggle + profile pill (right).
 *   - No brand context. Always renders the BrandOS wordmark on the
 *     left; never the BrandSwitcher pill.
 *
 * Shared with WorkspaceShell:
 *   - `[data-cosmos="workspace"]` scope → all cosmos-workspace tokens
 *     (surface, text, shadow, ease) apply identically.
 *   - Theme toggle persists to the same `brandos-theme` localStorage
 *     key so a user's light/dark choice carries across shells.
 */

const THEME_KEY = 'brandos-theme';

function readInitialTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* noop */
  }
  return 'light';
}

function initialsFromName(name?: string): string {
  if (!name) return 'JT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'JT';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function WorkspaceShell({
  brandName = 'BrandOS',
  rightActions,
  children,
}: {
  brandName?: string;
  rightActions?: ReactNode;
  children: ReactNode;
}) {
  const user = useSessionStore((s) => s.user);
  const [theme, setTheme] = useState<'light' | 'dark'>(readInitialTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* noop */
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const initials = initialsFromName(user?.name);
  const displayName = user?.name ?? 'Guest';

  return (
    <div data-cosmos="workspace" data-theme={theme}>
      <header className="workspace-top-nav" role="banner">
        <div className="workspace-top-nav-left">
          <NavLink to="/" className="top-nav-brand" aria-label={brandName}>
            <span className="top-nav-brand-mark" aria-hidden="true">
              B
            </span>
            <span>{brandName}</span>
          </NavLink>
        </div>

        {/* Center intentionally empty — workspace shell has no tabs */}
        <div aria-hidden="true" />

        <div className="workspace-top-nav-right">
          {rightActions}
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle light and dark mode"
            title="Toggle theme"
          >
            <svg
              className="theme-icon theme-icon-sun"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            <svg
              className="theme-icon theme-icon-moon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          <button
            type="button"
            className="ws-profile-pill"
            aria-label={`Profile menu for ${displayName}`}
            title={displayName}
            // Hook up to a real profile menu in Phase 6. For now the
            // pill is a visual placeholder — clicking it is a no-op.
          >
            <span className="ws-profile-avatar" aria-hidden="true">
              {initials}
            </span>
            <span>{displayName.split(' ')[0]}</span>
          </button>
        </div>
      </header>

      {children}
    </div>
  );
}

export default WorkspaceShell;
