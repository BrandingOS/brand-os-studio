/**
 * Where a dashboard card's own name and cover live when the database has
 * nowhere to put them.
 *
 * Migration 031 adds `brands.workspace_card`. Until it is deployed PostgREST
 * refuses any write naming that column, and the brands adapter drops it so the
 * save still succeeds — the same tolerance the onboarding marker gets, for the
 * same reason: a missing migration must never cost the user a save.
 *
 * But dropping it silently is its own failure. Renaming a project is a visible,
 * deliberate act; if it appears to work and the card is back to the brand's
 * name a second later, the user learns the feature is broken rather than that
 * the column is missing. So the value is kept here and merged back on read.
 *
 * What is honestly lost: this is per browser. Rename a project on a laptop and
 * the phone still shows the brand's name. Everything IN the project is
 * untouched — only the card's own presentation is local until the column
 * exists. The row always wins the moment it carries a value.
 *
 * @see ./onboardingMarkerFallback.ts — the same shape, for the same reason.
 */
import type { WorkspaceCard } from '@/shared/types/brand';

const KEY = 'brandos:workspace-cards';

type Store = Record<string, WorkspaceCard>;

function read(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // A full or unavailable storage costs the user their card's name. It must
    // never cost them the save that was already made.
  }
}

/**
 * Keeps a card the database could not take.
 *
 * An empty card is deleted rather than stored: absent already means "show the
 * brand's name and logo", so writing it would only leave a row behind saying
 * what silence already says — and would shadow the real column once it lands.
 */
export function rememberWorkspaceCard(brandId: string, card: unknown): void {
  if (!brandId) return;
  const store = read();
  const usable =
    card && typeof card === 'object' && Object.keys(card as object).length > 0
      ? (card as WorkspaceCard)
      : undefined;
  if (!usable) {
    if (!(brandId in store)) return;
    delete store[brandId];
  } else {
    store[brandId] = usable;
  }
  write(store);
}

/** The card held for this brand, or `undefined`. */
export function rememberedWorkspaceCard(brandId: string): WorkspaceCard | undefined {
  if (!brandId) return undefined;
  return read()[brandId];
}

/** Drops a brand's card — when the brand itself is deleted. */
export function forgetWorkspaceCard(brandId: string): void {
  rememberWorkspaceCard(brandId, undefined);
}
