/**
 * TemplateFrame
 * ─────────────────────────────────────────────────────────────────────────
 * Every output renders inside a fixed-pixel design (matching `OutputSpec`'s
 * native width × height). This frame:
 *   • establishes those native pixel dimensions
 *   • applies a CSS scale transform so the preview fits its container
 *   • exposes brand tokens via CSS custom properties so child renderers
 *     can reference them inline without prop-drilling
 *
 * The `data-brand-template-frame` data attribute is the export hook —
 * the export utility looks for this attribute when capturing.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BrandTokens } from '../engine/brandTokens';

interface TemplateFrameProps {
  tokens: BrandTokens;
  width: number;
  height: number;
  children: ReactNode;
  /** Background override; defaults to `tokens.colors.surface`. */
  background?: string;
  className?: string;
  /** Disable the auto-fit transform (used for full-resolution export). */
  noScale?: boolean;
}

export function TemplateFrame({
  tokens,
  width,
  height,
  children,
  background,
  className,
  noScale = false,
}: TemplateFrameProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (noScale) {
      setScale(1);
      return;
    }
    const el = wrapperRef.current;
    if (!el) return;
    const compute = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0) return;
      setScale(rect.width / width);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, noScale]);

  const wrapperStyle: CSSProperties = noScale
    ? { width, height }
    : {
        width: '100%',
        aspectRatio: `${width} / ${height}`,
        overflow: 'hidden',
        position: 'relative',
      };

  const innerStyle: CSSProperties = {
    width,
    height,
    transformOrigin: 'top left',
    transform: noScale ? undefined : `scale(${scale})`,
    background: background ?? tokens.colors.surface,
    color: tokens.colors.foreground,
    fontFamily: tokens.typography.bodyFamily,
    position: noScale ? 'relative' : 'absolute',
    top: 0,
    left: 0,
    // CSS variables exposed to template children for ad-hoc styling.
    ['--bc-primary' as string]: tokens.colors.primary,
    ['--bc-secondary' as string]: tokens.colors.secondary,
    ['--bc-accent' as string]: tokens.colors.accent,
    ['--bc-surface' as string]: tokens.colors.surface,
    ['--bc-surface-muted' as string]: tokens.colors.surfaceMuted,
    ['--bc-foreground' as string]: tokens.colors.foreground,
    ['--bc-foreground-muted' as string]: tokens.colors.foregroundMuted,
    ['--bc-on-primary' as string]: tokens.colors.onPrimary,
    ['--bc-border' as string]: tokens.colors.border,
    ['--bc-radius' as string]: tokens.ui.radius,
    ['--bc-radius-lg' as string]: tokens.ui.radiusLarge,
    ['--bc-heading-font' as string]: tokens.typography.headingFamily,
    ['--bc-body-font' as string]: tokens.typography.bodyFamily,
  };

  return (
    <div ref={wrapperRef} style={wrapperStyle} className={className}>
      <div data-brand-template-frame style={innerStyle}>
        {children}
      </div>
    </div>
  );
}

interface BrandLogoMarkProps {
  tokens: BrandTokens;
  background: string;
  size?: number;
  /** When true, fall back to a wordmark even if a logo URL exists. */
  forceWordmark?: boolean;
}

/**
 * Render a brand mark — actual logo if available (auto-picked for the
 * background), or a wordmark in the brand heading font otherwise.
 */
export function BrandLogoMark({ tokens, background, size = 48, forceWordmark }: BrandLogoMarkProps) {
  const url = forceWordmark ? undefined : tokens.logo.pickFor(background);
  const onBg = isLight(background) ? '#0B0B0F' : '#FFFFFF';

  if (url) {
    return (
      <img
        src={url}
        alt={`${tokens.brandName} logo`}
        crossOrigin="anonymous"
        style={{
          height: size,
          width: 'auto',
          objectFit: 'contain',
          maxWidth: size * 5,
          display: 'block',
        }}
      />
    );
  }

  return (
    <span
      style={{
        fontFamily: tokens.typography.headingFamily,
        fontWeight: 800,
        fontSize: size * 0.55,
        color: onBg,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {tokens.brandName}
    </span>
  );
}

function isLight(hex: string): boolean {
  const h = hex.replace('#', '').slice(0, 6);
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Per-channel sRGB → relative luminance approx.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
}
