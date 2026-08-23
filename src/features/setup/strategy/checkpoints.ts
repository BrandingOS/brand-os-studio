/**
 * Branding checkpoints — the before-state of an AI-driven rebrand.
 *
 * Saved automatically, immediately before an approved apply writes anything,
 * so "undo the rebrand" is always possible — whole, or one section at a time.
 * This is deliberately NOT the session undo stack (`shared/history`): a
 * rebrand must survive a reload, and `shared/history` is deliberately never
 * persisted (it broke brand saving once at 1.5 MB of a 5 MB budget).
 *
 * Two rules keep this list from becoming that incident:
 *
 *  - **Font FILES are stripped.** An uploaded font carries its bytes as data
 *    URLs — hundreds of KB per weight — and twenty checkpoints of that is the
 *    whole localStorage budget. A checkpoint keeps the families, roles and
 *    weights, so a restore brings the PAIRING back (loaded from Google Fonts);
 *    the uploaded bytes themselves are not recoverable, and the approval UI
 *    says so before the user replaces them.
 *  - **The list is capped at 20, newest first.** Checkpoints are created only
 *    at AI-apply moments, never on manual edits — Setup's autosave already
 *    owns those — so 20 covers months of rebrands.
 *
 * Pure localStorage; no service, no store, no React.
 */
import type {
  AboutEntry,
  BrandColor,
  BrandFont,
  BrandStrategyFields,
} from '../data/mockBrand';

export type BrandingSectionId = 'colors' | 'fonts' | 'strategy' | 'icons';

export const BRANDING_SECTIONS: readonly BrandingSectionId[] = [
  'colors',
  'fonts',
  'strategy',
  'icons',
];

/** What each section looked like the moment before the apply. */
export interface BrandingSnapshot {
  colors: { core: BrandColor[]; accent: BrandColor[] };
  /** `files` stripped — see the module comment. */
  fonts: Array<Omit<BrandFont, 'files'> & { hadFiles?: boolean }>;
  strategy: BrandStrategyFields;
  /** Free-form sections travel with the strategy they annotate. */
  about: AboutEntry[];
  icons: string[];
}

export interface BrandingCheckpoint {
  id: string;
  /** ISO timestamp of the apply this checkpoint precedes. */
  at: string;
  /** The user's direction, when they gave one — names the checkpoint. */
  direction?: string;
  /** Which sections that apply actually changed. */
  applied: BrandingSectionId[];
  before: BrandingSnapshot;
}

const KEY = (brandId: string) => `brandos:branding-checkpoints:${brandId}`;
const CAP = 20;

function read(brandId: string): BrandingCheckpoint[] {
  try {
    const raw = localStorage.getItem(KEY(brandId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(brandId: string, list: BrandingCheckpoint[]): void {
  try {
    localStorage.setItem(KEY(brandId), JSON.stringify(list.slice(0, CAP)));
  } catch {
    /* Quota or private mode — a rebrand without a checkpoint still applies. */
  }
}

/** Strips the heavy bytes; remembers that they existed. */
export function snapshotFonts(fonts: BrandFont[]): BrandingSnapshot['fonts'] {
  return fonts.map(({ files, ...font }) => ({
    ...font,
    ...(files && files.length > 0 ? { hadFiles: true } : {}),
  }));
}

export function saveCheckpoint(
  brandId: string,
  before: BrandingSnapshot,
  applied: BrandingSectionId[],
  direction?: string,
): BrandingCheckpoint {
  const checkpoint: BrandingCheckpoint = {
    id: `bcp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    ...(direction?.trim() ? { direction: direction.trim() } : {}),
    applied,
    before,
  };
  write(brandId, [checkpoint, ...read(brandId)]);
  return checkpoint;
}

/** Newest first. */
export function listCheckpoints(brandId: string): BrandingCheckpoint[] {
  return read(brandId);
}

export function getCheckpoint(
  brandId: string,
  id: string,
): BrandingCheckpoint | undefined {
  return read(brandId).find((c) => c.id === id);
}

export function deleteCheckpoint(brandId: string, id: string): void {
  write(brandId, read(brandId).filter((c) => c.id !== id));
}

/** Test seam. */
export function clearCheckpoints(brandId: string): void {
  try {
    localStorage.removeItem(KEY(brandId));
  } catch {
    /* no-op */
  }
}
