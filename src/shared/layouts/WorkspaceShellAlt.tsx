import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/shared/store/sessionStore';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useWorkspaceTheme } from '@/shared/theme/useWorkspaceTheme';
import { initialsFromName } from '@/shared/utils/initials';
import '@/shared/styles/workspace.css';
import '@/shared/styles/workspace-home.css';

/**
 * WorkspaceShell — the simpler sibling of WorkspaceShell for
 * routes that live OUTSIDE a brand (`/`, `/learn`, `/settings`,
 * `/templates`).
 *
 * Differences vs WorkspaceShell:
 *   - No center tab pill nav. The header is brand-mark (left) +
 *     optional rightActions + theme toggle + profile pill (right).
 *   - No brand context. Always renders the BrandingOS wordmark on the
 *     left; never the BrandSwitcher pill.
 *
 * Shared with WorkspaceShell:
 *   - `[data-workspace]` scope → all workspace tokens
 *     (surface, text, shadow, ease) apply identically.
 *   - Theme goes through useWorkspaceTheme, so the choice carries across
 *     shells AND across next-themes' <html> class.
 */

export function WorkspaceShell({
  brandName = 'BrandingOS',
  rightActions,
  children,
}: {
  brandName?: string;
  rightActions?: ReactNode;
  children: ReactNode;
}) {
  const user = useSessionStore((s) => s.user);
  const isAdmin = useSessionStore((s) => s.isAdmin);
  const { logout } = useAuth();
  const navigate = useNavigate();
  // Single owner of the light/dark choice — see useWorkspaceTheme.
  const { theme, toggleTheme } = useWorkspaceTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the profile menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const initials = initialsFromName(user?.name, 'JT');
  const displayName = user?.name ?? 'Guest';

  return (
    <div data-workspace data-theme={theme}>
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

          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              type="button"
              className="ws-profile-pill"
              aria-label={`Profile menu for ${displayName}`}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              title={displayName}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="ws-profile-avatar" aria-hidden="true">
                {initials}
              </span>
              <span>{displayName.split(' ')[0]}</span>
            </button>
            {menuOpen && (
              <div className="ws-profile-menu" role="menu">
                <div className="ws-profile-menu-id">
                  <span className="ws-profile-menu-name">{displayName}</span>
                  {user?.email ? (
                    <span className="ws-profile-menu-email">{user.email}</span>
                  ) : null}
                </div>
                {/* This menu held ONLY "Sign out", so the new UI had no route
                    to settings at all — the pages existed and nothing could
                    open them. These mirror what the legacy UserMenu offers. */}
                <button
                  type="button"
                  role="menuitem"
                  className="ws-profile-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings/account');
                  }}
                >
                  Account
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ws-profile-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings/preferences');
                  }}
                >
                  Preferences
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="ws-profile-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate('/settings/plans');
                  }}
                >
                  Plan &amp; billing
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    role="menuitem"
                    className="ws-profile-menu-item"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/admin');
                    }}
                  >
                    Admin
                  </button>
                )}
                <button
                  type="button"
                  role="menuitem"
                  className="ws-profile-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout().then(() => navigate('/'));
                  }}
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}

export default WorkspaceShell;
