import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const Tshirt: MockupTemplate['render'] = ({ ctx }) => {
  const W = 400;
  const H = 400;
  // Stylized T-shirt silhouette.
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#F6F4EF" />
      <path
        d="M 120 110 L 160 80 Q 200 60 240 80 L 280 110 L 320 140 L 300 180 L 280 165 L 280 340 Q 200 360 120 340 L 120 165 L 100 180 L 80 140 Z"
        fill="#ffffff"
        stroke="#E5E7EB"
        strokeWidth={2}
      />
      <path d="M 180 90 Q 200 105 220 90 L 225 110 Q 200 130 175 110 Z" fill="#ffffff" stroke="#E5E7EB" />
      <LogoSlot ctx={ctx} x={170} y={190} width={60} height={60} />
    </svg>
  );
};

export const tshirt: MockupTemplate = {
  id: 'tshirt',
  label: 'T-shirt',
  category: 'physical',
  aspect: '1:1',
  render: Tshirt,
};
