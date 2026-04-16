import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const Billboard: MockupTemplate['render'] = ({ ctx }) => {
  const W = 480;
  const H = 240;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#C9D2DB" />
      {/* Poles */}
      <rect x={100} y={180} width={6} height={60} fill="#6B7280" />
      <rect x={W - 106} y={180} width={6} height={60} fill="#6B7280" />
      {/* Board backdrop */}
      <rect x={60} y={40} width={W - 120} height={140} rx={4} fill="#2C2F36" />
      <rect x={66} y={46} width={W - 132} height={128} rx={2} fill={ctx.primaryColor} />
      <LogoSlot ctx={ctx} x={90} y={70} width={48} height={48} fill="#ffffff" />
      <text
        x={160}
        y={108}
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={28}
        fontWeight={700}
        fill="#ffffff"
      >
        {ctx.brandName}
      </text>
      <text x={160} y={138} fontFamily={ctx.fontFamily} fontSize={14} fill="#ffffff" opacity={0.75}>
        {ctx.tagline || 'Brand messaging goes here.'}
      </text>
    </svg>
  );
};

export const billboard: MockupTemplate = {
  id: 'billboard',
  label: 'Billboard',
  category: 'physical',
  aspect: '2:1',
  render: Billboard,
};
