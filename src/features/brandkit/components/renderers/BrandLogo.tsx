import type { Brand } from '@/shared/types/brand';
import { logoUrl } from '@/shared/brand/logoUrl';
import { getSafeLogoForBackground, isLightColor } from '../../engine/brandRules';

/**
 * BrandLogo — Renders the correct logo variant based on context.
 *
 * Supports the new multi-asset logo system (logoAssets) with fallback to single logo.
 * Variants:
 * - 'full'     — Full logo (icon + wordmark). Falls back to logoAssets.full → brand.logo
 * - 'icon'     — Icon/symbol only. Falls back to logoAssets.icon → monogram letter
 * - 'wordmark' — Text wordmark only. Falls back to logoAssets.wordmark → text rendering
 * - 'monogram' — Single letter monogram (always rendered, even with logo)
 * - 'auto'     — Picks best variant for the given size/context
 */

type LogoVariant = 'full' | 'icon' | 'wordmark' | 'monogram' | 'auto';

interface BrandLogoProps {
  brand: Brand;
  variant?: LogoVariant;
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  bgColor?: string;
}

const sizeMap = {
  xs: { full: 'h-3', icon: 'w-3 h-3', mono: 'w-3 h-3 text-[6px]', text: 'text-[8px]' },
  sm: { full: 'h-4', icon: 'w-4 h-4', mono: 'w-4 h-4 text-[7px]', text: 'text-[10px]' },
  md: { full: 'h-5', icon: 'w-5 h-5', mono: 'w-5 h-5 text-[9px]', text: 'text-[13px]' },
  lg: { full: 'h-8', icon: 'w-8 h-8', mono: 'w-8 h-8 text-[12px]', text: 'text-[18px]' },
  xl: { full: 'h-12', icon: 'w-12 h-12', mono: 'w-12 h-12 text-[18px]', text: 'text-[24px]' },
};

function getLogoSrc(brand: Brand, variant: LogoVariant, bgColor?: string): string | null {
  if (bgColor && !isLightColor(bgColor)) {
    const light = logoUrl(brand, 'mono.white');
    if (light) return light;
  }
  if (bgColor && isLightColor(bgColor)) {
    const dark = logoUrl(brand, 'mono.black');
    if (dark) return dark;
  }

  switch (variant) {
    case 'full':
      return logoUrl(brand) ?? null;
    case 'icon':
      return logoUrl(brand, 'iconmark') ?? logoUrl(brand) ?? null;
    case 'wordmark':
      return logoUrl(brand, 'wordmark') ?? null;
    case 'auto':
      return logoUrl(brand) ?? null;
    default:
      return logoUrl(brand) ?? null;
  }
}

export function BrandLogo({ brand, variant = 'full', color, size = 'md', className = '', bgColor }: BrandLogoProps) {
  const c = color || brand.primaryColor;
  const s = sizeMap[size];

  // Monogram — always renders as a letter/icon badge
  if (variant === 'monogram') {
    const iconSrc = logoUrl(brand, 'iconmark') ?? logoUrl(brand);
    if (iconSrc) {
      const monoFilter = bgColor && !isLightColor(bgColor) ? 'brightness(0) invert(1)' : undefined;
      return (
        <div className={`rounded flex items-center justify-center ${s.mono} ${className}`} style={{ backgroundColor: c }}>
          <img src={iconSrc} alt="" className="w-[65%] h-[65%] object-contain" style={{ filter: monoFilter || 'brightness(0) invert(1)' }} />
        </div>
      );
    }
    return (
      <div className={`rounded flex items-center justify-center font-bold ${s.mono} ${className}`} style={{ backgroundColor: c, color: '#fff' }}>
        {brand.name.charAt(0)}
      </div>
    );
  }

  // Wordmark — text only
  if (variant === 'wordmark') {
    const wordmarkSrc = getLogoSrc(brand, 'wordmark', bgColor);
    if (wordmarkSrc) {
      let filter: string | undefined;
      if (color === '#ffffff') filter = 'brightness(0) invert(1)';
      else if (color === '#000000' || color === '#0A0A0F') filter = 'grayscale(1) brightness(0)';
      else if (bgColor) filter = getSafeLogoForBackground(brand, bgColor).filter;
      return <img src={wordmarkSrc} alt={brand.name} className={`${s.full} object-contain ${className}`} style={{ filter }} />;
    }
    // Fallback: render text
    return (
      <span className={`font-bold tracking-tight ${s.text} ${className}`} style={{ color: c }}>
        <span style={{ fontWeight: 800 }}>{brand.name.substring(0, Math.ceil(brand.name.length / 2))}</span>
        <span style={{ fontWeight: 400 }}>{brand.name.substring(Math.ceil(brand.name.length / 2))}</span>
      </span>
    );
  }

  // Icon — symbol only
  if (variant === 'icon') {
    const iconSrc = getLogoSrc(brand, 'icon', bgColor);
    if (iconSrc) {
      let filter: string | undefined;
      if (color === '#ffffff') filter = 'brightness(0) invert(1)';
      else if (color === '#000000') filter = 'grayscale(1) brightness(0)';
      else if (bgColor) filter = getSafeLogoForBackground(brand, bgColor).filter;
      return <img src={iconSrc} alt={brand.name} className={`${s.icon} object-contain ${className}`} style={{ filter }} />;
    }
    // Fallback: monogram
    return (
      <div className={`rounded flex items-center justify-center font-bold ${s.mono} ${className}`} style={{ backgroundColor: c, color: '#fff' }}>
        {brand.name.charAt(0)}
      </div>
    );
  }

  // Full logo (default + auto)
  const logoSrc = getLogoSrc(brand, variant, bgColor);
  if (logoSrc) {
    let filter: string | undefined;
    if (color === '#ffffff') filter = 'brightness(0) invert(1)';
    else if (color === '#000000' || color === '#0A0A0F') filter = 'grayscale(1) brightness(0)';
    else if (bgColor) filter = getSafeLogoForBackground(brand, bgColor).filter;
    return <img src={logoSrc} alt={brand.name} className={`${s.full} object-contain ${className}`} style={{ filter }} />;
  }

  // Fallback: text-based logo
  return (
    <span className={`font-bold tracking-tight ${s.text} ${className}`} style={{ color: c }}>
      <span style={{ fontWeight: 800 }}>{brand.name.substring(0, Math.ceil(brand.name.length / 2))}</span>
      <span style={{ fontWeight: 400 }}>{brand.name.substring(Math.ceil(brand.name.length / 2))}</span>
    </span>
  );
}
