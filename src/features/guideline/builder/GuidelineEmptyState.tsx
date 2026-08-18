/**
 * What /b/:slug/guideline looks like before there is a guideline.
 *
 * One action. No template gallery, no blank-document option, no wizard: the
 * brand already holds a logo, a palette, typefaces and a strategy, so the
 * shortest honest path from here to a brand book is a button that writes one.
 *
 * The gaps notice is not a blocker. The document renders either way — it
 * renders BETTER with those values, and Setup is where they come from, so the
 * page says so and gets out of the way.
 */
import { Link } from 'react-router-dom';
import { DsButton } from '@/shared/ds';
import { pickLogoOnBackground } from '@/shared/brand/logoOnBackground';
import { surfacePalette } from '@/shared/brand/brandPalette';
import type { Brand } from '@/shared/types/brand';
import { DEFAULT_PAGE_COUNT } from '../model/document';
import { findGaps } from '../model/gaps';

export function GuidelineEmptyState({
  brand,
  slug,
  onBuild,
  building,
}: {
  brand: Brand;
  slug: string;
  onBuild: () => void;
  building: boolean;
}) {
  const gaps = findGaps(brand);
  const cover = surfacePalette(brand, 'brand');
  const logo = pickLogoOnBackground(brand, cover.bg);

  return (
    <div className="gl-empty">
      <div
        className="gl-empty-cover"
        style={{ '--gl-cover-bg': cover.bg, '--gl-cover-fg': cover.text } as React.CSSProperties}
        aria-hidden="true"
      >
        {logo?.url
          ? <img src={logo.url} alt="" />
          : <span className="gl-empty-letter">{brand.name?.charAt(0) ?? 'B'}</span>}
      </div>

      <h1 className="gl-empty-title">Brand Guidelines</h1>
      <p className="gl-empty-sub">
        Build a complete brand book for {brand.name} from what this brand already
        has — logo, colours, typography, imagery, motion and voice. Every page
        is editable afterwards.
      </p>

      {gaps.length > 0 && (
        <p className="gl-empty-gaps" role="status">
          {brand.name} has no {gaps.join(', ')} yet, so some pages will use
          placeholders. <Link to={`/b/${slug}/setup`}>Finish setup</Link> to fill
          them in — you can build now either way.
        </p>
      )}

      <DsButton onClick={onBuild} disabled={building} arrow>
        {building ? 'Building…' : 'Build Brand Guidelines'}
      </DsButton>
      <span className="gl-empty-meta">{DEFAULT_PAGE_COUNT} pages · ready in a moment</span>
    </div>
  );
}
