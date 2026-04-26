/**
 * Two characters in conversation, speech bubbles overhead.
 * Use for "1-on-1 mentor / advisor" beats.
 */

import { PAL, type IllustrationProps } from './types';

export function MentorConversation({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Two people in conversation"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.paper} />}

      {/* floor */}
      <ellipse cx="400" cy="700" rx="320" ry="36" fill="rgba(0,21,99,0.06)" />

      {/* speech bubbles */}
      <g>
        <path d="M 130 100 Q 130 80 150 80 L 360 80 Q 380 80 380 100 L 380 180 Q 380 200 360 200 L 220 200 L 200 226 L 206 200 L 150 200 Q 130 200 130 180 Z"
          fill={PAL.green} stroke={PAL.greenDark} strokeWidth="3" />
        <circle cx="180" cy="140" r="6" fill={PAL.white} />
        <circle cx="210" cy="140" r="6" fill={PAL.white} />
        <circle cx="240" cy="140" r="6" fill={PAL.white} />
        <rect x="270" y="125" width="80" height="8" rx="3" fill={PAL.white} opacity="0.7" />
        <rect x="180" y="160" width="160" height="6" rx="3" fill={PAL.white} opacity="0.6" />
      </g>
      <g>
        <path d="M 420 130 Q 420 110 440 110 L 660 110 Q 680 110 680 130 L 680 220 Q 680 240 660 240 L 540 240 L 560 264 L 522 240 L 440 240 Q 420 240 420 220 Z"
          fill={PAL.white} stroke={PAL.navy} strokeWidth="3" />
        <rect x="450" y="148" width="170" height="8" rx="3" fill={PAL.navy} opacity="0.55" />
        <rect x="450" y="168" width="200" height="8" rx="3" fill={PAL.navy} opacity="0.4" />
        <rect x="450" y="188" width="120" height="8" rx="3" fill={PAL.navy} opacity="0.55" />
        <rect x="450" y="208" width="160" height="8" rx="3" fill={PAL.navy} opacity="0.35" />
      </g>

      {/* Left character — mentor (older, sitting forward) */}
      <g transform="translate(140, 360)">
        {/* legs / chair */}
        <rect x="20" y="220" width="60" height="14" fill={PAL.navy} />
        <rect x="20" y="234" width="14" height="80" fill={PAL.navyDeep} />
        <rect x="66" y="234" width="14" height="80" fill={PAL.navyDeep} />
        {/* torso */}
        <path d="M 14 80 Q 12 64 28 60 L 100 56 Q 116 60 118 80 L 122 200 Q 100 220 64 220 Q 30 220 10 200 Z" fill={PAL.navy} />
        {/* tie */}
        <path d="M 64 78 L 60 96 L 64 110 L 68 96 Z" fill={PAL.green} />
        <path d="M 60 110 L 64 150 L 68 110 Z" fill={PAL.green} />
        {/* arms */}
        <path d="M 14 100 Q -10 130 -8 180 Q -8 198 8 200 L 22 196 Q 16 150 22 110 Z" fill={PAL.navy} />
        <path d="M 116 100 Q 130 120 138 158 L 130 174 Q 116 154 110 124 Z" fill={PAL.navy} />
        {/* head */}
        <ellipse cx="64" cy="34" rx="30" ry="34" fill={PAL.skin} />
        {/* short hair */}
        <path d="M 36 22 Q 40 0 64 0 Q 90 0 92 24 Q 84 14 64 16 Q 46 16 36 22 Z" fill="#5C5650" />
        {/* glasses */}
        <circle cx="54" cy="36" r="6" fill="none" stroke={PAL.navyDeep} strokeWidth="2" />
        <circle cx="76" cy="36" r="6" fill="none" stroke={PAL.navyDeep} strokeWidth="2" />
        <line x1="60" y1="36" x2="70" y2="36" stroke={PAL.navyDeep} strokeWidth="2" />
        {/* smile */}
        <path d="M 56 50 Q 64 56 72 50" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Right character — student (open, listening) */}
      <g transform="translate(490, 380)">
        {/* legs */}
        <path d="M 24 200 L 30 280 L 14 290 L 4 286 L 10 270 L 18 200 Z" fill={PAL.blueDeep} />
        <path d="M 80 200 L 88 280 L 76 290 L 64 286 L 70 270 L 70 200 Z" fill={PAL.blueDeep} />
        <ellipse cx="10" cy="294" rx="14" ry="6" fill={PAL.orange} />
        <ellipse cx="74" cy="294" rx="14" ry="6" fill={PAL.orange} />
        {/* torso */}
        <path d="M 10 80 Q 8 64 24 60 L 86 56 Q 102 60 104 80 L 110 200 Q 90 210 56 210 Q 22 210 4 200 Z" fill={PAL.orange} />
        {/* arms */}
        <path d="M 10 100 Q -16 130 -14 170 L 0 174 Q 6 140 14 116 Z" fill={PAL.orange} />
        <path d="M 100 100 Q 124 130 122 174 L 108 178 Q 100 140 96 116 Z" fill={PAL.orange} />
        {/* notebook */}
        <rect x="-26" y="172" width="44" height="34" rx="3" fill={PAL.white} stroke={PAL.navyDeep} strokeWidth="2" />
        <line x1="-22" y1="184" x2="14" y2="184" stroke={PAL.navy} strokeWidth="1.5" opacity="0.5" />
        <line x1="-22" y1="192" x2="14" y2="192" stroke={PAL.navy} strokeWidth="1.5" opacity="0.5" />
        <line x1="-22" y1="200" x2="6" y2="200" stroke={PAL.navy} strokeWidth="1.5" opacity="0.5" />
        {/* head */}
        <ellipse cx="56" cy="34" rx="30" ry="34" fill={PAL.skin} />
        {/* ponytail-ish hair */}
        <path d="M 26 24 Q 30 -4 56 -2 Q 84 0 86 26 Q 76 14 54 16 Q 38 16 26 24 Z" fill={PAL.navyDeep} />
        {/* eyes */}
        <circle cx="46" cy="34" r="2.5" fill={PAL.navyDeep} />
        <circle cx="68" cy="34" r="2.5" fill={PAL.navyDeep} />
        <path d="M 50 50 Q 56 54 62 50" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* confetti */}
      <polygon points="80,260 92,274 68,274" fill={PAL.purple} />
      <polygon points="700,300 712,314 688,314" fill={PAL.green} />
      <circle cx="100" cy="500" r="5" fill={PAL.yellow} />
      <circle cx="720" cy="540" r="5" fill={PAL.red} />
      <rect x="720" y="200" width="10" height="10" transform="rotate(25 725 205)" fill={PAL.green} />
    </svg>
  );
}
