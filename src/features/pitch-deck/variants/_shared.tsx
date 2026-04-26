/**
 * Shared primitives for Uniex pitch-deck variants — colors, RTL preset,
 * and the chrome/frame helpers reused across all 5 variants for each
 * slide kind.
 *
 * Typography NOTE (Phase B of deck-theme migration): font-family,
 * font-size, line-height, and color for text inside slides come from
 * the .deck-* classes in `src/shared/presentation/theme/deck.css`,
 * which read --deck-* CSS vars emitted by <DeckThemeProvider>. The
 * old FONT_DISPLAY/FONT_BODY/fontSize-literal pattern is gone — slides
 * apply `.deck-display`, `.deck-h1`, `.deck-body`, `.deck-caption`,
 * etc. and only override inline styles for non-typographic concerns
 * (letter-spacing, font-variant-numeric) or for white-on-dark hero
 * bands where the token color would be invisible.
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

/**
 * Reads `data-logo-pos` from the closest `[data-deck="pitch-deck"]`
 * ancestor (set by `<DeckThemeProvider>`) and returns positioning style
 * for a corner logo watermark. Variants that have a corner logo (Cover,
 * Cta, etc.) should spread this into their wrapper element's `style`.
 */
export function getLogoCornerStyle(): CSSProperties {
  if (typeof document === 'undefined') return { top: 32, left: 32 };
  const wrap = document.querySelector('[data-deck="pitch-deck"]');
  const pos = wrap?.getAttribute('data-logo-pos') ?? 'tl';
  switch (pos) {
    case 'tr': return { top: 32, right: 32 };
    case 'bl': return { bottom: 32, left: 32 };
    case 'br': return { bottom: 32, right: 32 };
    case 'hidden': return { display: 'none' };
    default:   return { top: 32, left: 32 };
  }
}

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
  // For light slides, let the .deck-label/.deck-caption classes drive
  // color via --deck-text-* tokens. For flood/dark, override with
  // white-ish so chrome reads against navy hero bands.
  const isDark = variant !== 'light';
  const wordmarkColor = isDark ? WHITE : undefined;
  const chromeColor = isDark ? 'rgba(255, 255, 255, 0.7)' : undefined;
  const ruleColor = isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,21,99,0.10)';
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 'var(--deck-chrome-pad-y, 64px)',
          left: 'var(--deck-chrome-pad-x, 96px)',
          right: 'var(--deck-chrome-pad-x, 96px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 5,
        }}
      >
        <span
          className="deck-label"
          style={{ color: wordmarkColor, letterSpacing: '0.06em' }}
        >
          uniex
        </span>
        <span
          className="deck-caption"
          style={{ ...RTL_DIR, fontWeight: 600, color: chromeColor }}
        >
          {section}
        </span>
        <span
          className="deck-caption"
          style={{ fontVariantNumeric: 'tabular-nums', color: chromeColor }}
        >
          {String(pageNum).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 'var(--deck-chrome-pad-x, 96px)',
          right: 'var(--deck-chrome-pad-x, 96px)',
          top: 'calc(var(--deck-chrome-pad-y, 64px) + 24px)',
          height: 1,
          background: ruleColor,
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
  // Light slides read their bg + ink from the deck-theme tokens —
  // that's how the user's "Page background" / "Heading text" overrides
  // in Customize actually paint over PAPER/NAVY defaults. Flood/dark
  // hero bands stay opinionated (NAVY/NAVY_DEEP) — those represent
  // the brand's bold-color expression, not the page surface.
  const resolvedBg = bg ?? (
    variant === 'flood' ? NAVY
    : variant === 'dark' ? NAVY_DEEP
    : 'var(--deck-bg-page, #F5F7FB)'
  );
  const resolvedInk = ink ?? (
    variant === 'light' ? 'var(--deck-text-heading, #001563)'
    : WHITE
  );
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
