import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark, DsButton, DsEyebrow } from '@/shared/ds';
import { WorkspaceShell } from '@/shared/layouts/WorkspaceShellAlt';
import { useBrandStore } from '@/shared/store/brandStore';
import { useSessionStore } from '@/shared/store/sessionStore';
import { brandCardLabel, useBrandCardFace, useBrandCover } from '@/shared/brand/workspaceCard';
import { ProjectName } from '@/features/dashboard/components/ProjectName';
import { useUiPreference } from '@/shared/hooks/useUiPreference';
import type { Brand } from '@/shared/types/brand';
import { BrandCardMenu } from '@/features/dashboard/components/BrandCardMenu';
import { MoveToFolderModal } from '@/features/dashboard/components/MoveToFolderModal';
import { ProjectSelectionBar } from '@/features/dashboard/components/ProjectSelectionBar';
import {
  useProjectSelection,
  type ProjectSelection,
} from '@/features/dashboard/components/useProjectSelection';
import { mergeWorkspaceCard } from '@/shared/brand/workspaceCard';
import { toast } from 'sonner';

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

function BrandCard({
  brand,
  selection,
  order,
}: {
  brand: Brand;
  selection: ProjectSelection;
  order: string[];
}) {
  // Both halves of the card go through the canonical palette so colors
  // come out right by construction — no per-card luminance branching,
  // and the same logic applies to brand kit / variations / slides /
  // anywhere else that draws "a brand's surface".
  const band = useBrandCardFace(brand);
  // A cover replaces the colour band entirely. It is the project's picture,
  // resolved live from its Library id, so a deleted asset returns the card to
  // the brand's colour and logo rather than to a dead image.
  const cover = useBrandCover(brand);
  const label = brandCardLabel(brand);
  // Brand-entry URL respects the user's UI preference: Studio users land
  // on Setup (canonical Studio entry); Classic users land on Overview.
  const uiPreference = useUiPreference();
  const entryUrl = uiPreference === 'classic' ? `/a/${brand.slug}/setup` : `/b/${brand.slug}/setup`;

  return (
    // "Edit brand" goes to Studio's Setup — the canonical place a brand is
    // edited — never to the alternate UI.
    <BrandCardMenu
      brand={brand}
      editUrl={`/b/${brand.slug}/setup`}
      selectable
      selected={selection.isSelected(brand.id)}
      selecting={selection.active}
      onToggleSelect={({ shift }) =>
        shift ? selection.extendTo(brand.id, order) : selection.toggle(brand.id)
      }
    >
    <Link
      to={entryUrl}
      className="ws-brand-card"
      aria-label={`Open ${label}`}
      onClick={(e) => {
        // While a selection is running, or with a modifier held, a click is a
        // selection gesture — opening the brand would throw the work away.
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          selection.toggle(brand.id);
          return;
        }
        if (e.shiftKey) {
          e.preventDefault();
          selection.extendTo(brand.id, order);
          return;
        }
        if (selection.active) {
          e.preventDefault();
          selection.toggle(brand.id);
        }
      }}
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
          <p className="ws-brand-card-sub">
            {/* The demo brand says so, and says nothing else. It behaves
                exactly like a real brand — the badge is there so the user
                knows they may delete it, not to mark it as lesser. */}
            {brand.isDemo && <span className="ws-brand-card-demo">Demo</span>}
            {formatRelative(brand.updatedAt)}
          </p>
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


/**
 * Dragging a rubber band across the grid.
 *
 * The gesture has to start on EMPTY space — a drag that began on a card would
 * fight the card's own click, and the browser's text selection, and the link
 * underneath. So the band listens on the surface behind the grid and bows out
 * the moment the press lands on anything interactive.
 *
 * Coordinates are the surface's own, not the viewport's, so the rectangle stays
 * put while the page scrolls under it — and the hit test compares the same
 * space, which is why both rects are measured against the surface each frame
 * rather than cached at the start.
 */
function ProjectBand({
  selection,
  children,
}: {
  selection: ProjectSelection;
  children: React.ReactNode;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const hitTest = useCallback((box: { x: number; y: number; w: number; h: number }) => {
    const surface = surfaceRef.current;
    if (!surface) return [];
    const origin = surface.getBoundingClientRect();
    const ids: string[] = [];
    for (const el of surface.querySelectorAll<HTMLElement>('[data-project-id]')) {
      const r = el.getBoundingClientRect();
      const cx = r.left - origin.left;
      const cy = r.top - origin.top;
      const overlaps =
        cx < box.x + box.w && cx + r.width > box.x && cy < box.y + box.h && cy + r.height > box.y;
      if (overlaps) ids.push(el.dataset.projectId!);
    }
    return ids;
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    // Anything the user could have meant to press instead.
    if ((e.target as HTMLElement).closest('a, button, input, [data-project-id]')) return;
    const surface = surfaceRef.current;
    if (!surface) return;

    const origin = surface.getBoundingClientRect();
    const startX = e.clientX - origin.left;
    const startY = e.clientY - origin.top;
    const additive = e.metaKey || e.ctrlKey || e.shiftKey;
    if (!additive) selection.clear();

    let moved = false;

    const move = (ev: PointerEvent) => {
      const x = ev.clientX - origin.left;
      const y = ev.clientY - origin.top;
      const box = {
        x: Math.min(startX, x),
        y: Math.min(startY, y),
        w: Math.abs(x - startX),
        h: Math.abs(y - startY),
      };
      // A few pixels of travel is a click with a shaky hand, not a drag.
      if (!moved && box.w + box.h < 6) return;
      moved = true;
      setRect(box);
      selection.setBand(hitTest(box), additive);
    };

    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      selection.endBand();
      setRect(null);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div
      ref={surfaceRef}
      className="bcm-grid-surface"
      data-banding={rect ? 'true' : undefined}
      onPointerDown={onPointerDown}
    >
      {children}
      {rect && (
        <div
          className="bcm-band"
          style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
          aria-hidden="true"
        />
      )}
    </div>
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

  // ── Selecting, moving and deleting ────────────────────────────────────
  const selection = useProjectSelection();
  const updateBrand = useBrandStore((s) => s.update);
  const deleteBrand = useBrandStore((s) => s.delete);
  const [folder, setFolder] = useState<string | undefined>(undefined);
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);

  // A folder is whatever name a project carries — see MoveToFolderModal. The
  // list is therefore derived, never stored, and a folder disappears when the
  // last project leaves it.
  const folders = useMemo(() => {
    const names = new Set<string>();
    for (const b of brands) {
      const name = b.workspaceCard?.folder?.trim();
      if (name) names.add(name);
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [brands]);

  const visible = useMemo(
    () => (folder ? sorted.filter((b) => b.workspaceCard?.folder === folder) : sorted),
    [sorted, folder],
  );
  const order = useMemo(() => visible.map((b) => b.id), [visible]);
  const selected = useMemo(
    () => brands.filter((b) => selection.ids.has(b.id)),
    [brands, selection.ids],
  );

  const saveFolder = async (target: string | undefined) => {
    setBusy(true);
    try {
      // One at a time and awaited: the store re-reads the brand between writes,
      // so firing them together would have each patch built from a stale copy.
      for (const brand of selected) {
        await updateBrand(brand.id, {
          workspaceCard: mergeWorkspaceCard(brand.workspaceCard, { folder: target }),
        });
      }
      toast.success(
        target ? `Moved to “${target}”` : 'Taken out of its folder',
        { description: `${selected.length} project${selected.length === 1 ? '' : 's'}.` },
      );
      setMoving(false);
      selection.clear();
    } catch (err) {
      toast.error('Could not move these projects', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const deleteSelected = async () => {
    const names = selected.map((b) => brandCardLabel(b));
    if (
      !window.confirm(
        `Delete ${names.length} project${names.length === 1 ? '' : 's'}?\n\n${names.join(', ')}\n\nThis removes everything saved in them — logos, colors, fonts and guidelines. It can't be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      for (const brand of selected) await deleteBrand(brand.id);
      toast.success(`${names.length} project${names.length === 1 ? '' : 's'} deleted`);
      selection.clear();
    } catch (err) {
      toast.error('Could not delete these projects', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const count = sorted.length;

  return (
    <WorkspaceShell>
      <main className="ws-outlet">
        <section className="ws-hero">
          <DsEyebrow style={{ marginBottom: 4 }}>Workspace</DsEyebrow>
          <h1 className="ws-hero-title">Your brands</h1>
          <p className="ws-hero-sub">
            {count > 0
              ? `${count} brand${count === 1 ? '' : 's'} · ${sentenceLower(formatRelative(lastEdit))}`
              : isAuthenticated
                ? 'Everything starts with a brand. Create one to build your identity, templates, and designs.'
                : 'Everything starts with a brand — and we give you one to explore.'}
          </p>
        </section>

        {count === 0 ? (
          /*
           * Two empty states, because a guest and a signed-in user are empty
           * for different reasons.
           *
           * A signed-in account is only ever empty here if it deleted what it
           * was given (migration 033 hands every new account a demo brand), so
           * the ask is simply to make one. A GUEST has nothing because the demo
           * brand is something an account receives — seed brands used to be
           * listed here, but they cannot be deleted, which made them the wrong
           * answer. So the guest gets told what signing up actually gets them.
           */
          <div className="ws-empty" role="region" aria-label="No brands yet">
            {isAuthenticated ? (
              <>
                <h2 className="ws-empty-title">No brands yet — create your first</h2>
                <p className="ws-empty-sub">
                  Set the colors, type, and voice once. Every template and design you
                  make after will inherit from it.
                </p>
                <DsButton tone="primary" arrow onClick={() => navigate('/onboard-brand')}>
                  Create a brand
                </DsButton>
              </>
            ) : (
              <>
                <BrandMark size={44} className="ws-empty-mark" />
                <h2 className="ws-empty-title">Start with a brand on us</h2>
                <p className="ws-empty-sub">
                  Create a free account and we'll set you up with a demo brand —
                  logos, colours, type, guidelines and a kit — so you can see how
                  everything works before putting your own brand in.
                </p>
                <div className="ws-empty-actions">
                  <DsButton tone="primary" arrow onClick={() => navigate('/signup')}>
                    Create account
                  </DsButton>
                  <DsButton tone="tertiary" onClick={() => navigate('/onboard-brand')}>
                    Start from scratch
                  </DsButton>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {folders.length > 0 && (
              <div className="ws-folder-bar" role="tablist" aria-label="Folders">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!folder}
                  className={folder ? 'ws-folder-tab' : 'ws-folder-tab is-active'}
                  onClick={() => setFolder(undefined)}
                >
                  All projects
                </button>
                {folders.map((name) => (
                  <button
                    key={name}
                    type="button"
                    role="tab"
                    aria-selected={folder === name}
                    className={folder === name ? 'ws-folder-tab is-active' : 'ws-folder-tab'}
                    onClick={() => setFolder(name)}
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}

            <ProjectBand selection={selection}>
              <div className="ws-brands-grid">
                {visible.map((brand) => (
                  <BrandCard
                    key={brand.id}
                    brand={brand}
                    selection={selection}
                    order={order}
                  />
                ))}
                <NewBrandCard />
              </div>
            </ProjectBand>
          </>
        )}
      </main>

      <ProjectSelectionBar
        count={selection.count}
        busy={busy}
        onMove={() => setMoving(true)}
        onDelete={() => void deleteSelected()}
        onClear={() => selection.clear()}
      />

      <MoveToFolderModal
        open={moving}
        count={selected.length}
        folders={folders}
        current={
          selected.length > 0 &&
          selected.every((b) => b.workspaceCard?.folder === selected[0]!.workspaceCard?.folder)
            ? selected[0]!.workspaceCard?.folder
            : undefined
        }
        busy={busy}
        onCancel={() => setMoving(false)}
        onChoose={(target) => void saveFolder(target)}
      />
    </WorkspaceShell>
  );
}
