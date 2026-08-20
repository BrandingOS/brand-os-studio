import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DsButton, DsEyebrow } from '@/shared/ds';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShellAlt';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { brandCardLabel, resolveBrandCover, useBrandCardFace } from '@/shared/brand/workspaceCard';
import { ProjectName } from '@/features/dashboard/components/ProjectName';
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
  const band = useBrandCardFace(brand);
  // A cover replaces the colour band entirely. It is the project's picture,
  // resolved live from its Library id, so a deleted asset returns the card to
  // the brand's colour and logo rather than to a dead image.
  const cover = resolveBrandCover(brand);
  const label = brandCardLabel(brand);
  // Brand-entry URL respects the user's UI preference: Studio users land
  // on Setup (canonical Studio entry); Classic users land on Overview.
  const uiPreference = useUiPreference();
  const entryUrl = uiPreference === 'classic' ? `/a/${brand.slug}/setup` : `/b/${brand.slug}/setup`;

  return (
    // "Edit brand" goes to Studio's Setup — the canonical place a brand is
    // edited — never to the alternate UI.
    <BrandCardMenu brand={brand} editUrl={`/b/${brand.slug}/setup`}>
    <Link
      to={entryUrl}
      className="ws-brand-card"
      aria-label={`Open ${label}`}
    >
      <div
        className="ws-brand-card-color"
        style={
          cover?.fit === 'cover'
            ? undefined
            : { background: band.background, color: band.color }
        }
      >
        {cover ? (
          <img
            className={
              cover.fit === 'contain'
                ? 'ws-brand-card-cover ws-brand-card-cover--contain'
                : 'ws-brand-card-cover'
            }
            src={cover.url}
            alt=""
          />
        ) : band.logoUrl ? (
          <img className="ws-brand-card-logo" src={band.logoUrl} alt="" />
        ) : (
          <span className="ws-brand-card-letter" aria-hidden="true">
            {band.letter}
          </span>
        )}
      </div>
      <div className="ws-brand-card-body">
        <div>
          <ProjectName brand={brand} className="ws-brand-card-title" />
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

  // Cards do not move under the pointer.
  //
  // Recency is the right order to ARRIVE in and the wrong one to re-run while
  // someone is working: renaming a project bumped `updatedAt`, so the card the
  // user had just touched jumped to the front and everything else shifted a
  // place. Whatever moved was, by definition, the thing they were looking at.
  //
  // So position is claimed once. A brand keeps the slot it was given for as
  // long as the page is open; only a brand the grid has never placed is sorted
  // in, at the front, where a newly created one belongs.
  const placedRef = useRef<string[]>([]);
  const sorted = useMemo(() => {
    const byRecency = [...brands].sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });

    const placed = new Map(placedRef.current.map((id, i) => [id, i]));
    // `sort` is stable, so two brands the grid has not placed keep the recency
    // order they arrived in.
    const next = byRecency.sort((a, b) => {
      const ai = placed.get(a.id);
      const bi = placed.get(b.id);
      if (ai === undefined && bi === undefined) return 0;
      if (ai === undefined) return -1;
      if (bi === undefined) return 1;
      return ai - bi;
    });
    placedRef.current = next.map((b) => b.id);
    return next;
  }, [brands]);

  // The hero reports the most recent edit, which is a different question from
  // where the cards sit — read it from the brands, not from the frozen order.
  const lastEdit = useMemo(
    () =>
      brands
        .map((b) => b.updatedAt ?? b.createdAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0],
    [brands],
  );
  const count = sorted.length;

  return (
    <WorkspaceShell>
      <main className="ws-outlet">
        <section className="ws-hero">
          <DsEyebrow style={{ marginBottom: 4 }}>Workspace</DsEyebrow>
          <h1 className="ws-hero-title">Your brands</h1>
          <p className="ws-hero-sub">
            {count === 0
              ? 'Everything starts with a brand. Create one to build your identity, templates, and designs.'
              : `${count} brand${count === 1 ? '' : 's'} · ${sentenceLower(formatRelative(lastEdit))}`}
          </p>
        </section>

        {count === 0 ? (
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
