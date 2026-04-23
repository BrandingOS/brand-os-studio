/**
 * Shared presentational primitives used across slide variants.
 *
 * These are not slides — they're small tokens (logo mark, wordmark, type
 * stacks, grid overlays) that every archetype reuses so deck output stays
 * coherent even as variants wildly differ in composition.
 */

import type { CSSProperties } from 'react';
import type { BrandProfile } from '../types';

/**
 * Logo block: renders the brand's primary/white/black logo image if we
 * have one, falling back to a clean wordmark in the brand's heading type.
 */
export function LogoMark({
  profile,
  variant = 'primary',
  height = 80,
  color,
  style,
}: {
  profile: BrandProfile;
  variant?: 'primary' | 'white' | 'black' | 'wordmark' | 'iconmark';
  height?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const a = profile.assets;
  const src =
    variant === 'white'
      ? a.logoWhite ?? a.logoPrimary
      : variant === 'black'
      ? a.logoBlack ?? a.logoPrimary
      : variant === 'wordmark'
      ? a.logoWordmark ?? a.logoPrimary
      : variant === 'iconmark'
      ? a.logoIconmark ?? a.logoPrimary
      : a.logoPrimary;

  if (src) {
    return (
      <img
        src={src}
        alt={profile.name}
        style={{ height, width: 'auto', objectFit: 'contain', ...style }}
      />
    );
  }

  // Wordmark fallback — use the brand's display type and the requested ink.
  return (
    <span
      style={{
        fontFamily: `'${profile.typography.headingFamily}', sans-serif`,
        fontWeight: profile.typography.headingWeight,
        fontSize: height * 0.75,
        lineHeight: 1,
        letterSpacing: '-0.02em',
        color: color ?? 'inherit',
        ...style,
      }}
    >
      {profile.name}
    </span>
  );
}

/** A heading block in brand display type. */
export function Display({
  children,
  profile,
  size = 120,
  weight,
  color,
  style,
}: {
  children: React.ReactNode;
  profile: BrandProfile;
  size?: number;
  weight?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: `'${profile.typography.headingFamily}', sans-serif`,
        fontWeight: weight ?? profile.typography.headingWeight,
        fontSize: size,
        lineHeight: 0.95,
        letterSpacing: '-0.025em',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A body / caption block in brand body type. */
export function Body({
  children,
  profile,
  size = 18,
  weight,
  color,
  style,
}: {
  children: React.ReactNode;
  profile: BrandProfile;
  size?: number;
  weight?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontFamily: `'${profile.typography.bodyFamily}', sans-serif`,
        fontWeight: weight ?? profile.typography.bodyWeight,
        fontSize: size,
        lineHeight: 1.4,
        letterSpacing: '0.01em',
        color,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A thin horizontal rule with a small uppercase label inside. */
export function LabelRule({
  label,
  color,
  profile,
  style,
}: {
  label: string;
  color?: string;
  profile: BrandProfile;
  style?: CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, ...style }}>
      <div
        style={{
          flex: 1,
          height: 1,
          background: color ?? 'currentColor',
          opacity: 0.5,
        }}
      />
      <span
        style={{
          fontFamily: `'${profile.typography.bodyFamily}', sans-serif`,
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          color: color ?? 'currentColor',
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 1,
          background: color ?? 'currentColor',
          opacity: 0.5,
        }}
      />
    </div>
  );
}

/** Tiny corner mark — the TM sign that sits next to the wordmark. */
export function TMark({ size = 22, color }: { size?: number; color?: string }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 700,
        color: color ?? 'currentColor',
        verticalAlign: 'super',
        lineHeight: 1,
      }}
    >
      ™
    </span>
  );
}

/**
 * Silhouette placeholder — shown when the cover slide wants a human portrait
 * but the brand has no photo asset. Uses a CSS gradient to abstract a
 * head-and-shoulders shape on the brand color so the cover still reads.
 */
export function SilhouettePlaceholder({
  accent,
  style,
}: {
  accent: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 800 1000"
      preserveAspectRatio="xMidYMax meet"
      style={{ filter: 'drop-shadow(0 0 60px rgba(0,0,0,0.3))', ...style }}
    >
      <defs>
        <radialGradient id="sil-grad" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#000" stopOpacity="0.95" />
          <stop offset="70%" stopColor="#000" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.3" />
        </radialGradient>
        <filter id="sil-highlight" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      {/* shoulders */}
      <path
        fill="url(#sil-grad)"
        d="M0,1000 L0,780 Q180,700 320,700 Q400,680 400,640 Q380,620 360,540 Q310,520 310,420 Q310,280 400,220 Q490,280 490,420 Q490,520 440,540 Q420,620 400,640 Q400,680 480,700 Q620,700 800,780 L800,1000 Z"
      />
      {/* subtle rim light */}
      <path
        fill={accent}
        fillOpacity="0.25"
        filter="url(#sil-highlight)"
        d="M380,220 Q470,260 480,410 Q480,510 440,540 Q420,580 400,600 L400,440 Q400,340 380,260 Z"
      />
    </svg>
  );
}
