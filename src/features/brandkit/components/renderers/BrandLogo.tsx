import type { Brand } from '@/shared/types/brand';

interface BrandLogoProps {
  brand: Brand;
  variant?: 'full' | 'monogram';
  color?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: { full: 'text-[8px]', mono: 'w-3 h-3 text-[6px]' },
  sm: { full: 'text-[10px]', mono: 'w-4 h-4 text-[7px]' },
  md: { full: 'text-[13px]', mono: 'w-5 h-5 text-[9px]' },
  lg: { full: 'text-[18px]', mono: 'w-8 h-8 text-[12px]' },
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

  return (
    <span className={`font-bold tracking-tight ${s.full} ${className}`} style={{ color: c }}>
      <span style={{ fontWeight: 800 }}>{brand.name.substring(0, Math.ceil(brand.name.length / 2))}</span>
      <span style={{ fontWeight: 400 }}>{brand.name.substring(Math.ceil(brand.name.length / 2))}</span>
    </span>
  );
}
