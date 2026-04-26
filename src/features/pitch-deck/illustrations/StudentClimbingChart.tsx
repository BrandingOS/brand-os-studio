/**
 * Character mid-stride climbing a growing bar chart toward a trophy.
 * Mirrors uniex reference #2 (navy bg, character + trophy + confetti)
 * but redrawn as a flat-vector SVG so it scales without raster pixel
 * loss in the deck. Used wherever a "growth / pathway" beat is needed.
 */

import { PAL, type IllustrationProps } from './types';

export function StudentClimbingChart({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Student climbing chart toward trophy"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.navy} />}

      {/* abstract circle background blob */}
      <circle cx="400" cy="430" r="290" fill="rgba(104,190,105,0.06)" />

      {/* squiggle accent (top right) */}
      <path
        d="M 640 130 q 40 -20 60 10 t 30 30 q 20 -10 30 20"
        stroke={PAL.green}
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
      />

      {/* bar chart — four ascending bars */}
      <rect x="270" y="600" width="80" height="100" rx="6" fill={PAL.blue} />
      <rect x="370" y="540" width="80" height="160" rx="6" fill={PAL.blue} />
      <rect x="470" y="460" width="80" height="240" rx="6" fill={PAL.blue} />
      <rect x="570" y="380" width="80" height="320" rx="6" fill={PAL.blue} />

      {/* trophy on top of tallest bar */}
      <g transform="translate(610, 280)">
        <rect x="-2" y="80" width="84" height="14" rx="2" fill={PAL.orangeDeep} />
        <rect x="20" y="60" width="40" height="22" rx="2" fill={PAL.orangeDeep} />
        <path
          d="M 4 0 L 76 0 L 70 64 Q 40 72 10 64 Z"
          fill={PAL.orange}
          stroke={PAL.orangeDeep}
          strokeWidth="3"
        />
        {/* handles */}
        <path d="M 4 8 q -22 8 -16 30 q 4 14 18 14" stroke={PAL.orangeDeep} strokeWidth="4" fill="none" />
        <path d="M 76 8 q 22 8 16 30 q -4 14 -18 14" stroke={PAL.orangeDeep} strokeWidth="4" fill="none" />
        {/* star */}
        <polygon points="40,18 45,30 58,30 48,38 52,50 40,42 28,50 32,38 22,30 35,30" fill={PAL.navy} />
      </g>

      {/* character — climbing onto third bar */}
      <g transform="translate(370, 320)">
        {/* leg back */}
        <path d="M 30 180 L 40 250 L 26 270 L 14 268 L 18 250 L 26 180 Z" fill={PAL.blueDeep} />
        {/* leg front */}
        <path d="M 80 180 L 92 248 L 80 270 L 68 268 L 72 248 L 60 188 Z" fill={PAL.blueDeep} />
        {/* shoes */}
        <ellipse cx="20" cy="270" rx="14" ry="6" fill={PAL.orange} />
        <ellipse cx="78" cy="272" rx="14" ry="6" fill={PAL.orange} />
        {/* torso (jumper) */}
        <path
          d="M 22 70 Q 20 60 30 56 L 90 50 Q 102 54 104 70 L 110 130 Q 100 180 60 180 Q 22 180 14 130 Z"
          fill={PAL.orange}
        />
        {/* collar */}
        <path d="M 50 50 L 60 70 L 70 50 Z" fill={PAL.white} />
        {/* arm holding briefcase */}
        <path d="M 22 100 Q 0 130 -8 170 Q -10 180 0 184 L 12 180 Q 18 150 30 130 Z" fill={PAL.orange} />
        <rect x="-30" y="180" width="50" height="34" rx="4" fill={PAL.blueDeep} />
        <rect x="-22" y="194" width="34" height="6" fill={PAL.orange} />
        <path d="M -18 180 L -18 172 Q -10 166 0 166 Q 10 166 18 172 L 18 180" stroke={PAL.blueDeep} strokeWidth="3" fill="none" />
        {/* arm holding folder */}
        <path d="M 90 80 Q 110 90 120 110 Q 124 120 116 124 L 100 120 Q 92 102 80 96 Z" fill={PAL.orange} />
        <rect x="100" y="116" width="50" height="38" rx="3" fill={PAL.red} />
        {/* head */}
        <ellipse cx="62" cy="30" rx="28" ry="32" fill={PAL.skin} />
        {/* hair */}
        <path d="M 36 18 Q 40 -2 64 0 Q 88 2 90 22 Q 80 12 60 14 Q 44 14 36 22 Z" fill={PAL.navy} />
        {/* face */}
        <circle cx="54" cy="32" r="2.5" fill={PAL.navyDeep} />
        <circle cx="74" cy="32" r="2.5" fill={PAL.navyDeep} />
        <path d="M 56 44 Q 64 50 72 44" stroke={PAL.navyDeep} strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>

      {/* confetti scatter */}
      <polygon points="240,200 248,212 232,212" fill={PAL.yellow} />
      <polygon points="500,180 510,192 490,192" fill={PAL.green} />
      <circle cx="200" cy="350" r="6" fill={PAL.red} />
      <circle cx="180" cy="500" r="5" fill={PAL.green} />
      <path d="M 540 240 q 10 -8 20 0 t 20 0" stroke={PAL.yellow} strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 220 270 q 8 -10 16 0 t 16 0" stroke={PAL.purple} strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="660" y="430" width="10" height="10" transform="rotate(20 665 435)" fill={PAL.green} />
      <rect x="160" y="160" width="8" height="8" transform="rotate(35 164 164)" fill={PAL.purple} />
      <circle cx="700" cy="540" r="4" fill={PAL.yellow} />
    </svg>
  );
}
