import type { Brand } from '@/shared/types/brand';
import { getProfileIconConfig } from '../../engine/brandRules';

interface ProfileIconRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function ProfileIconRenderer({ brand, templateIndex }: ProfileIconRendererProps) {
  const p = brand.primaryColor;
  const hasLogo = !!brand.logo;

  if (hasLogo) {
    // Use real logo-based profile icons via the brand rules engine
    const configs = getProfileIconConfig(brand);
    const config = configs[templateIndex % configs.length];
    const isCircle = config.shape === 'circle';

    return (
      <div
        className={`w-full h-full flex items-center justify-center ${isCircle ? 'rounded-full' : 'rounded-xl'}`}
        style={{ backgroundColor: config.bgColor }}
      >
        <img
          src={config.logoSrc}
          alt={brand.name}
          className="w-[55%] h-[55%] object-contain"
          style={{ filter: config.logoFilter || 'none' }}
        />
      </div>
    );
  }

  // Fallback: letter-based icons only when NO logo exists
  const fallbacks = [
    <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: p }}>
      <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
    </div>,
    <div className="w-full h-full rounded-full bg-white border border-gray-100 flex items-center justify-center">
      <span className="text-[14px] font-bold" style={{ color: p }}>{brand.name.charAt(0)}</span>
    </div>,
    <div className="w-full h-full rounded-xl flex items-center justify-center" style={{ backgroundColor: p }}>
      <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
    </div>,
    <div className="w-full h-full rounded-xl bg-white border border-gray-100 flex items-center justify-center">
      <span className="text-[14px] font-bold" style={{ color: p }}>{brand.name.charAt(0)}</span>
    </div>,
    <div className="w-full h-full rounded-full bg-[#0A0A0F] flex items-center justify-center">
      <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
    </div>,
    <div className="w-full h-full rounded-xl bg-[#0A0A0F] flex items-center justify-center">
      <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
    </div>,
  ];

  return fallbacks[templateIndex % fallbacks.length];
}
