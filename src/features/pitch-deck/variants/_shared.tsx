/**
 * Shared primitives for Uniex pitch-deck variants — colors, fonts,
 * RTL preset, and the chrome/frame helpers reused across all 5 variants
 * for each slide kind.
 *
 * Mirrors the originals in `../slides/UniexPitchSlides.tsx` 1:1 so a
 * single visual baseline is preserved. Don't drift from those values.
 */

import type { CSSProperties, ReactNode } from 'react';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '@/features/case-study-deck/constants';

export const NAVY = '#001563';
export const NAVY_DEEP = '#0A0F2E';
export const GREEN = '#68BE69';
export const GREEN_SOFT = 'rgba(104, 190, 105, 0.12)';
export const NAVY_SOFT = 'rgba(0, 21, 99, 0.06)';
export const PAPER = '#F5F7FB';
export const WHITE = '#FFFFFF';

export const FONT_DISPLAY = `'IBM Plex Sans Arabic', 'Cairo', 'Inter', sans-serif`;
export const FONT_BODY = `'Cairo', 'IBM Plex Sans Arabic', 'Inter', sans-serif`;

export const RTL_DIR: CSSProperties = { direction: 'rtl', textAlign: 'right' };

// Reference JPGs (`/brands/uniex/designs/{1,2,3}.jpg`) were replaced with
// hand-coded SVG illustrations in `../illustrations`. Each variant now
// imports a specific component (e.g. `GlobeWithFlags`, `ConnectedLaptop`)
// instead of pulling from a shared raster, so all 16 variant slots
// render distinct visuals.
export const ICON_GREEN = '/brands/uniex/logos/iconGreen.svg';
export const ICON_NAVY = '/brands/uniex/logos/iconBlue.svg';
export const ICON_WHITE = '/brands/uniex/logos/iconWhite.svg';
export const ICON_BLACK = '/brands/uniex/logos/iconBlack.svg';
export const FULL_LOGO = '/brands/uniex/logos/FullLogo.svg';
export const LOGO_WHITE = '/brands/uniex/logos/LogoWhite.svg';
export const LOGO_BLACK = '/brands/uniex/logos/LogoBlack.svg';

export type ChromeVariant = 'light' | 'dark' | 'flood';

export function PageChrome({
  pageNum,
  total,
  section,
  variant,
}: {
  pageNum: number;
  total: number;
  section: string;
  variant: ChromeVariant;
}) {
  const ink = variant === 'light' ? NAVY : WHITE;
  const muted = variant === 'light' ? 'rgba(0, 21, 99, 0.55)' : 'rgba(255, 255, 255, 0.7)';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 64,
          left: 96,
          right: 96,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: FONT_BODY,
          fontSize: 18,
          color: muted,
          letterSpacing: '0.04em',
          zIndex: 5,
        }}
      >
        <span style={{ fontWeight: 700, color: ink, letterSpacing: '0.06em' }}>uniex</span>
        <span style={{ ...RTL_DIR, fontWeight: 600, fontSize: 17 }}>{section}</span>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 17 }}>
          {String(pageNum).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          top: 88,
          height: 1,
          background: variant === 'light' ? 'rgba(0,21,99,0.10)' : 'rgba(255,255,255,0.16)',
          zIndex: 5,
        }}
      />
    </>
  );
}

export function Frame({
  index,
  variant,
  bg,
  ink,
  children,
}: {
  index: number;
  variant: ChromeVariant;
  /** Override frame background. Default keyed off `variant`. */
  bg?: string;
  /** Override default text color. */
  ink?: string;
  children: ReactNode;
}) {
  const resolvedBg = bg ?? (variant === 'flood' ? NAVY : variant === 'dark' ? NAVY_DEEP : PAPER);
  const resolvedInk = ink ?? (variant === 'light' ? NAVY : WHITE);
  return (
    <div
      data-pitch-slide={index}
      style={{
        width: SLIDE_WIDTH,
        height: SLIDE_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
        background: resolvedBg,
        color: resolvedInk,
        fontFamily: FONT_DISPLAY,
      }}
    >
      {children}
    </div>
  );
}

export interface SlideProps {
  index: number;
  total: number;
}

export { SLIDE_WIDTH, SLIDE_HEIGHT };
