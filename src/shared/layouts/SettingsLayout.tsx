import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DsTabBar } from '@/shared/ds';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShellAlt';
import '@/features/settings/settings.css';

/**
 * The settings shell.
 *
 * `WorkspaceShellAlt` is the right chrome here: settings are workspace-scoped,
 * not brand-scoped, so the five-tab brand nav would be wrong and there is no
 * brand to switch. The old shell wrapped `DashboardLayout` and rolled its own
 * 48px left rail PLUS a separate mobile pill strip; `DsTabBar` is one control
 * that serves both, so both are gone.
 *
 * Three sections, matching what a single-user account actually has:
 *   Account      — who you are
 *   Preferences  — how the product behaves
 *   Plan         — what you pay
 *
 * Workspace and Members used to be here and were pure theatre: local `useState`
 * plus a success toast, writing nothing. They are removed rather than restyled.
 */

const TABS = [
  { value: 'account', label: 'Account' },
  { value: 'preferences', label: 'Preferences' },
  { value: 'plans', label: 'Plan' },
];

export function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const active = useMemo(() => {
    const seg = location.pathname.split('/')[2] ?? 'account';
    return TABS.some((t) => t.value === seg) ? seg : 'account';
  }, [location.pathname]);

  return (
    <WorkspaceShell>
      <main className="ws-outlet">
        <section className="ws-hero">
          <span className="ws-hero-eyebrow">Workspace</span>
          <h1 className="ws-hero-title">Settings</h1>
          <p className="ws-hero-sub">
            Your profile, how BrandOS behaves, and what you pay for it.
          </p>
        </section>

        <div className="settings-tabs">
          <DsTabBar
            tabs={TABS}
            value={active}
            onChange={(value) => navigate(`/settings/${value}`)}
            aria-label="Settings sections"
          />
        </div>

        <Outlet />
      </main>
    </WorkspaceShell>
  );
}
