/**
 * Two characters shaking hands with partner-logo squares behind them.
 * Use for "partnership / school benefits / B2B" beats.
 */

import { PAL, type IllustrationProps } from './types';

export function HandshakePartners({ size = 600, className, style, transparent }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 800 800"
      width={size}
      height={size}
      className={className}
      style={style}
      role="img"
      aria-label="Two people shaking hands with partner logos"
    >
      {!transparent && <rect width="800" height="800" fill={PAL.paper} />}

      {/* partner logo grid behind */}
      <g opacity="0.85">
        <rect x="80" y="120" width="90" height="90" rx="14" fill={PAL.white} stroke="rgba(0,21,99,0.12)" strokeWidth="2" />
        <circle cx="125" cy="165" r="22" fill={PAL.green} opacity="0.85" />

        <rect x="200" y="80" width="90" height="90" rx="14" fill={PAL.white} stroke="rgba(0,21,99,0.12)" strokeWidth="2" />
        <rect x="222" y="102" width="46" height="46" rx="8" fill={PAL.blue} opacity="0.8" />

        <rect x="320" y="120" width="90" height="90" rx="14" fill={PAL.white} stroke="rgba(0,21,99,0.12)" strokeWidth="2" />
        <polygon points="365,140 388,184 342,184" fill={PAL.purple} opacity="0.8" />

        <rect x="510" y="80" width="90" height="90" rx="14" fill={PAL.white} stroke="rgba(0,21,99,0.12)" strokeWidth="2" />
        <circle cx="555" cy="125" r="20" fill="none" stroke={PAL.orangeDeep} strokeWidth="6" />

        <rect x="630" y="120" width="90" height="90" rx="14" fill={PAL.white} stroke="rgba(0,21,99,0.12)" strokeWidth="2" />
        <rect x="652" y="142" width="46" height="46" rx="8" fill={PAL.red} opacity="0.8" transform="rotate(20 675 165)" />
      </g>

      {/* connecting dotted line above heads */}
      <path d="M 200 280 Q 400 220 600 280" stroke={PAL.navy} strokeWidth="3" strokeDasharray="6 8" fill="none" opacity="0.4" />

      {/* Left character */}
      <g transform="translate(120, 360)">
        {/* legs */}
        <path d="M 30 200 L 38 280 L 22 290 L 8 286 L 16 270 L 22 200 Z" fill={PAL.navyDeep} />
        <path d="M 88 200 L 96 280 L 84 290 L 70 286 L 76 270 L 78 200 Z" fill={PAL.navyDeep} />
        <ellipse cx="14" cy="294" rx="14" ry="6" fill={PAL.navy} />
        <ellipse cx="82" cy="294" rx="14" ry="6" fill={PAL.navy} />
        {/* torso (suit jacket) */}
        <path d="M 12 80 Q 10 64 26 60 L 90 56 Q 106 60 110 80 L 116 200 Q 90 216 60 216 Q 26 216 6 200 Z" fill={PAL.navy} />
        {/* shirt */}
        <path d="M 50 60 L 60 90 L 70 60 Z" fill={PAL.white} />
        {/* tie */}
        <path d="M 60 90 L 56 110 L 60 130 L 64 110 Z" fill={PAL.green} />
        <path d="M 56 130 L 60 170 L 64 130 Z" fill={PAL.green} />
        {/* arm — extending right toward handshake */}
        <path d="M 110 110 Q 160 140 200 168 L 196 184 Q 160 168 120 154 Z" fill={PAL.navy} />
        {/* head */}
        <ellipse cx="60" cy="34" rx="28" ry="32" fill={PAL.skin} />
        {/* hair */}
        <path d="M 34 22 Q 36 -2 60 -2 Q 86 0 86 24 Q 76 12 58 14 Q 42 14 34 22 Z" fill={PAL.navyDeep} />
        {/* face */}
        <circle cx="52" cy="34" r="2.5" fill={PAL.navyDeep} />
        <circle cx="68" cy="34" r="2.5" fill={PAL.navyDeep} />
        <path d="M 54 50 Q 60 56 66 50" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* Right character */}
      <g transform="translate(540, 360)">
        {/* legs */}
        <path d="M 30 200 L 38 280 L 22 290 L 8 286 L 16 270 L 22 200 Z" fill={PAL.blueDeep} />
        <path d="M 88 200 L 96 280 L 84 290 L 70 286 L 76 270 L 78 200 Z" fill={PAL.blueDeep} />
        <ellipse cx="14" cy="294" rx="14" ry="6" fill={PAL.orange} />
        <ellipse cx="82" cy="294" rx="14" ry="6" fill={PAL.orange} />
        {/* torso */}
        <path d="M 12 80 Q 10 64 26 60 L 90 56 Q 106 60 110 80 L 116 200 Q 90 216 60 216 Q 26 216 6 200 Z" fill={PAL.green} />
        {/* collar */}
        <path d="M 50 60 L 60 76 L 70 60 Z" fill={PAL.white} />
        {/* arm — extending left toward handshake */}
        <path d="M 12 110 Q -38 140 -78 168 L -74 184 Q -38 168 0 154 Z" fill={PAL.green} />
        {/* head */}
        <ellipse cx="60" cy="34" rx="28" ry="32" fill={PAL.skin} />
        {/* curly hair */}
        <path d="M 30 24 Q 30 -8 60 -6 Q 92 -6 92 26 Q 80 12 60 14 Q 40 14 30 24 Z" fill="#A06030" />
        <circle cx="42" cy="14" r="6" fill="#A06030" />
        <circle cx="80" cy="14" r="6" fill="#A06030" />
        {/* face */}
        <circle cx="52" cy="34" r="2.5" fill={PAL.navyDeep} />
        <circle cx="68" cy="34" r="2.5" fill={PAL.navyDeep} />
        <path d="M 54 50 Q 60 56 66 50" stroke={PAL.navyDeep} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>

      {/* hands meeting */}
      <g transform="translate(360, 510)">
        <path d="M 0 16 Q 0 4 14 4 L 60 0 Q 80 0 80 16 Q 80 32 60 32 L 14 36 Q 0 32 0 16 Z" fill={PAL.skin} stroke={PAL.navy} strokeWidth="2" />
        <line x1="20" y1="16" x2="60" y2="16" stroke={PAL.navy} strokeWidth="1.5" opacity="0.4" />
      </g>

      {/* burst above handshake */}
      <g transform="translate(400, 470)">
        <path d="M 0 0 L -4 -30" stroke={PAL.green} strokeWidth="3" strokeLinecap="round" />
        <path d="M 0 0 L 14 -28" stroke={PAL.green} strokeWidth="3" strokeLinecap="round" />
        <path d="M 0 0 L -22 -22" stroke={PAL.green} strokeWidth="3" strokeLinecap="round" />
        <path d="M 0 0 L 28 -16" stroke={PAL.green} strokeWidth="3" strokeLinecap="round" />
        <path d="M 0 0 L -28 -10" stroke={PAL.green} strokeWidth="3" strokeLinecap="round" />
      </g>

      {/* confetti */}
      <polygon points="40,360 50,374 30,374" fill={PAL.purple} />
      <polygon points="740,360 752,374 728,374" fill={PAL.green} />
      <circle cx="80" cy="600" r="5" fill={PAL.yellow} />
      <circle cx="720" cy="600" r="5" fill={PAL.red} />
    </svg>
  );
}
