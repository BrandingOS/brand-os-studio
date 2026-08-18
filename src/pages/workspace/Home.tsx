import { useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DsButton, DsEyebrow, DsSkeleton } from '@/shared/ds';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShellAlt';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { surfacePalette } from '@/shared/brand/brandPalette';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import { useUiPreference } from '@/shared/hooks/useUiPreference';
import type { Brand } from '@/shared/types/brand';
import { BrandCardMenu } from '@/features/dashboard/components/BrandCardMenu';

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

/** Lowercase only the leading word ("Updated Apr 28" → "updated Apr 28")
 *  so the hero sub keeps its lowercase sentence style without mangling
 *  the month abbreviation (DSH-04). */
function sentenceLower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
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
  // Brand-entry URL respects the user's UI preference: Studio users land
  // on Setup (canonical Studio entry); Classic users land on Overview.
  const uiPreference = useUiPreference();
  const entryUrl = uiPreference === 'classic' ? `/a/${brand.slug}/setup` : `/b/${brand.slug}/setup`;

  return (
    <BrandCardMenu brand={brand} editUrl={`/a/${brand.slug}/identity`}>
    <Link
      to={entryUrl}
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
    </BrandCardMenu>
  );
}

/**
 * Stable stand-in for the grid while the current user's brands are being
 * confirmed. Same footprint as a brand card (240px, colour band + body) so
 * nothing jumps when the real cards arrive; no numbers, no names — the page
 * knows nothing yet and says nothing.
 */
function BrandsGridSkeleton() {
  return (
    <div className="ws-brands-grid" role="status" aria-label="Loading your brands" aria-busy="true">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ws-brand-card ws-brand-card--skeleton" aria-hidden="true">
          <div className="ws-brand-card-color">
            <DsSkeleton width="100%" height="100%" radius={0} />
          </div>
          <div className="ws-brand-card-body">
            <div>
              <DsSkeleton width={140} height={18} />
              <DsSkeleton width={96} height={12} style={{ marginTop: 8 }} />
            </div>
            <div className="ws-brand-card-foot">
              <DsSkeleton width={48} height={12} />
            </div>
          </div>
        </div>
      ))}
    </div>
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
  const listReady = useBrandStore((s) => s.listReady);
  const loadError = useBrandStore((s) => s.error);
  const loadAll = useBrandStore((s) => s.loadAll);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const authLoading = useSessionStore((s) => s.isLoading);

  // Ask for the current identity's brands. The auth controller resets the
  // store's scope on every identity change (so nothing loaded for someone
  // else can be shown here) and starts a load of its own; this call joins
  // that in-flight request rather than starting a second one.
  useEffect(() => {
    if (authLoading) return;
    loadAll();
  }, [loadAll, isAuthenticated, authLoading]);

  // Three states, decided by what has been CONFIRMED — never by the shape
  // of a list that may simply not have arrived yet:
  //   settled  → the current user's list came back (cards, or the empty state)
  //   failed   → the request errored; say so, offer a retry
  //   loading  → auth or brands still pending; keep the skeleton up
  const settled = !authLoading && listReady;
  const failed = !authLoading && !listReady && !!loadError;

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
          <DsEyebrow style={{ marginBottom: 4 }}>Workspace</DsEyebrow>
          <h1 className="ws-hero-title">Your brands</h1>
          <p className="ws-hero-sub">
            {!settled
              ? '\u00a0'
              : count === 0
                ? 'Everything starts with a brand. Create one to build your identity, templates, and designs.'
                : `${count} brand${count === 1 ? '' : 's'} · ${sentenceLower(formatRelative(lastEdit))}`}
          </p>
        </section>

        {!settled ? (
          failed ? (
            <div className="ws-empty" role="alert" aria-label="Brands could not be loaded">
              <h2 className="ws-empty-title">We couldn't load your brands</h2>
              <p className="ws-empty-sub">{loadError}</p>
              <DsButton tone="secondary" onClick={() => loadAll()}>
                Try again
              </DsButton>
            </div>
          ) : (
            <BrandsGridSkeleton />
          )
        ) : count === 0 ? (
          <div className="ws-empty" role="region" aria-label="No brands yet">
            <h2 className="ws-empty-title">No brands yet — create your first</h2>
            <p className="ws-empty-sub">
              Set the colors, type, and voice once. Every template and design you
              make after will inherit from it.
            </p>
            <DsButton tone="primary" arrow onClick={() => navigate('/onboard-brand')}>
              Create a brand
            </DsButton>
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
