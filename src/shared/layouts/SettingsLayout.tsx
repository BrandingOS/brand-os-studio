import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DsTabBar } from '@/shared/ds';
import { useCan } from '@/shared/access';
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
 * plus a success toast, writing nothing. Workspace stays removed; PEOPLE is back
 * because membership is now real — workspace_members / brand_access, written only
 * through capability-checked RPCs. The tab hides itself for anyone without
 * `members.view`, which is every guest.
 */

const TABS = [
  { value: 'account', label: 'Account' },
  { value: 'members', label: 'People' },
  { value: 'preferences', label: 'Preferences' },
  { value: 'plans', label: 'Plan' },
];

export function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // A guest has no member directory, so the tab is absent rather than present-and-refusing.
  // `unknown` shows it optimistically: flashing a tab away after hydration is worse than a
  // tab that turns out to be empty.
  const canSeePeople = useCan('members.view') !== false;
  const tabs = useMemo(
    () => TABS.filter((t) => t.value !== 'members' || canSeePeople),
    [canSeePeople],
  );

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
            tabs={tabs}
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
