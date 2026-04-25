/**
 * Signature archetype — generative slide.
 *
 * The "wow" moment of the deck: a large vector artwork composed by
 * tessellating and rotating decorative shapes, seeded by the brand's
 * signature hash. Every brand gets a unique-looking piece; the same
 * brand always gets the same piece.
 *
 * The slide renders SVG so it exports crisp to PDF and PNG.
 */

import type { BrandProfile, SlideOverrides } from '../types';
import { SlideFrame } from '../SlideFrame';
import { Body, Display, LogoMark } from './shared';
import { inkOn, seedRandom, shiftLightness } from '../utils';

interface Props {
  index: number;
  profile: BrandProfile;
  overrides?: SlideOverrides;
}

export function SignatureA({ index, profile }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  const swatches = profile.palette.swatches.slice(0, 4).map((s) => s.hex);
  if (swatches.length < 2) swatches.push(profile.palette.ink);

  const rand = seedRandom(profile.id + profile.name);

  // Generate tessellation grid — rotated squares and arcs.
  const tiles: JSX.Element[] = [];
  const cols = 14;
  const rows = 8;
  const size = 110;
  const padX = (1920 - cols * size) / 2;
  const padY = (1080 - rows * size) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padX + c * size;
      const y = padY + r * size;
      const roll = rand();
      const colorIdx = Math.floor(rand() * swatches.length);
      const color = swatches[colorIdx];

      if (roll < 0.25) {
        // rotated square
        const rot = Math.floor(rand() * 4) * 90;
        tiles.push(
          <rect
            key={`sq-${r}-${c}`}
            x={x + size * 0.15}
            y={y + size * 0.15}
            width={size * 0.7}
            height={size * 0.7}
            fill={color}
            opacity={0.9}
            transform={`rotate(${rot} ${x + size / 2} ${y + size / 2})`}
          />,
        );
      } else if (roll < 0.5) {
        // quarter arc
        const dir = Math.floor(rand() * 4);
        const paths = [
          `M ${x} ${y + size} A ${size} ${size} 0 0 1 ${x + size} ${y}`, // top-right
          `M ${x} ${y} A ${size} ${size} 0 0 0 ${x + size} ${y + size}`, // bottom-right
          `M ${x + size} ${y + size} A ${size} ${size} 0 0 0 ${x} ${y}`, // top-left
          `M ${x + size} ${y} A ${size} ${size} 0 0 1 ${x} ${y + size}`, // bottom-left
        ];
        tiles.push(
          <path
            key={`arc-${r}-${c}`}
            d={paths[dir]}
            fill="none"
            stroke={color}
            strokeWidth={Math.max(6, Math.floor(rand() * 22))}
            strokeLinecap="round"
            opacity={0.95}
          />,
        );
      } else if (roll < 0.68) {
        // circle
        const radius = size * (0.2 + rand() * 0.25);
        tiles.push(
          <circle
            key={`c-${r}-${c}`}
            cx={x + size / 2}
            cy={y + size / 2}
            r={radius}
            fill={color}
            opacity={0.9}
          />,
        );
      } else if (roll < 0.78) {
        // diagonal line
        const swap = rand() > 0.5;
        tiles.push(
          <line
            key={`l-${r}-${c}`}
            x1={x + (swap ? size : 0)}
            y1={y}
            x2={x + (swap ? 0 : size)}
            y2={y + size}
            stroke={color}
            strokeWidth={Math.max(4, Math.floor(rand() * 14))}
            opacity={0.9}
          />,
        );
      }
      // else: empty space for rhythm
    }
  }

  return (
    <SlideFrame index={index} archetype="signature" variant="A" background={bg} ink={ink}>
      {/* subtle ink halo */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 50%, ${shiftLightness(bg, -0.08)} 0%, ${bg} 60%)` }} />
      {/* generative art */}
      <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', mixBlendMode: 'multiply' }}>
        {tiles}
      </svg>
      {/* overlay title */}
      <div style={{ position: 'absolute', top: 80, left: 96, right: 96, display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <Body profile={profile} size={14} color={ink} style={{ letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.9 }}>
          · §06 Signature · Generative
        </Body>
        <LogoMark profile={profile} variant="white" height={34} color={ink} />
      </div>
      <div style={{ position: 'absolute', left: 96, right: 96, bottom: 80, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
        <Display
          profile={profile}
          size={94}
          weight={900}
          color={ink}
          style={{
            letterSpacing: '-0.035em',
            maxWidth: 1200,
            // No mixBlendMode here — `difference` of white on the brand
            // primary computes an off-brand teal/cyan (e.g. red#EF4444 →
            // ~#10BBBB) which clashes badly with the brand. Keep ink solid
            // and use a soft shadow for legibility over the busy pattern.
            textShadow: `0 2px 24px ${shiftLightness(bg, -0.3)}, 0 0 6px ${shiftLightness(bg, -0.25)}`,
          }}
        >
          A pattern only {profile.name} could wear.
        </Display>
        <Body profile={profile} size={14} color={ink} style={{ textAlign: 'right', opacity: 0.9, letterSpacing: '0.18em', textTransform: 'uppercase', lineHeight: 1.7 }}>
          Seed · {profile.id.slice(0, 8)}
          <br />Generative artwork
          <br />© {new Date().getFullYear()}
        </Body>
      </div>
    </SlideFrame>
  );
}
