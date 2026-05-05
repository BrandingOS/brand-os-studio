import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BrandSwitcher } from '@/features/brand/components/BrandSwitcher';
import { SegmentedNav } from '@/shared/ui/SegmentedNav';
import '@/shared/styles/cosmos-workspace.css';

/**
 * Shared shell for the v2 UI direction.
 *
 * Layout:
 *   - Top bar (sticky): left brand mark · center segmented nav · right utilities
 *   - Outlet: the page fills the rest; it can use `.shell` + `.panel` + `.board-wrap`
 *     for two-column pages, or `.workspace-empty` for placeholder tabs.
 *
 * Tab resolution:
 *   - If an explicit `tabs` prop is passed, it wins.
 *   - Otherwise, if the current URL matches `/b/:slug/...`, brand-scoped tabs are built automatically.
 *   - Otherwise, falls back to the flat workspace tabs (legacy `/setup`, etc.).
 *
 * Theme: scoped to [data-cosmos="workspace"], persisted in localStorage key "brandos-theme".
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

/**
 * Brand-scoped tabs for /b/:slug/* routes. Use when rendering the shell
 * inside a brand — the 5 tabs point to /b/<slug>/{setup,brand-kit,...}.
 */
export function buildBrandTabs(slug: string): WorkspaceTab[] {
  return [
    { label: 'Setup', to: `/b/${slug}/setup` },
    { label: 'Brand Kit', to: `/b/${slug}/brand-kit` },
    { label: 'Guideline', to: `/b/${slug}/guideline` },
    { label: 'Design', to: `/b/${slug}/design` },
    { label: 'Tools', to: `/b/${slug}/tools` },
  ];
}

const BRAND_SLUG_REGEX = /^\/b\/([^/]+)/;

function extractBrandSlug(pathname: string): string | null {
  const match = pathname.match(BRAND_SLUG_REGEX);
  return match ? match[1] : null;
}

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

export function WorkspaceShell({
  tabs: explicitTabs,
  brandName = 'BrandOS',
  brandHome,
  rightActions,
  children,
}: {
  /**
   * Explicit tabs to render. If omitted, the shell auto-detects brand
   * context from the URL: /b/:slug/* routes get brand-scoped tabs,
   * anything else falls back to DEFAULT_WORKSPACE_TABS.
   */
  tabs?: WorkspaceTab[];
  brandName?: string;
  /**
   * Where the top-left brand mark links to. Defaults to the current
   * brand's setup page when on /b/:slug/*, otherwise the workspace home.
   */
  brandHome?: string;
  rightActions?: ReactNode;
  children: ReactNode;
}) {
  const location = useLocation();
  const slug = useMemo(() => extractBrandSlug(location.pathname), [location.pathname]);

  const tabs = useMemo(() => {
    if (explicitTabs) return explicitTabs;
    if (slug) return buildBrandTabs(slug);
    return DEFAULT_WORKSPACE_TABS;
  }, [explicitTabs, slug]);

  const resolvedBrandHome = brandHome ?? (slug ? `/b/${slug}/setup` : '/');

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
          {slug ? (
            <BrandSwitcher currentSlug={slug} />
          ) : (
            <NavLink to={resolvedBrandHome} className="top-nav-brand" aria-label={brandName}>
              <span className="top-nav-brand-mark" aria-hidden="true">
                B
              </span>
              <span>{brandName}</span>
            </NavLink>
          )}
        </div>

        <SegmentedNav
          mode="route"
          ariaLabel="Primary"
          items={tabs.map((t) => ({ label: t.label, to: t.to, end: t.end }))}
        />

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

export default WorkspaceShell;
