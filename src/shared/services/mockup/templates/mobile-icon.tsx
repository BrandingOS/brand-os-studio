import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const MobileIcon: MockupTemplate['render'] = ({ ctx }) => {
  const W = 400;
  const H = 400;
  // Phone bezel with home screen + app icon highlighted.
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="#E5E8ED" />
      <rect x={120} y={20} width={160} height={360} rx={32} fill="#1C1F26" />
      <rect x={128} y={28} width={144} height={344} rx={26} fill={ctx.primaryColor} />
      {/* Status bar */}
      <text x={144} y={50} fontFamily={ctx.fontFamily} fontSize={9} fill="#ffffff" opacity={0.7}>9:41</text>
      {/* Grid of placeholder apps */}
      {Array.from({ length: 12 }).map((_, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 140 + col * 40;
        const y = 70 + row * 40;
        const isBrand = i === 4;
        if (isBrand) {
          return (
            <g key={i}>
              <rect x={x} y={y} width={32} height={32} rx={7} fill="#ffffff" />
              <LogoSlot ctx={ctx} x={x + 4} y={y + 4} width={24} height={24} />
            </g>
          );
        }
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={32}
            height={32}
            rx={7}
            fill="#ffffff"
            opacity={0.14 + ((i * 7) % 5) * 0.04}
          />
        );
      })}
      {/* Home indicator */}
      <rect x={170} y={360} width={60} height={4} rx={2} fill="#ffffff" opacity={0.4} />
    </svg>
  );
};

export const mobileIcon: MockupTemplate = {
  id: 'mobile-icon',
  label: 'Mobile app icon',
  category: 'digital',
  aspect: '1:1',
  render: MobileIcon,
};
