/**
 * Character at a crossroads holding a compass; multiple paths radiate
 * outward into the distance. Use for "the problem of choice" or
 * "decision moment" beats — the student doesn't know which way to go.
 */

import { PAL, type IllustrationProps } from './types';

export function CompassChoice({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Student at a crossroads with a compass"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.paper} />}

      {/* horizon hill */}
      <path d="M 0 560 Q 200 510 400 540 Q 600 570 800 520 L 800 800 L 0 800 Z" fill="rgba(104,190,105,0.10)" />

      {/* paths radiating from character */}
      <path d="M 400 600 Q 250 580 80 580" stroke={PAL.navy} strokeWidth="6" strokeDasharray="14 10" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 400 600 Q 380 480 320 360" stroke={PAL.navy} strokeWidth="6" strokeDasharray="14 10" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 400 600 Q 460 480 540 360" stroke={PAL.navy} strokeWidth="6" strokeDasharray="14 10" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M 400 600 Q 560 580 720 580" stroke={PAL.navy} strokeWidth="6" strokeDasharray="14 10" fill="none" strokeLinecap="round" opacity="0.6" />

      {/* destination markers — small flags at end of each path */}
      <g>
        <line x1="80" y1="580" x2="80" y2="540" stroke={PAL.navy} strokeWidth="3" />
        <path d="M 80 540 L 110 548 L 80 558 Z" fill={PAL.purple} />
      </g>
      <g>
        <line x1="320" y1="360" x2="320" y2="320" stroke={PAL.navy} strokeWidth="3" />
        <path d="M 320 320 L 350 328 L 320 338 Z" fill={PAL.green} />
      </g>
      <g>
        <line x1="540" y1="360" x2="540" y2="320" stroke={PAL.navy} strokeWidth="3" />
        <path d="M 540 320 L 570 328 L 540 338 Z" fill={PAL.blue} />
      </g>
      <g>
        <line x1="720" y1="580" x2="720" y2="540" stroke={PAL.navy} strokeWidth="3" />
        <path d="M 720 540 L 750 548 L 720 558 Z" fill={PAL.orange} />
      </g>

      {/* question marks floating overhead */}
      <text x="320" y="160" fill={PAL.purple} fontFamily="serif" fontSize="60" fontWeight="800">?</text>
      <text x="440" y="200" fill={PAL.green} fontFamily="serif" fontSize="80" fontWeight="800">?</text>
      <text x="540" y="160" fill={PAL.blue} fontFamily="serif" fontSize="60" fontWeight="800">?</text>

      {/* character */}
      <g transform="translate(330, 380)">
        {/* legs */}
        <path d="M 30 180 L 38 240 L 22 250 L 12 246 L 18 230 L 24 180 Z" fill={PAL.blueDeep} />
        <path d="M 90 180 L 100 240 L 88 250 L 76 246 L 80 230 L 80 180 Z" fill={PAL.blueDeep} />
        <ellipse cx="18" cy="252" rx="14" ry="6" fill={PAL.orange} />
        <ellipse cx="86" cy="252" rx="14" ry="6" fill={PAL.orange} />

        {/* torso */}
        <path d="M 18 70 Q 16 60 28 56 L 90 50 Q 102 54 106 70 L 112 130 Q 100 180 60 180 Q 22 180 12 130 Z" fill={PAL.green} />
        {/* belt */}
        <rect x="14" y="160" width="100" height="10" fill={PAL.greenDark} />

        {/* arms — both forward, holding compass */}
        <path d="M 22 100 Q 12 130 22 160 Q 26 168 36 168 L 50 162 Q 44 130 38 100 Z" fill={PAL.green} />
        <path d="M 100 100 Q 110 130 100 160 Q 96 168 86 168 L 72 162 Q 78 130 84 100 Z" fill={PAL.green} />

        {/* compass in hands */}
        <circle cx="61" cy="170" r="22" fill={PAL.white} stroke={PAL.navy} strokeWidth="3" />
        <circle cx="61" cy="170" r="14" fill={PAL.paper} />
        {/* compass needle */}
        <path d="M 61 156 L 56 170 L 61 170 Z" fill={PAL.red} />
        <path d="M 61 184 L 66 170 L 61 170 Z" fill={PAL.navy} />
        <circle cx="61" cy="170" r="3" fill={PAL.navyDeep} />

        {/* head */}
        <ellipse cx="62" cy="30" rx="28" ry="32" fill={PAL.skin} />
        {/* hair flop */}
        <path d="M 36 22 Q 38 -4 64 -2 Q 90 0 90 24 Q 80 12 60 14 Q 44 14 36 22 Z" fill={PAL.navyDeep} />
        {/* face */}
        <circle cx="54" cy="32" r="2.5" fill={PAL.navyDeep} />
        <circle cx="74" cy="32" r="2.5" fill={PAL.navyDeep} />
        {/* concerned mouth */}
        <path d="M 56 46 Q 64 42 72 46" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* confetti */}
      <polygon points="200,200 210,212 190,212" fill={PAL.purple} />
      <rect x="640" y="200" width="10" height="10" transform="rotate(20 645 205)" fill={PAL.green} />
      <circle cx="180" cy="380" r="5" fill={PAL.yellow} />
      <circle cx="640" cy="420" r="5" fill={PAL.red} />
    </svg>
  );
}
