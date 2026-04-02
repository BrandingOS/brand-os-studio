import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';

interface ProfileIconRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function ProfileIconRenderer({ brand, templateIndex }: ProfileIconRendererProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';

  const icons = [
    // 0: Solid color bg with white monogram
    (
      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: p }}>
        <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
      </div>
    ),
    // 1: White bg with colored monogram
    (
      <div className="w-full h-full rounded-full bg-white border border-gray-100 flex items-center justify-center">
        <span className="text-[14px] font-bold" style={{ color: p }}>{brand.name.charAt(0)}</span>
      </div>
    ),
    // 2: Gradient circle
    (
      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${p}, ${s})` }}>
        <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
      </div>
    ),
    // 3: Dark bg
    (
      <div className="w-full h-full rounded-full bg-[#0F172A] flex items-center justify-center">
        <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
      </div>
    ),
    // 4: Rounded square — solid
    (
      <div className="w-full h-full rounded-xl flex items-center justify-center" style={{ backgroundColor: p }}>
        <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
      </div>
    ),
    // 5: Rounded square — white
    (
      <div className="w-full h-full rounded-xl bg-white border border-gray-100 flex items-center justify-center">
        <span className="text-[14px] font-bold" style={{ color: p }}>{brand.name.charAt(0)}</span>
      </div>
    ),
    // 6: Circle with ring
    (
      <div className="w-full h-full rounded-full flex items-center justify-center bg-white" style={{ border: `2px solid ${p}` }}>
        <span className="text-[12px] font-bold" style={{ color: p }}>{brand.name.charAt(0)}</span>
      </div>
    ),
    // 7: Two-tone gradient
    (
      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: `linear-gradient(180deg, ${p}, ${p}88)` }}>
        <span className="text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
      </div>
    ),
    // 8: Square dark
    (
      <div className="w-full h-full rounded-xl bg-[#0F172A] flex items-center justify-center">
        <span className="text-[12px] font-bold" style={{ color: s }}>{brand.name.charAt(0)}</span>
      </div>
    ),
    // 9: Transparent bg with outline
    (
      <div className="w-full h-full rounded-full flex items-center justify-center" style={{ border: `2px solid ${s}`, backgroundColor: `${s}10` }}>
        <span className="text-[12px] font-bold" style={{ color: s }}>{brand.name.charAt(0)}</span>
      </div>
    ),
    // 10: Split color
    (
      <div className="w-full h-full rounded-full overflow-hidden flex relative">
        <div className="w-1/2 h-full" style={{ backgroundColor: p }} />
        <div className="w-1/2 h-full" style={{ backgroundColor: s }} />
        <span className="absolute inset-0 flex items-center justify-center text-[14px] font-bold text-white">{brand.name.charAt(0)}</span>
      </div>
    ),
    // 11: Minimal dot
    (
      <div className="w-full h-full rounded-full bg-gray-50 flex items-center justify-center relative">
        <span className="text-[14px] font-bold text-gray-800">{brand.name.charAt(0)}</span>
        <div className="absolute bottom-[15%] right-[15%] w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s }} />
      </div>
    ),
  ];

  return icons[templateIndex % icons.length];
}
