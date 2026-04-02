import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';

interface BusinessCardRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function BusinessCardRenderer({ brand, templateIndex }: BusinessCardRendererProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';
  const designs = [
    // 0: Classic Clean — logo top-left, name right, contact bottom
    (
      <div className="w-full h-full bg-white flex flex-col justify-between p-[8%] relative overflow-hidden">
        <div className="flex justify-between items-start">
          <BrandLogo brand={brand} size="sm" />
          <div className="text-right">
            <div className="text-[7px] font-semibold text-gray-800">Jane Smith</div>
            <div className="text-[5px] font-medium" style={{ color: p }}>Vice President</div>
          </div>
        </div>
        <div className="space-y-[1px]">
          <div className="text-[5px] text-gray-600">+1 234 56789</div>
          <div className="text-[5px] text-gray-600">jane@{brand.name.toLowerCase()}.com</div>
          <div className="text-[5px] text-gray-600">{brand.name.toLowerCase()}.com</div>
        </div>
        <div className="absolute bottom-0 right-0 w-[25%] h-[40%]">
          <div className="absolute bottom-2 right-2 w-3 h-3 rounded-sm" style={{ backgroundColor: p, opacity: 0.8 }} />
          <div className="absolute bottom-2 right-6 w-3 h-3 rounded-sm" style={{ backgroundColor: s, opacity: 0.6 }} />
        </div>
      </div>
    ),
    // 1: Centered — logo center-top, name/title center, contact below
    (
      <div className="w-full h-full bg-white flex flex-col items-center justify-center p-[8%] relative overflow-hidden">
        <BrandLogo brand={brand} size="sm" />
        <div className="mt-2 text-center">
          <div className="text-[6px] font-semibold tracking-wider uppercase text-gray-800">Jane Smith</div>
          <div className="text-[5px] font-medium mt-0.5" style={{ color: p }}>Vice President</div>
        </div>
        <div className="absolute bottom-[8%] left-0 right-0 flex justify-between px-[8%]">
          <div className="text-[4.5px] text-gray-500">+1 234 56789</div>
          <div className="text-[4.5px] text-gray-500">jane@{brand.name.toLowerCase()}.com</div>
        </div>
        <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: p }} />
      </div>
    ),
    // 2: Logo back — full brand color with logo only
    (
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: p }}>
        <BrandLogo brand={brand} size="lg" color="#ffffff" />
        <div className="absolute bottom-[8%] text-center">
          <div className="text-[4.5px] text-white/60">{brand.name.toLowerCase()}.com</div>
        </div>
      </div>
    ),
    // 3: Split left — accent block left, content right
    (
      <div className="w-full h-full bg-white flex overflow-hidden">
        <div className="w-[30%] flex flex-col items-center justify-center gap-1" style={{ backgroundColor: p }}>
          <BrandLogo brand={brand} variant="monogram" size="sm" color={s} />
        </div>
        <div className="flex-1 flex flex-col justify-between p-[6%]">
          <div>
            <div className="text-[7px] font-semibold text-gray-800">Jane Smith</div>
            <div className="text-[5px] font-medium" style={{ color: p }}>Vice President</div>
          </div>
          <div className="space-y-[1px]">
            <div className="text-[4.5px] text-gray-500">+1 234 56789</div>
            <div className="text-[4.5px] text-gray-500">jane@{brand.name.toLowerCase()}.com</div>
            <div className="text-[4.5px] text-gray-500">{brand.name.toLowerCase()}.com</div>
          </div>
          <BrandLogo brand={brand} size="xs" />
        </div>
      </div>
    ),
    // 4: Diagonal band — brand color diagonal across the top
    (
      <div className="w-full h-full bg-white relative overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[120%] h-[55%] transform -rotate-6" style={{ backgroundColor: p }} />
        <div className="absolute top-[6%] left-[8%]">
          <BrandLogo brand={brand} size="sm" color="#ffffff" />
        </div>
        <div className="absolute bottom-[8%] left-[8%] right-[8%]">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-[7px] font-semibold text-gray-800">Jane Smith</div>
              <div className="text-[5px] font-medium" style={{ color: p }}>Vice President</div>
            </div>
            <div className="text-right space-y-[1px]">
              <div className="text-[4.5px] text-gray-500">+1 234 56789</div>
              <div className="text-[4.5px] text-gray-500">jane@{brand.name.toLowerCase()}.com</div>
              <div className="text-[4.5px] text-gray-500">{brand.name.toLowerCase()}.com</div>
            </div>
          </div>
        </div>
      </div>
    ),
    // 5: Minimal line — thin line, very clean
    (
      <div className="w-full h-full bg-white flex flex-col justify-between p-[8%] relative overflow-hidden">
        <div className="flex justify-between items-center">
          <BrandLogo brand={brand} size="sm" />
          <div className="text-[4.5px] text-gray-400">{brand.name.toLowerCase()}.com</div>
        </div>
        <div className="w-full h-px bg-gray-200 my-1" />
        <div className="flex justify-between items-end">
          <div>
            <div className="text-[7px] font-medium text-gray-800">Jane Smith</div>
            <div className="text-[5px]" style={{ color: p }}>Vice President</div>
          </div>
          <div className="text-right space-y-[1px]">
            <div className="text-[4.5px] text-gray-500">+1 234 56789</div>
            <div className="text-[4.5px] text-gray-500">jane@{brand.name.toLowerCase()}.com</div>
          </div>
        </div>
      </div>
    ),
    // 6: Bold full-color — brand bg, white text
    (
      <div className="w-full h-full flex flex-col justify-between p-[8%] relative overflow-hidden" style={{ backgroundColor: p }}>
        <div className="flex justify-between items-start">
          <div>
            <div className="text-[6px] font-semibold tracking-wider uppercase text-white">Jane Smith</div>
            <div className="text-[5px] text-white/70 mt-0.5">Vice President</div>
          </div>
        </div>
        <div className="space-y-[1px]">
          <div className="text-[4.5px] text-white/80">+1 234 56789</div>
          <div className="text-[4.5px] text-white/80">jane@{brand.name.toLowerCase()}.com</div>
        </div>
        <div className="absolute bottom-[6%] right-[6%]">
          <BrandLogo brand={brand} size="xs" color="#ffffff" />
        </div>
        <div className="absolute top-0 right-0 w-[35%] h-full" style={{ backgroundColor: s, opacity: 0.15 }} />
      </div>
    ),
    // 7: Striped pattern — geometric stripes
    (
      <div className="w-full h-full bg-white relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full flex">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-1 h-full" style={{ backgroundColor: i % 2 === 0 ? `${p}10` : 'transparent' }} />
          ))}
        </div>
        <div className="relative z-10 w-full h-full flex flex-col justify-center items-center p-[8%]">
          <BrandLogo brand={brand} size="md" />
        </div>
      </div>
    ),
    // 8: Dark elegant — dark bg, accent line
    (
      <div className="w-full h-full bg-[#0F172A] flex flex-col justify-between p-[8%] relative overflow-hidden">
        <div>
          <div className="text-[7px] font-medium text-white">Jane Smith</div>
          <div className="text-[5px] mt-0.5" style={{ color: s }}>Vice President</div>
        </div>
        <div className="space-y-[1px]">
          <div className="text-[4.5px] text-gray-400">+1 234 56789</div>
          <div className="text-[4.5px] text-gray-400">jane@{brand.name.toLowerCase()}.com</div>
          <div className="text-[4.5px] text-gray-400">{brand.name.toLowerCase()}.com</div>
        </div>
        <div className="absolute bottom-[6%] right-[6%]">
          <BrandLogo brand={brand} size="sm" color="#ffffff" />
        </div>
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: s }} />
      </div>
    ),
  ];

  return designs[templateIndex % designs.length];
}
