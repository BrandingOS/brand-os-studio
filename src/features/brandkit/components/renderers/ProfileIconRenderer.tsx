import type { Brand } from '@/shared/types/brand';
import {
  PROFILE_KEPT_IDS,
  SocialProfileExtendedRenderer,
} from '@/features/brand-kit/renderers/SocialProfileExtended';

/**
 * The legacy profile-icon renderer. It no longer draws anything of its own.
 *
 * It used to answer twelve template ids with six letter tiles on
 * `#0A0A0F` and white, or — when the brand had a logo — with
 * `getProfileIconConfig`, whose backgrounds are chosen by rule and whose
 * `logoFilter` recolours the customer's artwork. Neither path could be
 * edited, and neither measured whether the mark it placed could be SEEN
 * on the ground it placed it on.
 *
 * The twelve legacy ids are archived in `renderers/curation/social.ts`.
 * This module stays because `TemplateCard` still dispatches on the legacy
 * template type, and it forwards to the curated 24-design family — where
 * the glyph is the customer's own choice, the letters are a bound field,
 * and the ground is picked so `logoOn` can place a variant that reads.
 */

interface ProfileIconRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function ProfileIconRenderer({ brand, templateIndex }: ProfileIconRendererProps) {
  const rank = Math.max(0, templateIndex);
  return (
    <SocialProfileExtendedRenderer
      brand={brand}
      templateIndex={rank % PROFILE_KEPT_IDS.length}
    />
  );
}
