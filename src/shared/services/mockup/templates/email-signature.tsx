import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const EmailSignature: MockupTemplate['render'] = ({ ctx }) => {
  const W = 480;
  const H = 280;
  const domain = ctx.brandName.toLowerCase().replace(/\s+/g, '');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#F4F6F9" />
      {/* Email window chrome */}
      <rect x={20} y={20} width={W - 40} height={H - 40} rx={8} fill="#ffffff" />
      <rect x={20} y={20} width={W - 40} height={28} rx={8} fill="#ECEEF1" />
      <circle cx={36} cy={34} r={4} fill="#E24B4A" />
      <circle cx={50} cy={34} r={4} fill="#EF9F27" />
      <circle cx={64} cy={34} r={4} fill="#1D9E75" />
      {/* Body */}
      <text x={40} y={80} fontFamily={ctx.fontFamily} fontSize={11} fill="#9CA3AF">Thanks,</text>
      {/* Signature card */}
      <rect x={40} y={110} width={W - 80} height={120} rx={6} fill={ctx.primaryColor} opacity={0.06} />
      <rect x={40} y={110} width={4} height={120} fill={ctx.primaryColor} />
      <LogoSlot ctx={ctx} x={60} y={130} width={52} height={52} />
      <text x={130} y={148} fontFamily={ctx.displayFontFamily ?? ctx.fontFamily} fontSize={14} fontWeight={700} fill="#111">
        Jamie Rivera
      </text>
      <text x={130} y={166} fontFamily={ctx.fontFamily} fontSize={11} fill={ctx.primaryColor}>
        Head of Product · {ctx.brandName}
      </text>
      <text x={130} y={188} fontFamily={ctx.fontFamily} fontSize={10} fill="#6B7280">
        jamie@{domain}.com · {domain}.com
      </text>
      <text x={130} y={210} fontFamily={ctx.fontFamily} fontSize={9} fill="#9CA3AF">
        {ctx.tagline || 'Your company, elevated.'}
      </text>
    </svg>
  );
};

export const emailSignature: MockupTemplate = {
  id: 'email-signature',
  label: 'Email signature',
  category: 'digital',
  aspect: '12:7',
  render: EmailSignature,
};
