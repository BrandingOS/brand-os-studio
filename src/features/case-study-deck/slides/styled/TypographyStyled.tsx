/**
 * Typography slide — shape-driven.
 *
 * The body composition comes from `shapes/typography.ts` (10 shapes
 * total). The deck-wide STYLE provides typography family / weight /
 * tracking / padding / chrome / colors via tokens, so a shape stays
 * cohesive with the active template no matter which one the user
 * picks. Default shape per-style is set in the catalog — existing
 * decks render the same as before unless the user picks a different
 * shape on a specific slide.
 */

import { SlideFrame } from '../../SlideFrame';
import {
  resolveSurface,
  resolveBackground,
  resolveFonts,
  contentRegion,
} from '../../styles';
import { TopBar, BottomBar, CornerNumeral } from '../../styles/chrome';
import type { StyledSlideProps } from './CoverStyled';
import { resolveShape } from '../../shapes';

interface TypographyProps extends StyledSlideProps {
  shapeId?: string;
}

export function TypographyStyled(props: TypographyProps) {
  const { index, profile, style, total, overrides, shapeId } = props;
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Typography';
  const shape = resolveShape('typography', shapeId, style);

  return (
    <SlideFrame index={index} archetype="typography" variant={style.id} background={bg} ink={surface.ink}>
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
