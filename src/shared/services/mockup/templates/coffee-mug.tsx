import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const CoffeeMug: MockupTemplate['render'] = ({ ctx }) => {
  const W = 400;
  const H = 320;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#F2EFE8" />
      {/* Mug body */}
      <rect x={100} y={80} width={180} height={200} rx={14} fill="#ffffff" stroke="#E5E7EB" strokeWidth={2} />
      {/* Handle */}
      <path
        d="M 280 140 C 340 140 340 220 280 220"
        stroke="#E5E7EB"
        strokeWidth={14}
        fill="none"
        strokeLinecap="round"
      />
      {/* Top rim ellipse */}
      <ellipse cx={190} cy={80} rx={90} ry={10} fill="#ffffff" stroke="#E5E7EB" strokeWidth={2} />
      <ellipse cx={190} cy={80} rx={84} ry={6} fill="#6B4E31" />
      {/* Logo on the side */}
      <LogoSlot ctx={ctx} x={140} y={140} width={100} height={80} />
      {/* Base shadow */}
      <ellipse cx={190} cy={290} rx={100} ry={6} fill="#D1CFC6" />
    </svg>
  );
};

export const coffeeMug: MockupTemplate = {
  id: 'coffee-mug',
  label: 'Coffee mug',
  category: 'physical',
  aspect: '5:4',
  render: CoffeeMug,
};
