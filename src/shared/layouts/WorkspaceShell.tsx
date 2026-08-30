import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BrandSwitcher } from '@/features/brand/components/BrandSwitcher';
import { SegmentedNav } from '@/shared/ui/SegmentedNav';
import { useWorkspaceTheme } from '@/shared/theme/useWorkspaceTheme';
import { BrandMark } from '@/shared/ds';
import '@/shared/styles/workspace.css';

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
 * Theme: scoped to [data-workspace] via useWorkspaceTheme, which is the single
 * owner of the light/dark choice (key "brandos-theme", shared with next-themes).
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

/**
 * Where "Skip to content" lands, in order of preference. A page can name its
 * own target with `data-workspace-main`; otherwise the shells' own content
 * containers answer, so every Studio page gets the skip link with no per-page
 * change. Deliberately a chain and not one selector: the three shells put
 * their content in three different boxes.
 */
const MAIN_TARGETS = ['[data-workspace-main]', '.board-wrap', 'main', '.gl-doc-scroll'];

export function WorkspaceShell({
  tabs: explicitTabs,
  brandName = 'BrandingOS',
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

  // One theme, one key, one writer — see useWorkspaceTheme. This used to be a
  // local useState + a localStorage write that next-themes knew nothing about.
  const { theme, toggleTheme } = useWorkspaceTheme();

  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);

  /**
   * The first stop for the keyboard. Without it the Brand Kit's first card
   * was 48 Tabs from the top of the page — 8 for the chrome and 39 for the
   * sidebar's rows — so a keyboard user passed the whole of the navigation
   * before reaching anything to act on (QA Q17). It is the first focusable
   * element in the shell, so it is Tab 1 on every Studio page.
   */
  const skipToContent = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    let target: HTMLElement | null = null;
    for (const selector of MAIN_TARGETS) {
      target = root.querySelector<HTMLElement>(selector);
      if (target) break;
    }
    if (!target) return;
    // tabindex -1 makes it focusable without making it tabbable, so Tab
    // carries on from the content instead of from the top of the page.
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    const top = target.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }, []);

  /**
   * Below 1080px the tab strip scrolls (see workspace.css) — so the tab you
   * are on has to be brought into view, or a narrow viewport opens showing
   * "Setup" while you are three tabs along.
   */
  useEffect(() => {
    const nav = headerRef.current?.querySelector<HTMLElement>('.segmented-nav');
    if (!nav || nav.scrollWidth <= nav.clientWidth + 1) return;
    const active = nav.querySelector<HTMLElement>('.segmented-nav-item.is-active');
    if (!active) return;
    const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior: 'auto' });
  }, [location.pathname, tabs]);

  return (
    <div data-workspace data-theme={theme} ref={rootRef}>
      <button type="button" className="skip-to-content" onClick={skipToContent}>
        Skip to content
      </button>
      <header className="top-nav-wrap" role="banner" ref={headerRef}>
        <div className="top-nav-left">
          {slug ? (
            <BrandSwitcher currentSlug={slug} />
          ) : (
            <NavLink to={resolvedBrandHome} className="top-nav-brand" aria-label={brandName}>
              {/* The product's own mark, not its initial. It turns slowly so
                  the logo is never quite still — the idle animation, which is
                  deliberately nothing like the loader. */}
              <span className="top-nav-brand-mark" aria-hidden="true">
                <BrandMark size={17} idle color="var(--ds-accent-fg)" />
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
