import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const Letterhead: MockupTemplate['render'] = ({ ctx }) => {
  const W = 320;
  const H = 440;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#ECECEC" />
      <rect x={20} y={20} width={W - 40} height={H - 40} fill="#ffffff" />
      {/* Top accent bar */}
      <rect x={20} y={20} width={W - 40} height={6} fill={ctx.primaryColor} />
      {/* Header */}
      <LogoSlot ctx={ctx} x={40} y={46} width={50} height={30} />
      <text x={W - 40} y={66} textAnchor="end" fontFamily={ctx.displayFontFamily ?? ctx.fontFamily} fontSize={14} fontWeight={700} fill="#111">
        {ctx.brandName}
      </text>
      <text x={W - 40} y={82} textAnchor="end" fontFamily={ctx.fontFamily} fontSize={8} fill="#6B7280">
        {ctx.tagline || 'Est. 2026 · Worldwide'}
      </text>
      {/* Body lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <rect
          key={i}
          x={40}
          y={140 + i * 18}
          width={i === 9 ? (W - 80) * 0.55 : W - 80}
          height={4}
          fill="#E5E7EB"
        />
      ))}
      {/* Signature */}
      <path
        d="M 40 360 q 20 -10 30 0 t 30 0 t 30 -5"
        stroke={ctx.primaryColor}
        strokeWidth={1.5}
        fill="none"
      />
      <rect x={40} y={380} width={80} height={1} fill="#9CA3AF" />
      <text x={40} y={398} fontFamily={ctx.fontFamily} fontSize={8} fill="#6B7280">
        {ctx.brandName} · hello@{ctx.brandName.toLowerCase().replace(/\s+/g, '')}.com
      </text>
    </svg>
  );
};

export const letterhead: MockupTemplate = {
  id: 'letterhead',
  label: 'Letterhead',
  category: 'print',
  aspect: '8:11',
  render: Letterhead,
};
