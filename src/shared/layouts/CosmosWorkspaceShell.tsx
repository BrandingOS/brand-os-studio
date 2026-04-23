import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// Persisted across shell remounts so the active pill starts where it
// last was and smoothly transitions to the newly-active tab instead of
// appearing at the new position from scratch. Each workspace route
// renders its own CosmosWorkspaceShell, so the React tree remounts on
// navigation — this module-level cache bridges that.
type PillStyle = { left: number; width: number };
let lastPillStyle: PillStyle | null = null;
let hasOpenedOnce = false;
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

  // Segmented-nav active pill. Seeded from the module-level cache so a
  // freshly-mounted shell (after a route change) starts with the pill at
  // its previous position and animates to the new one via the CSS
  // transition, instead of appearing at the new position from scratch.
  // Using useEffect (not useLayoutEffect) is intentional: we need the
  // browser to paint the cached position once before the state update
  // re-renders with the new position, otherwise React batches both
  // paints into one and there's no transition.
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const [pillStyle, setPillStyle] = useState<PillStyle | null>(lastPillStyle);
  // Only run the container "open" keyframe on the first-ever shell
  // mount. Subsequent mounts (tab-to-tab nav) skip it so only the pill
  // transition is visible.
  const [shouldAnimateOpen] = useState(() => !hasOpenedOnce);

  const measurePill = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('.segmented-nav-item.is-active');
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const aRect = active.getBoundingClientRect();
    const next = {
      left: aRect.left - navRect.left,
      width: aRect.width,
    };
    lastPillStyle = next;
    setPillStyle(next);
  }, []);

  useEffect(() => {
    hasOpenedOnce = true;
  }, []);

  useEffect(() => {
    measurePill();
  }, [location.pathname, measurePill]);

  useEffect(() => {
    window.addEventListener('resize', measurePill);
    return () => window.removeEventListener('resize', measurePill);
  }, [measurePill]);

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

        <nav
          ref={navRef}
          className={`segmented-nav${shouldAnimateOpen ? ' is-opening' : ''}`}
          aria-label="Primary"
        >
          {pillStyle && (
            <span
              className="segmented-nav-pill"
              aria-hidden
              style={{
                transform: `translateX(${pillStyle.left}px)`,
                width: pillStyle.width,
              }}
            />
          )}
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
