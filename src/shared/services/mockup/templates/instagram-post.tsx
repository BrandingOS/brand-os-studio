import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const InstagramPost: MockupTemplate['render'] = ({ ctx }) => {
  const W = 400;
  const H = 400;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill={ctx.primaryColor} />
      <LogoSlot ctx={ctx} x={32} y={32} width={56} height={32} fill="#ffffff" />
      <text
        x={32}
        y={190}
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={30}
        fontWeight={700}
        fill="#ffffff"
      >
        Build with
      </text>
      <text
        x={32}
        y={228}
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={30}
        fontWeight={700}
        fill="#ffffff"
      >
        confidence.
      </text>
      <rect x={32} y={260} width={40} height={3} fill={ctx.secondaryColor} />
      <text x={32} y={360} fontFamily={ctx.fontFamily} fontSize={12} fill="#ffffff" opacity={0.75}>
        @{ctx.brandName.toLowerCase().replace(/\s+/g, '')}
      </text>
    </svg>
  );
};

export const instagramPost: MockupTemplate = {
  id: 'instagram-post',
  label: 'Instagram post',
  category: 'social',
  aspect: '1:1',
  render: InstagramPost,
};
