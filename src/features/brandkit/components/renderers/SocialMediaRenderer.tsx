import type { Brand } from '@/shared/types/brand';
import {
  SOCIAL_POST_EXTENDED,
  SocialPostExtendedRenderer,
} from '@/features/brand-kit/renderers/SocialPostExtended';
import {
  SOCIAL_STORY_EXTENDED,
  SocialStoryExtendedRenderer,
} from '@/features/brand-kit/renderers/SocialStoryExtended';
import {
  SOCIAL_COVER_EXTENDED,
  SocialCoverExtendedRenderer,
} from '@/features/brand-kit/renderers/SocialCoverExtended';

/**
 * The legacy social renderer. It no longer draws anything of its own.
 *
 * It used to hold eight square posts, five stories and four covers, shown
 * on repeat by `idx % posts.length` to fill 26 template ids — and every
 * one of them advertised a fintech company nobody here owns: "94% of our
 * users report improved financial clarity", "$2.4B processed this
 * quarter", "Join the team building the future of finance", a testimonial
 * signed by a CFO at TechCorp. None of it was reachable by an edit,
 * because these designs are reached through `renderTemplateDesign`, which
 * carries no content object at all. A customer opening their own Post
 * card read somebody else's marketing.
 *
 * The 26 legacy ids are archived in `renderers/curation/social.ts`, so
 * nothing in the Brand Kit asks for one any more. This module stays
 * because `TemplateCard` still dispatches on the legacy template type,
 * and it now FORWARDS to the curated families rather than answering with
 * artwork of its own. Anything still holding a legacy id — an old saved
 * customization, the legacy `/brandkit/<moduleId>` module view — gets a
 * real, brand-derived, fully bound design of the same rank instead of a
 * blank tile or a stranger's copy.
 *
 * There is deliberately no `content` prop: the legacy dispatch has none
 * to give. The curated renderers then paint the kind's own defaults for
 * this brand, which is exactly what the drilldown grid and every
 * offscreen export already do.
 */

interface SocialMediaRendererProps {
  brand: Brand;
  templateIndex: number;
  format: 'square' | 'story' | 'cover';
}

export function SocialMediaRenderer({ brand, templateIndex, format }: SocialMediaRendererProps) {
  const rank = Math.max(0, templateIndex);
  if (format === 'story') {
    return (
      <SocialStoryExtendedRenderer
        brand={brand}
        templateIndex={rank % SOCIAL_STORY_EXTENDED.length}
      />
    );
  }
  if (format === 'cover') {
    return (
      <SocialCoverExtendedRenderer
        brand={brand}
        templateIndex={rank % SOCIAL_COVER_EXTENDED.length}
      />
    );
  }
  return (
    <SocialPostExtendedRenderer brand={brand} templateIndex={rank % SOCIAL_POST_EXTENDED.length} />
  );
}
