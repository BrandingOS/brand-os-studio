/**
 * Back-compat shim — the artwork store has moved to
 * `@/shared/artwork` so any deck/editor can use it. Existing
 * pitch-deck variant imports keep working through this re-export.
 *
 * New code should import from `@/shared/artwork` directly.
 */

export {
  useArtworkStore,
  useArtworkSlot,
  type ArtworkOverride,
} from '@/shared/artwork';
