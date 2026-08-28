/**
 * The mark over "Set up your Brand".
 *
 * It used to be the letter B — a placeholder standing in for the product's own
 * logo on the first screen anyone ever sees of it. The real mark lives in the
 * design system and is the only copy of that geometry; this draws it on the
 * same charcoal tile the shell's does, turning slowly so it is never quite
 * still.
 *
 * Named the same as `@/shared/ds`'s BrandMark and deliberately kept separate:
 * this one is the onboarding TILE, styled by `cosmos.css`, and the DS component
 * is the mark itself. The tile is what belongs to this feature.
 */
import { BrandMark as DsBrandMark } from '@/shared/ds';

export function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <DsBrandMark size={17} idle color="currentColor" />
    </div>
  );
}
