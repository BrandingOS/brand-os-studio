import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from './BrandLogo';

interface InvoiceRendererProps {
  brand: Brand;
  templateIndex: number;
}

export function InvoiceRenderer({ brand, templateIndex }: InvoiceRendererProps) {
  const p = brand.primaryColor;
  const s = brand.secondaryColor || '#00D4AA';

  const invoices = [
    // 0: Clean minimal
    (
      <div className="w-full h-full bg-white flex flex-col p-[6%] text-left">
        <div className="flex justify-between items-start mb-2">
          <BrandLogo brand={brand} size="sm" />
          <div className="text-[5px] font-bold" style={{ color: p }}>INVOICE</div>
        </div>
        <div className="flex justify-between text-[3.5px] text-gray-500 mb-2">
          <div><div className="font-semibold text-gray-700">Bill To:</div>Acme Corp</div>
          <div className="text-right"><div className="font-semibold text-gray-700">#INV-0042</div>Dec 15, 2025</div>
        </div>
        <div className="flex-1">
          <div className="w-full h-px bg-gray-200 mb-1" />
          {[['Strategy Consultation', '$2,400'], ['Brand Identity Package', '$4,800'], ['Digital Assets', '$1,200']].map(([item, price]) => (
            <div key={item} className="flex justify-between text-[3.5px] py-0.5 text-gray-600">
              <span>{item}</span><span className="font-medium">{price}</span>
            </div>
          ))}
          <div className="w-full h-px bg-gray-200 mt-1 mb-1" />
          <div className="flex justify-between text-[4px] font-bold text-gray-900">
            <span>Total</span><span>$8,400.00</span>
          </div>
        </div>
        <div className="text-[3px] text-gray-400 mt-1">Payment due within 30 days</div>
      </div>
    ),
    // 1: Bold header
    (
      <div className="w-full h-full bg-white flex flex-col text-left">
        <div className="p-[6%] pb-2" style={{ backgroundColor: p }}>
          <div className="flex justify-between items-center">
            <BrandLogo brand={brand} size="sm" color="#ffffff" />
            <div className="text-[6px] font-bold text-white">INVOICE</div>
          </div>
          <div className="flex justify-between mt-1 text-[3.5px] text-white/70">
            <span>#INV-0042</span><span>Dec 15, 2025</span>
          </div>
        </div>
        <div className="flex-1 p-[6%] pt-2">
          {[['Consulting', '$3,500'], ['Development', '$6,000'], ['Support', '$1,500']].map(([item, price]) => (
            <div key={item} className="flex justify-between text-[3.5px] py-0.5 text-gray-600">
              <span>{item}</span><span className="font-medium">{price}</span>
            </div>
          ))}
          <div className="w-full h-px bg-gray-200 mt-1 mb-1" />
          <div className="flex justify-between text-[4px] font-bold text-gray-900">
            <span>Total</span><span>$11,000.00</span>
          </div>
        </div>
      </div>
    ),
    // 2: Accent sidebar
    (
      <div className="w-full h-full bg-white flex text-left">
        <div className="w-[3%]" style={{ backgroundColor: p }} />
        <div className="flex-1 flex flex-col p-[5%]">
          <div className="flex justify-between items-start mb-2">
            <BrandLogo brand={brand} size="xs" />
            <div className="text-[4px] font-bold text-gray-400">#INV-0042</div>
          </div>
          <div className="text-[5px] font-bold text-gray-900 mb-2">Invoice</div>
          <div className="flex-1 space-y-[3px]">
            {[['Design System', '$5,200'], ['Prototyping', '$3,400'], ['Testing', '$1,800']].map(([item, price]) => (
              <div key={item} className="flex justify-between text-[3.5px] text-gray-600">
                <span>{item}</span><span>{price}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[4px] font-bold text-gray-900 pt-1 border-t border-gray-200">
            <span>Total</span><span>$10,400.00</span>
          </div>
        </div>
      </div>
    ),
    // 3: Modern dark
    (
      <div className="w-full h-full flex flex-col p-[6%] text-left" style={{ backgroundColor: '#0F172A' }}>
        <div className="flex justify-between items-start mb-2">
          <BrandLogo brand={brand} size="sm" color="#ffffff" />
          <div className="text-[5px] font-bold" style={{ color: s }}>INVOICE</div>
        </div>
        <div className="flex-1">
          {[['Research & Analysis', '$4,000'], ['Implementation', '$7,500'], ['Training', '$2,000']].map(([item, price]) => (
            <div key={item} className="flex justify-between text-[3.5px] py-0.5 text-gray-400">
              <span>{item}</span><span className="text-gray-300">{price}</span>
            </div>
          ))}
          <div className="w-full h-px bg-gray-700 mt-1 mb-1" />
          <div className="flex justify-between text-[4px] font-bold text-white">
            <span>Total</span><span>$13,500.00</span>
          </div>
        </div>
      </div>
    ),
  ];

  return invoices[templateIndex % invoices.length];
}
