/**
 * Open book with rays of light radiating outward, character reading.
 * Use for "knowledge / library / curriculum / detailed program" beats.
 */

import { PAL, type IllustrationProps } from './types';

export function OpenBookKnowledge({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Open book with light rays and reader"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.paper} />}

      {/* radial light rays from book */}
      <g opacity="0.45">
        <path d="M 400 360 L 240 80" stroke={PAL.yellow} strokeWidth="6" strokeLinecap="round" />
        <path d="M 400 360 L 320 60" stroke={PAL.yellow} strokeWidth="6" strokeLinecap="round" />
        <path d="M 400 360 L 400 50" stroke={PAL.yellow} strokeWidth="6" strokeLinecap="round" />
        <path d="M 400 360 L 480 60" stroke={PAL.yellow} strokeWidth="6" strokeLinecap="round" />
        <path d="M 400 360 L 560 80" stroke={PAL.yellow} strokeWidth="6" strokeLinecap="round" />
        <path d="M 400 360 L 160 220" stroke={PAL.yellow} strokeWidth="6" strokeLinecap="round" />
        <path d="M 400 360 L 640 220" stroke={PAL.yellow} strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* central glow */}
      <circle cx="400" cy="380" r="80" fill={PAL.yellow} opacity="0.25" />

      {/* open book */}
      <g transform="translate(220, 360)">
        {/* shadow under book */}
        <ellipse cx="180" cy="220" rx="190" ry="20" fill="rgba(0,21,99,0.10)" />
        {/* left page */}
        <path d="M 0 30 L 170 14 L 180 200 L 4 220 Z" fill={PAL.white} stroke={PAL.navy} strokeWidth="3" />
        {/* right page */}
        <path d="M 360 30 L 190 14 L 180 200 L 356 220 Z" fill={PAL.white} stroke={PAL.navy} strokeWidth="3" />
        {/* spine */}
        <path d="M 170 14 L 190 14 L 180 200 Z" fill={PAL.navy} />
        {/* lines on left page */}
        <line x1="20" y1="60" x2="160" y2="48" stroke={PAL.navy} strokeWidth="3" opacity="0.55" strokeLinecap="round" />
        <line x1="20" y1="80" x2="160" y2="68" stroke={PAL.navy} strokeWidth="3" opacity="0.4" strokeLinecap="round" />
        <line x1="20" y1="100" x2="120" y2="92" stroke={PAL.navy} strokeWidth="3" opacity="0.55" strokeLinecap="round" />
        <line x1="20" y1="120" x2="160" y2="112" stroke={PAL.navy} strokeWidth="3" opacity="0.4" strokeLinecap="round" />
        <line x1="20" y1="140" x2="100" y2="134" stroke={PAL.navy} strokeWidth="3" opacity="0.55" strokeLinecap="round" />
        {/* lines on right page */}
        <line x1="200" y1="48" x2="340" y2="60" stroke={PAL.navy} strokeWidth="3" opacity="0.55" strokeLinecap="round" />
        <line x1="200" y1="68" x2="340" y2="80" stroke={PAL.navy} strokeWidth="3" opacity="0.4" strokeLinecap="round" />
        <line x1="200" y1="88" x2="320" y2="100" stroke={PAL.navy} strokeWidth="3" opacity="0.55" strokeLinecap="round" />
        <line x1="200" y1="108" x2="340" y2="120" stroke={PAL.navy} strokeWidth="3" opacity="0.4" strokeLinecap="round" />
        <line x1="200" y1="128" x2="280" y2="138" stroke={PAL.navy} strokeWidth="3" opacity="0.55" strokeLinecap="round" />

        {/* bookmark ribbon */}
        <path d="M 280 14 L 300 14 L 296 80 L 290 70 L 284 80 Z" fill={PAL.red} />
      </g>

      {/* graduation cap floating above */}
      <g transform="translate(360, 100)">
        <path d="M 40 30 L 80 18 L 40 6 L 0 18 Z" fill={PAL.navy} />
        <path d="M 12 26 L 12 50 Q 40 60 68 50 L 68 26" fill={PAL.navy} />
        <line x1="80" y1="18" x2="92" y2="44" stroke={PAL.navy} strokeWidth="2" />
        <circle cx="92" cy="44" r="5" fill={PAL.green} />
      </g>

      {/* small pencil floating beside */}
      <g transform="translate(630, 280)">
        <rect x="0" y="0" width="80" height="14" rx="2" fill={PAL.yellow} transform="rotate(-15 0 0)" />
        <path d="M 80 0 L 96 7 L 80 14 Z" fill={PAL.skin} transform="rotate(-15 0 0)" />
      </g>

      {/* atom orbits floating */}
      <g transform="translate(140, 240)">
        <circle cx="40" cy="40" r="36" fill="none" stroke={PAL.purple} strokeWidth="3" />
        <ellipse cx="40" cy="40" rx="36" ry="14" fill="none" stroke={PAL.purple} strokeWidth="3" transform="rotate(45 40 40)" />
        <circle cx="40" cy="40" r="6" fill={PAL.purple} />
      </g>

      {/* confetti */}
      <polygon points="80,500 90,514 70,514" fill={PAL.green} />
      <polygon points="700,520 710,534 690,534" fill={PAL.purple} />
      <circle cx="120" cy="640" r="5" fill={PAL.yellow} />
      <circle cx="700" cy="660" r="5" fill={PAL.red} />
      <rect x="200" y="700" width="10" height="10" transform="rotate(25 205 705)" fill={PAL.green} />
      <rect x="600" y="720" width="10" height="10" transform="rotate(-15 605 725)" fill={PAL.blue} />
    </svg>
  );
}
