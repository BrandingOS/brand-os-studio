/**
 * Open laptop with floating UI elements (calendar, bell, gear,
 * checkmark, location pin) connected by dashed lines.
 * Mirrors uniex reference #1 ("One place, all connected").
 * Use for "platform / hub / integration" beats.
 */

import { PAL, type IllustrationProps } from './types';

export function ConnectedLaptop({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Laptop connected to floating UI elements"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.green} />}

      {/* monogram outline (uniex u shape, super faint) */}
      <path
        d="M 220 690 Q 220 740 270 740 L 410 740 Q 460 740 460 690 L 460 540"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
        fill="none"
      />
      <path
        d="M 540 540 L 620 700 M 620 540 L 540 700"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
      />

      {/* dashed connector lines from laptop to floating items */}
      <path
        d="M 400 380 Q 240 280 180 220"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
        strokeDasharray="6 8"
        fill="none"
      />
      <path
        d="M 400 380 Q 580 280 640 220"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
        strokeDasharray="6 8"
        fill="none"
      />
      <path
        d="M 320 460 Q 200 460 130 380"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
        strokeDasharray="6 8"
        fill="none"
      />
      <path
        d="M 480 460 Q 600 460 670 380"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="3"
        strokeDasharray="6 8"
        fill="none"
      />

      {/* laptop base */}
      <path d="M 240 580 L 560 580 L 600 620 L 200 620 Z" fill="#9794D6" />
      <rect x="350" y="590" width="100" height="6" rx="3" fill="#7B78BB" />

      {/* laptop screen body */}
      <rect x="260" y="320" width="280" height="260" rx="10" fill="#A8A5DA" />
      {/* screen */}
      <rect x="278" y="338" width="244" height="220" rx="4" fill={PAL.white} />
      {/* webcam dot */}
      <circle cx="400" cy="328" r="3" fill="#7B78BB" />

      {/* code-bar lines on screen */}
      <rect x="294" y="360" width="80" height="10" rx="3" fill={PAL.blue} />
      <rect x="294" y="376" width="200" height="10" rx="3" fill={PAL.red} />
      <rect x="294" y="392" width="140" height="10" rx="3" fill={PAL.blue} />
      <rect x="294" y="408" width="180" height="10" rx="3" fill={PAL.red} />
      <rect x="294" y="424" width="120" height="10" rx="3" fill={PAL.blue} />
      <rect x="294" y="440" width="60" height="10" rx="3" fill={PAL.red} />
      <rect x="294" y="456" width="160" height="10" rx="3" fill={PAL.blue} />

      {/* cute mouse next to laptop */}
      <ellipse cx="610" cy="612" rx="22" ry="14" fill={PAL.white} />
      <rect x="600" y="598" width="20" height="10" rx="4" fill={PAL.white} />
      <line x1="600" y1="600" x2="560" y2="585" stroke={PAL.navy} strokeWidth="2" />

      {/* ─── floating UI islands ─── */}

      {/* bell (top-left) */}
      <g transform="translate(120, 160)">
        <path
          d="M 30 0 Q 60 0 60 30 L 60 60 L 70 76 L -10 76 L 0 60 L 0 30 Q 0 0 30 0 Z"
          fill={PAL.yellow}
          stroke={PAL.orangeDeep}
          strokeWidth="3"
        />
        <rect x="22" y="78" width="16" height="10" rx="4" fill={PAL.orangeDeep} />
        <path d="M 70 8 q 14 0 18 18" stroke={PAL.yellow} strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M 70 -2 q 22 0 28 28" stroke={PAL.yellow} strokeWidth="4" fill="none" strokeLinecap="round" />
      </g>

      {/* location pin (top-right) */}
      <g transform="translate(620, 150)">
        <path
          d="M 30 0 Q 56 0 56 26 Q 56 50 30 80 Q 4 50 4 26 Q 4 0 30 0 Z"
          fill={PAL.red}
          stroke={PAL.navyDeep}
          strokeWidth="3"
        />
        <circle cx="30" cy="26" r="10" fill={PAL.white} />
      </g>

      {/* gear (left-middle) */}
      <g transform="translate(60, 350)">
        <g fill={PAL.blue} stroke={PAL.navyDeep} strokeWidth="2.5">
          <path d="M 36 0 L 44 0 L 46 12 L 36 12 Z" />
          <path d="M 36 60 L 44 60 L 46 72 L 36 72 Z" transform="translate(0,0)" />
          <rect x="36" y="60" width="8" height="12" />
          <rect x="0" y="32" width="12" height="8" />
          <rect x="60" y="32" width="12" height="8" />
        </g>
        <circle cx="40" cy="36" r="22" fill={PAL.blue} stroke={PAL.navyDeep} strokeWidth="3" />
        <circle cx="40" cy="36" r="9" fill={PAL.green} />
      </g>

      {/* checkmark speech (right-middle) */}
      <g transform="translate(660, 360)">
        <path d="M 0 0 L 80 0 Q 90 0 90 10 L 90 60 Q 90 70 80 70 L 30 70 L 14 84 L 18 70 L 10 70 Q 0 70 0 60 Z" fill="#D7F0D7" stroke={PAL.greenDark} strokeWidth="3" />
        <path d="M 24 36 L 38 50 L 64 22" stroke={PAL.greenDark} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* calendar (right of laptop) */}
      <g transform="translate(550, 460)">
        <rect x="0" y="10" width="90" height="100" rx="6" fill={PAL.white} stroke={PAL.navyDeep} strokeWidth="2" />
        <rect x="0" y="10" width="90" height="22" rx="6" fill={PAL.red} />
        <rect x="14" y="0" width="6" height="20" rx="2" fill={PAL.navyDeep} />
        <rect x="70" y="0" width="6" height="20" rx="2" fill={PAL.navyDeep} />
        <text x="14" y="26" fill={PAL.white} fontFamily="sans-serif" fontWeight="700" fontSize="10">AUGUST</text>
        <text x="22" y="78" fill={PAL.navyDeep} fontFamily="sans-serif" fontWeight="800" fontSize="40">16</text>
      </g>

      {/* warning "!" speech (lower-left) */}
      <g transform="translate(150, 470)">
        <path d="M 0 10 Q 0 0 10 0 L 70 0 Q 80 0 80 10 L 80 50 Q 80 60 70 60 L 50 60 L 38 76 L 40 60 L 10 60 Q 0 60 0 50 Z" fill={PAL.red} />
        <rect x="36" y="12" width="8" height="26" rx="2" fill={PAL.white} />
        <circle cx="40" cy="46" r="4" fill={PAL.white} />
      </g>

      {/* confetti accents */}
      <polygon points="240,170 250,184 230,184" fill={PAL.yellow} />
      <polygon points="540,160 550,176 530,176" fill={PAL.red} />
      <polygon points="120,560 130,574 110,574" fill={PAL.purple} />
      <rect x="690" y="500" width="10" height="10" transform="rotate(20 695 505)" fill={PAL.white} />
      <rect x="80" y="240" width="10" height="10" transform="rotate(40 85 245)" fill={PAL.white} />
      <circle cx="700" cy="560" r="4" fill={PAL.yellow} />
      <circle cx="100" cy="540" r="5" fill={PAL.yellow} />
    </svg>
  );
}
