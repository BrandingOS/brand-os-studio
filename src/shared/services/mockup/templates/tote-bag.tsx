import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const ToteBag: MockupTemplate['render'] = ({ ctx }) => {
  const W = 320;
  const H = 360;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#F5F2EB" />
      {/* Handles */}
      <path d="M 100 80 C 100 40, 150 20, 160 80" stroke="#D6D1C4" strokeWidth={6} fill="none" />
      <path d="M 220 80 C 220 40, 170 20, 160 80" stroke="#D6D1C4" strokeWidth={6} fill="none" />
      {/* Bag body */}
      <rect x={70} y={80} width={180} height={240} rx={4} fill="#EDE8DA" />
      <rect x={70} y={80} width={180} height={4} fill="#D6D1C4" />
      {/* Logo on the bag */}
      <LogoSlot ctx={ctx} x={110} y={150} width={100} height={80} />
      <text
        x={W / 2}
        y={260}
        textAnchor="middle"
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={14}
        fontWeight={700}
        fill={ctx.primaryColor}
      >
        {ctx.brandName.toUpperCase()}
      </text>
    </svg>
  );
};

export const toteBag: MockupTemplate = {
  id: 'tote-bag',
  label: 'Tote bag',
  category: 'physical',
  aspect: '8:9',
  render: ToteBag,
};
