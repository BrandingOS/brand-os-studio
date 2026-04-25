import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShell';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { surfacePalette } from '@/shared/brand/brandPalette';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
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
  // Both halves of the card go through the canonical palette so colors
  // come out right by construction — no per-card luminance branching,
  // and the same logic applies to brand kit / variations / slides /
  // anywhere else that draws "a brand's surface".
  const brandSurface = surfacePalette(brand, 'brand');
  // Pick the logo variant that reads against this card's background.
  // The picker scores every available variant by WCAG contrast and
  // returns undefined if none clear the readability floor — at which
  // point we fall through to the letter mark.
  const logoUrl = pickLogoOnBackground(brand, brandSurface.bg)?.url;

  return (
    <Link
      to={`/b/${brand.slug}/setup`}
      className="ws-brand-card"
      aria-label={`Open ${brand.name}`}
    >
      <div
        className="ws-brand-card-color"
        style={{ background: brandSurface.bg, color: brandSurface.text }}
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
