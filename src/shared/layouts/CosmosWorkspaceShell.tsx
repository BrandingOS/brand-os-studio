import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import '@/shared/styles/cosmos-workspace.css';

/**
 * Shared workspace shell for the new Cosmos UI direction.
 *
 * Layout:
 *   - Top bar (sticky): left brand mark · center segmented nav · right utilities
 *   - Outlet: the page fills the rest; it can use `.shell` + `.panel` + `.board-wrap`
 *     for the two-column Setup page, or `.workspace-empty` for sibling tabs.
 *
 * The cosmos theme (warm cream in light, deep charcoal in dark) is scoped to
 * [data-cosmos="workspace"]. Theme preference persists in localStorage under
 * the same key the onboarding flow uses ("brandos-theme").
 */

export type WorkspaceTab = {
  label: string;
  to: string;
  end?: boolean;
};

export const DEFAULT_WORKSPACE_TABS: WorkspaceTab[] = [
  { label: 'Setup', to: '/setup', end: false },
  { label: 'Brand Kit', to: '/brand-kit' },
  { label: 'Guideline', to: '/guideline' },
  { label: 'Design', to: '/design-workspace' },
  { label: 'Tools', to: '/tools-workspace' },
];

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

export function CosmosWorkspaceShell({
  tabs = DEFAULT_WORKSPACE_TABS,
  brandName = 'BrandOS',
  rightActions,
  children,
}: {
  tabs?: WorkspaceTab[];
  brandName?: string;
  rightActions?: ReactNode;
  children: ReactNode;
}) {
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

  return (
    <div data-cosmos="workspace" data-theme={theme}>
      <header className="top-nav-wrap" role="banner">
        <div className="top-nav-left">
          <NavLink to="/setup" className="top-nav-brand" aria-label={brandName}>
            <span className="top-nav-brand-mark" aria-hidden="true">
              B
            </span>
            <span>{brandName}</span>
          </NavLink>
        </div>

        <nav className="segmented-nav" aria-label="Primary">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `segmented-nav-item${isActive ? ' is-active' : ''}`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>

        <div className="top-nav-right">
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
        </div>
      </header>

      {children}
    </div>
  );
}

export default CosmosWorkspaceShell;
