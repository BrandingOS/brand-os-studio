import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';

interface MockupRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function MockupRenderer({ brand, templateIndex }: MockupRendererProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';

  const mockups = [
    // 0: Phone mockup
    (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="w-[35%] bg-gray-900 rounded-lg p-[2px] shadow-lg">
          <div className="w-full aspect-[9/16] bg-white rounded-md overflow-hidden flex flex-col">
            <div className="h-[15%] flex items-center px-1" style={{ backgroundColor: p }}>
              <BrandLogo brand={brand} size="xs" color="#ffffff" />
            </div>
            <div className="flex-1 p-1 space-y-0.5">
              <div className="h-0.5 rounded bg-gray-200 w-full" />
              <div className="h-0.5 rounded bg-gray-200 w-3/4" />
              <div className="h-2 rounded bg-gray-100 w-full mt-1" />
              <div className="h-2 rounded bg-gray-100 w-full" />
            </div>
          </div>
        </div>
      </div>
    ),
    // 1: Laptop mockup
    (
      <div className="w-full h-full bg-gray-50 flex items-end justify-center pb-[5%]">
        <div className="w-[75%]">
          <div className="bg-gray-800 rounded-t-md p-[2px]">
            <div className="w-full aspect-video bg-white rounded-sm overflow-hidden flex flex-col">
              <div className="h-[12%] flex items-center justify-between px-1.5" style={{ backgroundColor: p }}>
                <BrandLogo brand={brand} size="xs" color="#ffffff" />
                <div className="flex gap-0.5">
                  {[1, 2, 3].map(i => <div key={i} className="w-2 h-0.5 rounded bg-white/30" />)}
                </div>
              </div>
              <div className="flex-1 p-1.5 flex gap-1">
                <div className="w-[25%] space-y-0.5">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-0.5 rounded bg-gray-200 w-full" />)}
                </div>
                <div className="flex-1 bg-gray-50 rounded-sm" />
              </div>
            </div>
          </div>
          <div className="bg-gray-700 h-1 rounded-b-sm mx-[10%]" />
        </div>
      </div>
    ),
    // 2: T-shirt mockup
    (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="relative">
          <svg viewBox="0 0 100 80" className="w-[70%] mx-auto" fill="none">
            <path d="M20 20 L35 10 L50 15 L65 10 L80 20 L70 30 L70 75 L30 75 L30 30 Z" fill="#F1F5F9" stroke="#E2E8F0" strokeWidth="1" />
          </svg>
          <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2">
            <BrandLogo brand={brand} variant="monogram" size="md" />
          </div>
        </div>
      </div>
    ),
    // 3: Business card stack
    (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center relative">
        <div className="absolute w-[60%] aspect-[1.75/1] bg-white rounded-sm shadow-sm transform rotate-3 top-[35%] left-[22%]" style={{ borderLeft: `2px solid ${p}` }} />
        <div className="absolute w-[60%] aspect-[1.75/1] bg-white rounded-sm shadow transform -rotate-2 top-[32%] left-[20%]">
          <div className="w-full h-full flex flex-col justify-between p-[8%]">
            <BrandLogo brand={brand} size="xs" />
            <div className="text-[4px] text-gray-500">{brand.name.toLowerCase()}.com</div>
          </div>
        </div>
      </div>
    ),
    // 4: Poster/frame mockup
    (
      <div className="w-full h-full bg-[#F5F0EB] flex items-center justify-center">
        <div className="w-[50%] bg-white shadow-md p-[3%]">
          <div className="w-full aspect-[3/4] flex flex-col items-center justify-center" style={{ backgroundColor: p }}>
            <BrandLogo brand={brand} size="md" color="#ffffff" />
            <div className="mt-1 text-[3px] text-white/40 uppercase tracking-widest">{brand.name}</div>
          </div>
        </div>
      </div>
    ),
    // 5: Mug mockup
    (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="relative">
          <div className="w-10 h-12 bg-white rounded-sm shadow-sm flex items-center justify-center overflow-hidden">
            <BrandLogo brand={brand} variant="monogram" size="sm" />
          </div>
          <div className="absolute top-2 -right-2 w-2 h-6 border-2 border-gray-300 rounded-r-full" />
        </div>
      </div>
    ),
    // 6: Stationery set
    (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center p-[6%]">
        <div className="relative w-full h-full">
          <div className="absolute w-[55%] h-[75%] bg-white shadow-sm top-[5%] left-[5%] rounded-sm p-[4%]">
            <BrandLogo brand={brand} size="xs" />
            <div className="mt-1 space-y-0.5">
              <div className="h-0.5 rounded bg-gray-200 w-full" />
              <div className="h-0.5 rounded bg-gray-200 w-3/4" />
            </div>
          </div>
          <div className="absolute w-[35%] aspect-[1.75/1] bg-white shadow-sm bottom-[10%] right-[5%] rounded-sm p-[4%]">
            <BrandLogo brand={brand} size="xs" />
          </div>
        </div>
      </div>
    ),
  ];

  return mockups[templateIndex % mockups.length];
}
