/**
 * LayoutGlyph — tiny schematic icon for each v2 layout.
 *
 * Used by `AddSlidePopover` to give each layout card a recognizable
 * visual hint. Each glyph is a 64×36 SVG (16:9) drawn with subtle
 * tokens so it adapts to light/dark theme via Tailwind's
 * `text-foreground` / `text-muted-foreground` (the SVG uses
 * `currentColor`).
 */

import type { LayoutId } from '../types';

const W = 64;
const H = 36;
const STROKE = 1.4;

const wrap: React.CSSProperties = {
  color: 'currentColor',
  width: '70%',
  height: '70%',
};

interface Props {
  layout: LayoutId;
}

export function LayoutGlyph({ layout }: Props) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={wrap}
      fill="none"
      stroke="currentColor"
      strokeWidth={STROKE}
      className="text-muted-foreground/70"
      aria-hidden
    >
      {renderGlyph(layout)}
    </svg>
  );
}

function renderGlyph(layout: LayoutId): React.ReactNode {
  switch (layout) {
    case 'cover':
      return (
        <>
          <rect x={4} y={6} width={36} height={3} rx={1.5} fill="currentColor" />
          <rect x={4} y={13} width={26} height={2} rx={1} fill="currentColor" opacity={0.5} />
          <rect x={44} y={6} width={16} height={24} rx={2} opacity={0.4} />
        </>
      );
    case 'section-divider':
      return (
        <>
          <rect x={2} y={6} width={60} height={24} rx={2} fill="currentColor" opacity={0.12} />
          <rect x={14} y={14} width={36} height={4} rx={2} fill="currentColor" />
          <rect x={20} y={22} width={24} height={2} rx={1} fill="currentColor" opacity={0.5} />
        </>
      );
    case 'title-body':
      return (
        <>
          <rect x={10} y={8} width={44} height={3.5} rx={1.5} fill="currentColor" />
          <rect x={10} y={16} width={44} height={1.5} rx={0.75} fill="currentColor" opacity={0.4} />
          <rect x={10} y={20} width={44} height={1.5} rx={0.75} fill="currentColor" opacity={0.4} />
          <rect x={10} y={24} width={32} height={1.5} rx={0.75} fill="currentColor" opacity={0.4} />
        </>
      );
    case 'bullets':
      return (
        <>
          <rect x={6} y={6} width={28} height={3} rx={1.5} fill="currentColor" />
          <circle cx={8} cy={16} r={1.2} fill="currentColor" />
          <rect x={12} y={15} width={28} height={1.5} rx={0.75} fill="currentColor" opacity={0.5} />
          <circle cx={8} cy={22} r={1.2} fill="currentColor" />
          <rect x={12} y={21} width={32} height={1.5} rx={0.75} fill="currentColor" opacity={0.5} />
          <circle cx={8} cy={28} r={1.2} fill="currentColor" />
          <rect x={12} y={27} width={24} height={1.5} rx={0.75} fill="currentColor" opacity={0.5} />
        </>
      );
    case 'two-column':
      return (
        <>
          <rect x={6} y={8} width={24} height={20} rx={1.5} opacity={0.45} />
          <rect x={34} y={8} width={24} height={20} rx={1.5} opacity={0.45} />
          <rect x={9} y={11} width={14} height={2} rx={1} fill="currentColor" />
          <rect x={37} y={11} width={14} height={2} rx={1} fill="currentColor" />
          <rect x={9} y={16} width={18} height={1.2} rx={0.6} fill="currentColor" opacity={0.4} />
          <rect x={37} y={16} width={18} height={1.2} rx={0.6} fill="currentColor" opacity={0.4} />
        </>
      );
    case 'image-text':
      return (
        <>
          <rect x={4} y={6} width={28} height={24} rx={2} fill="currentColor" opacity={0.18} />
          <path d="M6 24 L14 18 L20 22 L30 14" opacity={0.5} />
          <rect x={36} y={8} width={24} height={3} rx={1.5} fill="currentColor" />
          <rect x={36} y={15} width={22} height={1.4} rx={0.7} fill="currentColor" opacity={0.5} />
          <rect x={36} y={19} width={22} height={1.4} rx={0.7} fill="currentColor" opacity={0.5} />
          <rect x={36} y={25} width={14} height={2.5} rx={1.25} fill="currentColor" opacity={0.7} />
        </>
      );
    case 'quote':
      return (
        <>
          <text x={8} y={18} fontSize={14} fill="currentColor" opacity={0.5} fontFamily="serif">“</text>
          <rect x={16} y={10} width={42} height={2.2} rx={1} fill="currentColor" />
          <rect x={16} y={15} width={38} height={2.2} rx={1} fill="currentColor" />
          <rect x={16} y={20} width={28} height={2.2} rx={1} fill="currentColor" />
          <circle cx={20} cy={28} r={2} opacity={0.5} />
          <rect x={24} y={27} width={20} height={1.2} rx={0.6} fill="currentColor" opacity={0.4} />
        </>
      );
    case 'stats-3':
      return (
        <>
          <rect x={4} y={10} width={16} height={18} rx={1.5} opacity={0.4} />
          <rect x={24} y={10} width={16} height={18} rx={1.5} opacity={0.4} />
          <rect x={44} y={10} width={16} height={18} rx={1.5} opacity={0.4} />
          <rect x={7} y={14} width={10} height={4} rx={0.5} fill="currentColor" />
          <rect x={27} y={14} width={10} height={4} rx={0.5} fill="currentColor" />
          <rect x={47} y={14} width={10} height={4} rx={0.5} fill="currentColor" />
          <rect x={7} y={21} width={10} height={1.4} rx={0.7} fill="currentColor" opacity={0.5} />
          <rect x={27} y={21} width={10} height={1.4} rx={0.7} fill="currentColor" opacity={0.5} />
          <rect x={47} y={21} width={10} height={1.4} rx={0.7} fill="currentColor" opacity={0.5} />
        </>
      );
    case 'stats-grid':
      return (
        <>
          {[0, 1, 2, 3].map((i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            return (
              <rect
                key={i}
                x={6 + col * 28}
                y={6 + row * 13}
                width={24}
                height={11}
                rx={1.5}
                opacity={0.4}
              />
            );
          })}
          {[0, 1, 2, 3].map((i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            return (
              <rect
                key={`v${i}`}
                x={9 + col * 28}
                y={9 + row * 13}
                width={8}
                height={3}
                rx={0.5}
                fill="currentColor"
              />
            );
          })}
        </>
      );
    case 'team-grid':
      return (
        <>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${4 + i * 20}, 8)`}>
              <circle cx={8} cy={8} r={5} opacity={0.45} />
              <rect x={2} y={16} width={12} height={1.5} rx={0.75} fill="currentColor" />
              <rect x={4} y={20} width={8} height={1.2} rx={0.6} fill="currentColor" opacity={0.5} />
            </g>
          ))}
        </>
      );
    case 'process':
      return (
        <>
          <circle cx={10} cy={18} r={3} opacity={0.5} />
          <text x={8.5} y={20} fontSize={4} fill="currentColor">1</text>
          <line x1={14} y1={18} x2={28} y2={18} opacity={0.4} strokeDasharray="2 2" />
          <circle cx={32} cy={18} r={3} opacity={0.5} />
          <text x={30.5} y={20} fontSize={4} fill="currentColor">2</text>
          <line x1={36} y1={18} x2={50} y2={18} opacity={0.4} strokeDasharray="2 2" />
          <circle cx={54} cy={18} r={3} opacity={0.5} />
          <text x={52.5} y={20} fontSize={4} fill="currentColor">3</text>
        </>
      );
    case 'comparison':
      return (
        <>
          <rect x={4} y={6} width={26} height={24} rx={1.5} opacity={0.4} />
          <rect x={34} y={6} width={26} height={24} rx={1.5} opacity={0.4} />
          <rect x={7} y={9} width={10} height={2} rx={1} fill="currentColor" />
          <rect x={37} y={9} width={10} height={2} rx={1} fill="currentColor" />
          <line x1={32} y1={12} x2={32} y2={24} opacity={0.5} />
          <text x={30} y={22} fontSize={5} fill="currentColor" opacity={0.7}>vs</text>
        </>
      );
    case 'gallery':
      return (
        <>
          {[0, 1, 2, 3].map((i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            return (
              <g key={i}>
                <rect
                  x={6 + col * 28}
                  y={6 + row * 13}
                  width={24}
                  height={11}
                  rx={1.5}
                  opacity={0.35}
                  fill="currentColor"
                />
                <path
                  d={`M${8 + col * 28} ${15 + row * 13} L${14 + col * 28} ${10 + row * 13} L${20 + col * 28} ${13 + row * 13} L${28 + col * 28} ${8 + row * 13}`}
                  opacity={0.5}
                />
              </g>
            );
          })}
        </>
      );
    case 'metrics-hero':
      return (
        <>
          <text
            x={W / 2}
            y={22}
            fontSize={16}
            fill="currentColor"
            textAnchor="middle"
            fontWeight={700}
          >
            42%
          </text>
          <rect x={20} y={26} width={24} height={1.5} rx={0.75} fill="currentColor" opacity={0.5} />
        </>
      );
    case 'cta':
      return (
        <>
          <rect x={10} y={8} width={44} height={3.5} rx={1.5} fill="currentColor" />
          <rect x={14} y={16} width={36} height={1.5} rx={0.75} fill="currentColor" opacity={0.5} />
          <rect x={14} y={24} width={16} height={4} rx={2} fill="currentColor" />
          <rect x={32} y={24} width={16} height={4} rx={2} opacity={0.6} />
        </>
      );
    default:
      return <rect x={6} y={6} width={52} height={24} rx={2} opacity={0.3} />;
  }
}
