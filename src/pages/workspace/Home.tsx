import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { resolveBrandLogo } from '@/shared/hooks/useBrandLogo';
import type { Brand } from '@/shared/types/brand';

/**
 * Workspace Home — the brands grid.
 *
 * - Hero: "Your brands" (Instrument Serif 48px) + short summary line.
 * - Grid: one card per brand (top half = brand primaryColor with logo
 *   or letter mark, bottom half = cream/elevated surface with name,
 *   last-edit, and an "Open →" affordance). Trailing ghost card
 *   routes to the onboarding flow.
 * - Empty: centered card inviting the user to make their first brand.
 */

/** Relative luminance of a #rrggbb hex string (WCAG 2.1). */
function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0;
  const int = parseInt(m[1]!, 16);
  const channels = [(int >> 16) & 0xff, (int >> 8) & 0xff, int & 0xff].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

/** Choose a readable letter color for the brand-card color block. */
function contrastLetter(bg: string): string {
  // Fallback to white on anything that isn't a clean hex — cards
  // with gradients or unknown formats still want a readable letter.
  const lum = relativeLuminance(bg);
  return lum > 0.5 ? 'rgba(13, 13, 13, 0.88)' : 'rgba(255, 255, 255, 0.92)';
}

/** Compact "Updated 2 hours ago"-style formatting without date-fns. */
function formatRelative(date: Date | string | undefined): string {
  if (!date) return 'Draft';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return 'Draft';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `Updated ${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `Updated ${weeks} week${weeks === 1 ? '' : 's'} ago`;
  return `Updated ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function BrandCard({ brand }: { brand: Brand }) {
  const color = brand.primaryColor || brand.colorSystem?.primary?.hex || '#0d0d0d';
  const letterColor = contrastLetter(color);
  // Resolve the canonical primary logo through the shared helper.
  // It handles the v3 logoSystem ref → brandAssets[] lookup and
  // falls back to legacy `brand.logo` for unmigrated brands.
  const logoUrl = resolveBrandLogo(brand, 'primary')?.url;

  return (
    <Link
      to={`/b/${brand.slug}/setup`}
      className="ws-brand-card"
      aria-label={`Open ${brand.name}`}
    >
      <div
        className="ws-brand-card-color"
        style={{ background: color, color: letterColor }}
      >
        {logoUrl ? (
          <img className="ws-brand-card-logo" src={logoUrl} alt="" />
        ) : (
          <span className="ws-brand-card-letter" aria-hidden="true">
            {brand.name.trim().charAt(0) || 'B'}
          </span>
        )}
      </div>
      <div className="ws-brand-card-body">
        <div>
          <h3 className="ws-brand-card-title">{brand.name}</h3>
          <p className="ws-brand-card-sub">{formatRelative(brand.updatedAt)}</p>
        </div>
        <div className="ws-brand-card-foot">
          <span>Open</span>
          <svg
            className="ws-brand-card-foot-arrow"
            width="14"
            height="14"
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
        </div>
      </div>
    </Link>
  );
}

function NewBrandCard() {
  return (
    <Link
      to="/onboard-brand"
      className="ws-brand-card ws-brand-card--new"
      aria-label="Create a new brand"
    >
      <span className="ws-brand-card-plus" aria-hidden="true">+</span>
      <h3 className="ws-brand-card-title">Create a new brand</h3>
      <p className="ws-brand-card-sub">
        Start from a prompt, a website, or a blank slate.
      </p>
    </Link>
  );
}

export default function WorkspaceHome() {
  const navigate = useNavigate();
  const brands = useBrandStore((s) => s.list);
  const loadAll = useBrandStore((s) => s.loadAll);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  // Re-fetch whenever the auth-driven service swap may have happened.
  // `useAuth` calls `reconfigureForAuth(true)` to swap brands from Local
  // (localStorage) → Supabase on sign-in. If Home mounted before that
  // swap, the first `loadAll()` would have hit the empty localStorage
  // and stuck on "No brands yet" until manual refresh.
  useEffect(() => {
    loadAll();
  }, [loadAll, isAuthenticated]);

  const sorted = useMemo(() => {
    // Show the most-recently-edited first. Fall back to createdAt.
    return [...brands].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [brands]);

  const lastEdit = sorted[0]?.updatedAt;
  const count = sorted.length;

  return (
    <WorkspaceShell>
      <main className="ws-outlet">
        <section className="ws-hero">
          <span className="ws-hero-eyebrow">Workspace</span>
          <h1 className="ws-hero-title">Your brands</h1>
          <p className="ws-hero-sub">
            {count === 0
              ? 'Everything starts with a brand. Create one to build your identity, templates, and designs.'
              : `${count} brand${count === 1 ? '' : 's'} · ${formatRelative(lastEdit).toLowerCase()}`}
          </p>
        </section>

        {count === 0 ? (
          <div className="ws-empty" role="region" aria-label="No brands yet">
            <h2 className="ws-empty-title">No brands yet — create your first</h2>
            <p className="ws-empty-sub">
              Set the colors, type, and voice once. Every template and design you
              make after will inherit from it.
            </p>
            <button
              type="button"
              className="pill-btn pill-btn--primary"
              onClick={() => navigate('/onboard-brand')}
            >
              Create a brand
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
            </button>
          </div>
        ) : (
          <div className="ws-brands-grid">
            {sorted.map((brand) => (
              <BrandCard key={brand.id} brand={brand} />
            ))}
            <NewBrandCard />
          </div>
        )}
      </main>
    </WorkspaceShell>
  );
}
