import type { MockupTemplate } from '../types';
import { LogoSlot } from '../shared';

const InstagramStory: MockupTemplate['render'] = ({ ctx }) => {
  const W = 240;
  const H = 426; // 9:16 normalized
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="story-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ctx.primaryColor} />
          <stop offset="1" stopColor={ctx.secondaryColor} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#story-bg)" />
      <LogoSlot ctx={ctx} x={20} y={22} width={56} height={26} fill="#ffffff" />
      <text
        x={20}
        y={180}
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={24}
        fontWeight={700}
        fill="#ffffff"
      >
        Your brand.
      </text>
      <text
        x={20}
        y={210}
        fontFamily={ctx.displayFontFamily ?? ctx.fontFamily}
        fontSize={24}
        fontWeight={700}
        fill="#ffffff"
      >
        Your story.
      </text>
      <rect x={20} y={300} width={100} height={30} rx={15} fill="#ffffff" />
      <text x={38} y={320} fontFamily={ctx.fontFamily} fontSize={11} fontWeight={600} fill={ctx.primaryColor}>
        Get started →
      </text>
      <text x={20} y={402} fontFamily={ctx.fontFamily} fontSize={9} fill="#ffffff" opacity={0.7}>
        @{ctx.brandName.toLowerCase().replace(/\s+/g, '')}
      </text>
    </svg>
  );
};

export const instagramStory: MockupTemplate = {
  id: 'instagram-story',
  label: 'Instagram story',
  category: 'social',
  aspect: '9:16',
  render: InstagramStory,
};
