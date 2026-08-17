/**
 * The brand's own social designs, rendered by the product's own renderers.
 *
 * These are the real ones — `SocialPostExtendedRenderer` and its siblings, the
 * same components the Brand Kit shows and exports. Not mock posts, not
 * screenshots, not a picture of a phone with a rectangle in it.
 *
 * ── Why only some of them ────────────────────────────────────────────────
 *
 * The renderers carry hard-coded editorial filler — `SS 2026`, `est. 2026`,
 * `N° 014`, `"a small studio doing work that lasts."`. Inside the Brand Kit
 * that is fine: it is a template being previewed, and the user knows it. On a
 * page that may be sent to a client it is not, because there is nothing to tell
 * the reader that the brand did not say those things.
 *
 * So the set is CURATED to designs whose visible content comes from the brand
 * alone — its mark, its colours, its name. Each index below was verified
 * against the renderer's source rather than chosen by the design's name:
 * "Big Initial Card" sounds structural and prints "est. 2026".
 *
 * When a design needs real copy, the fix is a content slot on the renderer, not
 * a caption here apologising for it.
 *
 * ── Why they are scaled rather than re-laid-out ──────────────────────────
 *
 * Every renderer is drawn in absolute pixels against a 260px card. `ScalingStage`
 * transform-scales the subtree, so these are the same designs the Brand Kit
 * exports, at presentation size, with the designer's ratios intact.
 */
import type { IdentityModel } from '../identityModel';
import { Section, SplitHeader } from '../components/primitives';
import { useReveal } from '../motion/useReveal';
import { ScalingStage } from '@/shared/brand/ScalingStage';
import { SocialProfileExtendedRenderer } from '@/features/brand-kit/renderers/SocialProfileExtended';
import { SocialPostExtendedRenderer } from '@/features/brand-kit/renderers/SocialPostExtended';
import { SocialCoverExtendedRenderer } from '@/features/brand-kit/renderers/SocialCoverExtended';
import { SocialStoryExtendedRenderer } from '@/features/brand-kit/renderers/SocialStoryExtended';

/**
 * The verified set.
 *
 * Every index here was checked against the renderer's source for editorial
 * filler — dates, issue numbers, invented quotes, fictional URLs — and carries
 * none. Adding to these lists means reading the design first.
 */
const CURATED = {
  profile: [0, 1, 2, 6],
  post: [10, 11, 12, 15],
  cover: [0, 4, 7],
  story: [1, 10, 19],
} as const;

/** Width ÷ height for each format, as the renderers themselves assume. */
const ASPECT = { profile: 1, post: 1, cover: 1.6, story: 9 / 16 } as const;

type Format = keyof typeof CURATED;

const RENDERER: Record<Format, (p: { brand: never; templateIndex: number }) => JSX.Element> = {
  profile: SocialProfileExtendedRenderer as never,
  post: SocialPostExtendedRenderer as never,
  cover: SocialCoverExtendedRenderer as never,
  story: SocialStoryExtendedRenderer as never,
};

const LABEL: Record<Format, string> = {
  profile: 'Profile',
  post: 'Post',
  cover: 'Cover',
  story: 'Story',
};

export function SocialApplications({ model }: { model: IdentityModel }) {
  return (
    <Section id="social">
      <SplitHeader
        eyebrow="The identity, applied"
        title="Social"
        body="How the marks and colours behave at the sizes people actually meet this brand in. These are layouts to fill, not posts that have run."
      />
      {(Object.keys(CURATED) as Format[]).map((format, fi) => (
        <div className="bi-social-group" key={format}>
          <h3 className="bi-quiet bi-social-label">{LABEL[format]}</h3>
          <div className="bi-social-grid" data-format={format}>
            {CURATED[format].map((index, i) => (
              <SocialDesign
                key={`${format}-${index}`}
                model={model}
                format={format}
                index={index}
                delay={(fi * 2 + i) * 60}
              />
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}

function SocialDesign({
  model,
  format,
  index,
  delay,
}: {
  model: IdentityModel;
  format: Format;
  index: number;
  delay: number;
}) {
  const reveal = useReveal({ delay });
  const Renderer = RENDERER[format];
  return (
    <div className="bi-social-item" {...reveal}>
      <ScalingStage aspect={ASPECT[format]}>
        <Renderer brand={model.brand as never} templateIndex={index} />
      </ScalingStage>
    </div>
  );
}
