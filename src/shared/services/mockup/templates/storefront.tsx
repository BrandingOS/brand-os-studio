import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const Storefront: MockupTemplate['render'] = ({ ctx }) => {
  const W = 400;
  const H = 260;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      {/* Sky */}
      <rect width={W} height={H} fill="#E8E5DC" />
      {/* Building facade */}
      <rect x={0} y={80} width={W} height={H - 80} fill="#FAF9F6" />
      <rect x={0} y={76} width={W} height={4} fill="#D6D3C8" />
      {/* Sign panel */}
      <rect x={60} y={40} width={W - 120} height={60} fill={ctx.primaryColor} rx={4} />
      <LogoSlot ctx={ctx} x={90} y={52} width={36} height={36} fill="#ffffff" />
      <text
        x={148}
        y={78}
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={22}
        fontWeight={700}
        fill="#ffffff"
      >
        {ctx.brandName.toUpperCase()}
      </text>
      {/* Door */}
      <rect x={170} y={140} width={60} height={120} fill="#2B2E36" rx={4} />
      <circle cx={220} cy={200} r={2} fill="#E4E4E4" />
      {/* Windows */}
      <rect x={40} y={140} width={110} height={110} fill="#CFE3F5" opacity={0.6} rx={2} />
      <rect x={250} y={140} width={110} height={110} fill="#CFE3F5" opacity={0.6} rx={2} />
      {/* Ground */}
      <rect x={0} y={250} width={W} height={10} fill="#C8C3B5" />
    </svg>
  );
};

export const storefront: MockupTemplate = {
  id: 'storefront',
  label: 'Storefront sign',
  category: 'physical',
  aspect: '400:260',
  render: Storefront,
};
