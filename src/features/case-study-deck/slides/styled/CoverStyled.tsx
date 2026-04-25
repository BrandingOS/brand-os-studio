/**
 * Cover slide — shape-driven.
 *
 * The body composition comes from `shapes/cover.ts` (10 shapes total).
 * The deck-wide STYLE provides typography family / weight / tracking /
 * padding / chrome / colors via tokens, so a shape stays cohesive with
 * the active template no matter which one the user picks. Default
 * shape per-style is set in the catalog.
 */

import type { BrandProfile, SlideOverrides } from '../../types';
import type { DeckStyle } from '../../styles';
import {
  resolveSurface,
  resolveBackground,
  resolveFonts,
  contentRegion,
} from '../../styles';
import { TopBar, BottomBar, CornerNumeral } from '../../styles/chrome';
import { SlideFrame } from '../../SlideFrame';
import { resolveShape } from '../../shapes';

export interface StyledSlideProps {
  index: number;
  profile: BrandProfile;
  style: DeckStyle;
  overrides?: SlideOverrides;
  total: number;
}

interface CoverProps extends StyledSlideProps {
  shapeId?: string;
}

export function CoverStyled(props: CoverProps) {
  const { index, profile, style, total, overrides, shapeId } = props;
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Cover';
  const shape = resolveShape('cover', shapeId, style);

  return (
    <SlideFrame index={index} archetype="cover" variant={style.id} background={bg} ink={surface.ink}>
      <div
        style={{
          position: 'absolute',
          left: region.x,
          top: region.y,
          width: region.width,
          height: region.height,
        }}
      >
        {shape ? shape.render({ profile, style, surface, fonts, region, overrides }) : null}
      </div>
      <TopBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <BottomBar style={style} profile={profile} surface={surface} pageNum={pageNum} sectionLabel={sectionLabel} total={total} />
      <CornerNumeral style={style} profile={profile} surface={surface} pageNum={pageNum} />
    </SlideFrame>
  );
}
