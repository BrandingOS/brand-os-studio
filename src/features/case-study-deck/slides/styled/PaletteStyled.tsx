/**
 * Palette slide — shape-driven.
 *
 * The body composition comes from `shapes/palette.ts` (10 shapes
 * total). Style tokens come from the active deck STYLE.
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

interface PaletteProps extends StyledSlideProps {
  shapeId?: string;
}

export function PaletteStyled(props: PaletteProps) {
  const { index, profile, style, total, overrides, shapeId } = props;
  const surface = resolveSurface(style, profile);
  const bg = resolveBackground(style, surface);
  const fonts = resolveFonts(style, profile);
  const region = contentRegion(style);
  const pageNum = String(index + 1).padStart(2, '0');
  const sectionLabel = 'Palette';
  const shape = resolveShape('palette', shapeId, style);

  return (
    <SlideFrame index={index} archetype="palette" variant={style.id} background={bg} ink={surface.ink}>
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
