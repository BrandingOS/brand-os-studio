import { useState } from 'react';
import { Link } from 'react-router-dom';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';

/**
 * Workspace Settings — 4-way nav hub.
 *
 * Deliberately simple: four cards that route to the existing
 * settings pages (`/settings/account`, `/settings/workspace`, etc.).
 * An in-page sub-tab strip is rendered above the cards so the page
 * reads as "settings" even when the user hasn't drilled in.
 */

type SubTab = 'account' | 'workspace' | 'members' | 'plans';

type SettingsCard = {
  id: SubTab;
  title: string;
  sub: string;
  to: string;
  icon: string;
};

const CARDS: SettingsCard[] = [
  {
    id: 'account',
    title: 'Account',
    sub: 'Your profile, email, and sign-in methods.',
    to: '/settings/account',
    icon: '◉',
  },
  {
    id: 'workspace',
    title: 'Workspace',
    sub: 'Name, default brand, and workspace-wide defaults.',
    to: '/settings/workspace',
    icon: '▢',
  },
  {
    id: 'members',
    title: 'Members',
    sub: 'Invite teammates and manage roles.',
    to: '/settings/members',
    icon: '◍',
  },
  {
    id: 'plans',
    title: 'Plans & billing',
    sub: 'Your subscription, usage, and invoices.',
    to: '/settings/plans',
    icon: '◆',
  },
];

export default function WorkspaceSettings() {
  const [active, setActive] = useState<SubTab>('account');
  const focused = CARDS.find((c) => c.id === active) ?? CARDS[0]!;

  return (
    <WorkspaceShell>
      <main className="ws-outlet">
        <section className="ws-hero">
          <span className="ws-hero-eyebrow">Workspace</span>
          <h1 className="ws-hero-title">Settings</h1>
          <p className="ws-hero-sub">
            Manage your account, your workspace, who you work with, and your plan.
          </p>
        </section>

        <div className="ws-subtabs" role="tablist" aria-label="Settings sections">
          {CARDS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={active === c.id}
              className={`ws-subtab${active === c.id ? ' is-active' : ''}`}
              onClick={() => setActive(c.id)}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Surface the focused card full-width, plus quick links to the others. */}
        <article className="ws-card" style={{ marginBottom: 24 }}>
          <span className="ws-card-eyebrow">{focused.title}</span>
          <h3 className="ws-card-title">{focused.title}</h3>
          <p className="ws-card-sub">{focused.sub}</p>
          <div style={{ marginTop: 8 }}>
            <Link
              to={focused.to}
              className="pill-btn pill-btn--primary"
              style={{ textDecoration: 'none' }}
            >
              Open {focused.title.toLowerCase()}
              <svg
                className="pill-btn-arrow"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </article>

        <div className="ws-card-grid">
          {CARDS.filter((c) => c.id !== active).map((c) => (
            <Link key={c.id} to={c.to} className="ws-card">
              <div className="ws-card-thumb" aria-hidden="true">
                <span style={{ fontSize: 28 }}>{c.icon}</span>
              </div>
              <span className="ws-card-eyebrow">Settings</span>
              <h3 className="ws-card-title">{c.title}</h3>
              <p className="ws-card-sub">{c.sub}</p>
            </Link>
          ))}
        </div>
      </main>
    </WorkspaceShell>
  );
}
