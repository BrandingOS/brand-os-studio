/**
 * Graduation cap mid-toss with confetti and star burst.
 * Use for "milestone / graduation / completion" beats.
 */

import { PAL, type IllustrationProps } from './types';

export function GraduationCap({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Graduation cap with confetti"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.paper} />}

      {/* halo */}
      <circle cx="400" cy="400" r="240" fill="rgba(104,190,105,0.10)" />

      {/* radial accent lines */}
      <g opacity="0.45" stroke={PAL.green} strokeWidth="6" strokeLinecap="round" fill="none">
        <line x1="400" y1="120" x2="400" y2="160" />
        <line x1="160" y1="280" x2="200" y2="300" />
        <line x1="640" y1="280" x2="600" y2="300" />
        <line x1="220" y1="170" x2="240" y2="200" />
        <line x1="580" y1="170" x2="560" y2="200" />
      </g>

      {/* graduation cap centerpiece */}
      <g transform="translate(220, 280)">
        {/* base / band */}
        <path
          d="M 60 90 Q 60 120 180 120 Q 300 120 300 90 L 300 60 Q 300 80 180 80 Q 60 80 60 60 Z"
          fill={PAL.navy}
        />
        {/* top mortarboard */}
        <path
          d="M 0 60 L 180 0 L 360 60 L 180 120 Z"
          fill={PAL.navy}
          stroke={PAL.navyDeep}
          strokeWidth="2"
        />
        {/* button on top */}
        <circle cx="180" cy="60" r="10" fill={PAL.green} />
        {/* tassel */}
        <line x1="180" y1="60" x2="240" y2="120" stroke={PAL.green} strokeWidth="4" />
        <path d="M 232 116 L 252 134 L 240 138 L 244 152 L 232 144 L 224 156 L 222 140 L 212 138 Z" fill={PAL.green} />
      </g>

      {/* diploma scroll (bottom-left) */}
      <g transform="translate(140, 560)">
        <rect x="0" y="20" width="120" height="44" rx="8" fill={PAL.white} stroke={PAL.navy} strokeWidth="3" />
        <line x1="14" y1="40" x2="106" y2="40" stroke={PAL.navy} strokeWidth="2" opacity="0.5" />
        <line x1="14" y1="50" x2="80" y2="50" stroke={PAL.navy} strokeWidth="2" opacity="0.5" />
        {/* ribbon */}
        <circle cx="100" cy="68" r="14" fill={PAL.red} />
        <path d="M 88 76 L 80 96 L 92 90 Z" fill={PAL.red} />
        <path d="M 112 76 L 120 96 L 108 90 Z" fill={PAL.red} />
      </g>

      {/* book stack (bottom-right) */}
      <g transform="translate(560, 560)">
        <rect x="0" y="60" width="140" height="20" rx="3" fill={PAL.green} />
        <rect x="14" y="40" width="120" height="20" rx="3" fill={PAL.orange} />
        <rect x="6" y="20" width="130" height="20" rx="3" fill={PAL.purple} />
        <rect x="14" y="0" width="116" height="20" rx="3" fill={PAL.blue} />
      </g>

      {/* star burst around cap */}
      <g>
        <polygon points="180,160 188,178 206,180 192,194 196,212 180,202 164,212 168,194 154,180 172,178" fill={PAL.yellow} />
        <polygon points="640,180 646,194 660,196 650,206 654,220 640,212 626,220 630,206 620,196 634,194" fill={PAL.purple} />
        <polygon points="120,440 128,456 144,460 132,472 136,488 120,478 104,488 108,472 96,460 112,456" fill={PAL.green} />
        <polygon points="700,460 706,474 720,478 710,488 714,502 700,494 686,502 690,488 680,478 694,474" fill={PAL.orange} />
      </g>

      {/* confetti */}
      <polygon points="280,180 290,194 270,194" fill={PAL.purple} />
      <polygon points="540,140 550,154 530,154" fill={PAL.red} />
      <rect x="240" y="490" width="12" height="12" transform="rotate(20 246 496)" fill={PAL.green} />
      <rect x="540" y="510" width="12" height="12" transform="rotate(-15 546 516)" fill={PAL.blue} />
      <circle cx="380" cy="700" r="5" fill={PAL.yellow} />
      <circle cx="440" cy="120" r="4" fill={PAL.green} />
      <path d="M 60 350 q 10 -8 20 0 t 20 0" stroke={PAL.purple} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 700 350 q 10 -8 20 0 t 20 0" stroke={PAL.green} strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
