/**
 * Back-compat barrel — artwork primitives now live at
 * `src/shared/artwork/`. This barrel re-exports them so any callsite
 * still importing from `@/features/pitch-deck/artwork` keeps working.
 *
 * New code should import from `@/shared/artwork` directly.
 */

export {
  ArtworkPicker,
  ReplaceableArtwork,
  useArtworkStore,
  useArtworkSlot,
  type ArtworkOverride,
} from '@/shared/artwork';
