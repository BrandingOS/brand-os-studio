/**
 * Signature archetype — generative slides.
 *
 * The "wow moment" of the deck. Every variant is procedurally composed
 * from the brand's palette + a deterministic seed, so the same brand
 * always gets the same artwork while different brands get visually
 * distinct pieces.
 *
 *   A — Tessellation: rotated squares, quarter-arcs, circles, lines.
 *   B — Radial: concentric rings with colored swatch bursts on a
 *       darkened brand backdrop.
 *   C — Glyph wall: brand initial repeated in a tilted grid, mixing
 *       solid + outline + colored fills.
 *   D — Flow field: layered wavy ribbons sweeping across the slide.
 *
 * All variants share the same chrome (eyebrow top-left, logomark
 * top-right, headline + seed credit at the bottom) so the deck reads
 * as one system.
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

/* ─────────────────────────  shared chrome  ─────────────────────── */

function SignatureChrome({
  profile,
  ink,
  bg,
  variantLabel,
  headline,
}: {
  profile: BrandProfile;
  ink: string;
  bg: string;
  variantLabel: string;
  headline: string;
}) {
  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 96,
          right: 96,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          zIndex: 2,
        }}
      >
        <Body
          profile={profile}
          size={14}
          color={ink}
          style={{ letterSpacing: '0.28em', textTransform: 'uppercase', opacity: 0.9 }}
        >
          · §06 Signature · {variantLabel}
        </Body>
        <LogoMark profile={profile} variant="white" height={34} color={ink} />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 96,
          right: 96,
          bottom: 80,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'end',
          zIndex: 2,
        }}
      >
        <Display
          profile={profile}
          size={94}
          weight={900}
          color={ink}
          style={{
            letterSpacing: '-0.035em',
            maxWidth: 1200,
            textShadow: `0 2px 24px ${shiftLightness(bg, -0.3)}, 0 0 6px ${shiftLightness(bg, -0.25)}`,
          }}
        >
          {headline}
        </Display>
        <Body
          profile={profile}
          size={14}
          color={ink}
          style={{
            textAlign: 'right',
            opacity: 0.9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            lineHeight: 1.7,
          }}
        >
          Seed · {profile.id.slice(0, 8)}
          <br />Generative artwork
          <br />© {new Date().getFullYear()}
        </Body>
      </div>
    </>
  );
}

function getSwatches(profile: BrandProfile): string[] {
  const list = profile.palette.swatches.slice(0, 4).map((s) => s.hex);
  if (list.length < 2) list.push(profile.palette.ink);
  return list;
}

/* ─────────────────────────  variant A — tessellation  ─────────────────────── */

export function SignatureA({ index, profile }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  const swatches = getSwatches(profile);
  const rand = seedRandom(profile.id + profile.name);

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
        const dir = Math.floor(rand() * 4);
        const paths = [
          `M ${x} ${y + size} A ${size} ${size} 0 0 1 ${x + size} ${y}`,
          `M ${x} ${y} A ${size} ${size} 0 0 0 ${x + size} ${y + size}`,
          `M ${x + size} ${y + size} A ${size} ${size} 0 0 0 ${x} ${y}`,
          `M ${x + size} ${y} A ${size} ${size} 0 0 1 ${x} ${y + size}`,
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
    }
  }

  return (
    <SlideFrame index={index} archetype="signature" variant="A" background={bg} ink={ink}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${shiftLightness(bg, -0.08)} 0%, ${bg} 60%)`,
        }}
      />
      <svg
        viewBox="0 0 1920 1080"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          mixBlendMode: 'multiply',
        }}
      >
        {tiles}
      </svg>
      <SignatureChrome
        profile={profile}
        ink={ink}
        bg={bg}
        variantLabel="Tessellation"
        headline={`A pattern only ${profile.name} could wear.`}
      />
    </SlideFrame>
  );
}

/* ─────────────────────────  variant B — radial bursts  ─────────────────────── */

export function SignatureB({ index, profile }: Props) {
  const bg = shiftLightness(profile.palette.primary, -0.18);
  const ink = inkOn(bg);
  const swatches = getSwatches(profile);
  const rand = seedRandom(profile.id + profile.name + 'B');

  const cx = 960;
  const cy = 540;
  const rings: JSX.Element[] = [];
  const ringCount = 22;
  for (let i = ringCount; i > 0; i--) {
    const r = 60 + i * 36 + rand() * 12;
    const colorIdx = Math.floor(rand() * swatches.length);
    rings.push(
      <circle
        key={`ring-${i}`}
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={swatches[colorIdx]}
        strokeWidth={Math.max(2, Math.floor(rand() * 6) + 2)}
        opacity={0.18 + rand() * 0.4}
      />,
    );
  }

  const burstCount = 28;
  const bursts: JSX.Element[] = [];
  for (let i = 0; i < burstCount; i++) {
    const angle = (i / burstCount) * Math.PI * 2 + rand() * 0.18;
    const dist = 320 + rand() * 540;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = 18 + rand() * 56;
    const colorIdx = Math.floor(rand() * swatches.length);
    bursts.push(
      <circle
        key={`burst-${i}`}
        cx={x}
        cy={y}
        r={r}
        fill={swatches[colorIdx]}
        opacity={0.78}
      />,
    );
  }

  // Center solid disk to anchor the eye
  const anchor = (
    <circle key="anchor" cx={cx} cy={cy} r={120} fill={profile.palette.primary} />
  );

  return (
    <SlideFrame index={index} archetype="signature" variant="B" background={bg} ink={ink}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 55%, ${shiftLightness(bg, 0.06)} 0%, ${bg} 70%)`,
        }}
      />
      <svg
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {rings}
        {bursts}
        {anchor}
      </svg>
      <SignatureChrome
        profile={profile}
        ink={ink}
        bg={bg}
        variantLabel="Radial"
        headline={`Energy radiates from ${profile.name}.`}
      />
    </SlideFrame>
  );
}

/* ─────────────────────────  variant C — glyph wall  ─────────────────────── */

export function SignatureC({ index, profile }: Props) {
  const bg = profile.palette.primary;
  const ink = inkOn(bg);
  const swatches = getSwatches(profile);
  const family = profile.typography.headingFamily;
  const rand = seedRandom(profile.id + profile.name + 'C');
  const initial = (profile.name.trim().charAt(0) || 'B').toUpperCase();

  const cols = 8;
  const rows = 5;
  const cellW = 1920 / cols;
  const cellH = 1080 / rows;

  const glyphs: JSX.Element[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cx = (c + 0.5) * cellW + (rand() - 0.5) * 40;
      const cy = (r + 0.5) * cellH + (rand() - 0.5) * 40;
      const rot = (rand() - 0.5) * 22;
      const size = 160 + rand() * 80;
      const roll = rand();
      const colorIdx = Math.floor(rand() * swatches.length);
      const color = swatches[colorIdx];
      const fill = roll < 0.55 ? color : 'transparent';
      const stroke = roll < 0.55 ? 'none' : color;
      glyphs.push(
        <text
          key={`g-${r}-${c}`}
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily={family}
          fontWeight={900}
          fontSize={size}
          fill={fill}
          stroke={stroke}
          strokeWidth={stroke === 'none' ? 0 : 4}
          opacity={0.85}
          transform={`rotate(${rot} ${cx} ${cy})`}
          style={{ letterSpacing: '-0.04em' }}
        >
          {initial}
        </text>,
      );
    }
  }

  return (
    <SlideFrame index={index} archetype="signature" variant="C" background={bg} ink={ink}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, ${shiftLightness(bg, -0.05)} 0%, ${bg} 50%, ${shiftLightness(bg, 0.04)} 100%)`,
        }}
      />
      <svg
        viewBox="0 0 1920 1080"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          mixBlendMode: 'screen',
        }}
      >
        {glyphs}
      </svg>
      <SignatureChrome
        profile={profile}
        ink={ink}
        bg={bg}
        variantLabel="Glyph Wall"
        headline={`The mark of ${profile.name}, repeated and remembered.`}
      />
    </SlideFrame>
  );
}

/* ─────────────────────────  variant D — flow field  ─────────────────────── */

export function SignatureD({ index, profile }: Props) {
  const bg = shiftLightness(profile.palette.primary, -0.1);
  const ink = inkOn(bg);
  const swatches = getSwatches(profile);
  const rand = seedRandom(profile.id + profile.name + 'D');

  const ribbons: JSX.Element[] = [];
  const ribbonCount = 14;
  for (let i = 0; i < ribbonCount; i++) {
    const yBase = 80 + i * (920 / ribbonCount);
    const amp = 50 + rand() * 90;
    const freq = 0.0024 + rand() * 0.0028;
    const phase = rand() * Math.PI * 2;
    const points: string[] = [];
    for (let x = 0; x <= 1920; x += 24) {
      const y = yBase + Math.sin(x * freq + phase) * amp + Math.cos(x * freq * 0.4 + phase) * (amp * 0.4);
      points.push(`${x},${y.toFixed(1)}`);
    }
    const color = swatches[Math.floor(rand() * swatches.length)];
    const stroke = Math.max(3, Math.floor(rand() * 14) + 4);
    ribbons.push(
      <polyline
        key={`ribbon-${i}`}
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.62 + rand() * 0.3}
      />,
    );
  }

  return (
    <SlideFrame index={index} archetype="signature" variant="D" background={bg} ink={ink}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 25% 30%, ${shiftLightness(bg, 0.08)} 0%, ${bg} 60%)`,
        }}
      />
      <svg
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        {ribbons}
      </svg>
      <SignatureChrome
        profile={profile}
        ink={ink}
        bg={bg}
        variantLabel="Flow Field"
        headline={`${profile.name} in motion — a current you can feel.`}
      />
    </SlideFrame>
  );
}
