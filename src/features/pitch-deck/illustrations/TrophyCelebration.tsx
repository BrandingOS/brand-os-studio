/**
 * Large trophy with confetti burst — celebratory, success-oriented.
 * Use for "outcomes / achievement / milestone" beats.
 */

import { PAL, type IllustrationProps } from './types';

export function TrophyCelebration({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Trophy with confetti burst"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.navy} />}

      {/* radiating sun-burst behind trophy */}
      <g opacity="0.32">
        <path d="M 400 420 L 380 100" stroke={PAL.green} strokeWidth="20" strokeLinecap="round" />
        <path d="M 400 420 L 460 110" stroke={PAL.green} strokeWidth="14" strokeLinecap="round" />
        <path d="M 400 420 L 240 140" stroke={PAL.green} strokeWidth="14" strokeLinecap="round" />
        <path d="M 400 420 L 580 160" stroke={PAL.green} strokeWidth="14" strokeLinecap="round" />
        <path d="M 400 420 L 140 280" stroke={PAL.green} strokeWidth="14" strokeLinecap="round" />
        <path d="M 400 420 L 660 280" stroke={PAL.green} strokeWidth="14" strokeLinecap="round" />
      </g>

      {/* circular halo */}
      <circle cx="400" cy="420" r="220" fill="rgba(104,190,105,0.10)" />

      {/* trophy */}
      <g transform="translate(280, 240)">
        {/* base bottom plate */}
        <rect x="20" y="380" width="200" height="22" rx="6" fill={PAL.orangeDeep} />
        {/* base column */}
        <rect x="80" y="320" width="80" height="68" rx="4" fill={PAL.orangeDeep} />
        {/* lower platform */}
        <rect x="60" y="306" width="120" height="22" rx="4" fill={PAL.orange} stroke={PAL.orangeDeep} strokeWidth="3" />
        {/* cup body */}
        <path
          d="M 30 30 L 210 30 L 198 220 Q 120 240 42 220 Z"
          fill={PAL.orange}
          stroke={PAL.orangeDeep}
          strokeWidth="5"
        />
        {/* rim */}
        <rect x="20" y="20" width="200" height="20" rx="4" fill={PAL.orange} stroke={PAL.orangeDeep} strokeWidth="5" />
        {/* left handle */}
        <path d="M 30 50 q -50 20 -38 70 q 12 38 40 36" fill="none" stroke={PAL.orangeDeep} strokeWidth="10" strokeLinecap="round" />
        {/* right handle */}
        <path d="M 210 50 q 50 20 38 70 q -12 38 -40 36" fill="none" stroke={PAL.orangeDeep} strokeWidth="10" strokeLinecap="round" />
        {/* star on cup */}
        <polygon points="120,90 134,128 174,128 142,150 154,190 120,166 86,190 98,150 66,128 106,128"
          fill={PAL.navy} />
        <polygon points="120,98 130,128 162,128 138,146 146,178 120,158 94,178 102,146 78,128 110,128"
          fill={PAL.yellow} />
      </g>

      {/* confetti burst */}
      <polygon points="160,160 178,176 144,180" fill={PAL.green} />
      <polygon points="640,140 660,156 622,160" fill={PAL.yellow} />
      <rect x="200" y="280" width="14" height="14" transform="rotate(20 207 287)" fill={PAL.purple} />
      <rect x="600" y="300" width="14" height="14" transform="rotate(-15 607 307)" fill={PAL.blue} />
      <circle cx="140" cy="380" r="7" fill={PAL.red} />
      <circle cx="660" cy="420" r="7" fill={PAL.purple} />
      <path d="M 200 500 q 14 -16 30 0 t 30 0" stroke={PAL.green} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M 540 500 q 14 -16 30 0 t 30 0" stroke={PAL.yellow} strokeWidth="5" fill="none" strokeLinecap="round" />
      <polygon points="120,580 138,594 110,602" fill={PAL.blue} />
      <polygon points="680,580 700,594 670,602" fill={PAL.green} />
      <circle cx="220" cy="700" r="5" fill={PAL.yellow} />
      <circle cx="580" cy="700" r="5" fill={PAL.red} />
      <rect x="380" y="700" width="10" height="10" transform="rotate(35 385 705)" fill={PAL.white} />
    </svg>
  );
}
