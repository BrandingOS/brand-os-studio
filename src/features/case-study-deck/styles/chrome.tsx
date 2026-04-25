/**
 * Style-aware chrome — top bar / bottom bar / corner numeral.
 *
 * Every archetype slide composes these so the deck reads as one
 * template. The shape of each band is driven entirely by `style.chrome`.
 */

import type { CSSProperties } from 'react';
import type { BrandProfile } from '../types';
import type { DeckStyle } from './types';
import type { SurfaceTokens } from './tokens';
import { resolveFonts } from './tokens';
import { LogoMark } from '../slides/shared';

export interface ChromeProps {
  style: DeckStyle;
  profile: BrandProfile;
  surface: SurfaceTokens;
  /** "06", "01" — a 2-digit slide index. */
  pageNum: string;
  /** "Signature", "Cover" — slide archetype label. */
  sectionLabel: string;
  /** Total deck pages, e.g. 10. */
  total: number;
}

/* ─────────────────────────  TOP BAR  ─────────────────────── */

export function TopBar({ style, profile, surface, pageNum, sectionLabel, total }: ChromeProps) {
  const fonts = resolveFonts(style, profile);
  const tag = style.tag;
  const baseLabelStyle: CSSProperties = {
    fontFamily: fonts.body,
    fontWeight: style.typography.eyebrowWeight,
    letterSpacing: style.typography.eyebrowTracking,
    textTransform: style.typography.eyebrowTransform === 'uppercase' ? 'uppercase' : 'none',
    color: surface.ink,
  };

  const padX = style.spacing.pad;

  if (style.chrome.topBar === 'none') return null;

  if (style.chrome.topBar === 'tabular') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 56,
          left: padX,
          right: padX,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 24,
          ...(style.chrome.pageRule === 'top' || style.chrome.pageRule === 'top-bottom'
            ? { borderTop: `${style.spacing.rule}px solid ${surface.border}`, paddingTop: 18 }
            : {}),
        }}
      >
        <div style={{ ...baseLabelStyle, fontSize: 11, opacity: 0.85 }}>
          <div>{profile.name} ™</div>
          <div style={{ opacity: 0.6, marginTop: 4 }}>Brand Document</div>
          <div style={{ opacity: 0.6 }}>© {new Date().getFullYear()}</div>
        </div>
        <div style={{ ...baseLabelStyle, fontSize: 11, opacity: 0.85, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: surface.accent }} />
            {tag}
          </div>
          <div style={{ opacity: 0.55, marginTop: 4 }}>Section · {sectionLabel}</div>
        </div>
        <div style={{ ...baseLabelStyle, fontSize: 11, opacity: 0.85, textAlign: 'right' }}>
          <div>{pageNum} / {String(total).padStart(2, '0')}</div>
          <div style={{ opacity: 0.55, marginTop: 4 }}>Edition 01</div>
        </div>
      </div>
    );
  }

  if (style.chrome.topBar === 'numbered') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: `${style.spacing.pad / 3}px ${padX}px`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `${style.spacing.rule * 2}px solid ${surface.ink}`,
        }}
      >
        <div style={{ ...baseLabelStyle, fontSize: 12 }}>
          [{pageNum}/{String(total).padStart(2, '0')}] {sectionLabel}
        </div>
        <div style={{ ...baseLabelStyle, fontSize: 12 }}>{tag}</div>
      </div>
    );
  }

  // 'minimal'
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: padX,
        right: padX,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ ...baseLabelStyle, fontSize: 12, opacity: 0.85 }}>
        · §{pageNum} {sectionLabel}
      </div>
      <LogoMark
        profile={profile}
        variant={surface.ink === '#FFFFFF' ? 'white' : 'black'}
        height={32}
        color={surface.ink}
      />
    </div>
  );
}

/* ─────────────────────────  BOTTOM BAR  ───────────────────── */

export function BottomBar({ style, profile, surface, pageNum, sectionLabel, total }: ChromeProps) {
  const fonts = resolveFonts(style, profile);
  const padX = style.spacing.pad;

  if (style.chrome.bottomBar === 'none') return null;

  const baseLabelStyle: CSSProperties = {
    fontFamily: fonts.body,
    fontWeight: style.typography.eyebrowWeight,
    letterSpacing: style.typography.eyebrowTracking,
    textTransform: style.typography.eyebrowTransform === 'uppercase' ? 'uppercase' : 'none',
    color: surface.ink,
    fontSize: 11,
    opacity: 0.7,
  };

  if (style.chrome.bottomBar === 'page-num') {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 64,
          left: padX,
          right: padX,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          ...(style.chrome.pageRule === 'top-bottom'
            ? { borderTop: `${style.spacing.rule}px solid ${surface.border}`, paddingTop: 16 }
            : {}),
        }}
      >
        <div style={baseLabelStyle}>{profile.name}</div>
        <div style={baseLabelStyle}>
          {pageNum} / {String(total).padStart(2, '0')}
        </div>
      </div>
    );
  }

  if (style.chrome.bottomBar === 'tagline') {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: 64,
          left: padX,
          right: padX,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
        }}
      >
        <div style={baseLabelStyle}>
          {profile.tagline.length > 90 ? profile.tagline.slice(0, 88) + '…' : profile.tagline}
        </div>
        <div style={baseLabelStyle}>{pageNum}</div>
      </div>
    );
  }

  // 'meta'
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 56,
        left: padX,
        right: padX,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        ...(style.chrome.pageRule === 'top-bottom'
          ? { borderTop: `${style.spacing.rule}px solid ${surface.border}`, paddingTop: 18 }
          : {}),
      }}
    >
      <div style={{ ...baseLabelStyle, fontSize: 10 }}>
        Designed with brandOS · Edition 01
      </div>
      <div style={{ ...baseLabelStyle, fontSize: 10 }}>
        {sectionLabel} · {pageNum}/{String(total).padStart(2, '0')}
      </div>
    </div>
  );
}

/* ─────────────────────────  CORNER NUMERAL  ───────────────── */

export function CornerNumeral({
  style,
  profile,
  surface,
  pageNum,
  position = 'right',
}: {
  style: DeckStyle;
  profile: BrandProfile;
  surface: SurfaceTokens;
  pageNum: string;
  position?: 'left' | 'right';
}) {
  if (style.chrome.cornerNumeral === 'none') return null;

  // Suppress small numerals when the TopBar already prints the page
  // indicator (tabular / numbered). Otherwise we get "03 / 10" stacking
  // on top of "03" in the same corner. The "oversized" treatment is
  // intentionally kept — it's a design element, not a label.
  const topBarHasPageNum = style.chrome.topBar === 'tabular' || style.chrome.topBar === 'numbered';
  const numeralIsSmall = style.chrome.cornerNumeral === 'tabular' || style.chrome.cornerNumeral === 'thin';
  if (topBarHasPageNum && numeralIsSmall) return null;
  const fonts = resolveFonts(style, profile);

  if (style.chrome.cornerNumeral === 'oversized') {
    return (
      <div
        style={{
          position: 'absolute',
          top: '50%',
          [position]: -60,
          transform: 'translateY(-50%)',
          fontFamily: fonts.heading,
          fontWeight: style.typography.headingWeight,
          fontSize: 880,
          lineHeight: 0.78,
          letterSpacing: '-0.05em',
          color: surface.ink,
          opacity: 0.18,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {pageNum.replace(/^0/, '')}
      </div>
    );
  }

  if (style.chrome.cornerNumeral === 'tabular') {
    return (
      <div
        style={{
          position: 'absolute',
          top: 80,
          [position]: style.spacing.pad,
          fontFamily: fonts.body,
          fontWeight: 700,
          fontSize: 13,
          letterSpacing: '0.04em',
          color: surface.ink,
          opacity: 0.6,
        }}
      >
        {pageNum}
      </div>
    );
  }

  // 'thin'
  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        [position]: style.spacing.pad,
        fontFamily: fonts.heading,
        fontWeight: 300,
        fontSize: 36,
        letterSpacing: '-0.02em',
        color: surface.ink,
        opacity: 0.4,
      }}
    >
      {pageNum}
    </div>
  );
}
