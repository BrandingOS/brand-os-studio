import type { Brand } from '@/shared/types/brand';

interface BrandLogoProps {
  brand: Brand;
  variant?: 'full' | 'monogram';
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: { full: 'h-3', mono: 'w-3 h-3 text-[6px]', text: 'text-[8px]' },
  sm: { full: 'h-4', mono: 'w-4 h-4 text-[7px]', text: 'text-[10px]' },
  md: { full: 'h-5', mono: 'w-5 h-5 text-[9px]', text: 'text-[13px]' },
  lg: { full: 'h-8', mono: 'w-8 h-8 text-[12px]', text: 'text-[18px]' },
};

export function BrandLogo({ brand, variant = 'full', color, size = 'md', className = '' }: BrandLogoProps) {
  const c = color || brand.primaryColor;
  const s = sizeMap[size];

  if (variant === 'monogram') {
    return (
      <div
        className={`rounded flex items-center justify-center font-bold ${s.mono} ${className}`}
        style={{ backgroundColor: c, color: '#fff' }}
      >
        {brand.name.charAt(0)}
      </div>
    );
  }

  // If the brand has a logo URL (SVG data URL or image), render it
  if (brand.logo) {
    return (
      <img
        src={brand.logo}
        alt={brand.name}
        className={`${s.full} object-contain ${className}`}
        style={color ? { filter: color === '#ffffff' ? 'brightness(0) invert(1)' : undefined } : undefined}
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
