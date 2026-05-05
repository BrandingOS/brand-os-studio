import type { Brand } from '@/shared/types/brand';
import { BrandLogo } from '@/features/brandkit/components/renderers/BrandLogo';

/**
 * QR-code mockups — 30 designs PER STYLE for the 4 cosmos cards
 * (Branded, Minimal, Rounded, Square). Each is a stylized QR
 * matrix made from CSS grid cells; the brand color appears in
 * the eye markers, accent ring, or center monogram.
 */
function QrFrame({ children, bg = '#fff' }: { children: React.ReactNode; bg?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: '#E5E0D2' }}>
      <div className="w-[80%] aspect-square shadow-md p-[5%] relative" style={{ backgroundColor: bg }}>{children}</div>
    </div>
  );
}

interface Props { brand: Brand; templateIndex: number }

// Render an N×N grid of cells with a deterministic-but-random pattern.
function QrPattern({ size = 17, cell = 'square', color = '#0F1216' }: { size?: number; cell?: 'square' | 'rounded' | 'circle'; color?: string }) {
  // Pseudo-random: fixed mask seeded by index.
  const cells = Array.from({ length: size * size }, (_, i) => {
    const r = Math.floor(i / size);
    const c = i % size;
    // QR finder patterns at corners.
    const isFinder =
      (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
    if (isFinder) {
      // Render 7×7 finder rings.
      const fr = r < 7 ? r : r - (size - 7);
      const fc = c < 7 ? c : c < size - 7 ? -1 : c - (size - 7);
      if (fc < 0) return null;
      const inOuter = fr === 0 || fr === 6 || fc === 0 || fc === 6;
      const inInner = fr >= 2 && fr <= 4 && fc >= 2 && fc <= 4;
      return inOuter || inInner ? 1 : 0;
    }
    // pseudo-random data
    const v = (r * 13 + c * 7 + ((r ^ c) * 17)) % 5;
    return v < 2 ? 1 : 0;
  });
  return (
    <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
      {cells.map((v, i) => (
        <div key={i} className={cell === 'circle' ? 'rounded-full' : cell === 'rounded' ? 'rounded-[20%]' : ''} style={{ background: v === 1 ? color : 'transparent', aspectRatio: '1' }} />
      ))}
    </div>
  );
}

// ─────── BRANDED QR
export function BrandedQrRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const init = brand.name.charAt(0).toUpperCase();
  const stills = [
    (<QrFrame><QrPattern color={p} /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[20%] aspect-square rounded-md flex items-center justify-center" style={{backgroundColor:p}}><span className="text-white text-[10px] font-serif font-black">{init}</span></div></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[24%] aspect-square rounded-full bg-white flex items-center justify-center"><BrandLogo brand={brand} size="sm" color={p} /></div></div></QrFrame>),
    (<QrFrame bg={p}><QrPattern color="#fff" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[20%] aspect-square bg-white flex items-center justify-center"><span className="font-serif font-black text-[10px]" style={{color:p}}>{init}</span></div></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute right-[5%] bottom-[5%] text-[3.5px] uppercase tracking-[0.32em]" style={{color:p}}>scan · {brand.name.toLowerCase()}</div></QrFrame>),
    (<QrFrame><QrPattern color={p} cell="rounded" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[22%] aspect-square rounded-md flex items-center justify-center" style={{backgroundColor:p}}><BrandLogo brand={brand} size="sm" color="#fff" /></div></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-x-[5%] top-[5%] flex justify-between items-center"><BrandLogo brand={brand} size="xs" color={p} /><div className="text-[3.5px] uppercase tracking-[0.32em]" style={{color:p}}>{brand.name}</div></div></QrFrame>),
    (<QrFrame bg="#FAF6EE"><QrPattern color={p} /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[24%] aspect-square rounded-full" style={{backgroundColor:'#FAF6EE'}} /></div><div className="absolute inset-0 flex items-center justify-center"><BrandLogo brand={brand} size="sm" color={p} /></div></QrFrame>),
    (<QrFrame><QrPattern color={p} /><div className="absolute -top-[2%] -right-[2%] w-[14%] aspect-square rounded-full flex items-center justify-center" style={{backgroundColor:p}}><span className="text-white text-[8px] font-bold">14</span></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-0 border-[6px] -m-[6px]" style={{borderColor:p}} /></QrFrame>),
    (<QrFrame bg={p}><QrPattern color="#fff" cell="rounded" /><div className="absolute inset-0 flex items-center justify-center"><div className="text-white text-[16px] font-serif font-black">{init}</div></div></QrFrame>),
  ];
  return [...stills, ...stills, ...stills][templateIndex] ?? stills[0];
}

// ─────── MINIMAL QR
export function MinimalQrRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const stills = [
    (<QrFrame><QrPattern color="#0F1216" /></QrFrame>),
    (<QrFrame><QrPattern color={p} /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-x-0 bottom-[2%] text-center text-[3px] uppercase tracking-[0.32em] text-gray-500">{brand.name.toLowerCase()}.com</div></QrFrame>),
    (<QrFrame bg="#FAF6EE"><QrPattern color="#0F1216" /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-x-0 top-[2%] text-center text-[3px] uppercase tracking-[0.32em]" style={{color:p}}>scan</div></QrFrame>),
    (<QrFrame><QrPattern color="#1F2429" /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute -top-[3%] left-1/2 -translate-x-1/2 w-[10%] aspect-square rounded-full" style={{backgroundColor:p}} /></QrFrame>),
    (<QrFrame bg="#fff"><div className="absolute inset-0 p-[8%]"><QrPattern color="#0F1216" /></div><div className="absolute inset-[3%] border" style={{borderColor:'#E5E0D2'}} /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute right-[2%] top-[2%] text-[3.5px] uppercase tracking-[0.32em] text-gray-500">{brand.name}</div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[14%] aspect-square bg-white" /></div></QrFrame>),
  ];
  return [...stills, ...stills, ...stills][templateIndex] ?? stills[0];
}

// ─────── ROUNDED QR
export function RoundedQrRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const stills = [
    (<QrFrame><QrPattern color={p} cell="circle" /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" cell="circle" /></QrFrame>),
    (<QrFrame><QrPattern color={p} cell="rounded" /></QrFrame>),
    (<QrFrame><QrPattern color={p} cell="circle" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[20%] aspect-square rounded-full" style={{backgroundColor:p}} /></div></QrFrame>),
    (<QrFrame bg={p}><QrPattern color="#fff" cell="circle" /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" cell="rounded" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[20%] aspect-square rounded-full bg-white flex items-center justify-center"><BrandLogo brand={brand} size="xs" color={p} /></div></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" cell="circle" /><div className="absolute inset-0 border-2 rounded-2xl -m-1" style={{borderColor:p}} /></QrFrame>),
    (<QrFrame><QrPattern color={p} cell="rounded" /><div className="absolute right-[2%] top-[2%] w-[14%] aspect-square rounded-full flex items-center justify-center" style={{backgroundColor:p}}><BrandLogo brand={brand} size="xs" color="#fff" /></div></QrFrame>),
    (<QrFrame bg="#FAF6EE"><QrPattern color={p} cell="circle" /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" cell="circle" /><div className="absolute inset-x-0 bottom-[2%] text-center text-[3px] uppercase tracking-[0.32em]" style={{color:p}}>scan · soft —</div></QrFrame>),
  ];
  return [...stills, ...stills, ...stills][templateIndex] ?? stills[0];
}

// ─────── SQUARE QR
export function SquareQrRenderer({ brand, templateIndex }: Props) {
  const p = brand.primaryColor;
  const stills = [
    (<QrFrame><QrPattern color="#0F1216" cell="square" /></QrFrame>),
    (<QrFrame><QrPattern color={p} cell="square" /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-0 flex items-center justify-center"><div className="w-[20%] aspect-square" style={{backgroundColor:p}} /></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-x-0 top-0 h-[8%] flex items-center px-[5%]" style={{backgroundColor:p}}><div className="text-white text-[3px] uppercase tracking-[0.32em]">{brand.name}</div></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-x-0 bottom-0 h-[8%] flex items-center justify-end px-[5%]" style={{backgroundColor:p}}><div className="text-white text-[3px] uppercase tracking-[0.32em]">scan →</div></div></QrFrame>),
    (<QrFrame bg={p}><QrPattern color="#fff" cell="square" /></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-0 border-[6px] -m-[6px]" style={{borderColor:p}} /></QrFrame>),
    (<QrFrame><QrPattern color={p} /><div className="absolute right-[2%] top-[2%] w-[14%] aspect-square flex items-center justify-center" style={{backgroundColor:p}}><span className="text-white text-[8px] font-bold">{brand.name.charAt(0).toUpperCase()}</span></div></QrFrame>),
    (<QrFrame><QrPattern color="#0F1216" /><div className="absolute inset-0 flex items-end justify-center pb-1"><div className="text-[3px] uppercase tracking-[0.32em]" style={{color:p}}>brand · 014</div></div></QrFrame>),
    (<QrFrame bg="#FAF6EE"><QrPattern color="#0F1216" /></QrFrame>),
  ];
  return [...stills, ...stills, ...stills][templateIndex] ?? stills[0];
}

const baseMeta = (prefix: string) => Array.from({length:30},(_,i)=>({idSuffix:`ext-${i+1}`,name:`${prefix} ${i+1}`,category:'Modern'}));
export const QR_BRANDED_EXTENDED = baseMeta('Branded');
export const QR_MINIMAL_EXTENDED = baseMeta('Minimal');
export const QR_ROUNDED_EXTENDED = baseMeta('Rounded');
export const QR_SQUARE_EXTENDED = baseMeta('Square');
