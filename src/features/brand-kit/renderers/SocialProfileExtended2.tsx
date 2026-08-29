import type { Brand } from '@/shared/types/brand';
import type { DeliverableContent } from '@/features/brandkit/content/kinds';
import {
  SOCIAL_PROFILE_TAIL,
  SocialProfileExtendedRenderer,
} from './SocialProfileExtended';

/**
 * Profile icons — Wave 2. Retired, except for its first six ids.
 *
 * This file held 100 generated designs (`profile-icons-ext-19` …
 * `-ext-118`), organised by MOVEMENT rather than by anything a brand
 * needs: fifteen "Apple-restrained", fifteen "Brutalist" on `#FFEB3B`,
 * `#FF3B30` and `#39FF14`, fifteen "Swiss", and a tail of editorial ones
 * printing `est. 2026`, `— a brand —` and `vol. 14` as though they were
 * facts about the customer. One was welded to `Caveat, cursive`; 26 used
 * Tailwind's `font-serif`/`font-mono`, which is a typeface from the
 * config and not the brand's. None declared a `content` prop, so the
 * Quick Edit panel — keyed by template TYPE, not by design — offered a
 * customer four fields that changed nothing on screen.
 *
 * What survives is the ID RANGE, not the artwork. The curated family is
 * 24 designs and the shared dispatch (`renderers/index.tsx`) splits
 * `profile-icons` at 18, so `ext-19` … `ext-24` have to arrive through
 * this module. They are the last six of `SocialProfileExtended`'s own
 * SPECS, forwarded by rank — the split is arithmetic, not a design
 * boundary, and putting six designs in a second file to satisfy it would
 * only hide four of them from the study they belong to.
 *
 * `ext-25` … `ext-118` are archived in `renderers/curation/social.ts`,
 * which removes them from the drilldown, the picker and every export
 * while keeping the ids valid for anything already saved against them.
 */

/** The six ids this module still publishes: `ext-19` … `ext-24`. */
export const SOCIAL_PROFILE_EXTENDED_2 = SOCIAL_PROFILE_TAIL;

/** The 94 ids this file used to emit and no longer does. */
export const SOCIAL_PROFILE_WAVE_2_IDS: ReadonlyArray<string> = Array.from(
  { length: 94 },
  (_, i) => `profile-icons-ext-${25 + i}`,
);

interface Props {
  brand: Brand;
  templateIndex: number;
  /** The shared dispatch spreads the whole union; narrowing is ours. */
  content?: DeliverableContent;
}

export function SocialProfileExtended2Renderer({ brand, templateIndex, content }: Props) {
  // The dispatch hands us `idx - 18`; the designs live at 18…23.
  return (
    <SocialProfileExtendedRenderer
      brand={brand}
      templateIndex={18 + (templateIndex % SOCIAL_PROFILE_TAIL.length)}
      content={content}
    />
  );
}
