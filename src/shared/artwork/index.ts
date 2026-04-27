/**
 * Shared artwork picker — generic, deck-agnostic primitive.
 *
 * Lifted out of `src/features/pitch-deck/artwork/` (2026-04-26) so any
 * deck or editor (case studies, logo presentations, the v2 deck
 * system) can mount it. The old path now re-exports from here.
 */

export { ArtworkPicker } from './ArtworkPicker';
export { ReplaceableArtwork } from './ReplaceableArtwork';
export {
  useArtworkStore,
  useArtworkSlot,
  type ArtworkOverride,
} from './artworkStore';
