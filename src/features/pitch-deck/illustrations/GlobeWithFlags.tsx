/**
 * Character standing next to a globe with flags pinned around it.
 * Mirrors uniex reference #3 (passport / world of opportunities).
 * Use anywhere "international reach" or "your passport to..." reads.
 */

import { PAL, type IllustrationProps } from './types';

export function GlobeWithFlags({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Student with globe and flags"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.paper} />}

      {/* confetti scatter */}
      <polygon points="160,200 175,220 145,220" fill={PAL.purple} opacity="0.9" />
      <polygon points="610,160 624,178 596,178" fill={PAL.blue} opacity="0.85" />
      <rect x="200" y="320" width="12" height="12" transform="rotate(25 206 326)" fill={PAL.purple} />
      <rect x="640" y="380" width="10" height="10" transform="rotate(-15 645 385)" fill={PAL.blue} />
      <ellipse cx="120" cy="500" rx="14" ry="6" fill="#E5C9A8" />
      <ellipse cx="700" cy="600" rx="12" ry="6" fill="#E5C9A8" transform="rotate(20 700 600)" />
      <circle cx="660" cy="240" r="5" fill={PAL.green} />

      {/* character */}
      <g transform="translate(160, 280)">
        {/* shoulders / shirt */}
        <path
          d="M 40 180 Q 30 110 80 90 L 220 90 Q 270 110 260 180 L 270 360 L 30 360 Z"
          fill={PAL.blue}
        />
        {/* shirt sleeves stripe */}
        <rect x="40" y="180" width="40" height="16" fill={PAL.blueDeep} />
        <rect x="220" y="180" width="40" height="16" fill={PAL.blueDeep} />
        {/* neck */}
        <rect x="120" y="80" width="60" height="30" fill={PAL.skin} />
        {/* head */}
        <ellipse cx="150" cy="50" rx="60" ry="58" fill={PAL.skin} />
        {/* hair (curly mass) */}
        <path
          d="M 90 30 Q 80 -20 130 -28 Q 170 -36 200 -10 Q 220 14 218 40 Q 212 30 200 24 Q 180 14 168 24 Q 156 18 144 28 Q 130 22 120 32 Q 108 28 96 40 Q 88 42 90 30 Z"
          fill={PAL.navyDeep}
        />
        <circle cx="120" cy="20" r="4" fill={PAL.navy} opacity="0.7" />
        <circle cx="180" cy="14" r="3" fill={PAL.navy} opacity="0.7" />
        {/* eyes */}
        <circle cx="132" cy="58" r="3" fill={PAL.navyDeep} />
        <circle cx="168" cy="58" r="3" fill={PAL.navyDeep} />
        {/* eyebrows */}
        <path d="M 124 48 Q 132 44 142 48" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M 158 48 Q 168 44 176 48" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* smile */}
        <path d="M 138 76 Q 150 86 162 76" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* arm holding flag (left/character's right) */}
        <path
          d="M 40 200 Q 0 240 -10 320 Q -8 340 8 340 L 30 330 Q 40 270 70 240 Z"
          fill={PAL.blue}
        />
        {/* watch */}
        <rect x="-2" y="306" width="22" height="16" rx="3" fill={PAL.purple} />
        <circle cx="9" cy="314" r="4" fill={PAL.white} />
        {/* hand */}
        <circle cx="-2" cy="332" r="14" fill={PAL.skin} />
        {/* flag pole */}
        <line x1="-6" y1="332" x2="40" y2="220" stroke={PAL.navy} strokeWidth="4" />
        {/* flag pennant */}
        <path d="M 40 220 L 110 232 L 60 250 Z" fill={PAL.purpleDeep} />
        {/* arm right reaching to globe */}
        <path
          d="M 260 200 Q 290 220 310 230 L 320 252 Q 290 248 260 240 Z"
          fill={PAL.blue}
        />
      </g>

      {/* globe stand */}
      <g transform="translate(530, 480)">
        <rect x="64" y="200" width="60" height="20" rx="6" fill={PAL.navy} />
        <rect x="86" y="160" width="16" height="42" fill={PAL.navy} />
        {/* globe sphere */}
        <circle cx="94" cy="100" r="84" fill={PAL.green} />
        {/* continents (white shapes) */}
        <path d="M 30 90 Q 50 70 70 80 Q 80 100 60 110 Q 50 130 36 120 Q 20 110 30 90 Z" fill={PAL.white} />
        <path d="M 90 60 Q 110 50 130 70 Q 140 90 120 100 Q 110 80 100 80 Q 92 76 90 60 Z" fill={PAL.white} />
        <path d="M 80 130 Q 100 130 110 150 Q 100 170 80 160 Q 70 150 80 130 Z" fill={PAL.white} />
        <path d="M 140 130 Q 160 130 168 150 Q 158 168 144 160 Q 134 150 140 130 Z" fill={PAL.white} />
        {/* axis ring */}
        <ellipse cx="94" cy="100" rx="84" ry="20" fill="none" stroke={PAL.navy} strokeWidth="2" opacity="0.3" />

        {/* flag #1 (top, navy) */}
        <line x1="100" y1="20" x2="100" y2="-40" stroke={PAL.navy} strokeWidth="3" />
        <path d="M 100 -40 L 140 -32 L 100 -16 Z" fill={PAL.navy} />
        {/* flag #2 (right, purple) */}
        <line x1="172" y1="100" x2="220" y2="80" stroke={PAL.navy} strokeWidth="3" />
        <path d="M 220 80 L 254 96 L 222 102 Z" fill={PAL.purple} />
        {/* flag #3 (bottom-left, green dark) */}
        <line x1="40" y1="160" x2="14" y2="194" stroke={PAL.navy} strokeWidth="3" />
        <path d="M 14 194 L -16 184 L -2 214 Z" fill={PAL.greenDark} />
      </g>
    </svg>
  );
}
