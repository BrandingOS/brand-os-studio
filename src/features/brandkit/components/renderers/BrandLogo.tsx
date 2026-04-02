import type { Brand } from '@/shared/types/brand';
import { getSafeLogoForBackground, isLightColor } from '../../engine/brandRules';

interface BrandLogoProps {
  brand: Brand;
  variant?: 'full' | 'monogram';
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  bgColor?: string; // Optional: auto-selects safe logo variant
}

const sizeMap = {
  xs: { full: 'h-3', mono: 'w-3 h-3 text-[6px]', text: 'text-[8px]' },
  sm: { full: 'h-4', mono: 'w-4 h-4 text-[7px]', text: 'text-[10px]' },
  md: { full: 'h-5', mono: 'w-5 h-5 text-[9px]', text: 'text-[13px]' },
  lg: { full: 'h-8', mono: 'w-8 h-8 text-[12px]', text: 'text-[18px]' },
};

export function BrandLogo({ brand, variant = 'full', color, size = 'md', className = '', bgColor }: BrandLogoProps) {
  const c = color || brand.primaryColor;
  const s = sizeMap[size];

  if (variant === 'monogram') {
    if (brand.logo) {
      // Use actual logo as monogram instead of letter
      const monoFilter = bgColor && !isLightColor(bgColor) ? 'brightness(0) invert(1)' : undefined;
      return (
        <div className={`rounded flex items-center justify-center ${s.mono} ${className}`} style={{ backgroundColor: c }}>
          <img src={brand.logo} alt="" className="w-[65%] h-[65%] object-contain" style={{ filter: monoFilter || 'brightness(0) invert(1)' }} />
        </div>
      );
    }
    return (
      <div className={`rounded flex items-center justify-center font-bold ${s.mono} ${className}`} style={{ backgroundColor: c, color: '#fff' }}>
        {brand.name.charAt(0)}
      </div>
    );
  }

  // Full logo rendering
  if (brand.logo) {
    // Determine the correct filter based on color prop or background
    let filter: string | undefined;
    if (color === '#ffffff') {
      filter = 'brightness(0) invert(1)';
    } else if (color === '#000000' || color === '#0A0A0F') {
      filter = 'grayscale(1) brightness(0)';
    } else if (bgColor) {
      const safe = getSafeLogoForBackground(brand, bgColor);
      filter = safe.filter;
    }

    return (
      <img
        src={brand.logo}
        alt={brand.name}
        className={`${s.full} object-contain ${className}`}
        style={{ filter }}
      />
    );
  }

  // Fallback: text-based logo
  return (
    <span className={`font-bold tracking-tight ${s.text} ${className}`} style={{ color: c }}>
      <span style={{ fontWeight: 800 }}>{brand.name.substring(0, Math.ceil(brand.name.length / 2))}</span>
      <span style={{ fontWeight: 400 }}>{brand.name.substring(Math.ceil(brand.name.length / 2))}</span>
    </span>
  );
}
