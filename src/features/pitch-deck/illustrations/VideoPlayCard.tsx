/**
 * Stylized monitor card with a play button, surrounded by camera/mic/film icons.
 * Use for "video / showcase / case study" beats.
 */

import { PAL, type IllustrationProps } from './types';

export function VideoPlayCard({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Video play card with film accents"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.navyDeep} />}

      {/* spotlight glow */}
      <circle cx="400" cy="400" r="280" fill="rgba(104,190,105,0.10)" />
      <circle cx="400" cy="400" r="180" fill="rgba(104,190,105,0.10)" />

      {/* Monitor */}
      <g transform="translate(220, 240)">
        {/* monitor body */}
        <rect x="0" y="0" width="360" height="240" rx="22" fill="#1A1F4A" stroke={PAL.green} strokeWidth="4" />
        {/* inner screen */}
        <rect x="20" y="20" width="320" height="200" rx="14" fill={PAL.navy} />
        {/* play triangle */}
        <circle cx="180" cy="120" r="58" fill={PAL.green} />
        <polygon points="160,86 220,120 160,154" fill={PAL.white} />
        {/* progress bar */}
        <rect x="40" y="200" width="280" height="6" rx="3" fill="rgba(255,255,255,0.18)" />
        <rect x="40" y="200" width="120" height="6" rx="3" fill={PAL.green} />
        <circle cx="160" cy="203" r="6" fill={PAL.green} />
        {/* monitor stand */}
        <rect x="160" y="240" width="40" height="40" fill="#1A1F4A" />
        <rect x="120" y="280" width="120" height="14" rx="6" fill="#1A1F4A" />
      </g>

      {/* Camera icon (top-left) */}
      <g transform="translate(80, 170)">
        <rect x="0" y="20" width="100" height="62" rx="6" fill={PAL.green} stroke={PAL.greenDark} strokeWidth="3" />
        <path d="M 100 32 L 124 18 L 124 84 L 100 70 Z" fill={PAL.green} stroke={PAL.greenDark} strokeWidth="3" />
        <circle cx="34" cy="51" r="14" fill={PAL.navy} />
        <circle cx="34" cy="51" r="6" fill={PAL.white} />
        <rect x="14" y="14" width="22" height="8" rx="2" fill={PAL.green} stroke={PAL.greenDark} strokeWidth="2" />
      </g>

      {/* Microphone (top-right) */}
      <g transform="translate(620, 160)">
        <rect x="20" y="0" width="36" height="70" rx="18" fill={PAL.orange} stroke={PAL.orangeDeep} strokeWidth="3" />
        <path d="M 6 50 Q 6 90 38 90 Q 70 90 70 50" stroke={PAL.orange} strokeWidth="6" fill="none" />
        <line x1="38" y1="92" x2="38" y2="118" stroke={PAL.orange} strokeWidth="6" strokeLinecap="round" />
        <line x1="20" y1="118" x2="56" y2="118" stroke={PAL.orange} strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* Film reel (bottom-left) */}
      <g transform="translate(120, 560)">
        <circle cx="40" cy="40" r="38" fill="none" stroke={PAL.white} strokeWidth="6" />
        <circle cx="40" cy="40" r="6" fill={PAL.white} />
        <circle cx="40" cy="14" r="6" fill={PAL.white} />
        <circle cx="40" cy="66" r="6" fill={PAL.white} />
        <circle cx="14" cy="40" r="6" fill={PAL.white} />
        <circle cx="66" cy="40" r="6" fill={PAL.white} />
      </g>

      {/* Speech / chat bubble (bottom-right) */}
      <g transform="translate(620, 560)">
        <path d="M 0 12 Q 0 0 12 0 L 80 0 Q 92 0 92 12 L 92 56 Q 92 68 80 68 L 36 68 L 24 84 L 28 68 L 12 68 Q 0 68 0 56 Z"
          fill={PAL.purple} />
        <circle cx="22" cy="34" r="4" fill={PAL.white} />
        <circle cx="44" cy="34" r="4" fill={PAL.white} />
        <circle cx="66" cy="34" r="4" fill={PAL.white} />
      </g>

      {/* confetti */}
      <polygon points="80,400 92,414 68,414" fill={PAL.green} />
      <polygon points="720,420 730,434 710,434" fill={PAL.purple} />
      <rect x="60" y="700" width="10" height="10" transform="rotate(20 65 705)" fill={PAL.white} />
      <rect x="720" y="700" width="10" height="10" transform="rotate(-20 725 705)" fill={PAL.green} />
      <circle cx="380" cy="80" r="5" fill={PAL.yellow} />
      <circle cx="430" cy="720" r="5" fill={PAL.red} />
      <path d="M 560 100 q 10 -8 20 0 t 20 0" stroke={PAL.green} strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
