import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const LaptopSticker: MockupTemplate['render'] = ({ ctx }) => {
  const W = 480;
  const H = 320;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#E5E5E5" />
      {/* Laptop lid */}
      <rect x={60} y={40} width={W - 120} height={220} rx={8} fill="#BDC0C7" />
      <rect x={70} y={50} width={W - 140} height={200} rx={4} fill="#D1D5DB" />
      {/* Apple-style notch */}
      <circle cx={W / 2} cy={56} r={4} fill="#9CA3AF" />
      {/* Sticker — centered upper right */}
      <g transform={`translate(${W * 0.62} ${H * 0.35}) rotate(-6)`}>
        <rect x={-50} y={-28} width={100} height={56} rx={10} fill="#ffffff" stroke="#E5E7EB" />
        <LogoSlot ctx={ctx} x={-36} y={-18} width={30} height={36} />
        <text x={-6} y={6} fontFamily={ctx.displayFontFamily ?? ctx.fontFamily} fontSize={14} fontWeight={700} fill={ctx.primaryColor}>
          {ctx.brandName.slice(0, 10)}
        </text>
      </g>
      {/* Base wedge */}
      <polygon points={`${30},${260} ${W - 30},${260} ${W - 50},${280} ${50},${280}`} fill="#A5A9B1" />
      <rect x={50} y={280} width={W - 100} height={8} rx={2} fill="#8B8F97" />
    </svg>
  );
};

export const laptopSticker: MockupTemplate = {
  id: 'laptop-sticker',
  label: 'Laptop sticker',
  category: 'physical',
  aspect: '3:2',
  render: LaptopSticker,
};
