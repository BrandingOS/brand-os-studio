import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const BusinessCard: MockupTemplate['render'] = ({ ctx }) => {
  const W = 400;
  const H = 240;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="bc-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="4" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.2" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width={W} height={H} fill="#EEF2F6" />
      <g filter="url(#bc-shadow)">
        <rect x={40} y={28} width={W - 80} height={H - 56} rx={6} fill="#ffffff" />
      </g>
      <LogoSlot ctx={ctx} x={60} y={48} width={60} height={36} />
      <text x={60} y={150} fontFamily={ctx.displayFontFamily ?? ctx.fontFamily} fontSize={18} fontWeight={700} fill="#111">
        {ctx.brandName}
      </text>
      <text x={60} y={172} fontFamily={ctx.fontFamily} fontSize={11} fill={ctx.primaryColor}>
        {ctx.tagline || 'Founder & CEO'}
      </text>
      <text x={60} y={198} fontFamily={ctx.fontFamily} fontSize={9} fill="#666">
        hello@{ctx.brandName.toLowerCase().replace(/\s+/g, '')}.com
      </text>
      <rect x={60} y={210} width={W - 120} height={2} fill={ctx.primaryColor} />
    </svg>
  );
};

export const businessCard: MockupTemplate = {
  id: 'business-card',
  label: 'Business card',
  category: 'print',
  aspect: '400:240',
  render: BusinessCard,
};
